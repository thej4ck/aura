// Microfono → frame di altezza, tutto dentro la pagina: l'audio non si registra, non si salva e non
// esce mai dal browser (e la CSP vieta comunque le connessioni verso altri siti). Se non si apre, nelle
// statistiche anonime va solo il codice dell'errore con browser e sistema in breve.
import { FFT, FPS_MIC, PASSA_BASSO_HZ } from './costanti.ts';
import { contesto, riproduzioneAttiva, usa } from './contesto.ts';
import { ambienteBreve } from '../piattaforma.ts';
import { conta } from '../statistiche.ts';
import { Mediana, RumoreDiFondo, calcolaRms, rilevaAltezza } from './pitch.ts';

export type FrameMic = {
	/** clock audio (s) del centro della finestra analizzata, meno la latenza impostata */
	t: number;
	/** Hz dopo la mediana (che regge i buchi brevi), null se non c'è una nota */
	freq: number | null;
	chiarezza: number;
	rms: number;
	/** vero mentre suona il sito: il frame non va ascoltato (turni ascolta/canta) */
	silenziato: boolean;
	/**
	 * perché in questo frame YIN non ha sentito una nota: sotto la soglia del volume, oppure suono poco
	 * periodico o fuori dall'intervallo delle voci. Assente se l'ha sentita
	 */
	motivo?: 'gate' | 'aperiodico';
	/** rumore di fondo stimato e soglia del volume in uso (RMS), per la diagnostica */
	rumore: number;
	gate: number;
};

export type CodiceErroreMic =
	| 'permesso-negato'
	| 'permesso-sistema'
	| 'nessun-microfono'
	| 'contesto-non-sicuro'
	| 'non-supportato';

export class ErroreMic extends Error {
	readonly codice: CodiceErroreMic;
	constructor(codice: CodiceErroreMic, opzioni?: ErrorOptions) {
		super(`microfono: ${codice}`, opzioni);
		this.name = 'ErroreMic';
		this.codice = codice;
	}
}

export type Microfono = {
	chiudi(): void;
	/** per la diagnostica: frequenza di campionamento, come si cattura, filtri davvero applicati */
	sampleRate: number;
	cattura: 'raf';
	impostazioni: MediaTrackSettings;
};

/**
 * Perché il microfono si è chiuso da solo: scheda nascosta, pagina lasciata (anche verso la bfcache), oppure
 * traccia interrotta (finita o ammutolita: una chiamata su iOS, il microfono scollegato).
 */
export type MotivoChiusura = 'nascosta' | 'pagina-lasciata' | 'interrotto';

const INTERVALLO_MS = 1000 / FPS_MIC;

/** l'errore da lanciare, contato nelle statistiche anonime */
function errore(codice: CodiceErroreMic, opzioni?: ErrorOptions): ErroreMic {
	conta('mic', { v: codice, b: ambienteBreve() });
	return new ErroreMic(codice, opzioni);
}

function codiceDa(e: unknown): CodiceErroreMic {
	const { name, message } = (e ?? {}) as { name?: string; message?: string };
	switch (name) {
		case 'NotAllowedError':
		case 'SecurityError':
			// Chrome scrive «Permission denied by system» quando è il sistema (Android, macOS, Windows)
			// a negare il microfono al browser: allora le impostazioni del sito non bastano
			return /by system/i.test(message ?? '') ? 'permesso-sistema' : 'permesso-negato';
		case 'NotFoundError':
		case 'NotReadableError': // occupato da un'altra app o guasto
		case 'OverconstrainedError':
		case 'AbortError':
			return 'nessun-microfono';
		default:
			return 'non-supportato';
	}
}

