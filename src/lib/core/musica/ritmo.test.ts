import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import {
	ABBINAMENTO_MAX_MS,
	CALO_A_MS,
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
	momentoTurno,
	pianoTurno,
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

	it('battito sulla pausa ma un attimo prima: è ancora nella pausa; un doppio battito sulla nota prima no', () => {
		const pausa = e.note[4];
		const prima = e.note[3]; // TA, subito prima della pausa
		const unPoPresto = T0 + pausa.inizio - 0.03;
		const v = valutaBattiti(e, T0, [...giusti, unPoPresto], FACILE);
		expect(v.inPiu).toEqual([{ t: unPoPresto, pausa: 4 }]);
		const doppio = T0 + prima.inizio + 0.2;
		expect(valutaBattiti(e, T0, [...giusti, doppio], FACILE).inPiu).toEqual([{ t: doppio }]);
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

	describe('un battito lontano dalla sua nota, ma solo lui vicino', () => {
		// 'ta ti-ti ta-a' a 72 BPM: le note a 0, 0,83, 1,25 e 1,67 s dall'attacco
		const r = eventiRitmo(rigoRitmico('ta ti-ti ta-a'), 72, 1);
		const tutti = attesi(r);
		const sposta = (d: number[]) => tutti.map((t, i) => t + d[i]);

		it('partito prima del conteggio: la prima nota è presto, non mancata con un battito in più', () => {
			const v = valutaBattiti(r, T0, sposta([-0.38, 0, 0, 0]), FACILE);
			expect(v.note.map((n) => n.giudizio)).toEqual(['presto', 'giusto', 'giusto', 'giusto']);
			expect(v.note[0].errore).toBeCloseTo(-0.38, 9);
			expect(v.inPiu).toEqual([]);
			expect(v.consiglio).toEqual({ tipo: 'presto', nota: 0 });
		});

		it('la minima battuta tardi: tardi, non mancata con un battito in più', () => {
			const v = valutaBattiti(r, T0, sposta([0, 0, 0, 0.33]), FACILE);
			expect(v.note.map((n) => n.giudizio)).toEqual(['giusto', 'giusto', 'giusto', 'tardi']);
			expect(v.inPiu).toEqual([]);
			expect(v.consiglio).toEqual({ tipo: 'tardi', nota: 3 });
		});

		it('il battito di una nota mancata non si prende da una pausa né da una nota vicina', () => {
			// 'ta sst ta ta': salta la prima nota e batte sulla pausa; il doppio battito resta in più
			const p = eventiRitmo(rigoRitmico('ta sst ta ta'), 72, 1);
			const [, b, c] = attesi(p);
			const sullaPausa = T0 + p.note[1].inizio;
			const v = valutaBattiti(p, T0, [sullaPausa, b, c, c + 0.2], FACILE);
			expect(v.note.map((n) => n.giudizio)).toEqual(['mancato', 'giusto', 'giusto']);
			expect(v.inPiu).toEqual([{ t: sullaPausa, pausa: 1 }, { t: c + 0.2 }]);
		});
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

describe('turno ritmico', () => {
	// 'ta sst ti-ti ta' a 60 BPM: un battito al secondo, una battuta in 4/4
	const rigo = rigoRitmico('ta sst ti-ti ta', '4/4');
	const conta = (p: ReturnType<typeof pianoTurno>, f: (k: (typeof p.colpi)[number]) => boolean) =>
		p.colpi.filter(f).length;
	const clic = (k: { timbro: string }) => k.timbro === 'clic';

	it('eco col tocco: il sito suona attacco e ritmo con tutti i clic, poi il bambino ha attacco e clic piano', () => {
		const p = pianoTurno(rigo, 60, { eco: true, fonte: 'tocco' });
		expect(p.da).toBe(8); // attacco (4) e ritmo (4) del sito
		// legnetto solo nel turno del sito: 4 note, la pausa tace
		expect(p.colpi.filter((k) => k.timbro === 'legnetto').map((k) => k.inizio)).toEqual([
			4, 6, 6.5, 7
		]);
		// un clic per battito, senza buchi da 0 a 15: il battito non salta tra sito e bambino
		expect(p.colpi.filter(clic).map((k) => k.inizio)).toEqual([...Array(16).keys()]);
		expect(conta(p, (k) => clic(k) && k.inizio >= 12 && k.volume === VOLUME_CLIC_PIANO)).toBe(4);
		expect(conta(p, (k) => clic(k) && k.inizio < 12 && k.volume === VOLUME_CLIC_PIANO)).toBe(0);
		expect(p.fine).toBe(16); // la fine del rigo: l'ultima nota più il margine sta prima
	});

	it('col microfono dopo l’attacco del bambino non suona niente, e il turno aspetta il battito ritardato', () => {
		const p = pianoTurno(rigo, 60, { eco: true, fonte: 'mani' });
		const ultimo = Math.max(...p.colpi.map((k) => k.inizio));
		expect(ultimo).toBe(11); // l'ultimo clic dell'attacco del bambino
		expect(ultimo).toBeLessThan(p.da + p.bimbo.attaccoS);
		expect(conta(p, clic)).toBe(12);
		expect(p.fine).toBeCloseTo(16 + CALO_A_MS / 1000 + 0.05, 9);
	});

	it('in lettura suona solo l’attacco del bambino', () => {
		const p = pianoTurno(rigo, 60, { eco: false, fonte: 'mani' });
		expect(p.sito).toBeUndefined();
		expect(p.da).toBe(0);
		expect(p.colpi.map((k) => [k.timbro, k.inizio, k.accento])).toEqual([
			['clic', 0, true],
			['clic', 1, false],
			['clic', 2, false],
			['clic', 3, false]
		]);
	});

	it('il battito visivo, la nota del sito e a chi tocca seguono il tempo', () => {
		const p = pianoTurno(rigoRitmico('ta ta ta', '3/4'), 60, { eco: true, fonte: 'tocco' });
		expect(p.perBattuta).toBe(3);
		const momenti = [-0.1, 0, 1.5, 3, 4.9, 5.99, 6, 8.4, 8.5, 9, 11.9, 12].map((t) =>
			momentoTurno(p, t)
		);
		expect(momenti.map((x) => x.battito)).toEqual([null, 0, 1, 0, 1, 2, 0, 2, 2, 0, 2, null]);
		// il sito suona da 3 a 6 (dopo il suo attacco); la pausa del bambino no
		expect(momenti.map((x) => x.suona)).toEqual([
			null,
			null,
			null,
			0,
			1,
			2,
			null,
			null,
			null,
			null,
			null,
			null
		]);
		// «batti» da mezzo battito prima della prima nota del bambino (6 + 3 = 9)
		expect(momenti.map((x) => x.turno).indexOf('batti')).toBe(8);
		expect(momentoTurno(p, p.fine - 0.001).finito).toBe(false);
		expect(momentoTurno(p, p.fine).finito).toBe(true);
	});

	it('senza tempo in chiave l’attacco del bambino riparte dal primo battito', () => {
		// 3 battiti contati in 4: il sito finisce a metà battuta, l'attacco del bambino ricomincia da 1
		const p = pianoTurno(rigoRitmico('ta ta ta'), 60, { eco: true, fonte: 'tocco' });
		expect(p.da).toBe(7);
		expect(momentoTurno(p, 6.5).battito).toBe(2);
		expect(momentoTurno(p, 7).battito).toBe(0);
	});

	it('un turno battuto a tempo riesce; senza battiti tutte le note sono mancate', () => {
		const p = pianoTurno(rigo, 72, { eco: false, fonte: 'tocco' });
		const t0 = T0 + p.da;
		const giusti = p.bimbo.note.filter((n) => !n.pausa).map((n) => t0 + n.inizio + 0.03);
		expect(valutaBattiti(p.bimbo, t0, giusti, FACILE).riuscita).toBe(true);
		// i tocchi sull'attacco (si batte insieme ai clic) e dopo la fine non contano
		const [da, a] = finestraAscolto(p.bimbo, t0);
		expect(da).toBeGreaterThan(t0 + p.bimbo.attaccoS - p.bimbo.battitoS);
		expect(a).toBeLessThanOrEqual(T0 + p.fine);
		const vuoto = valutaBattiti(p.bimbo, t0, [], FACILE);
		expect(vuoto.note.map((n) => n.giudizio)).toEqual(Array(4).fill('mancato'));
	});
});
