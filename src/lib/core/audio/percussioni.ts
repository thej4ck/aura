// Percussioni del Ritmo (ADR 0008): il legnetto delle note e il clic del metronomo, sintetizzati e
// programmati sul clock audio come le note di synth.ts (pianifica in contesto.ts).
// CONTRATTO: firme fissate, corpo da implementare (con percussioni.test.ts, sul modello di synth.test.ts).
import type { Riproduzione } from './synth.ts';

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
 * Altezze nominali (midi) dell'oscillatore principale di ogni timbro. Ogni colpo avvia esattamente UN
 * OscillatorNode a quella frequenza (il resto del timbro, se serve, con rumore da AudioBufferSourceNode):
 * la spia di tests/animazioni.dev.spec.ts conta gli oscillatori e li confronta con `data-suona`, che
 * per una nota ritmica vale MIDI_LEGNETTO. Valori di partenza, da scegliere con il timbro.
 */
export const MIDI_LEGNETTO = 84;
export const MIDI_CLIC = 96;
export const MIDI_ACCENTO = 103;

/**
 * Suona i colpi, ognuno esattamente a `t0 + inizio` (sample-accurate, mai con setTimeout). Come suona()
 * di synth.ts: un bus per riproduzione, ferma() sfuma senza scatti, la riproduzione resta attiva
 * (riproduzioneAttiva(), turni col microfono) fino all'ultimo colpo più la sua coda, l'eco della stanza
 * (CODA_S) e la latenza d'uscita; `fine` si risolve lì o con ferma(). Il clic è corto (≤ 30 ms): la coda
 * dell'attacco deve finire prima del primo battito del bambino (BPM_RITMO_MAX). Volume moderato, sotto il
 * compressore comune. Da chiamare in un gesto o dopo sblocca() fatto nel gesto (iOS).
 */
export function suonaColpi(colpi: readonly Colpo[]): Riproduzione {
	void colpi;
	throw new Error('suonaColpi: da implementare (ADR 0008)');
}
