import type { ModuloDati } from '../../../schema';

/** Modulo di esempio per i widget musicali core: ascolta, staff-tocca, canta-nota, canta-sequenza. */
export const modulo = {
	id: 'suoni',
	area: 'esempio',
	eta: [6, 10],
	titolo: 'Suoni e voce',
	descrizione: 'Un modulo di prova per i widget musicali.',
	icona: '🎵',
	stato: 'pubblicata',
	introduzione: {
		cosaImparerai: ['Ascoltare una nota, trovarla sul pentagramma e cantarla.'],
		comeFunziona: 'Prima ascolti, poi trovi la nota, poi la canti.',
		cosaServe: ['Un microfono, per cantare.'],
		consigliPerAdulti: ['Il microfono serve solo ad ascoltare: niente viene registrato.']
	},
	glossario: [{ termine: 'Nota', spiegazione: 'Un suono con la sua altezza.' }],
	competenze: [{ id: 'la', titolo: 'Il La', descrizione: 'Ascolta, trova e canta il La.' }],
	attivita: [
		{
			id: 'ascolta-e-canta',
			titolo: 'Ascolta, trova e canta',
			tipo: 'lezione',
			obiettivo: 'Ascolta il La, trovalo sul pentagramma e cantalo.',
			riepilogo: 'Il La sta nel secondo spazio. Lo sai ascoltare, trovare e cantare.',
			minuti: 5,
			allena: ['la'],
			traguardi: ['Riproduce con la voce l’altezza di un suono.'],
			schede: [
				{
					id: 'il-la',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Il La',
					testo: 'Questo è il La. Sta nel secondo spazio.',
					props: { note: ['A4'], etichette: true }
				},
				{
					id: 'do-re-mi',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Do, Re, Mi',
					testo: 'Tre note che salgono, una dopo l’altra.',
					props: { note: ['C4', 'D4', 'E4'], etichette: true, colori: true }
				},
				{
					id: 'trova-il-la',
					fase: 'insieme',
					widget: 'staff-tocca',
					testo: 'Trova il La sul pentagramma e toccalo.',
					props: { nota: 'A4', suggerimento: 'Il La sta in uno spazio.' }
				},
				{
					id: 'canta-il-la',
					fase: 'prova',
					widget: 'canta-nota',
					titolo: 'Canta il La',
					testo: 'Prima ascolta, poi canta il La e tienilo.',
					props: { nota: 'A4' }
				},
				{
					id: 'canta-do-re-mi',
					fase: 'prova',
					widget: 'canta-sequenza',
					titolo: 'Canta Do, Re, Mi',
					testo: 'Prima ascolta, poi canta le tre note in fila.',
					props: { note: ['C4', 'D4', 'E4'], etichette: true, item: 'do-re-mi' }
				}
			]
		}
	]
} satisfies ModuloDati;
