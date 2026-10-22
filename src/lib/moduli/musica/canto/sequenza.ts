// Logica pura del modulo Canto: le note dei giochi, scelte nel registro comodo del bambino, e la
// macchina a stati dell'estensione vocale, costruita su intonazione.ts. Niente audio né DOM: si prova
// con i frame sintetici. Le altezze in uscita sono stringhe ('G4'), i conti si fanno in midi.
import * as v from 'valibot';
import {
	ASCOLTO_MAX_MS,
	FREQ_MAX,
	FREQ_MIN,
	TENUTA_SEQUENZA_MS
} from '#lib/core/audio/costanti.ts';
import { midiDaFreq } from '#lib/core/audio/frequenze.ts';
import { creaCasuale, scegli, type Casuale } from '#lib/core/casuale.ts';
import type { Rigo } from '#lib/core/contenuti/schema.ts';
import {
	MAX_PASSO_S,
	avanzaNotaComoda,
	avanzaSequenza,
	nuovaNotaComoda,
	nuovaSequenza,
	type FrameVoce,
	type StatoNotaComoda,
	type StatoSequenza
} from '#lib/core/musica/intonazione.ts';
import {
	ARPEGGIO_MAGGIORE,
	altezza,
	altezzaInTonalita,
	armaturaMaggiore,
	arpeggioMaggiore,
	classe,
	midi
} from '#lib/core/musica/note.ts';

// --- Limiti -------------------------------------------------------------------------------------

/** La nota più grave e la più acuta che il microfono sa riconoscere (FREQ_MIN-FREQ_MAX): Mi2 e Do6. */
export const NOTA_MIN = Math.ceil(midiDaFreq(FREQ_MIN));
export const NOTA_MAX = Math.floor(midiDaFreq(FREQ_MAX));
/** La nota più alta dell'arpeggio [0, 4, 7, 4, 0] sopra la radice. */
const QUINTA = Math.max(...ARPEGGIO_MAGGIORE);

// --- Dati salvati: 'musica.canto' → { estensione: [{ data, basso, alto }] } ----------------------

export const ID_DATI = 'musica.canto';
const nota = v.pipe(v.number(), v.integer(), v.minValue(NOTA_MIN), v.maxValue(NOTA_MAX));
/** Una prova di estensione: istante ISO e limiti in midi (60 = Do4), compresi. */
export const SchemaEstensione = v.pipe(
	v.object({ data: v.pipe(v.string(), v.isoTimestamp()), basso: nota, alto: nota }),
	v.check((e) => e.basso <= e.alto, 'basso sopra alto')
);
export type Estensione = v.InferOutput<typeof SchemaEstensione>;
/** ponytail: si tengono le ultime 50 prove; un grafico della crescita ne userà di più se servirà */
export const MAX_ESTENSIONI = 50;

/** Le prove salvate, dalla più vecchia; le voci illeggibili si saltano (non si perdono le altre). */
export function leggiEstensioni(dati: unknown): Estensione[] {
	const lista = (dati as { estensione?: unknown } | undefined)?.estensione;
	if (!Array.isArray(lista)) return [];
	return lista
		.filter((e): e is Estensione => v.is(SchemaEstensione, e))
		.toSorted((a, b) => Date.parse(a.data) - Date.parse(b.data));
}

export const aggiungiEstensione = (lista: readonly Estensione[], nuova: Estensione) =>
	[...lista, nuova].slice(-MAX_ESTENSIONI);

/** Di quante note (semitoni, cioè tasti) è cresciuta l'estensione rispetto alla prova precedente. */
export const crescita = (prima: Estensione, ora: { basso: number; alto: number }) =>
	ora.alto - ora.basso - (prima.alto - prima.basso);

// --- Registro comodo ----------------------------------------------------------------------------

export type Registro = readonly [basso: number, alto: number];
/** Do4-Do5: il registro senza una prova di estensione salvata. */
export const REGISTRO_PREDEFINITO: Registro = [60, 72];
/** Si canta comodi, non al limite: si lascia un tono di margine sotto e sopra. */
const MARGINE = 2;
/** Note naturali minime in un registro: per scegliere melodie con qualche salto. */
const MIN_NATURALI = 4;
const NATURALI = new Set([0, 2, 4, 5, 7, 9, 11]);

