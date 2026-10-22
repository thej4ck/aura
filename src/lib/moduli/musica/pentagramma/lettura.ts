// Logica pura dei giochi di lettura: scatole di Leitner per nota, estrazione pesata, sblocco delle note,
// serie di item estratte con seed. Le scatole si salvano in dati['musica.pentagramma'].leitner.
import * as v from 'valibot';
import { mescola, sceltaPesata, type Casuale } from '#lib/core/casuale.ts';
import { scomponi, type Lettera } from '#lib/core/musica/note.ts';
import { passo } from '#lib/core/musica/notazione.ts';

/**
 * Ordine in cui arrivano le note di "Che nota è?": prima le linee Mi Sol Si (poi Re Fa), poi gli spazi,
 * poi le note fuori dal rigo. In chiave di violino.
 */
export const ORDINE_NOTE = [
	'E4',
	'G4',
	'B4',
	'D5',
	'F5',
	'F4',
	'A4',
	'C5',
	'E5',
	'C4',
	'D4',
	'G5',
	'A5',
	'B5'
] as const;
export const NOTE_INIZIALI = 3;
/** risposte giuste di fila (al primo tentativo) per sbloccare una nota nuova */
export const SERIE_SBLOCCO = 8;
export const SCATOLE = 5;
/** peso di estrazione per scatola: le note della scatola 1 (da ripassare) escono 16 volte più della 5 */
const PESI = [0, 16, 8, 4, 2, 1];

/** nota → scatola (1 = da ripassare spesso, 5 = sicura). Le note presenti sono quelle sbloccate. */
export type Leitner = Record<string, number>;
export type StatoLettura = { leitner: Leitner; serie: number };

const SchemaScatola = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(SCATOLE));
const SchemaLeitner = v.record(v.string(), v.unknown());

/** Le scatole salvate, ripulite: solo note del gioco e scatole valide; le prime tre ci sono sempre. */
export function leggiLeitner(salvato: unknown): Leitner {
	const grezzo = v.safeParse(SchemaLeitner, salvato);
	const leitner: Leitner = {};
	for (const [i, nota] of ORDINE_NOTE.entries()) {
		const scatola = grezzo.success ? v.safeParse(SchemaScatola, grezzo.output[nota]) : undefined;
		if (scatola?.success) leitner[nota] = scatola.output;
		else if (i < NOTE_INIZIALI) leitner[nota] = 1;
	}
	return leitner;
}

/** Note sbloccate, nell'ordine del gioco. */
export const sbloccate = (leitner: Leitner): string[] => ORDINE_NOTE.filter((n) => n in leitner);

/** La prossima nota da sbloccare, se ne restano. */
export const prossimaDaSbloccare = (leitner: Leitner): string | undefined =>
	ORDINE_NOTE.find((n) => !(n in leitner));

/** Estrae la prossima nota, pesata per scatola; mai la stessa due volte di fila (se ce n'è un'altra). */
export function estrai(leitner: Leitner, r: Casuale, precedente?: string): string {
	const tutte = sbloccate(leitner);
	const voci = tutte.length > 1 ? tutte.filter((n) => n !== precedente) : tutte;
	return sceltaPesata(voci, (n) => PESI[leitner[n]] ?? PESI[1], r);
}

/**
 * Una risposta al primo tentativo: giusta → la nota sale di scatola, sbagliata → torna nella prima.
 * Dopo SERIE_SBLOCCO giuste di fila arriva una nota nuova (scatola 1) e la serie riparte.
 */
export function rispondi(
	stato: StatoLettura,
	nota: string,
	corretto: boolean
): StatoLettura & { sbloccata?: string } {
	const scatola = stato.leitner[nota] ?? 1;
	const leitner = { ...stato.leitner, [nota]: corretto ? Math.min(SCATOLE, scatola + 1) : 1 };
	const serie = corretto ? stato.serie + 1 : 0;
	const nuova = serie >= SERIE_SBLOCCO ? prossimaDaSbloccare(leitner) : undefined;
	if (!nuova) return { leitner, serie };
	return { leitner: { ...leitner, [nuova]: 1 }, serie: 0, sbloccata: nuova };
}

/**
 * Una serie di `quante` note dal mazzo, mescolate con il seed: ogni nota una volta per giro del mazzo,
 * mai la stessa due volte di fila.
 */
export function serie(mazzo: readonly string[], quante: number, r: Casuale): string[] {
	const out: string[] = [];
	while (out.length < quante) {
		let giro = mescola(mazzo, r);
		if (giro.length > 1 && giro[0] === out.at(-1)) giro = [...giro.slice(1), giro[0]];
		out.push(...giro);
	}
	return out.slice(0, quante);
}

/**
 * Dove sta la nota con questa lettera più vicina all'altezza data, tra le note del gioco: per dire
 * "il Mi sta sulla prima linea" a chi ha risposto Mi.
 */
export function vicina(lettera: Lettera, altezza: string): string {
	const p = passo(altezza);
	const candidate = ORDINE_NOTE.filter((n) => scomponi(n).lettera === lettera);
	return candidate.reduce((a, b) => (Math.abs(passo(b) - p) < Math.abs(passo(a) - p) ? b : a));
}

/**
 * "Più in alto" o "più in basso" rispetto alle altre note del mazzo con la stessa lettera, per dire
 * quale toccare. Il mazzo ha al massimo due note per lettera (C4–B5).
 */
export function registro(altezza: string, mazzo: readonly string[]): 'alto' | 'basso' | undefined {
	const { lettera } = scomponi(altezza);
	const stesse = mazzo.filter((n) => scomponi(n).lettera === lettera && n !== altezza);
	if (!stesse.length) return;
	return stesse.every((n) => passo(n) < passo(altezza)) ? 'alto' : 'basso';
}
