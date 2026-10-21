// Indirizzi delle pagine generate dal catalogo (gli URL usano gli id locali).
import { resolve } from '$app/paths';
import type { AttivitaCatalogo, ModuloCatalogo } from '../contenuti/registry';

export const indirizzoArea = (area: string) => resolve('/[area]', { area });

export const indirizzoModulo = (m: ModuloCatalogo) =>
	resolve('/[area]/[modulo]', { area: m.area, modulo: m.idLocale });

export const indirizzoAttivita = (a: AttivitaCatalogo) =>
	resolve('/[area]/[modulo]/[attivita]', {
		area: a.area,
		modulo: a.modulo.slice(a.area.length + 1),
		attivita: a.idLocale
	});
