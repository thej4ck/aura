import type { AreaDati } from '#lib/core/contenuti/schema.ts';

export const area = {
	id: 'musica',
	titolo: 'Musica',
	descrizione:
		'Leggere le note sul pentagramma e cantarle intonate, con calma e un passo alla volta.',
	icona: '🎵',
	colore: '#3f5aa8',
	// ponytail: percorso riempito dai moduli Pentagramma e Canto nella fase 3
	percorso: []
} satisfies AreaDati;
