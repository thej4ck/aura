import type { ModuloDati } from '#lib/core/contenuti/schema.ts';
import { rigoRitmico as R } from '#lib/core/musica/ritmo.ts';

// Modulo Ritmo (ADR 0008): il battito, le figure con le loro sillabe (TA, TI-TI, TA-A, la pausa SST),
// battute e tempo. Si batte col tasto grande o con le mani al microfono (`batti-ritmo` e il turno ritmico
// del core); i ritmi dei giochi e la loro progressione stanno in ritmi.ts (logica pura, provata).
// Un battito è una semiminima e si va piano: BPM_RITMO (72) ovunque.

/**
 * Riferimenti alle Indicazioni Nazionali per il curricolo (primo ciclo, Musica), parafrasati: traguardi
 * di fine primaria e, dove è scritto, obiettivi di apprendimento.
 */
const IN = {
	ritmo:
		'Articola combinazioni ritmiche applicando schemi elementari, e le esegue con il corpo e gli strumenti.',
	ascolto: 'Esplora e distingue gli eventi sonori, imparando ad ascoltare sé stesso e gli altri.',
	elementi: 'Riconosce gli elementi di base del linguaggio musicale e li usa nella pratica.',
	notazione: 'Usa forme di notazione codificata per rappresentare e leggere i suoni.',
	simboli:
		'Rappresenta gli elementi di base di eventi sonori e brani musicali con sistemi simbolici convenzionali (obiettivo di fine primaria).'
};

const ASCOLTA = 'Ascolta: quale ritmo hai sentito?';