/** Le note naturali (tasti bianchi) del registro, dal basso. */
export function naturali([basso, alto]: Registro): number[] {
	const note: number[] = [];
	for (let n = basso; n <= alto; n++) if (NATURALI.has(classe(n))) note.push(n);
	return note;
}

/** Il registro della prova di estensione più recente, con un margine; senza prove, Do4-Do5. */
export function registroComodo(estensioni: readonly Estensione[]): Registro {
	const e = estensioni.at(-1);
	if (!e) return REGISTRO_PREDEFINITO;
	const candidati: Registro[] = [
		[e.basso + MARGINE, e.alto - MARGINE],
		[e.basso, e.alto]
	];
	return candidati.find((r) => naturali(r).length >= MIN_NATURALI) ?? REGISTRO_PREDEFINITO;
}

/** Un rigo per le note date: in chiave di basso se stanno quasi tutte sotto il Sol3 (voci gravi). */
export function rigoDi(altezze: readonly string[], armatura = 0): Rigo {
	const media = altezze.reduce((s, a) => s + midi(a), 0) / altezze.length;
	return {
		chiave: media < 55 ? 'basso' : 'violino',
		...(armatura ? { armatura } : {}),
		note: altezze.map((a) => ({ altezza: a }))
	};
}

// --- G1 "Tieni la nota" e G2 "Eco" --------------------------------------------------------------

/** Da 3 a 5 note naturali del registro, mai la stessa due volte di fila. Stesso seed, stessa serie. */
export function serieTieni(seed: number, registro: Registro): string[] {
	const r = creaCasuale(seed);
	const note = naturali(registro);
	const quante = 3 + Math.floor(r() * 3);
	const serie: number[] = [];
	while (serie.length < quante)
		serie.push(
			scegli(
				note.filter((n) => n !== serie.at(-1)),
				r
			)
		);
	return serie.map((n) => altezza(n));
}

/** I giri dell'eco: prima per gradi congiunti, poi con qualche piccolo salto (una terza). */
export const GIRI_ECO: readonly { note: number; salti: boolean }[] = [
	{ note: 3, salti: false },
	{ note: 4, salti: false },
	{ note: 4, salti: true },
	{ note: 5, salti: true }
];

/** Una melodia sulle note naturali: passi di un grado (±1) e, con `salti`, almeno una terza (±2). */
function melodia(r: Casuale, note: readonly number[], lunghezza: number, salti: boolean): number[] {
	const mosse = salti ? [-2, -1, 1, 2] : [-1, 1];
	let indici: number[] = [];
	// ponytail: si estrae finché c'è un salto, al massimo 50 volte; con ≥ 4 note basta quasi sempre la prima
	for (let prova = 0; prova < 50; prova++) {
		indici = [Math.floor(r() * note.length)];
		while (indici.length < lunghezza) {
			const i = indici.at(-1)!;
			indici.push(
				i +
					scegli(
						mosse.filter((d) => note[i + d] !== undefined),
						r
					)
			);
		}
		if (!salti || indici.some((i, k) => k > 0 && Math.abs(i - indici[k - 1]) === 2)) break;
	}
	return indici.map((i) => note[i]);
}

/** Le melodie dei giri di "Eco" (3-5 note ciascuna), nel registro. Stesso seed, stesse melodie. */
export function serieEco(seed: number, registro: Registro): string[][] {
	const r = creaCasuale(seed);
	const note = naturali(registro);
	return GIRI_ECO.map((g) => melodia(r, note, g.note, g.salti).map((n) => altezza(n)));
}

// --- G3 "Estensione vocale" ---------------------------------------------------------------------

/** Al massimo tanti semitoni dalla radice iniziale, in ogni direzione: la voce non si stanca. */
export const MAX_PASSI = 12;
/** Ogni quanti giri una pausa per bere un sorso d'acqua. */
export const GIRI_PAUSA = 4;
/** Al secondo giro mancato di fila la direzione finisce. */
export const ERRORI_FINE = 2;
/** Ascolto massimo di un giro (ms, senza i momenti in cui suona il sito): oltre si forzerebbe la voce. */
export const TIMEOUT_GIRO_MS = 8000;
const RADICE_MIN = NOTA_MIN;
const RADICE_MAX = NOTA_MAX - QUINTA;

