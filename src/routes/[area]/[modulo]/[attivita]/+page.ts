import { error } from '@sveltejs/kit';
import { catalogo } from '#lib/core/contenuti/registry.ts';
import type { EntryGenerator, PageLoad } from './$types';

// tutte le attività visibili, per il prerender (gli URL usano gli id locali)
const pagine = () =>
	catalogo
		.aree()
		.flatMap((a) =>
			a.moduli.flatMap((m) =>
				m.attivita.map((at) => ({ area: a.id, modulo: m.idLocale, attivita: at.idLocale }))
			)
		);

export const entries: EntryGenerator = pagine;
// senza attività (nessun modulo ancora) non c'è nulla da generare e il prerender segnalerebbe la route come mai vista
export const prerender = pagine().length > 0;

export const load: PageLoad = ({ params }) => {
	const attivita = catalogo.attivita(`${params.area}.${params.modulo}.${params.attivita}`);
	if (!attivita) error(404);
	return { attivita };
};
