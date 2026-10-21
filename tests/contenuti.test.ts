// Valida tutti i contenuti reali in src/lib/moduli (oggi possono non essercene: il test passa lo stesso).
import { describe, expect, it } from 'vitest';
import {
	costruisciCatalogo,
	fileAree,
	fileModuli,
	trovaCiclo
} from '../src/lib/core/contenuti/registry';

const ripetuti = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

describe.each([true, false])('contenuti reali (includiBozze: %s)', (includiBozze) => {
	// costruisciCatalogo valida già schema, riferimenti e cicli: qui lancerebbe con l'elenco degli errori
	const catalogo = costruisciCatalogo(fileAree, fileModuli, { includiBozze });
	const moduli = catalogo.aree().flatMap((a) => catalogo.moduliDiArea(a.id));
	const attivita = moduli.flatMap((m) => m.attivita);
	const competenze = moduli.flatMap((m) => m.competenze);

	it('id unici', () => {
		expect(ripetuti(catalogo.aree().map((a) => a.id))).toEqual([]);
		expect(ripetuti(moduli.map((m) => m.id))).toEqual([]);
		expect(ripetuti(attivita.map((a) => a.id))).toEqual([]);
		expect(ripetuti(competenze.map((c) => c.id))).toEqual([]);
		expect(attivita.flatMap((a) => ripetuti(a.schede.map((s) => `${a.id}#${s.id}`)))).toEqual([]);
	});

	it('prerequisiti e competenze allenate esistono', () => {
		const mancanti = [
			...attivita.flatMap((a) => a.prerequisiti.filter((p) => !catalogo.attivita(p))),
			...attivita.flatMap((a) => a.allena.filter((c) => !catalogo.competenza(c))),
			...competenze.flatMap((c) => c.prerequisiti.filter((p) => !catalogo.competenza(p)))
		];
		expect(mancanti).toEqual([]);
	});

	it('grafi dei prerequisiti aciclici', () => {
		expect(trovaCiclo(new Map(attivita.map((a) => [a.id, a.prerequisiti])))).toBeUndefined();
		expect(trovaCiclo(new Map(competenze.map((c) => [c.id, c.prerequisiti])))).toBeUndefined();
	});

	it('i percorsi di area puntano ad attività esistenti', () => {
		const mancanti = catalogo
			.aree()
			.flatMap((a) => a.percorso.filter((p) => !catalogo.attivita(p)));
		expect(mancanti).toEqual([]);
	});

	// TODO(fase motore): verificare che ogni scheda usi un widget registrato (core o del modulo).
});
