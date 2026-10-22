import type { AreaDati } from '#lib/core/contenuti/schema.ts';

export const area = {
	id: 'musica',
	titolo: 'Musica',
	descrizione: 'Leggere le note sul pentagramma e cantarle.',
	icona: '🎵',
	colore: '#1f6b5a',
	// ordine consigliato, mai un lucchetto: lettura e canto si alternano
	percorso: [
		'musica.pentagramma.linee-e-spazi',
		'musica.pentagramma.chiave-di-violino',
		'musica.pentagramma.note-linee-spazi',
		'musica.pentagramma.che-nota-e',
		'musica.pentagramma.alto-e-basso',
		'musica.pentagramma.tagli-addizionali',
		'musica.pentagramma.trovala',
		'musica.pentagramma.alterazioni',
		'musica.pentagramma.leggi-e-canta'
	]
} satisfies AreaDati;
