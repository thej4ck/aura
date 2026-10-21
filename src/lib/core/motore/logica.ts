// Logica pura del motore delle attività: avanzamento delle schede e verifica.
import type { AttivitaCatalogo } from '../contenuti/registry';
import type { Fase } from '../contenuti/schema';
import type { Esito } from '../padronanza';
import type { ProssimoPasso } from '../percorso';

/** Rapporto minimo corretti/totali nella fase di verifica per superarla. */
export const SOGLIA_SUPERATA = 0.8;
/** L'unica fase che conta per la padronanza (Scopri → Proviamo insieme → Prova tu). */
export const FASE_VERIFICA: Fase = 'prova';

type ConFase = { readonly fase: Fase };

/** Un esito emesso da un widget, con l'indice della scheda che l'ha prodotto. */
export type EsitoRegistrato = { scheda: number; corretto: boolean; item?: string };

export type AvanzamentoSchede = {
	indice: number;
	totale: number;
	fase: Fase;
	prima: boolean;
	ultima: boolean;
};

/** Indice valido per `totale` schede (un salvataggio vecchio può puntare oltre la fine). */
export const limitaIndice = (indice: number, totale: number): number =>
	Math.min(Math.max(0, Math.trunc(indice) || 0), Math.max(0, totale - 1));

export function avanzamentoSchede(schede: readonly ConFase[], indice: number): AvanzamentoSchede {
	const i = limitaIndice(indice, schede.length);
	return {
		indice: i,
		totale: schede.length,
		fase: schede[i].fase,
		prima: i === 0,
		ultima: i === schede.length - 1
	};
}

/** Schede consecutive della stessa fase, per l'indicatore di avanzamento. */
export function gruppiFase(schede: readonly ConFase[]): { fase: Fase; indici: number[] }[] {
	const gruppi: { fase: Fase; indici: number[] }[] = [];
	schede.forEach((s, i) => {
		const ultimo = gruppi.at(-1);
		if (ultimo?.fase === s.fase) ultimo.indici.push(i);
		else gruppi.push({ fase: s.fase, indici: [i] });
	});
	return gruppi;
}

/** Esiti della sola fase di verifica. */
export function conteggioProva(
	schede: readonly ConFase[],
	esiti: readonly EsitoRegistrato[]
): { corretti: number; totali: number } {
	const prova = esiti.filter((e) => schede[e.scheda]?.fase === FASE_VERIFICA);
	return { corretti: prova.filter((e) => e.corretto).length, totali: prova.length };
}

/**
 * Esito della verifica, a fine attività: superata se corretti/totali ≥ SOGLIA_SUPERATA nella fase "prova".
 * Senza esiti di prova (nessuna scheda prova, o schede che non valutano) è superata arrivando in fondo.
 */
export function valutaVerifica(
	schede: readonly ConFase[],
	esiti: readonly EsitoRegistrato[]
): Esito {
	const { corretti, totali } = conteggioProva(schede, esiti);
	return {
		superata: totali === 0 || corretti / totali >= SOGLIA_SUPERATA,
		errori: totali - corretti
	};
}

/** Da dove riprovare dopo una verifica non superata: la prima scheda "prova" (o l'inizio). */
export const primaSchedaProva = (schede: readonly ConFase[]): number =>
	Math.max(
		0,
		schede.findIndex((s) => s.fase === FASE_VERIFICA)
	);

/** Il suggerimento da mostrare nel riepilogo: riprendi, poi prossimo, poi ripasso; mai l'attività appena fatta. */
export const suggerisci = (passo: ProssimoPasso, escludi: string): AttivitaCatalogo | undefined =>
	[passo.riprendi?.attivita, passo.prossimo, ...passo.ripassi].find((a) => a && a.id !== escludi);
