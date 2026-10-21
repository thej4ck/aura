import { describe, expect, it } from 'vitest';
import {
	AZZERA_DOPO_MS,
	PAUSA_DOPO_MS,
	avanzaPausa,
	chiudiPausa,
	statoPausa,
	suggerisciPausa,
	type StatoPausa
} from './pausa';

const MIN = 60_000;
/** Aggiornamenti ogni 30 s per `minuti`, con la visibilità data. */
function passa(s: StatoPausa, minuti: number, visibile = true): StatoPausa {
	for (let t = 0; t < minuti * 2; t++) s = avanzaPausa(s, s.da + 30_000, visibile);
	return s;
}
/** Come passa, ma da nascosta `da` resta all'inizio dell'assenza: si avanza dall'ultimo istante. */
function assente(s: StatoPausa, minuti: number): StatoPausa {
	const inizio = s.da;
	s = avanzaPausa(s, inizio, false);
	for (let t = 1; t <= minuti * 2; t++) s = avanzaPausa(s, inizio + t * 30_000, false);
	return s;
}

describe('pausa gentile', () => {
	it('dopo circa 15 minuti di uso attivo, non prima', () => {
		const s = passa(statoPausa(0, true), 14.5);
		expect(suggerisciPausa(s)).toBe(false);
		expect(suggerisciPausa(passa(s, 0.5))).toBe(true);
		expect(PAUSA_DOPO_MS).toBe(15 * MIN);
	});

	it('il tempo a scheda nascosta non conta; un’assenza breve non azzera', () => {
		let s = passa(statoPausa(0, true), 10);
		s = assente(s, 4);
		expect(s.attivoMs).toBe(10 * MIN);
		s = avanzaPausa(s, s.da + 4 * MIN, true); // torna visibile
		s = passa(s, 5);
		expect(suggerisciPausa(s)).toBe(true);
	});

	it('5 minuti di assenza azzerano il conteggio (anche con aggiornamenti mentre è nascosta)', () => {
		let s = passa(statoPausa(0, true), 14);
		s = assente(s, 5);
		expect(s.attivoMs).toBe(0);
		s = avanzaPausa(s, s.da + AZZERA_DOPO_MS, true);
		expect(suggerisciPausa(passa(s, 14))).toBe(false);
	});

	it('un buco di 5 minuti a scheda visibile (dispositivo sospeso) è un’assenza', () => {
		const s = passa(statoPausa(0, true), 14);
		expect(avanzaPausa(s, s.da + AZZERA_DOPO_MS, true).attivoMs).toBe(0);
		expect(avanzaPausa(s, s.da + 2 * MIN, true).attivoMs).toBe(16 * MIN);
	});

	it('chiuso il suggerimento, il prossimo arriva dopo altri 15 minuti', () => {
		let s = chiudiPausa(passa(statoPausa(0, true), 15));
		expect(suggerisciPausa(s)).toBe(false);
		s = passa(s, 14.5);
		expect(suggerisciPausa(s)).toBe(false);
		expect(suggerisciPausa(passa(s, 0.5))).toBe(true);
	});
});
