import type { ModuloDati } from '../../../schema';

/** Modulo in bozza: compare solo con includiBozze. */
export const modulo = {
	id: 'extra',
	area: 'finta',
	eta: [8, 10],
	titolo: 'Modulo extra',
	descrizione: 'Solo per i test.',
	icona: '➕',
	stato: 'bozza',
	introduzione: { cosaImparerai: [], comeFunziona: 'Così.', cosaServe: [], consigliPerAdulti: [] },
	glossario: [],
	competenze: [
		{ id: 'ponte', titolo: 'Ponte', descrizione: 'Unisce.', prerequisiti: ['finta.base.prima'] }
	],
	attivita: [
		{
			id: 'ponte',
			titolo: 'Ponte',
			tipo: 'gioco',
			obiettivo: 'Unire.',
			riepilogo: 'Hai unito.',
			minuti: 3,
			allena: ['ponte', 'finta.base.prima'],
			prerequisiti: ['finta.base.uno'],
			traguardi: ['Un traguardo.'],
			schede: [{ id: 'gioca', fase: 'prova', widget: 'scelta', props: { opzioni: 2 } }]
		}
	]
} satisfies ModuloDati;
