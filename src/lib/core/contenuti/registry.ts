import * as v from 'valibot';
import type { Component } from 'svelte';
import {
	SchemaArea,
	SchemaModulo,
	type Area,
	type Attivita,
	type Competenza,
	type Modulo,
	type StatoPubblicazione
} from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- le props dei widget le definisce il motore
export type CaricaWidget = () => Promise<{ default: Component<any> }>;

/** Export di un file `area.ts`. */
export type FileArea = { area: unknown };
/** Export di un file `modulo.ts`: `widget` mappa nome del widget → import lazy del componente. */
export type FileModulo = { modulo: unknown; widget?: Record<string, CaricaWidget> };

/** Nel catalogo `id` è sempre qualificato; `idLocale` è quello scritto nei dati (e negli URL). */
export type CompetenzaCatalogo = Omit<Competenza, 'id'> & {
	id: string;
	idLocale: string;
	area: string;
	modulo: string;
};
export type AttivitaCatalogo = Omit<Attivita, 'id' | 'stato'> & {
	id: string;
	idLocale: string;
	area: string;
	modulo: string;
	stato: StatoPubblicazione;
};
export type ModuloCatalogo = Omit<Modulo, 'id' | 'competenze' | 'attivita'> & {
	id: string;
	idLocale: string;
	competenze: CompetenzaCatalogo[];
	attivita: AttivitaCatalogo[];
	widget: Record<string, CaricaWidget>;
};
export type AreaCatalogo = Area & { moduli: ModuloCatalogo[] };

export interface Catalogo {
	aree(): readonly AreaCatalogo[];
	area(id: string): AreaCatalogo | undefined;
	moduliDiArea(area: string): readonly ModuloCatalogo[];
	/** id qualificato `area.modulo` */
	modulo(id: string): ModuloCatalogo | undefined;
	/** id qualificato `area.modulo.attivita` */
	attivita(id: string): AttivitaCatalogo | undefined;
	/** id qualificato `area.modulo.competenza` */
	competenza(id: string): CompetenzaCatalogo | undefined;
	/** attività del percorso consigliato dell'area, in ordine */
	percorsoArea(area: string): readonly AttivitaCatalogo[];
}

export class ErroreCatalogo extends Error {
	readonly errori: string[];
	constructor(errori: string[]) {
		super(`Contenuti non validi:\n- ${errori.join('\n- ')}`);
		this.name = 'ErroreCatalogo';
		this.errori = errori;
	}
}

/** Primo ciclo trovato nel grafo (nodo → prerequisiti), come cammino chiuso `[a, b, a]`. */
export function trovaCiclo(grafo: ReadonlyMap<string, readonly string[]>): string[] | undefined {
	const stato = new Map<string, 'in-visita' | 'fatto'>();
	const pila: string[] = [];
	const visita = (nodo: string): string[] | undefined => {
		if (stato.get(nodo) === 'fatto') return;
		if (stato.get(nodo) === 'in-visita') return [...pila.slice(pila.indexOf(nodo)), nodo];
		stato.set(nodo, 'in-visita');
		pila.push(nodo);
		for (const p of grafo.get(nodo) ?? []) {
			const ciclo = visita(p);
			if (ciclo) return ciclo;
		}
		pila.pop();
		stato.set(nodo, 'fatto');
	};
	for (const nodo of grafo.keys()) {
		const ciclo = visita(nodo);
		if (ciclo) return ciclo;
	}
}

/**
 * Valida i contenuti e costruisce il catalogo. Pura.
 * I riferimenti si controllano su tutti i contenuti, bozze comprese; poi, se `includiBozze` è falso,
 * bozze e riferimenti alle bozze spariscono. Gli errori sono raccolti tutti e lanciati insieme.
 */
