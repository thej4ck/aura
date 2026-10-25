// battimani.ts sui segnali realistici di scripts/genera-wav.mjs: battiti di mani in stanze che
// riverberano, rumori di fondo, voci che parlano e cantano, i clic del sito con la loro eco. Ogni test
// CONTA i battiti trovati e misura l'errore di tempo. Prima il rilevatore puro, poi apriBattiMani con
// AudioContext, AudioWorklet e getUserMedia finti.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	campioniAltoparlante,
	campioniBattiMani,
	campioniRumore,
	campioniSillabe,
	campioniVoce,
	somma
} from '../../../../scripts/genera-wav.mjs';
import { REFRATTARIO_BATTITO_MS } from './costanti.ts';
import { RilevatoreBattiti, type BattitoMani } from './battimani.ts';

const SR = 48_000;
const BATTITO = 60 / 72;

/** I battiti trovati (s), con il rilevatore che riceve il segnale a blocchi di `blocco` campioni. */
function rileva(x: Float64Array, { sr = SR, blocco = 512 as number | (() => number) } = {}) {
	const r = new RilevatoreBattiti(sr);
	const trovati: { t: number; forza: number }[] = [];
	for (let i = 0; i < x.length;) {
		const n = typeof blocco === 'number' ? blocco : blocco();
		for (const a of r.elabora(Float32Array.from(x.subarray(i, i + n)), i)) {
			trovati.push({ t: a.frame / sr, forza: a.forza });
		}
		i += n;
	}
	return Object.assign(trovati, { rumore: r.rumore.rms });
}

/** Ogni battito atteso con il trovato più vicino: quanti entro ±5 ms, quanti in più, errore massimo (ms). */
function confronta(trovati: { t: number }[], attesi: { t: number }[]) {
	const errori = attesi.map((a) => Math.min(...trovati.map((b) => Math.abs(b.t - a.t))) * 1000);
	const giusti = errori.filter((e) => e <= 5).length;
	return { trovati: giusti, inPiu: trovati.length - giusti, erroreMaxMs: Math.max(...errori) };
}

/**
 * Un ritmo battuto da un bambino a 72 BPM (TA TI-TI TA-A TI-TI TA TA SST TA, due volte), con le sue
 * imprecisioni (fino a ±40 ms) e battiti forti e piani (picco da 0,02 a 0,6, da −34 a −4 dBFS).
 */
const IMPRECISIONI = [0, -0.031, 0.018, -0.007, 0.04, -0.022, 0.009, -0.035, 0.026, 0.013, -0.016];
const AMPIEZZE = [0.3, 0.05, 0.6, 0.02, 0.15, 0.4, 0.08, 0.03, 0.5, 0.1, 0.2];
const RITMO = [0, 1, 1.5, 2, 4, 4.5, 5, 6, 8, 9, 9.5, 10, 12, 12.5, 13, 14, 16].map((b, i) => ({
	t: 0.6 + b * BATTITO + IMPRECISIONI[i % IMPRECISIONI.length],
	ampiezza: AMPIEZZE[i % AMPIEZZE.length]
}));
const SECONDI = 15.5;
/** la stanza silenziosa: un filo di rumore rosa a −66 dBFS */
const quiete = (secondi = SECONDI, sampleRate = SR) =>
	campioniRumore({ tipo: 'rosa', rms: 0.0005, secondi, seme: 11, sampleRate });

