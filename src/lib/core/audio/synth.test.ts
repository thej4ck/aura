// contesto.ts e synth.ts con un AudioContext finto: il clock avanza a mano, i timer sono finti.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContestoFinto, creati } from './contesto-finto.ts';
import { IDLE_SUSPEND_MS } from './costanti.ts';
import { freqDaMidi } from './frequenze.ts';

let audio: typeof import('./contesto.ts');
let synth: typeof import('./synth.ts');

beforeEach(async () => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
	vi.stubGlobal('AudioContext', ContestoFinto);
	vi.resetModules(); // un AudioContext nuovo per ogni test
	creati.length = 0;
	audio = await import('./contesto.ts');
	synth = await import('./synth.ts');
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('contesto', () => {
	it("l'import non crea l'AudioContext (SSR)", () => {
		expect(creati).toHaveLength(0);
		expect(audio.ora()).toBe(0);
		expect(audio.riproduzioneAttiva()).toBe(false);
		audio.contesto();
		expect(audio.contesto()).toBe(creati[0]);
		expect(creati).toHaveLength(1); // singleton
	});

	it('si sospende dopo IDLE_SUSPEND_MS senza sorgenti, non col microfono aperto', () => {
		const rilasciaMic = audio.usa('microfono');
		const c = creati[0];
		rilasciaMic();
		vi.advanceTimersByTime(IDLE_SUSPEND_MS - 1);
		const rilascia = audio.usa('microfono'); // riapre prima della scadenza: niente sospensione
		vi.advanceTimersByTime(IDLE_SUSPEND_MS * 2);
		expect(c.suspend).not.toHaveBeenCalled();
		rilascia();
		rilascia(); // rilasciare due volte non conta due volte
		vi.advanceTimersByTime(IDLE_SUSPEND_MS);
		expect(c.suspend).toHaveBeenCalledOnce();
	});

	it('una sorgente nuova risveglia il contesto sospeso', async () => {
		audio.contesto();
		const c = creati[0];
		c.state = 'suspended';
		audio.usa('riproduzione');
		expect(c.resume).toHaveBeenCalledOnce();
		await audio.sblocca();
		expect(c.state).toBe('running');
	});
});

describe('tempoSentito', () => {
	beforeEach(() => void vi.spyOn(performance, 'now').mockReturnValue(5000));

	it("0 se l'audio non è mai partito", () => {
		expect(audio.tempoSentito()).toBe(0);
		expect(audio.tempoSentito(4980, 100)).toBe(0);
		expect(creati).toHaveLength(0); // e non lo fa partire
	});

	it('con getOutputTimestamp: il campione che usciva in quel momento, meno la manopola', () => {
		const c = audio.contesto() as unknown as ContestoFinto;
		c.currentTime = 12;
		c.outputLatency = 0.04; // ignorata: il timestamp la comprende già
		// all'istante 4990 ms usciva dall'altoparlante il campione del clock audio 11.9
		c.timestamp = { contextTime: 11.9, performanceTime: 4990 };
		expect(audio.tempoSentito()).toBeCloseTo(11.91, 10); // adesso: 10 ms dopo
		expect(audio.tempoSentito(4980)).toBeCloseTo(11.89, 10); // un tocco di 20 ms fa
		expect(audio.tempoSentito(4980, 30)).toBeCloseTo(11.86, 10);
	});

	it('timestamp a zero o assente: currentTime meno la latenza d’uscita e l’età dell’evento', () => {
		const c = audio.contesto() as unknown as ContestoFinto;
		c.currentTime = 12;
		c.timestamp = { contextTime: 0, performanceTime: 0 }; // l'uscita non è ancora partita
		c.outputLatency = 0.04;
		c.baseLatency = 0.01;
		expect(audio.tempoSentito()).toBeCloseTo(11.96, 10);
		// un evento vecchio di 20 ms è 20 ms più indietro
		expect(audio.tempoSentito(4980)).toBeCloseTo(11.94, 10);
		expect(audio.tempoSentito(4980, 100)).toBeCloseTo(11.84, 10);
		c.timestamp = undefined; // Safari senza getOutputTimestamp né outputLatency
		c.outputLatency = 0;
		expect(audio.tempoSentito(4980)).toBeCloseTo(11.97, 10);
		c.baseLatency = 0;
		expect(audio.tempoSentito(4980)).toBeCloseTo(11.98, 10);
	});
});

const SCALA_BREVE = [{ midi: 69, inizio: 0, durata: 0.5 }];

describe('synth', () => {
	const SCALA = [60, 62, 64].map((midi, i) => ({ midi, inizio: i * 0.5, durata: 0.4 }));

	it('programma le note sul clock audio, poco prima che suonino', () => {
		const r = synth.suona(SCALA);
		const c = creati[0];
		expect(c.oscillatori).toHaveLength(1); // lookahead: solo la prima nota
		c.scorri(0.5);
		expect(c.oscillatori).toHaveLength(2);
		c.scorri(0.5);
		const t0 = c.oscillatori[0].inizio;
		expect(t0).toBeCloseTo(0.05, 10); // un piccolo margine prima della prima nota
		expect(r.t0).toBe(t0); // per seguire le note che suonano
		expect(c.oscillatori.map((o) => Math.round((o.inizio - t0) * 1000) / 1000)).toEqual([
			0, 0.5, 1
		]);
		expect(c.oscillatori.map((o) => o.frequency.value)).toEqual(
			SCALA.map((e) => freqDaMidi(e.midi))
		);
		expect(r).toHaveProperty('ferma');
	});

	it('inviluppo da 0 a 0 con rampe: niente click', () => {
		synth.suonaNota(69, 1);
		const c = creati[0];
		const o = c.oscillatori[0];
		const inviluppo = o.uscite[0];
		const [primo, ...altri] = inviluppo.gain.eventi;
		expect(primo).toEqual(['set', 0, o.inizio]);
		expect(altri.map(([tipo]) => tipo)).toEqual(['rampa', 'verso', 'verso']);
		expect(altri.at(-1)).toEqual(['verso', 0, o.inizio + 1]);
		expect(o.fineA).toBeGreaterThan(o.inizio + 1); // si ferma dopo il rilascio
	});

	it('riproduzione attiva fino alla fine del suono (con la coda), poi fine si risolve', async () => {
		const r = synth.suona(SCALA);
		const c = creati[0];
		let finita = false;
		void r.fine.then(() => (finita = true));
		expect(audio.riproduzioneAttiva()).toBe(true);
		c.scorri(1.4); // ultima nota: 1 + 0.4, poi rilascio e coda
		await Promise.resolve();
		expect(finita).toBe(false);
		expect(audio.riproduzioneAttiva()).toBe(true);
		c.scorri(0.6);
		await r.fine;
		expect(audio.riproduzioneAttiva()).toBe(false);
	});

	it('ferma(): sfuma il bus, ferma le voci e non programma più niente', async () => {
		const r = synth.suona(SCALA);
		const c = creati[0];
		c.scorri(0.2);
		const bus = c.oscillatori[0].uscite[0].uscite[0];
		r.ferma();
		await r.fine;
		expect(audio.riproduzioneAttiva()).toBe(false);
		expect(bus.gain.eventi.at(-1)).toEqual(['rampa', 0, c.currentTime + 0.04]);
		expect(c.oscillatori[0].fineA).toBeCloseTo(c.currentTime + 0.05, 10);
		c.scorri(2);
		expect(c.oscillatori).toHaveLength(1);
	});
});

describe('senza Web Audio (Modalità di isolamento)', () => {
	it('niente eccezioni: si suona in silenzio sul clock di performance.now(), e la riproduzione finisce', async () => {
		vi.stubGlobal('AudioContext', undefined);
		const { suonaColpi } = await import('./percussioni.ts');
		let adesso = 1000;
		vi.spyOn(performance, 'now').mockImplementation(() => adesso);

		await expect(audio.sblocca()).resolves.toBeUndefined();
		const note = synth.suona(SCALA_BREVE);
		const colpi = suonaColpi([
			{ inizio: 0, timbro: 'legnetto', accento: true },
			{ inizio: 0.5, timbro: 'clic' }
		]);
		expect(note.t0).toBeCloseTo(1.05, 10); // il clock è performance.now() in secondi
		expect(audio.riproduzioneAttiva()).toBe(true);
		audio.usa('microfono')();
		for (let i = 0; i < 100; i++) {
			adesso += 25;
			vi.advanceTimersByTime(25);
		}
		await Promise.all([note.fine, colpi.fine]);
		expect(audio.riproduzioneAttiva()).toBe(false);
		expect(audio.ora()).toBeCloseTo(3.5, 10);
		expect(audio.tempoSentito()).toBeCloseTo(3.5, 10); // le animazioni guidate dall'audio vanno avanti
		note.ferma();
		expect(creati).toHaveLength(0);
	});
});
