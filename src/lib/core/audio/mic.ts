// Microfono → frame di altezza, tutto dentro la pagina: l'audio non si registra, non si salva e non
// esce mai dal browser (e la CSP vieta comunque le connessioni verso altri siti).
import { FFT, PASSA_BASSO_HZ } from './costanti.ts';
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

/** Perché il microfono si è chiuso da solo: scheda nascosta, oppure pagina lasciata (anche verso la bfcache). */
export type MotivoChiusura = 'nascosta' | 'pagina-lasciata';

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
 * che apre il microfono (iOS). Lancia ErroreMic. Le tracce si rilasciano con chiudi(); il microfono si
 * chiude anche da solo quando la scheda si nasconde (rAF lì si ferma: niente frame, ma la spia resterebbe
 * accesa) o la pagina viene lasciata, e allora chiama `onchiuso`. Se il componente sparisce mentre si
 * aspetta il permesso, chiudi() va chiamato appena arriva.
 * `latenzaMs`: la manopola di latenza delle preferenze, tolta dal tempo dei frame.
 * ponytail: rAF a ~30 Hz basta per il canto; se servirà di più (ritmo) si passa a un AudioWorklet qui
 * dentro, con la stessa interfaccia.
 */
export async function apriMicrofono({
	onframe,
	onchiuso,
	latenzaMs = 0
}: {
	onframe: (frame: FrameMic) => void;
	onchiuso?: (motivo: MotivoChiusura) => void;
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
	// passa-basso nativo, poi un campione su due a YIN: regge il rumore di fondo e costa un quarto
	const filtro = c.createBiquadFilter();
	filtro.type = 'lowpass';
	filtro.frequency.value = PASSA_BASSO_HZ;
	filtro.Q.value = Math.SQRT1_2;
	sorgente.connect(filtro).connect(analizzatore); // e basta: mai verso gli altoparlanti
	const rilascia = usa('microfono');
	const buffer = new Float32Array(FFT);
	const dimezzato = new Float32Array(FFT / 2);
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
		for (let i = 0; i < dimezzato.length; i++) dimezzato[i] = buffer[2 * i];
		const a = rilevaAltezza(dimezzato, c.sampleRate / 2);
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
		removeEventListener('pagehide', lasciata);
		document.removeEventListener('visibilitychange', nascosta);
		sorgente.disconnect();
		for (const traccia of stream.getTracks()) traccia.stop();
		rilascia();
	}
	function chiudiDaSolo(motivo: MotivoChiusura) {
		if (chiuso) return;
		chiudi();
		onchiuso?.(motivo);
	}
	const lasciata = () => chiudiDaSolo('pagina-lasciata');
	const nascosta = () => {
		if (document.visibilityState === 'hidden') chiudiDaSolo('nascosta');
	};

	addEventListener('pagehide', lasciata);
	document.addEventListener('visibilitychange', nascosta);
	raf = requestAnimationFrame(giro);
	return { chiudi };
}
