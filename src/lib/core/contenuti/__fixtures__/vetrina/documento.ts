import {
	nuovoDocumento,
	type Documento,
	type RecordAttivita,
	type StatoAttivita
} from '../../../store/schema-progressi';

/**
 * Documento con le attività negli stati dati, `id → [stato, scheda, ora UTC del 20/10/2026]`.
 * Le completate hanno due stelle. Per i test delle funzioni di vista.
 */
export function docCon(stati: Record<string, [StatoAttivita, number?, number?]>): Documento {
	const doc = nuovoDocumento('🦊');
	for (const [id, [stato, scheda = 0, ora = 9]] of Object.entries(stati)) {
		const r: RecordAttivita = {
			stato,
			scheda,
			stelle: stato === 'completata' ? 2 : 0,
			tentativi: 1,
			aggiornato: new Date(Date.UTC(2026, 9, 20, ora)).toISOString()
		};
		doc.attivita[id] = r;
	}
	return doc;
}