describe('RilevatoreBattiti: un battito vero = un evento, preciso al campione', () => {
	it('battiti irregolari, forti e piani, in un soggiorno: tutti, nessuno in più, entro ±5 ms', () => {
		const x = somma(campioniBattiMani({ battiti: RITMO, secondi: SECONDI }), quiete());
		const trovati = rileva(x);
		expect(RITMO).toHaveLength(17);
		const c = confronta(trovati, RITMO);
		expect(c).toMatchObject({ trovati: 17, inPiu: 0 });
		expect(c.erroreMaxMs).toBeLessThan(2); // l'attacco al campione: ben dentro i ±5 ms
		// la forza segue il battito: il più forte e il più piano
		const forza = (t: number) => trovati.find((b) => Math.abs(b.t - t) < 0.005)!.forza;
		expect(forza(RITMO[2].t)).toBeGreaterThan(10 * forza(RITMO[3].t));
	});

	it("in un'aula che rimbomba (RT60 0,8 s, a due metri), e a 44,1 kHz", () => {
		// lì un battito 30 dB più piano del precedente, 400 ms dopo, sta sotto la sua coda (e non si
		// sente neanche a orecchio): tra due battiti vicini al massimo 20 dB
		const aula = { rt60: 0.8, drrDb: -6, coda: 0.6 };
		const battiti = RITMO.map((b) => ({ ...b, ampiezza: Math.max(0.06, b.ampiezza) }));
		const x = somma(
			campioniBattiMani({ battiti, secondi: SECONDI, stanza: aula, seme: 3 }),
			quiete()
		);
		expect(confronta(rileva(x), battiti)).toMatchObject({ trovati: 17, inPiu: 0 });
		const sr = 44_100;
		const x44 = somma(
			campioniBattiMani({ battiti: RITMO, secondi: SECONDI, seme: 4, sampleRate: sr }),
			quiete(SECONDI, sr)
		);
		const c = confronta(rileva(x44, { sr }), RITMO);
		expect(c).toMatchObject({ trovati: 17, inPiu: 0 });
		expect(c.erroreMaxMs).toBeLessThan(2);
	});

	it('blocchi di qualunque lunghezza (anche 100 ms, a thread occupato) danno gli stessi battiti', () => {
		const x = somma(campioniBattiMani({ battiti: RITMO, secondi: SECONDI, seme: 5 }), quiete());
		const base = rileva(x).map((b) => b.t);
		expect(base).toHaveLength(17);
		let seme = 7;
		const casuale = () => 1 + ((seme = (seme * 16807) % 2147483647) % 6000);
		for (const blocco of [128, 441, 4800, casuale]) {
			expect(rileva(x, { blocco }).map((b) => b.t)).toEqual(base);
		}
	});

	it(`dopo un battito ${REFRATTARIO_BATTITO_MS} ms di sordità: un doppio battito conta uno, due veri due`, () => {
		const battiti = [
			{ t: 1, ampiezza: 0.3 },
			{ t: 1.08, ampiezza: 0.3 }, // le mani che rimbalzano
			{ t: 2, ampiezza: 0.3 },
			{ t: 2.2, ampiezza: 0.3 } // due crome a 150 BPM: fuori dal refrattario
		];
		const trovati = rileva(somma(campioniBattiMani({ battiti, secondi: 3 }), quiete(3)));
		expect(trovati.map((b) => Math.round(b.t * 100) / 100)).toEqual([1, 2, 2.2]);
	});
});

describe('RilevatoreBattiti: niente eventi dal rumore e dalla voce', () => {
	it('ventola, rumore rosa e fruscio, piano e forte (da −60 a −26 dBFS): zero', () => {
		for (const tipo of ['ventola', 'rosa', 'bianco'] as const) {
			for (const rms of [0.001, 0.01, 0.05]) {
				const x = campioniRumore({ tipo, rms, secondi: 8, seme: 21 });
				expect(rileva(x), `${tipo} a ${rms}`).toHaveLength(0);
			}
		}
	});

	it('la voce che dice «ta ti-ti ta-a sst», piano, forte e vicinissima, anche veloce: zero', () => {
		for (const [picco, battitoS, sillabe] of [
			[0.05, BATTITO, 'ta ti-ti ta-a sst'],
			[0.2, BATTITO, 'ta ti-ti ta-a sst'],
			[0.8, BATTITO, 'ta sst ti-ti ta'],
			[0.3, 0.4, 'ti-ti ta ti-ti ta-a']
		] as const) {
			const voce = campioniSillabe({ sillabe, picco, battitoS, secondi: 10, seme: 31 });
			expect(rileva(somma(voce, quiete(10))), `${sillabe} a ${picco}`).toHaveLength(0);
		}
	});

	it('la voce che canta, a sillabe con il vibrato o una nota tenuta: zero', () => {
		for (const picco of [0.1, 0.6]) {
			const x = campioniSillabe({ picco, cantato: true, secondi: 10, sillabe: 'ta ti-ti ta-a' });
			expect(rileva(x), `sillabe cantate a ${picco}`).toHaveLength(0);
		}
		for (const rms of [0.01, 0.1]) {
			expect(rileva(campioniVoce({ rms, secondi: 10 })), `nota tenuta a ${rms}`).toHaveLength(0);
		}
	});

	it('battiti mentre si dicono o si cantano le sillabe (voce 20 dB sotto): i battiti sì, la voce no', () => {
		const forti = RITMO.map((b) => ({ ...b, ampiezza: Math.max(0.1, b.ampiezza) }));
		const battiti = campioniBattiMani({ battiti: forti, secondi: SECONDI, seme: 6 });
		const sillabe = 'ta ti-ti ta-a ti-ti ta ta sst ta';
		const parla = campioniSillabe({ picco: 0.01, inizio: 0.6, secondi: SECONDI, sillabe });
		const canta = campioniSillabe({ picco: 0.01, inizio: 0.6, secondi: SECONDI, cantato: true });
		for (const voce of [parla, canta]) {
			const trovati = rileva(somma(battiti, voce, quiete()));
			expect(confronta(trovati, forti)).toMatchObject({ trovati: 17, inPiu: 0 });
		}
	});
});