export function costruisciCatalogo(
	fileAree: Record<string, FileArea>,
	fileModuli: Record<string, FileModulo>,
	{ includiBozze }: { includiBozze: boolean }
): Catalogo {
	const errori: string[] = [];
	const aree = new Map<string, Area>();
	const moduli = new Map<string, ModuloCatalogo>();
	const attivita = new Map<string, AttivitaCatalogo>();
	const competenze = new Map<string, CompetenzaCatalogo>();

	for (const [file, { area }] of Object.entries(fileAree)) {
		const r = v.safeParse(SchemaArea, area);
		if (!r.success) errori.push(`${file}: ${v.summarize(r.issues)}`);
		else if (aree.has(r.output.id)) errori.push(`${file}: area "${r.output.id}" duplicata`);
		else aree.set(r.output.id, r.output);
	}

	for (const [file, { modulo, widget = {} }] of Object.entries(fileModuli)) {
		const r = v.safeParse(SchemaModulo, modulo);
		if (!r.success) {
			errori.push(`${file}: ${v.summarize(r.issues)}`);
			continue;
		}
		const m = r.output;
		const id = `${m.area}.${m.id}`;
		const qualifica = (rif: string) => (rif.includes('.') ? rif : `${id}.${rif}`);
		if (!aree.has(m.area)) errori.push(`${file}: l'area "${m.area}" non esiste`);
		if (moduli.has(id)) {
			errori.push(`${file}: modulo "${id}" duplicato`);
			continue;
		}
		for (const [nome, carica] of Object.entries(widget)) {
			if (typeof carica !== 'function') errori.push(`${id}: il widget "${nome}" non è un import`);
		}
		const mc: ModuloCatalogo = { ...m, id, idLocale: m.id, competenze: [], attivita: [], widget };
		moduli.set(id, mc);

		for (const c of m.competenze) {
			const cid = `${id}.${c.id}`;
			if (competenze.has(cid)) errori.push(`${id}: competenza "${cid}" duplicata`);
			const cc = {
				...c,
				id: cid,
				idLocale: c.id,
				area: m.area,
				modulo: id,
				prerequisiti: c.prerequisiti.map(qualifica)
			};
			competenze.set(cid, cc);
			mc.competenze.push(cc);
		}
		for (const a of m.attivita) {
			const aid = `${id}.${a.id}`;
			if (attivita.has(aid)) errori.push(`${id}: attività "${aid}" duplicata`);
			const schede = new Set(a.schede.map((s) => s.id));
			if (schede.size !== a.schede.length) errori.push(`${aid}: id delle schede ripetuti`);
			const ac = {
				...a,
				id: aid,
				idLocale: a.id,
				area: m.area,
				modulo: id,
				stato: a.stato ?? m.stato,
				allena: a.allena.map(qualifica),
				prerequisiti: a.prerequisiti.map(qualifica)
			};
			attivita.set(aid, ac);
			mc.attivita.push(ac);
		}
	}

	for (const c of competenze.values()) {
		for (const p of c.prerequisiti) {
			if (!competenze.has(p)) errori.push(`${c.id}: la competenza prerequisito "${p}" non esiste`);
		}
	}
	for (const a of attivita.values()) {
		for (const c of a.allena) {
			if (!competenze.has(c)) errori.push(`${a.id}: allena la competenza "${c}" che non esiste`);
		}
		for (const p of a.prerequisiti) {
			if (!attivita.has(p)) errori.push(`${a.id}: l'attività prerequisito "${p}" non esiste`);
		}
	}
	for (const a of aree.values()) {
		if (new Set(a.percorso).size !== a.percorso.length) {
			errori.push(`area ${a.id}: attività ripetute nel percorso`);
		}
		for (const p of a.percorso) {
			if (!attivita.has(p)) errori.push(`area ${a.id}: il percorso cita "${p}" che non esiste`);
		}
	}
	const prerequisiti = <T extends { prerequisiti: string[] }>(m: Map<string, T>) =>
		new Map([...m].map(([id, x]) => [id, x.prerequisiti]));
	const cicloC = trovaCiclo(prerequisiti(competenze));
	if (cicloC) errori.push(`ciclo nei prerequisiti delle competenze: ${cicloC.join(' → ')}`);
	const cicloA = trovaCiclo(prerequisiti(attivita));
	if (cicloA) errori.push(`ciclo nei prerequisiti delle attività: ${cicloA.join(' → ')}`);

	if (errori.length) throw new ErroreCatalogo(errori);

	// filtro delle bozze
	const visibile = (x: { stato: StatoPubblicazione }) => includiBozze || x.stato === 'pubblicata';
	for (const [id, m] of moduli) {
		if (!visibile(m)) {
			moduli.delete(id);
			for (const a of m.attivita) attivita.delete(a.id);
			for (const c of m.competenze) competenze.delete(c.id);
		}
	}
	for (const [id, a] of attivita) if (!visibile(a)) attivita.delete(id);
	for (const m of moduli.values()) m.attivita = m.attivita.filter((a) => attivita.has(a.id));
	for (const c of competenze.values())
		c.prerequisiti = c.prerequisiti.filter((p) => competenze.has(p));
	for (const a of attivita.values()) {
		a.allena = a.allena.filter((c) => competenze.has(c));
		a.prerequisiti = a.prerequisiti.filter((p) => attivita.has(p));
	}

	// ponytail: le aree seguono l'ordine dei file (alfabetico); un campo `ordine` se servirà
	const areeCatalogo: AreaCatalogo[] = [];
	for (const a of aree.values()) {
		const percorso = a.percorso.filter((p) => attivita.has(p));
		const posizione = (m: ModuloCatalogo) => {
			const i = percorso.findIndex((p) => attivita.get(p)?.modulo === m.id);
			return i < 0 ? Infinity : i;
		};
		// i moduli seguono la prima apparizione nel percorso; quelli fuori percorso vanno in fondo
		const suoi = [...moduli.values()]
			.filter((m) => m.area === a.id)
			.sort((x, y) => posizione(x) - posizione(y));
		if (suoi.length) areeCatalogo.push({ ...a, percorso, moduli: suoi });
	}
	const areePerId = new Map(areeCatalogo.map((a) => [a.id, a]));

	return {
		aree: () => areeCatalogo,
		area: (id) => areePerId.get(id),
		moduliDiArea: (id) => areePerId.get(id)?.moduli ?? [],
		modulo: (id) => moduli.get(id),
		attivita: (id) => attivita.get(id),
		competenza: (id) => competenze.get(id),
		percorsoArea: (id) =>
			(areePerId.get(id)?.percorso ?? []).map((p) => attivita.get(p) as AttivitaCatalogo)
	};
}

// Catalogo reale: ogni area è una cartella con area.ts, ogni modulo una sottocartella con modulo.ts.
export const fileAree = import.meta.glob<FileArea>('/src/lib/moduli/*/area.ts', { eager: true });
export const fileModuli = import.meta.glob<FileModulo>('/src/lib/moduli/*/*/modulo.ts', {
	eager: true
});

export const catalogo = costruisciCatalogo(fileAree, fileModuli, {
	includiBozze: import.meta.env.DEV
});
export const { aree, area, moduliDiArea, modulo, attivita, competenza, percorsoArea } = catalogo;
