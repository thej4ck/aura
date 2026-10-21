import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { ID_LOCALE, ID_QUALIFICATO, RIFERIMENTO, SchemaNota, SchemaRigo } from './schema';

describe('schema dei contenuti', () => {
	it('altezze in notazione scientifica', () => {
		for (const altezza of ['C4', 'F#4', 'Bb3', 'A0', 'G8']) {
			expect(v.is(SchemaNota, { altezza })).toBe(true);
		}
		for (const altezza of ['c4', 'H4', 'F#', 'C9', 'C#b4', 'Fa4', 'C-1']) {
			expect(v.is(SchemaNota, { altezza })).toBe(false);
		}
		expect(v.is(SchemaNota, { altezza: 'C4', durata: '4' })).toBe(true);
		expect(v.is(SchemaNota, { altezza: 'C4', durata: '3' })).toBe(false);
	});

	it('rigo: chiave e armatura tra -7 e 7', () => {
		const rigo = { chiave: 'violino', note: [{ altezza: 'G4' }] };
		expect(v.is(SchemaRigo, rigo)).toBe(true);
		expect(v.is(SchemaRigo, { ...rigo, chiave: 'basso', armatura: -7 })).toBe(true);
		expect(v.is(SchemaRigo, { ...rigo, armatura: 8 })).toBe(false);
		expect(v.is(SchemaRigo, { ...rigo, armatura: 1.5 })).toBe(false);
		expect(v.is(SchemaRigo, { ...rigo, chiave: 'contralto' })).toBe(false);
	});

	it('id locali, qualificati e riferimenti', () => {
		expect(ID_LOCALE.test('note-linee')).toBe(true);
		expect(ID_LOCALE.test('Note')).toBe(false);
		expect(ID_LOCALE.test('note--linee')).toBe(false);
		expect(ID_QUALIFICATO.test('musica.canto.estensione')).toBe(true);
		expect(ID_QUALIFICATO.test('musica.canto')).toBe(false);
		expect(RIFERIMENTO.test('estensione')).toBe(true);
		expect(RIFERIMENTO.test('musica.canto.estensione')).toBe(true);
		expect(RIFERIMENTO.test('canto.estensione')).toBe(false);
	});
});
