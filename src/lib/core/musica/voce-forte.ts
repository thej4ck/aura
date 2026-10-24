// «Non serve cantare più forte». Per arrivare a una nota che non trovano, molti bambini alzano il volume e
// forzano la voce. Due segnali: la voce cresce di molto rispetto a come è partita mentre è ancora lontana
// dalla nota, oppure è fortissima in assoluto. Il volume assoluto dipende da microfono e distanza: per
// questo conta soprattutto il confronto con l'inizio. Le soglie sono in audio/costanti.ts.
import { CRESCENDO_DB, FORTE_DBFS, FORTE_MS, VOCE_BASE_MS } from '../audio/costanti.ts';
import { MAX_PASSO_S } from './intonazione.ts';

export type FrameVolume = { t: number; freq: number | null; rms: number; silenziato?: boolean };

export type StatoVoceForte = {
	/** livello medio (dBFS) del primo tratto di voce: com'è partito il bambino */
	base: number;
	/** quanta voce (ms) è entrata nella media della partenza */
	baseMs: number;
	/** da quanto (ms) la voce è troppo forte; cala alla stessa velocità quando torna normale */
	forteMs: number;
	t: number | null;
	/** una volta acceso resta fino alla fine della prova: è un consiglio, non deve lampeggiare */
	avviso: boolean;
};

export const nuovaVoceForte = (): StatoVoceForte => ({
	base: 0,
	baseMs: 0,
	forteMs: 0,
	t: null,
	avviso: false
});

const dbfs = (rms: number) => 20 * Math.log10(Math.max(rms, 1e-6));

/** `fuoriNota`: la voce del frame è fuori dalla tolleranza della nota da cantare. */
export function avanzaVoceForte(
	s: StatoVoceForte,
	f: FrameVolume,
	fuoriNota: boolean
): StatoVoceForte {
	const dt = s.t === null ? 0 : Math.min(Math.max(f.t - s.t, 0), MAX_PASSO_S) * 1000;
	if (f.silenziato || f.freq === null) return { ...s, t: f.t };
	const livello = dbfs(f.rms);
	if (s.baseMs < VOCE_BASE_MS) {
		const baseMs = s.baseMs + dt;
		const base = baseMs > 0 ? (s.base * s.baseMs + livello * dt) / baseMs : livello;
		return { ...s, base, baseMs, t: f.t };
	}
	const forte = livello >= FORTE_DBFS || (fuoriNota && livello >= s.base + CRESCENDO_DB);
	const forteMs = forte ? s.forteMs + dt : Math.max(0, s.forteMs - dt);
	return { ...s, forteMs, t: f.t, avviso: s.avviso || forteMs >= FORTE_MS };
}
