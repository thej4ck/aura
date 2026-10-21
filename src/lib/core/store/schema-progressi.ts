import * as v from 'valibot';
import { ID_LOCALE, ID_MODULO, ID_QUALIFICATO } from '../contenuti/schema';

export const FORMATO = 'kindergarden-progressi';
export const SCHEMA_ATTUALE = 1;

export const STATI_ATTIVITA = ['nuova', 'in_corso', 'completata'] as const;
export const STATI_AVANZAMENTO = ['da_iniziare', 'in_corso', 'completato'] as const;

const istante = v.pipe(v.string(), v.isoTimestamp());
/** giorno locale 'AAAA-MM-GG' */
const giorno = v.pipe(v.string(), v.isoDate());
const intero = (min: number, max: number) =>
	v.pipe(v.number(), v.integer(), v.minValue(min), v.maxValue(max));
const idQualificato = v.pipe(v.string(), v.regex(ID_QUALIFICATO));

export const SchemaProfilo = v.object({
	id: v.pipe(v.string(), v.uuid()),
	/** emoji */
	avatar: v.pipe(v.string(), v.nonEmpty(), v.maxLength(32)),
	alias: v.optional(v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(40)))
});

export const SchemaPreferenze = v.object({
	lingua: v.pipe(v.string(), v.regex(/^[a-z]{2,3}$/)),
	nomiNote: v.picklist(['solfeggio', 'lettere']),
	tolleranza: v.picklist(['facile', 'medio', 'preciso']),
	filtroModuli: v.object({
		area: v.optional(v.pipe(v.string(), v.regex(ID_LOCALE))),
		eta: v.optional(intero(0, 99)),
		stato: v.optional(v.picklist(STATI_AVANZAMENTO))
	}),
	letturaAltaVoce: v.boolean(),
	accessibilita: v.object({
		testoGrande: v.boolean(),
		contrastoAlto: v.boolean(),
		riduciMovimento: v.boolean()
	}),
	latenzaAudioMs: v.pipe(v.number(), v.minValue(0), v.maxValue(2000)),
	aggiornato: istante
});

export const SchemaRecordAttivita = v.object({
	stato: v.picklist(STATI_ATTIVITA),
	/** indice della scheda da cui riprendere */
	scheda: intero(0, 10_000),
	stelle: intero(0, 3),
	/** verifiche fatte */
	tentativi: intero(0, Number.MAX_SAFE_INTEGER),
	/** giorno del primo completamento (verifica superata) */
	primaVolta: v.optional(giorno),
	/** giorno dell'ultima verifica */
	ultimaVolta: v.optional(giorno),
	aggiornato: istante
});

export const SchemaRecordCompetenza = v.object({
	livello: intero(0, 4),
	prossimoRipasso: v.optional(giorno),
	/** giorno in cui è stato raggiunto il livello attuale (serve alla regola del livello 4) */
	livelloDal: v.optional(giorno),
	aggiornato: istante
});

/** Blocco di dati di un modulo: la forma la decide (e la valida) il modulo. */
export const SchemaRecordDati = v.looseObject({ aggiornato: istante });

export const SchemaDocumento = v.object({
	formato: v.literal(FORMATO),
	schema: v.literal(SCHEMA_ATTUALE),
	profilo: SchemaProfilo,
	preferenze: SchemaPreferenze,
	attivita: v.record(idQualificato, SchemaRecordAttivita),
	competenze: v.record(idQualificato, SchemaRecordCompetenza),
	dati: v.record(v.pipe(v.string(), v.regex(ID_MODULO)), SchemaRecordDati),
	ultimoBackup: v.optional(istante)
});

export type Profilo = v.InferOutput<typeof SchemaProfilo>;
export type Preferenze = v.InferOutput<typeof SchemaPreferenze>;
export type RecordAttivita = v.InferOutput<typeof SchemaRecordAttivita>;
export type RecordCompetenza = v.InferOutput<typeof SchemaRecordCompetenza>;
export type RecordDati = v.InferOutput<typeof SchemaRecordDati>;
export type Documento = v.InferOutput<typeof SchemaDocumento>;
export type StatoAttivita = (typeof STATI_ATTIVITA)[number];
export type StatoAvanzamento = (typeof STATI_AVANZAMENTO)[number];

/** Le preferenze predefinite hanno `aggiornato` all'epoca: qualsiasi scelta esplicita vince nell'unione. */
export const PREFERENZE_PREDEFINITE: Preferenze = {
	lingua: 'it',
	nomiNote: 'solfeggio',
	tolleranza: 'facile',
	filtroModuli: {},
	letturaAltaVoce: false,
	accessibilita: { testoGrande: false, contrastoAlto: false, riduciMovimento: false },
	latenzaAudioMs: 0,
	aggiornato: new Date(0).toISOString()
};

export function nuovoDocumento(avatar: string, alias?: string): Documento {
	alias = alias?.trim();
	return {
		formato: FORMATO,
		schema: SCHEMA_ATTUALE,
		profilo: { id: crypto.randomUUID(), avatar, ...(alias ? { alias } : {}) },
		preferenze: structuredClone(PREFERENZE_PREDEFINITE),
		attivita: {},
		competenze: {},
		dati: {}
	};
}

export type CodiceErrore =
	| 'formato'
	| 'versione-futura'
	| 'non-valido'
	| 'corrotto'
	| 'troppo-grande'
	| 'non-supportato'
	| 'profili-diversi';

/** Errore sui progressi o sui file: `codice` per scegliere il messaggio nella UI, `message` per i dettagli. */
export class ErroreProgressi extends Error {
	readonly codice: CodiceErrore;
	constructor(codice: CodiceErrore, messaggio: string, opzioni?: ErrorOptions) {
		super(messaggio, opzioni);
		this.name = 'ErroreProgressi';
		this.codice = codice;
	}
}
