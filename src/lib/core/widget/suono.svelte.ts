// Il suono dei disegni: ogni animazione o illustrazione che mostra note o altezze le fa sentire, ed è
// l'audio a guidare la grafica (nota evidenziata, pallina, onda), sul clock audio, così non si sfasano.
// Nelle spiegazioni animate (StatoDisegno di PlayerPassi) suona entrando in un passo, in riproduzione o
// con i pulsanti dei passi, e premendo play; la pausa, il cambio di passo e l'uscita dalla scheda lo
// fermano subito; all'apertura tace; il movimento ridotto non lo tocca. In un'illustrazione statica
// (`spiegazione`) suona solo con il pulsante «Ascolta», che la spiegazione mostra da sé.
import { getContext, setContext, untrack } from 'svelte';
import { ora, sblocca } from '../audio/contesto.ts';
import type { Riproduzione } from '../audio/synth.ts';
import { midi as midiDi } from '../musica/note.ts';
import { PAUSA_S, suonaSeguendo } from './musica.ts';

export type SuonoDisegno = {
	/** la nota che suona, come indice nelle altezze del passo; null in silenzio */
	readonly nota: number | null;
	/** il midi della nota che suona (per `data-suona` e per i tasti); null in silenzio */
	readonly midi: number | null;
	/** secondi dall'inizio della prima nota, sul clock audio; null in silenzio. La nota i parte a i × ritmo */
	readonly tempo: number | null;
	/** secondi tra l'inizio di una nota e quello della successiva */
	readonly ritmo: number;
	/** suona le note del passo mostrato; se stanno suonando, le ferma (il pulsante «Ascolta») */
	ascolta(): void;
};

const ILLUSTRAZIONE = Symbol('illustrazione sonora');

/**
 * Da chiamare nell'inizializzazione del disegno. `stato` dà il passo mostrato (nelle illustrazioni, il
 * fotogramma finale) e se il player è in riproduzione; `altezze` le note da suonare in quel passo, in
 * ordine (nessuna: il passo è muto). Ogni nota dura `durataS`.
 */
export function suonoDisegno(
	stato: () => { passo: number; inRiproduzione?: boolean },
	altezze: (passo: number) => readonly string[],
	durataS = 0.7
): SuonoDisegno {
	let nota = $state<number | null>(null);
	let tempo = $state<number | null>(null);
	let note: readonly string[] = [];
	let corrente: Riproduzione | undefined;

	function ferma() {
		corrente?.ferma();
		corrente = undefined;
		nota = null;
		tempo = null;
	}
	function suona(passo: number) {
		ferma();
		note = altezze(passo);
		if (!note.length) return;
		nota = 0;
		tempo = 0;
		const r = suonaSeguendo(note, durataS, (i) => {
			if (corrente !== r) return; // la coda di una riproduzione già fermata
			nota = i;
			tempo = i === null ? null : Math.max(0, ora() - r.t0);
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
			return nota === null ? null : midiDi(note[nota]);
		},
		get tempo() {
			return tempo;
		},
		ritmo: durataS + PAUSA_S,
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
