// Segnalazioni su GitHub: l'indirizzo di una issue form precompilata (.github/ISSUE_TEMPLATE).
// Solo dati tecnici, mai dati personali né progressi: l'adulto li vede tutti prima di aprire GitHub.

export const REPO = 'https://github.com/thej4ck/aura';

export const TIPI = ['contenuti', 'tecnico', 'idea'] as const;
export type TipoSegnalazione = (typeof TIPI)[number];

/** le chiavi sono gli id dei campi delle issue form: GitHub li precompila dalla query string */
export type DatiSegnalazione = {
	pagina: string;
	attivita?: string;
	scheda?: string;
	versione: string;
	ambiente: string;
};

export function indirizzoSegnalazione(tipo: TipoSegnalazione, dati: DatiSegnalazione): string {
	const query = new URLSearchParams({ template: `${tipo}.yml` });
	for (const [campo, valore] of Object.entries(dati)) if (valore) query.set(campo, valore);
	return `${REPO}/issues/new?${query}`;
}
