// Funzioni di vista della pagina per i genitori: progressi per modulo e promemoria del backup. Pure.
import type { Catalogo, CompetenzaCatalogo, ModuloCatalogo } from '../contenuti/registry';
import { giorno } from '../giorno';
import type { Livello } from '../padronanza';
import type { Documento } from '../store/schema-progressi';
import { attivitaInOrdine, tappe, voceModulo, type Tappa, type VoceModulo } from './pagine';

/** Dopo quanti giorni senza backup (con progressi da salvare) si ricorda di farne uno. */
export const GIORNI_PROMEMORIA_BACKUP = 14;
const GIORNO_MS = 24 * 60 * 60 * 1000;

export type VoceCompetenza = {
	competenza: CompetenzaCatalogo;
	livello: Livello;
	/** il ripasso consigliato è oggi o già passato */
	daRipassare: boolean;
};

export type ProgressiModulo = VoceModulo & {
	fatte: Tappa[];
	/** in corso e da iniziare, nell'ordine del percorso */
	daFare: Tappa[];
	competenze: VoceCompetenza[];
	/** da dove continuare nel modulo */
	prossimo?: Tappa;
};

export function progressiModulo(
	catalogo: Catalogo,
	doc: Documento,
	m: ModuloCatalogo,
	oggi: Date
): ProgressiModulo {
	const g = giorno(oggi);
	const percorso = tappe(catalogo, doc, attivitaInOrdine(catalogo, m));
	return {
		...voceModulo(catalogo, doc, m),
		fatte: percorso.filter((t) => t.stato === 'completata'),
		daFare: percorso.filter((t) => t.stato !== 'completata'),
		competenze: m.competenze.map((competenza) => {
			const r = doc.competenze[competenza.id];
			return {
				competenza,
				livello: (r?.livello ?? 0) as Livello,
				daRipassare: r?.prossimoRipasso !== undefined && r.prossimoRipasso <= g
			};
		}),
		prossimo: percorso.find((t) => t.consigliata)
	};
}

/** Tutti i moduli del catalogo, area per area. */
export const progressiPerModulo = (catalogo: Catalogo, doc: Documento, oggi: Date) =>
	catalogo
		.aree()
		.flatMap((a) => a.moduli)
		.map((m) => progressiModulo(catalogo, doc, m, oggi));

/**
 * Serve un promemoria per il backup? Sì se ci sono progressi non ancora in un backup e l'ultimo backup
 * (o, senza backup, il più vecchio di quei progressi) ha più di 14 giorni. Con un file collegato
 * `ultimoBackup` si aggiorna a ogni salvataggio, quindi il promemoria non compare.
 */
export function serveBackup(doc: Documento, oggi: Date): boolean {
	const backup = doc.ultimoBackup ? Date.parse(doc.ultimoBackup) : -Infinity;
	const daSalvare = [
		...Object.values(doc.attivita),
		...Object.values(doc.competenze),
		...Object.values(doc.dati)
	]
		.map((r) => Date.parse(r.aggiornato))
		.filter((t) => t > backup);
	if (!daSalvare.length) return false;
	const da = doc.ultimoBackup ? backup : Math.min(...daSalvare);
	return oggi.getTime() - da > GIORNI_PROMEMORIA_BACKUP * GIORNO_MS;
}
