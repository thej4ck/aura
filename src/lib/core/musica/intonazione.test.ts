import { describe, expect, it } from 'vitest';
import { freqDaMidi } from '#lib/core/audio/frequenze.ts';
import {
	MAX_PASSO_S,
	avanzaNotaComoda,
	avanzaSequenza,
	avanzaTenuta,
	nuovaNotaComoda,
	nuovaSequenza,
	nuovaTenuta,
	type FrameVoce,
	type OpzioniSequenza,
	type OpzioniTenuta
} from './intonazione.ts';

const FPS = 30;
const LA4 = 69;
const OTTAVE = [220, 880];

/** Frame sintetici a 30 al secondo da `da` per `secondi`, con la stessa frequenza (null = silenzio). */
function frame(freq: number | null, secondi: number, da = 0, silenziato = false): FrameVoce[] {
	return Array.from({ length: Math.round(secondi * FPS) }, (_, i) => ({
		t: da + i / FPS,
		freq,
		silenziato
	}));
}

/** Frame consecutivi: ogni pezzo parte dove finisce il precedente. */
function frasi(...pezzi: [freq: number | null, secondi: number, silenziato?: boolean][]) {
	let t = 0;
	return pezzi.flatMap(([freq, secondi, silenziato]) => {
		const f = frame(freq, secondi, t, silenziato);
		t += secondi;
		return f;
	});
}

const cents = (midi: number, c: number) => freqDaMidi(midi + c / 100);

const TENUTA: OpzioniTenuta = { target: LA4, tolleranzaCents: 50, obiettivoMs: 3000 };

function tieni(frames: FrameVoce[], o: OpzioniTenuta = TENUTA) {
	const storia = [nuovaTenuta()];
	for (const f of frames) storia.push(avanzaTenuta(storia.at(-1)!, f, o));
	return storia;
}

describe('tenuta di una nota', () => {
	it('in zona il progresso sale fino a 1 in circa 3 s, poi lo stato non cambia più', () => {
		const storia = tieni(frame(440, 3.2));
		const primaRiuscita = storia.findIndex((s) => s.riuscita);
		expect(storia[primaRiuscita].t).toBeGreaterThan(2.95);
		expect(storia[primaRiuscita].t).toBeLessThan(3.1);
		expect(storia.at(-1)!.progresso).toBe(1);
		const fine = storia.at(-1)!;
		expect(avanzaTenuta(fine, { t: 4, freq: 300 }, TENUTA)).toBe(fine);
	});

	it('fuori zona e in silenzio il progresso cala lentamente, non si azzera', () => {
		const [dopo, fuori, zitto] = [
			tieni(frame(440, 1.5)).at(-1)!,
			tieni(frasi([440, 1.5], [cents(LA4, 200), 1])).at(-1)!,
			tieni(frasi([440, 1.5], [null, 1])).at(-1)!
		];
		expect(dopo.progresso).toBeCloseTo(0.5, 1);
		// 1 s fuori zona toglie metà di quello che dà 1 s in zona (CALO_TENUTA = 0.5): 1/6
		expect(fuori.progresso).toBeCloseTo(0.5 - 1 / 6, 1);
		expect(fuori).toMatchObject({ inZona: false, riuscita: false });
		expect(fuori.cents).toBeCloseTo(200, 5);
		expect(zitto.progresso).toBeCloseTo(fuori.progresso, 5);
		expect(zitto.cents).toBeNull();
		// e si riprende da lì
		const ripresa = tieni(frasi([440, 1.5], [cents(LA4, 200), 1], [440, 2])).at(-1)!;
		expect(ripresa.progresso).toBeGreaterThan(0.95);
	});

	it('il progresso non scende sotto zero', () => {
		expect(tieni(frame(200, 2)).at(-1)!.progresso).toBe(0);
	});

	it('mentre suona il sito il progresso aspetta', () => {
		const storia = tieni(frasi([440, 1.5], [440, 2, true]));
		expect(storia.at(-1)!.progresso).toBeCloseTo(0.5, 1);
		expect(storia.at(-1)).toMatchObject({ cents: null, inZona: false });
	});

	it('la tolleranza in cent decide la zona', () => {
		const f = { t: 0, freq: cents(LA4, 40) };
		expect(avanzaTenuta(nuovaTenuta(), f, TENUTA).inZona).toBe(true);
		expect(avanzaTenuta(nuovaTenuta(), f, { ...TENUTA, tolleranzaCents: 30 }).inZona).toBe(false);
		const sotto = avanzaTenuta(nuovaTenuta(), { t: 0, freq: cents(LA4, -45) }, TENUTA);
		expect(sotto.cents).toBeCloseTo(-45, 5);
		expect(sotto.inZona).toBe(true);
	});

	it("con l'equivalenza d'ottava vale anche il La un'ottava sopra o sotto", () => {
		const ottava = OTTAVE.map((freq) => ({ t: 0, freq }));
		for (const f of ottava) {
			expect(avanzaTenuta(nuovaTenuta(), f, { ...TENUTA, equivalenzaOttava: true }).inZona).toBe(
				true
			);
			expect(avanzaTenuta(nuovaTenuta(), f, TENUTA).inZona).toBe(false);
		}
	});

	it('un buco tra due frame conta al massimo MAX_PASSO_S; il tempo che torna indietro conta zero', () => {
		const primo = avanzaTenuta(nuovaTenuta(), { t: 10, freq: 440 }, TENUTA);
		expect(primo.progresso).toBe(0); // primo frame: nessun tempo trascorso
		const dopoBuco = avanzaTenuta(primo, { t: 15, freq: 440 }, TENUTA);
		expect(dopoBuco.progresso).toBeCloseTo((MAX_PASSO_S * 1000) / 3000, 10);
		expect(avanzaTenuta(dopoBuco, { t: 1, freq: 440 }, TENUTA).progresso).toBe(dopoBuco.progresso);
	});
});

