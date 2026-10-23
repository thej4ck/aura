import { describe, expect, it } from 'vitest';
import { creaCasuale } from '../casuale.ts';
import {
	FFT,
	GATE_RMS,
	MARGINE_GATE,
	PASSA_BASSO_HZ,
	RISALITA_RUMORE_DB_S,
	SOGLIA_YIN,
	SOGLIA_YIN_RIPIEGO,
	TOLLERANZE_CENTS
} from './costanti.ts';
import { centsTra, midiDaFreq } from './frequenze.ts';
import { Mediana, RumoreDiFondo, calcolaRms, rilevaAltezza } from './pitch.ts';

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

/**
 * Il frame che YIN riceve dal microfono: lo stesso biquad passa-basso del BiquadFilterNode di mic.ts
 * (Q = 1/√2), senza l'avvio del filtro, poi un campione su due. `x` è lungo almeno 2 FFT.
 */
function comeIlMicrofono(x: Float32Array) {
	const w = (2 * Math.PI * PASSA_BASSO_HZ) / SR;
	const al = Math.sin(w) / Math.SQRT2;
	const [b0, b1, a1, a2] = [(1 - Math.cos(w)) / 2, 1 - Math.cos(w), -2 * Math.cos(w), 1 - al];
	const y = new Float32Array(x.length);
	for (let i = 0; i < x.length; i++) {
		const [x1, x2, y1, y2] = [x[i - 1] ?? 0, x[i - 2] ?? 0, y[i - 1] ?? 0, y[i - 2] ?? 0];
		y[i] = (b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2) / (1 + al);
	}
	const fine = y.subarray(x.length - FFT);
	return Float32Array.from({ length: FFT / 2 }, (_, i) => fine[2 * i]);
}

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
		const r = creaCasuale(11);
		const ampiezza = 0.4;
		const k = ((ampiezza / Math.SQRT2) * Math.sqrt(3)) / 10 ** (5 / 20); // RMS del rumore: −5 dB
		for (const f of [220, 440, 880]) {
			const sporco = segnale(f, sinusoide(ampiezza), 2 * FFT).map((x) => x + (2 * r() - 1) * k);
			// senza filtro il rumore copre la periodicità: al massimo un ripiego incerto (spesso un'ottava sotto)
			const senza = rilevaAltezza(sporco.subarray(FFT), SR);
			expect(senza?.chiarezza ?? 0, `${f} Hz senza filtro`).toBeLessThan(1 - SOGLIA_YIN);
			// un frame solo, con tanto rumore: sotto la tolleranza più stretta (la mediana fa il resto)
			expect(errore(comeIlMicrofono(sporco), f, SR / 2), `${f} Hz`).toBeLessThan(
				TOLLERANZE_CENTS.preciso
			);
		}
	});

	it('ripiego: un frame poco periodico (CMNDF tra 0,15 e 0,35) dà la nota, con la chiarezza bassa', () => {
		// dente di sega a 220 Hz con il rumore a −6 dB, a 24 kHz come il frame dimezzato del microfono
		for (const seme of [1, 2, 3]) {
			const r = creaCasuale(seme);
			const k = 0.5 * 10 ** (-6 / 20); // RMS: dente 0,5/√3, rumore uniforme k/√3
			const frame = segnale(220, dente, FFT / 2, SR / 2).map((x) => x + (2 * r() - 1) * k);
			expect(rilevaAltezza(frame, SR / 2, { ripiego: SOGLIA_YIN }), 'senza ripiego').toBeNull();
			const a = rilevaAltezza(frame, SR / 2)!;
			expect(Math.abs(centsTra(a.freq, midiDaFreq(220)))).toBeLessThan(TOLLERANZE_CENTS.preciso);
			expect(a.chiarezza).toBeGreaterThan(1 - SOGLIA_YIN_RIPIEGO);
			expect(a.chiarezza).toBeLessThan(1 - SOGLIA_YIN);
		}
	});

	it('rumore passato dal passa-basso come nel microfono: mai una nota, neanche con il ripiego', () => {
		for (let seme = 1; seme <= 50; seme++) {
			const r = creaCasuale(seme);
			const rumore = Float32Array.from({ length: 2 * FFT }, () => r() - 0.5);
			expect(rilevaAltezza(comeIlMicrofono(rumore), SR / 2), `seme ${seme}`).toBeNull();
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

	it('regge i buchi brevi: dà una nota finché più di metà della finestra ne ha una', () => {
		const m = new Mediana(5);
		const uscite = [440, 441, 439, null, null, 440, null, null, null, 442].map((f) =>
			m.aggiungi(f)
		);
		// due frame vuoti in mezzo alla voce passano; tre no, e un frame isolato nel silenzio non è una nota
		expect(uscite).toEqual([440, 440, 440, 440, 440, 440, null, null, null, null]);
	});

	it('i frame vuoti nella finestra non entrano nella mediana; azzera() riparte da capo', () => {
		const m = new Mediana(3);
		m.aggiungi(440);
		expect(m.aggiungi(null)).toBeNull(); // uno su due: non basta
		expect(m.aggiungi(450)).toBe(440);
		m.azzera();
		expect(m.aggiungi(300)).toBe(300);
	});
});

describe('RumoreDiFondo (gate adattivo)', () => {
	const DT = 1 / 30;

	it('parte dal minimo assoluto, sale piano con il rumore e scende subito', () => {
		const r = new RumoreDiFondo();
		expect(r.gate).toBe(GATE_RMS);
		// una ventola a −40 dBFS: in un secondo la stima sale di RISALITA_RUMORE_DB_S, non di colpo
		for (let i = 0; i < 30; i++) r.aggiorna(0.01, DT);
		expect(20 * Math.log10(r.rms / (GATE_RMS / MARGINE_GATE))).toBeCloseTo(RISALITA_RUMORE_DB_S, 1);
		for (let i = 0; i < 300; i++) r.aggiorna(0.01, DT);
		expect(r.rms).toBeCloseTo(0.01, 6);
		expect(r.gate).toBeCloseTo(0.01 * MARGINE_GATE, 6);
		// la ventola si spegne
		r.aggiorna(0.0002, DT);
		expect(r.gate).toBe(GATE_RMS);
	});

	it('una tosse non alza la soglia, e dallo zero digitale la stima risale', () => {
		const r = new RumoreDiFondo();
		for (let i = 0; i < 9; i++) r.aggiorna(0.2, DT); // 300 ms
		expect(r.gate).toBeLessThan(1.5 * GATE_RMS);
		r.aggiorna(0, DT);
		for (let i = 0; i < 600; i++) r.aggiorna(0.01, DT);
		expect(r.rms).toBeCloseTo(0.01, 6);
	});
});
