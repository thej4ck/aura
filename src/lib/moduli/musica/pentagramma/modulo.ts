import type { ModuloDati } from '#lib/core/contenuti/schema.ts';

// Traguardi delle Indicazioni Nazionali per il primo ciclo (Musica, fine della primaria), parafrasati;
// dove è scritto, un obiettivo di apprendimento di fine primaria.
const NOTAZIONE = 'Usa forme di notazione codificate per rappresentare e leggere i suoni.';
const ELEMENTI = 'Riconosce gli elementi di base del linguaggio musicale e li usa nella pratica.';
const ALTEZZA =
	'Esplora e distingue i suoni secondo le loro qualità, come l’altezza: acuto e grave.';
const VOCE =
	'Esplora le possibilità della voce imparando ad ascoltare sé stesso; canta curando l’intonazione (obiettivo di fine primaria).';

const LINEA_O_SPAZIO = ['Su una linea', 'In uno spazio'];
const PRIMA_O_SECONDA = ['La prima, a sinistra', 'La seconda, a destra'];
const SEGNI = ['Diesis ♯', 'Bemolle ♭', 'Bequadro ♮'];

export const modulo = {
	id: 'pentagramma',
	area: 'musica',
	eta: [6, 10],
	titolo: 'Pentagramma',
	descrizione: 'Leggere le note scritte sulle cinque linee, al tuo ritmo.',
	icona: '🎼',
	stato: 'pubblicata',
	introduzione: {
		cosaImparerai: [
			'Come sono fatti il pentagramma e la chiave di violino.',
			'I nomi delle note sulle linee, negli spazi e sui tagli addizionali.',
			'Che una nota scritta più in alto ha un suono più acuto.',
			'Cosa fanno il diesis, il bemolle e il bequadro.',
			'Leggere le note al tuo ritmo, e poi cantarle.'
		],
		comeFunziona:
			'Ogni lezione ha tre parti: prima guardi e ascolti, poi provi insieme a noi con qualche aiuto, poi provi da solo. I giochi vanno al tuo ritmo: non c’è mai un tempo che scade.',
		cosaServe: [
			'Un dito, o la tastiera, per scegliere.',
			'L’audio acceso, per sentire le note.',
			'Per «Leggi e canta» un microfono. Niente viene registrato.'
		],
		consigliPerAdulti: [
			'Bastano pochi minuti al giorno: meglio poco e spesso.',
			'Lasciate sbagliare: il feedback dice cosa fare, non giudica.',
			'Nel gioco «Che nota è?» le note più difficili tornano più spesso, finché diventano facili.',
			'Nel canto la voce non si forza mai: «Basta così» è sempre a portata di mano.'
		]
	},
	glossario: [
		{ termine: 'Pentagramma', spiegazione: 'Le cinque linee su cui si scrive la musica.' },
		{
			termine: 'Linea',
			spiegazione:
				'Una delle cinque righe del pentagramma. Si contano dal basso: dalla prima alla quinta.'
		},
		{
			termine: 'Spazio',
			spiegazione: 'Il posto tra due linee. Gli spazi sono quattro e si contano dal basso.'
		},
		{
			termine: 'Chiave di violino',
			spiegazione:
				'Il segno all’inizio del pentagramma. Il suo ricciolo avvolge la seconda linea, dove c’è il Sol: per questo si chiama anche chiave di Sol.'
		},
		{
			termine: 'Nota',
			spiegazione: 'Un suono scritto sul pentagramma: sta su una linea oppure in uno spazio.'
		},
		{
			termine: 'Acuto e grave',
			spiegazione:
				'Un suono acuto è sottile, come un fischietto; un suono grave è profondo, come un tamburo grande. Sul pentagramma le note acute stanno più in alto.'
		},
		{
			termine: 'Taglio addizionale',
			spiegazione:
				'Una lineetta in più, sotto o sopra il pentagramma, per scrivere le note troppo basse o troppo alte.'
		},
		{
			termine: 'Semitono',
			spiegazione:
				'La distanza più piccola tra due note: sul pianoforte, da un tasto a quello subito accanto.'
		},
		{
			termine: 'Alterazione',
			spiegazione:
				'Un segno scritto prima della nota: la alza o la abbassa di un semitono, oppure annulla un segno di prima.'
		},
		{ termine: 'Diesis ♯', spiegazione: 'Alza la nota di un semitono: Fa diesis.' },
		{ termine: 'Bemolle ♭', spiegazione: 'Abbassa la nota di un semitono: Si bemolle.' },
		{
			termine: 'Bequadro ♮',
			spiegazione: 'Annulla il diesis o il bemolle: la nota torna naturale.'
		}
	],
	competenze: [
		{
			id: 'linee-spazi',
			titolo: 'Linee e spazi',
			descrizione:
				'Conta le cinque linee e i quattro spazi dal basso e vede se una nota è su una linea o in uno spazio.'
		},
		{
			id: 'chiave-violino',
			titolo: 'La chiave di violino',
			descrizione: 'Riconosce la chiave di violino e sa che indica il Sol sulla seconda linea.',
			prerequisiti: ['linee-spazi']
		},
		{
			id: 'note-linee',
			titolo: 'Le note sulle linee',
			descrizione: 'Legge le note sulle linee: Mi, Sol, Si, Re, Fa.',
			prerequisiti: ['chiave-violino', 'musica.canto.nomi-note']
		},
		{
			id: 'note-spazi',
			titolo: 'Le note negli spazi',
			descrizione: 'Legge le note negli spazi: Fa, La, Do, Mi.',
			prerequisiti: ['chiave-violino', 'musica.canto.nomi-note']
		},
		{
			id: 'acuto-grave',
			titolo: 'Acuto e grave',
			descrizione: 'Collega la posizione sul pentagramma al suono: più in alto, più acuto.',
			prerequisiti: ['linee-spazi']
		},
		{
			id: 'tagli',
			titolo: 'I tagli addizionali',
			descrizione: 'Legge il Do sotto il pentagramma e il La e il Si sopra, sui tagli addizionali.',
			prerequisiti: ['note-linee', 'note-spazi']
		},
		{
			id: 'alterazioni',
			titolo: 'Le alterazioni',
			descrizione:
				'Riconosce diesis, bemolle e bequadro e sa che spostano la nota di un semitono, o la riportano naturale.',
			prerequisiti: ['note-linee', 'note-spazi']
		},
		{
			id: 'lettura',
			titolo: 'Leggere le note',
			descrizione: 'Legge con sicurezza le note dal Do sotto il pentagramma al Si sopra.',
			prerequisiti: ['note-linee', 'note-spazi']
		}
	],
	attivita: [
		{
			id: 'linee-e-spazi',
			titolo: 'Le 5 linee e i 4 spazi',
			tipo: 'lezione',
			obiettivo: 'Scopri il pentagramma: cinque linee e quattro spazi, che si contano dal basso.',
			riepilogo:
				'Il pentagramma ha cinque linee e quattro spazi, e si contano dal basso. Una nota sta su una linea oppure in uno spazio.',
			minuti: 6,
			allena: ['linee-spazi'],
			traguardi: [NOTAZIONE, ELEMENTI],
			schede: [
				{
					id: 'il-pentagramma',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Il pentagramma',
					testo: 'La musica si scrive su cinque linee. Insieme si chiamano pentagramma.',
					props: {
						componente: 'disegno-linee-spazi',
						passi: [
							{ testo: 'Ecco le cinque linee del pentagramma.' },
							{ testo: 'Le linee si contano dal basso: prima, seconda, terza, quarta, quinta.' },
							{ testo: 'Tra una linea e l’altra c’è uno spazio. Gli spazi sono quattro.' },
							{ testo: 'Anche gli spazi si contano dal basso: primo, secondo, terzo, quarto.' }
						]
					}
				},
				{
					id: 'linea-o-spazio',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Sulla linea o nello spazio',
					props: {
						componente: 'disegno-linea-spazio',
						passi: [
							{ testo: 'Una nota può stare su una linea: la linea la attraversa nel mezzo.' },
							{ testo: 'Oppure può stare in uno spazio, tra due linee.' },
							{ testo: 'Linea o spazio? È la prima cosa da guardare.' }
						]
					}
				},
				{
					id: 'insieme-terza-linea',
					fase: 'insieme',
					widget: 'tocca-rigo',
					titolo: 'Proviamo insieme',
					testo: 'Metti il dito sulla linea più in basso e sali, contando.',
					props: { passo: 4, suggerimento: 'La terza linea sta proprio nel mezzo.' }
				},
				{
					id: 'insieme-linea-o-spazio',
					fase: 'insieme',
					widget: 'guarda-e-scegli',
					props: {
						note: ['A4'],
						domanda: 'Questa nota è su una linea o in uno spazio?',
						opzioni: LINEA_O_SPAZIO,
						corretta: 1,
						suggerimento:
							'Guarda se una linea passa in mezzo alla nota, oppure se la nota sta tra due linee.',
						spiegazione: 'La nota sta tra due linee: è in uno spazio.'
					}
				},
				{ id: 'primo-spazio', fase: 'prova', widget: 'tocca-rigo', props: { passo: 1 } },
				{ id: 'quinta-linea', fase: 'prova', widget: 'tocca-rigo', props: { passo: 8 } },
				{
					id: 'nota-sulla-linea',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['G4'],
						domanda: 'Questa nota è su una linea o in uno spazio?',
						opzioni: LINEA_O_SPAZIO,
						corretta: 0,
						suggerimento: 'Guarda se una linea passa in mezzo alla nota.'
					}
				},
				{ id: 'terzo-spazio', fase: 'prova', widget: 'tocca-rigo', props: { passo: 5 } },
				{
					id: 'quanti-spazi',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Quanti spazi ci sono tra le cinque linee?',
						opzioni: ['Tre', 'Quattro', 'Cinque'],
						corretta: 1,
						suggerimento:
							'Immagina le cinque linee: tra la prima e la seconda c’è il primo spazio. Continua a contare fino alla quinta.'
					}
				}
			]
		},
		{
			id: 'chiave-di-violino',
			titolo: 'La chiave di violino',
			tipo: 'lezione',
			obiettivo: 'Scopri la chiave di violino e la nota che ti indica: il Sol sulla seconda linea.',
			riepilogo:
				'La chiave di violino avvolge la seconda linea. Lì c’è il Sol: per questo si chiama anche chiave di Sol.',
			minuti: 5,
			allena: ['chiave-violino'],
			prerequisiti: ['linee-e-spazi'],
			traguardi: [NOTAZIONE, ELEMENTI],
			schede: [
				{
					id: 'la-chiave',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'La chiave di violino',
					props: {
						componente: 'disegno-chiave',
						passi: [
							{ testo: 'All’inizio del pentagramma si scrive una chiave.' },
							{ testo: 'Guarda la seconda linea, contando dal basso.' },
							{
								testo: 'Ecco la chiave di violino: si disegna con un grande ricciolo.',
								durataMs: 5000
							},
							{ testo: 'Il ricciolo avvolge proprio la seconda linea.' },
							{
								testo: 'Sulla seconda linea c’è il Sol. Per questo si chiama anche chiave di Sol.',
								durataMs: 5000
							}
						]
					}
				},
				{
					id: 'riferimento',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Il punto di partenza',
					testo:
						'Il Sol è il tuo punto di riferimento. Partendo da lui trovi le altre note: un gradino sopra, un gradino sotto.',
					props: {
						illustrazione: {
							componente: 'disegno-chiave',
							alt: 'La chiave di violino con il ricciolo attorno alla seconda linea, e il Sol su quella linea.'
						}
					}
				},
				{
					id: 'ascolta-sol',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Ascolta il Sol',
					props: { note: ['G4'], etichette: true, colori: true }
				},
				{
					id: 'insieme-sol',
					fase: 'insieme',
					widget: 'staff-tocca',
					titolo: 'Proviamo insieme',
					props: {
						nota: 'G4',
						selezionabili: [0, 8],
						suggerimento:
							'Cerca la linea avvolta dal ricciolo della chiave: è la seconda dal basso.'
					}
				},
				{
					id: 'quale-linea',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Quale linea avvolge il ricciolo della chiave di violino?',
						opzioni: ['La prima', 'La seconda', 'La terza'],
						corretta: 1,
						suggerimento:
							'Ricorda l’animazione: il ricciolo gira attorno alla linea del Sol. Contando dal basso, qual è?'
					}
				},
				{
					id: 'altro-nome',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Come si chiama anche la chiave di violino?',
						opzioni: ['Chiave di Do', 'Chiave di Sol', 'Chiave di Mi'],
						corretta: 1,
						suggerimento: 'Pensa alla nota che sta sulla seconda linea.'
					}
				},
				{
					id: 'tocca-sol',
					fase: 'prova',
					widget: 'staff-tocca',
					props: {
						nota: 'G4',
						selezionabili: [0, 8],
						suggerimento: 'Il Sol sta dove si avvolge il ricciolo.'
					}
				},
				{
					id: 'che-nota',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['G4'],
						domanda: 'Che nota c’è sulla seconda linea?',
						opzioniNote: ['E4', 'G4', 'B4'],
						corretta: 1,
						suggerimento: 'È la nota della chiave di violino.'
					}
				}
			]
		},
		{
			id: 'note-linee-spazi',
			titolo: 'Note sulle linee e negli spazi',
			tipo: 'lezione',
			obiettivo:
				'Impara i nomi delle note: sulle linee Mi, Sol, Si, Re, Fa; negli spazi Fa, La, Do, Mi.',
			riepilogo:
				'Sulle linee, dal basso: Mi, Sol, Si, Re, Fa. Negli spazi, dal basso: Fa, La, Do, Mi.',
			minuti: 8,
			allena: ['note-linee', 'note-spazi'],
			prerequisiti: ['chiave-di-violino', 'musica.canto.cosa-sono-le-note'],
			traguardi: [NOTAZIONE, ELEMENTI],
			schede: [
				{
					id: 'linee',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Le note sulle linee',
					testo: 'Tieni l’audio acceso: a ogni passo senti la nota.',
					props: {
						componente: 'disegno-note-linee',
						passi: [
							{ testo: 'Sulla prima linea c’è il Mi.' },
							{ testo: 'Sulla seconda linea c’è il Sol: la linea della chiave.' },
							{ testo: 'Sulla terza linea c’è il Si.' },
							{ testo: 'Sulla quarta linea c’è il Re.' },
							{
								testo: 'Sulla quinta linea c’è il Fa. Le linee: Mi, Sol, Si, Re, Fa.',
								durataMs: 6000
							}
						]
					}
				},
				{
					id: 'spazi',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Le note negli spazi',
					props: {
						componente: 'disegno-note-spazi',
						passi: [
							{ testo: 'Nel primo spazio c’è il Fa.' },
							{ testo: 'Nel secondo spazio c’è il La.' },
							{ testo: 'Nel terzo spazio c’è il Do.' },
							{ testo: 'Nel quarto spazio c’è il Mi. Gli spazi: Fa, La, Do, Mi.', durataMs: 6000 }
						]
					}
				},
				{
					id: 'tutte',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Linea, spazio, linea, spazio',
					testo:
						'Dal basso verso l’alto le note salgono un gradino alla volta: linea, spazio, linea…',
					props: {
						note: ['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'],
						durata: 0.6,
						etichette: true,
						colori: true
					}
				},
				{
					id: 'insieme-si',
					fase: 'insieme',
					widget: 'guarda-e-scegli',
					titolo: 'Proviamo insieme',
					props: {
						note: ['B4'],
						domanda: 'Che nota è?',
						opzioniNote: ['G4', 'B4', 'D5'],
						corretta: 1,
						suggerimento: 'È sulla terza linea. Conta le linee dal basso: Mi, Sol, Si.'
					}
				},
				{
					id: 'insieme-do',
					fase: 'insieme',
					widget: 'staff-tocca',
					props: {
						nota: 'C5',
						selezionabili: [0, 8],
						suggerimento: 'Gli spazi, dal basso, sono Fa, La, Do, Mi: il Do è nel terzo.'
					}
				},
				{
					id: 're',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['D5'],
						domanda: 'Che nota è?',
						opzioniNote: ['B4', 'D5', 'F5'],
						corretta: 1,
						suggerimento: 'Conta le linee dal basso: Mi, Sol, Si, Re, Fa.'
					}
				},
				{
					id: 'la',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['A4'],
						domanda: 'Che nota è?',
						opzioniNote: ['F4', 'A4', 'C5'],
						corretta: 1,
						suggerimento: 'Conta gli spazi dal basso: Fa, La, Do, Mi.'
					}
				},
				{
					id: 'tocca-si',
					fase: 'prova',
					widget: 'staff-tocca',
					props: { nota: 'B4', selezionabili: [0, 8] }
				},
				{
					id: 'mi-in-alto',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['E5'],
						domanda: 'Che nota è?',
						opzioniNote: ['C5', 'E5', 'F5'],
						corretta: 1,
						suggerimento: 'È nell’ultimo spazio in alto, il quarto: Fa, La, Do, …'
					}
				},
				{
					id: 'tocca-re',
					fase: 'prova',
					widget: 'staff-tocca',
					props: { nota: 'D5', selezionabili: [0, 8] }
				}
			]
		},
		{
			id: 'che-nota-e',
			titolo: 'Che nota è?',
			tipo: 'gioco',
			obiettivo: 'Leggi la nota sul pentagramma e tocca il suo nome. Al tuo ritmo, senza fretta.',
			riepilogo:
				'Hai letto le note sul pentagramma. Quelle che ti sembrano difficili tornano più spesso, finché diventano facili.',
			minuti: 5,
			// non 'note-spazi': si comincia con le sole note sulle linee (Mi, Sol, Si)
			allena: ['note-linee', 'lettura', 'musica.canto.nomi-note'],
			prerequisiti: ['note-linee-spazi'],
			traguardi: [NOTAZIONE, ELEMENTI],
			schede: [
				{
					id: 'come-si-gioca',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Come si gioca',
					testo:
						'Sul pentagramma compare una nota: tocca il suo nome. Si comincia con tre note, Mi, Sol e Si. Quando le leggi bene, ne arriva una nuova.'
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'guarda-e-scegli',
					titolo: 'Proviamo insieme',
					props: {
						note: ['G4'],
						domanda: 'Che nota è?',
						opzioniNote: ['E4', 'G4', 'B4'],
						corretta: 1,
						suggerimento: 'Le linee dal basso sono Mi, Sol, Si: questa è sulla seconda.'
					}
				},
				{
					id: 'gioco',
					fase: 'prova',
					widget: 'che-nota-e',
					titolo: 'Leggi le note',
					testo: 'Quando vuoi smettere, tocca «Ho finito».'
				}
			]
		},
		{
			id: 'alto-e-basso',
			titolo: 'Più in alto, più acuto',
			tipo: 'lezione',
			obiettivo: 'Scopri che una nota scritta più in alto sul pentagramma ha un suono più acuto.',
			riepilogo:
				'Più una nota è in alto sul pentagramma, più il suo suono è acuto. Più è in basso, più è grave.',
			minuti: 5,
			allena: ['acuto-grave'],
			prerequisiti: ['linee-e-spazi', 'musica.canto.su-e-giu'],
			traguardi: [ALTEZZA, NOTAZIONE],
			schede: [
				{
					id: 'acuto-e-grave',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Acuto e grave',
					testo:
						'Un suono acuto è sottile, come il cinguettio di un uccellino. Un suono grave è profondo, come il brontolio di un orso.'
				},
				{
					id: 'nota-che-sale',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'La nota che sale',
					testo: 'Tieni l’audio acceso: a ogni passo senti la nota.',
					props: {
						componente: 'disegno-nota-sale',
						passi: [
							{ testo: 'Ecco il Do, in basso. Ascolta: è un suono grave.' },
							{ testo: 'La nota sale sul pentagramma, e anche il suono sale.' },
							{ testo: 'Sale ancora: il suono diventa più acuto.' },
							{ testo: 'Ora è il Do in alto: un suono acuto.' },
							{
								testo:
									'Ascolta la prima e l’ultima: più in alto sul pentagramma, più acuto il suono.',
								durataMs: 5000
							}
						]
					}
				},
				{
					id: 'scala',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Una scala che sale',
					testo: 'Segui con gli occhi la nota che suona: sale un gradino alla volta.',
					props: { note: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], durata: 0.6 }
				},
				{
					id: 'insieme-piu-acuta',
					fase: 'insieme',
					widget: 'guarda-e-scegli',
					titolo: 'Proviamo insieme',
					props: {
						note: ['E4', 'C5'],
						ascolta: true,
						domanda: 'Quale nota suona più acuta?',
						opzioni: PRIMA_O_SECONDA,
						corretta: 1,
						suggerimento: 'Guarda quale sta più in alto, poi ascoltale.',
						spiegazione: 'La seconda sta più in alto: il suo suono è più acuto.'
					}
				},
				{
					id: 'piu-acuta',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['A4', 'F4'],
						ascolta: true,
						domanda: 'Quale nota suona più acuta?',
						opzioni: PRIMA_O_SECONDA,
						corretta: 0,
						suggerimento: 'Più in alto sul pentagramma vuol dire più acuta.'
					}
				},
				{
					id: 'piu-grave',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['D5', 'G4'],
						ascolta: true,
						domanda: 'Quale nota suona più grave?',
						opzioni: PRIMA_O_SECONDA,
						corretta: 1,
						suggerimento: 'Grave vuol dire profondo: cerca la nota più in basso.'
					}
				},
				{
					id: 'piu-acuta-ancora',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['C4', 'B4'],
						ascolta: true,
						domanda: 'Quale nota suona più acuta?',
						opzioni: PRIMA_O_SECONDA,
						corretta: 1,
						suggerimento: 'Guarda quale sta più in alto, poi ascoltale.'
					}
				},
				{
					id: 'scritta-in-basso',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Una nota scritta più in basso suona…',
						opzioni: ['Più acuta', 'Più grave'],
						corretta: 1,
						suggerimento:
							'Pensa alla scala: salendo il suono diventa più acuto, scendendo più grave.'
					}
				}
			]
		},
		{
			id: 'tagli-addizionali',
			titolo: 'I tagli addizionali',
			tipo: 'lezione',
			obiettivo:
				'Scopri le note fuori dal pentagramma: il Do sotto, il La e il Si sopra, con i tagli addizionali.',
			riepilogo:
				'Per le note troppo basse o troppo alte si aggiunge un taglio addizionale. Sotto c’è il Do, sopra il La e il Si.',
			minuti: 6,
			allena: ['tagli'],
			prerequisiti: ['note-linee-spazi'],
			traguardi: [NOTAZIONE, ELEMENTI],
			schede: [
				{
					id: 'fuori-dal-pentagramma',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Note fuori dal pentagramma',
					testo:
						'Alcune note sono troppo basse o troppo alte per stare sulle cinque linee. Allora si aggiunge una lineetta in più: il taglio addizionale.'
				},
				{
					id: 'sotto-e-sopra',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Sotto e sopra',
					props: {
						componente: 'disegno-tagli',
						passi: [
							{ testo: 'Sotto la prima linea, dove c’è il Mi, resta uno spazio: lì c’è il Re.' },
							{ testo: 'Più giù serve un taglio addizionale. Sul taglio c’è il Do.' },
							{ testo: 'Sopra la quinta linea, dove c’è il Fa, c’è il Sol.' },
							{ testo: 'Più su serve un taglio. Sul taglio c’è il La.' },
							{ testo: 'Appena sopra il taglio c’è il Si.' },
							{
								testo: 'Il Do sotto, il La e il Si sopra: i tagli si scrivono solo dove servono.',
								durataMs: 5000
							}
						]
					}
				},
				{
					id: 'ascolta-tagli',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Ascolta: Do, La, Si',
					props: { note: ['C4', 'A5', 'B5'], etichette: true, colori: true }
				},
				{
					id: 'insieme-do',
					fase: 'insieme',
					widget: 'staff-tocca',
					titolo: 'Proviamo insieme',
					props: {
						nota: 'C4',
						domanda: 'Tocca il Do sotto il pentagramma',
						suggerimento: 'Il Do sotto sta sul taglio, più giù della prima linea.'
					}
				},
				{
					id: 'la-sopra',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['A5'],
						domanda: 'Che nota è?',
						opzioniNote: ['F5', 'G5', 'A5'],
						corretta: 2,
						suggerimento: 'Parti dalla quinta linea, il Fa, e sali: Sol, poi La sul taglio.'
					}
				},
				{
					id: 'do-sotto',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['C4'],
						domanda: 'Che nota è?',
						opzioniNote: ['C4', 'D4', 'E4'],
						corretta: 0,
						suggerimento: 'Parti dalla prima linea, il Mi, e scendi: Re, poi Do sul taglio.'
					}
				},
				{
					id: 'si-sopra',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['B5'],
						domanda: 'Che nota è?',
						opzioniNote: ['G5', 'A5', 'B5'],
						corretta: 2,
						suggerimento: 'Sul taglio c’è il La: la nota appena sopra è quella che viene dopo.'
					}
				},
				{
					id: 'tocca-la',
					fase: 'prova',
					widget: 'staff-tocca',
					props: {
						nota: 'A5',
						domanda: 'Tocca il La sopra il pentagramma'
					}
				}
			]
		},
		{
			id: 'trovala',
			titolo: 'Trovala sul pentagramma',
			tipo: 'gioco',
			obiettivo:
				'Leggi il nome di una nota, ascoltala se vuoi, e trova il suo posto sul pentagramma.',
			riepilogo:
				'Hai trovato le note sul pentagramma partendo dal nome, anche quelle sui tagli addizionali.',
			minuti: 5,
			allena: ['lettura', 'tagli'],
			prerequisiti: ['tagli-addizionali'],
			traguardi: [NOTAZIONE, ALTEZZA],
			schede: [
				{
					id: 'come-si-gioca',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Come si gioca',
					testo:
						'Leggi il nome della nota e tocca il suo posto. Se vuoi, prima ascoltala. Quando lo stesso nome sta in due posti, ti diciamo se cercare quello più in alto o quello più in basso.'
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'staff-tocca',
					titolo: 'Proviamo insieme',
					props: {
						nota: 'F5',
						domanda: 'Tocca il Fa più in alto',
						selezionabili: [-2, 11],
						suggerimento: 'Il Fa più in alto sta sull’ultima linea, la quinta.'
					}
				},
				{
					id: 'gioco',
					fase: 'prova',
					widget: 'trovala',
					titolo: 'Trovala!',
					props: { quante: 6 }
				}
			]
		},
		{
			id: 'alterazioni',
			titolo: 'Diesis, bemolle e bequadro',
			tipo: 'lezione',
			obiettivo:
				'Scopri il diesis e il bemolle, che alzano o abbassano una nota di un semitono, e il bequadro, che li annulla.',
			riepilogo:
				'Il diesis ♯ alza la nota di un semitono, il bemolle ♭ la abbassa di un semitono, il bequadro ♮ annulla il segno. Nel Canto li ritroverai tutti nella scala cromatica.',
			minuti: 8,
			allena: ['alterazioni'],
			prerequisiti: ['note-linee-spazi'],
			traguardi: [NOTAZIONE, ALTEZZA, ELEMENTI],
			schede: [
				{
					id: 'il-semitono',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Il semitono',
					testo:
						'Sul pianoforte, da un tasto a quello subito accanto, bianco o nero, c’è un semitono. È il passo più piccolo tra due note.'
				},
				{
					id: 'tre-segni',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Tre segni',
					testo: 'Guarda la nota sul pentagramma e il suo tasto sul pianoforte.',
					props: {
						componente: 'disegno-semitono',
						passi: [
							{ testo: 'Ecco il Fa, sul pentagramma e sul pianoforte.' },
							{
								testo:
									'Il diesis ♯ alza la nota di un semitono: è il tasto nero subito a destra. Si legge Fa diesis.',
								durataMs: 6000
							},
							{ testo: 'Ecco il Si.' },
							{
								testo:
									'Il bemolle ♭ abbassa la nota di un semitono: è il tasto nero subito a sinistra. Si legge Si bemolle.',
								durataMs: 6000
							},
							{
								testo: 'Il bequadro ♮ annulla il bemolle: la nota torna Si, il tasto bianco.',
								durataMs: 5000
							}
						]
					}
				},
				{
					id: 'dove-si-scrive',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Prima si scrive, dopo si legge',
					testo:
						'Il segno si scrive prima della nota, sulla sua stessa linea o nel suo stesso spazio. Ma si legge dopo il nome: Fa diesis, Si bemolle.'
				},
				{
					id: 'scala-cromatica',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Tutti i semitoni',
					testo:
						'Dal Do al Do, un semitono alla volta: è la scala cromatica. La canterai nel modulo Canto.',
					props: {
						note: [
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
						],
						durata: 0.45,
						etichette: true
					}
				},
				{
					id: 'insieme-segno',
					fase: 'insieme',
					widget: 'guarda-e-scegli',
					titolo: 'Proviamo insieme',
					props: {
						note: ['F#4'],
						domanda: 'Che segno c’è davanti alla nota?',
						opzioni: SEGNI,
						corretta: 0,
						suggerimento: 'Il diesis assomiglia a un piccolo cancelletto: #.'
					}
				},
				{
					id: 'il-diesis',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Il diesis ♯ rende la nota…',
						opzioni: ['Più acuta di un semitono', 'Più grave di un semitono'],
						corretta: 0,
						suggerimento:
							'Il diesis porta al tasto subito a destra: sul pianoforte, verso destra i suoni sono più acuti.'
					}
				},
				{
					id: 'si-bemolle',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['Bb4'],
						domanda: 'Che nota è?',
						opzioniNote: ['B4', 'Bb4', 'A4'],
						corretta: 1,
						suggerimento: 'Guarda la linea della nota, poi il segno davanti: è un bemolle ♭.'
					}
				},
				{
					id: 'il-bequadro',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['Bb4', 'B4'],
						domanda: 'Che segno c’è davanti alla seconda nota?',
						opzioni: ['Diesis', 'Bemolle', 'Bequadro'],
						corretta: 2,
						suggerimento: 'Questo segno annulla il bemolle della prima nota.'
					}
				},
				{
					id: 'semitono-su',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['G4', 'G#4'],
						ascolta: true,
						domanda: 'Rispetto alla prima, la seconda nota è…',
						opzioni: ['Più acuta di un semitono', 'Più grave di un semitono'],
						corretta: 0,
						suggerimento: 'Guarda il segno davanti alla seconda nota, poi ascoltale.'
					}
				},
				{
					id: 'semitono-giu',
					fase: 'prova',
					widget: 'guarda-e-scegli',
					props: {
						note: ['B4', 'Bb4'],
						ascolta: true,
						domanda: 'Rispetto alla prima, la seconda nota è…',
						opzioni: ['Più acuta di un semitono', 'Più grave di un semitono'],
						corretta: 1,
						suggerimento: 'Guarda il segno davanti alla seconda nota, poi ascoltale.'
					}
				}
			]
		},
		{
			id: 'leggi-e-canta',
			titolo: 'Leggi e canta',
			tipo: 'gioco',
			obiettivo:
				'Leggi alcune note sul pentagramma e cantale, partendo dal Do: il microfono ti dice se ci sei.',
			riepilogo:
				'Hai letto le note e le hai cantate partendo dal Do: proprio come fanno i musicisti.',
			minuti: 6,
			allena: ['lettura', 'musica.canto.intonazione'],
			prerequisiti: ['che-nota-e', 'musica.canto.tieni-la-nota'],
			traguardi: [VOCE, NOTAZIONE],
			schede: [
				{
					id: 'come-si-gioca',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Come si gioca',
					testo:
						'Vedi alcune note scritte, ma ne senti solo una: il Do, la nota di partenza. È la prima nota, più piccola e grigia. Canta il Do, poi leggi le altre note e cantale, una dopo l’altra. Canta piano: la voce non si forza mai. Puoi fermarti quando vuoi con «Basta così».'
				},
				{
					id: 'insieme-ascolta',
					fase: 'insieme',
					widget: 'canta-sequenza',
					titolo: 'Prima con l’aiuto',
					testo:
						'Questa volta le note le suoniamo tutte noi: ascolta Do, Re, Mi, poi cantale. Guarda come salgono sul pentagramma, un gradino alla volta.',
					props: { note: ['C4', 'D4', 'E4'], etichette: true, colori: true, item: 'do-re-mi' }
				},
				{
					id: 'insieme-leggi',
					fase: 'insieme',
					widget: 'leggi-e-canta',
					titolo: 'Ora leggile tu',
					testo:
						'Adesso senti solo il Do. Canta il Do, poi segui le note: se la nota dopo è più in alto, la voce sale di un gradino; se è più in basso, scende. I nomi sotto le note ti aiutano.',
					props: { quante: 1, etichette: true, colori: true }
				},
				{
					id: 'gioco',
					fase: 'prova',
					widget: 'leggi-e-canta',
					titolo: 'Leggi e canta',
					testo: 'Se il Do è troppo basso per la tua voce, cantalo più in alto: va bene lo stesso.'
				}
			]
		}
	]
} satisfies ModuloDati;

export const widget = {
	'tocca-rigo': () => import('./widget/ToccaRigo.svelte'),
	'che-nota-e': () => import('./widget/CheNotaE.svelte'),
	trovala: () => import('./widget/Trovala.svelte'),
	'leggi-e-canta': () => import('./widget/LeggiECanta.svelte'),
	// disegni delle spiegazioni animate
	'disegno-linee-spazi': () => import('./widget/disegni/LineeESpazi.svelte'),
	'disegno-linea-spazio': () => import('./widget/disegni/LineaOSpazio.svelte'),
	'disegno-chiave': () => import('./widget/disegni/ChiaveDiViolino.svelte'),
	'disegno-note-linee': () => import('./widget/disegni/NoteLinee.svelte'),
	'disegno-note-spazi': () => import('./widget/disegni/NoteSpazi.svelte'),
	'disegno-nota-sale': () => import('./widget/disegni/NotaCheSale.svelte'),
	'disegno-tagli': () => import('./widget/disegni/Tagli.svelte'),
	'disegno-semitono': () => import('./widget/disegni/Semitono.svelte')
};
