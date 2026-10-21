import type { ModuloDati } from '../../../schema';

const scheda = (id: string, fase: 'scopri' | 'insieme' | 'prova') => ({
	id,
	fase,
	widget: 'spiegazione',
	testo: 'Ciao.'
});

const attivita = (id: string, allena: string[], prerequisiti: string[] = []) => ({
	id,
	titolo: `Attività ${id}`,
	tipo: 'lezione' as const,
	obiettivo: 'Imparare.',
	riepilogo: 'Hai imparato.',
	minuti: 5,
	allena,
	prerequisiti,
	traguardi: [],
	schede: [scheda('a', 'scopri'), scheda('b', 'insieme'), scheda('c', 'prova')]
});

export const modulo = {
	id: 'base',
	area: 'finta',
	eta: [6, 10],
	titolo: 'Modulo base',
	descrizione: 'Solo per i test.',
	icona: '🔤',
	stato: 'pubblicata',
	introduzione: {
		cosaImparerai: ['Una cosa.'],
		comeFunziona: 'Così.',
		cosaServe: [],
		consigliPerAdulti: []
	},
	glossario: [{ termine: 'Nota', spiegazione: 'Un suono.' }],
	competenze: [
		{ id: 'prima', titolo: 'Prima', descrizione: 'La prima.' },
		{ id: 'seconda', titolo: 'Seconda', descrizione: 'La seconda.', prerequisiti: ['prima'] }
	],
	attivita: [
		attivita('uno', ['prima']),
		attivita('due', ['seconda'], ['uno']),
		{ ...attivita('tre', ['prima', 'seconda'], ['due']), stato: 'bozza' }
	]
} satisfies ModuloDati;

export const widget = {
	'widget-finto': () => Promise.resolve({ default: (() => {}) as never })
};
