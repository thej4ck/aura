// Un AudioContext finto per i test di contesto.ts, synth.ts e percussioni.ts: il clock avanza a mano
// (scorri), i parametri registrano le automazioni, i nodi le connessioni. Solo per Vitest.
import { vi } from 'vitest';

export type Automazione = [tipo: string, valore: number, tempo: number];

export class ParamFinto {
	value = 1;
	eventi: Automazione[] = [];
	setValueAtTime(v: number, t: number) {
		this.eventi.push(['set', v, t]);
	}
	linearRampToValueAtTime(v: number, t: number) {
		this.eventi.push(['rampa', v, t]);
	}
	exponentialRampToValueAtTime(v: number, t: number) {
		this.eventi.push(['esponenziale', v, t]);
	}
	setTargetAtTime(v: number, t: number) {
		this.eventi.push(['verso', v, t]);
	}
}

export class NodoFinto {
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

export class SorgenteFinta extends NodoFinto {
	inizio = NaN;
	fineA = Infinity;
	onended: (() => void) | null = null;
	start(t: number) {
		this.inizio = t;
	}
	stop(t: number) {
		this.fineA = t;
	}
}

export class OscillatoreFinto extends SorgenteFinta {
	frequency = new ParamFinto();
	setPeriodicWave() {}
}

export class BufferFinto extends SorgenteFinta {
	buffer: { length: number } | null = null;
}

/** i contesti creati dal codice: ce ne deve essere al massimo uno */
export const creati: ContestoFinto[] = [];

export class ContestoFinto {
	currentTime = 0;
	sampleRate = 48_000;
	state: AudioContextState = 'running';
	outputLatency = 0;
	baseLatency = 0;
	destination = new NodoFinto();
	oscillatori: OscillatoreFinto[] = [];
	buffer: BufferFinto[] = [];
	resume = vi.fn(async () => void (this.state = 'running'));
	suspend = vi.fn(async () => void (this.state = 'suspended'));
	/** quello che dà getOutputTimestamp(); undefined = il metodo non c'è (Safari vecchi) */
	timestamp: AudioTimestamp | undefined;
	constructor() {
		creati.push(this);
	}
	get getOutputTimestamp() {
		return this.timestamp && (() => this.timestamp!);
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
	createBuffer = (_canali: number, length: number) => {
		const dati = new Float32Array(length);
		return { length, getChannelData: () => dati };
	};
	createOscillator() {
		const o = new OscillatoreFinto();
		this.oscillatori.push(o);
		return o;
	}
	createBufferSource() {
		const b = new BufferFinto();
		this.buffer.push(b);
		return b;
	}
	/** fa passare `s` secondi di audio e di timer, a passi di 5 ms */
	scorri(s: number) {
		for (let i = 0; i < Math.round(s / 0.005); i++) {
			this.currentTime += 0.005;
			vi.advanceTimersByTime(5);
			for (const o of [...this.oscillatori, ...this.buffer]) {
				if (o.onended && o.fineA <= this.currentTime) {
					const fine = o.onended;
					o.onended = null;
					fine();
				}
			}
		}
	}
}
