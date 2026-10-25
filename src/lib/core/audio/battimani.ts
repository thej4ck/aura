// Battito di mani dal microfono (ADR 0008): tutto dentro la pagina, come mic.ts. L'audio non si registra,
// non si salva e non esce mai dal browser.
// Un AudioWorklet (battimani.worklet.ts) passa i campioni a blocchi continui con il loro frame sul clock
// audio; RilevatoreBattiti li analizza nel thread principale. Se il thread è occupato i blocchi aspettano
// in coda e niente si perde: il tempo di ogni campione resta quello vero.
import URL_WORKLET from './battimani.worklet.ts?worker&url';
import {
	ACUTI_BATTITO_DB,
	CALO_A_MS,
	CALO_BATTITO_DB,
	CALO_DA_MS,
	MARGINE_BATTITO_DB,
	PASSA_ALTO_BATTITO_HZ,
	PASSA_ALTO_CALO_HZ,
	PASSA_ALTO_SIBILI_HZ,
	REFRATTARIO_BATTITO_MS,
	SALTO_BATTITO_DB,
	SALTO_PRIMA_MS,
	SIBILI_BATTITO_DB,
	SOGLIA_YIN,
	SOGLIA_BATTITO_RMS
} from './costanti.ts';
import { riproduzioneAttiva } from './contesto.ts';
import { apriSorgenteMic, type MotivoChiusura } from './mic.ts';
import { RumoreDiFondo, rilevaAltezza } from './pitch.ts';

export type BattitoMani = {
	/**
	 * clock audio (s) dell'attacco del battito nel riferimento del suono sentito, come tempoSentito()
	 * (contesto.ts): tolte la latenza d'uscita, quella d'ingresso nota e la manopola `latenzaMs`. Preciso
	 * al campione dentro il blocco analizzato, non al frame (i frame di mic.ts sono a 30 al secondo)
	 */
	t: number;
	/** picco dell'attacco (ampiezza 0-1), per la diagnostica */
	forza: number;
};

export type BattiMani = {
	chiudi(): void;
	/** per la diagnostica: frequenza di campionamento, come si cattura, filtri davvero applicati */
	sampleRate: number;
	cattura: 'worklet' | 'raf';
	impostazioni: MediaTrackSettings;
};

/** Un attacco trovato: il campione (frame del clock audio) e il picco. */
export type Attacco = { frame: number; forza: number };

/** Passa-alto di Butterworth (biquad RBJ, Q = 1/√2), un campione alla volta. */
class PassaAlto {
	private readonly k: number[];
	private x1 = 0;
	private x2 = 0;
	private y1 = 0;
	private y2 = 0;
	constructor(hz: number, sampleRate: number) {
		const w = (2 * Math.PI * hz) / sampleRate;
		const al = Math.sin(w) / Math.SQRT2;
		const b = (1 + Math.cos(w)) / 2 / (1 + al);
		this.k = [b, -2 * b, b, (-2 * Math.cos(w)) / (1 + al), (1 - al) / (1 + al)];
	}
	filtra(x: number): number {
		const [b0, b1, b2, a1, a2] = this.k;
		const y = b0 * x + b1 * this.x1 + b2 * this.x2 - a1 * this.y1 - a2 * this.y2;
		this.x2 = this.x1;
		this.x1 = x;
		this.y2 = this.y1;
		this.y1 = y;
		return y;
	}
}

/** Millisecondi di storia: bastano per SALTO_PRIMA_MS prima e CALO_A_MS dopo un attacco. */
const STORIA = 256;
const ENERGIA_10_MS = 10;
/** i millisecondi dell'attacco: il battito ci mette quasi tutta la sua energia, una vocale no */
const ATTACCO_MS = 5;
/** dove si guarda se dopo l'attacco c'è una voce (ms dall'attacco) */
const VOCE_DA_MS = 5;
const VOCE_A_MS = 25;
const db = (x: number) => 10 ** (x / 10);

