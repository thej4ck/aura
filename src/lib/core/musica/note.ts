// Teoria musicale pura: altezze in notazione scientifica ('C4', 'F#4', 'Bb3') ↔ midi, frequenze,
// nomi delle note, grafia per tonalità maggiore, intervalli, scale e arpeggi.
// Convenzioni: Do centrale = C4 = midi 60, La4 = midi 69 = 440 Hz. Niente doppie alterazioni (come lo schema).
import { ALTEZZA } from '#lib/core/contenuti/schema.ts';
import type { Preferenze } from '#lib/core/store/schema-progressi.ts';
import { m } from '#lib/paraglide/messages.js';

export const LETTERE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Lettera = (typeof LETTERE)[number];
/** -1 bemolle, 0 naturale, +1 diesis */
export type Alterazione = -1 | 0 | 1;
export type Scomposta = { lettera: Lettera; alterazione: Alterazione; ottava: number };
export type NomiNote = Preferenze['nomiNote'];
/** come scrivere i tasti neri fuori da una tonalità */
export type Grafia = 'diesis' | 'bemolle';

/** semitoni sopra il Do di ciascuna lettera naturale */
const SEMITONI: Record<Lettera, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SIMBOLO: Record<Alterazione, string> = { [-1]: '♭', 0: '', 1: '♯' };
const PAROLA: Record<Alterazione, string> = { [-1]: 'bemolle', 0: 'naturale', 1: 'diesis' };

/** 'F#4' → {lettera: 'F', alterazione: 1, ottava: 4}. RangeError se non è un'altezza dello schema. */
export function scomponi(altezza: string): Scomposta {
	if (!ALTEZZA.test(altezza)) throw new RangeError(`altezza non valida: "${altezza}"`);
	const segno = altezza.length === 3 ? altezza[1] : '';
	return {
		lettera: altezza[0] as Lettera,
		alterazione: segno === '#' ? 1 : segno === 'b' ? -1 : 0,
		ottava: Number(altezza.at(-1))
	};
}

/** Inverso di `scomponi`. RangeError fuori dal modello (ottave 0-8). */
export function componi({ lettera, alterazione, ottava }: Scomposta): string {
	const s = `${lettera}${alterazione === 1 ? '#' : alterazione === -1 ? 'b' : ''}${ottava}`;
	if (!ALTEZZA.test(s)) throw new RangeError(`altezza fuori dal modello: "${s}"`);
	return s;
}

export function midi(altezza: string): number {
	const { lettera, alterazione, ottava } = scomponi(altezza);
	return 12 * (ottava + 1) + SEMITONI[lettera] + alterazione;
}

/** Classe d'altezza 0-11 (0 = Do), anche per midi negativi. */
export const classe = (midi: number) => ((midi % 12) + 12) % 12;

/** Armatura della tonalità maggiore (+ diesis, − bemolle) per classe d'altezza della tonica:
 *  Do 0, Re♭ 5♭, Re 2♯, Mi♭ 3♭, Mi 4♯, Fa 1♭, Fa♯ 6♯, Sol 1♯, La♭ 4♭, La 3♯, Si♭ 2♭, Si 5♯. */
export const ARMATURE_MAGGIORI = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5] as const;
const ORDINE_DIESIS: readonly Lettera[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];

export const armaturaMaggiore = (tonica: number) => ARMATURE_MAGGIORI[classe(tonica)];

/** Alterazione di ogni lettera con l'armatura data (-7…7). */
export function alterazioniArmatura(armatura: number): Record<Lettera, Alterazione> {
	if (!Number.isInteger(armatura) || Math.abs(armatura) > 7) {
		throw new RangeError(`armatura non valida: ${armatura}`);
	}
	const ordine = armatura >= 0 ? ORDINE_DIESIS : ORDINE_DIESIS.toReversed();
	const segno: Alterazione = armatura >= 0 ? 1 : -1;
	const alt = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 } as Record<Lettera, Alterazione>;
	for (const l of ordine.slice(0, Math.abs(armatura))) alt[l] = segno;
	return alt;
}

