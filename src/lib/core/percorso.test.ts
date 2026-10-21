import { describe, expect, it } from 'vitest';
import { costruisciCatalogo, type AttivitaCatalogo } from './contenuti/registry';
import * as areaFinta from './contenuti/__fixtures__/finta/area';
import * as base from './contenuti/__fixtures__/finta/base/modulo';
import * as extra from './contenuti/__fixtures__/finta/extra/modulo';
import {
	prerequisitiMancanti,
	prossimoPasso,
	statoArea,
	statoModulo,
	MAX_RIPASSI
} from './percorso';
import { nuovoDocumento, type RecordAttivita, type StatoAttivita } from './store/schema-progressi';

// percorso dell'area finta: base.uno, extra.ponte, base.due, base.tre
const catalogo = costruisciCatalogo(
	{ a: areaFinta },
	{ b: base, e: extra },
	{ includiBozze: true }
);
const oggi = new Date(2026, 9, 21, 10);
const ids = (xs: AttivitaCatalogo[]) => xs.map((a) => a.id);

function con(stati: Record<string, [StatoAttivita, number?, number?]>) {
	const doc = nuovoDocumento('🦊');
	for (const [id, [stato, scheda = 0, ora = 9]] of Object.entries(stati)) {
		const r: RecordAttivita = {
			stato,
			scheda,
			stelle: 0,
			tentativi: 0,
			aggiornato: new Date(Date.UTC(2026, 9, 20, ora)).toISOString()
		};
		doc.attivita[id] = r;
	}
	return doc;
}

describe('prossimoPasso', () => {
	it('stato vuoto: la prima attività del percorso', () => {
		const p = prossimoPasso(catalogo, nuovoDocumento('🦊'), oggi);
		expect(p.riprendi).toBeUndefined();
		expect(p.prossimo?.id).toBe('finta.base.uno');
		expect(p.ripassi).toEqual([]);
	});

	it('in corso: riprende la più recente alla scheda giusta; il prossimo salta quelle in corso', () => {
		const doc = con({
			'finta.base.uno': ['completata'],
			'finta.extra.ponte': ['in_corso', 0, 8],
			'finta.base.due': ['in_corso', 2, 11]
		});
		const p = prossimoPasso(catalogo, doc, oggi);
		expect(p.riprendi?.attivita.id).toBe('finta.base.due');
		expect(p.riprendi?.scheda).toBe(2);
		expect(p.prossimo?.id).toBe('finta.base.tre');
	});

	it('la scheda salvata oltre la fine viene riportata all’ultima', () => {
		const p = prossimoPasso(catalogo, con({ 'finta.base.uno': ['in_corso', 99] }), oggi);
		expect(p.riprendi?.scheda).toBe(2);
	});

	it('tutto completato: niente prossimo', () => {
		const tutte = Object.fromEntries(
			catalogo.percorsoArea('finta').map((a) => [a.id, ['completata'] as [StatoAttivita]])
		);
		expect(prossimoPasso(catalogo, con(tutte), oggi).prossimo).toBeUndefined();
	});

	it('ripassi: solo completate con competenze scadute, prima le più scadute, al massimo 3', () => {
		const doc = con({
			'finta.base.uno': ['completata'], // allena prima
			'finta.base.due': ['completata'], // allena seconda
			'finta.base.tre': ['in_corso'], // allena prima e seconda: non è completata
			'finta.extra.ponte': ['completata'] // allena ponte e prima
		});
		const c = (prossimoRipasso: string) => ({
			livello: 2,
			prossimoRipasso,
			aggiornato: oggi.toISOString()
		});
		doc.competenze['finta.base.prima'] = c('2026-10-21');
		doc.competenze['finta.base.seconda'] = c('2026-10-15');
		doc.competenze['finta.extra.ponte'] = c('2026-10-18');
		expect(ids(prossimoPasso(catalogo, doc, oggi).ripassi)).toEqual([
			'finta.base.due',
			'finta.extra.ponte',
			'finta.base.uno'
		]);
		doc.competenze['finta.base.prima'] = c('2026-10-22'); // non ancora
		expect(ids(prossimoPasso(catalogo, doc, oggi).ripassi)).toEqual([
			'finta.base.due',
			'finta.extra.ponte'
		]);
		expect(MAX_RIPASSI).toBe(3);
	});
});

describe('stato di modulo e area', () => {
	const m = catalogo.modulo('finta.base')!;
	const area = catalogo.area('finta')!;

	it('da iniziare, in corso, completato', () => {
		expect(statoModulo(m, nuovoDocumento('🦊'))).toEqual({
			completate: 0,
			totale: 3,
			percentuale: 0,
			stato: 'da_iniziare'
		});
		expect(statoModulo(m, con({ 'finta.base.uno': ['in_corso'] })).stato).toBe('in_corso');
		const meta = con({ 'finta.base.uno': ['completata'] });
		expect(statoModulo(m, meta)).toMatchObject({
			completate: 1,
			percentuale: 33,
			stato: 'in_corso'
		});
		const fatto = con({
			'finta.base.uno': ['completata'],
			'finta.base.due': ['completata'],
			'finta.base.tre': ['completata']
		});
		expect(statoModulo(m, fatto)).toMatchObject({ percentuale: 100, stato: 'completato' });
		expect(statoArea(area, fatto)).toEqual({
			completate: 3,
			totale: 4,
			percentuale: 75,
			stato: 'in_corso'
		});
	});
});

it('prerequisitiMancanti: le attività prerequisito non completate', () => {
	const tre = catalogo.attivita('finta.base.tre')!;
	expect(prerequisitiMancanti(tre, nuovoDocumento('🦊'))).toEqual(['finta.base.due']);
	expect(prerequisitiMancanti(tre, con({ 'finta.base.due': ['completata'] }))).toEqual([]);
	expect(prerequisitiMancanti(tre, con({ 'finta.base.due': ['in_corso'] }))).toEqual([
		'finta.base.due'
	]);
});
