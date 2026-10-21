// Valida tutti i contenuti reali in src/lib/moduli (oggi possono non essercene: il test passa lo stesso).
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { catalogoEsempio } from '../src/lib/core/contenuti/__fixtures__/esempio/catalogo';
import {
	costruisciCatalogo,
	fileAree,
	fileModuli,
	trovaCiclo,
	type Catalogo
} from '../src/lib/core/contenuti/registry';
import { WIDGET_CORE, trovaWidget } from '../src/lib/core/motore/widget';

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

	verificaWidget(catalogo);
});

describe('fixture di esempio (/dev)', () => verificaWidget(catalogoEsempio));

/**
 * Ogni scheda usa un widget registrato (core o del modulo), con props valide per lo `schemaProps`
 * che il widget esporta da `<script module>`; i componenti citati nelle props esistono.
 */
function verificaWidget(catalogo: Catalogo) {
	const moduli = catalogo.aree().flatMap((a) => catalogo.moduliDiArea(a.id));
	const schede = moduli.flatMap((m) =>
		m.attivita.flatMap((a) => a.schede.map((s) => ({ m, s, dove: `${a.id}#${s.id}` })))
	);

	it('i moduli non ridefiniscono i widget core', () => {
		const ridefiniti = moduli.flatMap((m) =>
			Object.keys(m.widget)
				.filter((n) => Object.hasOwn(WIDGET_CORE, n))
				.map((n) => `${m.id}: ${n}`)
		);
		expect(ridefiniti).toEqual([]);
	});

	it('ogni scheda usa un widget registrato, con props valide', async () => {
		const problemi: string[] = [];
		for (const { m, s, dove } of schede) {
			const carica = trovaWidget(s.widget, m.widget);
			if (!carica) {
				problemi.push(`${dove}: widget "${s.widget}" non registrato`);
				continue;
			}
			const { schemaProps } = (await carica()) as { schemaProps?: v.GenericSchema };
			const r = schemaProps && v.safeParse(schemaProps, s.props);
			if (r && !r.success) problemi.push(`${dove}: props non valide: ${v.summarize(r.issues)}`);
			// componenti del modulo citati per nome (animazione, illustrazione di spiegazione)
			const p = s.props as { componente?: unknown; illustrazione?: { componente?: unknown } };
			for (const nome of [p.componente, p.illustrazione?.componente]) {
				if (typeof nome === 'string' && !trovaWidget(nome, m.widget)) {
					problemi.push(`${dove}: componente "${nome}" non registrato nel modulo`);
				}
			}
		}
		expect(problemi).toEqual([]);
	});
}
