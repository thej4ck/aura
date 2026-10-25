// Percussioni del Ritmo (ADR 0008): il legnetto delle note e il clic del metronomo, sintetizzati e
// programmati sul clock audio come le note di synth.ts (pianifica in contesto.ts). Ogni colpo è UN
// oscillatore (il corpo del suono, alla sua altezza) più un soffio di rumore già pronto in un buffer
// (lo schiocco dell'attacco, che lo rende un colpo di legno e non un "bip").
import { contesto, pianifica, uscita } from './contesto.ts';
import { freqDaMidi } from './frequenze.ts';
import { CODA_S, type Riproduzione } from './synth.ts';
import { creaCasuale } from '../casuale.ts';

export type Colpo = {
	/** secondi dall'inizio della riproduzione: suona a `t0 + inizio` sul clock audio */
	inizio: number;
	/** 'legnetto': una nota del ritmo; 'clic': il metronomo */
	timbro: 'legnetto' | 'clic';
	/** primo battito della battuta: legnetto più forte, clic più acuto (MIDI_ACCENTO) */
	accento?: boolean;
	/**
	 * legnetto: secondi della nota. Le note lunghe risuonano piano fino alla loro fine, così TA-A si
	 * distingue a orecchio da TA SST; senza durata, un colpo secco
	 */
	durata?: number;
	/** 0-1, predefinito 1: il metronomo "piano" sotto i battiti del bambino (VOLUME_CLIC_PIANO) */
	volume?: number;
};

/**
 * Altezze nominali (midi) dell'oscillatore di ogni timbro. Ogni colpo avvia esattamente UN
 * OscillatorNode a quella frequenza (il resto del timbro con rumore da AudioBufferSourceNode): la spia di
 * tests/animazioni.dev.spec.ts conta gli oscillatori e li confronta con `data-suona`, che per una nota
 * ritmica vale MIDI_LEGNETTO. Do6 (~1 kHz) è la risonanza di un legnetto vero; il clic sta un'ottava
 * sopra, l'accento una quinta più su ancora: si distinguono senza guardare.
 */
export const MIDI_LEGNETTO = 84;
export const MIDI_CLIC = 96;
export const MIDI_ACCENTO = 103;

/** picco dell'oscillatore prima del compressore comune (il rumore dell'attacco è una frazione) */
const PICCO_LEGNETTO = 0.4;
const PICCO_LEGNETTO_ACCENTO = 0.55;
const PICCO_CLIC = 0.25;
/** il rumore dell'attacco, rispetto al picco: lo schiocco del legno e del clic */
const RUMORE_LEGNETTO = 0.6;
const RUMORE_CLIC = 0.35;
/** salita da 0 al picco: un colpo vero, ma senza gradino (niente scatto) */
const ATTACCO_S = 0.001;
/** il corpo del legnetto cala con questa costante di tempo: dopo ~150 ms tace */
const DECADIMENTO_S = 0.025;
/**
 * Le note lunghe almeno tanto risuonano piano (RISONANZA del picco) fino alla loro fine, poi si spengono
 * in RILASCIO_S. Con 0,9 s una minima risuona sempre (1,2 s a BPM_RITMO_MAX) e una semiminima a
 * BPM_RITMO (0,83 s) resta un colpo secco; sotto ~66 BPM risuona anche TA, ma TA SST resta diverso da
 * TA-A perché il suono finisce con la nota.
 */
const RISONANZA_DA_S = 0.9;
const RISONANZA = 0.12;
/** costante di tempo del rilascio, che comincia RILASCIO_PRIMA_S prima della fine della nota */
const RILASCIO_S = 0.02;
const RILASCIO_PRIMA_S = 0.05;
/** il clic dura tanto, tutto compreso (≤ 30 ms: la coda dell'attacco finisce prima del primo battito) */
export const CLIC_S = 0.03;
/** il buffer di rumore dell'attacco */
const RUMORE_S = 0.03;

const rumori = new WeakMap<BaseAudioContext, AudioBuffer>();
/** Lo schiocco: rumore bianco derivato (gli acuti), salita di 0,3 ms e calo in ~4 ms. */
function rumore(c: BaseAudioContext): AudioBuffer {
	let b = rumori.get(c);
	if (!b) {
		const n = Math.round(RUMORE_S * c.sampleRate);
		b = c.createBuffer(1, n, c.sampleRate);
		const x = b.getChannelData(0);
		const casuale = creaCasuale(1);
		let prima = 0;
		for (let i = 0; i < n; i++) {
			const t = i / c.sampleRate;
			const bianco = 2 * casuale() - 1;
			x[i] = 0.5 * (bianco - prima) * (1 - Math.exp(-t / 0.0003)) * Math.exp(-t / 0.004);
			prima = bianco;
		}
		rumori.set(c, b);
	}
	return b;
}

