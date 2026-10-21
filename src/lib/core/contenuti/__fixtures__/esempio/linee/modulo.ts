import type { ModuloDati } from '../../../schema';

/** Modulo di esempio: un'attività con tutti i widget core (spiegazione, animazione, scelta). */
export const modulo = {
	id: 'linee',
	area: 'esempio',
	eta: [6, 10],
	titolo: 'Le linee del pentagramma',
	descrizione: 'Un modulo di prova per il motore.',
	icona: '🎼',
	stato: 'pubblicata',
	introduzione: {
		cosaImparerai: ['Quante sono le linee del pentagramma.'],
		comeFunziona: 'Guardi, provi insieme, poi provi da solo.',
		cosaServe: [],
		consigliPerAdulti: []
	},
	glossario: [
		{ termine: 'Pentagramma', spiegazione: 'Le cinque linee su cui si scrive la musica.' }
	],
	competenze: [
		{ id: 'contare-linee', titolo: 'Contare le linee', descrizione: 'Conta le linee dal basso.' }
	],
	attivita: [
		{
			id: 'cinque-linee',
			titolo: 'Le 5 linee',
			tipo: 'lezione',
			obiettivo: 'Scopri quante linee ha il pentagramma e come si contano.',
			riepilogo: 'Il pentagramma ha cinque linee. Si contano dal basso verso l’alto.',
			minuti: 4,
			allena: ['contare-linee'],
			traguardi: ['Riconosce gli elementi base della notazione musicale.'],
			schede: [
				{
					id: 'cos-e',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Il pentagramma',
					testo: 'La musica si scrive su cinque linee. Insieme si chiamano pentagramma.',
					props: {
						illustrazione: { componente: 'cinque-linee', alt: 'Cinque linee orizzontali' }
					}
				},
				{
					id: 'contiamo',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Contiamo le linee',
					props: {
						componente: 'cinque-linee',
						passi: [
							{ testo: 'Questa è la prima linea, in basso.' },
							{ testo: 'Ecco la seconda.' },
							{ testo: 'La terza sta nel mezzo.' },
							{ testo: 'Poi viene la quarta.' },
							{ testo: 'E la quinta, in alto. Sono cinque!' }
						]
					}
				},
				{
					id: 'quante',
					fase: 'insieme',
					widget: 'scelta',
					titolo: 'Conta con il dito',
					testo: 'Conta le linee con il dito, dal basso verso l’alto.',
					props: {
						domanda: 'Quante linee ha il pentagramma?',
						opzioni: ['Quattro', 'Cinque', 'Sei'],
						corretta: 1,
						suggerimento: 'Conta piano, una linea alla volta.',
						spiegazione: 'Il pentagramma ha cinque linee.'
					}
				},
				{
					id: 'da-dove',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Da dove si comincia a contare le linee?',
						opzioni: ['Dal basso', 'Dall’alto'],
						corretta: 0,
						suggerimento: 'Pensa a una scala: si sale dal primo gradino.'
					}
				},
				{
					id: 'nel-mezzo',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Qual è la linea nel mezzo?',
						opzioni: ['La seconda', 'La terza', 'La quarta'],
						corretta: 1,
						suggerimento: 'Ci sono due linee sotto e due sopra.'
					}
				}
			]
		},
		{
			id: 'spazi',
			titolo: 'I 4 spazi',
			tipo: 'lezione',
			obiettivo: 'Scopri gli spazi tra le linee.',
			riepilogo: 'Tra le cinque linee ci sono quattro spazi.',
			minuti: 1,
			allena: ['contare-linee'],
			prerequisiti: ['cinque-linee'],
			traguardi: [],
			schede: [
				{
					id: 'spazi',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Gli spazi',
					testo: 'Tra una linea e l’altra c’è uno spazio. Gli spazi sono quattro.'
				}
			]
		}
	]
} satisfies ModuloDati;

export const widget = {
	'cinque-linee': () => import('./CinqueLinee.svelte')
};
