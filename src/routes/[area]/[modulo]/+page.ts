import { error } from '@sveltejs/kit';
import { catalogo } from '#lib/core/contenuti/registry.ts';
import type { EntryGenerator, PageLoad } from './$types';

const pagine = () =>
	catalogo.aree().flatMap((a) => a.moduli.map((m) => ({ area: a.id, modulo: m.idLocale })));

export const entries: EntryGenerator = pagine;
export const prerender = pagine().length > 0;

export const load: PageLoad = ({ params }) => {
	const modulo = catalogo.modulo(`${params.area}.${params.modulo}`);
	if (!modulo) error(404);
	return { modulo };
};
