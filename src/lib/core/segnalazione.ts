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

// l'ordine conta: Edge e Opera si dichiarano anche Chrome, Chrome anche Safari
const BROWSER: [RegExp, string][] = [
	[/Edg(?:A|iOS)?\/(\d+)/, 'Edge'],
	[/OPR\/(\d+)/, 'Opera'],
	[/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
	[/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox'],
	[/(?:Chrome|CriOS)\/(\d+)/, 'Chrome'],
	[/Version\/(\d+).*Safari/, 'Safari']
];
const SISTEMI: [RegExp, string][] = [
	[/iPhone|iPad|iPod/, 'iOS'],
	[/Android/, 'Android'],
	[/CrOS/, 'ChromeOS'],
	[/Windows/, 'Windows'],
	[/Mac OS X/, 'macOS'],
	[/Linux/, 'Linux']
];

/** «Chrome 140, Android»: nome e versione principale, niente build né modello del dispositivo */
export function ambienteBreve(userAgent: string): string {
	const browser = BROWSER.flatMap(([re, nome]) => {
		const trovato = re.exec(userAgent);
		return trovato ? [`${nome} ${trovato[1]}`] : [];
	})[0];
	const sistema = SISTEMI.find(([re]) => re.test(userAgent))?.[1];
	return [browser ?? '?', sistema ?? '?'].join(', ');
}
