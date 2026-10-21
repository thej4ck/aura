import { describe, expect, it } from 'vitest';
import {
	catalogoVetrina as catalogo,
	catalogoVuoto
} from '../contenuti/__fixtures__/vetrina/catalogo';
import { docCon as con } from '../contenuti/__fixtures__/vetrina/documento';
import { nuovoDocumento } from '../store/schema-progressi';
import { DOC_VUOTO, tappe, vistaArea, vistaHome, vistaModulo } from './pagine';

// percorsi: numeri → contare.fino-a-dieci, contare.decine
//           suoni → ascolto.forte-piano, ascolto.lungo-corto, ritmo.battito, ascolto.alto-basso, ritmo.pause
const oggi = new Date(2026, 9, 21, 10);

const ids = (xs: { attivita: { id: string } }[]) => xs.map((x) => x.attivita.id);

describe('vistaHome', () => {
	it('prima visita: benvenuto, primo passo del percorso, aree a zero', () => {
		const v = vistaHome(catalogo, nuovoDocumento('🦊'), oggi);
		expect(v.primaVisita).toBe(true);
		expect(v.riprendi).toBeUndefined();
		expect(v.prossimo?.attivita.id).toBe('numeri.contare.fino-a-dieci');
		expect(v.prossimo?.modulo.id).toBe('numeri.contare');
		expect(v.ripassi).toEqual([]);
		expect(v.aree.map((a) => [a.area.id, a.avanzamento.stato])).toEqual([
			['numeri', 'da_iniziare'],
			['suoni', 'da_iniziare']
		]);
	});

	it('catalogo vuoto: niente da proporre, nessuna area', () => {
		const v = vistaHome(catalogoVuoto, DOC_VUOTO, oggi);
		expect(v).toEqual({ primaVisita: true, ripassi: [], aree: [] });
	});

	it('riprendi con modulo e schede; il prossimo salta le attività già toccate', () => {
		const doc = con({
			'numeri.contare.fino-a-dieci': ['completata'],
			'numeri.contare.decine': ['in_corso', 1, 8],
			'suoni.ascolto.forte-piano': ['in_corso', 2, 11]
		});
		const v = vistaHome(catalogo, doc, oggi);
		expect(v.primaVisita).toBe(false);
		expect(v.riprendi).toMatchObject({ scheda: 2, totale: 3 });
		expect(v.riprendi?.attivita.id).toBe('suoni.ascolto.forte-piano');
		expect(v.riprendi?.modulo.titolo).toBe('Ascolto');
		expect(v.prossimo?.attivita.id).toBe('suoni.ascolto.lungo-corto');
		expect(v.aree.map((a) => [a.area.id, a.avanzamento.completate, a.avanzamento.totale])).toEqual([
			['numeri', 1, 3],
			['suoni', 0, 5]
		]);
	});

	it('da ripassare: attività completate con una competenza in scadenza', () => {
		const doc = con({ 'suoni.ascolto.forte-piano': ['completata'] });
		doc.competenze['suoni.ascolto.intensita'] = {
			livello: 2,
			prossimoRipasso: '2026-10-20',
			aggiornato: new Date(2026, 9, 17).toISOString()
		};
		const v = vistaHome(catalogo, doc, oggi);
		expect(ids(v.ripassi)).toEqual(['suoni.ascolto.forte-piano']);
		expect(v.ripassi[0].modulo.id).toBe('suoni.ascolto');
	});
});

describe('tappe', () => {
	it('consigliata: l’attività in corso più recente, anche se prima ce n’è una da fare', () => {
		const doc = con({
			'suoni.ritmo.battito': ['in_corso', 0, 8],
			'suoni.ascolto.alto-basso': ['in_corso', 0, 12]
		});
		const t = tappe(catalogo, doc, catalogo.percorsoArea('suoni'));
		expect(t.filter((x) => x.consigliata).map((x) => x.attivita.id)).toEqual([
			'suoni.ascolto.alto-basso'
		]);
	});

	it('senza attività in corso: la prima da fare; tutto fatto: nessuna', () => {
		const percorso = catalogo.percorsoArea('numeri');
		const una = tappe(catalogo, con({ 'numeri.contare.fino-a-dieci': ['completata'] }), percorso);
		expect(una.map((x) => [x.stato, x.consigliata])).toEqual([
			['completata', false],
			['nuova', true]
		]);
		const tutte = con({
			'numeri.contare.fino-a-dieci': ['completata'],
			'numeri.contare.decine': ['completata']
		});
		expect(tappe(catalogo, tutte, percorso).some((x) => x.consigliata)).toBe(false);
	});

	it('stelle e prerequisiti suggeriti (solo quelli non completati)', () => {
		const t = tappe(
			catalogo,
			con({ 'suoni.ascolto.forte-piano': ['completata'] }),
			catalogo.percorsoArea('suoni')
		);
		const per = (id: string) => t.find((x) => x.attivita.id === id)!;
		expect(per('suoni.ascolto.forte-piano').stelle).toBe(2);
		expect(per('suoni.ritmo.battito').mancanti.map((a) => a.id)).toEqual([
			'suoni.ascolto.lungo-corto'
		]);
		expect(per('suoni.ascolto.alto-basso').mancanti).toEqual([]);
		expect(per('suoni.ritmo.battito').modulo.id).toBe('suoni.ritmo');
	});
});

describe('vistaArea', () => {
	it('area inesistente → undefined', () => {
		expect(vistaArea(catalogo, DOC_VUOTO, 'nessuna')).toBeUndefined();
	});

	it('moduli con avanzamento e percorso consigliato con lo stato di ogni attività', () => {
		const doc = con({ 'suoni.ascolto.forte-piano': ['completata'] });
		const v = vistaArea(catalogo, doc, 'suoni')!;
		expect(v.area.titolo).toBe('Suoni');
		expect(v.avanzamento).toMatchObject({ completate: 1, totale: 5, stato: 'in_corso' });
		expect(v.moduli.map((m) => [m.modulo.id, m.avanzamento.stato])).toEqual([
			['suoni.ascolto', 'in_corso'],
			['suoni.ritmo', 'da_iniziare']
		]);
		expect(v.percorso.map((t) => t.stato)).toEqual([
			'completata',
			'nuova',
			'nuova',
			'nuova',
			'nuova'
		]);
		expect(v.percorso[1].consigliata).toBe(true);
	});
});

describe('vistaModulo', () => {
	it('modulo inesistente → undefined', () => {
		expect(vistaModulo(catalogo, DOC_VUOTO, 'numeri.nessuno')).toBeUndefined();
	});

	it('i traguardi delle attività, una volta sola', () => {
		const v = vistaModulo(catalogo, DOC_VUOTO, 'suoni.ascolto')!;
		expect(v.percorso.length).toBeGreaterThan(1);
		expect(v.traguardi).toEqual(['Ascolta e riconosce suoni diversi.']);
	});

	it('attività nell’ordine del percorso, quelle fuori percorso in fondo', () => {
		const v = vistaModulo(catalogo, DOC_VUOTO, 'numeri.contare')!;
		expect(v.area.id).toBe('numeri');
		expect(ids(v.percorso)).toEqual([
			'numeri.contare.fino-a-dieci',
			'numeri.contare.decine',
			'numeri.contare.gioco-conta'
		]);
		expect(v.avanzamento).toMatchObject({ completate: 0, totale: 3, stato: 'da_iniziare' });
	});
});
