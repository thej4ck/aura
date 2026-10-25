import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import {
	ABBINAMENTO_MAX_MS,
	SCARTO_MAX_MS,
	TOLLERANZE_RITMO_MS,
	VOLUME_CLIC_PIANO
} from '#lib/core/audio/costanti.ts';
import { creaCasuale } from '#lib/core/casuale.ts';
import { SchemaRigo } from '#lib/core/contenuti/schema.ts';
import {
	battute,
	colpi,
	durataBattiti,
	eventiRitmo,
	finestraAscolto,
	inizi,
	lunghezza,
	rigoRitmico,
	segniBattiti,
	sillaba,
	valutaBattiti
} from './ritmo.ts';

const FACILE = TOLLERANZE_RITMO_MS.facile / 1000;
const PRECISO = TOLLERANZE_RITMO_MS.preciso / 1000;
const T0 = 100; // clock audio dell'inizio della riproduzione

/** i tempi (clock audio) delle note da battere, pause escluse */
const attesi = (e: ReturnType<typeof eventiRitmo>) =>
	e.note.filter((n) => !n.pausa).map((n) => T0 + n.inizio);

describe('durate e battute', () => {
	it('durate in battiti (una semiminima = un battito)', () => {
		expect(['1', '2', '4', '8', '16'].map((d) => durataBattiti({ durata: d as '4' }))).toEqual([
			4, 2, 1, 0.5, 0.25
		]);
		expect(durataBattiti({ durata: '2', punto: true })).toBe(3);
		expect(durataBattiti({})).toBe(1); // senza durata: un battito
		expect(durataBattiti({ durata: '4', pausa: true })).toBe(1);
	});

	it('inizi e lunghezza', () => {
		const { note } = rigoRitmico('ta ti-ti ta-a');
		expect(inizi(note)).toEqual([0, 1, 1.5, 2]);
		expect(lunghezza(note)).toBe(4);
	});

	it('battute piene in 2/4, 3/4 e 4/4', () => {
		expect(battute(rigoRitmico('ta ti-ti ta-a ta ta sst ta').note, '4/4')).toEqual([
			[0, 1, 2, 3],
			[4, 5, 6, 7]
		]);
		expect(battute(rigoRitmico('ta-a-a ta ta ta').note, '3/4')).toEqual([[0], [1, 2, 3]]);
		expect(battute(rigoRitmico('ti-ti ta ta-a').note, '2/4')).toEqual([[0, 1, 2], [3]]);
		expect(battute([], '4/4')).toEqual([]);
	});

	it('battute non piene: nota a cavallo della stanghetta o ultima battuta incompleta', () => {
		expect(battute(rigoRitmico('ta ta ta ta-a ta').note, '4/4')).toBeNull(); // la minima scavalca
		expect(battute(rigoRitmico('ta ta ta ta ta').note, '4/4')).toBeNull(); // manca qualcosa
		expect(battute(rigoRitmico('ta-a-a ta').note, '2/4')).toBeNull();
	});

	it('sillabe', () => {
		const note = rigoRitmico('ta ti-ti ta-a ta-a-a ta-a-a-a sst').note;
		expect(note.map(sillaba)).toEqual(['ta', 'ti', 'ti', 'ta-a', 'ta-a-a', 'ta-a-a-a', 'sst']);
	});

	it('rigoRitmico: maiuscole e spazi vanno bene, una sillaba sconosciuta no', () => {
		expect(rigoRitmico('  TA  Ti-Ti ', '2/4')).toEqual({
			ritmico: true,
			tempo: '2/4',
			note: [{ durata: '4' }, { durata: '8' }, { durata: '8' }]
		});
		expect(() => rigoRitmico('ta tu')).toThrow(/tu/);
		expect(() => rigoRitmico('constructor')).toThrow(/constructor/);
	});
});

