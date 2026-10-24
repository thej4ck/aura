// Statistiche d'uso anonime e aggregate (docs/adr/0007-statistiche-anonime.md): contatori, mai chi.
// Un evento è un nome e pochi campi tecnici (l'id di un'attività, il numero di una scheda, un esito, un
// codice d'errore): il server lo somma al contatore del giorno e non tiene altro. Niente identificativi,
// cookie o storage: due eventi dello stesso bambino non si possono collegare. Non parte niente se il
// browser chiede di non essere tracciato (Global Privacy Control, Do Not Track), né in sviluppo.

export type Eventi = {
	inizio: { a: string };
	scheda: { a: string; s: number };
	fine: { a: string; v: 'superata' | 'quasi' | 'vuota' };
	scaduta: { a: string; s: number };
	'voce-forte': { a: string; s: number };
	mic: { v: string; b: string };
	errore: { a: string; v: string; b: string };
};

/** dove vanno gli eventi: Caddy li passa al servizio (statistiche/), stesso sito */
export const INDIRIZZO_STATISTICHE = '/statistiche/evento';

export function conta<E extends keyof Eventi>(e: E, campi: Eventi[E]): void {
	if (import.meta.env.DEV || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
	const n = navigator as Navigator & { globalPrivacyControl?: boolean };
	if (n.globalPrivacyControl || n.doNotTrack === '1') return;
	// ponytail: in locale (preview, e2e) il servizio non c'è; si prova in tests/statistiche.test.ts
	if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
	try {
		navigator.sendBeacon(INDIRIZZO_STATISTICHE, JSON.stringify({ e, ...campi }));
	} catch {
		// una statistica non deve mai rompere niente
	}
}
