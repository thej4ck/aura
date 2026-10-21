import { describe, expect, it } from 'vitest';
import { numeroInLettere } from './numeri';

describe('numeroInLettere', () => {
	it.each([
		[0, 'zero'],
		[7, 'sette'],
		[13, 'tredici'],
		[21, 'ventuno'],
		[23, 'ventitré'],
		[38, 'trentotto'],
		[90, 'novanta'],
		[100, 'cento'],
		[101, 'centouno'],
		[103, 'centotré'],
		[108, 'centootto'],
		[180, 'centottanta'],
		[188, 'centottantotto'],
		[342, 'trecentoquarantadue'],
		[571, 'cinquecentosettantuno'],
		[999, 'novecentonovantanove']
	])('%i → %s', (n, lettere) => {
		expect(numeroInLettere(n)).toBe(lettere);
	});

	it('rifiuta numeri fuori intervallo o non interi', () => {
		expect(() => numeroInLettere(1000)).toThrow(RangeError);
		expect(() => numeroInLettere(-1)).toThrow(RangeError);
		expect(() => numeroInLettere(1.5)).toThrow(RangeError);
	});
});