const risuona = (k: Colpo) => k.timbro === 'legnetto' && (k.durata ?? 0) >= RISONANZA_DA_S;

/** Quanto suona un colpo dal suo inizio (s), coda dell'inviluppo compresa. */
function durataColpo(k: Colpo): number {
	if (k.timbro === 'clic') return CLIC_S;
	return risuona(k) ? k.durata! - RILASCIO_PRIMA_S + 6 * RILASCIO_S : 8 * DECADIMENTO_S;
}

/**
 * Suona i colpi, ognuno esattamente a `t0 + inizio` (sample-accurate, mai con setTimeout). Come suona()
 * di synth.ts: un bus per riproduzione, ferma() sfuma senza scatti, la riproduzione resta attiva
 * (riproduzioneAttiva(), turni col microfono) fino all'ultimo colpo più la sua coda, l'eco della stanza
 * (CODA_S) e la latenza d'uscita; `fine` si risolve lì o con ferma(). Il clic è corto (≤ 30 ms): la coda
 * dell'attacco deve finire prima del primo battito del bambino (BPM_RITMO_MAX). Volume moderato, sotto il
 * compressore comune. Da chiamare in un gesto o dopo sblocca() fatto nel gesto (iOS).
 */
export function suonaColpi(colpi: readonly Colpo[]): Riproduzione {
	const c = contesto();
	// un bus per riproduzione: ferma() lo sfuma senza toccare gli inviluppi (niente scatti)
	const bus = c.createGain();
	bus.connect(uscita());
	const sorgenti = new Set<AudioScheduledSourceNode>();
	// un colpo a volume 0 non suona (e la rampa esponenziale non può arrivare a 0)
	const udibili = colpi.filter((k) => (k.volume ?? 1) > 0);
	const ultima = Math.max(0, ...udibili.map((k) => k.inizio + durataColpo(k)));
	const latenza = c.outputLatency || c.baseLatency || 0;

	const p = pianifica(
		udibili,
		(k, t) => {
			const legnetto = k.timbro === 'legnetto';
			const volume = Math.min(1, Math.max(0, k.volume ?? 1));
			const picco =
				volume * (legnetto ? (k.accento ? PICCO_LEGNETTO_ACCENTO : PICCO_LEGNETTO) : PICCO_CLIC);
			const o = c.createOscillator();
			o.frequency.value = freqDaMidi(
				legnetto ? MIDI_LEGNETTO : k.accento ? MIDI_ACCENTO : MIDI_CLIC
			);
			const inviluppo = c.createGain();
			const g = inviluppo.gain;
			// sempre da 0 e verso 0, con rampe: niente scatti all'inizio e alla fine
			g.setValueAtTime(0, t);
			g.linearRampToValueAtTime(picco, t + ATTACCO_S);
			if (!legnetto) {
				g.exponentialRampToValueAtTime(picco / 1000, t + CLIC_S - 0.005);
				g.linearRampToValueAtTime(0, t + CLIC_S);
			} else if (risuona(k)) {
				g.setTargetAtTime(picco * RISONANZA, t + ATTACCO_S, DECADIMENTO_S);
				g.setTargetAtTime(0, t + k.durata! - RILASCIO_PRIMA_S, RILASCIO_S);
			} else g.setTargetAtTime(0, t + ATTACCO_S, DECADIMENTO_S);
			o.connect(inviluppo).connect(bus);
			o.start(t);
			o.stop(t + durataColpo(k));

			const schiocco = c.createBufferSource();
			schiocco.buffer = rumore(c);
			const livello = c.createGain();
			livello.gain.value = picco * (legnetto ? RUMORE_LEGNETTO : RUMORE_CLIC);
			schiocco.connect(livello).connect(bus);
			schiocco.start(t);

			sorgenti.add(o).add(schiocco);
			o.onended = () => {
				sorgenti.delete(o);
				sorgenti.delete(schiocco);
				inviluppo.disconnect();
				livello.disconnect();
			};
		},
		ultima + CODA_S + latenza
	);
	void p.fine.then(() => setTimeout(() => bus.disconnect(), 200));

	return {
		t0: p.t0,
		fine: p.fine,
		ferma() {
			const ora = c.currentTime;
			bus.gain.setValueAtTime(1, ora);
			bus.gain.linearRampToValueAtTime(0, ora + 0.04);
			for (const s of sorgenti) s.stop(ora + 0.05);
			p.ferma();
		}
	};
}
