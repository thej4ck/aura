import * as v from 'valibot';
import {
	ErroreProgressi,
	FORMATO,
	SCHEMA_ATTUALE,
	SchemaDocumento,
	type Documento
} from './schema-progressi';

/**
 * Migrazioni pure: la chiave n trasforma un documento dello schema n nello schema n + 1
 * (e aggiorna il campo `schema`). Ogni migrazione ha un test con un documento della versione precedente.
 */
const MIGRAZIONI: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {};

/** Porta un documento qualsiasi (input non fidato) all'ultima versione dello schema e lo valida. */
export function migra(json: unknown): Documento {
	if (
		typeof json !== 'object' ||
		json === null ||
		(json as { formato?: unknown }).formato !== FORMATO
	) {
		throw new ErroreProgressi('formato', 'Non è un file di progressi di Kindergarden.');
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
			`Il file usa lo schema ${versione}, questa versione di Kindergarden arriva al ${SCHEMA_ATTUALE}: aggiorna la pagina e riprova.`
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
