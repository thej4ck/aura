import type { AreaDati } from '../../schema';

/** Area di esempio per /dev e per il test e2e del motore: non fa parte dei contenuti reali. */
export const area = {
	id: 'esempio',
	titolo: 'Area di esempio',
	descrizione: 'Contenuti di prova per il motore delle attività.',
	icona: '🧪',
	colore: '#1f6b5a',
	percorso: ['esempio.linee.cinque-linee', 'esempio.linee.spazi']
} satisfies AreaDati;
