// Logica pura del modulo Ritmo: i ritmi dei giochi per livello (ogni livello aggiunge una figura), le
// serie di «Eco ritmica», le domande di «Che ritmo è?» (mai due ritmi che all'orecchio suonano uguali) e
// la progressione di «Leggi e batti», che sale e non scende mai. Niente audio né DOM.
import * as v from 'valibot';
import { creaCasuale, mescola, scegli, type Casuale } from '#lib/core/casuale.ts';
import { SchemaRigo, type Rigo, type Tempo } from '#lib/core/contenuti/schema.ts';
import {
	inizi,
	lunghezza,
	rigoRitmico,
	sillaba,
	type NotaRitmica
} from '#lib/core/musica/ritmo.ts';

/** Un ritmo dei giochi: le sillabe ('ta ti-ti ta-a') e, nei ritmi con le battute, il tempo. */
export type Ritmo = { sillabe: string; tempo?: Tempo };

const r = (sillabe: string, tempo?: Tempo): Ritmo => (tempo ? { sillabe, tempo } : { sillabe });

/**
 * I ritmi dei giochi, per livello. Ogni livello aggiunge una cosa, come le lezioni: 0 TA e TI-TI; 1 TA-A;
 * 2 la pausa SST; 3 le battute (due, in 2/4, 3/4 o 4/4). Fino al livello 2 un ritmo dura quattro
 * battiti, senza tempo in chiave; dal livello 1 ogni ritmo ha la figura nuova. Nessuno comincia con la
 * pausa: dopo l'attacco si parte battendo. Ogni rigo sta intero su un telefono di 360 px, sillabe comprese
 * (lo controlla ritmi.test.ts): le crome allargano molto le colonne, così nelle battute di 3/4 e 4/4 ce
 * ne sono poche o nessuna.
 */
export const LIVELLI: readonly (readonly Ritmo[])[] = [
	[
		r('ta ta ta ta'),
		r('ta ta ti-ti ta'),
		r('ti-ti ta ta ta'),
		r('ta ti-ti ta ta'),
		r('ta ta ta ti-ti'),
		r('ti-ti ti-ti ta ta'),
		r('ta ti-ti ti-ti ta'),
		r('ti-ti ta ti-ti ta')
	],
	[
		r('ta ta ta-a'),
		r('ta-a ta ta'),
		r('ti-ti ta ta-a'),
		r('ta ti-ti ta-a'),
		r('ta-a ti-ti ta'),
		r('ta-a ta-a'),
		r('ti-ti ti-ti ta-a'),
		r('ta ta-a ta')
	],
	[
		r('ta ta ta sst'),
		r('ta sst ta ta'),
		r('ta ta sst ta'),
		r('ti-ti ta ta sst'),
		r('ta-a ta sst'),
		r('ta sst ti-ti ta'),
		r('ti-ti ti-ti ta sst'),
		r('ta ti-ti sst ta')
	],
	[
		r('ta ti-ti ta-a', '2/4'),
		r('ti-ti ta ta sst', '2/4'),
		r('ta sst ti-ti ta', '2/4'),
		r('ta ta ta ta-a ta', '3/4'),
		r('ta-a ta ta ta sst', '3/4'),
		r('ti-ti ta-a ta-a ta', '3/4'),
		r('ta ta ta-a ta-a ta ta', '4/4'),
		r('ta-a ta ta ta sst ta-a', '4/4')
	]
];

/** Il rigo ritmico validato di un ritmo (con l'altezza segnaposto che lo schema dà alle note). */
export const rigoDi = (x: Ritmo): Rigo => v.parse(SchemaRigo, rigoRitmico(x.sillabe, x.tempo));

/** L'item di un esito: una sillaba per nota, come `batti-ritmo` ('ta ti ti ta-a'). */
export const itemDi = (rigo: { note: readonly NotaRitmica[] }): string =>
	rigo.note.map(sillaba).join(' ');

/** Battiti di un ritmo. */
export const battitiDi = (x: Ritmo): number => lunghezza(rigoRitmico(x.sillabe).note);

/** Dove cominciano i suoni (in battiti), pause escluse: quello che l'orecchio sente del ritmo. */
function attacchi(note: readonly NotaRitmica[]): string {
	const t = inizi(note);
	return note.flatMap((n, i) => (n.pausa ? [] : [t[i]])).join(' ');
}

/**
 * Due ritmi suonano uguali all'orecchio se i loro suoni cominciano negli stessi istanti: TA-A e TA SST,
 * per esempio, sono un colpo e poi niente fino alla nota dopo (il legnetto risuona piano sulla minima,
 * ma non basta per farne una domanda). In «Che ritmo è?» non si mettono mai insieme.
 */
export const suonanoUguali = (
	a: { note: readonly NotaRitmica[] },
	b: { note: readonly NotaRitmica[] }
): boolean => attacchi(a.note) === attacchi(b.note);

const uguali = (a: Ritmo, b: Ritmo) =>
	suonanoUguali(rigoRitmico(a.sillabe), rigoRitmico(b.sillabe));

// --- «Eco ritmica» ----------------------------------------------------------------------------

/** Il livello di ogni giro: i ritmi crescono piano, una figura alla volta, e alla fine le battute. */
export const GIRI_ECO = [0, 0, 1, 2, 3] as const;
/** A eco si ricorda a orecchio: al massimo due battute di 3/4 (le due di 4/4 restano alla lettura). */
export const MAX_BATTITI_ECO = 6;

