// Props dei widget musicali: forme accettate, valori predefiniti, contenuti che non hanno senso.
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { BPM_RITMO } from '../audio/costanti.ts';
import { rigoRitmico } from '../musica/ritmo.ts';
import { schemaProps as battiRitmo } from './BattiRitmo.svelte';
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

describe('ritmo', () => {
	const ritmo = rigoRitmico('ta ti-ti ta-a sst ta-a-a', '4/4');

	it('batti-ritmo: a eco e a 72 BPM di default; la pausa resta una pausa', () => {
		const p = v.parse(battiRitmo, { rigo: ritmo });
		expect(p).toMatchObject({ modo: 'eco', bpm: BPM_RITMO });
		expect(p.sillabe).toBeUndefined(); // il widget decide: sì a eco, no in lettura
		expect(p.rigo.note.filter((n) => n.pausa)).toHaveLength(1);
		expect(valido(battiRitmo, { rigo: ritmo, modo: 'lettura', bpm: 50 })).toBe(true);
	});

	it('batti-ritmo: ogni nota con la durata, almeno una da battere, battute piene, BPM entro 50-100', () => {
		expect(valido(battiRitmo, { rigo: { note: [{ altezza: 'C4' }] } })).toBe(false);
		expect(valido(battiRitmo, { rigo: rigoRitmico('sst sst') })).toBe(false);
		expect(valido(battiRitmo, { rigo: rigoRitmico('ta ta ta', '4/4') })).toBe(false);
		expect(valido(battiRitmo, { rigo: ritmo, bpm: 101 })).toBe(false); // col microfono non si può
		expect(valido(battiRitmo, { rigo: ritmo, bpm: 49 })).toBe(false);
		expect(valido(battiRitmo, { rigo: ritmo, modo: 'canone' })).toBe(false);
		// anche una melodia con le durate: si batte il suo ritmo
		const melodia = { tempo: '2/4', note: [{ altezza: 'C4', durata: '2' }] };
		expect(valido(battiRitmo, { rigo: melodia })).toBe(true);
	});
});