export type OpzioniEstensione = {
	tolleranzaCents: number;
	/** tenuta minima di ogni nota dell'arpeggio (default TENUTA_SEQUENZA_MS) */
	tenutaMs?: number;
	/** default TIMEOUT_GIRO_MS */
	timeoutGiroMs?: number;
	/** quanto aspettare la nota comoda prima di dire "non ti ho sentito" (default ASCOLTO_MAX_MS) */
	attesaMaxMs?: number;
};

/** Cosa è appena successo, per il feedback: si sale, si scende, si riprova, si cambia direzione. */
export type EventoEstensione = 'radice' | 'su' | 'giu' | 'ripeti' | 'scendiamo';

export type StatoEstensione = {
	fase: 'nota-comoda' | 'giro' | 'pausa' | 'fine';
	comoda: StatoNotaComoda;
	/** ascolto passato a cercare la nota comoda, in ms */
	attesaMs: number;
	/** la nota comoda: la radice del primo giro (midi) */
	iniziale: number | null;
	direzione: 'su' | 'giu';
	/** radice del giro in corso, o del prossimo durante la pausa */
	radice: number | null;
	/** giri cominciati: cresce a ogni giro, anche quando si riprova (il widget suona l'arpeggio) */
	giro: number;
	/** giri finiti, riusciti o no (per le pause) */
	conclusi: number;
	sequenza: StatoSequenza;
	/** giri mancati di fila nella direzione in corso */
	errori: number;
	/** la radice più grave e la più acuta dei giri riusciti */
	basso: number | null;
	alto: number | null;
	evento: EventoEstensione | null;
	motivo: 'finita' | 'basta' | 'non-sentita' | null;
};

export const nuovaEstensione = (): StatoEstensione => ({
	fase: 'nota-comoda',
	comoda: nuovaNotaComoda(),
	attesaMs: 0,
	iniziale: null,
	direzione: 'su',
	radice: null,
	giro: 0,
	conclusi: 0,
	sequenza: nuovaSequenza(),
	errori: 0,
	basso: null,
	alto: null,
	evento: null,
	motivo: null
});

/** L'arpeggio [0, 4, 7, 4, 0] di una radice, scritto nella sua tonalità maggiore (Mi♭ → Eb-G-Bb-G-Eb). */
export const arpeggio = (radice: number) => rigoDi(arpeggioMaggiore(radice));

const iniziaGiro = (s: StatoEstensione, radice: number): StatoEstensione => ({
	...s,
	fase: 'giro',
	radice,
	giro: s.giro + 1,
	sequenza: nuovaSequenza()
});

const possibile = (radice: number, iniziale: number) =>
	radice >= RADICE_MIN && radice <= RADICE_MAX && Math.abs(radice - iniziale) <= MAX_PASSI;

function concludiGiro(s: StatoEstensione, riuscito: boolean): StatoEstensione {
	const r = s.radice!;
	const iniziale = s.iniziale!;
	let direzione = s.direzione;
	let errori = riuscito ? 0 : s.errori + 1;
	let evento: EventoEstensione = riuscito ? direzione : 'ripeti';
	let prossima: number | null = riuscito
		? r + (direzione === 'su' ? 1 : -1)
		: errori < ERRORI_FINE
			? r
			: null;
	if (prossima !== null && !possibile(prossima, iniziale)) prossima = null;
	// finita la salita (due giri mancati o il limite), si scende dalla radice iniziale −1
	if (prossima === null && direzione === 'su') {
		direzione = 'giu';
		errori = 0;
		evento = 'scendiamo';
		prossima = possibile(iniziale - 1, iniziale) ? iniziale - 1 : null;
	}
	const dopo: StatoEstensione = {
		...s,
		conclusi: s.conclusi + 1,
		basso: riuscito ? Math.min(s.basso ?? r, r) : s.basso,
		alto: riuscito ? Math.max(s.alto ?? r, r) : s.alto,
		errori,
		direzione,
		evento
	};
	if (prossima === null) return { ...dopo, fase: 'fine', motivo: 'finita' };
	if (dopo.conclusi % GIRI_PAUSA === 0) return { ...dopo, fase: 'pausa', radice: prossima };
	return iniziaGiro(dopo, prossima);
}

