import { describe, expect, it } from 'vitest';
import {
	SELEZIONABILI,
	altezzaDaPasso,
	nomePosizione,
	passiSelezionabili,
	passo,
	passoDaY,
	posizione,
	segniArmatura,
	segniDaMostrare,
	suLinea,
	tagli,
	yDaPasso
} from './notazione.ts';

describe('passi sul rigo', () => {
	it('chiave di violino: E4 sulla prima linea', () => {
		const linee = ['E4', 'G4', 'B4', 'D5', 'F5'].map((a) => passo(a));
		const spazi = ['F4', 'A4', 'C5', 'E5'].map((a) => passo(a));
		expect(linee).toEqual([0, 2, 4, 6, 8]);
		expect(spazi).toEqual([1, 3, 5, 7]);
		expect(passo('C4')).toBe(-2);
		expect(passo('A5')).toBe(10);
		expect(passo('F#4')).toBe(1); // l'alterazione non sposta la nota
		expect(passo('Bb3')).toBe(-3);
		expect(passo('B#3')).toBe(-3);
		expect(passo('Cb4')).toBe(-2);
	});

	it('chiave di basso: G2 sulla prima linea, F3 sulla quarta', () => {
		expect(passo('G2', 'basso')).toBe(0);
		expect(passo('F3', 'basso')).toBe(6);
		expect(passo('A3', 'basso')).toBe(8);
		expect(passo('C4', 'basso')).toBe(10);
	});

	it('da passo ad altezza, con l’armatura', () => {
		expect(altezzaDaPasso(0)).toBe('E4');
		expect(altezzaDaPasso(-2)).toBe('C4');
		expect(altezzaDaPasso(-5)).toBe('G3');
		expect(altezzaDaPasso(10)).toBe('A5');
		expect(altezzaDaPasso(1, 'violino', 1)).toBe('F#4');
		expect(altezzaDaPasso(4, 'violino', -1)).toBe('Bb4');
		expect(altezzaDaPasso(6, 'basso')).toBe('F3');
		for (let p = -8; p <= 16; p++) expect(passo(altezzaDaPasso(p))).toBe(p);
	});

	it('linee e spazi', () => {
		expect([-2, 0, 4, 8, 10].every(suLinea)).toBe(true);
		expect([-3, -1, 1, 7, 9].some(suLinea)).toBe(false);
	});
});

describe('tagli addizionali', () => {
	it.each([
		[0, []],
		[8, []],
		[-1, []],
		[9, []],
		[-2, [-2]],
		[-3, [-2]],
		[-4, [-2, -4]],
		[-5, [-2, -4]],
		[10, [10]],
		[11, [10]],
		[12, [10, 12]],
		[13, [10, 12]]
	])('passo %i → %j', (p, attesi) => expect(tagli(p)).toEqual(attesi));
});

describe('alterazioni', () => {
	it('rispetto all’armatura', () => {
		const segno = (a: string, armatura?: number) => segniDaMostrare([a], armatura)[0];
		expect(segno('C4')).toBeUndefined();
		expect(segno('F#4')).toBe('diesis');
		expect(segno('Bb3')).toBe('bemolle');
		expect(segno('F#4', 2)).toBeUndefined();
		expect(segno('F4', 2)).toBe('bequadro');
		expect(segno('Eb4', -3)).toBeUndefined();
		expect(segno('E4', -3)).toBe('bequadro');
		expect(segno('Db4', -3)).toBe('bemolle');
	});

	it('un rigo è una battuta: l’alterazione resta in vigore e si annulla con il segno', () => {
		expect(segniDaMostrare(['F#4', 'G4', 'F4'])).toEqual(['diesis', undefined, 'bequadro']);
		expect(segniDaMostrare(['Bb4', 'A4', 'B4'])).toEqual(['bemolle', undefined, 'bequadro']);
		// Sol maggiore: il Fa naturale vale fino a che un diesis non lo riporta all'armatura
		expect(segniDaMostrare(['F4', 'E4', 'F#4'], 1)).toEqual(['bequadro', undefined, 'diesis']);
		// la stessa nota alterata due volte ha sempre il suo segno; un'altra ottava non c'entra
		expect(segniDaMostrare(['F#4', 'F#4', 'F5'])).toEqual(['diesis', 'diesis', undefined]);
		expect(segniDaMostrare(['C4', 'C#4', 'D4', 'D#4', 'E4'])).toEqual([
			undefined,
			'diesis',
			undefined,
			'diesis',
			undefined
		]);
	});

	it('segni dell’armatura nelle posizioni classiche', () => {
		expect(segniArmatura(0)).toEqual([]);
		expect(segniArmatura(2)).toEqual([
			{ segno: 'diesis', passo: 8 },
			{ segno: 'diesis', passo: 5 }
		]);
		expect(segniArmatura(-3).map((s) => altezzaDaPasso(s.passo))).toEqual(['B4', 'E5', 'A4']);
		expect(segniArmatura(7).map((s) => altezzaDaPasso(s.passo))).toEqual([
			'F5',
			'C5',
			'G5',
			'D5',
			'A4',
			'E5',
			'B4'
		]);
		// in chiave di basso: Si Mi La Re Sol Do Fa, una terza sotto rispetto al violino
		expect(segniArmatura(-7, 'basso').map((s) => altezzaDaPasso(s.passo, 'basso'))).toEqual([
			'B2',
			'E3',
			'A2',
			'D3',
			'G2',
			'C3',
			'F2'
		]);
		expect(segniArmatura(1, 'basso')).toEqual([{ segno: 'diesis', passo: 6 }]);
		expect(() => segniArmatura(9)).toThrow(RangeError);
	});
});

