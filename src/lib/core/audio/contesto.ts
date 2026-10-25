// Un solo AudioContext per tutto il sito, creato al primo uso: mai durante l'import (SSR e prerender).
// Le sorgenti passano da un compressore che taglia i picchi e da un volume moderato.
import { IDLE_SUSPEND_MS, VOLUME } from './costanti.ts';
import { audioDisponibile } from '../piattaforma.ts';

let ctx: AudioContext | undefined;
let ingresso: AudioNode | undefined;
let riproduzioni = 0;
let microfoni = 0;
let voci = 0;
let timerSospensione: ReturnType<typeof setTimeout> | undefined;

/**
 * Sessione audio di iPhone e iPad (Safari 16.4+; altrove non c'è e non si fa niente). Di suo Web Audio
 * è 'ambient', che il tasto silenzioso ammutolisce: il sito suona come un video ('playback') e, con il
 * microfono aperto, ascolta e suona insieme ('play-and-record').
 * ponytail: non provato su un iPhone vero (anche l'uscita sull'altoparlante con il microfono aperto).
 */
function sessione() {
	const s = (globalThis.navigator as { audioSession?: { type: string } } | undefined)?.audioSession;
	if (s) s.type = microfoni > 0 ? 'play-and-record' : 'playback';
}

/**
 * Senza Web Audio, un contesto muto al posto di quello vero: il clock avanza con performance.now() e i nodi
 * non fanno niente. Così pianifica(), synth, percussioni e le animazioni guidate dall'audio vanno avanti in
 * silenzio invece di lanciare al primo tocco, e le attività restano giocabili; il microfono dà ErroreMic
 * 'non-supportato' (mic.ts). Ha solo quello che usano contesto.ts, synth.ts e percussioni.ts.
 */
function contestoMuto(): AudioContext {
	const param = () => ({
		value: 0,
		setValueAtTime() {},
		linearRampToValueAtTime() {},
		exponentialRampToValueAtTime() {},
		setTargetAtTime() {}
	});
	const nodo = () => ({
		gain: param(),
		frequency: param(),
		threshold: param(),
		knee: param(),
		ratio: param(),
		attack: param(),
		release: param(),
		buffer: null,
		onended: null,
		connect: <N>(n: N) => n,
		disconnect() {},
		start() {},
		stop() {},
		setPeriodicWave() {}
	});
	return {
		state: 'running',
		sampleRate: 48_000,
		outputLatency: 0,
		baseLatency: 0,
		get currentTime() {
			return performance.now() / 1000;
		},
		destination: nodo(),
		resume: async () => {},
		suspend: async () => {},
		createGain: nodo,
		createDynamicsCompressor: nodo,
		createOscillator: nodo,
		createBufferSource: nodo,
		createPeriodicWave: () => ({}),
		createBuffer: (_canali: number, length: number) => {
			const dati = new Float32Array(length);
			return { length, getChannelData: () => dati };
		}
	} as unknown as AudioContext;
}

/** Un clock in 'running' rimasto indietro di tanto rispetto al tempo vero vuol dire contesto muto. */
const FERMO_MS = 250;
/** l'ultima volta che lo si è visto in 'running': currentTime e performance.now() (t NaN: da rifare) */
let visto = { t: NaN, ms: 0 };
/** quando lo si è rimesso in moto l'ultima volta */
let rimesso = -Infinity;

/**
 * Vero se il contesto è rimasto muto, e allora chi chiama lo rimette in moto: su iOS, dopo un'altra app, lo
 * schermo bloccato o un suono di sistema, resta 'interrupted' (fuori standard) oppure 'running' con il clock
 * fermo (WebKit 276016, 283419, 291892). Un clock sano avanza quanto il tempo vero: se dall'ultima volta che
 * lo si è visto in 'running' è rimasto indietro di più di FERMO_MS si è fermato, anche se nel frattempo era
 * avanzato un po' (un suono di sistema con la pagina in vista: si vede già al primo tocco). Da 0 invece può
 * partire in ritardo, e lì conta solo se è ancora fermo. Appena rimesso in moto no: il suo stato cambia
 * dopo, e nello stesso gesto basta una volta.
 */
