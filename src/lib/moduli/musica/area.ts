import type { AreaDati } from '#lib/core/contenuti/schema.ts';

export const area = {
	id: 'musica',
	titolo: 'Musica',
	descrizione: 'Ascoltare, leggere e cantare le note.',
	icona: '🎵',
	colore: '#1f6b5a',
	// ordine consigliato: lettura e canto si alternano, i giochi dopo le lezioni che li preparano
	percorso: [
		'musica.canto.cosa-sono-le-note',
		'musica.canto.una-alla-volta',
		'musica.canto.tieni-la-nota',
		'musica.canto.su-e-giu',
		'musica.canto.i-salti',
		'musica.canto.eco',
		'musica.canto.scala-cromatica',
		'musica.canto.estensione'
	]
} satisfies AreaDati;