function scrivi(midi: number, lettera: Lettera, alterazione: Alterazione): string {
	return componi({
		lettera,
		alterazione,
		ottava: (midi - alterazione - SEMITONI[lettera]) / 12 - 1
	});
}

/**
 * Grafia di un midi: prima le note della tonalità (come le scrive l'armatura), poi le naturali,
 * infine i tasti neri con diesis o bemolle secondo `grafia`.
 */
function grafiaMidi(midi: number, armatura: number, grafia: Grafia): string {
	const c = classe(midi);
	const alt = alterazioniArmatura(armatura);
	const inScala = LETTERE.find((l) => classe(SEMITONI[l] + alt[l]) === c);
	if (inScala) return scrivi(midi, inScala, alt[inScala]);
	const naturale = LETTERE.find((l) => SEMITONI[l] === c);
	if (naturale) return scrivi(midi, naturale, 0);
	const d = grafia === 'diesis' ? 1 : -1;
	return scrivi(
		midi,
		LETTERE.find((l) => SEMITONI[l] === c - d)!,
		d
	);
}

/** 61 → 'C#4' (o 'Db4' con grafia 'bemolle'). */
export const altezza = (midi: number, g: Grafia = 'diesis') => grafiaMidi(midi, 0, g);

/** Grafia nella tonalità con l'armatura data: le note estranee prendono diesis o bemolle come l'armatura. */
export const altezzaInTonalita = (midi: number, armatura: number) =>
	grafiaMidi(midi, armatura, armatura < 0 ? 'bemolle' : 'diesis');

const nomeBase = (lettera: Lettera, nomi: NomiNote) =>
	nomi === 'solfeggio' ? m.notazione_solfeggio({ lettera }) : lettera;

/** Nome da mostrare, senza ottava: 'F#4' → 'Fa♯' (solfeggio) o 'F♯' (lettere). */
export function nomeNota(altezza: string, nomi: NomiNote = 'solfeggio'): string {
	const { lettera, alterazione } = scomponi(altezza);
	return nomeBase(lettera, nomi) + SIMBOLO[alterazione];
}

/** Nome per i lettori di schermo e la voce: 'F#4' → 'Fa diesis'. */
export function nomeNotaParlato(altezza: string, nomi: NomiNote = 'solfeggio'): string {
	const { lettera, alterazione } = scomponi(altezza);
	return m.notazione_nome_parlato({
		nome: nomeBase(lettera, nomi),
		alterazione: PAROLA[alterazione]
	});
}

/** Nome dell'intervallo in semitoni (0 = prima … 12 = ottava); oltre l'ottava, i semitoni. */
export const nomeIntervallo = (semitoni: number) =>
	m.notazione_intervallo({ semitoni: Math.abs(semitoni) });

export const SCALA_MAGGIORE = [0, 2, 4, 5, 7, 9, 11, 12] as const;
export const ARPEGGIO_MAGGIORE = [0, 4, 7, 4, 0] as const;

/** Scala maggiore ascendente dalla tonica all'ottava, scritta nella sua tonalità. */
export function scalaMaggiore(tonica: number): string[] {
	const a = armaturaMaggiore(tonica);
	return SCALA_MAGGIORE.map((s) => altezzaInTonalita(tonica + s, a));
}

/** Arpeggio maggiore [0, 4, 7, 4, 0] dalla radice: Re → D-F#-A-F#-D, Mi♭ → Eb-G-Bb-G-Eb. */
export function arpeggioMaggiore(radice: number): string[] {
	const a = armaturaMaggiore(radice);
	return ARPEGGIO_MAGGIORE.map((s) => altezzaInTonalita(radice + s, a));
}

/** Tutti i semitoni da `da` ad `a` compresi: con i diesis salendo, con i bemolle scendendo. */
export function scalaCromatica(da: number, a: number): string[] {
	const passo = a >= da ? 1 : -1;
	const g: Grafia = passo > 0 ? 'diesis' : 'bemolle';
	return Array.from({ length: Math.abs(a - da) + 1 }, (_, i) => altezza(da + i * passo, g));
}
