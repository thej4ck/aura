import { describe, expect, it } from 'vitest';
import { catalogoVetrina as catalogo } from '../contenuti/__fixtures__/vetrina/catalogo';
import { docCon } from '../contenuti/__fixtures__/vetrina/documento';
import { nuovoDocumento, type Documento } from '../store/schema-progressi';
import { progressiModulo, progressiPerModulo, serveBackup } from './genitori';

const oggi = new Date(2026, 9, 21, 10);
const ids = (xs: { attivita: { id: string } }[]) => xs.map((x) => x.attivita.id);

describe('progressiModulo', () => {
	it('fatte, da fare (in ordine di percorso), competenze con livello e ripasso, prossimo passo', () => {
		const doc = docCon({
			'suoni.ascolto.forte-piano': ['completata'],
			'suoni.ascolto.alto-basso': ['in_corso']
		});
		doc.competenze['suoni.ascolto.intensita'] = {
			livello: 2,
			prossimoRipasso: '2026-10-21',
			aggiornato: new Date(2026, 9, 18).toISOString()
		};
		doc.competenze['suoni.ascolto.altezza'] = {
			livello: 1,
			prossimoRipasso: '2026-10-22',
			aggiornato: new Date(2026, 9, 20).toISOString()
		};
		const p = progressiModulo(catalogo, doc, catalogo.modulo('suoni.ascolto')!, oggi);
		expect(ids(p.fatte)).toEqual(['suoni.ascolto.forte-piano']);
		expect(ids(p.daFare)).toEqual(['suoni.ascolto.lungo-corto', 'suoni.ascolto.alto-basso']);
		expect(p.competenze.map((c) => [c.competenza.id, c.livello, c.daRipassare])).toEqual([
			['suoni.ascolto.intensita', 2, true],
			['suoni.ascolto.durata', 0, false],
			['suoni.ascolto.altezza', 1, false]
		]);
		expect(p.prossimo?.attivita.id).toBe('suoni.ascolto.alto-basso');
		expect(p.avanzamento).toMatchObject({ completate: 1, totale: 3 });
	});

	it('modulo finito: niente da fare e nessun prossimo passo', () => {
		const doc = docCon({
			'suoni.ritmo.battito': ['completata'],
			'suoni.ritmo.pause': ['completata']
		});
		const p = progressiModulo(catalogo, doc, catalogo.modulo('suoni.ritmo')!, oggi);
		expect(p.daFare).toEqual([]);
		expect(p.prossimo).toBeUndefined();
	});

	it('progressiPerModulo: tutti i moduli, area per area', () => {
		expect(
			progressiPerModulo(catalogo, nuovoDocumento('🦊'), oggi).map((p) => p.modulo.id)
		).toEqual(['numeri.contare', 'suoni.ascolto', 'suoni.ritmo']);
	});
});

describe('serveBackup', () => {
	const giorniFa = (n: number) => new Date(oggi.getTime() - n * 86_400_000).toISOString();
	const conAttivita = (aggiornato: string, ultimoBackup?: string): Documento => {
		const doc = nuovoDocumento('🦊');
		doc.attivita['suoni.ascolto.forte-piano'] = {
			stato: 'in_corso',
			scheda: 1,
			stelle: 0,
			tentativi: 0,
			aggiornato
		};
		if (ultimoBackup) doc.ultimoBackup = ultimoBackup;
		return doc;
	};

	it('senza progressi mai', () => {
		expect(serveBackup(nuovoDocumento('🦊'), oggi)).toBe(false);
		const soloBackup = nuovoDocumento('🦊');
		soloBackup.ultimoBackup = giorniFa(60);
		expect(serveBackup(soloBackup, oggi)).toBe(false);
	});

	it('senza backup: solo se i progressi hanno più di 14 giorni', () => {
		expect(serveBackup(conAttivita(giorniFa(3)), oggi)).toBe(false);
		expect(serveBackup(conAttivita(giorniFa(14)), oggi)).toBe(false);
		expect(serveBackup(conAttivita(giorniFa(15)), oggi)).toBe(true);
	});

	it('con un backup vecchio: solo se dopo ci sono progressi nuovi', () => {
		expect(serveBackup(conAttivita(giorniFa(1), giorniFa(20)), oggi)).toBe(true);
		expect(serveBackup(conAttivita(giorniFa(21), giorniFa(20)), oggi)).toBe(false);
		expect(serveBackup(conAttivita(giorniFa(1), giorniFa(2)), oggi)).toBe(false);
	});

	it('contano anche competenze e dati dei moduli', () => {
		const doc = nuovoDocumento('🦊');
		doc.ultimoBackup = giorniFa(30);
		doc.dati['suoni.ascolto'] = { aggiornato: giorniFa(1) };
		expect(serveBackup(doc, oggi)).toBe(true);
	});
});