/**
 * Apre il microfono e chiama `onframe` circa 30 volte al secondo. Chiamare prima sblocca() nel gesto
 * che apre il microfono (iOS). Lancia ErroreMic. Le tracce si rilasciano con chiudi(); il microfono si
 * chiude anche da solo quando la scheda si nasconde (rAF lì si ferma: niente frame, ma la spia resterebbe
 * accesa), la pagina viene lasciata o la traccia si interrompe, e allora chiama `onchiuso`. Se il componente sparisce mentre si
 * aspetta il permesso, chiudi() va chiamato appena arriva.
 * `latenzaMs`: la manopola di latenza delle preferenze, tolta dal tempo dei frame.
 *
 * Il gate è adattivo (RumoreDiFondo): la voce passa se sta sopra il rumore stimato, che si aggiorna solo
 * con i frame senza nota. Misure in Chromium con il microfono finto e voci cantate realistiche (vibrato
 * ±40 cent, jitter, shimmer, respiro a 17 dB, ±6 dB di volume), 20 s per voce: con il vecchio gate fisso
 * a −40 dBFS a RMS 0,012 un terzo dei frame era vuoto (buchi fino a 1,3 s, tenuta di 3 s in 6 s), a
 * RMS 0,005 tutti; i frame poco periodici erano sotto il 2% (4% con una voce ruvida).
 * ponytail: rAF a ~30 Hz basta per il canto. Con il thread principale occupato 40-80 ms ogni 200-600 ms
 * i frame arrivano fino a 120 ms dopo, ma i frame validi cambiano di meno di un punto (65,3% → 65,2%) e
 * non nasce nessun buco: ogni frame analizza comunque gli ultimi 43 ms. Se servirà di più (ritmo,
 * attacchi precisi) si passa a un AudioWorklet qui dentro (modulo da 'self', già permesso da
 * script-src), che manda blocchi continui con il tempo audio; stessa interfaccia, rAF come ripiego.
 */
export async function apriMicrofono({
	onframe,
	onchiuso,
	latenzaMs = 0
}: {
	onframe: (frame: FrameMic) => void;
	onchiuso?: (motivo: MotivoChiusura) => void;
	latenzaMs?: number;
}): Promise<Microfono> {
	let raf = 0;
	const mic = await apriSorgenteMic(onchiuso, () => cancelAnimationFrame(raf));
	const { c, sorgente } = mic;
	const analizzatore = c.createAnalyser();
	analizzatore.fftSize = FFT;
	// passa-basso nativo, poi un campione su due a YIN: regge il rumore di fondo e costa un quarto
	const filtro = c.createBiquadFilter();
	filtro.type = 'lowpass';
	filtro.frequency.value = PASSA_BASSO_HZ;
	filtro.Q.value = Math.SQRT1_2;
	sorgente.connect(filtro).connect(analizzatore); // e basta: mai verso gli altoparlanti
	const buffer = new Float32Array(FFT);
	const dimezzato = new Float32Array(FFT / 2);
	const mediana = new Mediana();
	const rumore = new RumoreDiFondo();
	const ritardo = FFT / 2 / c.sampleRate + latenzaMs / 1000;
	let ultimo = -Infinity;
	let tPrima: number | null = null;

	function giro(ora: number) {
		raf = requestAnimationFrame(giro);
		if (ora - ultimo < INTERVALLO_MS - 4) return;
		ultimo = ora;
		analizzatore.getFloatTimeDomainData(buffer);
		const t = c.currentTime - ritardo;
		const dt = tPrima === null ? 0 : Math.min(0.25, Math.max(0, t - tPrima));
		tPrima = t;
		const rms = calcolaRms(buffer);
		const gate = rumore.gate;
		if (riproduzioneAttiva()) {
			mediana.azzera(); // dopo il turno del sito si riparte puliti
			onframe({ t, freq: null, chiarezza: 0, rms, silenziato: true, rumore: rumore.rms, gate });
			return;
		}
		for (let i = 0; i < dimezzato.length; i++) dimezzato[i] = buffer[2 * i];
		// YIN guarda tutto quello che supera il minimo assoluto; il gate adattivo si applica dopo, così
		// una voce sotto la soglia non passa per rumore (e non alza la soglia sopra di sé)
		const a = rilevaAltezza(dimezzato, c.sampleRate / 2);
		if (!a) rumore.aggiorna(rms, dt);
		const nota = a && rms >= gate ? a.freq : null;
		const freq = mediana.aggiungi(nota);
		onframe({
			t,
			freq,
			chiarezza: a?.chiarezza ?? 0,
			rms,
			silenziato: false,
			motivo: nota !== null ? undefined : rms < gate ? 'gate' : 'aperiodico',
			rumore: rumore.rms,
			gate
		});
	}

	raf = requestAnimationFrame(giro);
	return {
		chiudi: mic.chiudi,
		sampleRate: c.sampleRate,
		cattura: 'raf',
		impostazioni: mic.impostazioni
	};
}

