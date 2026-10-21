import { ErroreProgressi, type Documento } from './schema-progressi';

type ConData = { aggiornato: string };

/**
 * Last-write-wins su un record. A parità di `aggiornato` vince il JSON maggiore,
 * così unisci(a, b) e unisci(b, a) danno lo stesso risultato.
 */
function piuRecente<T extends ConData>(x: T, y: T): T {
	const d = Date.parse(x.aggiornato) - Date.parse(y.aggiornato);
	if (d !== 0) return d > 0 ? x : y;
	return JSON.stringify(x) >= JSON.stringify(y) ? x : y;
}

function unisciRecord<T extends ConData>(a: Record<string, T>, b: Record<string, T>) {
	const out: Record<string, T> = { ...a };
	for (const [id, r] of Object.entries(b)) out[id] = out[id] ? piuRecente(out[id], r) : r;
	return out;
}

/**
 * Unisce due documenti dello stesso profilo record per record: per ogni attività, competenza,
 * blocco di dati e per le preferenze vince il più recente; i record presenti da un solo lato restano.
 * Il profilo (avatar, alias) segue le preferenze vincenti: chi lo modifica aggiorna anche `preferenze.aggiornato`.
 */
export function unisci(a: Documento, b: Documento): Documento {
	if (a.profilo.id !== b.profilo.id) {
		throw new ErroreProgressi('profili-diversi', 'I due documenti sono di profili diversi.');
	}
	const impostazioni = piuRecente(
		{ profilo: a.profilo, preferenze: a.preferenze, aggiornato: a.preferenze.aggiornato },
		{ profilo: b.profilo, preferenze: b.preferenze, aggiornato: b.preferenze.aggiornato }
	);
	const backup = [a.ultimoBackup, b.ultimoBackup]
		.filter((x) => x !== undefined)
		.map((aggiornato) => ({ aggiornato }));
	return {
		formato: a.formato,
		schema: a.schema,
		profilo: impostazioni.profilo,
		preferenze: impostazioni.preferenze,
		attivita: unisciRecord(a.attivita, b.attivita),
		competenze: unisciRecord(a.competenze, b.competenze),
		dati: unisciRecord(a.dati, b.dati),
		...(backup.length ? { ultimoBackup: backup.reduce(piuRecente).aggiornato } : {})
	};
}