describe('schema del rigo', () => {
	const ok = (r: unknown) => v.safeParse(SchemaRigo, r).success;

	it('i righi di sempre restano validi e uguali', () => {
		const rigo = { chiave: 'violino', note: [{ altezza: 'G4' }, { altezza: 'A4', durata: '1' }] };
		expect(v.parse(SchemaRigo, rigo)).toEqual(rigo);
		expect(ok({ chiave: 'basso', armatura: -2, note: [{ altezza: 'G2' }] })).toBe(true);
	});

	it('rigo ritmico: niente altezze, la linea centrale come segnaposto', () => {
		const r = v.parse(SchemaRigo, rigoRitmico('ta sst ti-ti ta', '4/4'));
		expect(r.chiave).toBe('violino');
		expect(r.note.map((n) => n.altezza)).toEqual(['B4', 'B4', 'B4', 'B4', 'B4']);
		expect(r.note[1].pausa).toBe(true);
	});

	it('pause in una melodia: senza altezza, con la durata', () => {
		const r = v.parse(SchemaRigo, {
			chiave: 'violino',
			tempo: '2/4',
			note: [
				{ altezza: 'C4', durata: '4' },
				{ pausa: true, durata: '4' }
			]
		});
		expect(r.note[1]).toEqual({ altezza: 'B4', pausa: true, durata: '4' });
	});

	it('cosa non va', () => {
		expect(ok({ chiave: 'violino', note: [{ durata: '4' }] })).toBe(false); // nota senza altezza
		expect(ok({ chiave: 'violino', note: [{ pausa: true }] })).toBe(false); // pausa senza durata
		expect(ok({ ritmico: true, note: [{}] })).toBe(false); // rigo ritmico senza durata
		expect(ok({ ...rigoRitmico('ta ta ta'), tempo: '4/4' })).toBe(false); // battuta incompleta
		expect(ok({ ...rigoRitmico('ta ta ta'), tempo: '3/4' })).toBe(true);
		expect(ok({ ...rigoRitmico('ta'), tempo: '5/4' })).toBe(false);
	});
});

describe('eventi da suonare', () => {
	it('attacco di una battuta, poi le note: un clic per battito, accento sul primo', () => {
		const e = eventiRitmo(rigoRitmico('ta ti-ti ta-a', '4/4'), 60, 1);
		expect(e.battitoS).toBe(1);
		expect(e.attaccoS).toBe(4);
		expect(e.fineS).toBe(8);
		expect(e.note.map((n) => n.inizio)).toEqual([4, 5, 5.5, 6]);
		expect(e.note.map((n) => n.durata)).toEqual([1, 0.5, 0.5, 2]);
		expect(e.note.map((n) => n.accento)).toEqual([true, false, false, false]);
		expect(e.clic).toHaveLength(8);
		expect(e.clic.filter((c) => c.attacco)).toHaveLength(4);
		expect(e.clic.filter((c) => c.accento).map((c) => c.inizio)).toEqual([0, 4]);
	});

	it('3/4 a 72 BPM, senza attacco', () => {
		const e = eventiRitmo(rigoRitmico('ta-a-a ta ta ta', '3/4'), 72);
		expect(e.note.map((n) => n.accento)).toEqual([true, true, false, false]);
		expect(e.clic).toHaveLength(6);
		expect(e.clic.filter((c) => c.accento)).toHaveLength(2);
		expect(e.fineS).toBeCloseTo(5, 9);
	});

	it('senza tempo in chiave si conta in 4 e non ci sono accenti', () => {
		const e = eventiRitmo(rigoRitmico('ta ta ta ta ta'), 60, 1);
		expect(e.attaccoS).toBe(4);
		expect(e.clic).toHaveLength(9);
		expect([...e.note, ...e.clic].some((x) => x.accento)).toBe(false);
	});

	it('colpi: le pause tacciono, il metronomo suona solo quello che si chiede', () => {
		const e = eventiRitmo(rigoRitmico('ta sst ti-ti ta', '4/4'), 60, 1);
		const conta = (c: ReturnType<typeof colpi>, timbro: string) =>
			c.filter((x) => x.timbro === timbro).length;
		const soloNote = colpi(e);
		expect(conta(soloNote, 'legnetto')).toBe(4);
		expect(conta(soloNote, 'clic')).toBe(0);
		expect(soloNote.map((c) => c.inizio)).toEqual([4, 6, 6.5, 7]);
		expect(soloNote[0]).toMatchObject({ accento: true, durata: 1 });

		const attacco = colpi(e, { note: false, metronomo: 'attacco' });
		expect(attacco).toHaveLength(4);
		expect(attacco.every((c) => c.timbro === 'clic' && c.volume === 1)).toBe(true);

		const piano = colpi(e, { note: false, metronomo: 'piano' });
		expect(piano).toHaveLength(8);
		expect(piano.filter((c) => c.volume === VOLUME_CLIC_PIANO)).toHaveLength(4);

		expect(colpi(e, { metronomo: 'tutti' })).toHaveLength(12);
	});
});

