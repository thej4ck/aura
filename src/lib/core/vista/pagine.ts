// Funzioni di vista delle pagine (home, area, modulo): pure, dal catalogo e dal documento del profilo.
// I componenti di pagina le chiamano con il catalogo che ricevono (quello reale, o una fixture in /dev).
import type {
	AreaCatalogo,
	AttivitaCatalogo,
	Catalogo,
	ModuloCatalogo
} from '../contenuti/registry';
import {
	prerequisitiMancanti,
	prossimoPasso,
	statoArea,
	statoModulo,
	type Avanzamento
} from '../percorso';
import {
	FORMATO,
	PREFERENZE_PREDEFINITE,
	SCHEMA_ATTUALE,
	type Documento,
	type StatoAttivita
} from '../store/schema-progressi';

/** Un profilo senza progressi: per disegnare le pagine prima che il profilo sia caricato (e nel prerender). */
export const DOC_VUOTO: Documento = Object.freeze({
	formato: FORMATO,
	schema: SCHEMA_ATTUALE,
	profilo: { id: '00000000-0000-4000-8000-000000000000', avatar: '🌱' },
	preferenze: PREFERENZE_PREDEFINITE,
	attivita: {},
	competenze: {},
	dati: {}
});

export type VoceModulo = { modulo: ModuloCatalogo; area: AreaCatalogo; avanzamento: Avanzamento };

/** Un'attività dentro un percorso (di area o di modulo), con il suo stato per il profilo. */
export type Tappa = {
	attivita: AttivitaCatalogo;
	modulo: ModuloCatalogo;
	stato: StatoAttivita;
	stelle: number;
	/** attività prerequisito non ancora completate: suggerimenti, mai blocchi */
	mancanti: AttivitaCatalogo[];
	/** da dove continuare: l'attività in corso più recente, altrimenti la prima da fare */
	consigliata: boolean;
};

export const voceModulo = (catalogo: Catalogo, doc: Documento, m: ModuloCatalogo): VoceModulo => ({
	modulo: m,
	area: catalogo.area(m.area)!,
	avanzamento: statoModulo(m, doc)
});

export function tappe(
	catalogo: Catalogo,
	doc: Documento,
	attivita: readonly AttivitaCatalogo[]
): Tappa[] {
	const stato = (a: AttivitaCatalogo): StatoAttivita => doc.attivita[a.id]?.stato ?? 'nuova';
	const quando = (a: AttivitaCatalogo) => Date.parse(doc.attivita[a.id].aggiornato);
	const [inCorso] = attivita
		.filter((a) => stato(a) === 'in_corso')
		.sort((x, y) => quando(y) - quando(x));
	const consigliata = inCorso ?? attivita.find((a) => stato(a) === 'nuova');
	return attivita.map((a) => ({
		attivita: a,
		modulo: catalogo.modulo(a.modulo)!,
		stato: stato(a),
		stelle: doc.attivita[a.id]?.stelle ?? 0,
		mancanti: prerequisitiMancanti(a, doc).flatMap((id) => catalogo.attivita(id) ?? []),
		consigliata: a === consigliata
	}));
}

/** Le attività di un modulo nell'ordine del percorso dell'area; quelle fuori percorso in fondo, nel loro ordine. */
export function attivitaInOrdine(catalogo: Catalogo, m: ModuloCatalogo): AttivitaCatalogo[] {
	const percorso = catalogo.percorsoArea(m.area).map((a) => a.id);
	const posizione = (a: AttivitaCatalogo) => {
		const i = percorso.indexOf(a.id);
		return i < 0 ? Infinity : i;
	};
	return [...m.attivita].sort((x, y) => posizione(x) - posizione(y));
}

export type VistaHome = {
	/** nessuna attività mai iniziata: si mostra il benvenuto */
	primaVisita: boolean;
	riprendi?: { attivita: AttivitaCatalogo; modulo: ModuloCatalogo; scheda: number; totale: number };
	prossimo?: { attivita: AttivitaCatalogo; modulo: ModuloCatalogo };
	ripassi: { attivita: AttivitaCatalogo; modulo: ModuloCatalogo }[];
	aree: { area: AreaCatalogo; avanzamento: Avanzamento }[];
};

export function vistaHome(catalogo: Catalogo, doc: Documento, oggi: Date): VistaHome {
	const passo = prossimoPasso(catalogo, doc, oggi);
	const conModulo = (attivita: AttivitaCatalogo) => ({
		attivita,
		modulo: catalogo.modulo(attivita.modulo)!
	});
	return {
		primaVisita: Object.keys(doc.attivita).length === 0,
		riprendi: passo.riprendi && {
			...conModulo(passo.riprendi.attivita),
			scheda: passo.riprendi.scheda,
			totale: passo.riprendi.attivita.schede.length
		},
		prossimo: passo.prossimo && conModulo(passo.prossimo),
		ripassi: passo.ripassi.map(conModulo),
		aree: catalogo.aree().map((area) => ({ area, avanzamento: statoArea(area, doc) }))
	};
}

export type VistaArea = {
	area: AreaCatalogo;
	avanzamento: Avanzamento;
	moduli: VoceModulo[];
	percorso: Tappa[];
};

export function vistaArea(catalogo: Catalogo, doc: Documento, id: string): VistaArea | undefined {
	const area = catalogo.area(id);
	if (!area) return;
	return {
		area,
		avanzamento: statoArea(area, doc),
		moduli: area.moduli.map((m) => voceModulo(catalogo, doc, m)),
		percorso: tappe(catalogo, doc, catalogo.percorsoArea(id))
	};
}

export type VistaModulo = VoceModulo & { percorso: Tappa[] };

/** `id` qualificato `area.modulo`. */
export function vistaModulo(
	catalogo: Catalogo,
	doc: Documento,
	id: string
): VistaModulo | undefined {
	const m = catalogo.modulo(id);
	if (!m) return;
	return {
		...voceModulo(catalogo, doc, m),
		percorso: tappe(catalogo, doc, attivitaInOrdine(catalogo, m))
	};
}
