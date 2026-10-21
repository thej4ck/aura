import { describe, expect, it } from 'vitest';
import { scegliStrategia } from './strategia.ts';

const O = 'https://k.example';
const r = (url: string, method = 'GET') => ({ method, url });

describe('scegliStrategia', () => {
	it('ignora ciò che non è GET same-origin', () => {
		expect(scegliStrategia(r(`${O}/moduli`, 'POST'), O)).toBe('ignora');
		expect(scegliStrategia(r('https://altro.example/x.js'), O)).toBe('ignora');
	});
	it('ignora /dev e il service worker, ma non percorsi simili', () => {
		expect(scegliStrategia(r(`${O}/dev`), O)).toBe('ignora');
		expect(scegliStrategia(r(`${O}/dev/vetrina`), O)).toBe('ignora');
		expect(scegliStrategia(r(`${O}/service-worker.js`), O)).toBe('ignora');
		expect(scegliStrategia(r(`${O}/devoti`), O)).toBe('rete-prima');
	});
	it('cache-prima per i file con hash', () => {
		expect(scegliStrategia(r(`${O}/_app/immutable/chunks/a.js`), O)).toBe('cache-prima');
	});
	it('rete-prima per pagine, manifest e 404', () => {
		expect(scegliStrategia(r(`${O}/moduli`), O)).toBe('rete-prima');
		expect(scegliStrategia(r(`${O}/manifest.webmanifest`), O)).toBe('rete-prima');
		expect(scegliStrategia(r(`${O}/non-esiste`), O)).toBe('rete-prima');
	});
});
