// Pezzi comuni dei widget musicali: le note nelle props, una riproduzione che dice quale nota sta
// suonando (per evidenziarla sullo Staff) e i messaggi degli errori del microfono.
import * as v from 'valibot';
import { m } from '#lib/paraglide/messages.js';
import { ora, sblocca } from '../audio/contesto.ts';
import type { CodiceErroreMic } from '../audio/mic.ts';
import { suona, type Riproduzione } from '../audio/synth.ts';
import { SchemaNota, SchemaRigo, type Rigo } from '../contenuti/schema.ts';
import { midi } from '../musica/note.ts';

/** Un'altezza in notazione scientifica: 'G4', 'F#4', 'Bb3'. */
export const schemaAltezza = SchemaNota.entries.altezza;

/** Note come elenco di altezze (in chiave di violino) oppure come Rigo, sempre almeno una: esce un Rigo. */
export const schemaNote = v.pipe(
	v.union([v.array(schemaAltezza), SchemaRigo]),
	v.transform((n): Rigo =>
		Array.isArray(n) ? { chiave: 'violino', note: n.map((altezza) => ({ altezza })) } : n
	),
	v.check((r) => r.note.length > 0, 'almeno una nota')
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
	const r = suona(altezze.map((a, i) => ({ midi: midi(a), inizio: i * passo, durata: durataS })));
	let raf = requestAnimationFrame(function segui() {
		const i = Math.floor((ora() - r.t0) / passo);
		onnota(Math.min(altezze.length - 1, Math.max(0, i)));
		raf = requestAnimationFrame(segui);
	});
	void r.fine.then(() => {
		cancelAnimationFrame(raf);
		onnota(null);
	});
	return r;
}

/** Cosa dire quando il microfono non si apre: per l'adulto, con cosa può fare. */
export const ERRORI_MIC: Record<CodiceErroreMic, () => string> = {
	'permesso-negato': m.audio_errore_permesso_negato,
	'nessun-microfono': m.audio_errore_nessun_microfono,
	'contesto-non-sicuro': m.audio_errore_contesto_non_sicuro,
	'non-supportato': m.audio_errore_non_supportato
};