describe('RilevatoreBattiti: soglia adattiva sul rumore di fondo', () => {
	const DIECI = Array.from({ length: 10 }, (_, i) => ({ t: 3 + i * 0.6, ampiezza: 0.03 }));
	const ventola = (secondi: number) =>
		somma(
			campioniRumore({ tipo: 'ventola', rms: 0.01, secondi, seme: 41 }),
			campioniRumore({ tipo: 'rosa', rms: 0.003, secondi, seme: 42 })
		);

	it('il rumore stimato sale con la ventola; un battito piano (−30 dBFS) sopra la ventola (−40) si sente', () => {
		const x = somma(campioniBattiMani({ battiti: DIECI, secondi: 9, seme: 8 }), ventola(9));
		const trovati = rileva(x);
		expect(trovati.rumore).toBeGreaterThan(1e-3);
		expect(rileva(quiete(9)).rumore).toBeLessThan(trovati.rumore / 4);
		expect(confronta(trovati, DIECI)).toMatchObject({ trovati: 10, inPiu: 0 });
	});

	it('battiti sotto il rumore della ventola: nessun evento, nemmeno per sbaglio', () => {
		const deboli = DIECI.map((b) => ({ ...b, ampiezza: 0.004 }));
		const x = somma(campioniBattiMani({ battiti: deboli, secondi: 9 }), ventola(9));
		expect(rileva(x)).toHaveLength(0);
	});
});

// --- apriBattiMani, con l'ambiente finto -------------------------------------------------------------

const nodo = () => ({ connect: vi.fn((n: unknown) => n), disconnect: vi.fn() });
const param = () => ({ value: 0 });

/** quello che "sente" il microfono finto, dal frame 0 */
let segnale = new Float64Array(0);

class NodoWorklet {
	static creati: NodoWorklet[] = [];
	port = { onmessage: null as ((e: { data: unknown }) => void) | null, postMessage: vi.fn() };
	constructor(
		readonly c: ContestoFinto,
		readonly nome: string,
		readonly opzioni: AudioWorkletNodeOptions
	) {
		NodoWorklet.creati.push(this);
	}
	/** il worklet manda un blocco di 512 campioni dal frame `primo` */
	invia(primo: number) {
		const campioni = Float32Array.from(segnale.subarray(primo, primo + 512));
		this.port.onmessage?.({ data: { primo, campioni } });
	}
}

class ContestoFinto {
	currentTime = 0;
	sampleRate = SR;
	state = 'running';
	outputLatency = 0.02;
	baseLatency = 0.005;
	destination = nodo();
	sorgente = nodo();
	resume = vi.fn(async () => {});
	suspend = vi.fn(async () => {});
	audioWorklet: { addModule: ReturnType<typeof vi.fn> } | undefined = {
		addModule: vi.fn(async () => {})
	};
	createGain = () => ({ ...nodo(), gain: param() });
	createDynamicsCompressor = () => ({
		...nodo(),
		threshold: param(),
		knee: param(),
		ratio: param(),
		attack: param(),
		release: param()
	});
	createMediaStreamSource = () => this.sorgente;
	analizzatore = {
		...nodo(),
		fftSize: 0,
		/** gli ultimi fftSize campioni fino a currentTime */
		getFloatTimeDomainData: (b: Float32Array) => {
			const fine = Math.round(this.currentTime * SR);
			for (let i = 0; i < b.length; i++) b[i] = segnale[fine - b.length + i] ?? 0;
		}
	};
	createAnalyser = () => this.analizzatore;
}

