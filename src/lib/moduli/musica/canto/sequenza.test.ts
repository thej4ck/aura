import { describe, expect, it } from 'vitest';
import { freqDaMidi } from '#lib/core/audio/frequenze.ts';
import type { FrameVoce } from '#lib/core/musica/intonazione.ts';
import { midi } from '#lib/core/musica/note.ts';
import {
	GIRI_ECO,
	GIRI_PAUSA,
	MAX_PASSI,
	REGISTRO_PREDEFINITO,
	TIMEOUT_GIRO_MS,
	aggiungiEstensione,
	arpeggio,
	avanzaEstensione,
	basta,
	crescita,
	leggiEstensioni,
	limitiScritti,
	naturali,
	notaInCorso,
	nuovaEstensione,
	registroComodo,
	rigoDi,
	riprendi,
	risultato,
	serieEco,
	serieTieni,
	type Estensione,
	type StatoEstensione
} from './sequenza.ts';

const FPS = 30;
const OPZIONI = { tolleranzaCents: 50 };
/** quanto suona il sito un arpeggio (5 note da 0,7 s più le pause): i frame sono silenziati */
const SUONA_S = 4.3;

/** Un bambino sintetico: la nota comoda e le note che riesce a cantare (midi, compresi). */
type Voce = {
	comoda: number;
	basso: number;
	alto: number;
	manca?: (radice: number, volta: number) => boolean;
};

/** Fa avanzare la macchina con `n` frame alla stessa frequenza (null = silenzio). */
function canta(
	s: StatoEstensione,
	freq: number | null,
	secondi: number,
	t: { t: number },
	silenziato = false
) {
	for (let i = 0; i < Math.round(secondi * FPS); i++) {
		s = avanzaEstensione(s, { t: t.t, freq, silenziato } satisfies FrameVoce, OPZIONI);
		t.t += 1 / FPS;
	}
	return s;
}

/**
 * Gioca una partita intera: a ogni giro il sito suona (frame silenziati), poi il bambino canta le note
 * dell'arpeggio che sa prendere e sbaglia di un semitono e mezzo quelle fuori dalla sua voce.
 * Alle pause beve e riprende. Restituisce lo stato finale e le radici provate, in ordine.
 */
function partita(voce: Voce, fermaDopo = Infinity) {
	const t = { t: 0 };
	let s = canta(nuovaEstensione(), freqDaMidi(voce.comoda), 2.5, t);
	const radici: number[] = [];
	const volte = new Map<number, number>();
	while (s.fase !== 'fine' && radici.length < fermaDopo) {
		if (s.fase === 'pausa') {
			s = riprendi(s);
			continue;
		}
		const radice = s.radice!;
		radici.push(radice);
		const volta = (volte.get(radice) ?? 0) + 1;
		volte.set(radice, volta);
		const giro = s.giro;
		s = canta(s, freqDaMidi(radice), SUONA_S, t, true);
		for (const d of [0, 4, 7, 4, 0]) {
			const n = radice + d;
			const presa = n >= voce.basso && n <= voce.alto && !voce.manca?.(radice, volta);
			s = canta(s, freqDaMidi(presa ? n : n - 1.5), 0.8, t);
			if (s.giro !== giro || s.fase !== 'giro') break;
		}
		// fuori dalla voce: si resta lì finché il giro scade
		while (s.giro === giro && s.fase === 'giro') s = canta(s, freqDaMidi(radice - 1.5), 1, t);
	}
	return { s, radici };
}

const intervallo = (da: number, a: number) =>
	Array.from({ length: Math.abs(a - da) + 1 }, (_, i) => da + i * Math.sign(a - da || 1));

