// Intonazione: macchine a stati pure per il canto, guidate dai frame del microfono (nei test, frame
// sintetici). Tre giochi di base: tenere una nota, cantare una sequenza in ordine, trovare la "nota
// comoda". Ogni funzione `avanza*` prende lo stato e un frame e restituisce lo stato nuovo, senza
// toccare quello vecchio. Il tempo è quello dei frame (clock audio, in secondi), mai l'orologio di sistema.
import {
	BUCO_VOCE_MS,
	CALO_TENUTA,
	COPERTURA_NOTA_COMODA,
	FINESTRA_NOTA_COMODA_MS
} from '#lib/core/audio/costanti.ts';
import { distanzaCents, midiDaFreq } from '#lib/core/audio/frequenze.ts';

/** Quello che serve di un FrameMic: tempo (s), altezza (null = niente voce), se stava suonando il sito. */
export type FrameVoce = { t: number; freq: number | null; silenziato?: boolean };

/** Un buco tra due frame (scheda in background, dispositivo lento) conta al massimo così (s). */
export const MAX_PASSO_S = 0.25;

/** Secondi dal frame precedente: 0 al primo frame e se il tempo torna indietro (microfono riaperto). */
const passoS = (prima: number | null, ora: number) =>
	prima === null ? 0 : Math.min(MAX_PASSO_S, Math.max(0, ora - prima));

const voce = (f: FrameVoce) => !f.silenziato && f.freq !== null;

// --- Tenuta di una nota -------------------------------------------------------------------------

export type OpzioniTenuta = {
	/** nota da tenere (midi) */
	target: number;
	tolleranzaCents: number;
	/** quanto tempo in zona serve, in ms */
	obiettivoMs: number;
	/** la stessa nota in un'altra ottava va bene */
	equivalenzaOttava?: boolean;
	/** fuori zona il progresso cala a questa frazione della velocità di crescita (default CALO_TENUTA) */
	calo?: number;
};

export type StatoTenuta = {
	/**
	 * 0-1: cresce in zona, cala lentamente fuori zona e in silenzio, mai di colpo a zero. In un buco
	 * breve della voce (meno di BUCO_VOCE_MS: un respiro, una consonante) aspetta
	 */
	progresso: number;
	/** secondi senza voce dall'ultimo frame con la voce (0 se c'era) */
	bucoS: number;
	/** cent dalla nota dell'ultimo frame (positivo = troppo alto); null senza voce */
	cents: number | null;
	inZona: boolean;
	/** progresso arrivato a 1: lo stato non cambia più */
	riuscita: boolean;
	/** tempo dell'ultimo frame */
	t: number | null;
};

export const nuovaTenuta = (): StatoTenuta => ({
	progresso: 0,
	bucoS: 0,
	cents: null,
	inZona: false,
	riuscita: false,
	t: null
});

export function avanzaTenuta(s: StatoTenuta, f: FrameVoce, o: OpzioniTenuta): StatoTenuta {
	if (s.riuscita) return s;
	// sta suonando il sito: è il turno di ascoltare, il progresso aspetta
	if (f.silenziato) return { ...s, bucoS: 0, cents: null, inZona: false, t: f.t };
	const cents =
		f.freq === null
			? null
			: distanzaCents(f.freq, o.target, { equivalenzaOttava: o.equivalenzaOttava });
	const inZona = cents !== null && Math.abs(cents) <= o.tolleranzaCents;
	const passo = passoS(s.t, f.t);
	const bucoS = f.freq === null ? s.bucoS + passo : 0;
	// del passo in silenzio cala solo la parte oltre il buco breve
	const buco = BUCO_VOCE_MS / 1000;
	const calante = f.freq === null ? Math.max(0, bucoS - buco) - Math.max(0, s.bucoS - buco) : passo;
	const quota = (1000 / o.obiettivoMs) * (inZona ? passo : -calante * (o.calo ?? CALO_TENUTA));
	const progresso = Math.min(1, Math.max(0, s.progresso + quota));
	return { progresso, bucoS, cents, inZona, riuscita: progresso >= 1, t: f.t };
}

// --- Sequenza di note in ordine -----------------------------------------------------------------

export type OpzioniSequenza = {
	/** note da cantare in ordine (midi) */
	note: readonly number[];
	tolleranzaCents: number;
	/** tenuta minima di ogni nota, in ms */
	tenutaMs: number;
	/** tempo di ascolto complessivo in ms (senza i momenti in cui suona il sito); poi la prova finisce */
	timeoutMs: number;
	equivalenzaOttava?: boolean;
	calo?: number;
};

