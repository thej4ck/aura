import type { ModuloDati } from '#lib/core/contenuti/schema.ts';

// Modulo Canto: cantare intonati, a turni (prima suona il sito, poi canta il bambino).
// Le note dei giochi e la macchina dell'estensione vocale stanno in sequenza.ts (logica pura, provata).

const SCALA_DO = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
const CROMATICA_SALE = [
	'C4',
	'C#4',
	'D4',
	'D#4',
	'E4',
	'F4',
	'F#4',
	'G4',
	'G#4',
	'A4',
	'A#4',
	'B4',
	'C5'
];
const CROMATICA_SCENDE = [
	'C5',
	'B4',
	'Bb4',
	'A4',
	'Ab4',
	'G4',
	'Gb4',
	'F4',
	'E4',
	'Eb4',
	'D4',
	'Db4',
	'C4'
];

/** Riferimenti alle Indicazioni Nazionali per il curricolo (primo ciclo, Musica), parafrasati. */
const IN = {
	altezza: 'Distingue i suoni in base alle loro qualità, come l’altezza: acuto e grave.',
	voce: 'Esplora le possibilità espressive della propria voce, imparando ad ascoltare sé stesso.',
	intonazione: 'Esegue con la voce semplici sequenze melodiche, curando l’intonazione.',
	elementi: 'Riconosce gli elementi di base del linguaggio musicale e li usa nella pratica.',
	notazione: 'Usa forme di notazione codificata per rappresentare i suoni.',
	ascolto: 'Ascolta, memorizza e riproduce brevi frasi melodiche.'
};

