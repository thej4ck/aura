import type { AreaDati } from '../../schema';

export const area = {
	id: 'finta',
	titolo: 'Area finta',
	descrizione: 'Solo per i test.',
	icona: '🧪',
	colore: '#336699',
	percorso: ['finta.base.uno', 'finta.extra.ponte', 'finta.base.due', 'finta.base.tre']
} satisfies AreaDati;