/**
 * Il rilevatore puro: riceve i campioni del microfono a blocchi (con il frame del primo) e restituisce
 * gli attacchi dei battiti di mani, al campione. Lavora a millisecondi: negli acuti (passa-alto) cerca
 * un salto d'energia sopra il rumore stimato; CALO_A_MS dopo decide se era un battito (si è spento, è a
 * banda larga, non è una /t/ né una vocale che comincia) e ne cerca l'attacco campione per campione.
 * Le soglie e le misure che le giustificano sono in costanti.ts.
 */
export class RilevatoreBattiti {
	/** rumore di fondo negli acuti (RMS a blocchi di 10 ms): scende subito, risale piano */
	readonly rumore = new RumoreDiFondo();
	private readonly passo: number;
	// i filtri ripartono con l'analisi (riparti, al primo blocco)
	private bandaDa!: PassaAlto;
	private acutiDa!: PassaAlto;
	private sibiliDa!: PassaAlto;
	/** energia media di ogni millisecondo sopra PASSA_ALTO_CALO_HZ, PASSA_ALTO_BATTITO_HZ e PASSA_ALTO_SIBILI_HZ */
	private readonly banda = new Float64Array(STORIA);
	private readonly acuti = new Float64Array(STORIA);
	private readonly sibili = new Float64Array(STORIA);
	/** picco (campioni grezzi) di ogni millisecondo */
	private readonly picchi = new Float64Array(STORIA);
	/** i campioni negli acuti, per trovare l'attacco, e nella banda, per sentire se è una voce */
	private readonly campioni: Float32Array;
	private readonly campioniBanda: Float32Array;
	private readonly refrattario: number;
	// il millisecondo in corso
	private sommaBanda = 0;
	private sommaAcuti = 0;
	private sommaSibili = 0;
	private picco = 0;
	private pos = 0;
	/** frame del primo campione dopo l'ultima ripartenza, e il prossimo atteso */
	private base = NaN;
	private atteso = NaN;
	/** millisecondi completi dalla ripartenza */
	private ms = 0;
	private prossimo = 0;
	private attesa = -1;
	private sordoFino = -Infinity;
	private energia10 = 0;
	private conta10 = 0;

	constructor(readonly sampleRate: number) {
		this.passo = Math.max(1, Math.round(sampleRate / 1000));
		this.campioni = new Float32Array(STORIA * this.passo);
		this.campioniBanda = new Float32Array(STORIA * this.passo);
		this.refrattario = Math.round((REFRATTARIO_BATTITO_MS * sampleRate) / 1000);
	}

	/** soglia sull'energia acuta di un millisecondo */
	get soglia(): number {
		return Math.max(SOGLIA_BATTITO_RMS, this.rumore.rms * 10 ** (MARGINE_BATTITO_DB / 20)) ** 2;
	}

	/**
	 * Analizza i campioni dal frame `primo`. I frame fino a `sordoFino` non contano: suonava il sito (turni).
	 * Un blocco non contiguo al precedente (frame persi) fa ripartire l'analisi. Gli attacchi arrivano
	 * CALO_A_MS dopo il loro tempo.
	 */
	elabora(campioni: Float32Array, primo: number, sordoFino = -Infinity): Attacco[] {
		if (primo !== this.atteso) this.riparti(primo);
		this.atteso = primo + campioni.length;
		this.sordoFino = sordoFino;
		const trovati: Attacco[] = [];
		const lunghezza = this.campioni.length;
		for (const x of campioni) {
			const b = this.bandaDa.filtra(x);
			const a = this.acutiDa.filtra(x);
			const z = this.sibiliDa.filtra(x);
			const k = (this.ms * this.passo + this.pos) % lunghezza;
			this.campioni[k] = a;
			this.campioniBanda[k] = b;
			this.sommaBanda += b * b;
			this.sommaAcuti += a * a;
			this.sommaSibili += z * z;
			this.picco = Math.max(this.picco, Math.abs(x));
			if (++this.pos === this.passo) this.chiudiMs(trovati);
		}
		return trovati;
	}

