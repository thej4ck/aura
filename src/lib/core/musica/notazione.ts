// Geometria pura del pentagramma. Il "passo" è la posizione verticale in mezzi spazi dalla prima linea
// in basso: 0 = prima linea, 1 = primo spazio, … 8 = quinta linea; pari = linee, dispari = spazi;
// sotto lo 0 e sopra l'8 ci sono i tagli addizionali (-2, 10, …) e gli spazi tra loro.
import type { Rigo } from '#lib/core/contenuti/schema.ts';
import { m } from '#lib/paraglide/messages.js';
import { LETTERE, alterazioniArmatura, componi, scomponi } from './note.ts';

export type Chiave = Rigo['chiave'];
export type Segno = 'diesis' | 'bemolle' | 'bequadro';

/** Nota naturale sulla prima linea in basso. */
export const PRIMA_LINEA: Record<Chiave, string> = { violino: 'E4', basso: 'G2' };
export const QUINTA_LINEA = 8;
/** Passi selezionabili predefiniti: dal primo taglio sotto al primo sopra (violino: C4–A5). */
export const SELEZIONABILI: readonly [number, number] = [-2, 10];

const diatonico = (altezza: string) => {
	const { lettera, ottava } = scomponi(altezza);
	return ottava * 7 + LETTERE.indexOf(lettera);
};

/** Passo di un'altezza: 'G4' in chiave di violino → 2 (seconda linea). L'alterazione non conta. */
export const passo = (altezza: string, chiave: Chiave = 'violino') =>
	diatonico(altezza) - diatonico(PRIMA_LINEA[chiave]);

/** Altezza scritta su un passo, con l'alterazione dell'armatura: passo 1 con armatura 1 → 'F#4'. */
export function altezzaDaPasso(passo: number, chiave: Chiave = 'violino', armatura = 0): string {
	const d = diatonico(PRIMA_LINEA[chiave]) + passo;
	const ottava = Math.floor(d / 7);
	const lettera = LETTERE[d - ottava * 7];
	return componi({ lettera, alterazione: alterazioniArmatura(armatura)[lettera], ottava });
}

export const suLinea = (passo: number) => passo % 2 === 0;

/** Passi dei tagli addizionali che servono a una nota (vuoto dentro il rigo). */
export function tagli(passo: number): number[] {
	const t: number[] = [];
	for (let p = -2; p >= passo; p -= 2) t.push(p);
	for (let p = QUINTA_LINEA + 2; p <= passo; p += 2) t.push(p);
	return t;
}

/** Alterazione da scrivere accanto alla nota, rispetto all'armatura (ogni nota fa da sé: non ci sono battute). */
export function alterazioneDaMostrare(altezza: string, armatura = 0): Segno | undefined {
	const { lettera, alterazione } = scomponi(altezza);
	if (alterazione === alterazioniArmatura(armatura)[lettera]) return undefined;
	return alterazione === 1 ? 'diesis' : alterazione === -1 ? 'bemolle' : 'bequadro';
}

// posizioni classiche dei segni in chiave di violino (Fa Do Sol Re La Mi Si / Si Mi La Re Sol Do Fa)
const PASSI_ARMATURA = { diesis: [8, 5, 9, 6, 3, 7, 4], bemolle: [4, 7, 3, 6, 2, 5, 1] };

/** Segni dell'armatura in ordine, con il loro passo; in chiave di basso stanno una terza sotto. */
export function segniArmatura(armatura: number, chiave: Chiave = 'violino') {
	alterazioniArmatura(armatura); // valida
	const segno = armatura > 0 ? 'diesis' : 'bemolle';
	const sposta = chiave === 'basso' ? -2 : 0;
	return PASSI_ARMATURA[segno]
		.slice(0, Math.abs(armatura))
		.map((p) => ({ segno, passo: p + sposta }) as const);
}

export type Posizione =
	| { tipo: 'linea'; numero: number }
	| { tipo: 'spazio'; numero: number }
	| { tipo: 'taglio'; numero: number; verso: 'sotto' | 'sopra' }
	/** spazio oltre il taglio `numero` (0 = subito sotto la prima linea o sopra la quinta) */
	| { tipo: 'spazio-fuori'; numero: number; verso: 'sotto' | 'sopra' };

export function posizione(passo: number): Posizione {
	if (passo >= 0 && passo <= QUINTA_LINEA) {
		return suLinea(passo)
			? { tipo: 'linea', numero: passo / 2 + 1 }
			: { tipo: 'spazio', numero: (passo + 1) / 2 };
	}
	const verso = passo < 0 ? 'sotto' : 'sopra';
	const fuori = passo < 0 ? -passo : passo - QUINTA_LINEA;
	return fuori % 2 === 0
		? { tipo: 'taglio', numero: fuori / 2, verso }
		: { tipo: 'spazio-fuori', numero: (fuori - 1) / 2, verso };
}

/** Nome ordinale della posizione: "seconda linea", "primo spazio", "primo taglio in basso". */
export function nomePosizione(passo: number): string {
	const p = posizione(passo);
	const n = p.numero;
	switch (p.tipo) {
		case 'linea':
			return m.notazione_linea({ n });
		case 'spazio':
			return m.notazione_spazio({ n });
		case 'taglio':
			return p.verso === 'sotto'
				? m.notazione_taglio_sotto({ n })
				: m.notazione_taglio_sopra({ n });
		case 'spazio-fuori':
			return p.verso === 'sotto'
				? m.notazione_spazio_sotto({ n })
				: m.notazione_spazio_sopra({ n });
	}
}

/** y di un passo, dati la y della prima linea e l'altezza di uno spazio (y verso il basso). */
export const yDaPasso = (passo: number, yPrimaLinea: number, spazio: number) =>
	yPrimaLinea - (passo * spazio) / 2;

/** Hit-test: il passo più vicino alla coordinata y, limitato ai passi selezionabili. */
export function passoDaY(
	y: number,
	yPrimaLinea: number,
	spazio: number,
	[min, max]: readonly [number, number] = SELEZIONABILI
): number {
	const p = Math.round(((yPrimaLinea - y) * 2) / spazio);
	return Math.min(max, Math.max(min, p));
}

/** I passi selezionabili dall'alto in basso (l'ordine delle aree di tocco). */
export function passiSelezionabili([min, max]: readonly [number, number] = SELEZIONABILI) {
	return Array.from({ length: max - min + 1 }, (_, i) => max - i);
}