describe('nomi delle posizioni', () => {
	it('linee e spazi del rigo', () => {
		expect([0, 2, 4, 6, 8].map(nomePosizione)).toEqual([
			'prima linea',
			'seconda linea',
			'terza linea',
			'quarta linea',
			'quinta linea'
		]);
		expect([1, 3, 5, 7].map(nomePosizione)).toEqual([
			'primo spazio',
			'secondo spazio',
			'terzo spazio',
			'quarto spazio'
		]);
	});

	it('tagli e spazi fuori dal rigo', () => {
		expect(nomePosizione(-1)).toBe('spazio sotto la prima linea');
		expect(nomePosizione(-2)).toBe('primo taglio in basso');
		expect(nomePosizione(-3)).toBe('spazio sotto il primo taglio');
		expect(nomePosizione(-4)).toBe('secondo taglio in basso');
		expect(nomePosizione(9)).toBe('spazio sopra la quinta linea');
		expect(nomePosizione(10)).toBe('primo taglio in alto');
		expect(nomePosizione(11)).toBe('spazio sopra il primo taglio');
		expect(nomePosizione(12)).toBe('secondo taglio in alto');
		expect(posizione(-5)).toEqual({ tipo: 'spazio-fuori', numero: 2, verso: 'sotto' });
		expect(posizione(14)).toEqual({ tipo: 'taglio', numero: 3, verso: 'sopra' });
	});
});

describe('hit-test', () => {
	const Y0 = 100; // y della prima linea
	const S = 10; // spazio

	it('da coordinata al passo più vicino', () => {
		expect(passoDaY(100, Y0, S)).toBe(0);
		expect(passoDaY(97.6, Y0, S)).toBe(0);
		expect(passoDaY(97.4, Y0, S)).toBe(1);
		expect(passoDaY(92, Y0, S)).toBe(2);
		expect(passoDaY(110, Y0, S)).toBe(-2);
		for (let p = -2; p <= 10; p++) expect(passoDaY(yDaPasso(p, Y0, S), Y0, S)).toBe(p);
	});

	it('limitato ai passi selezionabili', () => {
		expect(passoDaY(0, Y0, S)).toBe(SELEZIONABILI[1]);
		expect(passoDaY(500, Y0, S)).toBe(SELEZIONABILI[0]);
		expect(passoDaY(500, Y0, S, [-4, 12])).toBe(-4);
	});

	it('passi selezionabili dall’alto in basso: C4–A5 di default', () => {
		const passi = passiSelezionabili();
		expect(passi).toHaveLength(13);
		expect([passi[0], passi.at(-1)]).toEqual([10, -2]);
		expect([altezzaDaPasso(passi[0]), altezzaDaPasso(passi.at(-1)!)]).toEqual(['A5', 'C4']);
		expect(passiSelezionabili([0, 2])).toEqual([2, 1, 0]);
	});
});