function muto(c: AudioContext): boolean {
	const ms = performance.now();
	if (ms - rimesso < FERMO_MS) return false;
	const t = c.currentTime;
	const indietro = ms - visto.ms - (t - visto.t) * 1000; // NaN se non c'è un'osservazione in 'running'
	const fermo =
		(c.state as string) === 'interrupted' ||
		(c.state === 'running' && indietro > FERMO_MS && (visto.t > 0 || t === 0));
	if (fermo) rimesso = ms;
	// fermo si conta da quando lo era già; dopo un altro stato o una rimessa in moto si riparte da capo
	if (fermo || c.state !== 'running') visto = { t: NaN, ms };
	else if (t !== visto.t) visto = { t, ms };
	return fermo;
}

/**
 * Sveglia il contesto, nel gesto: uno muto si rimette in moto con suspend() e subito resume(), il rimedio
 * delle fonti. resume() parte senza aspettare suspend() (iOS lo accetta solo nel gesto) e non va mai
 * aspettato: nell'app installata a volte non si risolve. Se resta muto, l'avviso ios-audio-muto dice
 * all'adulto di ricaricare.
 * ponytail: non provato su un iPhone vero (docs/prove-su-dispositivi.md, ritorno da un'altra app).
 */
function sveglia(c: AudioContext): Promise<void> {
	const fermo = muto(c);
	if (fermo) void c.suspend().catch(() => {});
	return c.state === 'running' && !fermo ? Promise.resolve() : c.resume();
}

/**
 * Al ritorno sulla pagina, senza gesto: un contesto muto si sospende (subito, o poco dopo se il clock si
 * ferma proprio al ritorno) e riparte solo se qualcosa lo sta usando; altrimenti resta sospeso, per la batteria, e lo
 * risveglia la prossima sorgente o il prossimo gesto (sveglia).
 */
function alRitorno() {
	if (document.visibilityState !== 'visible') return;
	const riprendi = () => {
		if (!ctx || !muto(ctx)) return;
		void ctx.suspend().catch(() => {});
		if (riproduzioni + microfoni > 0) void ctx.resume().catch(() => {});
	};
	riprendi();
	setTimeout(riprendi, 2 * FERMO_MS); // con margine: un timer puntuale vedrebbe il clock fermo per un pelo meno
}

export function contesto(): AudioContext {
	if (!ctx) {
		ctx = audioDisponibile() ? new AudioContext({ latencyHint: 'interactive' }) : contestoMuto();
		// protezione delle orecchie: un accordo o un errore non superano mai un livello moderato
		const compressore = ctx.createDynamicsCompressor();
		compressore.threshold.value = -10;
		compressore.knee.value = 10;
		compressore.ratio.value = 12;
		compressore.attack.value = 0.003;
		compressore.release.value = 0.25;
		const volume = ctx.createGain();
		volume.gain.value = VOLUME;
		compressore.connect(volume).connect(ctx.destination);
		ingresso = compressore;
		globalThis.document?.addEventListener('visibilitychange', alRitorno);
	}
	return ctx;
}

/** Il nodo a cui si collegano tutte le sorgenti che suonano. */
export function uscita(): AudioNode {
	contesto();
	return ingresso!;
}

/**
 * Da chiamare dentro un gesto (tocco, clic, tasto) prima di qualunque await: Safari su iOS fa partire
 * l'audio solo così. Gli altri browser lo permettono anche dopo la prima interazione con la pagina.
 */
export function sblocca(): Promise<void> {
	const c = contesto();
	sessione();
	return sveglia(c);
}

/** Tempo del clock audio in secondi (0 se l'audio non è mai partito). */
export const ora = (): number => ctx?.currentTime ?? 0;

/**
 * Il riferimento del suono sentito (ADR 0008): il tempo sul clock audio di quello che usciva
 * dall'altoparlante all'istante `ms` (scala di performance.now(): il `timeStamp` di un pointerdown o di un
 * keydown, oppure adesso), meno la manopola `latenzaMs`. Un tocco fatto proprio mentre si sentiva un suono
 * programmato a `t` dà `t`. Anche il battito visivo si disegna con tempoSentito(), in fase con i clic.
 * Usa getOutputTimestamp() (contextTime ↔ performanceTime del campione in uscita) quando dà valori
 * sensati; altrimenti currentTime − (outputLatency || baseLatency) e l'età dell'evento.
 * 0 se l'audio non è mai partito, come ora().
 */
