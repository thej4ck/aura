// Riconoscimento dell'altezza con YIN (de Cheveigné e Kawahara, 2002). Puro: niente Web Audio, si
// prova con segnali sintetici. Il microfono (mic.ts) gli passa un frame alla volta.
import { FREQ_MAX, FREQ_MIN, GATE_RMS, MEDIANA, SOGLIA_YIN } from './costanti.ts';

export type Altezza = {
	freq: number;
	/** 0-1: quanto il frame è periodico (1 − CMNDF nel minimo scelto) */
	chiarezza: number;
	rms: number;
};

export type OpzioniAltezza = {
	soglia?: number;
	gateRms?: number;
	freqMin?: number;
	freqMax?: number;
};

export function calcolaRms(buffer: Float32Array): number {
	let somma = 0;
	for (let i = 0; i < buffer.length; i++) somma += buffer[i] * buffer[i];
	return Math.sqrt(somma / buffer.length);
}

/** Altezza del frame, o null se è silenzio, se non è abbastanza periodico o se è fuori intervallo. */
export function rilevaAltezza(
	buffer: Float32Array,
	sampleRate: number,
	opzioni: OpzioniAltezza = {}
): Altezza | null {
	const {
		soglia = SOGLIA_YIN,
		gateRms = GATE_RMS,
		freqMin = FREQ_MIN,
		freqMax = FREQ_MAX
	} = opzioni;
	const rms = calcolaRms(buffer);
	if (rms < gateRms) return null;

	// metà frame per i lag e metà per la finestra: con 2048 campioni a 48 kHz si arriva a 47 Hz, sotto
	// FREQ_MIN, così una nota appena più grave si riconosce (e si scarta) invece di diventare un'ottava sopra.
	// ponytail: a 96 kHz il lag massimo copre solo da 94 Hz in su; se mai servirà, FFT in base al sampleRate
	const tauMax = Math.floor(buffer.length / 2);
	const finestra = buffer.length - tauMax;

	// 1. difference function, 2. CMNDF (normalizzata sulla media cumulativa), nello stesso array
	const d = new Float32Array(tauMax + 1);
	let cumulata = 0;
	d[0] = 1;
	for (let tau = 1; tau <= tauMax; tau++) {
		let s = 0;
		for (let j = 0; j < finestra; j++) {
			const x = buffer[j] - buffer[j + tau];
			s += x * x;
		}
		cumulata += s;
		d[tau] = cumulata > 0 ? (s * tau) / cumulata : 1;
	}

	// 3. soglia assoluta: il primo lag sotto soglia, poi giù fino al minimo locale.
	// Si parte dai lag piccoli: una nota troppo acuta dà la sua frequenza (e si scarta), non un'ottava sotto.
	let tau = -1;
	for (let t = 2; t < tauMax; t++) {
		if (d[t] < soglia) {
			while (t + 1 < tauMax && d[t + 1] < d[t]) t++;
			tau = t;
			break;
		}
	}
	if (tau < 0) return null;

	// 4. interpolazione parabolica attorno al minimo: precisione sotto il campione
	const [a, b, c] = [d[tau - 1], d[tau], d[tau + 1]];
	const curvatura = a - 2 * b + c;
	const periodo = tau + (curvatura > 0 ? (a - c) / (2 * curvatura) : 0);
	const freq = sampleRate / periodo;
	if (freq < freqMin || freq > freqMax) return null;
	return { freq, chiarezza: Math.min(1, Math.max(0, 1 - b)), rms };
}

/**
 * Mediana mobile delle frequenze sugli ultimi `n` frame: toglie i salti isolati (un'ottava sbagliata,
 * una consonante). Un frame senza altezza dà null subito, e nella finestra non conta.
 */
export class Mediana {
	readonly n: number;
	#valori: (number | null)[] = [];

	constructor(n = MEDIANA) {
		this.n = n;
	}

	aggiungi(freq: number | null): number | null {
		this.#valori.push(freq);
		if (this.#valori.length > this.n) this.#valori.shift();
		if (freq === null) return null;
		const ordinati = this.#valori.filter((v) => v !== null).sort((x, y) => x - y);
		// con un numero pari di valori si prende quello sotto: sempre una frequenza davvero sentita
		// (la media tra 440 e 880 sarebbe una quinta che nessuno ha cantato)
		return ordinati[(ordinati.length - 1) >> 1];
	}

	azzera(): void {
		this.#valori = [];
	}
}