	private riparti(primo: number) {
		this.base = primo;
		this.ms = this.pos = this.prossimo = 0;
		this.attesa = -1;
		this.bandaDa = new PassaAlto(PASSA_ALTO_CALO_HZ, this.sampleRate);
		this.acutiDa = new PassaAlto(PASSA_ALTO_BATTITO_HZ, this.sampleRate);
		this.sibiliDa = new PassaAlto(PASSA_ALTO_SIBILI_HZ, this.sampleRate);
		this.sommaBanda = this.sommaAcuti = this.sommaSibili = this.picco = 0;
		this.energia10 = this.conta10 = 0;
	}

	private sordo(j: number): boolean {
		return this.base + (j + 1) * this.passo - 1 <= this.sordoFino;
	}

	/** media di `v` sui millisecondi [da, a) */
	private media(v: Float64Array, da: number, a: number): number {
		let s = 0;
		for (let k = da; k < a; k++) s += v[k % STORIA];
		return s / (a - da);
	}

	private chiudiMs(trovati: Attacco[]) {
		const j = this.ms++;
		const i = j % STORIA;
		this.banda[i] = this.sommaBanda / this.passo;
		this.acuti[i] = this.sommaAcuti / this.passo;
		this.sibili[i] = this.sommaSibili / this.passo;
		this.picchi[i] = this.picco;
		this.sommaBanda = this.sommaAcuti = this.sommaSibili = this.picco = this.pos = 0;
		// il rumore di fondo si stima a blocchi di 10 ms, solo quando il sito tace
		if (!this.sordo(j)) {
			this.energia10 += this.acuti[i];
			if (++this.conta10 === ENERGIA_10_MS) {
				this.rumore.aggiorna(Math.sqrt(this.energia10 / ENERGIA_10_MS), ENERGIA_10_MS / 1000);
				this.energia10 = this.conta10 = 0;
			}
		}
		for (;;) {
			if (this.attesa >= 0) {
				if (this.ms < this.attesa + CALO_A_MS) return;
				const a = this.decidi(this.attesa);
				this.attesa = -1;
				if (a) {
					trovati.push(a);
					const dopo = a.frame - this.base + this.refrattario;
					this.prossimo = Math.max(this.prossimo, Math.ceil(dopo / this.passo));
				}
			} else if (this.prossimo < this.ms) {
				if (this.candidato(this.prossimo)) this.attesa = this.prossimo;
				this.prossimo++;
			} else return;
		}
	}

	/**
	 * Quello che c'era prima del millisecondo `j`: la media di SALTO_PRIMA_MS, lasciando fuori i 2 ms
	 * appena prima, dove un attacco che sale in più di un millisecondo è già cominciato.
	 */
	private prima(v: Float64Array, j: number): number {
		return this.media(v, j - SALTO_PRIMA_MS - 2, j - 2);
	}

	/** il millisecondo `j` salta sopra la soglia e sopra quelli prima: forse un attacco */
	private candidato(j: number): boolean {
		if (j < SALTO_PRIMA_MS + 2 || this.sordo(j)) return false;
		const e = this.acuti[j % STORIA];
		return e >= this.soglia && e >= db(SALTO_BATTITO_DB) * this.prima(this.acuti, j);
	}

