import { describe, expect, it } from 'vitest';
import { creaCasuale } from '../casuale.ts';
import { FFT, GATE_RMS, PASSA_BASSO_HZ, TOLLERANZE_CENTS } from './costanti.ts';
import { centsTra, midiDaFreq } from './frequenze.ts';
import { Mediana, calcolaRms, rilevaAltezza } from './pitch.ts';

const SR = 48_000;

/** `n` campioni di un'onda periodica: `onda(fase)` con la fase in cicli (0-1). */
function segnale(freq: number, onda: (fase: number) => number, n = FFT, sr = SR) {
	return Float32Array.from({ length: n }, (_, i) => onda((freq * i) / sr));
}
const sinusoide =
	(ampiezza = 0.5) =>
	(f: number) =>
		ampiezza * Math.sin(2 * Math.PI * f);
const dente = (f: number) => 0.5 * (2 * (f - Math.floor(f + 0.5)));
const triangolare = (f: number) => 0.5 * (4 * Math.abs(f - Math.floor(f + 0.5)) - 1);

/** errore in cent rispetto alla frequenza vera (Infinity se non riconosce niente) */
function errore(buffer: Float32Array, freq: number, sr = SR) {
	const r = rilevaAltezza(buffer, sr);
	return r ? Math.abs(centsTra(r.freq, midiDaFreq(freq))) : Infinity;
}

