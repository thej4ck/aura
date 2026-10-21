// contesto.ts e synth.ts con un AudioContext finto: il clock avanza a mano, i timer sono finti.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDLE_SUSPEND_MS } from './costanti.ts';
import { freqDaMidi } from './frequenze.ts';

type Evento = [tipo: string, valore: number, tempo: number];

class ParamFinto {
	value = 1;
	eventi: Evento[] = [];
	setValueAtTime(v: number, t: number) {
		this.eventi.push(['set', v, t]);
	}
	linearRampToValueAtTime(v: number, t: number) {
		this.eventi.push(['rampa', v, t]);
	}
	setTargetAtTime(v: number, t: number) {
		this.eventi.push(['verso', v, t]);
	}
}

class NodoFinto {
	uscite: NodoFinto[] = [];
	gain = new ParamFinto();
	connect<N extends NodoFinto>(n: N) {
		this.uscite.push(n);
		return n;
	}
	disconnect() {
		this.uscite = [];
	}
}

class OscillatoreFinto extends NodoFinto {
	frequency = new ParamFinto();
	inizio = NaN;
	fineA = Infinity;
	onended: (() => void) | null = null;
	setPeriodicWave() {}
	start(t: number) {
		this.inizio = t;
	}
	stop(t: number) {
		this.fineA = t;
	}
}

/** i contesti creati dal codice: ce ne deve essere al massimo uno */
const creati: ContestoFinto[] = [];

class ContestoFinto {
	currentTime = 0;
	state: AudioContextState = 'running';
	outputLatency = 0;
	baseLatency = 0;
	destination = new NodoFinto();
	oscillatori: OscillatoreFinto[] = [];
	resume = vi.fn(async () => void (this.state = 'running'));
	suspend = vi.fn(async () => void (this.state = 'suspended'));
	constructor() {
		creati.push(this);
	}
	createGain = () => new NodoFinto();
	createDynamicsCompressor = () =>
		Object.assign(new NodoFinto(), {
			threshold: new ParamFinto(),
			knee: new ParamFinto(),
			ratio: new ParamFinto(),
			attack: new ParamFinto(),
			release: new ParamFinto()
		});
	createPeriodicWave = () => ({});
	createOscillator() {
		const o = new OscillatoreFinto();
		this.oscillatori.push(o);
		return o;
	}
	/** fa passare `s` secondi di audio e di timer, a passi di 5 ms */
	scorri(s: number) {
		for (let i = 0; i < Math.round(s / 0.005); i++) {
			this.currentTime += 0.005;
			vi.advanceTimersByTime(5);
			for (const o of this.oscillatori) {
				if (o.onended && o.fineA <= this.currentTime) {
					const fine = o.onended;
					o.onended = null;
					fine();
				}
			}
		}
	}
}

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