describe('valutazione dei battiti', () => {
	// 72 BPM, una battuta di attacco: crome fitte, una pausa e una minima
	const e = eventiRitmo(rigoRitmico('ta ti-ti ta sst ti-ti ti-ti ta-a', '4/4'), 72, 1);
	const giusti = attesi(e);

	it('battiti precisi: tutto giusto, niente scarto', () => {
		const v = valutaBattiti(e, T0, giusti, PRECISO);
		expect(v.riuscita).toBe(true);
		expect(v.giuste).toBe(9);
		expect(v.note).toHaveLength(9); // la pausa non si batte
		expect(v.scarto).toBe(0);
		expect(v.consiglio).toBeNull();
	});

	it('cuffie Bluetooth: 180 ms di ritardo costante si tolgono', () => {
		const v = valutaBattiti(
			e,
			T0,
			giusti.map((t) => t + 0.18),
			PRECISO
		);
		expect(v.scarto).toBeCloseTo(0.18, 9);
		expect(v.riuscita).toBe(true);
	});

	it('lo scarto si toglie solo fino al limite', () => {
		const tardi = giusti.map((t) => t + 0.3);
		const preciso = valutaBattiti(e, T0, tardi, PRECISO);
		expect(preciso.scarto).toBe(SCARTO_MAX_MS / 1000);
		expect(preciso.note.every((n) => n.giudizio === 'tardi')).toBe(true);
		expect(preciso.consiglio).toEqual({ tipo: 'tardi', nota: 0 });
		expect(valutaBattiti(e, T0, tardi, FACILE).riuscita).toBe(true); // 100 ms residui
	});

	it('battiti irregolari dentro la tolleranza, con latenze diverse: sempre riuscita', () => {
		for (let seed = 1; seed <= 200; seed++) {
			const r = creaCasuale(seed);
			// latenza fino al limite dello scarto, mani irregolari di ±70 ms (un bambino, non un metronomo)
			const latenza = (r() * 2 - 1) * 0.19;
			const battiti = giusti.map((t) => t + latenza + (r() * 2 - 1) * 0.07);
			const v = valutaBattiti(e, T0, battiti, FACILE);
			expect(v.riuscita, `seed ${seed}`).toBe(true);
		}
	});

	it('un battito in anticipo tra tanti giusti: "un po\' presto" su quella nota', () => {
		const battiti = giusti.map((t, i) => (i === 3 ? t - 0.2 : t));
		const v = valutaBattiti(e, T0, battiti, FACILE);
		expect(v.scarto).toBe(0);
		expect(v.note[3]).toMatchObject({ nota: 3, giudizio: 'presto' });
		expect(v.note[3].errore).toBeCloseTo(-0.2, 9);
		expect(v.giuste).toBe(8);
		expect(v.consiglio).toEqual({ tipo: 'presto', nota: 3 });
		expect(v.riuscita).toBe(false);
	});

	it('una nota mancata', () => {
		const v = valutaBattiti(
			e,
			T0,
			giusti.filter((_, i) => i !== 6),
			FACILE
		);
		expect(v.note[6]).toMatchObject({ nota: 7, giudizio: 'mancato', battito: null });
		expect(v.inPiu).toEqual([]);
		expect(v.consiglio).toEqual({ tipo: 'mancato', nota: 7 });
	});

	it('battito nella pausa: in più, "nella pausa le mani riposano"', () => {
		const pausa = e.note[4];
		expect(pausa.pausa).toBe(true);
		const nellaPausa = T0 + pausa.inizio + 0.4;
		const v = valutaBattiti(e, T0, [...giusti, nellaPausa], FACILE);
		expect(v.giuste).toBe(9);
		expect(v.inPiu).toEqual([{ t: nellaPausa, pausa: 4 }]);
		expect(v.consiglio).toEqual({ tipo: 'in-piu', pausa: 4 });
		expect(v.riuscita).toBe(false);
	});

	it('doppio battito sulla stessa nota: uno è in più', () => {
		const v = valutaBattiti(e, T0, [...giusti, giusti[0] + 0.05], FACILE);
		expect(v.giuste).toBe(9);
		expect(v.inPiu).toHaveLength(1);
		expect(v.inPiu[0].t).toBeCloseTo(giusti[0] + 0.05, 9);
	});

	it("i battiti sopra l'attacco e dopo la fine non contano", () => {
		const [da, a] = finestraAscolto(e, T0);
		expect(da).toBeCloseTo(T0 + e.attaccoS - (ABBINAMENTO_MAX_MS + SCARTO_MAX_MS) / 1000, 9);
		expect(a).toBe(T0 + e.fineS);
		const v = valutaBattiti(e, T0, [T0 + 0.5, T0 + 1.3, ...giusti, a + 0.2], FACILE);
		expect(v.riuscita).toBe(true);
	});

	it('nessun battito: tutte mancate, il consiglio parte dalla prima', () => {
		const v = valutaBattiti(e, T0, [], FACILE);
		expect(v.giuste).toBe(0);
		expect(v.note.every((n) => n.giudizio === 'mancato')).toBe(true);
		expect(v.consiglio).toEqual({ tipo: 'mancato', nota: 0 });
	});

	it('TA al posto di TI-TI: la seconda croma manca', () => {
		const r = eventiRitmo(rigoRitmico('ta ti-ti ta ta', '4/4'), 72, 1);
		const tutti = attesi(r);
		const v = valutaBattiti(
			r,
			T0,
			tutti.filter((_, i) => i !== 2),
			FACILE
		);
		expect(v.note.map((n) => n.giudizio)).toEqual([
			'giusto',
			'giusto',
			'mancato',
			'giusto',
			'giusto'
		]);
	});

	it('crome fitte con molto ritardo: ogni battito resta sulla sua nota', () => {
		const r = eventiRitmo(rigoRitmico('ti-ti ti-ti ti-ti ti-ti', '4/4'), 100, 1);
		const tutti = attesi(r);
		// a 100 BPM una croma dura 300 ms: senza spostamento il battito sarebbe più vicino alla nota dopo
		const v = valutaBattiti(
			r,
			T0,
			tutti.map((t) => t + 0.17),
			PRECISO
		);
		expect(v.scarto).toBeCloseTo(0.15, 9); // mai oltre metà della distanza tra le note
		expect(v.note.map((n) => n.giudizio)).toEqual(Array(8).fill('giusto'));
	});

	it("segni sotto le note: in battiti dall'inizio del rigo, scarto tolto", () => {
		const battiti = giusti
			.map((t, i) => (i === 0 ? t + 0.18 + 0.2 : t + 0.18))
			.filter((_, i) => i !== 2);
		const v = valutaBattiti(e, T0, [...battiti, T0 + e.note[4].inizio + 0.18 + 0.1], FACILE);
		const segni = segniBattiti(v, e, T0);
		expect(segni.map((s) => [s.giudizio, s.nota])).toEqual([
			['tardi', 0],
			['giusto', 1],
			['mancato', 2],
			['giusto', 3],
			['in-piu', 4],
			['giusto', 5],
			['giusto', 6],
			['giusto', 7],
			['giusto', 8],
			['giusto', 9]
		]);
		const battitoS = e.battitoS;
		expect(segni[0].battito).toBeCloseTo(0.2 / battitoS, 6);
		expect(segni[2].battito).toBeCloseTo(1.5, 9); // mancata: all'inizio della nota
		expect(segni[4].battito).toBeCloseTo(3 + 0.1 / battitoS, 6);
	});
});
