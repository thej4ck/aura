import { describe, expect, it } from 'vitest';
import { creaCasuale, mescola, scegli, sceltaPesata } from './casuale';

describe('casuale', () => {
	it('stesso seed, stessa sequenza; seed diverso, sequenza diversa; sempre in [0, 1)', () => {
		const a = creaCasuale(42);
		const b = creaCasuale(42);
		const xs = Array.from({ length: 1000 }, a);
		expect(Array.from({ length: 1000 }, b)).toEqual(xs);
		expect(Array.from({ length: 5 }, creaCasuale(43))).not.toEqual(xs.slice(0, 5));
		expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
	});

	it('scegli e mescola', () => {
		const r = creaCasuale(1);
		const voci = ['do', 're', 'mi', 'fa', 'sol'];
		expect(voci).toContain(scegli(voci, r));
		expect(() => scegli([], r)).toThrow(RangeError);
		const m = mescola(voci, r);
		expect([...m].sort()).toEqual([...voci].sort());
		expect(voci).toEqual(['do', 're', 'mi', 'fa', 'sol']); // l'originale non cambia
		expect(mescola(voci, creaCasuale(7))).toEqual(mescola(voci, creaCasuale(7)));
	});

	it('sceltaPesata rispetta i pesi', () => {
		const r = creaCasuale(3);
		const peso = { a: 1, b: 3, c: 0, d: -5 };
		const conta = { a: 0, b: 0, c: 0, d: 0 };
		const voci = Object.keys(peso) as (keyof typeof peso)[];
		for (let i = 0; i < 4000; i++) conta[sceltaPesata(voci, (v) => peso[v], r)]++;
		expect(conta.c).toBe(0);
		expect(conta.d).toBe(0);
		expect(conta.b / conta.a).toBeGreaterThan(2.5);
		expect(conta.b / conta.a).toBeLessThan(3.5);
		// tutti a zero: uniforme, nessun errore
		expect(['x', 'y']).toContain(sceltaPesata(['x', 'y'], () => 0, r));
	});
});