describe('estensione vocale', () => {
	it('sale di semitono, al secondo errore scende dalla radice −1, poi finisce: limiti dai giri riusciti', () => {
		const { s, radici } = partita({ comoda: 60, basso: 55, alto: 74 });
		// salita 60…67 (67 + 7 = 74), 68 mancato due volte; discesa 59…55, 54 mancato due volte
		expect(radici).toEqual([...intervallo(60, 68), 68, ...intervallo(59, 54), 54]);
		expect(s).toMatchObject({ fase: 'fine', motivo: 'finita', iniziale: 60, basso: 55, alto: 67 });
		expect(risultato(s)).toEqual({ basso: 55, alto: 74 });
	});

	it('un giro mancato da solo non ferma la salita: si riprova la stessa radice', () => {
		const manca = (radice: number, volta: number) => radice === 62 && volta === 1;
		const { s, radici } = partita({ comoda: 60, basso: 55, alto: 70, manca });
		expect(radici.slice(0, 5)).toEqual([60, 61, 62, 62, 63]);
		expect(risultato(s)).toEqual({ basso: 55, alto: 70 });
	});

	it(`al massimo ${MAX_PASSI} semitoni per direzione, anche con una voce molto ampia`, () => {
		const { s, radici } = partita({ comoda: 60, basso: 30, alto: 100 });
		expect(Math.max(...radici)).toBe(60 + MAX_PASSI);
		expect(Math.min(...radici)).toBe(60 - MAX_PASSI);
		expect(risultato(s)).toEqual({ basso: 48, alto: 79 });
	});

	it('se la radice iniziale non riesce mai, si scende subito; i limiti vengono dalla discesa', () => {
		const { s, radici } = partita({ comoda: 64, basso: 52, alto: 70 });
		expect(radici.slice(0, 3)).toEqual([64, 64, 63]);
		expect(risultato(s)).toEqual({ basso: 52, alto: 70 });
	});

	it('nessun giro riuscito: nessun risultato', () => {
		const { s } = partita({ comoda: 60, basso: 0, alto: 0 });
		expect(s).toMatchObject({ fase: 'fine', motivo: 'finita' });
		expect(risultato(s)).toBeNull();
	});

	it(`pausa per bere ogni ${GIRI_PAUSA} giri: i frame non contano finché non si riprende`, () => {
		const { s } = partita({ comoda: 60, basso: 55, alto: 80 }, GIRI_PAUSA);
		expect(s).toMatchObject({ fase: 'pausa', conclusi: GIRI_PAUSA, radice: 64 });
		const t = { t: 100 };
		expect(canta(s, freqDaMidi(64), 5, t)).toBe(s);
		expect(riprendi(s)).toMatchObject({ fase: 'giro', radice: 64, giro: s.giro + 1 });
	});

	it('"Basta così" finisce subito e tiene i giri riusciti; dopo la fine non cambia più niente', () => {
		const { s } = partita({ comoda: 60, basso: 55, alto: 80 }, 3);
		expect(s.fase).toBe('giro');
		const fine = basta(s);
		expect(fine).toMatchObject({ fase: 'fine', motivo: 'basta' });
		expect(risultato(fine)).toEqual({ basso: 60, alto: 69 });
		expect(basta(fine)).toBe(fine);
		expect(canta(fine, freqDaMidi(60), 1, { t: 200 })).toBe(fine);
		// prima ancora della nota comoda: nessun risultato
		expect(risultato(basta(nuovaEstensione()))).toBeNull();
	});

	it('la nota comoda è la mediana della voce; senza voce, dopo un po’ "non ti ho sentito"', () => {
		const t = { t: 0 };
		const s = canta(nuovaEstensione(), freqDaMidi(57.2), 2.5, t);
		expect(s).toMatchObject({ fase: 'giro', iniziale: 57, radice: 57, giro: 1, evento: 'radice' });
		// mentre si cerca, lo Staff mostra la nota che si canta
		expect(notaInCorso(nuovaEstensione())).toBeNull();
		expect(notaInCorso(canta(nuovaEstensione(), freqDaMidi(62.1), 0.5, { t: 0 }))).toBe('D4');
		const muto = canta(nuovaEstensione(), null, 21, { t: 0 });
		expect(muto).toMatchObject({ fase: 'fine', motivo: 'non-sentita' });
	});

	it('mentre suona il sito il tempo del giro non passa; senza cantare il giro scade', () => {
		const t = { t: 0 };
		const s = canta(nuovaEstensione(), freqDaMidi(60), 2.5, t);
		const suonato = canta(s, freqDaMidi(60), 30, t, true);
		expect(suonato).toMatchObject({ fase: 'giro', giro: 1 });
		const scaduto = canta(suonato, null, TIMEOUT_GIRO_MS / 1000 + 0.5, t);
		expect(scaduto).toMatchObject({
			fase: 'giro',
			giro: 2,
			radice: 60,
			errori: 1,
			evento: 'ripeti'
		});
	});

	it('senza equivalenza d’ottava: l’arpeggio cantato un’ottava sopra non vale', () => {
		const t = { t: 0 };
		let s = canta(nuovaEstensione(), freqDaMidi(60), 1.6, t);
		for (const d of [0, 4, 7, 4, 0]) s = canta(s, freqDaMidi(72 + d), 0.8, t);
		expect(s.conclusi).toBe(0);
		expect(s.sequenza.indice).toBe(0);
	});

	it('arpeggi trasposti con la grafia della tonalità; limiti scritti come nel gioco', () => {
		expect(arpeggio(63).note.map((n) => n.altezza)).toEqual(['Eb4', 'G4', 'Bb4', 'G4', 'Eb4']);
		expect(arpeggio(62).note.map((n) => n.altezza)).toEqual(['D4', 'F#4', 'A4', 'F#4', 'D4']);
		expect(arpeggio(61).note.map((n) => n.altezza)).toEqual(['Db4', 'F4', 'Ab4', 'F4', 'Db4']);
		expect(limitiScritti({ basso: 58, alto: 75 })).toEqual(['Bb3', 'Eb5']);
		expect(limitiScritti({ basso: 54, alto: 73 })).toEqual(['F#3', 'C#5']);
	});
});

