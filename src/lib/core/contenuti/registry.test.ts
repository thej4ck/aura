import { describe, expect, it } from 'vitest';
import {
	costruisciCatalogo,
	ErroreCatalogo,
	trovaCiclo,
	type FileArea,
	type FileModulo
} from './registry';
import * as areaFinta from './__fixtures__/finta/area';
import * as base from './__fixtures__/finta/base/modulo';
import * as extra from './__fixtures__/finta/extra/modulo';
import type { ModuloDati } from './schema';

const aree = { 'finta/area.ts': areaFinta };
const moduli: Record<string, FileModulo> = {
	'finta/base/modulo.ts': base,
	'finta/extra/modulo.ts': extra
};
const clona = (m: ModuloDati): ModuloDati => structuredClone(m);

/** Messaggi di errore della costruzione, o [] se riesce. */
function errori(
	fileModuli: Record<string, FileModulo>,
	fileAree: Record<string, FileArea> = aree
): string[] {
	try {
		costruisciCatalogo(fileAree, fileModuli, { includiBozze: true });
		return [];
	} catch (e) {
		expect(e).toBeInstanceOf(ErroreCatalogo);
		return (e as ErroreCatalogo).errori;
	}
}

describe('costruisciCatalogo', () => {
	it('con le bozze: id qualificati, riferimenti risolti, moduli in ordine di percorso', () => {
		const c = costruisciCatalogo(aree, moduli, { includiBozze: true });
		expect(c.aree().map((a) => a.id)).toEqual(['finta']);
		expect(c.moduliDiArea('finta').map((m) => m.id)).toEqual(['finta.base', 'finta.extra']);
		expect(c.attivita('finta.base.due')).toMatchObject({
			idLocale: 'due',
			area: 'finta',
			modulo: 'finta.base',
			stato: 'pubblicata',
			allena: ['finta.base.seconda'],
			prerequisiti: ['finta.base.uno']
		});
		expect(c.attivita('finta.base.tre')?.stato).toBe('bozza');
		expect(c.competenza('finta.extra.ponte')?.prerequisiti).toEqual(['finta.base.prima']);
		expect(c.attivita('finta.extra.ponte')?.schede[0].props).toEqual({ opzioni: 2 });
		expect(c.attivita('finta.base.uno')?.schede[0].props).toEqual({});
		expect(Object.keys(c.modulo('finta.base')?.widget ?? {})).toEqual(['widget-finto']);
		expect(c.percorsoArea('finta').map((a) => a.id)).toEqual([
			'finta.base.uno',
			'finta.extra.ponte',
			'finta.base.due',
			'finta.base.tre'
		]);
	});

	it('senza bozze: spariscono moduli e attività in bozza e i riferimenti a loro', () => {
		const c = costruisciCatalogo(aree, moduli, { includiBozze: false });
		expect(c.modulo('finta.extra')).toBeUndefined();
		expect(c.attivita('finta.extra.ponte')).toBeUndefined();
		expect(c.competenza('finta.extra.ponte')).toBeUndefined();
		expect(c.attivita('finta.base.tre')).toBeUndefined();
		expect(c.modulo('finta.base')?.attivita.map((a) => a.idLocale)).toEqual(['uno', 'due']);
		expect(c.percorsoArea('finta').map((a) => a.id)).toEqual(['finta.base.uno', 'finta.base.due']);
	});

	it('un area senza moduli visibili non compare', () => {
		const vuota = { 'a.ts': { area: { ...areaFinta.area, percorso: [] } } };
		const c = costruisciCatalogo(vuota, {}, { includiBozze: true });
		expect(c.aree()).toEqual([]);
		expect(c.moduliDiArea('finta')).toEqual([]);
		expect(c.percorsoArea('finta')).toEqual([]);
	});

	it('segnala lo schema non valido con il file e il campo', () => {
		const rotto = clona(base.modulo);
		rotto.titolo = '';
		rotto.eta = [10, 6];
		const e = errori({ 'x/modulo.ts': { modulo: rotto } }, {});
		expect(e).toHaveLength(1);
		expect(e[0]).toContain('x/modulo.ts');
		expect(e[0]).toContain('titolo');
		expect(e[0]).toContain('il minimo supera il massimo');
	});

	it('segnala id non kebab-case', () => {
		const rotto = clona(base.modulo);
		rotto.attivita[0].id = 'Uno Due';
		expect(errori({ 'x/modulo.ts': { modulo: rotto } })[0]).toContain('kebab-case');
	});

	it('segnala duplicati', () => {
		const doppio = clona(base.modulo);
		doppio.attivita[1].id = 'uno';
		doppio.competenze[1].id = 'prima';
		doppio.attivita[0].schede[1].id = 'a';
		const e = errori({ 'b.ts': { modulo: doppio } });
		expect(e).toContain('finta.base: attività "finta.base.uno" duplicata');
		expect(e).toContain('finta.base: competenza "finta.base.prima" duplicata');
		expect(e).toContain('finta.base.uno: id delle schede ripetuti');
		expect(errori({ 'a.ts': base, 'b.ts': base })).toContain('b.ts: modulo "finta.base" duplicato');
		expect(errori({}, { 'a.ts': areaFinta, 'b.ts': areaFinta })).toContain(
			'b.ts: area "finta" duplicata'
		);
	});

	it('segnala riferimenti mancanti', () => {
		const m = clona(base.modulo);
		m.area = 'altra';
		m.attivita[0].allena = ['non-esiste'];
		m.attivita[0].prerequisiti = ['finta.base.manca'];
		m.competenze[0].prerequisiti = ['x.y.z'];
		const e = errori({ 'b.ts': { modulo: m } });
		expect(e).toContain(`b.ts: l'area "altra" non esiste`);
		expect(e).toContain(
			'altra.base.uno: allena la competenza "altra.base.non-esiste" che non esiste'
		);
		expect(e).toContain(`altra.base.uno: l'attività prerequisito "finta.base.manca" non esiste`);
		expect(e).toContain('altra.base.prima: la competenza prerequisito "x.y.z" non esiste');
		expect(e).toContain('area finta: il percorso cita "finta.base.uno" che non esiste');
	});

	it('segnala i cicli nei prerequisiti', () => {
		const m = clona(base.modulo);
		m.competenze[0].prerequisiti = ['seconda'];
		m.attivita[0].prerequisiti = ['tre'];
		const e = errori({ 'b.ts': { modulo: m }, 'e.ts': extra });
		expect(e).toContain(
			'ciclo nei prerequisiti delle competenze: finta.base.prima → finta.base.seconda → finta.base.prima'
		);
		expect(e).toContain(
			'ciclo nei prerequisiti delle attività: finta.base.uno → finta.base.tre → finta.base.due → finta.base.uno'
		);
	});

	it('segnala un widget che non è una funzione', () => {
		const conWidget = { modulo: base.modulo, widget: { x: 1 as never } };
		expect(errori({ 'b.ts': conWidget, 'e.ts': extra })).toEqual([
			'finta.base: il widget "x" non è un import'
		]);
	});
});

describe('trovaCiclo', () => {
	it('grafo aciclico, autociclo, ciclo lungo', () => {
		expect(
			trovaCiclo(
				new Map([
					['a', ['b']],
					['b', []]
				])
			)
		).toBeUndefined();
		expect(trovaCiclo(new Map([['a', ['a']]]))).toEqual(['a', 'a']);
		expect(
			trovaCiclo(
				new Map([
					['a', ['b']],
					['b', ['c']],
					['c', ['a']]
				])
			)
		).toEqual(['a', 'b', 'c', 'a']);
	});
});
