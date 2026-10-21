import { error } from '@sveltejs/kit';
import { catalogo } from '#lib/core/contenuti/registry.ts';
import type { EntryGenerator, PageLoad } from './$types';

// ponytail: un'area con id "moduli", "genitori" o "dev" verrebbe coperta da quelle pagine; un controllo nei test se capiterà
const pagine = () => catalogo.aree().map((a) => ({ area: a.id }));

export const entries: EntryGenerator = pagine;
// senza aree non c'è nulla da generare (come per le attività)
export const prerender = pagine().length > 0;

export const load: PageLoad = ({ params }) => {
	const area = catalogo.area(params.area);
	if (!area) error(404);
	return { area };
};
