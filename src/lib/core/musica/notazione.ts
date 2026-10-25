// Geometria pura del pentagramma. Il "passo" è la posizione verticale in mezzi spazi dalla prima linea
// in basso: 0 = prima linea, 1 = primo spazio, … 8 = quinta linea; pari = linee, dispari = spazi;
// sotto lo 0 e sopra l'8 ci sono i tagli addizionali (-2, 10, …) e gli spazi tra loro.
import type { Durata, Rigo } from '#lib/core/contenuti/schema.ts';
import { m } from '#lib/paraglide/messages.js';
import type { GLIFI } from './glifi.ts';
import { LETTERE, alterazioniArmatura, componi, scomponi, type Alterazione } from './note.ts';
import { durataBattiti, inizi, type NotaRitmica, type Sillaba } from './ritmo.ts';

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

const SEGNI: Record<Alterazione, Segno> = { 1: 'diesis', [-1]: 'bemolle', 0: 'bequadro' };

/**
 * Alterazioni da scrivere accanto alle note di un rigo, in ordine. Il rigo non ha stanghette, quindi è
 * una sola battuta: un'alterazione vale per la stessa nota (lettera e ottava) fino alla fine, e quando
 * cambia serve il segno, anche il bequadro che la annulla. In più ogni nota fuori dall'armatura ha
 * sempre il suo segno: il rigo si legge giusto anche da chi guarda le note una alla volta.
 */
export function segniDaMostrare(altezze: readonly string[], armatura = 0): (Segno | undefined)[] {
	const inChiave = alterazioniArmatura(armatura);
	const inVigore = new Map<string, Alterazione>();
	return altezze.map((a) => {
		const { lettera, alterazione, ottava } = scomponi(a);
		const nota = `${lettera}${ottava}`;
		const prima = inVigore.get(nota) ?? inChiave[lettera];
		inVigore.set(nota, alterazione);
		return alterazione === prima && alterazione === inChiave[lettera]
			? undefined
			: SEGNI[alterazione];
	});
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

/** Il testo visibile di una sillaba ritmica (musica/ritmo.ts, sillaba). */
export const TESTI_SILLABE: Record<Sillaba, () => string> = {
	ta: m.notazione_sillaba_ta,
	ti: m.notazione_sillaba_ti,
	'ta-a': m.notazione_sillaba_ta_a,
	'ta-a-a': m.notazione_sillaba_ta_a_a,
	'ta-a-a-a': m.notazione_sillaba_ta_a_a_a,
	sst: m.notazione_sillaba_sst
};

// --- Ritmo: figure, gambi, travature e spaziatura (ADR 0008) ------------------------------------

/** Gambo in su (a destra della testa) sotto la terza linea, in giù (a sinistra) dalla terza in su. */
export const direzioneGambo = (passo: number, ritmico = false): 'su' | 'giu' =>
	ritmico || passo < 4 ? 'su' : 'giu';

const croma = (n: NotaRitmica) => n.durata === '8' && !n.punto && !n.pausa;

/**
 * Le coppie di crome da unire con la travatura: due crome di fila (niente pause) che cominciano su un
 * battito, quindi stanno dentro quel battito. 'ti ta ti' non ne ha: le crome sono isolate, con la codetta.
 */
export function travature(note: readonly NotaRitmica[]): [number, number][] {
	const t = inizi(note);
	const coppie: [number, number][] = [];
	for (let i = 0; i + 1 < note.length; i++) {
		if (Number.isInteger(t[i]) && croma(note[i]) && croma(note[i + 1])) {
			coppie.push([i, i + 1]);
			i++;
		}
	}
	return coppie;
}

/**
 * Larghezza relativa della colonna di ogni nota: cresce con la durata (1 + log2 delle crome: croma 1,
 * semiminima 2, minima 3, semibreve 4), divisa per quella della nota più corta, che vale 1. Senza durate
 * (o con figure tutte uguali) sono tutte 1: le note equidistanti di sempre.
 */
export function spaziature(note: readonly NotaRitmica[]): number[] {
	if (!note.some((n) => n.durata)) return note.map(() => 1);
	const pesi = note.map((n) => Math.max(1, 1 + Math.log2(durataBattiti(n) * 2)));
	const minimo = Math.min(...pesi);
	return pesi.map((p) => p / minimo);
}

/**
 * La x di un istante del rigo (in battiti dall'inizio), per posare i segni dei battiti: interpola tra i
 * centri delle note (la nota i comincia a `inizi[i]` e sta in `centri[i]`) e, se c'è, la fine del rigo
 * `[battito, x]`; prima della prima nota e dopo l'ultimo punto estrapola con il primo o l'ultimo tratto.
 */
export function xDaBattito(
	battito: number,
	inizi: readonly number[],
	centri: readonly number[],
	fine?: readonly [number, number]
): number {
	const punti: (readonly [number, number])[] = inizi.map((b, i) => [b, centri[i]]);
	if (fine) punti.push(fine);
	if (punti.length < 2) return punti[0]?.[1] ?? 0;
	let k = 0;
	while (k + 2 < punti.length && battito > punti[k + 1][0]) k++;
	const [[b0, x0], [b1, x1]] = [punti[k], punti[k + 1]];
	return x0 + ((battito - b0) * (x1 - x0)) / (b1 - b0);
}

type NomeGlifo = keyof typeof GLIFI;
const PAUSE: Record<Durata, NomeGlifo> = {
	'1': 'pausaSemibreve',
	'2': 'pausaMinima',
	'4': 'pausaSemiminima',
	'8': 'pausaCroma',
	'16': 'pausaSemicroma'
};

/** Il glifo della pausa lunga `durata`. */
export const glifoPausa = (durata: Durata): NomeGlifo => PAUSE[durata];

/** La testa di una nota: vuota la minima, semibreve la semibreve, piena le altre e le note senza durata. */
export const glifoTesta = (n: NotaRitmica): NomeGlifo =>
	n.durata === '1' ? 'testaSemibreve' : n.durata === '2' ? 'testaVuota' : 'testaPiena';

/** Nome della figura per i lettori di schermo: «semiminima», «minima puntata», «pausa di croma». */
export function nomeFigura(n: NotaRitmica): string {
	const nome = m.notazione_figura({ durata: n.durata ?? '4' });
	const puntata = n.punto ? m.notazione_puntata({ figura: nome }) : nome;
	return n.pausa ? m.notazione_pausa_di({ figura: puntata }) : puntata;
}
