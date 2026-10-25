import { afterEach, describe, expect, it, vi } from 'vitest';
import { ambienteBreve, dispositivo, riconosci } from './piattaforma';

const UA = {
	iphone:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
	iphone16:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
	// da iOS 26 Safari congela «OS 18_6»: la versione vera è quella di Safari
	iphone26:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
	ipadChrome:
		'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
	// Safari su iPad e su Mac: lo stesso user agent, cambia solo il touch
	macSafari:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
	macFirefox:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0',
	android:
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
	windowsChrome:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
	windowsEdge:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
	chromebook:
		'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
	fxios:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/140.0 Mobile/15E148 Safari/605.1.15'
};

describe('riconosci', () => {
	it.each([
		[UA.iphone, 0, { browser: 'Safari', sistema: 'iOS', versioneIos: 18 }],
		[UA.iphone16, 5, { browser: 'Safari', sistema: 'iOS', versioneIos: 16 }],
		[UA.iphone26, 5, { browser: 'Safari', sistema: 'iOS', versioneIos: 26 }],
		[UA.ipadChrome, 5, { browser: 'Chrome', sistema: 'iOS', versioneIos: 18 }],
		[UA.macSafari, 5, { browser: 'Safari', sistema: 'iOS', versioneIos: 17 }], // iPad «Mac»
		[UA.macSafari, 0, { browser: 'Safari', sistema: 'macOS', versioneIos: undefined }],
		[UA.fxios, 5, { browser: 'Firefox', sistema: 'iOS', versioneIos: 17 }],
		[UA.android, 5, { browser: 'Chrome', sistema: 'Android', versioneIos: undefined }],
		[UA.windowsChrome, 0, { browser: 'Chrome', sistema: 'Windows', versioneIos: undefined }]
	])('%s (%i tocchi)', (ua, tocchi, atteso) => {
		expect(riconosci(ua, tocchi)).toMatchObject(atteso);
	});
});

describe('dispositivo', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('legge navigator solo quando lo si chiama, e senza navigator torna un dispositivo vuoto', () => {
		vi.stubGlobal('navigator', undefined);
		expect(dispositivo()).toMatchObject({ sistema: undefined, apple: false, app: false });
	});

	it('l’iPad che si presenta come Mac è iOS, il Mac no', () => {
		vi.stubGlobal('navigator', { userAgent: UA.macSafari, maxTouchPoints: 5 });
		expect(dispositivo()).toMatchObject({ sistema: 'iOS', apple: true });
		vi.stubGlobal('navigator', { userAgent: UA.macSafari, maxTouchPoints: 0 });
		expect(dispositivo()).toMatchObject({ sistema: 'macOS', apple: true });
		vi.stubGlobal('navigator', { userAgent: UA.macFirefox, maxTouchPoints: 0 });
		expect(dispositivo()).toMatchObject({ sistema: 'macOS', apple: false });
	});

	it('app installata e API audio dalle funzioni del browser, non dallo user agent', () => {
		vi.stubGlobal('navigator', { userAgent: UA.iphone, maxTouchPoints: 5, standalone: true });
		vi.stubGlobal('AudioContext', class {});
		expect(dispositivo()).toMatchObject({ app: true, webAudio: true, outputLatency: false });
		vi.stubGlobal('navigator', { userAgent: UA.android, maxTouchPoints: 5 });
		vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(display-mode: standalone)' }));
		// outputLatency è un attributo del prototipo, come nei browser
		vi.stubGlobal(
			'AudioContext',
			class {
				get outputLatency() {
					return 0;
				}
			}
		);
		expect(dispositivo()).toMatchObject({ app: true, webAudio: true, outputLatency: true });
	});
});

describe('ambienteBreve', () => {
	it.each([
		[UA.windowsEdge, 0, 'Edge 140, Windows'],
		[UA.android, 5, 'Chrome 140, Android'],
		[UA.iphone, 5, 'Safari 18, iOS'],
		[UA.ipadChrome, 5, 'Chrome 140, iOS'],
		[UA.macSafari, 5, 'Safari 17, iOS'],
		[UA.macSafari, 0, 'Safari 17, macOS'],
		[UA.macFirefox, 0, 'Firefox 140, macOS'],
		[UA.chromebook, 0, 'Chrome 140, ChromeOS'],
		['qualcosa di strano', 0, '?, ?']
	])('%s (%i tocchi)', (userAgent, maxTouchPoints, atteso) => {
		expect(ambienteBreve({ userAgent, maxTouchPoints })).toBe(atteso);
	});
});
