// Pezzi comuni dei widget musicali: le note nelle props, una riproduzione che dice quale nota sta
// suonando (per evidenziarla sullo Staff) e i messaggi degli errori del microfono.
import * as v from 'valibot';
import { m } from '#lib/paraglide/messages.js';
import { BPM_RITMO, BPM_RITMO_MAX, BPM_RITMO_MIN } from '../audio/costanti.ts';
import { ora, sblocca } from '../audio/contesto.ts';
import type { CodiceErroreMic } from '../audio/mic.ts';
import { suona, type Riproduzione } from '../audio/synth.ts';
import { SchemaAltezza, SchemaRigo, type Rigo } from '../contenuti/schema.ts';
import { midi } from '../musica/note.ts';

/** Un'altezza in notazione scientifica: 'G4', 'F#4', 'Bb3'. */
export const schemaAltezza = SchemaAltezza;

/** Note come elenco di altezze (in chiave di violino) oppure come Rigo, sempre almeno una: esce un Rigo. */
export const schemaNote = v.pipe(
	v.union([v.array(schemaAltezza), SchemaRigo]),
	v.transform((n): Rigo =>
		Array.isArray(n) ? { chiave: 'violino', note: n.map((altezza) => ({ altezza })) } : n
	),
	v.check((r) => r.note.length > 0, 'almeno una nota'),
	// questi widget suonano le altezze: una pausa o una nota ritmica suonerebbe la linea centrale
	v.check(
		(r) => !r.ritmico && !r.note.some((n) => n.pausa),
		'niente pause né rigo ritmico qui: il ritmo si batte con batti-ritmo'
	)
);

/**
 * Un ritmo da battere (batti-ritmo) o da sentire col legnetto (ascolta): un Rigo con la durata di ogni
 * nota, di solito il rigo ritmico scritto con le sillabe (`rigoRitmico('ta ti-ti ta-a sst', '4/4')`).
 */
export const schemaRitmo = v.pipe(
	SchemaRigo,
	v.check((r) => r.note.every((n) => n.durata), 'ogni nota del ritmo vuole la sua durata'),
	v.check((r) => r.note.some((n) => !n.pausa), 'almeno una nota da battere: non solo pause')
);

/** Battiti al minuto di un ritmo: col microfono più veloce non si può (BPM_RITMO_MAX, ADR 0008). */
export const schemaBpm = v.optional(
	v.pipe(v.number(), v.minValue(BPM_RITMO_MIN), v.maxValue(BPM_RITMO_MAX)),
	BPM_RITMO
);

/** Nomi visibili sotto le note e teste con i colori delle note, sullo Staff. */
export const schemaAspetto = {
	etichette: v.optional(v.boolean(), false),
	colori: v.optional(v.boolean(), false)
};

/** Silenzio tra due note suonate in fila, in secondi. */
export const PAUSA_S = 0.15;

/**
 * Suona le altezze una dopo l'altra, ognuna per `durataS`, e chiama `onnota(i)` con la nota che sta
 * suonando (sul clock audio) e `onnota(null)` alla fine o dopo ferma(). Da chiamare in un gesto o dopo
 * uno sblocca() fatto nel gesto (iOS).
 */
export function suonaSeguendo(
	altezze: readonly string[],
	durataS: number,
	onnota: (i: number | null) => void
): Riproduzione {
	void sblocca();
	const passo = durataS + PAUSA_S;
	const inizi = altezze.map((_, i) => i * passo);
	const r = suona(altezze.map((a, i) => ({ midi: midi(a), inizio: inizi[i], durata: durataS })));
	segui(r, inizi, onnota);
	return r;
}

/**
 * Segue una riproduzione sul clock audio: a ogni frame `onnota(i)` con l'ultimo evento cominciato
 * (`inizi` in secondi dall'inizio, in ordine; prima del primo, 0), `onnota(null)` alla fine o dopo ferma().
 */
export function segui(
	r: Riproduzione,
	inizi: readonly number[],
	onnota: (i: number | null) => void
): void {
	let raf = requestAnimationFrame(function giro() {
		const t = ora() - r.t0;
		let i = 0;
		while (i + 1 < inizi.length && inizi[i + 1] <= t) i++;
		onnota(i);
		raf = requestAnimationFrame(giro);
	});
	void r.fine.then(() => {
		cancelAnimationFrame(raf);
		onnota(null);
	});
}

/** Cosa dire quando il microfono non si apre: per l'adulto, con cosa può fare. */
export const ERRORI_MIC: Record<CodiceErroreMic, () => string> = {
	'permesso-negato': m.audio_errore_permesso_negato,
	'permesso-sistema': m.audio_errore_permesso_sistema,
	'nessun-microfono': m.audio_errore_nessun_microfono,
	'contesto-non-sicuro': m.audio_errore_contesto_non_sicuro,
	'non-supportato': m.audio_errore_non_supportato
};
