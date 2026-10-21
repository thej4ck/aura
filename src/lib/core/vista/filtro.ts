// Selettore dei moduli: opzioni e applicazione dei filtri (area, età, stato). Pure.
import type { AreaCatalogo, Catalogo } from '../contenuti/registry';
import type { Documento, Preferenze } from '../store/schema-progressi';
import { voceModulo, type VoceModulo } from './pagine';

export type Filtro = Preferenze['filtroModuli'];

export type OpzioniFiltro = {
	aree: readonly AreaCatalogo[];
	/** ogni età coperta da almeno un modulo, in ordine */
	eta: number[];
};

export function opzioniFiltro(catalogo: Catalogo): OpzioniFiltro {
	const moduli = catalogo.aree().flatMap((a) => a.moduli);
	const eta = new Set(moduli.flatMap(({ eta: [min, max] }) => intervallo(min, max)));
	return { aree: catalogo.aree(), eta: [...eta].sort((a, b) => a - b) };
}

const intervallo = (min: number, max: number) =>
	Array.from({ length: max - min + 1 }, (_, i) => min + i);

/**
 * Il filtro salvato, senza i valori che il catalogo non ha più (un'area tolta, un'età senza moduli):
 * un filtro vecchio non deve mai nascondere tutto. Toglie anche le chiavi vuote.
 */
export function filtroValido(catalogo: Catalogo, filtro: Filtro): Filtro {
	const { aree, eta } = opzioniFiltro(catalogo);
	const valido: Filtro = {};
	if (filtro.area !== undefined && aree.some((a) => a.id === filtro.area))
		valido.area = filtro.area;
	if (filtro.eta !== undefined && eta.includes(filtro.eta)) valido.eta = filtro.eta;
	if (filtro.stato !== undefined) valido.stato = filtro.stato;
	return valido;
}

/** Moduli che passano il filtro, nell'ordine delle aree e dei loro percorsi. */
export function filtraModuli(catalogo: Catalogo, doc: Documento, filtro: Filtro): VoceModulo[] {
	const { area, eta, stato } = filtroValido(catalogo, filtro);
	return catalogo
		.aree()
		.filter((a) => area === undefined || a.id === area)
		.flatMap((a) => a.moduli)
		.filter(({ eta: [min, max] }) => eta === undefined || (min <= eta && eta <= max))
		.map((m) => voceModulo(catalogo, doc, m))
		.filter((v) => stato === undefined || v.avanzamento.stato === stato);
}
