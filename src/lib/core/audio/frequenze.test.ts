import { describe, expect, it } from 'vitest';
import { centsTra, distanzaCents, freqDaMidi, midiDaFreq } from './frequenze.ts';

describe('frequenze', () => {
	it('MIDI ↔ Hz con La4 = 440 o un diapason diverso', () => {
		expect(freqDaMidi(69)).toBe(440);
		expect(freqDaMidi(60)).toBeCloseTo(261.6256, 4);
		expect(freqDaMidi(81)).toBeCloseTo(880, 10);
		expect(freqDaMidi(69, 442)).toBe(442);
		expect(midiDaFreq(440)).toBe(69);
		expect(midiDaFreq(442, 442)).toBe(69);
		expect(midiDaFreq(freqDaMidi(64.3))).toBeCloseTo(64.3, 10);
	});

	it('cent: positivo se troppo alto, negativo se troppo basso', () => {
		expect(centsTra(freqDaMidi(69.25), 69)).toBeCloseTo(25, 10);
		expect(centsTra(freqDaMidi(68.6), 69)).toBeCloseTo(-40, 10);
		expect(centsTra(880, 69)).toBeCloseTo(1200, 10);
	});

	it("equivalenza d'ottava: la distanza più vicina, in [-600, 600]", () => {
		expect(distanzaCents(880, 69)).toBeCloseTo(1200, 10);
		expect(distanzaCents(880, 69, { equivalenzaOttava: true })).toBeCloseTo(0, 10);
		expect(distanzaCents(freqDaMidi(57.1), 69, { equivalenzaOttava: true })).toBeCloseTo(10, 8);
		// Mi5 sopra il La4: una quinta sopra = una quarta sotto l'ottava successiva
		expect(distanzaCents(freqDaMidi(76), 69, { equivalenzaOttava: true })).toBeCloseTo(-500, 8);
		for (let midi = 30; midi < 100; midi += 0.37) {
			const c = distanzaCents(freqDaMidi(midi), 60, { equivalenzaOttava: true });
			expect(Math.abs(c)).toBeLessThanOrEqual(600 + 1e-9);
		}
	});
});