const DO_RE_MI: OpzioniSequenza = {
	note: [60, 62, 64],
	tolleranzaCents: 50,
	tenutaMs: 600,
	timeoutMs: 20_000
};

function canta(frames: FrameVoce[], o: OpzioniSequenza = DO_RE_MI) {
	const storia = [nuovaSequenza()];
	for (const f of frames) storia.push(avanzaSequenza(storia.at(-1)!, f, o));
	return storia;
}
const hz = (midi: number) => freqDaMidi(midi);

describe('sequenza in ordine', () => {
	it('Do Re Mi tenute ~0,6 s ciascuna: riuscita, una nota alla volta', () => {
		const storia = canta(frasi([hz(60), 0.7], [hz(62), 0.7], [hz(64), 0.7]));
		const fine = storia.at(-1)!;
		expect(fine).toMatchObject({ esito: 'riuscita', indice: 3, sentita: true });
		// l'indice sale di uno alla volta
		const indici = [...new Set(storia.map((s) => s.indice))];
		expect(indici).toEqual([0, 1, 2, 3]);
		// e ogni nota parte da zero
		const primaDelRe = storia.find((s) => s.indice === 1)!;
		expect(primaDelRe.tenuta.progresso).toBe(0);
		expect(avanzaSequenza(fine, { t: 9, freq: 300 }, DO_RE_MI)).toBe(fine);
	});

	it('una nota fuori ordine non conta: si resta sulla nota da cantare', () => {
		const fine = canta(frasi([hz(62), 1], [hz(64), 1])).at(-1)!;
		expect(fine).toMatchObject({ esito: 'in-corso', indice: 0 });
		expect(fine.tenuta.progresso).toBe(0);
	});

	it('nota troppo corta: non passa alla successiva', () => {
		const fine = canta(frasi([hz(60), 0.3], [null, 0.5])).at(-1)!;
		expect(fine.indice).toBe(0);
		expect(fine.tenuta.progresso).toBeGreaterThan(0);
	});

	it('dopo il tempo di ascolto la prova scade, con le note riuscite fin lì', () => {
		const o = { ...DO_RE_MI, timeoutMs: 3000 };
		const storia = canta(frasi([hz(60), 0.8], [hz(70), 3]), o);
		const fine = storia.at(-1)!;
		expect(fine).toMatchObject({ esito: 'scaduta', indice: 1, sentita: true });
		const scaduta = storia.find((s) => s.esito === 'scaduta')!;
		expect(scaduta.ascoltoMs).toBeGreaterThanOrEqual(3000);
		expect(scaduta.ascoltoMs).toBeLessThan(3100);
	});

	it('mentre suona il sito il tempo di ascolto non passa', () => {
		const fine = canta(frasi([null, 5, true], [null, 1]), { ...DO_RE_MI, timeoutMs: 3000 }).at(-1)!;
		expect(fine).toMatchObject({ esito: 'in-corso', sentita: false });
		expect(fine.ascoltoMs).toBeCloseTo(1000, 0);
	});

	it('nessuna voce fino alla scadenza: sentita resta falsa', () => {
		const fine = canta(frame(null, 4), { ...DO_RE_MI, timeoutMs: 3000 }).at(-1)!;
		expect(fine).toMatchObject({ esito: 'scaduta', indice: 0, sentita: false });
	});

	it("una nota sola con la tenuta lunga è il gioco «Tieni la nota», anche un'ottava sopra", () => {
		const o = { ...DO_RE_MI, note: [LA4], tenutaMs: 3000, equivalenzaOttava: true };
		expect(canta(frame(880, 3.2), o).at(-1)!.esito).toBe('riuscita');
		expect(canta(frame(880, 3.2), { ...o, equivalenzaOttava: false }).at(-1)!.esito).toBe(
			'in-corso'
		);
	});
});

