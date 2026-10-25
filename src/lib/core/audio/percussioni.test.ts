// percussioni.ts con un AudioContext finto: si contano gli oscillatori e i loro start, colpo per colpo.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContestoFinto, creati, type NodoFinto, type OscillatoreFinto } from './contesto-finto.ts';
import { VOLUME_CLIC_PIANO } from './costanti.ts';
import { freqDaMidi } from './frequenze.ts';
import { colpi as colpiDi, eventiRitmo } from '../musica/ritmo.ts';

let audio: typeof import('./contesto.ts');
let perc: typeof import('./percussioni.ts');

beforeEach(async () => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
	vi.stubGlobal('AudioContext', ContestoFinto);
	vi.resetModules();
	creati.length = 0;
	audio = await import('./contesto.ts');
	perc = await import('./percussioni.ts');
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

const arrotonda = (x: number) => Math.round(x * 1e6) / 1e6;
/** l'inviluppo di un oscillatore: il GainNode subito dopo */
const inviluppo = (o: OscillatoreFinto) => o.uscite[0];
/** il picco dell'inviluppo (la rampa d'attacco) */
const picco = (o: OscillatoreFinto) => inviluppo(o).gain.eventi[1][1];
/** il bus della riproduzione, dopo l'inviluppo */
const busDi = (o: OscillatoreFinto): NodoFinto => inviluppo(o).uscite[0];

describe('suonaColpi', () => {
	// TA TI-TI TA-A in 4/4 a 72 BPM, con una battuta di clic d'attacco: 4 clic + 4 legnetti + 4 clic piano
	const rigo = {
		tempo: '4/4' as const,
		note: [{ durata: '4' }, { durata: '8' }, { durata: '8' }, { durata: '2' }]
	};
	const e = eventiRitmo(rigo as Parameters<typeof eventiRitmo>[0], 72, 1);
	const colpi = colpiDi(e, { metronomo: 'piano' });

	it('n colpi = n oscillatori avviati, ognuno al suo tempo sul clock audio, con la sua altezza', () => {
		const r = perc.suonaColpi(colpi);
		const c = creati[0];
		expect(c.oscillatori.length).toBeLessThan(3); // lookahead: solo i primi
		c.scorri(e.fineS + 1);
		expect(c.oscillatori).toHaveLength(colpi.length);
		expect(colpi).toHaveLength(12);
		// esattamente uno start per oscillatore, al tempo giusto (la spia degli e2e conta proprio questi)
		const attesi = [...colpi].sort((a, b) => a.inizio - b.inizio);
		expect(c.oscillatori.map((o) => arrotonda(o.inizio - r.t0))).toEqual(
			attesi.map((k) => arrotonda(k.inizio))
		);
		const midi = c.oscillatori.map((o) => Math.round(69 + 12 * Math.log2(o.frequency.value / 440)));
		expect(midi).toEqual(
			attesi.map((k) =>
				k.timbro === 'legnetto'
					? perc.MIDI_LEGNETTO
					: k.accento
						? perc.MIDI_ACCENTO
						: perc.MIDI_CLIC
			)
		);
		expect(c.oscillatori[0].frequency.value).toBeCloseTo(freqDaMidi(perc.MIDI_ACCENTO), 6);
		// e uno schiocco di rumore per colpo, insieme all'oscillatore
		expect(c.buffer.map((b) => b.inizio)).toEqual(c.oscillatori.map((o) => o.inizio));
		expect(c.buffer.every((b) => b.buffer!.length === Math.round(0.03 * 48_000))).toBe(true);
		// tutto sullo stesso bus, che va verso il compressore comune
		const bus = busDi(c.oscillatori[0]);
		expect(c.oscillatori.every((o) => busDi(o) === bus)).toBe(true);
		expect(c.buffer.every((b) => b.uscite[0].uscite[0] === bus)).toBe(true);
	});

	it('accento e volume: legnetto più forte, clic più acuto, clic piano al volume chiesto', () => {
		perc.suonaColpi([
			{ inizio: 0, timbro: 'legnetto' },
			{ inizio: 0.5, timbro: 'legnetto', accento: true },
			{ inizio: 1, timbro: 'clic' },
			{ inizio: 1.5, timbro: 'clic', accento: true },
			{ inizio: 2, timbro: 'clic', volume: VOLUME_CLIC_PIANO },
			{ inizio: 2.5, timbro: 'clic', volume: 0 } // non suona
		]);
		const c = creati[0];
		c.scorri(3.5);
		const [legno, legnoForte, clic, clicAcuto, clicPiano] = c.oscillatori;
		expect(c.oscillatori).toHaveLength(5);
		expect(picco(legnoForte)).toBeGreaterThan(picco(legno) * 1.2);
		expect(clicAcuto.frequency.value).toBeGreaterThan(clic.frequency.value * 1.4);
		expect(picco(clicAcuto)).toBeCloseTo(picco(clic), 6);
		expect(picco(clicPiano)).toBeCloseTo(picco(clic) * VOLUME_CLIC_PIANO, 6);
		// lo schiocco segue il volume del suo colpo
		const livelli = c.buffer.map((b) => b.uscite[0].gain.value);
		expect(livelli[4]).toBeCloseTo(livelli[2] * VOLUME_CLIC_PIANO, 6);
		// volume moderato: anche il colpo più forte resta sotto 1 prima del compressore
		expect(Math.max(...c.oscillatori.map(picco)) + Math.max(...livelli)).toBeLessThan(1);
	});

	it('inviluppi da 0 a 0 con rampe: clic ≤ 30 ms, legnetto secco, nota lunga che risuona fino alla fine', () => {
		perc.suonaColpi([
			{ inizio: 0, timbro: 'clic' },
			{ inizio: 0.5, timbro: 'legnetto', durata: 0.42 }, // una croma: secca
			{ inizio: 1, timbro: 'legnetto', durata: 1.67 } // TA-A a 72 BPM
		]);
		const c = creati[0];
		c.scorri(4);
		const [clic, secco, lungo] = c.oscillatori;
		for (const o of c.oscillatori) {
			const [primo, rampa] = inviluppo(o).gain.eventi;
			expect(primo).toEqual(['set', 0, o.inizio]);
			expect(rampa[0]).toBe('rampa');
			expect(rampa[2] - o.inizio).toBeGreaterThan(0); // l'attacco non è un gradino
			expect(inviluppo(o).gain.eventi.at(-1)![1]).toBe(0); // e si torna a 0
		}
		expect(inviluppo(clic).gain.eventi.at(-1)).toEqual(['rampa', 0, clic.inizio + 0.03]);
		expect(clic.fineA - clic.inizio).toBeLessThanOrEqual(0.03 + 1e-9);
		// legnetto secco: cala verso 0 subito dopo l'attacco, si ferma quando è già sotto −60 dB
		expect(inviluppo(secco).gain.eventi.map(([t]) => t)).toEqual(['set', 'rampa', 'verso']);
		expect(secco.fineA - secco.inizio).toBeCloseTo(0.2, 6);
		// nota lunga: cala a una risonanza piano, che tiene fino alla fine della nota
		const [, , risonanza, rilascio] = inviluppo(lungo).gain.eventi;
		expect(risonanza[1]).toBeGreaterThan(0);
		expect(risonanza[1]).toBeLessThan(picco(lungo) / 5);
		expect(rilascio[0]).toBe('verso');
		expect(rilascio[2] - lungo.inizio).toBeCloseTo(1.67 - 0.05, 6);
		expect(lungo.fineA - lungo.inizio).toBeGreaterThan(1.67);
		expect(lungo.fineA - lungo.inizio).toBeLessThan(1.67 + 0.1);
	});

	it('riproduzione attiva fino all’ultimo colpo più la sua coda, l’eco e la latenza; poi fine', async () => {
		const c = audio.contesto() as unknown as ContestoFinto;
		c.outputLatency = 0.1;
		const r = perc.suonaColpi([
			{ inizio: 0, timbro: 'clic' },
			{ inizio: 0.5, timbro: 'clic' }
		]);
		let finita = false;
		void r.fine.then(() => (finita = true));
		// ultimo clic a 0.5 + 0.03, eco 0.15, latenza 0.1: attiva fino a t0 + 0.78
		const fine = r.t0 + 0.5 + 0.03 + 0.15 + 0.1;
		c.scorri(fine - c.currentTime - 0.02);
		await Promise.resolve();
		expect(audio.riproduzioneAttiva()).toBe(true);
		expect(finita).toBe(false);
		c.scorri(0.05);
		await r.fine;
		expect(audio.riproduzioneAttiva()).toBe(false);
	});

	it('la coda è quella del colpo che finisce per ultimo, non di quello che parte per ultimo', async () => {
		const c = audio.contesto() as unknown as ContestoFinto;
		const r = perc.suonaColpi([
			{ inizio: 0, timbro: 'legnetto', durata: 2 },
			{ inizio: 1, timbro: 'clic' }
		]);
		c.scorri(2);
		await Promise.resolve();
		expect(audio.riproduzioneAttiva()).toBe(true); // la nota lunga risuona ancora
		c.scorri(0.4);
		await r.fine;
		expect(audio.riproduzioneAttiva()).toBe(false);
	});

	it('ferma(): sfuma il bus in 40 ms, ferma le sorgenti e non programma più niente', async () => {
		const r = perc.suonaColpi(colpi);
		const c = creati[0];
		const bus = busDi(c.oscillatori[0]);
		c.scorri(0.85); // il primo clic è finito, il secondo è programmato ma non ancora partito
		const programmati = c.oscillatori.length;
		expect(programmati).toBe(2);
		r.ferma();
		await r.fine;
		expect(audio.riproduzioneAttiva()).toBe(false);
		expect(bus.gain.eventi.slice(-2)).toEqual([
			['set', 1, c.currentTime],
			['rampa', 0, c.currentTime + 0.04]
		]);
		// ognuna smette dopo che il bus è già a 0: niente scatti
		// (il primo clic era già finito: resta com'era)
		expect(c.oscillatori[0].fineA).toBeCloseTo(c.oscillatori[0].inizio + 0.03, 10);
		for (const s of [c.oscillatori[1], c.buffer[1]]) {
			expect(s.fineA).toBeCloseTo(c.currentTime + 0.05, 10);
		}
		c.scorri(5);
		expect(c.oscillatori).toHaveLength(programmati);
	});
});
