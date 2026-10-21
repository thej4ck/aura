import { describe, expect, it } from 'vitest';
import { aggiornaCompetenza, calcolaStelle, INTERVALLI_RIPASSO } from './padronanza';
import type { RecordAttivita, RecordCompetenza } from './store/schema-progressi';

const giornoN = (n: number) => new Date(2026, 9, 21 + n, 10); // 21 ottobre 2026 + n, ora locale
const ok = { superata: true, errori: 0 };
const ko = { superata: false, errori: 3 };

/** Applica gli esiti in sequenza, ognuno nel suo giorno. */
function sequenza(passi: [typeof ok, number][]): RecordCompetenza | undefined {
	let r: RecordCompetenza | undefined;
	for (const [esito, g] of passi) r = aggiornaCompetenza(r, esito, giornoN(g));
	return r;
}

describe('aggiornaCompetenza', () => {
	it('sale di un livello a ogni successo, con gli intervalli 1/3/7/14', () => {
		expect(INTERVALLI_RIPASSO).toEqual({ 1: 1, 2: 3, 3: 7, 4: 14 });
		const r1 = aggiornaCompetenza(undefined, ok, giornoN(0));
		expect(r1).toEqual({
			livello: 1,
			prossimoRipasso: '2026-10-22',
			livelloDal: '2026-10-21',
			aggiornato: giornoN(0).toISOString()
		});
		const r2 = aggiornaCompetenza(r1, ok, giornoN(1));
		expect([r2.livello, r2.prossimoRipasso]).toEqual([2, '2026-10-25']);
		const r3 = aggiornaCompetenza(r2, ok, giornoN(4));
		expect([r3.livello, r3.prossimoRipasso]).toEqual([3, '2026-11-01']);
		const r4 = aggiornaCompetenza(r3, ok, giornoN(11));
		expect([r4.livello, r4.prossimoRipasso]).toEqual([4, '2026-11-15']);
		expect(aggiornaCompetenza(r4, ok, giornoN(25)).livello).toBe(4);
	});

	it('il livello 4 richiede un successo in un giorno diverso da quello del 3', () => {
		expect(
			sequenza([
				[ok, 0],
				[ok, 0],
				[ok, 0],
				[ok, 0],
				[ok, 0]
			])?.livello
		).toBe(3);
		expect(
			sequenza([
				[ok, 0],
				[ok, 0],
				[ok, 0],
				[ok, 1]
			])?.livello
		).toBe(4);
		// sceso da 4 a 3 oggi: oggi non si torna a 4
		expect(
			sequenza([
				[ok, 0],
				[ok, 0],
				[ok, 0],
				[ok, 1],
				[ko, 5],
				[ok, 5]
			])?.livello
		).toBe(3);
		expect(
			sequenza([
				[ok, 0],
				[ok, 0],
				[ok, 0],
				[ok, 1],
				[ko, 5],
				[ok, 6]
			])?.livello
		).toBe(4);
	});

	it('non superata: almeno 1, scende al massimo di 1, ripasso domani', () => {
		const nuova = aggiornaCompetenza(undefined, ko, giornoN(0));
		expect([nuova.livello, nuova.prossimoRipasso]).toEqual([1, '2026-10-22']);
		expect(
			sequenza([
				[ko, 0],
				[ko, 0],
				[ko, 0]
			])?.livello
		).toBe(1);
		const da2 = sequenza([
			[ok, 0],
			[ok, 0],
			[ko, 3]
		]);
		expect([da2?.livello, da2?.prossimoRipasso]).toEqual([1, '2026-10-25']);
		expect(
			sequenza([
				[ok, 0],
				[ok, 0],
				[ok, 0],
				[ok, 1],
				[ko, 9]
			])?.livello
		).toBe(3);
	});

	it('livelloDal resta quello di quando si è raggiunto il livello', () => {
		expect(
			sequenza([
				[ok, 0],
				[ko, 2]
			])?.livelloDal
		).toBe('2026-10-21');
		expect(
			sequenza([
				[ok, 0],
				[ok, 0],
				[ok, 0],
				[ok, 0]
			])?.livelloDal
		).toBe('2026-10-21');
	});
});

describe('calcolaStelle', () => {
	const completata = (stelle: number, primaVolta = '2026-10-21'): RecordAttivita => ({
		stato: 'completata',
		scheda: 0,
		stelle,
		tentativi: 1,
		primaVolta,
		aggiornato: giornoN(0).toISOString()
	});

	it('★ superata, ★★ con al massimo 1 errore', () => {
		expect(calcolaStelle(undefined, { superata: true, errori: 2 }, giornoN(0))).toBe(1);
		expect(calcolaStelle(undefined, { superata: true, errori: 1 }, giornoN(0))).toBe(2);
		expect(calcolaStelle(undefined, ok, giornoN(0))).toBe(2);
		expect(calcolaStelle(undefined, ko, giornoN(0))).toBe(0);
	});

	it('★★★ solo in un giorno diverso dal primo completamento', () => {
		expect(calcolaStelle(completata(2), ok, giornoN(0))).toBe(2);
		expect(calcolaStelle(completata(1), { superata: true, errori: 5 }, giornoN(1))).toBe(3);
	});

	it('le stelle non diminuiscono mai', () => {
		expect(calcolaStelle(completata(3), ko, giornoN(4))).toBe(3);
		expect(calcolaStelle(completata(2), { superata: true, errori: 4 }, giornoN(0))).toBe(2);
	});
});
