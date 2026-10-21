import { describe, expect, it } from 'vitest';
import { unisci } from './unisci';
import { nuovoDocumento, type Documento, type RecordAttivita } from './schema-progressi';

const ore = (h: number) => new Date(Date.UTC(2026, 9, 21, h)).toISOString();
const att = (stelle: number, h: number): RecordAttivita => ({
	stato: 'completata',
	scheda: 0,
	stelle,
	tentativi: 1,
	aggiornato: ore(h)
});

function coppia(): [Documento, Documento] {
	const a = nuovoDocumento('🦊');
	return [a, structuredClone(a)];
}

describe('unisci', () => {
	it('due documenti divergenti: nessun record perso, vince il più recente', () => {
		const [a, b] = coppia();
		a.attivita['m.x.solo-a'] = att(1, 1);
		b.attivita['m.x.solo-b'] = att(2, 1);
		a.attivita['m.x.entrambi'] = att(1, 5);
		b.attivita['m.x.entrambi'] = att(3, 3);
		a.competenze['m.x.c'] = { livello: 1, aggiornato: ore(1) };
		b.competenze['m.x.c'] = { livello: 2, prossimoRipasso: '2026-10-24', aggiornato: ore(2) };
		a.dati['m.x'] = { leitner: { C4: 1 }, aggiornato: ore(9) };
		b.dati['m.x'] = { leitner: { C4: 3 }, aggiornato: ore(8) };
		b.preferenze = { ...b.preferenze, tolleranza: 'preciso', aggiornato: ore(4) };
		b.profilo.alias = 'Ada';
		a.ultimoBackup = ore(7);
		b.ultimoBackup = ore(6);

		const u = unisci(a, b);
		expect(u.attivita).toEqual({
			'm.x.solo-a': att(1, 1),
			'm.x.solo-b': att(2, 1),
			'm.x.entrambi': att(1, 5)
		});
		expect(u.competenze['m.x.c'].livello).toBe(2);
		expect(u.dati['m.x']).toEqual({ leitner: { C4: 1 }, aggiornato: ore(9) });
		expect(u.preferenze.tolleranza).toBe('preciso');
		expect(u.profilo.alias).toBe('Ada');
		expect(u.ultimoBackup).toBe(ore(7));
		expect(unisci(b, a)).toEqual(u);
	});

	it('a parità di aggiornato il risultato non dipende dall’ordine', () => {
		const [a, b] = coppia();
		a.attivita['m.x.y'] = att(1, 1);
		b.attivita['m.x.y'] = att(2, 1);
		expect(unisci(a, b)).toEqual(unisci(b, a));
	});

	it('confronta gli istanti, non le stringhe', () => {
		const [a, b] = coppia();
		a.attivita['m.x.y'] = { ...att(1, 0), aggiornato: '2026-10-21T12:00:00+02:00' }; // 10:00Z
		b.attivita['m.x.y'] = { ...att(2, 0), aggiornato: '2026-10-21T11:00:00Z' };
		expect(unisci(a, b).attivita['m.x.y'].stelle).toBe(2);
	});

	it('senza backup da nessun lato non inventa ultimoBackup', () => {
		const [a, b] = coppia();
		expect(unisci(a, b)).not.toHaveProperty('ultimoBackup');
	});

	it('profili diversi non si uniscono', () => {
		expect(() => unisci(nuovoDocumento('🦊'), nuovoDocumento('🐻'))).toThrow(/profili diversi/);
	});
});
