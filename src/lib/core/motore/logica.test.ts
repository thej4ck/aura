import { describe, expect, it } from 'vitest';
import type { AttivitaCatalogo } from '../contenuti/registry';
import type { Fase } from '../contenuti/schema';
import {
	SOGLIA_SUPERATA,
	avanzamentoSchede,
	conteggioProva,
	gruppiFase,
	limitaIndice,
	primaSchedaProva,
	puntoDiRipresa,
	suggerisci,
	valutaVerifica,
	type EsitoRegistrato
} from './logica';

const schede = (...fasi: Fase[]) => fasi.map((fase) => ({ fase }));
const tipica = schede('scopri', 'scopri', 'insieme', 'prova', 'prova', 'prova', 'prova', 'prova');
const esiti = (...corretti: boolean[]): EsitoRegistrato[] =>
	corretti.map((corretto, i) => ({ scheda: 3 + i, corretto }));

describe('avanzamento', () => {
	it('limita indici fuori intervallo o non numerici', () => {
		expect(limitaIndice(-2, 5)).toBe(0);
		expect(limitaIndice(9, 5)).toBe(4);
		expect(limitaIndice(Number.NaN, 5)).toBe(0);
		expect(limitaIndice(2.7, 5)).toBe(2);
	});

	it('dice fase, prima e ultima scheda', () => {
		expect(avanzamentoSchede(tipica, 0)).toEqual({
			indice: 0,
			totale: 8,
			fase: 'scopri',
			prima: true,
			ultima: false
		});
		expect(avanzamentoSchede(tipica, 99)).toMatchObject({ indice: 7, fase: 'prova', ultima: true });
		expect(avanzamentoSchede(schede('prova'), 0)).toMatchObject({ prima: true, ultima: true });
	});

	it('raggruppa le schede consecutive per fase', () => {
		expect(gruppiFase(tipica)).toEqual([
			{ fase: 'scopri', indici: [0, 1] },
			{ fase: 'insieme', indici: [2] },
			{ fase: 'prova', indici: [3, 4, 5, 6, 7] }
		]);
		expect(gruppiFase(schede('scopri', 'prova', 'scopri')).map((g) => g.fase)).toEqual([
			'scopri',
			'prova',
			'scopri'
		]);
	});

	it('riprende dalla scheda salvata, ma mai oltre la prima scheda prova', () => {
		expect(puntoDiRipresa(tipica, 2)).toBe(2);
		expect(puntoDiRipresa(tipica, 3)).toBe(3);
		expect(puntoDiRipresa(tipica, 6)).toBe(3); // a metà verifica: la si rifà tutta
		expect(puntoDiRipresa(tipica, 99)).toBe(3);
		expect(puntoDiRipresa(schede('scopri', 'insieme', 'scopri'), 9)).toBe(2);
		expect(puntoDiRipresa(schede('scopri', 'prova', 'scopri', 'prova'), 3)).toBe(1);
	});

	it('riprova dalla prima scheda prova, o dall’inizio se non ce ne sono', () => {
		expect(primaSchedaProva(tipica)).toBe(3);
		expect(primaSchedaProva(schede('scopri', 'insieme'))).toBe(0);
	});
});

describe('verifica', () => {
	it('conta solo gli esiti della fase prova', () => {
		const tutti: EsitoRegistrato[] = [
			{ scheda: 1, corretto: false },
			{ scheda: 2, corretto: false },
			...esiti(true, true, false)
		];
		expect(conteggioProva(tipica, tutti)).toEqual({ corretti: 2, totali: 3 });
	});

	it('ignora esiti di schede inesistenti', () => {
		expect(conteggioProva(tipica, [{ scheda: 42, corretto: true }])).toEqual({
			corretti: 0,
			totali: 0
		});
	});

	it(`è superata con almeno il ${SOGLIA_SUPERATA * 100}% di risposte giuste`, () => {
		expect(valutaVerifica(tipica, esiti(true, true, true, true, false))).toEqual({
			superata: true,
			errori: 1,
			risposte: 5
		});
		expect(valutaVerifica(tipica, esiti(true, true, true, false, false))).toEqual({
			superata: false,
			errori: 2,
			risposte: 5
		});
		expect(valutaVerifica(tipica, esiti(true, true, true, true, true))).toEqual({
			superata: true,
			errori: 0,
			risposte: 5
		});
	});

	it('gli errori nelle fasi guidate non contano', () => {
		const guidati: EsitoRegistrato[] = [{ scheda: 2, corretto: false }, ...esiti(true)];
		expect(valutaVerifica(tipica, guidati)).toEqual({ superata: true, errori: 0, risposte: 1 });
	});

	it('senza schede prova (o senza esiti di prova) è superata arrivando in fondo, con 0 risposte', () => {
		expect(valutaVerifica(schede('scopri', 'insieme'), [{ scheda: 1, corretto: false }])).toEqual({
			superata: true,
			errori: 0,
			risposte: 0
		});
		expect(valutaVerifica(tipica, [])).toEqual({ superata: true, errori: 0, risposte: 0 });
	});
});

describe('suggerisci', () => {
	const a = (id: string) => ({ id }) as AttivitaCatalogo;

	it('preferisce riprendere, poi il prossimo, poi un ripasso', () => {
		expect(
			suggerisci({ riprendi: { attivita: a('x'), scheda: 1 }, prossimo: a('y'), ripassi: [] }, 'z')
				?.id
		).toBe('x');
		expect(suggerisci({ prossimo: a('y'), ripassi: [a('r')] }, 'z')?.id).toBe('y');
		expect(suggerisci({ ripassi: [a('r')] }, 'z')?.id).toBe('r');
		expect(suggerisci({ ripassi: [] }, 'z')).toBeUndefined();
	});

	it("non propone l'attività appena fatta", () => {
		expect(
			suggerisci({ riprendi: { attivita: a('z'), scheda: 0 }, prossimo: a('y'), ripassi: [] }, 'z')
				?.id
		).toBe('y');
		expect(suggerisci({ ripassi: [a('z'), a('r')] }, 'z')?.id).toBe('r');
	});
});
