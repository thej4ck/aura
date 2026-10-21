import { afterEach, describe, expect, it, vi } from 'vitest';
import { ferma, parla, ttsDisponibile } from './tts';

type Voce = Pick<SpeechSynthesisVoice, 'lang' | 'localService' | 'default' | 'name'>;

class Frase {
	voice?: Voce;
	lang = '';
	rate = 1;
	onend?: () => void;
	onerror?: () => void;
	constructor(readonly text: string) {}
}

function sintesiFinta(voci: Voce[]) {
	const dette: Frase[] = [];
	const s = {
		getVoices: () => voci,
		speak: (f: Frase) => {
			dette.push(f);
			f.onend?.();
		},
		cancel: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	};
	vi.stubGlobal('speechSynthesis', s);
	vi.stubGlobal('SpeechSynthesisUtterance', Frase);
	return { s, dette };
}

const rete: Voce = { name: 'Rete', lang: 'it-IT', localService: false, default: true };
const locale: Voce = { name: 'Locale', lang: 'it_IT', localService: true, default: false };

afterEach(() => vi.unstubAllGlobals());

describe('tts', () => {
	it('senza speechSynthesis non è disponibile e non fa nulla', async () => {
		expect(await ttsDisponibile('it')).toBe(false);
		await parla('ciao', 'it');
		expect(() => ferma()).not.toThrow();
	});

	it('solo voci di rete: non disponibile, non parla', async () => {
		const { dette } = sintesiFinta([rete]);
		expect(await ttsDisponibile('it')).toBe(false);
		await parla('ciao', 'it');
		expect(dette).toEqual([]);
	});

	it('con una voce locale parla con quella', async () => {
		const { s, dette } = sintesiFinta([rete, locale, { ...locale, lang: 'en-US', name: 'En' }]);
		expect(await ttsDisponibile('it')).toBe(true);
		expect(await ttsDisponibile('de')).toBe(false);
		await parla('Ciao!', 'it');
		expect(dette).toHaveLength(1);
		expect(dette[0]).toMatchObject({ text: 'Ciao!', voice: locale, lang: 'it_IT' });
		ferma();
		expect(s.cancel).toHaveBeenCalled();
	});

	it('aspetta il caricamento delle voci', async () => {
		const { s } = sintesiFinta([]);
		const voci: Voce[] = [];
		s.getVoices = () => voci;
		s.addEventListener.mockImplementation((_: string, f: () => void) => {
			voci.push(locale);
			setTimeout(f, 0);
		});
		expect(await ttsDisponibile('it')).toBe(true);
		expect(s.removeEventListener).toHaveBeenCalled();
	});
});