/**
 * Un frame del microfono. Prima la nota comoda (mediana di ~2 s) fa da radice; poi a ogni giro il sito
 * suona l'arpeggio e il bambino lo canta (senza equivalenza d'ottava: si misura proprio quella voce).
 * Giro riuscito → radice +1 semitono (in discesa −1); al secondo giro mancato di fila la salita finisce
 * e si scende dalla radice iniziale −1; alla fine della discesa il gioco finisce. Limiti: la radice più
 * grave riuscita e la più acuta riuscita +7.
 */
export function avanzaEstensione(
	s: StatoEstensione,
	f: FrameVoce,
	o: OpzioniEstensione
): StatoEstensione {
	if (s.fase === 'nota-comoda') {
		const dt = s.comoda.t === null ? 0 : Math.min(MAX_PASSO_S, Math.max(0, f.t - s.comoda.t));
		const comoda = avanzaNotaComoda(s.comoda, f);
		const attesaMs = s.attesaMs + (f.silenziato ? 0 : dt * 1000);
		if (comoda.nota !== null) {
			const radice = Math.min(RADICE_MAX, Math.max(RADICE_MIN, comoda.nota));
			return iniziaGiro({ ...s, comoda, attesaMs, iniziale: radice, evento: 'radice' }, radice);
		}
		if (attesaMs >= (o.attesaMaxMs ?? ASCOLTO_MAX_MS)) {
			return { ...s, comoda, attesaMs, fase: 'fine', motivo: 'non-sentita' };
		}
		return { ...s, comoda, attesaMs };
	}
	if (s.fase !== 'giro') return s;
	const sequenza = avanzaSequenza(s.sequenza, f, {
		note: ARPEGGIO_MAGGIORE.map((d) => s.radice! + d),
		tolleranzaCents: o.tolleranzaCents,
		tenutaMs: o.tenutaMs ?? TENUTA_SEQUENZA_MS,
		timeoutMs: o.timeoutGiroMs ?? TIMEOUT_GIRO_MS,
		equivalenzaOttava: false
	});
	if (sequenza.esito === 'in-corso') return { ...s, sequenza };
	return concludiGiro({ ...s, sequenza }, sequenza.esito === 'riuscita');
}

/** La nota che si sta cantando mentre si cerca la nota comoda (la mediana della finestra), per lo Staff. */
export function notaInCorso(s: StatoEstensione): string | null {
	const midi = s.comoda.campioni.map((c) => c.midi).toSorted((a, b) => a - b);
	return midi.length ? altezza(Math.round(midi[midi.length >> 1])) : null;
}

/** Dopo la pausa per bere: comincia il giro in attesa. */
export const riprendi = (s: StatoEstensione): StatoEstensione =>
	s.fase === 'pausa' ? iniziaGiro(s, s.radice!) : s;

/** "Basta così": si finisce subito, con i giri riusciti fin qui. */
export const basta = (s: StatoEstensione): StatoEstensione =>
	s.fase === 'fine' ? s : { ...s, fase: 'fine', motivo: 'basta' };

/** I limiti trovati (midi, compresi), o null se nessun giro è riuscito. */
export function risultato(s: StatoEstensione): { basso: number; alto: number } | null {
	if (s.basso === null || s.alto === null) return null;
	return { basso: s.basso, alto: s.alto + QUINTA };
}

/** I limiti scritti come sullo Staff durante il gioco: la radice nella sua tonalità, la quinta in quella della sua radice. */
export const limitiScritti = ({ basso, alto }: { basso: number; alto: number }) => [
	altezzaInTonalita(basso, armaturaMaggiore(basso)),
	altezzaInTonalita(alto, armaturaMaggiore(alto - QUINTA))
];
