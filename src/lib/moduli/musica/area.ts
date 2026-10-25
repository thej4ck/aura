import type { AreaDati } from '#lib/core/contenuti/schema.ts';

export const area = {
	id: 'musica',
	titolo: 'Musica',
	descrizione: 'Leggere, ascoltare e cantare la musica, con calma e un passo alla volta.',
	icona: '🎵',
	colore: '#3f5aa8',
	// ordine consigliato, mai un lucchetto: lettura, canto e ritmo si alternano. Il battito arriva presto;
	// la lettura ritmica dopo le prime lezioni di pentagramma, quando il rigo è già familiare. «Eco
	// ritmica» dopo «Battute e tempo»: i suoi giri arrivano a minima, pausa e battute (GIRI_ECO)
	percorso: [
		'musica.canto.cosa-sono-le-note',
		'musica.ritmo.il-battito',
		'musica.pentagramma.linee-e-spazi',
		'musica.pentagramma.chiave-di-violino',
		'musica.canto.una-alla-volta',
		'musica.ritmo.semiminima-e-crome',
		'musica.pentagramma.note-linee-spazi',
		'musica.pentagramma.che-nota-e',
		'musica.canto.tieni-la-nota',
		'musica.ritmo.la-minima',
		'musica.canto.su-e-giu',
		'musica.pentagramma.alto-e-basso',
		'musica.ritmo.la-pausa',
		'musica.ritmo.leggi-e-batti',
		'musica.pentagramma.tagli-addizionali',
		'musica.pentagramma.trovala',
		'musica.ritmo.che-ritmo-e',
		'musica.canto.i-salti',
		'musica.canto.eco',
		'musica.ritmo.battute-e-tempo',
		'musica.ritmo.eco-ritmica',
		'musica.pentagramma.alterazioni',
		'musica.canto.scala-cromatica',
		'musica.pentagramma.leggi-e-canta',
		'musica.canto.estensione'
	]
} satisfies AreaDati;
