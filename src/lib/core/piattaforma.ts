// Il dispositivo che apre Aura, riconosciuto in un solo posto: per i problemi noti (problemi-noti.ts), le
// segnalazioni e le statistiche. Si legge navigator solo quando si chiama una funzione, mai all'import
// (SSR e prerender). Quando un'API descrive il problema meglio dello user agent, si guarda l'API.

// l'ordine conta: Edge e Opera si dichiarano anche Chrome, Chrome anche Safari
const BROWSER = [
	[/Edg(?:A|iOS)?\/(\d+)/, 'Edge'],
	[/OPR\/(\d+)/, 'Opera'],
	[/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
	[/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox'],
	[/(?:Chrome|CriOS)\/(\d+)/, 'Chrome'],
	[/Version\/(\d+).*Safari/, 'Safari']
] as const;
const SISTEMI = [
	[/iPhone|iPad|iPod/, 'iOS'],
	[/Android/, 'Android'],
	[/CrOS/, 'ChromeOS'],
	[/Windows/, 'Windows'],
	[/Mac OS X/, 'macOS'],
	[/Linux/, 'Linux']
] as const;

export type Browser = (typeof BROWSER)[number][1];
export type Sistema = (typeof SISTEMI)[number][1];

export type Ambiente = {
	browser?: Browser;
	/** versione principale del browser */
	versione?: number;
	/** iOS vale per iPhone, iPad e iPod: lì ogni browser è WebKit */
	sistema?: Sistema;
	/** versione principale di iOS, quando lo user agent la dice */
	versioneIos?: number;
};

/**
 * Browser e sistema dallo user agent. `tocchi` è navigator.maxTouchPoints: l'iPad (da iPadOS 13) si
 * presenta come un Mac, ma un Mac non ha il touch.
 */
export function riconosci(ua: string, tocchi = 0): Ambiente {
	const trovato = BROWSER.map(([re, nome]) => [re.exec(ua), nome] as const).find(([t]) => t);
	const browser = trovato?.[1];
	const versione = trovato ? Number(trovato[0]![1]) : undefined;
	const ipad = /Macintosh/.test(ua) && tocchi > 1;
	const sistema = ipad ? 'iOS' : SISTEMI.find(([re]) => re.test(ua))?.[1];
	// Safari ha la versione di iOS; da iOS 26 il suo «OS 18_6» è congelato, gli altri browser hanno solo quello
	const os = /OS (\d+)_/.exec(ua)?.[1];
	const versioneIos =
		sistema !== 'iOS' ? undefined : browser === 'Safari' ? versione : os ? Number(os) : undefined;
	return { browser, versione, sistema, versioneIos };
}

export type Dispositivo = Ambiente & {
	/** WebKit di Apple con le sue regole (ITP, Modalità di isolamento): iOS, oppure Safari su Mac */
	apple: boolean;
	/** aperto come app installata (schermata Home, Dock, finestra a sé) */
	app: boolean;
	webAudio: boolean;
	/** AudioContext dichiara il ritardo dell'uscita (Safari solo dalla 18.4) */
	outputLatency: boolean;
};

/** Il dispositivo corrente: da chiamare nel browser (nel prerender non c'è navigator, e torna un dispositivo vuoto). */
export function dispositivo(): Dispositivo {
	const n = globalThis.navigator as (Navigator & { standalone?: boolean }) | undefined;
	const a = riconosci(n?.userAgent ?? '', n?.maxTouchPoints);
	const AC = globalThis.AudioContext;
	return {
		...a,
		apple: a.sistema === 'iOS' || (a.sistema === 'macOS' && a.browser === 'Safari'),
		app: !!globalThis.matchMedia?.('(display-mode: standalone)').matches || n?.standalone === true,
		webAudio: !!AC,
		outputLatency: !!AC && 'outputLatency' in AC.prototype
	};
}

/** «Chrome 140, Android»: nome e versione principale, niente build né modello del dispositivo */
export function ambienteBreve(
	n: { userAgent: string; maxTouchPoints?: number } | undefined = globalThis.navigator
): string {
	const a = riconosci(n?.userAgent ?? '', n?.maxTouchPoints);
	return [a.browser ? `${a.browser} ${a.versione}` : '?', a.sistema ?? '?'].join(', ');
}