export function tempoSentito(ms = performance.now(), latenzaMs = 0): number {
	if (!ctx) return 0;
	// prima che l'uscita parta (e su alcuni browser sempre) i due tempi valgono 0
	const ts = ctx.getOutputTimestamp?.();
	const sentito =
		ts?.contextTime && ts.performanceTime
			? ts.contextTime + (ms - ts.performanceTime) / 1000
			: ctx.currentTime -
				(ctx.outputLatency || ctx.baseLatency || 0) -
				(performance.now() - ms) / 1000;
	return sentito - latenzaMs / 1000;
}

/**
 * Vero mentre il sito suona o legge ad alta voce (più una breve coda): nei turni ascolta/canta il
 * microfono non ascolta.
 */
export const riproduzioneAttiva = (): boolean => riproduzioni + voci > 0;

/**
 * Segna una lettura ad alta voce (sintesi o voce registrata): non passa da Web Audio, quindi non
 * sveglia il contesto, ma il microfono non deve sentirla come canto. Restituisce rilascia, idempotente.
 */
export function segnaVoce(): () => void {
	voci++;
	let rilasciata = false;
	return () => {
		if (rilasciata) return;
		rilasciata = true;
		voci--;
	};
}

/**
 * Segna una sorgente in uso: finché non la rilasci l'AudioContext resta sveglio. Senza sorgenti per
 * IDLE_SUSPEND_MS si sospende, per la batteria, e la prossima sorgente lo risveglia.
 */
export function usa(tipo: 'riproduzione' | 'microfono'): () => void {
	const c = contesto();
	clearTimeout(timerSospensione);
	void sveglia(c);
	if (tipo === 'riproduzione') riproduzioni++;
	else microfoni++;
	sessione();
	let rilasciata = false;
	return () => {
		if (rilasciata) return;
		rilasciata = true;
		if (tipo === 'riproduzione') riproduzioni--;
		else microfoni--;
		sessione();
		if (riproduzioni + microfoni > 0) return;
		timerSospensione = setTimeout(() => {
			if (riproduzioni + microfoni === 0 && c.state === 'running') void c.suspend();
		}, IDLE_SUSPEND_MS);
	};
}

/** Si programma quello che suona entro LOOKAHEAD_S, a giri di GIRO_MS ("A Tale of Two Clocks"). */
const LOOKAHEAD_S = 0.1;
const GIRO_MS = 25;
/** margine prima del primo evento, perché arrivi in tempo */
const AVVIO_S = 0.05;

export type Pianificazione = {
	/** inizio sul clock audio: l'evento con `inizio` s suona a `t0 + inizio` */
	t0: number;
	/** si risolve a fine riproduzione o con ferma() */
	fine: Promise<void>;
	ferma(): void;
};

/**
 * Chiama `programma(evento, quando)` poco prima che ogni evento suoni, con `quando` sul clock audio:
 * gli eventi non programmati si possono ancora fermare (e, in futuro, cambiare di tempo).
 * Per tutta la `durata` (s) la riproduzione è attiva.
 * ponytail: setTimeout rallenta a 1 s nelle schede in background; un Worker come orologio se il ritmo lo chiederà
 */
export function pianifica<E extends { inizio: number }>(
	eventi: readonly E[],
	programma: (evento: E, quando: number) => void,
	durata: number
): Pianificazione {
	const c = contesto();
	const rilascia = usa('riproduzione');
	const coda = [...eventi].sort((a, b) => a.inizio - b.inizio);
	const t0 = c.currentTime + AVVIO_S;
	let prossimo = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let risolvi!: () => void;
	const fine = new Promise<void>((ok) => (risolvi = ok));

	function ferma() {
		clearTimeout(timer);
		rilascia();
		risolvi();
	}
	function giro() {
		const limite = c.currentTime + LOOKAHEAD_S;
		while (prossimo < coda.length && t0 + coda[prossimo].inizio < limite) {
			programma(coda[prossimo], t0 + coda[prossimo].inizio);
			prossimo++;
		}
		if (c.currentTime >= t0 + durata) ferma();
		else timer = setTimeout(giro, GIRO_MS);
	}
	giro();
	return { t0, fine, ferma };
}
