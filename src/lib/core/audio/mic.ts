// Microfono → frame di altezza, tutto dentro la pagina: l'audio non si registra, non si salva e non
// esce mai dal browser (e la CSP vieta comunque le connessioni verso altri siti).
import { FFT } from './costanti.ts';
import { contesto, riproduzioneAttiva, usa } from './contesto.ts';
import { Mediana, calcolaRms, rilevaAltezza } from './pitch.ts';

export type FrameMic = {
	/** clock audio (s) del centro della finestra analizzata, meno la latenza impostata */
	t: number;
	/** Hz dopo la mediana, null se non c'è una nota */
	freq: number | null;
	chiarezza: number;
	rms: number;
	/** vero mentre suona il sito: il frame non va ascoltato (turni ascolta/canta) */
	silenziato: boolean;
};

export type CodiceErroreMic =
	'permesso-negato' | 'nessun-microfono' | 'contesto-non-sicuro' | 'non-supportato';

export class ErroreMic extends Error {
	readonly codice: CodiceErroreMic;
	constructor(codice: CodiceErroreMic, opzioni?: ErrorOptions) {
		super(`microfono: ${codice}`, opzioni);
		this.name = 'ErroreMic';
		this.codice = codice;
	}
}

export type Microfono = { chiudi(): void };

/** ~30 frame al secondo, anche con schermi a 60 o 120 Hz */
const INTERVALLO_MS = 1000 / 30;

function codiceDa(e: unknown): CodiceErroreMic {
	switch ((e as { name?: string } | null)?.name) {
		case 'NotAllowedError':
		case 'SecurityError':
			return 'permesso-negato';
		case 'NotFoundError':
		case 'NotReadableError': // occupato da un'altra app o guasto
		case 'OverconstrainedError':
		case 'AbortError':
			return 'nessun-microfono';
		default:
			return 'non-supportato';
	}
}

/**
 * Apre il microfono e chiama `onframe` circa 30 volte al secondo. Chiamare prima sblocca() nel gesto
 * che apre il microfono (iOS). Lancia ErroreMic. Le tracce si rilasciano con chiudi() e su pagehide:
 * se il componente sparisce mentre si aspetta il permesso, chiudi() va chiamato appena arriva.
 * `latenzaMs`: la manopola di latenza delle preferenze, tolta dal tempo dei frame.
 * ponytail: rAF a ~30 Hz basta per il canto; se servirà di più (ritmo, schede in background) si passa a
 * un AudioWorklet qui dentro, con la stessa interfaccia.
 */
export async function apriMicrofono({
	onframe,
	latenzaMs = 0
}: {
	onframe: (frame: FrameMic) => void;
	latenzaMs?: number;
}): Promise<Microfono> {
	if (globalThis.isSecureContext === false) throw new ErroreMic('contesto-non-sicuro');
	if (typeof AudioContext === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
		throw new ErroreMic('non-supportato');
	}
	const c = contesto();
	let stream: MediaStream;
	try {
		// la voce così com'è: i filtri per le chiamate tagliano le note tenute e cambiano il volume
		stream = await navigator.mediaDevices.getUserMedia({
			audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
		});
	} catch (e) {
		throw new ErroreMic(codiceDa(e), { cause: e });
	}

	let sorgente: MediaStreamAudioSourceNode;
	const analizzatore = c.createAnalyser();
	analizzatore.fftSize = FFT;
	try {
		sorgente = c.createMediaStreamSource(stream);
	} catch (e) {
		// mai lasciare acceso il microfono (e la sua spia) se non lo si può usare
		for (const traccia of stream.getTracks()) traccia.stop();
		throw new ErroreMic('non-supportato', { cause: e });
	}
	sorgente.connect(analizzatore); // e basta: mai verso gli altoparlanti
	const rilascia = usa('microfono');
	const buffer = new Float32Array(FFT);
	const mediana = new Mediana();
	const ritardo = FFT / 2 / c.sampleRate + latenzaMs / 1000;
	let ultimo = -Infinity;
	let raf = 0;
	let chiuso = false;

	function giro(ora: number) {
		raf = requestAnimationFrame(giro);
		if (ora - ultimo < INTERVALLO_MS - 4) return;
		ultimo = ora;
		analizzatore.getFloatTimeDomainData(buffer);
		const t = c.currentTime - ritardo;
		const rms = calcolaRms(buffer);
		if (riproduzioneAttiva()) {
			mediana.azzera(); // dopo il turno del sito si riparte puliti
			onframe({ t, freq: null, chiarezza: 0, rms, silenziato: true });
			return;
		}
		const a = rilevaAltezza(buffer, c.sampleRate);
		onframe({
			t,
			freq: mediana.aggiungi(a?.freq ?? null),
			chiarezza: a?.chiarezza ?? 0,
			rms,
			silenziato: false
		});
	}

	function chiudi() {
		if (chiuso) return;
		chiuso = true;
		cancelAnimationFrame(raf);
		removeEventListener('pagehide', chiudi);
		sorgente.disconnect();
		for (const traccia of stream.getTracks()) traccia.stop();
		rilascia();
	}

	addEventListener('pagehide', chiudi);
	raf = requestAnimationFrame(giro);
	return { chiudi };
}