let traccia: {
	stop: ReturnType<typeof vi.fn>;
	getSettings: () => MediaTrackSettings;
	addEventListener: (tipo: string, f: () => void) => void;
	removeEventListener: (tipo: string) => void;
};
/** gli ascoltatori della traccia del microfono: 'ended', 'mute' */
const allaTraccia = new Map<string, () => void>();
let getUserMedia: ReturnType<typeof vi.fn>;
let prossimoFrame: (() => void) | undefined;
const ascoltatori = new Map<string, () => void>();
let mani: typeof import('./battimani.ts');
let audio: typeof import('./contesto.ts');
let mic: typeof import('./mic.ts');

describe('apriBattiMani', () => {
	beforeEach(async () => {
		NodoWorklet.creati = [];
		allaTraccia.clear();
		traccia = {
			stop: vi.fn(),
			getSettings: () => ({ latency: 0.01 }) as MediaTrackSettings,
			addEventListener: (tipo, f) => allaTraccia.set(tipo, f),
			removeEventListener: (tipo) => allaTraccia.delete(tipo)
		};
		getUserMedia = vi.fn(async () => ({ getTracks: () => [traccia] }));
		vi.stubGlobal('isSecureContext', true);
		vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
		vi.stubGlobal('AudioContext', ContestoFinto);
		vi.stubGlobal('AudioWorkletNode', NodoWorklet);
		vi.stubGlobal('requestAnimationFrame', (f: () => void) => ((prossimoFrame = f), 1));
		vi.stubGlobal('cancelAnimationFrame', () => (prossimoFrame = undefined));
		vi.stubGlobal('addEventListener', (tipo: string, f: () => void) => ascoltatori.set(tipo, f));
		vi.stubGlobal('removeEventListener', (tipo: string) => ascoltatori.delete(tipo));
		vi.stubGlobal('document', {
			visibilityState: 'visible',
			addEventListener: (tipo: string, f: () => void) => ascoltatori.set(tipo, f),
			removeEventListener: (tipo: string) => ascoltatori.delete(tipo)
		});
		vi.resetModules();
		mani = await import('./battimani.ts');
		audio = await import('./contesto.ts');
		mic = await import('./mic.ts');
	});
	afterEach(() => vi.unstubAllGlobals());

	const contesto = () => audio.contesto() as unknown as ContestoFinto;

	/**
	 * Fa arrivare il segnale dal worklet, un blocco ogni 512 campioni, fino a `secondi`. Il thread
	 * principale riceve ogni blocco `ritardo` s dopo (currentTime avanza con lui); `ognuno` gira prima.
	 */
	function ascolta(secondi: number, { ritardo = 0.003, ognuno = (t: number) => void t } = {}) {
		const c = contesto();
		const w = NodoWorklet.creati.at(-1)!;
		for (let primo = 0; primo + 512 <= secondi * SR; primo += 512) {
			c.currentTime = (primo + 512) / SR + ritardo;
			ognuno(c.currentTime);
			w.invia(primo);
		}
	}

	it('microfono senza filtri, campioni dal worklet (da self), mai verso gli altoparlanti', async () => {
		const m = await mani.apriBattiMani({ onbattito: () => {} });
		expect(getUserMedia).toHaveBeenCalledWith({
			audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
		});
		const c = contesto();
		expect(c.audioWorklet!.addModule).toHaveBeenCalledOnce();
		expect(String(c.audioWorklet!.addModule.mock.calls[0][0])).toMatch(/battimani\.worklet/);
		const [w] = NodoWorklet.creati;
		expect(w.nome).toBe('battimani');
		expect(w.opzioni).toMatchObject({ numberOfInputs: 1, numberOfOutputs: 0, channelCount: 1 });
		expect(c.sorgente.connect.mock.calls).toEqual([[w]]);
		expect(m).toMatchObject({
			cattura: 'worklet',
			sampleRate: SR,
			impostazioni: { latency: 0.01 }
		});
	});

	it('ogni battito sul clock del suono sentito: tolte latenza d’uscita, d’ingresso e manopola', async () => {
		segnale = somma(campioniBattiMani({ battiti: RITMO, secondi: SECONDI }), quiete());
		const battiti: BattitoMani[] = [];
		await mani.apriBattiMani({ onbattito: (b) => battiti.push(b), latenzaMs: 30 });
		ascolta(SECONDI);
		// uscita 0,02 s, ingresso 0,01 s, manopola 0,03 s
		const sentiti = battiti.map((b) => ({ t: b.t + 0.06 }));
		expect(confronta(sentiti, RITMO)).toMatchObject({ trovati: 17, inPiu: 0 });
	});

	it('turni: mentre suona il sito nessun evento, nemmeno dai clic d’attacco e dalla loro eco', async () => {
		// il sito suona una battuta di clic d'attacco (forti, nella stanza), poi il bambino batte
		const clic = [0, 1, 2, 3].map((k) => ({
			t: 0.5 + k * BATTITO,
			ampiezza: 0.5,
			timbro: k === 0 ? ('accento' as const) : ('clic' as const)
		}));
		const bambino = [4, 5, 5.5, 6, 8].map((b) => ({ t: 0.5 + b * BATTITO, ampiezza: 0.2 }));
		segnale = somma(
			campioniAltoparlante({ colpi: clic, secondi: 8 }),
			campioniBattiMani({ battiti: bambino, secondi: 8 }),
			quiete(8)
		);
		// il sito resta "attivo" fino all'ultimo clic, più la sua coda (30 ms), l'eco (CODA_S) e l'uscita
		const fineSito = clic.at(-1)!.t + 0.03 + 0.15 + 0.02;
		for (const ritardo of [0.003, 0.1]) {
			const battiti: BattitoMani[] = [];
			const m = await mani.apriBattiMani({ onbattito: (b) => battiti.push(b) });
			const rilascia = audio.usa('riproduzione');
			// ritardo 0,1: il thread principale, occupato, riceve tutto 100 ms dopo
			ascolta(8, { ritardo, ognuno: (t) => void (t >= fineSito && rilascia()) });
			m.chiudi();
			const sentiti = battiti.map((b) => ({ t: b.t + 0.03 }));
			expect(confronta(sentiti, bambino), `ritardo ${ritardo}`).toMatchObject({
				trovati: 5,
				inPiu: 0
			});
		}
		// senza turni, gli stessi clic sarebbero battiti: è il silenzio del microfono che li toglie
		const battiti: BattitoMani[] = [];
		await mani.apriBattiMani({ onbattito: (b) => battiti.push(b) });
		ascolta(8);
		expect(battiti).toHaveLength(9);
	});

	it('chiudi(): ferma il worklet e il microfono; scheda nascosta: si chiude da solo e lo dice', async () => {
		const onchiuso = vi.fn();
		const onbattito = vi.fn();
		const m = await mani.apriBattiMani({ onbattito, onchiuso });
		const [w] = NodoWorklet.creati;
		m.chiudi();
		m.chiudi();
		expect(traccia.stop).toHaveBeenCalledOnce();
		expect(w.port.postMessage).toHaveBeenCalledExactlyOnceWith('fine');
		expect(w.port.onmessage).toBeNull();
		expect(contesto().sorgente.disconnect).toHaveBeenCalled();
		expect(onchiuso).not.toHaveBeenCalled();

		await mani.apriBattiMani({ onbattito, onchiuso });
		(document as { visibilityState: string }).visibilityState = 'hidden';
		ascoltatori.get('visibilitychange')!();
		expect(onchiuso).toHaveBeenCalledExactlyOnceWith('nascosta');
		expect(traccia.stop).toHaveBeenCalledTimes(2);
		expect(NodoWorklet.creati[1].port.postMessage).toHaveBeenCalledWith('fine');
	});

	it('pagina lasciata mentre si carica il worklet: niente grafo, microfono già chiuso', async () => {
		let carica: (() => void) | undefined;
		vi.stubGlobal(
			'AudioContext',
			class extends ContestoFinto {
				audioWorklet = { addModule: vi.fn(() => new Promise<void>((ok) => (carica = ok))) };
			}
		);
		vi.resetModules();
		mani = await import('./battimani.ts');
		const onchiuso = vi.fn();
		const aperto = mani.apriBattiMani({ onbattito: () => {}, onchiuso });
		await vi.waitFor(() => expect(carica).toBeDefined());
		ascoltatori.get('pagehide')!();
		carica!();
		await aperto;
		expect(onchiuso).toHaveBeenCalledExactlyOnceWith('pagina-lasciata');
		expect(traccia.stop).toHaveBeenCalledOnce();
		expect(NodoWorklet.creati).toHaveLength(0);
	});

	it('senza AudioWorklet: ripiego su rAF, che legge solo i campioni nuovi (anche dopo 100 ms fermo)', async () => {
		vi.stubGlobal(
			'AudioContext',
			class extends ContestoFinto {
				audioWorklet = undefined;
			}
		);
		vi.resetModules();
		mani = await import('./battimani.ts');
		audio = await import('./contesto.ts');
		segnale = somma(campioniBattiMani({ battiti: RITMO, secondi: SECONDI }), quiete());
		const battiti: BattitoMani[] = [];
		const m = await mani.apriBattiMani({ onbattito: (b) => battiti.push(b) });
		expect(m.cattura).toBe('raf');
		const c = contesto();
		expect(c.analizzatore.fftSize).toBe(8192);
		expect(c.sorgente.connect.mock.calls).toEqual([[c.analizzatore]]);
		// rAF a 60 Hz, con il thread fermo 100 ms ogni mezzo secondo
		for (let k = 1; c.currentTime < SECONDI; k++) {
			c.currentTime += k % 30 === 0 ? 0.1 : 1 / 60;
			prossimoFrame!();
		}
		const sentiti = battiti.map((b) => ({ t: b.t + 0.03 }));
		expect(confronta(sentiti, RITMO)).toMatchObject({ trovati: 17, inPiu: 0 });
		m.chiudi();
		expect(prossimoFrame).toBeUndefined();
	});

	it('un worklet che si carica ma non manda blocchi: dopo mezzo secondo si passa al ripiego, e si sente', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		try {
			segnale = somma(campioniBattiMani({ battiti: RITMO, secondi: SECONDI }), quiete());
			const battiti: BattitoMani[] = [];
			const m = await mani.apriBattiMani({ onbattito: (b) => battiti.push(b) });
			const c = contesto();
			const [w] = NodoWorklet.creati;
			expect(m.cattura).toBe('worklet');
			// il contesto che ancora non parte non conta: si aspetta il suo clock, non l'orologio
			vi.advanceTimersByTime(2000);
			expect(m.cattura).toBe('worklet');
			c.currentTime = 0.55;
			vi.advanceTimersByTime(100);
			expect(m.cattura).toBe('raf');
			expect(w.port.postMessage).toHaveBeenCalledExactlyOnceWith('fine');
			expect(w.port.onmessage).toBeNull();
			expect(c.sorgente.disconnect).toHaveBeenCalledWith(w);
			while ((c.currentTime += 1 / 60) < SECONDI) prossimoFrame!();
			const sentiti = battiti.map((b) => ({ t: b.t + 0.03 }));
			expect(confronta(sentiti, RITMO)).toMatchObject({ trovati: 17, inPiu: 0 });
			m.chiudi();
			expect(prossimoFrame).toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it('i blocchi arrivano: niente ripiego', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		try {
			const m = await mani.apriBattiMani({ onbattito: () => {} });
			ascolta(1);
			vi.advanceTimersByTime(2000);
			expect(m.cattura).toBe('worklet');
			expect(contesto().analizzatore.connect).not.toHaveBeenCalled();
			expect(NodoWorklet.creati[0].port.postMessage).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});

	it('la traccia si interrompe (una chiamata, il microfono scollegato): si chiude e lo dice', async () => {
		for (const tipo of ['ended', 'mute']) {
			const onchiuso = vi.fn();
			await mani.apriBattiMani({ onbattito: () => {}, onchiuso });
			allaTraccia.get(tipo)!();
			expect(onchiuso, tipo).toHaveBeenCalledExactlyOnceWith('interrotto');
			expect(NodoWorklet.creati.at(-1)!.port.postMessage).toHaveBeenCalledWith('fine');
			expect(allaTraccia.size, 'gli ascoltatori se ne vanno con il microfono').toBe(0);
		}
		expect(traccia.stop).toHaveBeenCalledTimes(2);
	});

	it('permesso negato: ErroreMic con il suo codice, e nessun grafo', async () => {
		getUserMedia.mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
		const errore = await mani.apriBattiMani({ onbattito: () => {} }).catch((e: unknown) => e);
		expect(errore).toBeInstanceOf(mic.ErroreMic);
		expect((errore as InstanceType<typeof mic.ErroreMic>).codice).toBe('permesso-negato');
		expect(NodoWorklet.creati).toHaveLength(0);
	});
});
