import { describe, expect, it } from 'vitest';
import {
	catalogoVetrina as catalogo,
	catalogoVuoto
} from '../contenuti/__fixtures__/vetrina/catalogo';
import { docCon } from '../contenuti/__fixtures__/vetrina/documento';
import { filtraModuli, filtroValido, opzioniFiltro } from './filtro';
import { DOC_VUOTO } from './pagine';

// moduli: numeri.contare 6-7 · suoni.ascolto 6-8 · suoni.ritmo 7-10
const moduli = (xs: { modulo: { id: string } }[]) => xs.map((x) => x.modulo.id);

describe('opzioniFiltro', () => {
	it('aree del catalogo ed età coperte da almeno un modulo', () => {
		const o = opzioniFiltro(catalogo);
		expect(o.aree.map((a) => a.id)).toEqual(['numeri', 'suoni']);
		expect(o.eta).toEqual([6, 7, 8, 9, 10]);
	});

	it('catalogo vuoto: nessuna opzione', () => {
		expect(opzioniFiltro(catalogoVuoto)).toEqual({ aree: [], eta: [] });
	});
});

describe('filtroValido', () => {
	it('toglie area ed età che il catalogo non ha (più), tiene lo stato', () => {
		expect(filtroValido(catalogo, { area: 'storia', eta: 14, stato: 'in_corso' })).toEqual({
			stato: 'in_corso'
		});
		expect(filtroValido(catalogo, { area: 'suoni', eta: 9 })).toEqual({ area: 'suoni', eta: 9 });
		expect(filtroValido(catalogo, {})).toEqual({});
	});
});

describe('filtraModuli', () => {
	it('senza filtro: tutti i moduli, area per area', () => {
		expect(moduli(filtraModuli(catalogo, DOC_VUOTO, {}))).toEqual([
			'numeri.contare',
			'suoni.ascolto',
			'suoni.ritmo'
		]);
	});

	it('per area e per età (l’età deve stare nella fascia del modulo)', () => {
		expect(moduli(filtraModuli(catalogo, DOC_VUOTO, { area: 'suoni' }))).toEqual([
			'suoni.ascolto',
			'suoni.ritmo'
		]);
		expect(moduli(filtraModuli(catalogo, DOC_VUOTO, { eta: 6 }))).toEqual([
			'numeri.contare',
			'suoni.ascolto'
		]);
		expect(moduli(filtraModuli(catalogo, DOC_VUOTO, { eta: 9 }))).toEqual(['suoni.ritmo']);
		expect(moduli(filtraModuli(catalogo, DOC_VUOTO, { area: 'numeri', eta: 9 }))).toEqual([]);
	});

	it('per stato, dai progressi del profilo', () => {
		const doc = docCon({
			'numeri.contare.fino-a-dieci': ['completata'],
			'numeri.contare.decine': ['completata'],
			'numeri.contare.gioco-conta': ['completata'],
			'suoni.ritmo.battito': ['in_corso']
		});
		expect(moduli(filtraModuli(catalogo, doc, { stato: 'completato' }))).toEqual([
			'numeri.contare'
		]);
		expect(moduli(filtraModuli(catalogo, doc, { stato: 'in_corso' }))).toEqual(['suoni.ritmo']);
		expect(moduli(filtraModuli(catalogo, doc, { stato: 'da_iniziare' }))).toEqual([
			'suoni.ascolto'
		]);
	});

	it('un filtro salvato che non vale più non nasconde niente', () => {
		expect(filtraModuli(catalogo, DOC_VUOTO, { area: 'storia' })).toHaveLength(3);
		expect(filtraModuli(catalogoVuoto, DOC_VUOTO, { area: 'suoni' })).toEqual([]);
	});
});
