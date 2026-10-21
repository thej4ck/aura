import { aggiungiGiorni, giorno } from './giorno';
import type { RecordAttivita, RecordCompetenza } from './store/schema-progressi';

/** Nomi dei livelli di padronanza, per indice 0-4. */
export const LIVELLI = ['nuova', 'tentata', 'familiare', 'competente', 'padronanza'] as const;
export type Livello = 0 | 1 | 2 | 3 | 4;
/** Giorni al prossimo ripasso per livello (1-4). */
export const INTERVALLI_RIPASSO = { 1: 1, 2: 3, 3: 7, 4: 14 } as const;

export type Esito = {
	superata: boolean;
	errori: number;
	/**
	 * Risposte valutate nella fase "prova". 0 = niente da misurare (attività senza verifica):
	 * l'attività si completa con una stella e le competenze non cambiano. Assente = non noto, come se ce ne fossero.
	 */
	risposte?: number;
};

/**
 * Nuovo stato di una competenza dopo una verifica. Pura.
 * Non superata: livello almeno 1, scende di 1 al massimo (solo da 2 in su), ripasso domani.
 * Superata: sale di 1; il 4 arriva solo con un successo in un giorno diverso da quello in cui si è arrivati al 3.
 */
export function aggiornaCompetenza(
	prev: RecordCompetenza | undefined,
	{ superata }: Esito,
	oggi: Date
): RecordCompetenza {
	const g = giorno(oggi);
	const prima = (prev?.livello ?? 0) as Livello;
	let livello: Livello;
	if (!superata) livello = Math.max(1, prima - 1) as Livello;
	else if (prima === 3) livello = prev?.livelloDal === g ? 3 : 4;
	else livello = Math.min(4, prima + 1) as Livello;
	return {
		livello,
		prossimoRipasso: aggiungiGiorni(g, superata ? INTERVALLI_RIPASSO[livello as 1 | 2 | 3 | 4] : 1),
		livelloDal: livello === prima && prev?.livelloDal ? prev.livelloDal : g,
		aggiornato: oggi.toISOString()
	};
}

/**
 * Stelle dopo una verifica. Pura. ★ superata, ★★ superata con al massimo 1 errore,
 * ★★★ superata in un giorno diverso dal primo completamento. Non diminuiscono mai.
 * Senza risposte da valutare (`risposte: 0`) si arriva al massimo a ★: arrivare in fondo non misura niente.
 */
export function calcolaStelle(
	prev: RecordAttivita | undefined,
	{ superata, errori, risposte }: Esito,
	oggi: Date
): number {
	const prima = prev?.stelle ?? 0;
	if (!superata) return prima;
	if (risposte === 0) return Math.max(prima, 1);
	const altroGiorno = prev?.primaVolta !== undefined && prev.primaVolta !== giorno(oggi);
	return Math.max(prima, altroGiorno ? 3 : errori <= 1 ? 2 : 1);
}
