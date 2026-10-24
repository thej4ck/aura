import * as v from 'valibot';
import {
	ErroreProgressi,
	FORMATO,
	SCHEMA_ATTUALE,
	SchemaDocumento,
	type Documento
} from './schema-progressi';

/** input non fidato: quello che non è un oggetto diventa vuoto, e poi lo respinge la validazione */
const oggetto = (x: unknown): Record<string, unknown> =>
	typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : {};

/**
 * Migrazioni pure: la chiave n trasforma un documento dello schema n nello schema n + 1
 * (e aggiorna il campo `schema`). Ogni migrazione ha un test con un documento della versione precedente.
 */
const MIGRAZIONI: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {
	// 1 → 2: la casella «Testo grande» diventa una delle quattro dimensioni del testo
	1: (doc) => {
		const preferenze = oggetto(doc.preferenze);
		const { testoGrande, ...accessibilita } = oggetto(preferenze.accessibilita);
		return {
			...doc,
			schema: 2,
			preferenze: {
				...preferenze,
				dimensioneTesto: testoGrande === true ? 'grande' : 'normale',
				accessibilita
			}
		};
	}
};

/** Porta un documento qualsiasi (input non fidato) all'ultima versione dello schema e lo valida. */
export function migra(json: unknown): Documento {
	if (
		typeof json !== 'object' ||
		json === null ||
		(json as { formato?: unknown }).formato !== FORMATO
	) {
		throw new ErroreProgressi('formato', 'Non è un file di progressi di Aura.');
	}
	let doc = json as Record<string, unknown>;
	const versione = doc.schema;
	if (typeof versione !== 'number' || !Number.isInteger(versione) || versione < 1) {
		throw new ErroreProgressi(
			'non-valido',
			`Versione dello schema non valida: ${String(versione)}.`
		);
	}
	if (versione > SCHEMA_ATTUALE) {
		throw new ErroreProgressi(
			'versione-futura',
			`Il file usa lo schema ${versione}, questa versione di Aura arriva al ${SCHEMA_ATTUALE}: aggiorna la pagina e riprova.`
		);
	}
	for (let n = versione; n < SCHEMA_ATTUALE; n++) doc = MIGRAZIONI[n](doc);

	const r = v.safeParse(SchemaDocumento, doc);
	if (!r.success) {
		throw new ErroreProgressi(
			'non-valido',
			`File di progressi non valido:\n${v.summarize(r.issues)}`
		);
	}
	return r.output;
}
