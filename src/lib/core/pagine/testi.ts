// Etichette condivise dalle pagine: stati, livelli, fasce d'età.
import { m } from '#lib/paraglide/messages.js';
import type { LIVELLI } from '../padronanza';
import type { StatoAttivita, StatoAvanzamento } from '../store/schema-progressi';

/** Stato di un modulo o di un'area. */
export const NOMI_STATO: Record<StatoAvanzamento, () => string> = {
	da_iniziare: m.vista_stato_da_iniziare,
	in_corso: m.vista_stato_in_corso,
	completato: m.vista_stato_completato
};

/** Stato di un'attività in un percorso. */
export const NOMI_TAPPA: Record<StatoAttivita, () => string> = {
	nuova: m.percorso_nuova,
	in_corso: m.percorso_in_corso,
	completata: m.percorso_completata
};

/** Nome del livello di padronanza, per indice 0-4. */
export const NOMI_LIVELLO: Record<(typeof LIVELLI)[number], () => string> = {
	nuova: m.genitori_livello_nuova,
	tentata: m.genitori_livello_tentata,
	familiare: m.genitori_livello_familiare,
	competente: m.genitori_livello_competente,
	padronanza: m.genitori_livello_padronanza
};

export const etichettaEta = ([min, max]: readonly [number, number]) =>
	min === max ? m.vista_eta_una({ eta: min }) : m.vista_eta({ min, max });
