import { describe, expect, it } from 'vitest';
import type { Dispositivo } from './piattaforma';
import { PROBLEMI_NOTI, type IdProblema } from './problemi-noti';

const BASE: Dispositivo = { apple: false, app: false, webAudio: true, outputLatency: true };
const DISPOSITIVI: Record<string, Dispositivo> = {
	desktopChrome: { ...BASE, browser: 'Chrome', sistema: 'Windows' },
	android: { ...BASE, browser: 'Chrome', sistema: 'Android' },
	androidFirefox: { ...BASE, browser: 'Firefox', sistema: 'Android' },
	firefox: { ...BASE, browser: 'Firefox', sistema: 'Windows' },
	iphoneSafari: { ...BASE, browser: 'Safari', sistema: 'iOS', versioneIos: 18, apple: true },
	iphoneApp: {
		...BASE,
		browser: 'Safari',
		sistema: 'iOS',
		versioneIos: 18,
		apple: true,
		app: true
	},
	iphone16: { ...BASE, browser: 'Safari', sistema: 'iOS', versioneIos: 16, apple: true },
	iphoneIsolamento: {
		...BASE,
		browser: 'Safari',
		sistema: 'iOS',
		versioneIos: 18,
		apple: true,
		webAudio: false,
		outputLatency: false
	},
	ipadFirefox: { ...BASE, browser: 'Firefox', sistema: 'iOS', versioneIos: 18, apple: true },
	macSafari: { ...BASE, browser: 'Safari', sistema: 'macOS', apple: true },
	macSafariVecchio: {
		...BASE,
		browser: 'Safari',
		sistema: 'macOS',
		apple: true,
		outputLatency: false
	},
	macIsolamento: { ...BASE, browser: 'Safari', sistema: 'macOS', apple: true, webAudio: false },
	// nel prerender: nessun navigator, nessuna API
	vuoto: { apple: false, app: false, webAudio: false, outputLatency: false }
};

const applicati = (d: Dispositivo) =>
	(Object.keys(PROBLEMI_NOTI) as IdProblema[]).filter((id) => PROBLEMI_NOTI[id](d));

describe('problemi noti', () => {
	it.each([
		['desktopChrome', []],
		['vuoto', []],
		['android', ['android-voce-italiana']],
		['androidFirefox', ['firefox-persistenza']],
		['firefox', ['firefox-persistenza']],
		[
			'iphoneSafari',
			[
				'ios-microfono',
				'ios-permesso-microfono',
				'safari-dati-7-giorni',
				'app-dati-separati',
				'ios-audio-muto',
				'ios-salvataggio'
			]
		],
		['iphoneApp', ['ios-microfono', 'ios-permesso-microfono', 'ios-audio-muto', 'ios-salvataggio']],
		[
			'iphone16',
			[
				'ios-microfono',
				'ios-permesso-microfono',
				'safari-dati-7-giorni',
				'app-dati-separati',
				'ios-audio-muto',
				'ios16-silenzioso'
			]
		],
		// IndexedDB bloccato dall'isolamento, non dal difetto di iOS 17.4: un avviso solo
		[
			'iphoneIsolamento',
			[
				'ios-microfono',
				'ios-permesso-microfono',
				'safari-dati-7-giorni',
				'app-dati-separati',
				'ios-audio-muto',
				'apple-isolamento'
			]
		],
		// Firefox su iOS è WebKit: niente finestra per la persistenza, e Safari non chiede il permesso per lui
		[
			'ipadFirefox',
			[
				'ios-microfono',
				'safari-dati-7-giorni',
				'app-dati-separati',
				'ios-audio-muto',
				'ios-salvataggio'
			]
		],
		['macSafari', ['safari-dati-7-giorni', 'app-dati-separati']],
		['macSafariVecchio', ['safari-dati-7-giorni', 'app-dati-separati', 'output-latency-assente']],
		['macIsolamento', ['safari-dati-7-giorni', 'app-dati-separati', 'apple-isolamento']]
	])('%s', (nome, attesi) => {
		expect(applicati(DISPOSITIVI[nome])).toEqual(attesi);
	});

	it('ogni testo è una frase non vuota, diversa per Safari e per l’app installata', () => {
		const testi = Object.values(DISPOSITIVI).flatMap((d) =>
			Object.values(PROBLEMI_NOTI).map((p) => p(d))
		);
		for (const t of testi) if (t !== false) expect(t).toMatch(/\S.*\.$/);
		const permesso = PROBLEMI_NOTI['ios-permesso-microfono'];
		expect(permesso(DISPOSITIVI.iphoneSafari)).toMatch(/Consenti/);
		expect(permesso(DISPOSITIVI.iphoneApp)).toMatch(/ogni apertura/);
		expect(PROBLEMI_NOTI['safari-dati-7-giorni'](DISPOSITIVI.macSafari)).toMatch(/^Safari/);
	});
});
