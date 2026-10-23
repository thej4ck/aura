// Props dei widget musicali: forme accettate, valori predefiniti, contenuti che non hanno senso.
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { schemaProps as cantaNota } from './CantaNota.svelte';
import { schemaProps as cantaSequenza } from './CantaSequenza.svelte';
import { schemaNote } from './musica.ts';
import { schemaProps as staffTocca } from './StaffTocca.svelte';

const valido = (s: v.GenericSchema, x: unknown) => v.safeParse(s, x).success;

describe('note dei widget', () => {
	it('un elenco di altezze diventa un Rigo in chiave di violino; un Rigo resta com’è', () => {
		expect(v.parse(schemaNote, ['C4', 'F#4'])).toEqual({
			chiave: 'violino',
			note: [{ altezza: 'C4' }, { altezza: 'F#4' }]
		});
		const rigo = { chiave: 'basso', armatura: -1, note: [{ altezza: 'Bb2' }] };
		expect(v.parse(schemaNote, rigo)).toEqual(rigo);
	});

	it('almeno una nota, e solo altezze valide', () => {
		expect(valido(schemaNote, [])).toBe(false);
		expect(valido(schemaNote, { chiave: 'violino', note: [] })).toBe(false);
		expect(valido(schemaNote, ['H4'])).toBe(false);
	});
});

describe('staff-tocca', () => {
	it('la nota deve stare tra le posizioni da toccare', () => {
		expect(valido(staffTocca, { nota: 'A5' })).toBe(true);
		expect(valido(staffTocca, { nota: 'B5' })).toBe(false); // oltre il primo taglio in alto
		expect(valido(staffTocca, { nota: 'B5', selezionabili: [-2, 11] })).toBe(true);
		expect(valido(staffTocca, { nota: 'G4', selezionabili: [5, 3] })).toBe(false);
		expect(valido(staffTocca, { nota: 'G2', chiave: 'basso' })).toBe(true);
	});
});

describe('canto', () => {
	it('tenuta di 3 s per una nota e di 0,6 s per nota in sequenza, ottava libera', () => {
		expect(v.parse(cantaNota, { nota: 'A4' })).toMatchObject({
			tenutaMs: 3000,
			equivalenzaOttava: true
		});
		expect(v.parse(cantaSequenza, { note: ['C4', 'D4'] })).toMatchObject({
			tenutaMs: 600,
			equivalenzaOttava: true
		});
	});
});