describe('nota comoda', () => {
	function cerca(frames: FrameVoce[], o = {}) {
		const storia = [nuovaNotaComoda()];
		for (const f of frames) storia.push(avanzaNotaComoda(storia.at(-1)!, f, o));
		return storia;
	}

	it('2 s di voce intorno al Sol3, con qualche frame strano: Sol3', () => {
		const frames = frame(0, 2.2).map((f, i) => ({
			...f,
			// vibrato di ±30 cent, e ogni tanto un salto d'ottava o un frame perso
			freq: i % 11 === 5 ? hz(67) : i % 13 === 7 ? null : cents(55, 30 * Math.sin(i / 3))
		}));
		const storia = cerca(frames);
		const trovata = storia.find((s) => s.nota !== null)!;
		expect(trovata.nota).toBe(55);
		// serve ~75% di voce nella finestra di 2 s: non prima di 1,5 s
		expect(trovata.t).toBeGreaterThan(1.5);
		expect(storia.at(-1)!.nota).toBe(55);
	});

	it('la copertura cresce con la voce; con poca voce non decide', () => {
		const storia = cerca(frasi([hz(60), 0.5], [null, 2], [hz(60), 0.5]));
		expect(storia.at(-1)!.nota).toBeNull();
		expect(storia[10].copertura).toBeGreaterThan(0);
		expect(storia.at(-1)!.copertura).toBeLessThan(0.75);
	});

	it('i frame mentre suona il sito non contano', () => {
		expect(cerca(frame(hz(60), 3, 0, true)).at(-1)!.nota).toBeNull();
	});

	it('finestra e copertura si regolano', () => {
		const storia = cerca(frame(hz(62), 1.2), { finestraMs: 1000, copertura: 0.9 });
		expect(storia.at(-1)!.nota).toBe(62);
		const trovata = storia.find((s) => s.nota !== null)!;
		expect(trovata.t).toBeGreaterThan(0.85);
	});
});
