import type { AreaDati } from '#lib/core/contenuti/schema.ts';

export const area = {
	id: 'musica',
	titolo: 'Musica',
	descrizione:
		'Leggere le note sul pentagramma e cantarle intonate, con calma e un passo alla volta.',
	icona: '🎵',
	colore: '#3f5aa8',
	// ordine consigliato, mai un lucchetto: lettura e canto si alternano
	percorso: [
		'musica.canto.cosa-sono-le-note',
		'musica.pentagramma.linee-e-spazi',
		'musica.pentagramma.chiave-di-violino',
		'musica.canto.una-alla-volta',
		'musica.pentagramma.note-linee-spazi',
		'musica.pentagramma.che-nota-e',
		'musica.canto.tieni-la-nota',
		'musica.canto.su-e-giu',
		'musica.pentagramma.alto-e-basso',
		'musica.pentagramma.tagli-addizionali',
		'musica.pentagramma.trovala',
		'musica.canto.i-salti',
		'musica.canto.eco',
		'musica.pentagramma.alterazioni',
		'musica.canto.scala-cromatica',
		'musica.pentagramma.leggi-e-canta',
		'musica.canto.estensione'
	]
} satisfies AreaDati;
