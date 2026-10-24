// mic.ts con getUserMedia, AudioContext e requestAnimationFrame finti.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FrameMic } from './mic.ts';

const nodo = () => ({ connect: vi.fn((n: unknown) => n), disconnect: vi.fn() });
const param = () => ({ value: 0 });

/** cosa "sente" il microfono finto: di base un La4 a 48 kHz */
let segnale = (i: number) => 0.3 * Math.sin((2 * Math.PI * 440 * i) / 48_000);

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
	filtro = { ...nodo(), type: '', frequency: param(), Q: param() };
	createBiquadFilter = () => this.filtro;
	analizzatore = {
		...nodo(),
		fftSize: 0,
		getFloatTimeDomainData: (b: Float32Array) => {
			for (let i = 0; i < b.length; i++) b[i] = segnale(i);
		}
	};
	createAnalyser = () => this.analizzatore;
}

let traccia: { stop: ReturnType<typeof vi.fn> };
let getUserMedia: ReturnType<typeof vi.fn>;
let prossimoFrame: ((t: number) => void) | undefined;
const ascoltatori = new Map<string, () => void>();
let mic: typeof import('./mic.ts');
let audio: typeof import('./contesto.ts');

beforeEach(async () => {
	segnale = (i) => 0.3 * Math.sin((2 * Math.PI * 440 * i) / 48_000);
	traccia = { stop: vi.fn() };
	getUserMedia = vi.fn(async () => ({ getTracks: () => [traccia] }));
	vi.stubGlobal('isSecureContext', true);
	vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
	vi.stubGlobal('AudioContext', ContestoFinto);
	vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) => ((prossimoFrame = f), 1));
	vi.stubGlobal('cancelAnimationFrame', () => (prossimoFrame = undefined));
	vi.stubGlobal('addEventListener', (tipo: string, f: () => void) => ascoltatori.set(tipo, f));
	vi.stubGlobal('removeEventListener', (tipo: string) => ascoltatori.delete(tipo));
	vi.stubGlobal('document', {
		visibilityState: 'visible',
		addEventListener: (tipo: string, f: () => void) => ascoltatori.set(tipo, f),
		removeEventListener: (tipo: string) => ascoltatori.delete(tipo)
	});
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

	it('passa-basso nativo prima dell’analizzatore, e a YIN un campione su due', async () => {
		const frame: FrameMic[] = [];
		await mic.apriMicrofono({ onframe: (f) => frame.push(f) });
		const c = audio.contesto() as unknown as ContestoFinto;
		expect(c.filtro).toMatchObject({ type: 'lowpass', frequency: { value: 2000 } });
		expect(c.sorgente.connect).toHaveBeenCalledWith(c.filtro);
		expect(c.filtro.connect).toHaveBeenCalledWith(c.analizzatore);
		// campioni pari: un La4 a 24 kHz; dispari: rumore forte. Solo il frame dimezzato è un La4
		let seme = 1;
		const rumore = () => ((seme = (seme * 16807) % 2147483647) / 2147483647) * 1.8 - 0.9;
		segnale = (i) => (i % 2 ? rumore() : 0.3 * Math.sin((2 * Math.PI * 440 * (i / 2)) / 24_000));
		giro(0);
		expect(frame[0].freq).toBeCloseTo(440, 0);
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

	it('anche durante la lettura ad alta voce i frame sono silenziati', async () => {
		const frame: FrameMic[] = [];
		await mic.apriMicrofono({ onframe: (f) => frame.push(f) });
		const fine = audio.segnaVoce();
		giro(0);
		fine();
		fine(); // idempotente
		giro(40);
		expect(frame.map((f) => f.silenziato)).toEqual([true, false]);
		expect(audio.riproduzioneAttiva()).toBe(false);
	});

	it('gate adattivo: una voce bassa si sente nel silenzio, ma deve stare sopra il rumore di fondo', async () => {
		const frame: FrameMic[] = [];
		const m = await mic.apriMicrofono({ onframe: (f) => frame.push(f) });
		const c = audio.contesto() as unknown as ContestoFinto;
		let ms = 0;
		const secondi = (s: number) => {
			for (let k = 0; k < s * 30; k++) {
				c.currentTime += 1 / 30;
				giro((ms += 1000 / 30));
			}
			return frame.at(-1)!;
		};
		// −50 dBFS: il vecchio gate fisso (−40 dBFS) non l'avrebbe mai sentita
		segnale = (i) => 0.0045 * Math.sin((2 * Math.PI * 440 * i) / 48_000);
		expect(secondi(0.5).freq).toBeCloseTo(440, 0);
		// una ventola (rumore a −34 dBFS): la stima del rumore sale piano, la soglia con lei
		let seme = 1;
		const rumore = Float32Array.from(
			{ length: 2048 },
			() => ((seme = (seme * 16807) % 2147483647) / 2147483647 - 0.5) * 0.07
		);
		segnale = (i) => rumore[i];
		expect(secondi(1)).toMatchObject({ freq: null, motivo: 'aperiodico' });
		const f = secondi(6);
		expect(f.rumore).toBeCloseTo(f.rms, 3);
		expect(f.gate).toBeCloseTo(2 * f.rms, 3);
		// la stessa voce di prima adesso è sotto la soglia; una voce più forte del rumore passa
		segnale = (i) => 0.0045 * Math.sin((2 * Math.PI * 440 * i) / 48_000);
		expect(secondi(0.5)).toMatchObject({ freq: null, motivo: 'gate' });
		segnale = (i) => 0.08 * Math.sin((2 * Math.PI * 440 * i) / 48_000);
		const voce = secondi(0.5);
		expect(voce.freq).toBeCloseTo(440, 0);
		expect(voce.motivo).toBeUndefined();
		// i frame con la nota non alzano la stima del rumore
		expect(secondi(5).rumore).toBeCloseTo(f.rumore, 6);
		expect(m).toMatchObject({ sampleRate: 48_000, cattura: 'raf', impostazioni: {} });
	});

	it('scheda nascosta o pagina lasciata: il microfono si chiude da solo e lo dice', async () => {
		const onchiuso = vi.fn();
		await mic.apriMicrofono({ onframe: () => {}, onchiuso });
		ascoltatori.get('visibilitychange')!(); // ancora visibile: niente
		expect(traccia.stop).not.toHaveBeenCalled();
		(document as { visibilityState: string }).visibilityState = 'hidden';
		ascoltatori.get('visibilitychange')!();
		expect(onchiuso).toHaveBeenCalledExactlyOnceWith('nascosta');
		expect(traccia.stop).toHaveBeenCalledOnce();
		expect(prossimoFrame).toBeUndefined();
		expect(ascoltatori.has('visibilitychange')).toBe(false);

		const m = await mic.apriMicrofono({ onframe: () => {}, onchiuso });
		ascoltatori.get('pagehide')!();
		expect(onchiuso).toHaveBeenLastCalledWith('pagina-lasciata');
		m.chiudi(); // già chiuso: niente di nuovo
		expect(onchiuso).toHaveBeenCalledTimes(2);
		expect(traccia.stop).toHaveBeenCalledTimes(2);

		// chiuso dal chiamante: onchiuso non si chiama
		(await mic.apriMicrofono({ onframe: () => {}, onchiuso })).chiudi();
		expect(onchiuso).toHaveBeenCalledTimes(2);
	});

	it('iPhone: sessione audio playback, e play-and-record solo con il microfono aperto', async () => {
		const audioSession = { type: 'auto' };
		vi.stubGlobal('navigator', { mediaDevices: { getUserMedia }, audioSession });
		void audio.sblocca();
		expect(audioSession.type).toBe('playback');
		getUserMedia.mockImplementationOnce(async () => {
			expect(audioSession.type).toBe('play-and-record'); // già prima di chiedere il microfono
			return { getTracks: () => [traccia] };
		});
		const m = await mic.apriMicrofono({ onframe: () => {} });
		void audio.sblocca(); // un suono mentre il microfono ascolta non cambia la sessione
		expect(audioSession.type).toBe('play-and-record');
		m.chiudi();
		expect(audioSession.type).toBe('playback');
		getUserMedia.mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
		await expect(mic.apriMicrofono({ onframe: () => {} })).rejects.toThrow();
		expect(audioSession.type).toBe('playback');
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
		const rifiuta = (name: string, messaggio = name) =>
			getUserMedia.mockRejectedValueOnce(Object.assign(new Error(messaggio), { name }));

		rifiuta('NotAllowedError', 'Permission denied');
		expect(await codice(apri())).toBe('permesso-negato');
		rifiuta('NotAllowedError', 'Permission denied by system');
		expect(await codice(apri())).toBe('permesso-sistema');
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
