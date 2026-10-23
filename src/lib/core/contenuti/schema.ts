import * as v from 'valibot';

const KEBAB = '[a-z0-9]+(?:-[a-z0-9]+)*';
/** Id locale: kebab-case (`note-linee`). */
export const ID_LOCALE = new RegExp(`^${KEBAB}$`);
/** Id di modulo qualificato: `area.modulo`. */
export const ID_MODULO = new RegExp(`^${KEBAB}\\.${KEBAB}$`);
/** Id qualificato di attività o competenza: `area.modulo.id`. */
export const ID_QUALIFICATO = new RegExp(`^${KEBAB}\\.${KEBAB}\\.${KEBAB}$`);
/** Riferimento nei dati di un modulo: id locale (stesso modulo) oppure qualificato. */
export const RIFERIMENTO = new RegExp(`^(?:${KEBAB}\\.${KEBAB}\\.)?${KEBAB}$`);
/** Altezza in notazione scientifica: `C4`, `F#4`, `Bb3`. */
export const ALTEZZA = /^[A-G][#b]?[0-8]$/;

const idLocale = v.pipe(v.string(), v.regex(ID_LOCALE, 'id in kebab-case (es. "note-linee")'));
const idQualificato = v.pipe(
	v.string(),
	v.regex(ID_QUALIFICATO, 'id qualificato area.modulo.id (es. "musica.canto.estensione")')
);
const riferimento = v.pipe(
	v.string(),
	v.regex(
		RIFERIMENTO,
		'id locale o qualificato (es. "note-linee" o "musica.pentagramma.note-linee")'
	)
);
const testo = v.pipe(v.string(), v.trim(), v.nonEmpty('testo vuoto'));
const testi = v.array(testo);
const eta = v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(18));

export const STATI_PUBBLICAZIONE = ['bozza', 'pubblicata'] as const;
export const FASI = ['scopri', 'insieme', 'prova'] as const;
export const DURATE = ['1', '2', '4', '8', '16'] as const;

export const SchemaNota = v.object({
	altezza: v.pipe(v.string(), v.regex(ALTEZZA, 'altezza come "C4", "F#4" o "Bb3"')),
	durata: v.optional(v.picklist(DURATE))
});

export const SchemaRigo = v.object({
	chiave: v.picklist(['violino', 'basso']),
	armatura: v.optional(v.pipe(v.number(), v.integer(), v.minValue(-7), v.maxValue(7))),
	note: v.array(SchemaNota)
});

export const SchemaScheda = v.object({
	id: idLocale,
	fase: v.picklist(FASI),
	widget: idLocale,
	titolo: v.optional(testo),
	testo: v.optional(testo),
	/** percorso di un file audio (voce registrata) servito dal sito */
	audio: v.optional(v.pipe(v.string(), v.nonEmpty())),
	/** dati del widget: li valida il widget stesso */
	props: v.optional(v.record(v.string(), v.unknown()), {})
});

export const SchemaAttivita = v.object({
	id: idLocale,
	titolo: testo,
	tipo: v.picklist(['lezione', 'gioco']),
	obiettivo: testo,
	riepilogo: testo,
	minuti: v.pipe(v.number(), v.integer(), v.minValue(1)),
	/** competenze allenate */
	allena: v.array(riferimento),
	/** risposte "prova" minime perché conti (giochi: di default 3, vedi motore/logica.ts) */
	risposteMinime: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
	/** attività consigliate prima di questa (suggerimento, mai blocco) */
	prerequisiti: v.optional(v.array(riferimento), []),
	/** traguardi delle Indicazioni Nazionali */
	traguardi: testi,
	/** se assente vale lo stato del modulo */
	stato: v.optional(v.picklist(STATI_PUBBLICAZIONE)),
	schede: v.pipe(v.array(SchemaScheda), v.nonEmpty('almeno una scheda'))
});

export const SchemaCompetenza = v.object({
	id: idLocale,
	titolo: testo,
	descrizione: testo,
	/** competenze prerequisito */
	prerequisiti: v.optional(v.array(riferimento), [])
});

export const SchemaModulo = v.object({
	id: idLocale,
	area: idLocale,
	eta: v.pipe(
		v.tuple([eta, eta]),
		v.check(([min, max]) => min <= max, 'eta: il minimo supera il massimo')
	),
	titolo: testo,
	descrizione: testo,
	icona: testo,
	stato: v.picklist(STATI_PUBBLICAZIONE),
	introduzione: v.object({
		cosaImparerai: testi,
		comeFunziona: testo,
		cosaServe: testi,
		consigliPerAdulti: testi
	}),
	glossario: v.array(v.object({ termine: testo, spiegazione: testo })),
	competenze: v.array(SchemaCompetenza),
	attivita: v.array(SchemaAttivita)
});

export const SchemaArea = v.object({
	id: idLocale,
	titolo: testo,
	descrizione: testo,
	icona: testo,
	colore: testo,
	/** id qualificati delle attività, nell'ordine consigliato (anche di moduli diversi) */
	percorso: v.array(idQualificato)
});

export type Nota = v.InferOutput<typeof SchemaNota>;
export type Rigo = v.InferOutput<typeof SchemaRigo>;
export type Scheda = v.InferOutput<typeof SchemaScheda>;
export type Attivita = v.InferOutput<typeof SchemaAttivita>;
export type Competenza = v.InferOutput<typeof SchemaCompetenza>;
export type Modulo = v.InferOutput<typeof SchemaModulo>;
export type Area = v.InferOutput<typeof SchemaArea>;
export type StatoPubblicazione = (typeof STATI_PUBBLICAZIONE)[number];
export type Fase = (typeof FASI)[number];

/** Forma da scrivere nei file `modulo.ts` e `area.ts` (`satisfies ModuloDati`). */
export type ModuloDati = v.InferInput<typeof SchemaModulo>;
export type AreaDati = v.InferInput<typeof SchemaArea>;
