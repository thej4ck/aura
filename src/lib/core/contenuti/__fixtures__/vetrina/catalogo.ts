import { costruisciCatalogo } from '../../registry';
import type { AreaDati, ModuloDati } from '../../schema';

// Catalogo per le pagine della shell: due aree, tre moduli con fasce d'età diverse, un percorso che
// alterna i moduli. Lo usano i test delle funzioni di vista e la sezione «Pagine» di /dev.
// Le attività hanno solo schede di spiegazione: qui conta la navigazione, non il motore.

type AttivitaDati = ModuloDati['attivita'][number];

const attivita = (
	id: string,
	titolo: string,
	allena: string[],
	altro: Partial<AttivitaDati> = {}
): AttivitaDati => ({
	id,
	titolo,
	tipo: 'lezione',
	obiettivo: `Scopri ${titolo.toLowerCase()}.`,
	riepilogo: `Hai scoperto ${titolo.toLowerCase()}.`,
	minuti: 5,
	allena,
	traguardi: ['Ascolta e riconosce suoni diversi.'],
	schede: [
		{ id: 'guarda', fase: 'scopri', widget: 'spiegazione', testo: 'Guarda e ascolta.' },
		{ id: 'insieme', fase: 'insieme', widget: 'spiegazione', testo: 'Ora proviamo insieme.' },
		{ id: 'tu', fase: 'prova', widget: 'spiegazione', testo: 'Adesso prova tu.' }
	],
	...altro
});

const suoni = {
	id: 'suoni',
	titolo: 'Suoni',
	descrizione: 'Ascoltare, riconoscere e seguire i suoni intorno a noi.',
	icona: '🎵',
	colore: '#4b63b0',
	percorso: [
		'suoni.ascolto.forte-piano',
		'suoni.ascolto.lungo-corto',
		'suoni.ritmo.battito',
		'suoni.ascolto.alto-basso',
		'suoni.ritmo.pause'
	]
} satisfies AreaDati;

const numeri = {
	id: 'numeri',
	titolo: 'Numeri',
	descrizione: 'Contare, confrontare e giocare con i numeri.',
	icona: '🔢',
	colore: '#437f34',
	percorso: ['numeri.contare.fino-a-dieci', 'numeri.contare.decine']
} satisfies AreaDati;

const ascolto = {
	id: 'ascolto',
	area: 'suoni',
	eta: [6, 8],
	titolo: 'Ascolto',
	descrizione: 'Forte o piano, lungo o corto, alto o basso: le qualità del suono.',
	icona: '👂',
	stato: 'pubblicata',
	introduzione: {
		cosaImparerai: [
			'Distinguere un suono forte da uno piano.',
			'Capire se un suono è lungo o corto.',
			'Riconoscere un suono alto da uno basso.'
		],
		comeFunziona:
			'Ogni lezione ha tre parti: prima guardi e ascolti, poi provi insieme a noi, alla fine provi da solo.',
		cosaServe: ['Le cuffie o un altoparlante.', 'Un posto tranquillo.'],
		consigliPerAdulti: [
			'Le prime volte state vicini: ascoltare insieme aiuta.',
			'Bastano dieci minuti al giorno.'
		]
	},
	glossario: [
		{ termine: 'Intensità', spiegazione: 'Quanto un suono è forte o piano.' },
		{ termine: 'Durata', spiegazione: 'Quanto tempo dura un suono.' },
		{ termine: 'Altezza', spiegazione: 'Quanto un suono è alto (acuto) o basso (grave).' }
	],
	competenze: [
		{ id: 'intensita', titolo: 'Forte e piano', descrizione: 'Distingue forte e piano.' },
		{ id: 'durata', titolo: 'Lungo e corto', descrizione: 'Distingue lungo e corto.' },
		{
			id: 'altezza',
			titolo: 'Alto e basso',
			descrizione: 'Distingue suoni alti e bassi.',
			prerequisiti: ['intensita']
		}
	],
	attivita: [
		attivita('forte-piano', 'Forte e piano', ['intensita']),
		attivita('lungo-corto', 'Lungo e corto', ['durata']),
		attivita('alto-basso', 'Alto e basso', ['altezza'], {
			prerequisiti: ['forte-piano'],
			tipo: 'gioco',
			minuti: 8
		})
	]
} satisfies ModuloDati;

const ritmo = {
	id: 'ritmo',
	area: 'suoni',
	eta: [7, 10],
	titolo: 'Ritmo',
	descrizione: 'Il battito che sta sotto la musica, e le pause che la fanno respirare.',
	icona: '🥁',
	stato: 'pubblicata',
	introduzione: {
		cosaImparerai: ['Seguire un battito regolare.', 'Riconoscere le pause.'],
		comeFunziona: 'Si ascolta, si batte le mani insieme, poi si prova da soli.',
		cosaServe: [],
		consigliPerAdulti: []
	},
	glossario: [{ termine: 'Battito', spiegazione: 'Il passo regolare della musica.' }],
	competenze: [
		{
			id: 'battito',
			titolo: 'Il battito',
			descrizione: 'Segue un battito regolare.',
			prerequisiti: ['suoni.ascolto.durata']
		},
		{ id: 'pause', titolo: 'Le pause', descrizione: 'Riconosce le pause.' }
	],
	attivita: [
		attivita('battito', 'Il battito', ['battito'], {
			prerequisiti: ['suoni.ascolto.lungo-corto']
		}),
		attivita('pause', 'Le pause', ['pause'], { prerequisiti: ['battito'] })
	]
} satisfies ModuloDati;

const contare = {
	id: 'contare',
	area: 'numeri',
	eta: [6, 7],
	titolo: 'Contare',
	descrizione: 'Contare gli oggetti, fino a dieci e poi a decine.',
	icona: '🧮',
	stato: 'pubblicata',
	introduzione: {
		cosaImparerai: ['Contare fino a dieci.', 'Raggruppare a decine.'],
		comeFunziona: 'Si contano oggetti sullo schermo, uno alla volta.',
		cosaServe: [],
		consigliPerAdulti: ['Contate insieme anche gli oggetti di casa.']
	},
	glossario: [],
	competenze: [
		{ id: 'dieci', titolo: 'Fino a dieci', descrizione: 'Conta fino a dieci.' },
		{
			id: 'decine',
			titolo: 'Le decine',
			descrizione: 'Raggruppa a decine.',
			prerequisiti: ['dieci']
		}
	],
	attivita: [
		// fuori dal percorso dell'area: nella pagina del modulo va in fondo
		attivita('gioco-conta', 'Il gioco della conta', ['dieci'], { tipo: 'gioco', minuti: 3 }),
		attivita('fino-a-dieci', 'Fino a dieci', ['dieci']),
		attivita('decine', 'Le decine', ['decine'], { prerequisiti: ['fino-a-dieci'] })
	]
} satisfies ModuloDati;

export const catalogoVetrina = costruisciCatalogo(
	{ 'numeri/area.ts': { area: numeri }, 'suoni/area.ts': { area: suoni } },
	{
		'numeri/contare/modulo.ts': { modulo: contare },
		'suoni/ascolto/modulo.ts': { modulo: ascolto },
		'suoni/ritmo/modulo.ts': { modulo: ritmo }
	},
	{ includiBozze: true }
);

/** Lo stesso catalogo senza contenuti: per gli stati vuoti. */
export const catalogoVuoto = costruisciCatalogo({}, {}, { includiBozze: true });
