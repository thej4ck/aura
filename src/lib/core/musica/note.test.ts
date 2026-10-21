import { describe, expect, it } from 'vitest';
import {
	ARMATURE_MAGGIORI,
	LETTERE,
	alterazioniArmatura,
	altezza,
	altezzaInTonalita,
	armaturaMaggiore,
	arpeggioMaggiore,
	classe,
	componi,
	midi,
	nomeIntervallo,
	nomeNota,
	nomeNotaParlato,
	scalaCromatica,
	scalaMaggiore,
	scomponi
} from './note.ts';

describe('altezze e midi', () => {
	it.each([
		['C4', 60],
		['A4', 69],
		['F#4', 66],
		['Bb3', 58],
		['C0', 12],
		['B8', 119],
		['B#3', 60],
		['Cb4', 59],
		['E#4', 65],
		['Fb4', 64]
	])('%s → %i', (a, n) => expect(midi(a)).toBe(n));

	it('scompone e ricompone', () => {
		expect(scomponi('F#4')).toEqual({ lettera: 'F', alterazione: 1, ottava: 4 });
		expect(scomponi('Bb3')).toEqual({ lettera: 'B', alterazione: -1, ottava: 3 });
		expect(scomponi('G2')).toEqual({ lettera: 'G', alterazione: 0, ottava: 2 });
		for (const a of ['C4', 'F#4', 'Bb3', 'B#3', 'Cb0']) expect(componi(scomponi(a))).toBe(a);
	});

	it.each(['', 'H4', 'C9', 'c4', 'C##4', 'Cbb4', 'C-1', 'F#', '4'])('rifiuta "%s"', (a) =>
		expect(() => scomponi(a)).toThrow(RangeError)
	);

	it('scrive i midi con diesis o bemolle', () => {
		expect(altezza(60)).toBe('C4');
		expect(altezza(61)).toBe('C#4');
		expect(altezza(61, 'bemolle')).toBe('Db4');
		expect(altezza(70, 'bemolle')).toBe('Bb4');
		expect(altezza(71, 'bemolle')).toBe('B4');
		expect(altezza(57)).toBe('A3');
		expect(() => altezza(11)).toThrow(RangeError); // B-1: fuori dal modello
		for (let n = 12; n <= 119; n++) {
			expect(midi(altezza(n))).toBe(n);
			expect(midi(altezza(n, 'bemolle'))).toBe(n);
		}
	});

	it('classe d’altezza, anche sotto zero', () => {
		expect(classe(60)).toBe(0);
		expect(classe(71)).toBe(11);
		expect(classe(-1)).toBe(11);
		expect(classe(-12)).toBe(0);
	});
});

describe('nomi', () => {
	it('solfeggio e lettere, con ♯ e ♭', () => {
		const solfeggio = LETTERE.map((l) => nomeNota(`${l}4`));
		expect(solfeggio).toEqual(['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']);
		expect(nomeNota('F#4')).toBe('Fa♯');
		expect(nomeNota('Bb3')).toBe('Si♭');
		expect(nomeNota('C#5', 'solfeggio')).toBe('Do♯');
		expect(nomeNota('F#4', 'lettere')).toBe('F♯');
		expect(nomeNota('Eb4', 'lettere')).toBe('E♭');
		expect(nomeNota('G2', 'lettere')).toBe('G');
	});

	it('nomi parlati per lettori di schermo e voce', () => {
		expect(nomeNotaParlato('F#4')).toBe('Fa diesis');
		expect(nomeNotaParlato('Bb3')).toBe('Si bemolle');
		expect(nomeNotaParlato('C4')).toBe('Do');
		expect(nomeNotaParlato('Eb4', 'lettere')).toBe('E bemolle');
	});
});

