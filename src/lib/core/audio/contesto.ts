// Un solo AudioContext per tutto il sito, creato al primo uso: mai durante l'import (SSR e prerender).
// Le sorgenti passano da un compressore che taglia i picchi e da un volume moderato.
import { IDLE_SUSPEND_MS, VOLUME } from './costanti.ts';

let ctx: AudioContext | undefined;
let ingresso: AudioNode | undefined;
let riproduzioni = 0;
let microfoni = 0;
let timerSospensione: ReturnType<typeof setTimeout> | undefined;

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
	return c.state === 'running' ? Promise.resolve() : c.resume();
}

/** Tempo del clock audio in secondi (0 se l'audio non è mai partito). */
export const ora = (): number => ctx?.currentTime ?? 0;

/** Vero mentre il sito suona (più una breve coda): nei turni ascolta/canta il microfono non ascolta. */
export const riproduzioneAttiva = (): boolean => riproduzioni > 0;

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
	let rilasciata = false;
	return () => {
		if (rilasciata) return;
		rilasciata = true;
		if (tipo === 'riproduzione') riproduzioni--;
		else microfoni--;
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