	/**
	 * Dopo CALO_A_MS: è un battito se si è spento, se è a banda larga e se non sta tutto negli acutissimi
	 * (una /t/ o una /s/); allora l'attacco al campione. L'energia che c'era già prima dell'attacco (una
	 * voce tenuta, una ventola) si toglie: un battito mentre si canta è un battito, una /t/ seguita dalla
	 * sua vocale no.
	 */
	private decidi(j: number): Attacco | null {
		const nuova = (v: Float64Array) => this.media(v, j, j + ATTACCO_MS) - this.prima(v, j);
		const inizio = nuova(this.banda);
		if (inizio <= 0) return null; // un'onda di prima che si spegne, non un battito
		const dopo = this.media(this.banda, j + CALO_DA_MS, j + CALO_A_MS) - this.prima(this.banda, j);
		if (dopo > inizio * db(-CALO_BATTITO_DB)) return null;
		if (nuova(this.acuti) < inizio * db(ACUTI_BATTITO_DB)) return null;
		const sibili = nuova(this.sibili);
		if (inizio - sibili < sibili * db(SIBILI_BATTITO_DB)) return null;
		// una vocale forte che comincia: le pulsazioni della voce fanno saltare gli acuti e lei può calare
		// di qualche dB, ma è periodica; un battito, anche con l'eco della stanza o una voce sotto, no
		const n = (VOCE_A_MS - VOCE_DA_MS) * this.passo;
		const finestra = new Float32Array(n);
		const inizioVoce = (j + VOCE_DA_MS) * this.passo;
		for (let i = 0; i < n; i++) {
			finestra[i] = this.campioniBanda[(inizioVoce + i) % this.campioniBanda.length];
		}
		if (rilevaAltezza(finestra, this.sampleRate, { ripiego: SOGLIA_YIN })) return null;
		// l'attacco: il primo campione (dal millisecondo prima) che arriva al 30% del picco dei primi ms
		const lunghezza = this.campioni.length;
		const da = Math.max(0, j - 1) * this.passo;
		const a = (j + 5) * this.passo;
		let picco = 0;
		for (let s = da; s < a; s++) picco = Math.max(picco, Math.abs(this.campioni[s % lunghezza]));
		let s = da;
		while (Math.abs(this.campioni[s % lunghezza]) < 0.3 * picco) s++;
		let forza = 0;
		for (let k = Math.max(0, j - 1); k < j + 10; k++)
			forza = Math.max(forza, this.picchi[k % STORIA]);
		return { frame: this.base + s, forza };
	}
}

/** Campioni dell'analizzatore nel ripiego senza worklet: ~170 ms a 48 kHz, più di un thread occupato. */
const FFT_RIPIEGO = 8192;

/**
 * Apre il microfono e chiama `onbattito` a ogni battito di mani. Stesse regole di apriMicrofono (mic.ts):
 * sblocca() prima, nel gesto; lancia ErroreMic (e lo conta nelle statistiche anonime come 'mic'); senza
 * filtri per le chiamate; si chiude da solo quando la scheda si nasconde o la pagina viene lasciata, e
 * allora chiama `onchiuso`; chiudi() rilascia le tracce (idempotente).
 * `onbattito` arriva ~CALO_A_MS (80 ms) dopo il battito, il tempo che serve a distinguerlo dalla voce;
 * `t` resta quello dell'attacco. Un lampo sul battito, se serve, si disegna da lì.
 * Il turno del bambino col microfono finisce in finestraAscolto (musica/ritmo.ts): conviene chiudere o
 * smettere di contare CALO_A_MS dopo, per non perdere l'ultimo battito.
 *
 * Comportamento atteso, ognuno con il suo test che CONTA gli eventi generati (battimani.test.ts e
 * tests/*.mani.spec.ts, con i segnali di scripts/genera-wav.mjs):
 * - un battito vero = un evento, entro ±5 ms dall'attacco, anche con battiti irregolari, piano e forte;
 * - mentre suona il sito (riproduzioneAttiva()) nessun evento: turni come nel canto, l'eco dei clic
 *   dell'attacco compresa (i frame sentiti fino a quel momento, più la latenza d'ingresso, sono sordi);
 * - niente eventi dal rumore di fondo (ventola, fruscio) né dalla voce, parlata ("ta ti-ti") o cantata:
 *   il battito è un transitorio a banda larga con attacco di pochi ms, la voce no;
 * - dopo un battito, REFRATTARIO_BATTITO_MS di sordità: doppio picco ed eco della stanza non contano;
 * - soglia adattiva sul rumore di fondo stimato (come RumoreDiFondo in pitch.ts);
 * - il thread principale occupato fino a 100 ms non fa perdere battiti (AudioWorklet; senza, ripiego su
 *   rAF con un analizzatore lungo FFT_RIPIEGO, che legge solo i campioni nuovi).
 */