/** I ritmi di «Eco ritmica», uno per giro, tutti diversi. Stesso seed, stessa serie. */
export function serieEco(seed: number): Ritmo[] {
	const c = creaCasuale(seed);
	return GIRI_ECO.reduce<Ritmo[]>((serie, livello) => {
		const voci = LIVELLI[livello].filter(
			(x) => battitiDi(x) <= MAX_BATTITI_ECO && !serie.includes(x)
		);
		return [...serie, scegli(voci, c)];
	}, []);
}

// --- «Che ritmo è?» ---------------------------------------------------------------------------

/** Ogni giro: il livello del ritmo da riconoscere e quanti ritmi scritti tra cui sceglierlo. */
export const GIRI_ASCOLTO = [
	{ livello: 0, opzioni: 2 },
	{ livello: 0, opzioni: 2 },
	{ livello: 1, opzioni: 2 },
	{ livello: 1, opzioni: 3 },
	{ livello: 2, opzioni: 3 },
	{ livello: 2, opzioni: 3 }
] as const;

export type DomandaAscolto = { ritmi: Ritmo[]; corretta: number };

/** Una domanda: il ritmo da riconoscere e altri del suo livello o di quelli prima, che suonano diversi. */
function domanda(c: Casuale, livello: number, opzioni: number, prima?: Ritmo): DomandaAscolto {
	const giusto = scegli(
		LIVELLI[livello].filter((x) => x !== prima),
		c
	);
	const scelti = [giusto];
	for (const x of mescola(LIVELLI.slice(0, livello + 1).flat(), c)) {
		if (scelti.length === opzioni) break;
		if (scelti.every((s) => !uguali(s, x))) scelti.push(x);
	}
	const ritmi = mescola(scelti, c);
	return { ritmi, corretta: ritmi.indexOf(giusto) };
}

/** Le domande di «Che ritmo è?», una per giro (GIRI_ASCOLTO). Stesso seed, stesse domande. */
export function domandeAscolto(seed: number): DomandaAscolto[] {
	const c = creaCasuale(seed);
	const out: DomandaAscolto[] = [];
	for (const g of GIRI_ASCOLTO) {
		const prima = out.at(-1);
		out.push(domanda(c, g.livello, g.opzioni, prima?.ritmi[prima.corretta]));
	}
	return out;
}

// --- «Leggi e batti» --------------------------------------------------------------------------

/** I giri di una partita di «Leggi e batti». */
export const GIRI_LETTURA = 6;
/** Ritmi riusciti di fila per passare al livello dopo. */
export const RIUSCITI_PER_SALIRE = 3;

/**
 * Dove si è arrivati nella lettura: il livello (LIVELLI) e i ritmi riusciti di fila. Si salva in
 * dati['musica.ritmo'].lettura, accanto a `fonte` (la scelta tra tocco e mani di TurnoRitmo).
 *
 * ponytail: non sono scatole di Leitner per figura come in «Che nota è?»: l'esito del turno dice quante
 * note sono giuste, non quale figura ha fatto inciampare, e un ritmo mescola più figure. Basta il livello.
 */
export type StatoLettura = { livello: number; serie: number };

const SchemaStatoLettura = v.object({
	livello: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(LIVELLI.length - 1)),
	serie: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(RIUSCITI_PER_SALIRE - 1))
});

/** Lo stato salvato, oppure l'inizio (livello 0) se manca o non si legge. */
export function leggiLettura(dati: unknown): StatoLettura {
	const s = v.safeParse(SchemaStatoLettura, (dati as { lettura?: unknown } | undefined)?.lettura);
	return s.success ? s.output : { livello: 0, serie: 0 };
}

/**
 * Dopo un ritmo, al primo tentativo: RIUSCITI_PER_SALIRE di fila fanno salire di livello (`nuovo`: arriva
 * una figura nuova). Un ritmo non riuscito azzera la serie ma non fa mai scendere: niente punizioni.
 */
export function dopoRitmo(s: StatoLettura, riuscito: boolean): StatoLettura & { nuovo?: true } {
	if (!riuscito) return { livello: s.livello, serie: 0 };
	if (s.serie + 1 < RIUSCITI_PER_SALIRE) return { livello: s.livello, serie: s.serie + 1 };
	if (s.livello === LIVELLI.length - 1) return { livello: s.livello, serie: 0 };
	return { livello: s.livello + 1, serie: 0, nuovo: true };
}

/**
 * Il prossimo ritmo da leggere. Dopo un ritmo non riuscito arriva un ritmo del livello prima, con le
 * sillabe sotto le note (un ripasso, non una punizione: il livello resta quello); con una figura appena
 * arrivata le sillabe ci sono per presentarla. Mai lo stesso ritmo due volte di fila.
 */
export function prossimoRitmo(
	s: StatoLettura,
	c: Casuale,
	{ ripasso = false, nuovo = false, prima }: { ripasso?: boolean; nuovo?: boolean; prima?: Ritmo }
): { ritmo: Ritmo; sillabe: boolean } {
	const livello = ripasso ? Math.max(0, s.livello - 1) : s.livello;
	const ritmo = scegli(
		LIVELLI[livello].filter((x) => x !== prima),
		c
	);
	return { ritmo, sillabe: ripasso || nuovo };
}