describe('rilevaAltezza (YIN)', () => {
	it('sinusoidi a 220, 440 e 880 Hz: errore sotto i 5 cent, a 48 e 44,1 kHz', () => {
		for (const sr of [48_000, 44_100]) {
			for (const f of [220, 440, 880, 261.63, 98, 1046.5]) {
				expect(errore(segnale(f, sinusoide(), FFT, sr), f, sr), `${f} Hz a ${sr}`).toBeLessThan(5);
			}
		}
		const r = rilevaAltezza(segnale(440, sinusoide()), SR)!;
		expect(r.chiarezza).toBeGreaterThan(0.95);
		expect(r.rms).toBeCloseTo(0.5 / Math.SQRT2, 2);
	});

	it("triangolare e dente di sega: la fondamentale giusta, niente errori d'ottava", () => {
		for (const f of [110, 196, 330, 523.25, 880]) {
			expect(errore(segnale(f, triangolare), f), `triangolare ${f}`).toBeLessThan(5);
			expect(errore(segnale(f, dente), f), `dente di sega ${f}`).toBeLessThan(5);
		}
	});

	it('sinusoide con rumore bianco (SNR 20 dB)', () => {
		const r = creaCasuale(7);
		const ampiezza = 0.4;
		// rumore uniforme in [-k, k]: RMS k/√3, un decimo dell'RMS della sinusoide (ampiezza/√2)
		const k = ((ampiezza / Math.SQRT2) * Math.sqrt(3)) / 10;
		for (const f of [220, 440, 880]) {
			const pulito = segnale(f, sinusoide(ampiezza));
			const sporco = pulito.map((x) => x + (2 * r() - 1) * k);
			expect(errore(sporco, f), `${f} Hz`).toBeLessThan(5);
		}
	});

	it('rumore forte (SNR 5 dB): con il passa-basso e metà dei campioni, come nel microfono', () => {
		// lo stesso biquad passa-basso del BiquadFilterNode di mic.ts (Q = 1/√2), poi un campione su due
		const w = (2 * Math.PI * PASSA_BASSO_HZ) / SR;
		const al = Math.sin(w) / Math.SQRT2;
		const [b0, b1, a1, a2] = [(1 - Math.cos(w)) / 2, 1 - Math.cos(w), -2 * Math.cos(w), 1 - al];
		const filtra = (x: Float32Array) => {
			const y = new Float32Array(x.length);
			for (let i = 0; i < x.length; i++) {
				const [x1, x2, y1, y2] = [x[i - 1] ?? 0, x[i - 2] ?? 0, y[i - 1] ?? 0, y[i - 2] ?? 0];
				y[i] = (b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2) / (1 + al);
			}
			return y.subarray(x.length - FFT); // senza l'avvio del filtro
		};
		const r = creaCasuale(11);
		const ampiezza = 0.4;
		const k = ((ampiezza / Math.SQRT2) * Math.sqrt(3)) / 10 ** (5 / 20); // RMS del rumore: −5 dB
		for (const f of [220, 440, 880]) {
			const sporco = segnale(f, sinusoide(ampiezza), 2 * FFT).map((x) => x + (2 * r() - 1) * k);
			// senza filtro il rumore copre la periodicità: per YIN il bambino sarebbe muto
			expect(rilevaAltezza(sporco.subarray(FFT), SR), `${f} Hz senza filtro`).toBeNull();
			const filtrato = filtra(sporco);
			const dimezzato = Float32Array.from({ length: FFT / 2 }, (_, i) => filtrato[2 * i]);
			// un frame solo, con tanto rumore: sotto la tolleranza più stretta (la mediana fa il resto)
			expect(errore(dimezzato, f, SR / 2), `${f} Hz`).toBeLessThan(TOLLERANZE_CENTS.preciso);
		}
	});

	it('vibrato di ±30 cent a 5 Hz: la media resta sulla nota', () => {
		// un secondo di canto con vibrato (fase continua), analizzato a 30 frame/s come fa il microfono
		const secondi = 1;
		const audio = new Float32Array(SR * secondi + FFT);
		let fase = 0;
		for (let i = 0; i < audio.length; i++) {
			const cents = 30 * Math.sin((2 * Math.PI * 5 * i) / SR);
			fase += (440 * 2 ** (cents / 1200)) / SR;
			audio[i] = 0.5 * Math.sin(2 * Math.PI * fase);
		}
		const misure: number[] = [];
		for (let inizio = 0; inizio + FFT <= audio.length; inizio += SR / 30) {
			const r = rilevaAltezza(audio.subarray(inizio, inizio + FFT), SR);
			if (r) misure.push(centsTra(r.freq, 69));
		}
		expect(misure.length).toBeGreaterThanOrEqual(30);
		expect(Math.max(...misure.map(Math.abs))).toBeLessThan(35);
		const media = misure.reduce((a, b) => a + b) / misure.length;
		expect(Math.abs(media)).toBeLessThan(5);
	});

	it('silenzio e suoni sotto il gate: null', () => {
		expect(rilevaAltezza(new Float32Array(FFT), SR)).toBeNull();
		const debole = segnale(440, sinusoide(GATE_RMS)); // RMS = GATE_RMS/√2
		expect(calcolaRms(debole)).toBeLessThan(GATE_RMS);
		expect(rilevaAltezza(debole, SR)).toBeNull();
		expect(rilevaAltezza(debole, SR, { gateRms: GATE_RMS / 2 })).not.toBeNull();
	});

	it("fuori intervallo (80-1100 Hz): null, mai un'ottava dentro l'intervallo", () => {
		for (const f of [60, 70, 1300, 1500, 2000]) {
			expect(rilevaAltezza(segnale(f, sinusoide()), SR), `${f} Hz`).toBeNull();
			expect(rilevaAltezza(segnale(f, dente), SR), `dente di sega ${f} Hz`).toBeNull();
		}
	});

	it('rumore senza altezza: null', () => {
		const r = creaCasuale(3);
		expect(
			rilevaAltezza(
				Float32Array.from({ length: FFT }, () => r() - 0.5),
				SR
			)
		).toBeNull();
	});
});

describe('Mediana', () => {
	it('toglie i salti isolati e dà sempre un valore sentito', () => {
		const m = new Mediana(5);
		const uscite = [440, 441, 880, 439, 440].map((f) => m.aggiungi(f));
		expect(uscite).toEqual([440, 440, 441, 440, 440]);
		const pari = new Mediana(4);
		pari.aggiungi(440);
		expect(pari.aggiungi(880)).toBe(440);
	});

	it('un frame senza altezza dà null e nella finestra non conta', () => {
		const m = new Mediana(3);
		m.aggiungi(440);
		expect(m.aggiungi(null)).toBeNull();
		expect(m.aggiungi(450)).toBe(440);
		m.azzera();
		expect(m.aggiungi(300)).toBe(300);
	});
});