export type SorgenteMic = {
	c: AudioContext;
	/** il microfono nel grafo: chi lo usa lo collega ai suoi nodi, mai agli altoparlanti */
	sorgente: MediaStreamAudioSourceNode;
	/** i filtri davvero applicati: un browser o un driver può tenerli accesi anche se chiesti spenti */
	impostazioni: MediaTrackSettings;
	/** vero dopo chiudi(), anche quando lo ha chiuso il browser */
	readonly chiuso: boolean;
	/** rilascia le tracce e il contesto, dopo `smonta`; idempotente */
	chiudi(): void;
};

/**
 * La parte comune di apriMicrofono e apriBattiMani (battimani.ts): controlla il browser, apre il
 * microfono senza i filtri delle chiamate (lancia ErroreMic, contato nelle statistiche anonime) e ne fa
 * una sorgente del contesto. Si chiude da solo quando la scheda si nasconde, la pagina viene lasciata o la
 * traccia smette di dare suono, e allora chiama `onchiuso`. Alla chiusura chiama `smonta`, che smonta il
 * resto del grafo di chi lo usa.
 */
export async function apriSorgenteMic(
	onchiuso: ((motivo: MotivoChiusura) => void) | undefined,
	smonta: () => void
): Promise<SorgenteMic> {
	if (globalThis.isSecureContext === false) throw errore('contesto-non-sicuro');
	if (typeof AudioContext === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
		throw errore('non-supportato');
	}
	const c = contesto();
	// prima di getUserMedia: su iOS la sessione audio passa ad ascoltare e suonare insieme
	const rilascia = usa('microfono');
	let stream: MediaStream;
	try {
		// la voce così com'è: i filtri per le chiamate tagliano le note tenute e cambiano il volume
		stream = await navigator.mediaDevices.getUserMedia({
			audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
		});
	} catch (e) {
		rilascia();
		throw errore(codiceDa(e), { cause: e });
	}
	let sorgente: MediaStreamAudioSourceNode;
	try {
		sorgente = c.createMediaStreamSource(stream);
	} catch (e) {
		// mai lasciare acceso il microfono (e la sua spia) se non lo si può usare
		for (const traccia of stream.getTracks()) traccia.stop();
		rilascia();
		throw errore('non-supportato', { cause: e });
	}

	const traccia = stream.getTracks()[0];
	let chiuso = false;
	function chiudi() {
		if (chiuso) return;
		chiuso = true;
		removeEventListener('pagehide', lasciata);
		document.removeEventListener('visibilitychange', nascosta);
		for (const tipo of ['ended', 'mute']) traccia?.removeEventListener?.(tipo, interrotto);
		smonta();
		sorgente.disconnect();
		for (const traccia of stream.getTracks()) traccia.stop();
		rilascia();
	}
	function chiudiDaSolo(motivo: MotivoChiusura) {
		if (chiuso) return;
		chiudi();
		onchiuso?.(motivo);
	}
	const lasciata = () => chiudiDaSolo('pagina-lasciata');
	const nascosta = () => {
		if (document.visibilityState === 'hidden') chiudiDaSolo('nascosta');
	};
	// senza questo un microfono muto sembra un bambino che non canta o non batte: meglio ricominciare
	const interrotto = () => chiudiDaSolo('interrotto');
	addEventListener('pagehide', lasciata);
	document.addEventListener('visibilitychange', nascosta);
	for (const tipo of ['ended', 'mute']) traccia?.addEventListener?.(tipo, interrotto);
	return {
		c,
		sorgente,
		impostazioni: traccia?.getSettings?.() ?? {},
		get chiuso() {
			return chiuso;
		},
		chiudi
	};
}
