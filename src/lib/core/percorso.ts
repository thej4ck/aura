import type {
	AreaCatalogo,
	AttivitaCatalogo,
	Catalogo,
	ModuloCatalogo
} from './contenuti/registry';
import { giorno } from './giorno';
import { puntoDiRipresa } from './motore/logica';
import type { Documento, StatoAvanzamento } from './store/schema-progressi';

export const MAX_RIPASSI = 3;

export type ProssimoPasso = {
	/** attività in corso aggiornata più di recente, con la scheda da cui riprendere (mai oltre la prima "prova") */
	riprendi?: { attivita: AttivitaCatalogo; scheda: number };
	/** prima attività non completata e non in corso dei percorsi di area (aree in ordine) */
	prossimo?: AttivitaCatalogo;
	/** attività completate con competenze da ripassare, prima le più scadute (al massimo 3) */
	ripassi: AttivitaCatalogo[];
};

export type Avanzamento = {
	completate: number;
	totale: number;
	percentuale: number;
	stato: StatoAvanzamento;
};

/** Cosa proporre adesso. Pura. */
export function prossimoPasso(catalogo: Catalogo, doc: Documento, oggi: Date): ProssimoPasso {
	const g = giorno(oggi);
	const stato = (a: AttivitaCatalogo) => doc.attivita[a.id]?.stato ?? 'nuova';
	const tutte = catalogo
		.aree()
		.flatMap((ar) => ar.moduli)
		.flatMap((m) => m.attivita);

	const quando = (a: AttivitaCatalogo) => Date.parse(doc.attivita[a.id].aggiornato);
	const [inCorso] = tutte
		.filter((a) => stato(a) === 'in_corso')
		.sort((x, y) => quando(y) - quando(x));
	const riprendi = inCorso && {
		attivita: inCorso,
		scheda: puntoDiRipresa(inCorso.schede, doc.attivita[inCorso.id].scheda)
	};

	const prossimo = catalogo
		.aree()
		.flatMap((ar) => catalogo.percorsoArea(ar.id))
		.find((a) => stato(a) === 'nuova');

	const scadenza = (a: AttivitaCatalogo) =>
		a.allena
			.map((c) => doc.competenze[c]?.prossimoRipasso)
			.filter((p): p is string => p !== undefined && p <= g)
			.sort()[0];
	const ripassi = tutte
		.filter((a) => stato(a) === 'completata')
		.map((attivita) => ({ attivita, scadenza: scadenza(attivita) ?? '' }))
		.filter((x) => x.scadenza)
		.sort((x, y) => x.scadenza.localeCompare(y.scadenza))
		.slice(0, MAX_RIPASSI)
		.map((x) => x.attivita);

	return { riprendi, prossimo, ripassi };
}

function avanzamento(attivita: readonly AttivitaCatalogo[], doc: Documento): Avanzamento {
	const totale = attivita.length;
	const completate = attivita.filter((a) => doc.attivita[a.id]?.stato === 'completata').length;
	const iniziate = attivita.some((a) => (doc.attivita[a.id]?.stato ?? 'nuova') !== 'nuova');
	return {
		completate,
		totale,
		percentuale: totale ? Math.round((completate / totale) * 100) : 0,
		stato:
			totale > 0 && completate === totale ? 'completato' : iniziate ? 'in_corso' : 'da_iniziare'
	};
}

export const statoModulo = (modulo: ModuloCatalogo, doc: Documento) =>
	avanzamento(modulo.attivita, doc);

export const statoArea = (area: AreaCatalogo, doc: Documento) =>
	avanzamento(
		area.moduli.flatMap((m) => m.attivita),
		doc
	);

/** Attività prerequisito non ancora completate: un suggerimento da mostrare, mai un blocco. */
export const prerequisitiMancanti = (attivita: AttivitaCatalogo, doc: Documento): string[] =>
	attivita.prerequisiti.filter((id) => doc.attivita[id]?.stato !== 'completata');
