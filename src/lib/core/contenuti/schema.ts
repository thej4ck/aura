import * as v from 'valibot';
import { battute } from '../musica/ritmo.ts';

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
/** '1' semibreve, '2' minima, '4' semiminima, '8' croma, '16' semicroma. */
export const DURATE = ['1', '2', '4', '8', '16'] as const;
/** Tempi in chiave: un battito è sempre una semiminima (ADR 0008). */
export const TEMPI = ['2/4', '3/4', '4/4'] as const;
export const CHIAVI = ['violino', 'basso'] as const;
/** La linea centrale: dove stanno le note del rigo ritmico e, come altezza segnaposto, le pause. */
const LINEA_CENTRALE = { violino: 'B4', basso: 'D3' } as const;

export const SchemaAltezza = v.pipe(
	v.string(),
	v.regex(ALTEZZA, 'altezza come "C4", "F#4" o "Bb3"')
);
export const SchemaChiave = v.picklist(CHIAVI);
export const SchemaArmatura = v.pipe(v.number(), v.integer(), v.minValue(-7), v.maxValue(7));

export const SchemaNota = v.object({
	/** obbligatoria, tranne nelle pause e nel rigo ritmico (vedi SchemaRigo) */
	altezza: v.optional(SchemaAltezza),
	/** senza durata la nota è una testa piena senza gambo, come nei righi senza ritmo */
	durata: v.optional(v.picklist(DURATE)),
	/** nota puntata: dura una volta e mezza (la minima puntata dei 3/4) */
	punto: v.optional(v.boolean()),
	/** pausa lunga `durata`: non suona e non si batte */
	pausa: v.optional(v.boolean())
});

/**
 * Un rigo. Senza durate, tempo e pause è quello di sempre (Pentagramma, Canto). Con `tempo` ci sono le
 * stanghette e ogni battuta deve essere piena; `ritmico` è il rigo a una linea, dove conta solo la durata.
 * In uscita ogni nota ha un'altezza: a pause e note ritmiche si dà la linea centrale, che non suona.
 */
export const SchemaRigo = v.pipe(
	v.object({
		chiave: v.optional(SchemaChiave, 'violino'),
		armatura: v.optional(SchemaArmatura),
		tempo: v.optional(v.picklist(TEMPI)),
		ritmico: v.optional(v.boolean()),
		note: v.array(SchemaNota)
	}),
	v.check(
		(r) => r.ritmico === true || r.note.every((n) => n.pausa || n.altezza),
		"manca l'altezza di una nota: serve sempre, tranne nelle pause e nel rigo ritmico"
	),
	v.check(
		(r) => r.note.every((n) => n.durata || !(n.pausa || n.punto || r.tempo || r.ritmico)),
		'pause, note puntate, righi con il tempo e righi ritmici vogliono la durata di ogni nota'
	),
	v.check(
		(r) => !r.tempo || battute(r.note, r.tempo) !== null,
		'battute non piene: ognuna contiene esattamente i battiti del tempo (4 in 4/4), senza note a cavallo della stanghetta'
	),
	v.transform((r) => ({
		...r,
		note: r.note.map((n) => ({ ...n, altezza: n.altezza ?? LINEA_CENTRALE[r.chiave] }))
	}))
);

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

export type Rigo = v.InferOutput<typeof SchemaRigo>;
/** Una nota di un Rigo validato: l'altezza c'è sempre (nelle pause e nel rigo ritmico non conta). */
export type Nota = Rigo['note'][number];
export type Durata = (typeof DURATE)[number];
export type Tempo = (typeof TEMPI)[number];
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