describe('dati salvati e registro comodo', () => {
	const prova = (data: string, basso: number, alto: number): Estensione => ({ data, basso, alto });

	it('legge le prove valide, dalla più vecchia, e salta le altre', () => {
		const a = prova('2026-10-01T10:00:00.000Z', 55, 74);
		const b = prova('2026-10-08T10:00:00.000Z', 54, 76);
		const dati = {
			aggiornato: b.data,
			estensione: [b, { basso: 'Do' }, prova('ieri', 50, 60), a, prova(a.data, 70, 60)]
		};
		expect(leggiEstensioni(dati)).toEqual([a, b]);
		expect(leggiEstensioni(undefined)).toEqual([]);
		expect(leggiEstensioni({ estensione: 'no' })).toEqual([]);
	});

	it('tiene le ultime prove e misura la crescita in note', () => {
		const molte = Array.from({ length: 60 }, (_, i) =>
			prova(new Date(i * 1e9).toISOString(), 60, 70)
		);
		const lista = aggiungiEstensione(molte, prova('2030-01-01T00:00:00.000Z', 58, 74));
		expect(lista).toHaveLength(50);
		expect(lista.at(-1)).toMatchObject({ basso: 58 });
		expect(crescita(prova('x', 55, 74), { basso: 54, alto: 75 })).toBe(2);
	});

	it('registro: la prova più recente con un tono di margine; senza prove Do4-Do5', () => {
		expect(registroComodo([])).toEqual(REGISTRO_PREDEFINITO);
		expect(registroComodo([prova('a', 40, 50), prova('b', 55, 74)])).toEqual([57, 72]);
		// una prova stretta si usa intera
		expect(registroComodo([prova('b', 60, 67)])).toEqual([60, 67]);
		expect(naturali([60, 72])).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
	});

	it('rigo in chiave di basso per le voci gravi', () => {
		expect(rigoDi(['C4', 'E4']).chiave).toBe('violino');
		expect(rigoDi(['G2', 'B2', 'D3']).chiave).toBe('basso');
	});
});

describe('note dei giochi', () => {
	const seeds = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);

	it('"Tieni la nota": 3-5 note naturali del registro, mai due uguali di fila, stesse col seed', () => {
		for (const seed of seeds) {
			const serie = serieTieni(seed, REGISTRO_PREDEFINITO);
			expect(serie.length).toBeGreaterThanOrEqual(3);
			expect(serie.length).toBeLessThanOrEqual(5);
			for (const [i, a] of serie.entries()) {
				expect(a).toMatch(/^[A-G]\d$/);
				expect(midi(a)).toBeGreaterThanOrEqual(60);
				expect(midi(a)).toBeLessThanOrEqual(72);
				if (i) expect(a).not.toBe(serie[i - 1]);
			}
		}
		expect(serieTieni(42, [55, 70])).toEqual(serieTieni(42, [55, 70]));
		expect(
			new Set(seeds.map((s) => serieTieni(s, REGISTRO_PREDEFINITO).join())).size
		).toBeGreaterThan(1);
	});

	it('il seed degli e2e (Math.random = 0.3) comincia dal La4, la nota del microfono finto', () => {
		expect(serieTieni(Math.floor(0.3 * 2 ** 32), REGISTRO_PREDEFINITO)).toEqual(['A4', 'F4', 'E4']);
	});

	it('"Eco": prima per gradi congiunti, poi con almeno una terza, sempre nel registro', () => {
		for (const seed of seeds) {
			const giri = serieEco(seed, [57, 72]);
			expect(giri.map((g) => g.length)).toEqual(GIRI_ECO.map((g) => g.note));
			for (const [k, giro] of giri.entries()) {
				const gradi = giro.map((a) => naturali([57, 72]).indexOf(midi(a)));
				expect(gradi.every((g) => g >= 0)).toBe(true);
				const passi = gradi.slice(1).map((g, i) => Math.abs(g - gradi[i]));
				if (GIRI_ECO[k].salti) {
					expect(passi.every((p) => p === 1 || p === 2)).toBe(true);
					expect(passi).toContain(2);
				} else expect(passi.every((p) => p === 1)).toBe(true);
			}
		}
	});
});
