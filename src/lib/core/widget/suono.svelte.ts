// Il suono dei disegni: ogni animazione o illustrazione che mostra note o altezze le fa sentire, ed è
// l'audio a guidare la grafica (nota evidenziata, pallina, onda), sul clock audio, così non si sfasano.
// Nelle spiegazioni animate (StatoDisegno di PlayerPassi) suona entrando in un passo, in riproduzione o
// con i pulsanti dei passi, e premendo play; la pausa, il cambio di passo e l'uscita dalla scheda lo
// fermano subito; all'apertura tace; il movimento ridotto non lo tocca. In un'illustrazione statica
// (`spiegazione`) suona solo con il pulsante «Ascolta», che la spiegazione mostra da sé.
import { getContext, setContext, untrack } from 'svelte';
import { sblocca } from '../audio/contesto.ts';
import { MIDI_LEGNETTO, suonaColpi } from '../audio/percussioni.ts';
import { suona as suonaNote, type Riproduzione } from '../audio/synth.ts';
import type { Rigo } from '../contenuti/schema.ts';
import { midi as midiDi } from '../musica/note.ts';
import { colpi, eventiRitmo } from '../musica/ritmo.ts';
import { PAUSA_S, segui } from './musica.ts';

export type SuonoDisegno = {
	/**
	 * la nota che suona, come indice nelle altezze del passo (in un Rigo, in `rigo.note`, pause comprese:
	 * durante una pausa è la pausa); null in silenzio
	 */
	readonly nota: number | null;
	/**
	 * il midi della nota che suona (per `data-suona` e per i tasti): in un rigo ritmico MIDI_LEGNETTO, in
	 * una pausa null; null in silenzio
	 */
	readonly midi: number | null;
	/**
	 * secondi dall'inizio della prima nota, nel riferimento del suono sentito (tempoSentito); null in
	 * silenzio. In un elenco di altezze la nota i parte a i × ritmo; in un Rigo a inizi(rigo.note)[i] ×
	 * ritmo (musica/ritmo.ts)
	 */
	readonly tempo: number | null;
	/** secondi tra l'inizio di una nota e quello della successiva; in un Rigo, secondi di un battito */
	readonly ritmo: number;
	/** suona le note del passo mostrato; se stanno suonando, le ferma (il pulsante «Ascolta») */
	ascolta(): void;
};

const ILLUSTRAZIONE = Symbol('illustrazione sonora');

/**
 * Da chiamare nell'inizializzazione del disegno. `stato` dà il passo mostrato (nelle illustrazioni, il
 * fotogramma finale) e se il player è in riproduzione; `note` quello da suonare in quel passo (nessuna
 * nota: il passo è muto): un elenco di altezze, ognuna lunga `durataS` e separata da PAUSA_S, oppure un
 * Rigo validato con le durate, dove una semiminima dura `durataS` (60 / BPM) e le altre in proporzione,
 * senza silenzi in più. Il rigo ritmico suona col legnetto (audio/percussioni.ts), le pause tacciono.
 */
export function suonoDisegno(
	stato: () => { passo: number; inRiproduzione?: boolean },
	note: (passo: number) => readonly string[] | Rigo,
	durataS = 0.7
): SuonoDisegno {
	let nota = $state<number | null>(null);
	let tempo = $state<number | null>(null);
	/** il midi di ogni nota del passo che suona (null nelle pause) */
	let midi: readonly (number | null)[] = [];
	let rigo = false;
	let corrente: Riproduzione | undefined;

	function ferma() {
		corrente?.ferma();
		corrente = undefined;
		nota = null;
		tempo = null;
	}
	/** la riproduzione del passo e l'inizio (s) di ogni sua nota; undefined se il passo è muto */
	function riproduci(
		n: readonly string[] | Rigo
	): { r: Riproduzione; inizi: number[] } | undefined {
		if (!('note' in n)) {
			rigo = false;
			midi = n.map(midiDi);
			const inizi = n.map((_, i) => i * (durataS + PAUSA_S));
			if (!n.length) return;
			void sblocca();
			return {
				r: suonaNote(midi.map((m, i) => ({ midi: m!, inizio: inizi[i], durata: durataS }))),
				inizi
			};
		}
		rigo = true;
		midi = n.note.map((x) => (x.pausa ? null : n.ritmico ? MIDI_LEGNETTO : midiDi(x.altezza)));
		if (!n.note.length) return;
		void sblocca();
		const e = eventiRitmo(n, 60 / durataS);
		const inizi = e.note.map((x) => x.inizio);
		// ponytail: le note di un rigo con le durate suonano legate; un'articolazione se servirà
		const r = n.ritmico
			? suonaColpi(colpi(e))
			: suonaNote(
					e.note
						.filter((x) => !x.pausa)
						.map((x) => ({ midi: midi[x.nota]!, inizio: x.inizio, durata: x.durata }))
				);
		return { r, inizi };
	}
	function suona(passo: number) {
		ferma();
		const brano = riproduci(note(passo));
		if (!brano) return;
		// la prima nota si accende quando si sente (segui), non prima: niente nota né tempo fino ad allora
		const { r, inizi } = brano;
		segui(r, inizi, (i, t = 0) => {
			if (corrente !== r) return; // la coda di una riproduzione già fermata
			nota = i;
			tempo = i === null ? null : Math.max(0, t);
			if (i === null) corrente = undefined;
		});
		corrente = r;
	}

	let ultimo: number | undefined;
	let suonava = false;
	// .pre: la nota cambia prima che il disegno del nuovo passo si aggiorni
	$effect.pre(() => {
		const { passo, inRiproduzione = false } = stato();
		const entra = ultimo !== undefined && passo !== ultimo;
		const parte = inRiproduzione && !suonava;
		const pausa = !inRiproduzione && suonava;
		ultimo = passo;
		suonava = inRiproduzione;
		// play su un passo muto: l'audio si sblocca nel gesto, per le note dei passi dopo (iOS)
		if (parte) void sblocca();
		untrack(() => {
			if (entra || parte) suona(passo);
			else if (pausa) ferma();
		});
	});
	$effect(() => ferma); // uscendo dalla scheda

	const suono: SuonoDisegno = {
		get nota() {
			return nota;
		},
		get midi() {
			return nota === null ? null : (midi[nota] ?? null);
		},
		get tempo() {
			return tempo;
		},
		get ritmo() {
			return rigo ? durataS : durataS + PAUSA_S;
		},
		ascolta: () => (corrente ? ferma() : suona(untrack(stato).passo))
	};
	const registra = getContext<((s: SuonoDisegno) => void) | undefined>(ILLUSTRAZIONE);
	$effect(() => registra?.(suono));
	return suono;
}

/** Per chi mostra un disegno come illustrazione statica: `ricevi` arriva se il disegno ha un suono. */
export function riceviSuono(ricevi: (s: SuonoDisegno) => void) {
	setContext(ILLUSTRAZIONE, ricevi);
}
