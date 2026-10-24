import { describe, expect, it } from 'vitest';
import { avanzaVoceForte, nuovaVoceForte, type StatoVoceForte } from './voce-forte';

const rms = (dbfs: number) => 10 ** (dbfs / 20);

/** frame a 30 al secondo: `livello(t)` in dBFS, `fuori(t)` se la voce è fuori nota; null = silenzio */
function canta(
	secondi: number,
	livello: (t: number) => number | null,
	fuori: (t: number) => boolean = () => true,
	s: StatoVoceForte = nuovaVoceForte(),
	t0 = 0
): StatoVoceForte {
	for (let i = 0; i <= secondi * 30; i++) {
		const t = t0 + i / 30;
		const l = livello(t);
		s = avanzaVoceForte(s, { t, freq: l === null ? null : 220, rms: rms(l ?? -80) }, fuori(t));
	}
	return s;
}

describe('voce troppo forte', () => {
	it('una voce normale, anche con ±6 dB di volume e fuori nota, non accende niente', () => {
		expect(canta(10, (t) => -40 + 6 * Math.sin(t * 3)).avviso).toBe(false);
	});

	it('la voce che cresce di 12 dB mentre cerca la nota accende il consiglio', () => {
		const s = canta(4, (t) => (t < 2 ? -40 : -28));
		expect(s.avviso).toBe(true);
	});

	it('se cresce ma è intonata non dice niente (il bambino ha solo preso coraggio)', () => {
		const s = canta(
			4,
			(t) => (t < 2 ? -40 : -28),
			(t) => t < 2
		);
		expect(s.avviso).toBe(false);
	});

	it('un attimo forte (una risata) non basta: serve una voce forte per FORTE_MS', () => {
		const s = canta(4, (t) => (t > 2 && t < 2.3 ? -26 : -40));
		expect(s.avviso).toBe(false);
	});

	it('fortissima in assoluto, anche intonata e da subito, accende il consiglio', () => {
		const s = canta(
			3,
			() => -10,
			() => false
		);
		expect(s.avviso).toBe(true);
	});

	it('il silenzio e i frame silenziati non entrano nella partenza', () => {
		let s = canta(3, () => null);
		expect(s.baseMs).toBe(0);
		s = canta(2, () => -40, undefined, s, 3);
		expect(s.base).toBeCloseTo(-40, 5);
		s = avanzaVoceForte(s, { t: 5.1, freq: 440, rms: rms(-5), silenziato: true }, true);
		expect(s.forteMs).toBe(0);
	});

	it('acceso resta acceso fino alla fine della prova', () => {
		const s = canta(4, (t) => (t < 2 ? -40 : -28));
		expect(canta(3, () => -40, undefined, s, 4.1).avviso).toBe(true);
	});
});
