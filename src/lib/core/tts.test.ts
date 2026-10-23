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

	it('si chiude anche se onend non arriva mai: quando la sintesi smette di parlare', async () => {
		vi.useFakeTimers();
		try {
			const { s } = sintesiFinta([locale]);
			const stato = { speaking: true, pending: false };
			Object.defineProperties(s, {
				speaking: { get: () => stato.speaking },
				pending: { get: () => stato.pending }
			});
			s.speak = () => {}; // nessun evento, come quando Chrome perde la frase
			let finita = false;
			const lettura = parla('Ciao!', 'it').then(() => (finita = true));
			await vi.advanceTimersByTimeAsync(1_000);
			expect(finita).toBe(false); // sta ancora parlando
			stato.speaking = false;
			await vi.advanceTimersByTimeAsync(600);
			await lettura;
			expect(finita).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});

	it('si chiude comunque dopo il limite, anche se la sintesi dice di parlare per sempre', async () => {
		vi.useFakeTimers();
		try {
			const { s } = sintesiFinta([locale]);
			Object.defineProperty(s, 'speaking', { get: () => true });
			s.speak = () => {};
			let finita = false;
			void parla('Ciao!', 'it').then(() => (finita = true));
			await vi.advanceTimersByTimeAsync(4_000);
			expect(finita).toBe(false);
			await vi.advanceTimersByTimeAsync(2_000); // 5 s + 5 caratteri × 120 ms
			expect(finita).toBe(true);
		} finally {
			vi.useRealTimers();
		}
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