export const modulo = {
	id: 'canto',
	area: 'musica',
	eta: [6, 10],
	titolo: 'Canto',
	descrizione: 'Cantare intonati, a turni: prima ascolti, poi canti tu.',
	icona: '🎤',
	stato: 'bozza',
	introduzione: {
		cosaImparerai: [
			'Le sette note e i loro nomi.',
			'Cantare la scala, salendo e scendendo.',
			'Ripetere note vicine e piccoli salti: prima, seconda e terza.',
			'I tasti neri, il semitono e la scala cromatica.',
			'Fin dove arriva la tua voce, senza forzarla.'
		],
		comeFunziona:
			'Si canta a turni: prima suona il sito, poi canti tu. Il microfono ti ascolta e ti dice se andare un po’ più su o un po’ più giù. Il suono del microfono si elabora solo sul dispositivo, mentre canti: non viene mai registrato, salvato o inviato a nessuno.',
		cosaServe: [
			'Un microfono: va bene quello del tablet, del telefono o del computer.',
			'Un ambiente tranquillo, senza musica o televisione accesa.',
			'Un bicchiere d’acqua a portata di mano.'
		],
		consigliPerAdulti: [
			'La voce dei bambini è delicata e non va mai forzata: se una nota è troppo alta o troppo bassa, si lascia stare.',
			'Meglio poco e spesso: qualche minuto al giorno, con una pausa per bere.',
			'Con il raffreddore o il mal di gola, oggi si ascolta soltanto.',
			'Cantate con lui, piano: l’esempio conta più delle parole.',
			'Per correggere bastano «un po’ più su» o «un po’ più giù», come fa il sito: mai «sbagliato».'
		]
	},
	glossario: [
		{
			termine: 'Nota',
			spiegazione: 'Un suono musicale con il suo nome: Do, Re, Mi, Fa, Sol, La, Si.'
		},
		{
			termine: 'Suono acuto',
			spiegazione: 'Un suono alto e sottile, come il fischio di un uccellino.'
		},
		{ termine: 'Suono grave', spiegazione: 'Un suono basso e profondo, come un tamburo grande.' },
		{
			termine: 'Intonazione',
			spiegazione: 'Cantare una nota proprio alla sua altezza: né più su né più giù.'
		},
		{
			termine: 'Scala',
			spiegazione: 'Le note una dopo l’altra, un gradino alla volta, salendo o scendendo.'
		},
		{ termine: 'Gradi congiunti', spiegazione: 'Note vicine nella scala, come Do e Re.' },
		{
			termine: 'Intervallo',
			spiegazione:
				'La distanza tra due note: prima, seconda, terza… Si contano tutte e due le note.'
		},
		{ termine: 'Unisono', spiegazione: 'Due volte la stessa nota: è l’intervallo di prima.' },
		{
			termine: 'Semitono',
			spiegazione:
				'La distanza più piccola tra due note: da un tasto al tasto vicino, bianco o nero.'
		},
		{ termine: 'Tono', spiegazione: 'Due semitoni: per esempio dal Do al Re.' },
		{
			termine: 'Diesis ♯',
			spiegazione: 'Alza la nota di un semitono: Do♯ è il tasto nero dopo il Do.'
		},
		{
			termine: 'Bemolle ♭',
			spiegazione: 'Abbassa la nota di un semitono: Re♭ è il tasto nero prima del Re.'
		},
		{
			termine: 'Scala cromatica',
			spiegazione: 'La scala che usa tutti i tasti, bianchi e neri: un semitono alla volta.'
		},
		{
			termine: 'Arpeggio',
			spiegazione: 'Le note di un accordo cantate una alla volta, come Do, Mi, Sol, Mi, Do.'
		},
		{
			termine: 'Estensione',
			spiegazione:
				'Tutte le note che una voce canta comoda, dalla più grave alla più acuta. La zona dove canta meglio si chiama registro.'
		}
	],
	competenze: [
		{
			id: 'nomi-note',
			titolo: 'I nomi delle note',
			descrizione: 'Conosce le sette note e le dice in ordine, salendo e scendendo.'
		},
		{
			id: 'intonazione',
			titolo: 'Cantare intonato',
			descrizione: 'Ascolta una nota e la canta alla stessa altezza.'
		},
		{
			id: 'scala',
			titolo: 'La scala',
			descrizione: 'Canta le note una dopo l’altra, per gradi vicini, salendo e scendendo.',
			prerequisiti: ['nomi-note']
		},
		{
			id: 'intervalli',
			titolo: 'I salti',
			descrizione: 'Riconosce e canta prima, seconda e terza.',
			prerequisiti: ['scala']
		},
		{
			id: 'semitoni',
			titolo: 'Toni e semitoni',
			descrizione:
				'Trova i tasti neri, distingue semitono e tono, sa quando si scrive il diesis e quando il bemolle.',
			prerequisiti: ['scala']
		}
	],
	attivita: [
		{
			id: 'cosa-sono-le-note',
			titolo: 'Cosa sono le note',
			tipo: 'lezione',
			obiettivo: 'Scopri le sette note e la differenza tra un suono acuto e uno grave.',
			riepilogo:
				'Le note sono sette: Do, Re, Mi, Fa, Sol, La, Si. Un suono acuto fa onde fitte, un suono grave onde larghe.',
			minuti: 5,
			allena: ['nomi-note'],
			traguardi: [IN.altezza, IN.elementi],
			schede: [
				{
					id: 'le-note',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Le note',
					testo: 'La musica è fatta di suoni. Ogni suono musicale ha un nome: si chiama nota.'
				},
				{
					id: 'acuto-grave',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Acuto e grave',
					props: {
						componente: 'onda-sonora',
						etichetta: 'Onde del suono: larghe per il grave, fitte per l’acuto',
						passi: [
							{ testo: 'Il suono è un’onda che viaggia nell’aria, fino alle tue orecchie.' },
							{ testo: 'Un suono grave fa onde larghe e lente, come un tamburo grande.' },
							{ testo: 'Un suono acuto fa onde strette e fitte, come un fischietto.' },
							{ testo: 'Più l’onda è fitta, più il suono è acuto.' }
						]
					}
				},
				{
					id: 'sette-note',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Sette note',
					testo:
						'Le note sono sette: Do, Re, Mi, Fa, Sol, La, Si. Ascoltale: salgono una dopo l’altra.',
					props: { note: SCALA_DO.slice(0, 7), etichette: true, colori: true }
				},
				{
					id: 'do-e-si',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Più grave, più acuto',
					testo: 'Ascolta il Do e poi il Si: il Si è più acuto.',
					props: { note: ['C4', 'B4'], durata: 1, etichette: true, colori: true }
				},
				{
					id: 'tocca-e-senti',
					fase: 'insieme',
					widget: 'tastiera',
					titolo: 'Tocca e senti',
					testo:
						'Tocca i tasti bianchi: ogni tasto è una nota. Guarda dove si scrive sul pentagramma. I tasti neri li scoprirai più avanti.',
					props: { da: 'C4', a: 'B4', soloBianchi: true, etichette: true, colori: true }
				},
				{
					id: 'quante',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Quante sono le note?',
						opzioni: ['Cinque', 'Sette', 'Dieci'],
						corretta: 1,
						suggerimento: 'Contale sulle dita: Do, Re, Mi, Fa, Sol, La, Si.',
						spiegazione: 'Do, Re, Mi, Fa, Sol, La, Si: sono sette.'
					}
				},
				{
					id: 'dopo-il-re',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Quale nota viene dopo il Re?',
						opzioni: ['Il Do', 'Il Mi', 'Il Fa'],
						corretta: 1,
						suggerimento: 'Di’ le note piano, dall’inizio: Do, Re, …',
						spiegazione: 'Do, Re, Mi: dopo il Re viene il Mi.'
					}
				},
				{
					id: 'prima-del-si',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Quale nota viene prima del Si?',
						opzioni: ['Il Sol', 'Il La', 'Il Do'],
						corretta: 1,
						suggerimento: 'Prova a dire le note dal Sol: Sol, …, Si.',
						spiegazione: 'Sol, La, Si: prima del Si viene il La.'
					}
				},
				{
					id: 'onde-fitte',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Un suono acuto fa onde…',
						opzioni: ['Larghe e lente', 'Strette e fitte'],
						corretta: 1,
						suggerimento: 'Pensa al fischietto: le sue onde sono vicine vicine.',
						spiegazione: 'Il suono acuto fa onde strette e fitte.'
					}
				},
				{
					id: 'piu-acuta',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['A4', 'D4'],
						ascolta: true,
						domanda: 'Ascolta: quale nota è più acuta?',
						opzioni: ['La prima', 'La seconda'],
						corretta: 0,
						suggerimento: 'Ascoltale di nuovo: la più acuta è più sottile, come un fischietto.',
						spiegazione: 'La prima nota, il La, è più acuta del Re.'
					}
				}
			]
		},
		{
			id: 'una-alla-volta',
			titolo: 'Una alla volta, poi in fila',
			tipo: 'lezione',
			obiettivo: 'Canta la scala di Do, lenta, salendo e scendendo.',
			riepilogo:
				'La scala va un gradino alla volta: sale dal Do al Do più acuto, poi scende fino al Do.',
			minuti: 6,
			allena: ['scala', 'intonazione'],
			prerequisiti: ['cosa-sono-le-note'],
			traguardi: [IN.intonazione, IN.voce],
			schede: [
				{
					id: 'la-scala',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'La scala',
					testo:
						'Se canti le note una dopo l’altra, dal Do fino al Do più acuto, fai una scala. Come una scala vera: un gradino alla volta.'
				},
				{
					id: 'gradini',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'I gradini',
					props: {
						componente: 'gradini',
						etichetta: 'La scala di Do come otto gradini colorati',
						passi: [
							{ testo: 'La scala di Do ha otto gradini: dal Do al Do più acuto.' },
							{
								testo: 'Salendo: Do, Re, Mi, Fa, Sol, La, Si, Do. Ogni gradino è un po’ più acuto.',
								durataMs: 6500
							},
							{
								testo:
									'Scendendo si torna giù, un gradino alla volta: Do, Si, La, Sol, Fa, Mi, Re, Do.',
								durataMs: 6500
							}
						]
					}
				},
				{
					id: 'sale',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Salendo',
					testo: 'Ascolta la scala che sale, piano piano.',
					props: { note: SCALA_DO, durata: 1, etichette: true, colori: true }
				},
				{
					id: 'scende',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Scendendo',
					testo: 'Ora ascolta la scala che scende.',
					props: { note: SCALA_DO.toReversed(), durata: 1, etichette: true, colori: true }
				},
				{
					id: 'insieme-do-mi',
					fase: 'insieme',
					widget: 'canta-sequenza',
					titolo: 'Cantiamo insieme',
					testo: 'Cominciamo dai primi tre gradini. Ascolta, poi canta Do, Re, Mi.',
					props: { note: ['C4', 'D4', 'E4'], etichette: true, colori: true, item: 'do-mi' }
				},
				{
					id: 'insieme-scala',
					fase: 'insieme',
					widget: 'canta-sequenza',
					titolo: 'Tutta la scala',
					testo:
						'Ora tutta la scala che sale. Canta piano, senza fretta: se ti perdi, ascolta di nuovo.',
					props: { note: SCALA_DO, etichette: true, colori: true, item: 'scala-su' }
				},
				{
					id: 'prova-sale',
					fase: 'prova',
					widget: 'canta-sequenza',
					titolo: 'Sali fino al Sol',
					testo: 'Ascolta e canta: Do, Re, Mi, Fa, Sol.',
					props: { note: SCALA_DO.slice(0, 5), etichette: true, item: 'do-sol' }
				},
				{
					id: 'prova-scende',
					fase: 'prova',
					widget: 'canta-sequenza',
					titolo: 'Scendi dal Sol',
					testo: 'Ora al contrario: Sol, Fa, Mi, Re, Do.',
					props: { note: SCALA_DO.slice(0, 5).toReversed(), etichette: true, item: 'sol-do' }
				},
				{
					id: 'dopo-il-fa',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Nella scala che sale, dopo il Fa viene…',
						opzioni: ['Il Mi', 'Il Sol', 'Il La'],
						corretta: 1,
						suggerimento: 'Canta piano dal Do: Do, Re, Mi, Fa, …',
						spiegazione: 'Fa, Sol: il gradino dopo il Fa è il Sol.'
					}
				},
				{
					id: 'scendendo',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Nella scala che scende, dopo il La viene…',
						opzioni: ['Il Si', 'Il Sol', 'Il Fa'],
						corretta: 1,
						suggerimento: 'Scendere vuol dire tornare indietro di un gradino.',
						spiegazione: 'Scendendo: La, Sol.'
					}
				}
			]
		},
		{
			id: 'tieni-la-nota',
			titolo: 'Tieni la nota',
			tipo: 'gioco',
			obiettivo: 'Ascolta una nota, cantala e tienila finché il cerchio si riempie.',
			riepilogo:
				'Sai tenere una nota: ascolti, canti e resti sulla nota finché il cerchio è pieno.',
			minuti: 4,
			allena: ['intonazione'],
			prerequisiti: ['cosa-sono-le-note'],
			traguardi: [IN.intonazione, IN.voce],
			schede: [
				{
					id: 'come-si-gioca',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Come si gioca',
					testo:
						'Io suono una nota, tu la canti e la tieni, come un palloncino che resta in aria. Se esci dalla nota, il cerchio cala piano: torna sulla nota e continua.'
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'canta-nota',
					titolo: 'Proviamo insieme',
					testo: 'Ascolta il La e tienilo. La freccia ti dice se andare più su o più giù.',
					props: { nota: 'A4', etichette: true, colori: true }
				},
				{
					id: 'gioco',
					fase: 'prova',
					widget: 'tieni-la-nota',
					titolo: 'Tieni la nota',
					testo: 'Ascolta ogni nota e tienila. Puoi fermarti quando vuoi con «Basta così».'
				}
			]
		},
		{
			id: 'su-e-giu',
			titolo: 'Do-Re-Mi su e giù',
			tipo: 'lezione',
			obiettivo: 'Ascolta e ripeti Do, Re, Mi: note vicine che salgono e scendono.',
			riepilogo:
				'Do, Re e Mi sono note vicine: per andare dall’una all’altra si sale o si scende di un gradino.',
			minuti: 5,
			allena: ['scala', 'intonazione'],
			prerequisiti: ['una-alla-volta'],
			traguardi: [IN.intonazione, IN.elementi],
			schede: [
				{
					id: 'vicine',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Note vicine',
					testo:
						'Do, Re e Mi stanno su gradini uno accanto all’altro. Sono note vicine: si chiamano gradi congiunti.'
				},
				{
					id: 'su-e-giu',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Su e giù',
					props: {
						componente: 'gradi-congiunti',
						etichetta: 'Tre gradini, Do, Re e Mi, e la voce che sale e scende',
						passi: [
							{ testo: 'Do, Re, Mi: si sale un gradino alla volta.' },
							{ testo: 'Mi, Re, Do: si scende un gradino alla volta.' },
							{ testo: 'Su e giù: Do, Re, Mi, Re, Do.', durataMs: 5000 }
						]
					}
				},
				{
					id: 'su',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Su',
					testo: 'Do, Re, Mi: le note salgono.',
					props: { note: ['C4', 'D4', 'E4'], etichette: true, colori: true }
				},
				{
					id: 'giu',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Giù',
					testo: 'Mi, Re, Do: le note scendono.',
					props: { note: ['E4', 'D4', 'C4'], etichette: true, colori: true }
				},
				{
					id: 'insieme-su',
					fase: 'insieme',
					widget: 'canta-sequenza',
					titolo: 'Ripeti con me',
					testo: 'Ascolta Do, Re, Mi, poi ripeti. Guarda le note che salgono sul pentagramma.',
					props: { note: ['C4', 'D4', 'E4'], etichette: true, colori: true, item: 'do-re-mi' }
				},
				{
					id: 'insieme-giu',
					fase: 'insieme',
					widget: 'canta-sequenza',
					titolo: 'Ora si scende',
					testo: 'Ascolta Mi, Re, Do, poi ripeti.',
					props: { note: ['E4', 'D4', 'C4'], etichette: true, colori: true, item: 'mi-re-do' }
				},
				{
					id: 'prova-su-giu',
					fase: 'prova',
					widget: 'canta-sequenza',
					titolo: 'Su e giù',
					testo: 'Ascolta e ripeti: Do, Re, Mi, Re, Do.',
					props: { note: ['C4', 'D4', 'E4', 'D4', 'C4'], etichette: true, item: 'do-re-mi-re-do' }
				},
				{
					id: 'prova-giu-su',
					fase: 'prova',
					widget: 'canta-sequenza',
					titolo: 'Giù e su',
					testo: 'Ascolta e ripeti: Mi, Re, Do, Re, Mi.',
					props: { note: ['E4', 'D4', 'C4', 'D4', 'E4'], etichette: true, item: 'mi-re-do-re-mi' }
				},
				{
					id: 'prova-re-mi-re',
					fase: 'prova',
					widget: 'canta-sequenza',
					titolo: 'Re, Mi, Re',
					testo: 'Ascolta e ripeti: un gradino su e uno giù.',
					props: { note: ['D4', 'E4', 'D4'], etichette: true, item: 're-mi-re' }
				},
				{
					id: 'salgono',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Do, Re, Mi: le note…',
						opzioni: ['Salgono', 'Scendono', 'Restano uguali'],
						corretta: 0,
						suggerimento: 'Il Do è il gradino più basso dei tre: da lì dove si va?',
						spiegazione: 'Dal Do al Mi si sale, un gradino alla volta.'
					}
				}
			]
		},
		{
			id: 'i-salti',
			titolo: 'I salti',
			tipo: 'lezione',
			obiettivo: 'Scopri prima, seconda e terza: ascolta due note e ripetile.',
			riepilogo:
				'Prima: la stessa nota due volte. Seconda: il gradino vicino. Terza: si scavalca un gradino.',
			minuti: 6,
			allena: ['intervalli', 'intonazione'],
			prerequisiti: ['su-e-giu'],
			traguardi: [IN.intonazione, IN.elementi],
			schede: [
				{
					id: 'intervallo',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Da una nota all’altra',
					testo:
						'Tra due note c’è una distanza: si chiama intervallo. Per dargli un nome si contano le note.'
				},
				{
					id: 'salti',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Prima, seconda, terza',
					props: {
						componente: 'salti',
						etichetta: 'La voce che resta sul Do, va al Re e salta al Mi',
						passi: [
							{
								testo:
									'Prima, o unisono: la stessa nota due volte. La voce resta sullo stesso gradino.'
							},
							{ testo: 'Seconda: dal Do al Re, il gradino vicino.' },
							{ testo: 'Terza: dal Do al Mi. Il salto scavalca un gradino, il Re.' },
							{
								testo:
									'Si contano tutte le note, la prima e l’ultima comprese: Do, Re, Mi sono tre. È una terza.',
								durataMs: 5500
							}
						]
					}
				},
				{
					id: 'prima',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Prima',
					testo: 'Do e Do: la stessa nota. È una prima, o unisono.',
					props: { note: ['C4', 'C4'], etichette: true, colori: true }
				},
				{
					id: 'seconda',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Seconda',
					testo: 'Do e Re: il gradino vicino. È una seconda.',
					props: { note: ['C4', 'D4'], etichette: true, colori: true }
				},
				{
					id: 'terza',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Terza',
					testo: 'Do e Mi: si scavalca il Re. È una terza.',
					props: { note: ['C4', 'E4'], etichette: true, colori: true }
				},
				{
					id: 'insieme-terza',
					fase: 'insieme',
					widget: 'canta-sequenza',
					titolo: 'Ripeti il salto',
					testo: 'Ascolta il salto di terza, poi ripetilo: Do, Mi.',
					props: { note: ['C4', 'E4'], etichette: true, colori: true, item: 'terza' }
				},
				{
					id: 'prova-seconda',
					fase: 'prova',
					widget: 'canta-sequenza',
					titolo: 'Ripeti le due note',
					testo: 'Ascolta e ripeti: Fa, Sol.',
					props: { note: ['F4', 'G4'], etichette: true, item: 'seconda' }
				},
				{
					id: 'prova-terza',
					fase: 'prova',
					widget: 'canta-sequenza',
					titolo: 'Ripeti il salto',
					testo: 'Ascolta e ripeti: Mi, Sol.',
					props: { note: ['E4', 'G4'], etichette: true, item: 'terza' }
				},
				{
					id: 'prova-prima',
					fase: 'prova',
					widget: 'canta-sequenza',
					titolo: 'La stessa nota',
					testo: 'Ascolta e ripeti: Sol, Sol.',
					props: { note: ['G4', 'G4'], etichette: true, item: 'prima' }
				},
				{
					id: 'che-salto',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Dal Do al Mi: che salto è?',
						opzioni: ['Una prima', 'Una seconda', 'Una terza'],
						corretta: 2,
						suggerimento: 'Conta le note dal Do al Mi, comprese tutte e due: Do, Re, Mi.',
						spiegazione: 'Do, Re, Mi sono tre note: è una terza.'
					}
				},
				{
					id: 'stessa-nota',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Sol e Sol: che salto è?',
						opzioni: ['Una prima, o unisono', 'Una seconda', 'Una terza'],
						corretta: 0,
						suggerimento: 'Le due note sono uguali: si resta sullo stesso gradino.',
						spiegazione: 'La stessa nota due volte è una prima, o unisono.'
					}
				},
				{
					id: 'ascolta-intervallo',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['G4', 'A4'],
						ascolta: true,
						domanda: 'Ascolta e guarda: che intervallo è?',
						opzioni: ['Una prima', 'Una seconda', 'Una terza'],
						corretta: 1,
						suggerimento: 'Conta le note dalla prima all’ultima, comprese tutte e due.',
						spiegazione: 'Sol, La: due note vicine, il gradino accanto. È una seconda.'
					}
				}
			]
		},
		{
			id: 'eco',
			titolo: 'Eco',
			tipo: 'gioco',
			obiettivo: 'Fai l’eco: ascolta poche note e ripetile uguali.',
			riepilogo:
				'Sai fare l’eco: ascolti alcune note e le ripeti, per gradi vicini e con piccoli salti.',
			minuti: 5,
			allena: ['intonazione', 'scala'],
			prerequisiti: ['su-e-giu'],
			traguardi: [IN.ascolto, IN.intonazione],
			schede: [
				{
					id: 'come-si-gioca',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Come si gioca',
					testo:
						'Io canto alcune note, tu fai l’eco: le ripeti uguali, una dopo l’altra. Prima note vicine, poi qualche piccolo salto.'
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'canta-sequenza',
					titolo: 'Proviamo insieme',
					testo: 'Ascolta Do, Re, Mi e fai l’eco.',
					props: { note: ['C4', 'D4', 'E4'], etichette: true, colori: true, item: 'do-re-mi' }
				},
				{
					id: 'gioco',
					fase: 'prova',
					widget: 'eco',
					titolo: 'Fai l’eco',
					testo: 'Ascolta e ripeti. Puoi fermarti quando vuoi con «Basta così».'
				}
			]
		},
		{
			id: 'scala-cromatica',
			titolo: 'La scala cromatica',
			tipo: 'lezione',
			obiettivo: 'Scopri i tasti neri, il semitono e la scala che usa tutti i tasti.',
			riepilogo:
				'Da un tasto al vicino c’è un semitono; due semitoni fanno un tono. Salendo il tasto nero si scrive con il diesis, scendendo con il bemolle.',
			minuti: 7,
			allena: ['semitoni'],
			prerequisiti: ['una-alla-volta', 'musica.pentagramma.alterazioni'],
			traguardi: [IN.elementi, IN.notazione],
			schede: [
				{
					id: 'tasti-neri',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Tasti bianchi e neri',
					testo:
						'Sulla tastiera ci sono tasti bianchi e tasti neri. I bianchi sono le sette note. I neri stanno in mezzo, tra alcune note.'
				},
				{
					id: 'semitono-e-tono',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Semitono e tono',
					props: {
						componente: 'semitoni',
						etichetta: 'Un’ottava di tastiera, dal Do al Do, con i salti di semitono e di tono',
						passi: [
							{ testo: 'Tra il Do e il Re c’è un tasto nero.' },
							{ testo: 'Da un tasto al tasto vicino c’è un semitono: dal Do al tasto nero.' },
							{ testo: 'Due semitoni fanno un tono: dal Do al Re.', durataMs: 5000 },
							{
								testo: 'Tra il Mi e il Fa non c’è il tasto nero: sono già vicini, a un semitono.'
							},
							{ testo: 'Anche tra il Si e il Do non c’è il tasto nero: un altro semitono.' }
						]
					}
				},
				{
					id: 'diesis-e-bemolle',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Diesis e bemolle',
					testo:
						'Il tasto nero ha due nomi. Salendo si usa il diesis ♯: dopo il Do viene il Do♯. Scendendo si usa il bemolle ♭: dopo il Re viene il Re♭.'
				},
				{
					id: 'cromatica-sale',
					fase: 'scopri',
					widget: 'tastiera',
					titolo: 'La scala cromatica sale',
					testo:
						'La scala cromatica usa tutti i tasti, bianchi e neri: un semitono alla volta. Salendo, i tasti neri hanno il diesis.',
					props: { note: CROMATICA_SALE, durata: 0.5, etichette: true }
				},
				{
					id: 'cromatica-scende',
					fase: 'scopri',
					widget: 'tastiera',
					titolo: 'La scala cromatica scende',
					testo: 'Scendendo, i tasti neri hanno il bemolle.',
					props: { note: CROMATICA_SCENDE, durata: 0.5, etichette: true, grafia: 'bemolle' }
				},
				{
					id: 'tocca-diesis',
					fase: 'insieme',
					widget: 'tastiera',
					titolo: 'Saliamo con il diesis',
					testo:
						'Tocca un tasto nero e guarda come si scrive quando si sale: con il diesis, il nome della nota di sotto.',
					props: { grafia: 'diesis', etichette: true }
				},
				{
					id: 'tocca-bemolle',
					fase: 'insieme',
					widget: 'tastiera',
					titolo: 'Scendiamo con il bemolle',
					testo:
						'Ora lo stesso tasto si scrive come quando si scende: con il bemolle, il nome della nota di sopra.',
					props: { grafia: 'bemolle', etichette: true }
				},
				{
					id: 'mi-fa',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Dal Mi al Fa c’è…',
						opzioni: ['Un semitono', 'Un tono'],
						corretta: 0,
						suggerimento: 'Guarda la tastiera: tra il Mi e il Fa c’è un tasto nero?',
						spiegazione: 'Tra il Mi e il Fa non c’è il tasto nero: è un semitono.'
					}
				},
				{
					id: 'do-re',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Dal Do al Re c’è…',
						opzioni: ['Un semitono', 'Un tono'],
						corretta: 1,
						suggerimento: 'Tra il Do e il Re c’è un tasto nero: quanti semitoni fanno?',
						spiegazione: 'Do, Do♯, Re: due semitoni, cioè un tono.'
					}
				},
				{
					id: 'sale-dal-fa',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Salendo dal Fa, il tasto nero si chiama…',
						opzioni: ['Fa♯', 'Fa♭', 'Sol♯'],
						corretta: 0,
						suggerimento: 'Salendo si usa il diesis, con il nome della nota da cui parti.',
						spiegazione: 'Salendo dal Fa si trova il Fa♯.'
					}
				},
				{
					id: 'scende-dal-si',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Scendendo dal Si, il tasto nero si chiama…',
						opzioni: ['Si♯', 'Si♭', 'La♭'],
						corretta: 1,
						suggerimento: 'Scendendo si usa il bemolle, con il nome della nota da cui parti.',
						spiegazione: 'Scendendo dal Si si trova il Si♭.'
					}
				},
				{
					id: 'canta-semitono',
					fase: 'prova',
					widget: 'canta-sequenza',
					titolo: 'Canta il semitono',
					testo: 'Ascolta e ripeti: Mi, Fa, Mi. Sono vicinissime!',
					props: { note: ['E4', 'F4', 'E4'], etichette: true, item: 'mi-fa-mi' }
				}
			]
		},
		{
			id: 'estensione',
			titolo: 'Fin dove arriva la tua voce',
			tipo: 'gioco',
			obiettivo: 'Scopri le note che la tua voce canta comoda, dalla più grave alla più acuta.',
			riepilogo:
				'Hai scoperto fin dove arriva la tua voce, in alto e in basso. Cantando con calma, la voce cresce.',
			minuti: 6,
			allena: ['intonazione'],
			prerequisiti: ['tieni-la-nota'],
			traguardi: [IN.voce, IN.intonazione],
			schede: [
				{
					id: 'la-tua-voce',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'La tua voce',
					testo:
						'Ogni voce arriva fino a una nota in alto e fino a una in basso. Oggi scopriamo dove arriva la tua.'
				},
				{
					id: 'con-gentilezza',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Con gentilezza',
					testo:
						'La voce non si forza mai. Se una nota è troppo alta o troppo bassa, va bene così: ci fermiamo lì. Tieni vicino un bicchiere d’acqua.'
				},
				{
					id: 'gioco',
					fase: 'prova',
					widget: 'estensione',
					titolo: 'Saliamo e scendiamo',
					testo:
						'Canta una nota comoda. Poi ascolta e ripeti le note che salgono, un gradino alla volta.'
				}
			]
		}
	]
} satisfies ModuloDati;

export const widget = {
	tastiera: () => import('./widget/Tastiera.svelte'),
	'tieni-la-nota': () => import('./widget/TieniLaNota.svelte'),
	eco: () => import('./widget/Eco.svelte'),
	estensione: () => import('./widget/Estensione.svelte'),
	// disegni delle spiegazioni animate
	'onda-sonora': () => import('./widget/OndaSonora.svelte'),
	gradini: () => import('./widget/Gradini.svelte'),
	'gradi-congiunti': () => import('./widget/GradiCongiunti.svelte'),
	salti: () => import('./widget/Salti.svelte'),
	semitoni: () => import('./widget/Semitoni.svelte')
};
