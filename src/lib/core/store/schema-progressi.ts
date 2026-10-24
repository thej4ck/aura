import * as v from 'valibot';
import { ID_LOCALE, ID_MODULO, ID_QUALIFICATO } from '../contenuti/schema';

export const FORMATO = 'aura-progressi';
export const SCHEMA_ATTUALE = 2;

/** la base del testo (tokens.css: tutto è in rem). Lo schema 1 aveva solo `accessibilita.testoGrande` */
export const DIMENSIONI_TESTO = ['piccolo', 'normale', 'grande', 'molto-grande'] as const;
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
	dimensioneTesto: v.picklist(DIMENSIONI_TESTO),
	accessibilita: v.object({
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
	// il pulsante compare solo se c'è una voce locale: chi non legge ancora (6 anni) ha la narrazione da subito
	letturaAltaVoce: true,
	dimensioneTesto: 'normale',
	accessibilita: { contrastoAlto: false, riduciMovimento: false },
	latenzaAudioMs: 0,
	aggiornato: new Date(0).toISOString()
};

/**
 * UUID v4. `crypto.randomUUID` esiste solo nei contesti sicuri (https, localhost): aperto in http dalla rete
 * locale (prova su tablet con `vite --host`) si ripiega su `getRandomValues`, che c'è sempre.
 */
export function uuid(): string {
	if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	const b = crypto.getRandomValues(new Uint8Array(16));
	b[6] = (b[6] & 0x0f) | 0x40; // versione 4
	b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 9562
	const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function nuovoDocumento(avatar: string, alias?: string): Documento {
	alias = alias?.trim();
	return {
		formato: FORMATO,
		schema: SCHEMA_ATTUALE,
		profilo: { id: uuid(), avatar, ...(alias ? { alias } : {}) },
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

/** Avatar proposti a un nuovo profilo; al primo avvio se ne sceglie uno a caso. */
export const AVATARI = ['🦊', '🐻', '🐼', '🐨', '🐸', '🦉', '🐙', '🦋', '🐢', '🐧'] as const;

/** Parola italiana (ASCII minuscola) di ogni avatar, per il nome del file di backup: niente emoji nei nomi di file. */
export const PAROLA_AVATAR: Record<(typeof AVATARI)[number], string> = {
	'🦊': 'volpe',
	'🐻': 'orso',
	'🐼': 'panda',
	'🐨': 'koala',
	'🐸': 'rana',
	'🦉': 'gufo',
	'🐙': 'polpo',
	'🦋': 'farfalla',
	'🐢': 'tartaruga',
	'🐧': 'pinguino'
};