describe('tonalità maggiori', () => {
	// tonica, armatura, scala attesa (senza ottava)
	const TONALITA: [number, number, string][] = [
		[60, 0, 'C D E F G A B C'],
		[61, -5, 'Db Eb F Gb Ab Bb C Db'],
		[62, 2, 'D E F# G A B C# D'],
		[63, -3, 'Eb F G Ab Bb C D Eb'],
		[64, 4, 'E F# G# A B C# D# E'],
		[65, -1, 'F G A Bb C D E F'],
		[66, 6, 'F# G# A# B C# D# E# F#'],
		[67, 1, 'G A B C D E F# G'],
		[68, -4, 'Ab Bb C Db Eb F G Ab'],
		[69, 3, 'A B C# D E F# G# A'],
		[70, -2, 'Bb C D Eb F G A Bb'],
		[71, 5, 'B C# D# E F# G# A# B']
	];

	it.each(TONALITA)('tonica %i: armatura %i, scala %s', (tonica, armatura, attesa) => {
		expect(armaturaMaggiore(tonica)).toBe(armatura);
		expect(armaturaMaggiore(tonica + 12)).toBe(armatura);
		const scala = scalaMaggiore(tonica);
		expect(scala.map((a) => a.slice(0, -1)).join(' ')).toBe(attesa);
		// ogni grado è giusto in midi e le lettere si susseguono senza ripetersi
		expect(scala.map(midi)).toEqual([0, 2, 4, 5, 7, 9, 11, 12].map((s) => tonica + s));
		const lettere = scala.slice(0, 7).map((a) => a[0]);
		expect(new Set(lettere).size).toBe(7);
		const da = LETTERE.indexOf(scala[0][0] as (typeof LETTERE)[number]);
		expect(lettere).toEqual(LETTERE.map((_, i) => LETTERE[(da + i) % 7]));
	});

	it('la tabella copre le 12 tonaliche con al massimo 6 alterazioni', () => {
		expect(ARMATURE_MAGGIORI).toHaveLength(12);
		expect(Math.max(...ARMATURE_MAGGIORI.map(Math.abs))).toBe(6);
	});

	it('arpeggi trasposti nelle 12 tonalità', () => {
		const attesi = [
			'C4 E4 G4 E4 C4',
			'Db4 F4 Ab4 F4 Db4',
			'D4 F#4 A4 F#4 D4',
			'Eb4 G4 Bb4 G4 Eb4',
			'E4 G#4 B4 G#4 E4',
			'F4 A4 C5 A4 F4',
			'F#4 A#4 C#5 A#4 F#4',
			'G4 B4 D5 B4 G4',
			'Ab4 C5 Eb5 C5 Ab4',
			'A4 C#5 E5 C#5 A4',
			'Bb4 D5 F5 D5 Bb4',
			'B4 D#5 F#5 D#5 B4'
		];
		expect(attesi.map((_, i) => arpeggioMaggiore(60 + i).join(' '))).toEqual(attesi);
		expect(arpeggioMaggiore(50).map(midi)).toEqual([50, 54, 57, 54, 50]);
	});

	it('alterazioni dell’armatura', () => {
		expect(alterazioniArmatura(0)).toEqual({ C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 });
		expect(alterazioniArmatura(2)).toMatchObject({ F: 1, C: 1, G: 0 });
		expect(alterazioniArmatura(-3)).toMatchObject({ B: -1, E: -1, A: -1, D: 0 });
		expect(Object.values(alterazioniArmatura(7))).toEqual(Array(7).fill(1));
		expect(Object.values(alterazioniArmatura(-7))).toEqual(Array(7).fill(-1));
		expect(() => alterazioniArmatura(8)).toThrow(RangeError);
		expect(() => alterazioniArmatura(1.5)).toThrow(RangeError);
	});

	it('note estranee alla tonalità: naturali, poi diesis o bemolle come l’armatura', () => {
		expect(altezzaInTonalita(65, 2)).toBe('F4'); // Fa naturale in Re maggiore
		expect(altezzaInTonalita(63, 2)).toBe('D#4');
		expect(altezzaInTonalita(64, -3)).toBe('E4'); // Mi naturale in Mi♭ maggiore
		expect(altezzaInTonalita(66, -3)).toBe('Gb4');
		expect(altezzaInTonalita(59, -7)).toBe('Cb4'); // Do♭ maggiore
		expect(altezzaInTonalita(65, 7)).toBe('E#4'); // Do♯ maggiore
	});
});

describe('scale cromatiche e intervalli', () => {
	it('diesis salendo, bemolle scendendo', () => {
		expect(scalaCromatica(60, 72).join(' ')).toBe('C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 C5');
		expect(scalaCromatica(72, 60).join(' ')).toBe('C5 B4 Bb4 A4 Ab4 G4 Gb4 F4 E4 Eb4 D4 Db4 C4');
		expect(scalaCromatica(64, 64)).toEqual(['E4']);
	});

	it('nomi degli intervalli in semitoni', () => {
		const nomi = Array.from({ length: 13 }, (_, i) => nomeIntervallo(i));
		expect(nomi).toEqual([
			'prima',
			'seconda minore',
			'seconda maggiore',
			'terza minore',
			'terza maggiore',
			'quarta giusta',
			'tritono',
			'quinta giusta',
			'sesta minore',
			'sesta maggiore',
			'settima minore',
			'settima maggiore',
			'ottava'
		]);
		expect(nomeIntervallo(-4)).toBe('terza maggiore');
		expect(nomeIntervallo(14)).toBe('14 semitoni');
	});
});