export async function apriBattiMani({
	onbattito,
	onchiuso,
	latenzaMs = 0
}: {
	onbattito: (b: BattitoMani) => void;
	onchiuso?: (motivo: MotivoChiusura) => void;
	/** la manopola latenzaAudioMs delle preferenze */
	latenzaMs?: number;
}): Promise<BattiMani> {
	let smonta = () => {};
	const mic = await apriSorgenteMic(onchiuso, () => smonta());
	const { c, sorgente } = mic;
	const sr = c.sampleRate;
	const rilevatore = new RilevatoreBattiti(sr);
	// la latenza d'ingresso, se il browser la dice (Chrome); non è ancora nei tipi di TypeScript
	const latenzaIngresso = Number((mic.impostazioni as { latency?: number }).latency) || 0;
	let sordoFino = -Infinity;

	function elabora(campioni: Float32Array, primo: number) {
		// mentre suona il sito: sordi i frame arrivati fino a ora, più quelli ancora in viaggio dal microfono
		if (riproduzioneAttiva()) sordoFino = Math.ceil((c.currentTime + latenzaIngresso) * sr);
		for (const a of rilevatore.elabora(campioni, primo, sordoFino)) {
			const uscita = c.outputLatency || c.baseLatency || 0;
			const t = a.frame / sr - uscita - latenzaIngresso - latenzaMs / 1000;
			onbattito({ t, forza: a.forza });
		}
	}

	let cattura: BattiMani['cattura'] = 'worklet';
	try {
		await c.audioWorklet.addModule(URL_WORKLET);
		if (!mic.chiuso) {
			const nodo = new AudioWorkletNode(c, 'battimani', {
				numberOfInputs: 1,
				numberOfOutputs: 0,
				channelCount: 1,
				channelCountMode: 'explicit'
			});
			nodo.port.onmessage = (e: MessageEvent<{ primo: number; campioni: Float32Array }>) =>
				elabora(e.data.campioni, e.data.primo);
			sorgente.connect(nodo); // e basta: mai verso gli altoparlanti
			smonta = () => {
				nodo.port.onmessage = null;
				nodo.port.postMessage('fine'); // il processore smette, e il nodo si può liberare
			};
		}
	} catch {
		// ponytail: ripiego per i browser senza AudioWorklet; perde i battiti se il thread si blocca più di
		// FFT_RIPIEGO campioni, e i bordi dei blocchi seguono currentTime (a scatti su alcuni Android)
		cattura = 'raf';
		if (!mic.chiuso) {
			const analizzatore = c.createAnalyser();
			analizzatore.fftSize = FFT_RIPIEGO;
			sorgente.connect(analizzatore);
			const buffer = new Float32Array(FFT_RIPIEGO);
			let fatto = -1;
			let raf = requestAnimationFrame(function giro() {
				raf = requestAnimationFrame(giro);
				const fine = Math.round(c.currentTime * sr);
				const nuovi = fatto < 0 ? FFT_RIPIEGO : Math.min(FFT_RIPIEGO, fine - fatto);
				if (nuovi <= 0) return;
				analizzatore.getFloatTimeDomainData(buffer);
				elabora(buffer.subarray(FFT_RIPIEGO - nuovi), fine - nuovi);
				fatto = fine;
			});
			smonta = () => cancelAnimationFrame(raf);
		}
	}
	return { chiudi: mic.chiudi, sampleRate: sr, cattura, impostazioni: mic.impostazioni };
}
