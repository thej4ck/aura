import { describe, expect, it } from 'vitest';
import { migra } from './migrazioni';
import { ErroreProgressi, nuovoDocumento, type CodiceErrore } from './schema-progressi';

const codice = (f: () => unknown): CodiceErrore | undefined => {
	try {
		f();
	} catch (e) {
		expect(e).toBeInstanceOf(ErroreProgressi);
		return (e as ErroreProgressi).codice;
	}
};

describe('migra', () => {
	it("un documento dell'ultima versione passa invariato", () => {
		const doc = nuovoDocumento('🦊', 'Ada');
		doc.attivita['musica.canto.estensione'] = {
			stato: 'in_corso',
			scheda: 2,
			stelle: 0,
			tentativi: 0,
			aggiornato: '2026-10-21T10:00:00.000Z'
		};
		doc.dati['musica.canto'] = { estensione: [], aggiornato: '2026-10-21T10:00:00.000Z' };
		expect(migra(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
	});

	it('formato sbagliato', () => {
		expect(codice(() => migra(null))).toBe('formato');
		expect(codice(() => migra([]))).toBe('formato');
		expect(codice(() => migra({ formato: 'altro', schema: 1 }))).toBe('formato');
	});

	it('versione futura o non valida', () => {
		const doc = { ...nuovoDocumento('🦊'), schema: 99 };
		expect(codice(() => migra(doc))).toBe('versione-futura');
		expect(() => migra(doc)).toThrow(/schema 99/);
		expect(codice(() => migra({ ...doc, schema: 0 }))).toBe('non-valido');
		expect(codice(() => migra({ ...doc, schema: '1' }))).toBe('non-valido');
	});

	it('contenuto non valido, con il campo nel messaggio', () => {
		const doc = nuovoDocumento('🦊');
		const rotto = { ...doc, attivita: { 'non-qualificato': {} } };
		expect(codice(() => migra(rotto))).toBe('non-valido');
		const stelle = {
			...doc,
			attivita: {
				'a.b.c': { stato: 'completata', scheda: 0, stelle: 9, tentativi: 1, aggiornato: 'ieri' }
			}
		};
		expect(() => migra(stelle)).toThrow(/stelle[\s\S]*aggiornato|aggiornato[\s\S]*stelle/);
		expect(codice(() => migra({ ...doc, profilo: { id: 'x', avatar: '🦊' } }))).toBe('non-valido');
	});
});
