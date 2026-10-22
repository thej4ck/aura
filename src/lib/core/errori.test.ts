import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const memoria = new Map<string, string>();
const finto = {
	getItem: (k: string) => memoria.get(k) ?? null,
	setItem: (k: string, v: string) => void memoria.set(k, v)
};

beforeEach(() => {
	memoria.clear();
	vi.resetModules();
	vi.stubGlobal('localStorage', finto);
	vi.stubGlobal('location', { pathname: '/musica/canto' });
});

afterEach(() => vi.unstubAllGlobals());

describe('errori', () => {
	it('registra, tiene solo gli ultimi e sopravvive al ricaricamento', async () => {
		const { registraErrore, ultimiErrori, MAX_ERRORI } = await import('./errori');
		for (let i = 0; i < MAX_ERRORI + 3; i++) registraErrore(new Error(`e${i}`));
		registraErrore('non un Error');
		expect(ultimiErrori()).toHaveLength(MAX_ERRORI);
		expect(ultimiErrori().at(-1)).toMatchObject({
			pagina: '/musica/canto',
			messaggio: 'non un Error'
		});

		vi.resetModules();
		const dopo = await import('./errori');
		expect(dopo.ultimiErrori().map((e) => e.messaggio)).toEqual(
			ultimiErrori().map((e) => e.messaggio)
		);
		expect(dopo.dettagliErrori()).toContain('non un Error');
	});

	it('ignora un localStorage illeggibile o manomesso', async () => {
		memoria.set('aura:errori', '{"non": "una lista"}');
		const { ultimiErrori, registraErrore } = await import('./errori');
		expect(ultimiErrori()).toEqual([]);
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('bloccato');
			},
			setItem: () => {
				throw new Error('bloccato');
			}
		});
		registraErrore(new Error('in memoria'));
		expect(ultimiErrori().map((e) => e.messaggio)).toEqual(['in memoria']);
	});
});