export type StatoSequenza = {
	/** la nota da cantare adesso; è anche il numero di note già riuscite (in ordine) */
	indice: number;
	/** tenuta della nota corrente */
	tenuta: StatoTenuta;
	/** tempo di ascolto trascorso, in ms */
	ascoltoMs: number;
	/** almeno un frame con la voce: per dire "non ti ho sentito" invece di "riprova" */
	sentita: boolean;
	esito: 'in-corso' | 'riuscita' | 'scaduta';
};

export const nuovaSequenza = (): StatoSequenza => ({
	indice: 0,
	tenuta: nuovaTenuta(),
	ascoltoMs: 0,
	sentita: false,
	esito: 'in-corso'
});

export function avanzaSequenza(s: StatoSequenza, f: FrameVoce, o: OpzioniSequenza): StatoSequenza {
	if (s.esito !== 'in-corso') return s;
	const ascoltoMs = s.ascoltoMs + (f.silenziato ? 0 : passoS(s.tenuta.t, f.t) * 1000);
	let indice = s.indice;
	let tenuta =
		indice < o.note.length
			? avanzaTenuta(s.tenuta, f, {
					target: o.note[indice],
					tolleranzaCents: o.tolleranzaCents,
					obiettivoMs: o.tenutaMs,
					equivalenzaOttava: o.equivalenzaOttava,
					calo: o.calo
				})
			: s.tenuta;
	// ponytail: due note uguali di fila si tengono con un unico fiato; una pausa obbligatoria se servirà
	if (tenuta.riuscita) {
		indice++;
		tenuta = { ...nuovaTenuta(), t: f.t };
	}
	return {
		indice,
		tenuta,
		ascoltoMs,
		sentita: s.sentita || voce(f),
		esito: indice >= o.note.length ? 'riuscita' : ascoltoMs >= o.timeoutMs ? 'scaduta' : 'in-corso'
	};
}

// --- Nota comoda --------------------------------------------------------------------------------

export type OpzioniNotaComoda = {
	/** finestra della mediana, in ms (default FINESTRA_NOTA_COMODA_MS) */
	finestraMs?: number;
	/** quanta voce (0-1) serve nella finestra (default COPERTURA_NOTA_COMODA) */
	copertura?: number;
};

export type StatoNotaComoda = {
	/** frame con la voce dentro la finestra: midi con i decimali e durata del frame (s) */
	campioni: readonly { t: number; midi: number; dt: number }[];
	t: number | null;
	/** 0-1: quanta voce c'è nella finestra, per mostrare l'avanzamento */
	copertura: number;
	/** la nota comoda (midi intero) quando la finestra è abbastanza piena; poi non cambia più */
	nota: number | null;
};

export const nuovaNotaComoda = (): StatoNotaComoda => ({
	campioni: [],
	t: null,
	copertura: 0,
	nota: null
});

/** La nota che la voce canta spontanea: la mediana degli ultimi ~2 s di voce (scarta salti e ottave sbagliate). */
export function avanzaNotaComoda(
	s: StatoNotaComoda,
	f: FrameVoce,
	o: OpzioniNotaComoda = {}
): StatoNotaComoda {
	if (s.nota !== null) return s;
	const finestra = (o.finestraMs ?? FINESTRA_NOTA_COMODA_MS) / 1000;
	const campioni = s.campioni.filter((c) => c.t > f.t - finestra);
	if (voce(f)) campioni.push({ t: f.t, midi: midiDaFreq(f.freq!), dt: passoS(s.t, f.t) });
	const copertura = Math.min(1, campioni.reduce((somma, c) => somma + c.dt, 0) / finestra);
	// ponytail: niente controllo di stabilità; un limite allo scarto se le sirene danno radici strane
	const nota =
		copertura >= (o.copertura ?? COPERTURA_NOTA_COMODA)
			? Math.round(mediana(campioni.map((c) => c.midi)))
			: null;
	return { campioni, t: f.t, copertura, nota };
}

function mediana(valori: number[]): number {
	const v = valori.toSorted((a, b) => a - b);
	const meta = v.length >> 1;
	return v.length % 2 ? v[meta] : (v[meta - 1] + v[meta]) / 2;
}
