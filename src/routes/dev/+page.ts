import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// /dev esiste solo in sviluppo: in produzione non viene prerenderizzata e risponde 404,
// e la vetrina (con le fixture) non entra nemmeno nel bundle (il ramo DEV sparisce in build).
export const prerender = false;

export const load: PageLoad = import.meta.env.DEV
	? async () => ({ Vetrina: (await import('./Vetrina.svelte')).default })
	: () => error(404);
