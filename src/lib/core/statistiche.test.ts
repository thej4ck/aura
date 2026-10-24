import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chiave } from '../../../statistiche/conteggi.mjs';
import { conta, type Eventi } from './statistiche';

const inviati: string[] = [];

beforeEach(() => {
	inviati.length = 0;
	vi.stubEnv('DEV', false);
	vi.stubGlobal('location', { hostname: 'aura.example' });
	vi.stubGlobal('navigator', {
		sendBeacon: (url: string, corpo: string) => {
			expect(url).toBe('/statistiche/evento');
			inviati.push(corpo);
			return true;
		}
	});
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('conta', () => {
	it('ogni evento del sito è accettato dal servizio così com’è', () => {
		const esempi: { [E in keyof Eventi]: Eventi[E] } = {
			inizio: { a: 'musica.canto.eco' },
			scheda: { a: 'musica.canto.eco', s: 3 },
			fine: { a: 'musica.canto.eco', v: 'quasi' },
			scaduta: { a: 'musica.canto.eco', s: 2 },
			'voce-forte': { a: 'musica.canto.eco', s: 2 },
			mic: { v: 'permesso-negato', b: 'Chrome 140, Android' },
			errore: { a: '/musica/canto/eco', v: 'TypeError', b: 'Safari 18, iOS' }
		};
		for (const [e, campi] of Object.entries(esempi)) conta(e as keyof Eventi, campi as never);
		expect(inviati).toHaveLength(7);
		for (const corpo of inviati)
			expect(chiave(JSON.parse(corpo), '2026-10-24'), corpo).not.toBeNull();
	});

	it('niente se il browser chiede di non essere tracciato, in sviluppo o in locale', () => {
		vi.stubGlobal('navigator', { ...navigator, globalPrivacyControl: true });
		conta('inizio', { a: 'musica.canto.eco' });
		vi.stubGlobal('navigator', { ...navigator, globalPrivacyControl: false, doNotTrack: '1' });
		conta('inizio', { a: 'musica.canto.eco' });
		vi.stubGlobal('navigator', { ...navigator, doNotTrack: null });
		vi.stubGlobal('location', { hostname: 'localhost' });
		conta('inizio', { a: 'musica.canto.eco' });
		vi.stubGlobal('location', { hostname: 'aura.example' });
		vi.stubEnv('DEV', true);
		conta('inizio', { a: 'musica.canto.eco' });
		expect(inviati).toHaveLength(0);
	});
});
