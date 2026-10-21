// mic.ts con getUserMedia, AudioContext e requestAnimationFrame finti.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FrameMic } from './mic.ts';

const nodo = () => ({ connect: vi.fn((n: unknown) => n), disconnect: vi.fn() });
const param = () => ({ value: 0 });

class ContestoFinto {
	currentTime = 10;
	sampleRate = 48_000;
	state = 'running';
	destination = nodo();
	sorgente = nodo();
	resume = vi.fn(async () => {});
	suspend = vi.fn(async () => {});
	createGain = () => ({ ...nodo(), gain: param() });
	createDynamicsCompressor = () => ({
		...nodo(),
		threshold: param(),
		knee: param(),
		ratio: param(),
		attack: param(),
		release: param()
	});
	createMediaStreamSource = () => this.sorgente;
	// il microfono "sente" un La4
	createAnalyser = () => ({
		...nodo(),
		fftSize: 0,
		getFloatTimeDomainData: (b: Float32Array) => {
			for (let i = 0; i < b.length; i++) b[i] = 0.3 * Math.sin((2 * Math.PI * 440 * i) / 48_000);
		}
	});
}

let traccia: { stop: ReturnType<typeof vi.fn> };
let getUserMedia: ReturnType<typeof vi.fn>;
let prossimoFrame: ((t: number) => void) | undefined;
const ascoltatori = new Map<string, () => void>();
let mic: typeof import('./mic.ts');
let audio: typeof import('./contesto.ts');

beforeEach(async () => {
	traccia = { stop: vi.fn() };
	getUserMedia = vi.fn(async () => ({ getTracks: () => [traccia] }));
	vi.stubGlobal('isSecureContext', true);
	vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
	vi.stubGlobal('AudioContext', ContestoFinto);
	vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) => ((prossimoFrame = f), 1));
	vi.stubGlobal('cancelAnimationFrame', () => (prossimoFrame = undefined));
	vi.stubGlobal('addEventListener', (tipo: string, f: () => void) => ascoltatori.set(tipo, f));
	vi.stubGlobal('removeEventListener', (tipo: string) => ascoltatori.delete(tipo));
	vi.resetModules();
	mic = await import('./mic.ts');
	audio = await import('./contesto.ts');
});
afterEach(() => vi.unstubAllGlobals());

/** fa girare il loop a `ms` (timestamp di rAF) */
const giro = (ms: number) => prossimoFrame?.(ms);

describe('apriMicrofono', () => {
	it('chiede la voce senza i filtri delle chiamate e dà frame con altezza e tempo audio', async () => {
		const frame: FrameMic[] = [];
		await mic.apriMicrofono({ onframe: (f) => frame.push(f), latenzaMs: 100 });
		expect(getUserMedia).toHaveBeenCalledWith({
			audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
		});
		for (let ms = 0; ms <= 100; ms += 1000 / 60) giro(ms); // schermo a 60 Hz → ~30 frame/s
		expect(frame.length).toBeGreaterThanOrEqual(3);
		expect(frame.length).toBeLessThanOrEqual(4);
		const [f] = frame;
		expect(f.freq).toBeCloseTo(440, 0);
		expect(f.silenziato).toBe(false);
		expect(f.rms).toBeGreaterThan(0.2);
		// centro della finestra (1024 campioni) e latenza tolti dal clock audio
		expect(f.t).toBeCloseTo(10 - 1024 / 48_000 - 0.1, 10);
	});

	it('mentre suona il sito i frame sono silenziati', async () => {
		const frame: FrameMic[] = [];
		await mic.apriMicrofono({ onframe: (f) => frame.push(f) });
		const fine = audio.usa('riproduzione');
		giro(0);
		fine();
		giro(40);
		expect(frame.map((f) => [f.freq !== null, f.silenziato])).toEqual([
			[false, true],
			[true, false]
		]);
	});

	it('chiudi() e pagehide rilasciano il microfono', async () => {
		const onframe = vi.fn();
		const m = await mic.apriMicrofono({ onframe });
		m.chiudi();
		m.chiudi();
		expect(traccia.stop).toHaveBeenCalledOnce();
		expect(prossimoFrame).toBeUndefined();
		expect(ascoltatori.has('pagehide')).toBe(false);

		await mic.apriMicrofono({ onframe });
		ascoltatori.get('pagehide')!();
		expect(traccia.stop).toHaveBeenCalledTimes(2);
		expect(prossimoFrame).toBeUndefined();
	});

	it('errori con un codice', async () => {
		const codice = (p: Promise<unknown>) =>
			p.then(
				() => 'nessun errore',
				(e) => (e instanceof mic.ErroreMic ? e.codice : 'altro')
			);
		const apri = () => mic.apriMicrofono({ onframe: () => {} });
		const rifiuta = (name: string) =>
			getUserMedia.mockRejectedValueOnce(Object.assign(new Error(name), { name }));

		rifiuta('NotAllowedError');
		expect(await codice(apri())).toBe('permesso-negato');
		rifiuta('NotFoundError');
		expect(await codice(apri())).toBe('nessun-microfono');
		rifiuta('NotReadableError');
		expect(await codice(apri())).toBe('nessun-microfono');
		vi.stubGlobal('navigator', {});
		expect(await codice(apri())).toBe('non-supportato');
		vi.stubGlobal('isSecureContext', false);
		expect(await codice(apri())).toBe('contesto-non-sicuro');
	});
});
