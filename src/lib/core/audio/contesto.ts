// Un solo AudioContext per tutto il sito, creato al primo uso: mai durante l'import (SSR e prerender).
// Le sorgenti passano da un compressore che taglia i picchi e da un volume moderato.
import { IDLE_SUSPEND_MS, VOLUME } from './costanti.ts';

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

// ponytail: senza Web Audio (Modalità di isolamento) new AudioContext lancia e i pulsanti che suonano non fanno
// niente: lo dice all'adulto l'avviso apple-isolamento. Un'Aura muta ma giocabile (pianifica() e sblocca() a vuoto)
// se le segnalazioni la chiederanno.
// ponytail: su iOS, dopo un'altra app, il contesto può restare muto (avviso ios-audio-muto): suspend() e resume()
// al ritorno visibile se le prove su un iPhone vero (docs/prove-su-dispositivi.md) mostrano che basta.
export function contesto(): AudioContext {
	if (!ctx) {
		ctx = new AudioContext({ latencyHint: 'interactive' });
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
	return c.state === 'running' ? Promise.resolve() : c.resume();
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
	if (c.state !== 'running') void c.resume();
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
