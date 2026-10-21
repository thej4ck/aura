// Pausa gentile: dopo circa 15 minuti di uso attivo (scheda visibile) si suggerisce una pausa.
// Il conteggio si azzera dopo 5 minuti di assenza. Pura: il layout la chiama con l'ora e la visibilità.

export const PAUSA_DOPO_MS = 15 * 60_000;
export const AZZERA_DOPO_MS = 5 * 60_000;

export type StatoPausa = {
	/** tempo di uso attivo accumulato */
	attivoMs: number;
	/** ultimo aggiornamento se la scheda è visibile; inizio dell'assenza se è nascosta */
	da: number;
	visibile: boolean;
};

export const statoPausa = (adesso: number, visibile: boolean): StatoPausa => ({
	attivoMs: 0,
	da: adesso,
	visibile
});

/**
 * Nuovo stato all'istante `adesso`, con la scheda `visibile` da qui in poi.
 * Un buco di almeno 5 minuti tra due aggiornamenti a scheda visibile (dispositivo sospeso, timer fermi)
 * conta come assenza.
 */
export function avanzaPausa(s: StatoPausa, adesso: number, visibile: boolean): StatoPausa {
	const trascorso = Math.max(0, adesso - s.da);
	if (s.visibile) {
		const attivoMs = trascorso >= AZZERA_DOPO_MS ? 0 : s.attivoMs + trascorso;
		return { attivoMs, da: adesso, visibile };
	}
	const attivoMs = trascorso >= AZZERA_DOPO_MS ? 0 : s.attivoMs;
	// nascosta e ancora nascosta: l'assenza continua a contare dal suo inizio
	return { attivoMs, da: visibile ? adesso : s.da, visibile };
}

export const suggerisciPausa = (s: StatoPausa) => s.attivoMs >= PAUSA_DOPO_MS;

/** Suggerimento chiuso: il conteggio riparte, e il prossimo arriva dopo altri 15 minuti. */
export const chiudiPausa = (s: StatoPausa): StatoPausa => ({ ...s, attivoMs: 0 });
