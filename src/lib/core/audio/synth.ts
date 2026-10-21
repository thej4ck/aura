// Il "pianoforte" del sito: un timbro morbido (fondamentale piena e poche armoniche che calano, come un
// flauto dolce) con un inviluppo senza scatti. Le note sono programmate sul clock audio.
import { contesto, pianifica, uscita } from './contesto.ts';
import { freqDaMidi } from './frequenze.ts';

export type EventoNota = {
	midi: number;
	/** secondi dall'inizio della riproduzione */
	inizio: number;
	/** secondi, rilascio escluso */
	durata: number;
	/** 0-1, predefinita 0.8 */
	velocita?: number;
};

export type Riproduzione = { fine: Promise<void>; ferma(): void };

const ATTACCO_S = 0.03;
const DECADIMENTO_S = 0.25;
const SOSTEGNO = 0.7;
const RILASCIO_S = 0.3;
/** ampiezza di una nota prima del compressore: un accordo di 3 note resta pulito */
const PICCO = 0.3;
/** coda dopo il rilascio prima di "finito": eco della stanza, così il microfono non sente il sito */
const CODA_S = 0.15;
/** armoniche 1, 2, 3…: lo spettro già morbido fa da passa-basso, senza un filtro per nota */
const ARMONICHE = [1, 0.4, 0.18, 0.08, 0.035, 0.015];

const onde = new WeakMap<BaseAudioContext, PeriodicWave>();
function onda(c: BaseAudioContext): PeriodicWave {
	let o = onde.get(c);
	if (!o) {
		const imag = Float32Array.from([0, ...ARMONICHE]);
		o = c.createPeriodicWave(new Float32Array(imag.length), imag);
		onde.set(c, o);
	}
	return o;
}

/** Suona gli eventi; `fine` si risolve quando il suono (con la sua coda) è finito o dopo ferma(). */
export function suona(eventi: readonly EventoNota[]): Riproduzione {
	const c = contesto();
	// un bus per riproduzione: ferma() lo sfuma senza toccare gli inviluppi (niente click)
	const bus = c.createGain();
	bus.connect(uscita());
	const voci = new Set<OscillatorNode>();
	const ultima = Math.max(0, ...eventi.map((e) => e.inizio + e.durata));
	const latenza = c.outputLatency || c.baseLatency || 0;

	const p = pianifica(
		eventi,
		(e, t) => {
			const o = c.createOscillator();
			o.setPeriodicWave(onda(c));
			o.frequency.value = freqDaMidi(e.midi);
			const inviluppo = c.createGain();
			const g = inviluppo.gain;
			const picco = PICCO * Math.min(1, Math.max(0, e.velocita ?? 0.8));
			const attacco = Math.min(ATTACCO_S, e.durata / 2);
			// sempre da 0 e verso 0, con rampe: niente scatti all'inizio e alla fine
			g.setValueAtTime(0, t);
			g.linearRampToValueAtTime(picco, t + attacco);
			g.setTargetAtTime(picco * SOSTEGNO, t + attacco, DECADIMENTO_S / 3);
			g.setTargetAtTime(0, t + e.durata, RILASCIO_S / 6);
			o.connect(inviluppo).connect(bus);
			o.start(t);
			o.stop(t + e.durata + RILASCIO_S);
			voci.add(o);
			o.onended = () => {
				voci.delete(o);
				inviluppo.disconnect();
			};
		},
		ultima + RILASCIO_S + CODA_S + latenza
	);
	void p.fine.then(() => setTimeout(() => bus.disconnect(), 200));

	return {
		fine: p.fine,
		ferma() {
			const ora = c.currentTime;
			bus.gain.setValueAtTime(1, ora);
			bus.gain.linearRampToValueAtTime(0, ora + 0.04);
			for (const o of voci) o.stop(ora + 0.05);
			p.ferma();
		}
	};
}

export const suonaNota = (midi: number, durata = 1): Riproduzione =>
	suona([{ midi, inizio: 0, durata }]);