export const modulo = {
	id: 'ritmo',
	area: 'musica',
	eta: [6, 10],
	titolo: 'Ritmo',
	descrizione: 'Sentire il battito e battere il ritmo: TA, TI-TI, TA-A e la pausa.',
	icona: '🥁',
	stato: 'bozza',
	introduzione: {
		cosaImparerai: [
			'Sentire il battito della musica e batterlo a tempo.',
			'Le figure del ritmo con le loro sillabe: TA, TI-TI, TA-A e la pausa, SST.',
			'Le battute, le cifre del tempo e l’accento sul primo battito.',
			'Ripetere un ritmo, leggerlo e riconoscerlo ascoltando.'
		],
		comeFunziona:
			'Prima ascolti, poi batti. Si batte toccando il tasto grande oppure battendo le mani, se c’è un microfono. Prima di battere si conta sempre una battuta: di solito uno, due, tre, quattro. Alla fine vedi sotto ogni nota com’è andato il tuo battito, e un consiglio su cosa fare.',
		cosaServe: [
			'L’audio acceso, per sentire il battito.',
			'Un dito, o la barra spaziatrice, per battere.',
			'Per battere le mani, un microfono. Il suono si analizza solo sul dispositivo: niente viene registrato.'
		],
		consigliPerAdulti: [
			'Battete insieme: le mani, i piedi, le ginocchia. Il corpo impara il battito prima della testa.',
			'Dite le sillabe a voce mentre battete: TA, TI-TI, TA-A. Sulla pausa basta un dito sulla bocca: SST.',
			'Se il bambino corre, rallentate voi: si ascolta il clic e si aspetta il proprio momento.',
			'Il sito toglie da solo il ritardo costante del dispositivo o delle cuffie: conta che i battiti siano regolari tra loro.',
			'Meglio poco e spesso: qualche minuto al giorno.'
		]
	},
	glossario: [
		{
			termine: 'Battito',
			spiegazione:
				'Il passo regolare della musica, come il tic-tac di un orologio. Si chiama anche pulsazione.'
		},
		{
			termine: 'Ritmo',
			spiegazione: 'I suoni lunghi e corti, e i silenzi, che si muovono sopra il battito.'
		},
		{ termine: 'TA', spiegazione: 'Un suono su un battito. Si scrive con la semiminima.' },
		{
			termine: 'TI-TI',
			spiegazione: 'Due suoni veloci in un battito. Si scrivono con due crome unite da una trave.'
		},
		{ termine: 'TA-A', spiegazione: 'Un suono lungo due battiti. Si scrive con la minima.' },
		{
			termine: 'Pausa',
			spiegazione: 'Un battito di silenzio: si conta ma non si batte. La sua sillaba è SST.'
		},
		{
			termine: 'Battuta',
			spiegazione:
				'Un gruppo di battiti: due, tre o quattro. La stanghetta, una linea verticale, la chiude.'
		},
		{
			termine: 'Tempo',
			spiegazione:
				'Le due cifre all’inizio del rigo, come 3/4: quella di sopra dice quanti battiti ha ogni battuta.'
		},
		{ termine: 'Accento', spiegazione: 'Il battito più forte: il primo di ogni battuta.' }
	],
	competenze: [
		{
			id: 'pulsazione',
			titolo: 'Il battito',
			descrizione: 'Sente il battito regolare della musica e lo batte a tempo.'
		},
		{
			id: 'semiminima-crome',
			titolo: 'TA e TI-TI',
			descrizione:
				'Riconosce, legge e batte la semiminima (TA, un suono in un battito) e due crome (TI-TI, due suoni in un battito).',
			prerequisiti: ['pulsazione']
		},
		{
			id: 'minima',
			titolo: 'TA-A',
			descrizione: 'Riconosce, legge e batte la minima (TA-A): un suono lungo due battiti.',
			prerequisiti: ['semiminima-crome']
		},
		{
			id: 'pausa',
			titolo: 'La pausa',
			descrizione:
				'Riconosce e legge la pausa di semiminima (SST): un battito di silenzio, che si conta e non si batte.',
			prerequisiti: ['semiminima-crome']
		},
		{
			id: 'battute',
			titolo: 'Battute e tempo',
			descrizione:
				'Raggruppa i battiti in battute di due, tre o quattro (2/4, 3/4, 4/4), con l’accento sul primo.',
			prerequisiti: ['pulsazione']
		},
		{
			id: 'imitazione-ritmica',
			titolo: 'Fare l’eco',
			descrizione: 'Ascolta un breve ritmo e lo ripete uguale, a tempo.',
			prerequisiti: ['pulsazione']
		},
		{
			id: 'lettura-ritmica',
			titolo: 'Leggere il ritmo',
			descrizione: 'Legge un breve ritmo scritto e lo batte a tempo, dopo il conteggio.',
			prerequisiti: ['semiminima-crome']
		},
		{
			id: 'ascolto-ritmico',
			titolo: 'Riconoscere un ritmo',
			descrizione: 'Ascolta un breve ritmo e lo riconosce tra alcuni ritmi scritti.',
			prerequisiti: ['semiminima-crome']
		}
	],
	attivita: [
		{
			id: 'il-battito',
			titolo: 'Il battito',
			tipo: 'lezione',
			obiettivo:
				'Scopri il battito della musica, regolare come il tic-tac di un orologio, e battilo insieme a noi.',
			riepilogo:
				'La musica ha un battito regolare, che non si ferma mai: i colpi stanno sempre alla stessa distanza. Si conta uno, due, tre, quattro, e si batte insieme.',
			minuti: 5,
			allena: ['pulsazione'],
			traguardi: [IN.ritmo, IN.ascolto],
			schede: [
				{
					id: 'tum-tum',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Tum, tum, tum',
					testo:
						'Metti una mano sul petto: il cuore batte sempre allo stesso modo. Anche la musica ha un battito così, regolare.'
				},
				{
					id: 'il-battito',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Il battito',
					testo: 'Tieni l’audio acceso: a ogni battito senti un colpo.',
					props: {
						componente: 'disegno-battito',
						etichetta: 'I battiti: cerchi numerati che si accendono uno alla volta, con il suono',
						passi: [
							{
								testo:
									'Ascolta: un colpo, poi un altro, sempre alla stessa distanza. È il battito.',
								durataMs: 5000
							},
							{
								testo: 'Il battito non si ferma: si conta uno, due, tre, quattro, e si ricomincia.',
								durataMs: 8500
							},
							{
								testo: 'Ogni battito si può scrivere con una nota: quattro battiti, quattro note.',
								durataMs: 5000
							}
						]
					}
				},
				{
					id: 'ascolta',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Ascolta il battito',
					testo: 'Ascolta e conta piano con le dita: uno, due, tre, quattro.',
					props: { ritmo: R('ta ta ta ta ta ta ta ta'), sillabe: false }
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'batti-ritmo',
					titolo: 'Battiamo insieme',
					testo:
						'Prima ascolti, poi tocca a te: batti una volta per ogni colpo. Il conteggio ti dice quando partire.',
					props: { rigo: R('ta ta ta ta'), sillabe: false }
				},
				{
					id: 'eco',
					fase: 'prova',
					widget: 'batti-ritmo',
					titolo: 'Ripeti il battito',
					testo: 'Ascolta, poi batti anche tu, sempre alla stessa distanza.',
					props: { rigo: R('ta ta ta ta ta ta ta ta'), sillabe: false }
				},
				{
					id: 'continua-tu',
					fase: 'prova',
					widget: 'batti-ritmo',
					titolo: 'Continua tu',
					testo:
						'Questa volta il ritmo non lo senti prima: dopo il conteggio batti tu, una volta per ogni nota, insieme al battito.',
					props: { rigo: R('ta ta ta ta'), modo: 'lettura' }
				},
				{
					id: 'regolare',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'I colpi del battito arrivano…',
						opzioni: ['Sempre alla stessa distanza', 'Ogni volta a una distanza diversa'],
						corretta: 0,
						suggerimento: 'Pensa al tic-tac dell’orologio: va sempre uguale.',
						spiegazione: 'Il battito è regolare: i colpi stanno sempre alla stessa distanza.'
					}
				},
				{
					id: 'insieme-alla-musica',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Per battere insieme alla musica, i tuoi colpi arrivano…',
						opzioni: ['Nello stesso momento dei suoi', 'Quando vuoi tu'],
						corretta: 0,
						suggerimento:
							'Insieme vuol dire nello stesso momento: ascolta il conteggio e parti con lui.',
						spiegazione: 'Insieme vuol dire nello stesso momento, colpo dopo colpo.'
					}
				}
			]
		},
		{
			id: 'semiminima-e-crome',
			titolo: 'TA e TI-TI',
			tipo: 'lezione',
			obiettivo:
				'Scopri due figure del ritmo: TA, un suono su un battito, e TI-TI, due suoni in un battito.',
			riepilogo:
				'TA è un suono su un battito: si scrive con la semiminima. TI-TI sono due suoni veloci in un battito: due crome unite da una trave.',
			minuti: 6,
			allena: ['semiminima-crome'],
			prerequisiti: ['il-battito'],
			traguardi: [IN.notazione, IN.ritmo],
			schede: [
				{
					id: 'le-sillabe',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Ogni suono ha una sillaba',
					testo:
						'Per dire un ritmo usiamo delle sillabe. Quando su un battito c’è un suono solo, diciamo TA. Quando ce ne sono due, veloci, diciamo TI-TI.'
				},
				{
					id: 'uno-o-due',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Uno o due in un battito',
					testo: 'Guarda i battiti sotto le note: si accendono mentre suona.',
					props: {
						componente: 'disegno-ta-ti-ti',
						etichetta: 'Un rigo ritmico con le sillabe e, sotto, i battiti che si accendono',
						passi: [
							{
								testo:
									'TA: un suono su ogni battito. Si scrive con una nota piena e il gambo, la semiminima.',
								durataMs: 5500
							},
							{
								testo: 'TI-TI: due suoni veloci in un battito. Sono due crome, unite da una trave.',
								durataMs: 5500
							},
							{ testo: 'Insieme: TA, TI-TI, TA, TI-TI.', durataMs: 5000 }
						]
					}
				},
				{
					id: 'ascolta',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Ascolta e di’ le sillabe',
					testo: 'I clic sono il battito. Di’ piano le sillabe mentre suona: TA, TA, TI-TI, TA.',
					props: { ritmo: R('ta ta ti-ti ta'), metronomo: true }
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'batti-ritmo',
					titolo: 'Proviamo insieme',
					testo: 'Ascolta, poi batti: una volta per TA, due volte veloci per TI-TI.',
					props: { rigo: R('ta ti-ti ta ta') }
				},
				{
					id: 'eco',
					fase: 'prova',
					widget: 'batti-ritmo',
					testo: 'Ascolta, poi batti il ritmo uguale.',
					props: { rigo: R('ti-ti ta ti-ti ta') }
				},
				{
					id: 'leggi',
					fase: 'prova',
					widget: 'batti-ritmo',
					titolo: 'Leggi e batti',
					testo: 'Ora senza esempio: leggi le note e battile dopo il conteggio.',
					props: { rigo: R('ta ta ti-ti ta'), modo: 'lettura' }
				},
				{
					id: 'due-suoni',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'TI-TI sono…',
						opzioni: ['Un suono in un battito', 'Due suoni in un battito'],
						corretta: 1,
						suggerimento: 'Dillo battendo le mani: TI-TI. Quante volte batti?',
						spiegazione: 'TI-TI sono due suoni veloci nello stesso battito.'
					}
				},
				{
					id: 'quale-hai-sentito',
					fase: 'prova',
					widget: 'scegli-ritmo',
					props: {
						domanda: ASCOLTA,
						ritmi: [R('ta ti-ti ta ta'), R('ta ta ta ta')],
						corretta: 0,
						ascolta: true,
						suggerimento: 'Ascolta il secondo battito: c’è un suono solo, o ce ne sono due?'
					}
				}
			]
		},
		{
			id: 'la-minima',
			titolo: 'TA-A, il suono lungo',
			tipo: 'lezione',
			obiettivo: 'Scopri TA-A: un suono solo che dura due battiti.',
			riepilogo:
				'TA-A è un suono lungo due battiti: si batte una volta e si aspetta il battito dopo. Si scrive con la minima, una nota vuota con il gambo.',
			minuti: 6,
			allena: ['minima'],
			prerequisiti: ['semiminima-e-crome'],
			traguardi: [IN.notazione, IN.ritmo],
			schede: [
				{
					id: 'un-suono-che-dura',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Un suono che dura',
					testo:
						'Alcuni suoni durano di più. TA-A è un suono solo che dura due battiti: lo batti una volta, poi aspetti mentre passa il secondo battito.'
				},
				{
					id: 'due-battiti',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Due battiti, un suono',
					testo: 'Guarda i battiti sotto le note: su TA-A se ne accendono due.',
					props: {
						componente: 'disegno-ta-a',
						etichetta: 'Un rigo ritmico con le sillabe e, sotto, i battiti che si accendono',
						passi: [
							{
								testo:
									'TA-A, TA-A: ogni suono dura due battiti. Ascolta: il legnetto risuona piano finché dura.',
								durataMs: 5000
							},
							{
								testo:
									'TA, TA, poi TA-A: si batte una volta, e il suono continua sul battito dopo.',
								durataMs: 5000
							},
							{
								testo: 'TA-A si scrive con una nota vuota: la minima. Qui: TA-A, TI-TI, TA.',
								durataMs: 5000
							}
						]
					}
				},
				{
					id: 'ascolta',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Conta i clic',
					testo: 'I clic sono il battito: mentre suona TA-A ne passano due.',
					props: { ritmo: R('ta ta ta-a'), metronomo: true }
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'batti-ritmo',
					titolo: 'Proviamo insieme',
					testo: 'Ascolta, poi batti. Su TA-A batti una volta sola e aspetta.',
					props: { rigo: R('ta ta ta-a') }
				},
				{
					id: 'eco',
					fase: 'prova',
					widget: 'batti-ritmo',
					testo: 'Ascolta, poi batti il ritmo uguale.',
					props: { rigo: R('ta-a ta ta') }
				},
				{
					id: 'leggi',
					fase: 'prova',
					widget: 'batti-ritmo',
					titolo: 'Leggi e batti',
					testo:
						'Leggi le note e battile dopo il conteggio. La nota vuota dura due battiti: battila una volta sola.',
					props: { rigo: R('ta ti-ti ta-a'), modo: 'lettura' }
				},
				{
					id: 'quanti-battiti',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Quanti battiti dura TA-A?',
						opzioni: ['Uno', 'Due', 'Tre'],
						corretta: 1,
						suggerimento:
							'Di’ TA-A piano, con la mano che batte il battito: quanti battiti passano?',
						spiegazione: 'TA-A dura due battiti: un suono solo, che si tiene.'
					}
				},
				{
					id: 'dove-e-scritto',
					fase: 'prova',
					widget: 'scegli-ritmo',
					props: {
						domanda: 'Quale ritmo dice TA, TA, TA-A?',
						ritmi: [R('ta-a ta ta'), R('ta ta ta-a'), R('ta ta ta ta')],
						corretta: 1,
						suggerimento: 'Cerca la nota vuota, la minima: sta all’inizio o alla fine?'
					}
				}
			]
		},
		{
			id: 'la-pausa',
			titolo: 'La pausa: SST',
			tipo: 'lezione',
			obiettivo: 'Scopri la pausa: un battito di silenzio, che si conta ma non si batte.',
			riepilogo:
				'La pausa è un battito di silenzio: il suono tace, ma il battito continua. La sua sillaba è SST, e le mani riposano.',
			minuti: 6,
			allena: ['pausa'],
			prerequisiti: ['semiminima-e-crome'],
			traguardi: [IN.notazione, IN.ritmo, IN.ascolto],
			schede: [
				{
					id: 'il-silenzio-che-conta',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Il silenzio che conta',
					testo:
						'A volte la musica tace per un battito. Il battito però non si ferma: è una pausa. La chiamiamo SST, con un dito sulla bocca, e le mani riposano.'
				},
				{
					id: 'un-battito-di-silenzio',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Un battito di silenzio',
					testo: 'Guarda i battiti sotto le note: sulla pausa si accendono lo stesso.',
					props: {
						componente: 'disegno-pausa',
						etichetta: 'Un rigo ritmico con una pausa e, sotto, i battiti che si accendono',
						passi: [
							{
								testo: 'TA, TA, poi SST: qui non suona niente, ma il battito passa lo stesso.',
								durataMs: 5000
							},
							{
								testo:
									'TI-TI, TA, SST, TA. La pausa ha il suo segno, scritto al posto di una nota.',
								durataMs: 5000
							},
							{
								testo: 'TA, SST, TA, TA. Sulla pausa le mani riposano, e intanto contano.',
								durataMs: 5000
							}
						]
					}
				},
				{
					id: 'ascolta',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Ascolta la pausa',
					testo: 'Sulla pausa senti solo il clic del battito.',
					props: { ritmo: R('ta ta sst ta'), metronomo: true }
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'batti-ritmo',
					titolo: 'Proviamo insieme',
					testo: 'Ascolta, poi batti. Sulla pausa le mani riposano.',
					props: { rigo: R('ta ta sst ta') }
				},
				{
					id: 'eco',
					fase: 'prova',
					widget: 'batti-ritmo',
					testo: 'Ascolta, poi batti il ritmo uguale.',
					props: { rigo: R('ta sst ta ta') }
				},
				{
					id: 'leggi',
					fase: 'prova',
					widget: 'batti-ritmo',
					titolo: 'Leggi e batti',
					testo: 'Leggi le note e battile dopo il conteggio. Sulla pausa non si batte.',
					props: { rigo: R('ti-ti ta sst ta'), modo: 'lettura' }
				},
				{
					id: 'le-mani',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Sulla pausa, SST, le mani…',
						opzioni: ['Battono', 'Riposano'],
						corretta: 1,
						suggerimento: 'Pausa vuol dire silenzio: il suono tace.',
						spiegazione: 'Sulla pausa le mani riposano, ma il battito continua.'
					}
				},
				{
					id: 'quale-hai-sentito',
					fase: 'prova',
					widget: 'scegli-ritmo',
					props: {
						domanda: ASCOLTA,
						ritmi: [R('ta ta ta ta'), R('ta sst ta ta'), R('ti-ti ta ta ta')],
						corretta: 1,
						ascolta: true,
						suggerimento:
							'Ascolta il secondo battito: c’è un suono o c’è il silenzio? E sul primo, un colpo o due?'
					}
				}
			]
		},
		{
			id: 'battute-e-tempo',
			titolo: 'Battute e tempo',
			tipo: 'lezione',
			obiettivo:
				'Scopri le battute: i battiti in gruppi di due, tre o quattro, con l’accento sul primo.',
			riepilogo:
				'I battiti si raggruppano in battute, chiuse dalla stanghetta. Le cifre del tempo dicono quanti battiti ha ogni battuta: 2/4, 3/4, 4/4. Il primo battito è il più forte: è l’accento.',
			minuti: 7,
			allena: ['battute'],
			prerequisiti: ['la-minima', 'la-pausa'],
			traguardi: [IN.elementi, IN.notazione, IN.ritmo],
			schede: [
				{
					id: 'i-battiti-in-gruppi',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'I battiti in gruppi',
					testo:
						'I battiti si raggruppano: a due, a tre o a quattro. Ogni gruppo è una battuta, e una stanghetta la chiude. Il primo battito di ogni battuta è un po’ più forte: è l’accento.'
				},
				{
					id: 'due-tre-quattro',
					fase: 'scopri',
					widget: 'animazione',
					titolo: 'Due, tre, quattro',
					testo: 'Ascolta: il primo battito di ogni battuta suona più forte.',
					props: {
						componente: 'disegno-battute',
						etichetta:
							'Righi ritmici con le battute e, sotto, i battiti che si accendono, il primo più grande',
						passi: [
							{
								testo: 'In 2/4 ogni battuta ha due battiti: UNO, due, UNO, due.',
								durataMs: 5000
							},
							{
								testo: 'In 3/4 ogni battuta ha tre battiti, come un valzer: UNO, due, tre.',
								durataMs: 6500
							},
							{
								testo: 'In 4/4 ogni battuta ha quattro battiti: UNO, due, tre, quattro.',
								durataMs: 8500
							},
							{
								testo:
									'Le cifre all’inizio dicono quanti battiti ha ogni battuta. Qui tre: conta UNO, due, tre anche mentre suona TA-A.',
								durataMs: 6500
							}
						]
					}
				},
				{
					id: 'ascolta',
					fase: 'scopri',
					widget: 'ascolta',
					titolo: 'Ascolta l’accento',
					testo:
						'Il primo clic di ogni battuta è più acuto, e la prima nota più forte: UNO, due, tre.',
					props: { ritmo: R('ta ta ta ta-a ta', '3/4'), metronomo: true }
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'batti-ritmo',
					titolo: 'Proviamo insieme',
					testo: 'Ascolta, poi batti. Conta piano i battiti di ogni battuta: UNO, due.',
					props: { rigo: R('ta ti-ti ta ta', '2/4') }
				},
				{
					id: 'tre-quarti',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'In 3/4, quanti battiti ha ogni battuta?',
						opzioni: ['Due', 'Tre', 'Quattro'],
						corretta: 1,
						suggerimento: 'Guarda la cifra di sopra: dice quanti battiti ci sono in ogni battuta.',
						spiegazione: 'In 3/4 ogni battuta ha tre battiti.'
					}
				},
				{
					id: 'accento',
					fase: 'prova',
					widget: 'scelta',
					props: {
						domanda: 'Quale battito di ogni battuta è il più forte?',
						opzioni: ['Il primo', 'L’ultimo'],
						corretta: 0,
						suggerimento: 'Ricorda il conteggio: UNO, due, tre, quattro.',
						spiegazione: 'Il primo battito ha l’accento: è il più forte.'
					}
				},
				{
					id: 'eco',
					fase: 'prova',
					widget: 'batti-ritmo',
					testo: 'Ascolta, poi batti il ritmo uguale: due battute di tre battiti.',
					props: { rigo: R('ta-a ta ta ta sst', '3/4') }
				},
				{
					id: 'leggi',
					fase: 'prova',
					widget: 'batti-ritmo',
					titolo: 'Leggi e batti',
					testo: 'Leggi le due battute e battile dopo il conteggio.',
					props: { rigo: R('ta ta ta-a ta-a ta ta', '4/4'), modo: 'lettura' }
				}
			]
		},
		{
			id: 'eco-ritmica',
			titolo: 'Eco ritmica',
			tipo: 'gioco',
			obiettivo: 'Fai l’eco al ritmo: ascoltalo e ripetilo uguale, battendo.',
			riepilogo: 'Sai fare l’eco ritmica: ascolti un ritmo e lo ripeti uguale, a tempo.',
			minuti: 5,
			allena: ['imitazione-ritmica', 'pulsazione'],
			// i giri arrivano alla minima, alla pausa e alle battute: dopo le loro lezioni
			prerequisiti: ['battute-e-tempo'],
			traguardi: [IN.ascolto, IN.ritmo],
			schede: [
				{
					id: 'come-si-gioca',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Come si gioca',
					testo:
						'Il sito suona un ritmo, tu fai l’eco: lo ripeti uguale, battendo. Prima ritmi con TA e TI-TI, poi arrivano TA-A, la pausa e le battute.'
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'batti-ritmo',
					titolo: 'Proviamo insieme',
					testo: 'Ascolta il ritmo e fai l’eco.',
					props: { rigo: R('ta ta ti-ti ta') }
				},
				{
					id: 'gioco',
					fase: 'prova',
					widget: 'eco-ritmica',
					titolo: 'Fai l’eco',
					testo: 'Ascolta e ripeti. Puoi fermarti quando vuoi con «Basta così».'
				}
			]
		},
		{
			id: 'leggi-e-batti',
			titolo: 'Leggi e batti',
			tipo: 'gioco',
			obiettivo: 'Leggi un ritmo scritto e battilo a tempo, dopo il conteggio.',
			riepilogo:
				'Hai letto i ritmi e li hai battuti a tempo. Quando li leggi bene, arriva una figura nuova.',
			minuti: 5,
			allena: ['lettura-ritmica', 'semiminima-crome'],
			prerequisiti: ['semiminima-e-crome'],
			traguardi: [IN.notazione, IN.simboli, IN.ritmo],
			schede: [
				{
					id: 'come-si-gioca',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Come si gioca',
					testo:
						'Vedi un ritmo scritto. Dopo il conteggio di una battuta lo batti leggendo le note. Si comincia con TA e TI-TI; quando li leggi bene, arrivano TA-A, la pausa e le battute.'
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'batti-ritmo',
					titolo: 'Proviamo insieme',
					testo: 'Le sillabe sotto le note ti aiutano: dille piano mentre batti.',
					props: { rigo: R('ta ti-ti ta ta'), modo: 'lettura', sillabe: true }
				},
				{
					id: 'gioco',
					fase: 'prova',
					widget: 'leggi-e-batti',
					titolo: 'Leggi e batti',
					testo: 'Puoi fermarti quando vuoi con «Basta così».'
				}
			]
		},
		{
			id: 'che-ritmo-e',
			titolo: 'Che ritmo è?',
			tipo: 'gioco',
			obiettivo: 'Ascolta un ritmo e trovalo tra quelli scritti.',
			riepilogo:
				'Hai ascoltato i ritmi e li hai trovati scritti: le orecchie e gli occhi lavorano insieme.',
			minuti: 5,
			allena: ['ascolto-ritmico', 'semiminima-crome'],
			prerequisiti: ['la-minima', 'la-pausa'],
			traguardi: [IN.ascolto, IN.simboli],
			schede: [
				{
					id: 'come-si-gioca',
					fase: 'scopri',
					widget: 'spiegazione',
					titolo: 'Come si gioca',
					testo:
						'Il sito suona un ritmo. Guarda i ritmi scritti e tocca quello che hai sentito. Puoi ascoltarlo tutte le volte che vuoi.'
				},
				{
					id: 'insieme',
					fase: 'insieme',
					widget: 'scegli-ritmo',
					titolo: 'Proviamo insieme',
					props: {
						domanda: ASCOLTA,
						ritmi: [R('ta ta ta ta'), R('ti-ti ti-ti ta ta')],
						corretta: 1,
						ascolta: true,
						sillabe: true,
						suggerimento: 'Ascolta l’inizio: suoni lenti, TA, o veloci, TI-TI?'
					}
				},
				{
					id: 'gioco',
					fase: 'prova',
					widget: 'che-ritmo-e',
					titolo: 'Che ritmo è?',
					testo: 'Puoi fermarti quando vuoi con «Basta così».'
				}
			]
		}
	]
} satisfies ModuloDati;

export const widget = {
	'scegli-ritmo': () => import('./widget/ScegliRitmo.svelte'),
	'eco-ritmica': () => import('./widget/EcoRitmica.svelte'),
	'leggi-e-batti': () => import('./widget/LeggiEBatti.svelte'),
	'che-ritmo-e': () => import('./widget/CheRitmoE.svelte'),
	// disegni delle spiegazioni animate
	'disegno-battito': () => import('./widget/disegni/Battito.svelte'),
	'disegno-ta-ti-ti': () => import('./widget/disegni/TaTiTi.svelte'),
	'disegno-ta-a': () => import('./widget/disegni/TaA.svelte'),
	'disegno-pausa': () => import('./widget/disegni/Pausa.svelte'),
	'disegno-battute': () => import('./widget/disegni/Battute.svelte')
};
