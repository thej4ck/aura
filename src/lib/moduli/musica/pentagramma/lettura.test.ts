import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { creaCasuale } from '#lib/core/casuale.ts';
import { passo } from '#lib/core/musica/notazione.ts';
import {
	ORDINE_NOTE,
	SCATOLE,
	SERIE_SBLOCCO,
	estrai,
	leggiLeitner,
	prossimaDaSbloccare,
	MAX_PASSI_TROVALA,
	registro,
	rispondi,
	sbloccate,
	serie,
	vicina,
	type StatoLettura
} from './lettura';
import { schemaProps as trovala } from './widget/Trovala.svelte';

describe('scatole salvate', () => {
	it('si parte da Mi, Sol e Si nella prima scatola', () => {
		expect(leggiLeitner(undefined)).toEqual({ E4: 1, G4: 1, B4: 1 });
		expect(sbloccate(leggiLeitner(undefined))).toEqual(['E4', 'G4', 'B4']);
		expect(prossimaDaSbloccare(leggiLeitner(undefined))).toBe('D5');
	});

	it('tiene le scatole valide e scarta il resto', () => {
		expect(leggiLeitner({ E4: 3, D5: 2, F5: 9, A4: 1.5, H9: 1, C4: 'x' })).toEqual({
			E4: 3,
			G4: 1,
			B4: 1,
			D5: 2
		});
		expect(leggiLeitner('rotto')).toEqual({ E4: 1, G4: 1, B4: 1 });
	});
});

describe('estrazione pesata', () => {
	it('con lo stesso seed esce la stessa sequenza', () => {
		const leitner = { E4: 1, G4: 3, B4: 5 };
		const giro = (seed: number) => {
			const r = creaCasuale(seed);
			return Array.from({ length: 20 }, () => estrai(leitner, r));
		};
		expect(giro(7)).toEqual(giro(7));
	});

	it('le note da ripassare escono più spesso; mai la stessa due volte di fila', () => {
		const leitner = { E4: 1, G4: 5, B4: 5 };
		const r = creaCasuale(42);
		const conta: Record<string, number> = { E4: 0, G4: 0, B4: 0 };
		let prima: string | undefined;
		for (let i = 0; i < 3000; i++) {
			const n = estrai(leitner, r, prima);
			expect(n).not.toBe(prima);
			conta[n]++;
			prima = n;
		}
		// senza ripetizioni la nota da ripassare esce quasi una volta su due
		expect(conta.E4).toBeGreaterThan(conta.G4 * 1.5);
		expect(conta.E4).toBeGreaterThan(conta.B4 * 1.5);
		// il peso da solo: 16 contro 1
		const sole: Record<string, number> = { E4: 0, G4: 0, B4: 0 };
		for (let i = 0; i < 3000; i++) sole[estrai(leitner, r)]++;
		expect(sole.E4).toBeGreaterThan((sole.G4 + sole.B4) * 4);
	});

	it('con una sola nota esce sempre quella', () => {
		expect(estrai({ E4: 2 }, creaCasuale(1), 'E4')).toBe('E4');
	});
});

describe('Leitner e sblocco', () => {
	const inizio: StatoLettura = { leitner: leggiLeitner(undefined), serie: 0 };

	it('giusta: una scatola in su (fino alla quinta); da rivedere: di nuovo nella prima', () => {
		let s = rispondi(inizio, 'E4', true);
		expect(s.leitner.E4).toBe(2);
		expect(s.serie).toBe(1);
		for (let i = 0; i < 6; i++) s = rispondi(s, 'G4', true);
		expect(s.leitner.G4).toBe(SCATOLE);
		s = rispondi(s, 'G4', false);
		expect(s.leitner.G4).toBe(1);
		expect(s.serie).toBe(0);
	});

	it(`dopo ${SERIE_SBLOCCO} giuste di fila arriva il Re, nella prima scatola`, () => {
		let s: ReturnType<typeof rispondi> = inizio;
		for (let i = 0; i < SERIE_SBLOCCO - 1; i++) {
			s = rispondi(s, 'G4', true);
			expect(s.sbloccata).toBeUndefined();
		}
		s = rispondi(s, 'B4', true);
		expect(s.sbloccata).toBe('D5');
		expect(s.leitner.D5).toBe(1);
		expect(s.serie).toBe(0);
		expect(sbloccate(s.leitner)).toEqual(['E4', 'G4', 'B4', 'D5']);
	});

	it('un errore azzera la serie', () => {
		let s: ReturnType<typeof rispondi> = inizio;
		for (let i = 0; i < SERIE_SBLOCCO - 1; i++) s = rispondi(s, 'G4', true);
		s = rispondi(s, 'E4', false);
		s = rispondi(s, 'G4', true);
		expect(s.sbloccata).toBeUndefined();
	});

	it('con tutte le note sbloccate la serie continua senza sblocchi', () => {
		const tutte = Object.fromEntries(ORDINE_NOTE.map((n) => [n, 3]));
		let s: ReturnType<typeof rispondi> = { leitner: tutte, serie: 0 };
		for (let i = 0; i < SERIE_SBLOCCO * 2; i++) s = rispondi(s, 'A5', true);
		expect(s.sbloccata).toBeUndefined();
		expect(s.serie).toBe(SERIE_SBLOCCO * 2);
	});
});

describe('serie di item', () => {
	it('stesso seed, stessa serie; tutte le note prima di ripeterne una; mai due uguali di fila', () => {
		const mazzo = ['C4', 'D4', 'E4', 'F4'];
		const a = serie(mazzo, 10, creaCasuale(3));
		expect(a).toEqual(serie(mazzo, 10, creaCasuale(3)));
		expect(a).toHaveLength(10);
		expect(new Set(a.slice(0, 4))).toEqual(new Set(mazzo));
		for (let i = 1; i < a.length; i++) expect(a[i]).not.toBe(a[i - 1]);
	});
});

describe('aiuti', () => {
	it('la nota con quella lettera più vicina', () => {
		expect(vicina('E', 'G4')).toBe('E4');
		expect(vicina('E', 'C5')).toBe('E5');
		expect(vicina('C', 'A5')).toBe('C5'); // C6 è fuori dal gioco
	});

	it('quale delle due posizioni con lo stesso nome, tra quelle che si possono toccare', () => {
		const rigo = [-2, 11] as const; // dal Do sotto al Si sopra
		expect(registro('F5', rigo)).toBe('alto');
		expect(registro('C4', rigo)).toBe('basso');
		expect(registro('C5', rigo)).toBe('alto');
		expect(registro('B5', rigo)).toBe('alto');
		expect(registro('B4', [-2, 10])).toBeUndefined(); // senza il Si sopra il nome è unico
	});

	it('«Trovala»: nel rigo di default la domanda distingue sempre i due posti con lo stesso nome', () => {
		const rigo = v.parse(trovala, {}).selezionabili;
		expect(rigo).toEqual([-2, 11]); // dal Do sotto al Si sopra: il Do6 sul secondo taglio non c'è
		expect(v.safeParse(trovala, { selezionabili: [-2, 12] }).success).toBe(false); // tre Do
		expect(rigo[1] - rigo[0]).toBeLessThanOrEqual(MAX_PASSI_TROVALA);
		for (const nota of ORDINE_NOTE) {
			const gemelli = [passo(nota) - 7, passo(nota) + 7].filter(
				(q) => q >= rigo[0] && q <= rigo[1]
			);
			const verso = registro(nota, rigo);
			if (!gemelli.length) expect(verso).toBeUndefined();
			else expect(verso).toBe(gemelli[0] > passo(nota) ? 'basso' : 'alto');
		}
	});
});
