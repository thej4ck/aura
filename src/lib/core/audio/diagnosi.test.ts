import { describe, expect, it } from 'vitest';
import { riepiloga } from './diagnosi.ts';
import type { FrameMic } from './mic.ts';

const frame = (t: number, f: Partial<FrameMic> = {}): FrameMic => ({
	t,
	freq: 440,
	chiarezza: 0.9,
	rms: 0.01,
	silenziato: false,
	rumore: 0.001,
	gate: 0.002,
	...f
});

describe('riepiloga', () => {
	it('conta i frame con la voce e, per gli altri, il perché; i ritardi dal tempo dei frame', () => {
		const r = riepiloga([
			frame(0),
			frame(1 / 30),
			frame(2 / 30, { freq: null, motivo: 'gate' }),
			frame(3 / 30, { freq: null, motivo: 'aperiodico' }),
			frame(4 / 30, { freq: null, silenziato: true }),
			// 100 ms dopo: un ritardo di 67 ms in più
			frame(4 / 30 + 0.1),
			// la mediana ha retto il buco: c'è la nota anche se YIN non l'ha sentita
			frame(5 / 30 + 0.1, { motivo: 'gate' })
		]);
		expect(r).toMatchObject({ frame: 7, validi: 4, gate: 1, aperiodici: 1, silenziati: 1 });
		expect(r.ritardi).toBe(1);
		expect(r.ritardoMs).toBeCloseTo(100 - 1000 / 30, 6);
	});
});
