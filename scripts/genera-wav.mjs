// WAV PCM 16 bit mono per il microfono finto di Chromium negli e2e. Node puro, niente dipendenze.
// - generaWav: una nota con qualche armonica, ferma e pulita (come una voce semplice);
// - generaVoce: una voce cantata realistica (vibrato, jitter, shimmer, formanti, respiro, volume basso).
// Uso: node scripts/genera-wav.mjs <file.wav> [freq=440] [secondi=5] [--voce] [--rms=0.01] [--seme=1]
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ARMONICHE = [1, 0.5, 0.25, 0.12];

/**
 * @param {ArrayLike<number>} campioni da −1 a 1
 * @param {number} sampleRate
 * @returns {Buffer}
 */
function wav(campioni, sampleRate) {
	const n = campioni.length;
	const out = Buffer.alloc(44 + n * 2);
	out.write('RIFF', 0, 'ascii');
	out.writeUInt32LE(36 + n * 2, 4);
	out.write('WAVEfmt ', 8, 'ascii');
	out.writeUInt32LE(16, 16); // dimensione del blocco fmt
	out.writeUInt16LE(1, 20); // PCM
	out.writeUInt16LE(1, 22); // mono
	out.writeUInt32LE(sampleRate, 24);
	out.writeUInt32LE(sampleRate * 2, 28); // byte al secondo
	out.writeUInt16LE(2, 32); // byte per campione
	out.writeUInt16LE(16, 34); // bit per campione
	out.write('data', 36, 'ascii');
	out.writeUInt32LE(n * 2, 40);
	for (let i = 0; i < n; i++) {
		const x = Math.max(-1, Math.min(1, campioni[i]));
		out.writeInt16LE(Math.round(x * 32767), 44 + i * 2);
	}
	return out;
}

/**
 * Con un numero intero di periodi in `secondi` il file si ripete senza scatti (Chromium lo manda in loop).
 * @param {number} [freq]
 * @param {number} [secondi]
 * @param {number} [sampleRate]
 * @returns {Buffer}
 */
export function generaWav(freq = 440, secondi = 5, sampleRate = 48_000) {
	const somma = ARMONICHE.reduce((a, b) => a + b);
	const campioni = Float64Array.from({ length: Math.round(secondi * sampleRate) }, (_, i) => {
		let x = 0;
		ARMONICHE.forEach(
			(a, k) => (x += a * Math.sin((2 * Math.PI * freq * (k + 1) * i) / sampleRate))
		);
		return (0.5 * x) / somma;
	});
	return wav(campioni, sampleRate);
}

/** formanti di una «a» aperta: frequenza e banda (Hz) */
const FORMANTI = [
	[750, 90],
	[1150, 110],
	[2600, 160]
];
/** guadagno delle formanti in cascata (risonatori a due poli, 1 a 0 Hz) */
const formanti = (/** @type {number} */ f) =>
	FORMANTI.reduce((g, [fc, bw]) => (g * (fc * fc)) / Math.hypot(fc * fc - f * f, bw * f), 1);

/**
 * Una voce che canta una nota senza mai smettere, come un adulto o un bambino vero davanti a un portatile:
 * vibrato (±`vibratoCents` a ~5,5 Hz), jitter e shimmer da un periodo all'altro (`jitterCents`,
 * `shimmerDb`), deriva lenta, volume che oscilla di ±6 dB, armoniche sagomate dalle formanti di una «a»,
 * respiro a `snrDb` sotto la voce e un filo di rumore della stanza. `rms` è il livello medio (0,005-0,02 è una voce a distanza normale con
 * il controllo automatico del volume spento). Il seme rende il file sempre uguale; la fine sfuma
 * nell'inizio, così il loop di Chromium non fa scatti.
 * @param {{ freq?: number, secondi?: number, rms?: number, seme?: number, vibratoCents?: number,
 *   jitterCents?: number, shimmerDb?: number, snrDb?: number, sampleRate?: number }} [opzioni]
 * @returns {Buffer}
 */
export function generaVoce({
	freq = 440,
	secondi = 12,
	rms = 0.01,
	seme = 1,
	vibratoCents = 40,
	jitterCents = 10,
	shimmerDb = 0.35,
	snrDb = 17,
	sampleRate = 48_000
} = {}) {
	// mulberry32 e Box-Muller: rumore ripetibile
	let s = seme >>> 0;
	const casuale = () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const gauss = () => Math.sqrt(-2 * Math.log(1 - casuale())) * Math.cos(2 * Math.PI * casuale());

	const n = Math.round(secondi * sampleRate);
	const coda = Math.round(0.25 * sampleRate); // sfuma nell'inizio
	const voce = new Float64Array(n + coda);
	const respiro = new Float64Array(n + coda);
	const inviluppo = new Float64Array(n + coda);
	let fase = 0;
	let faseVib = 0;
	let jitter = 0; // cent, nuovo a ogni periodo (10 cent ≈ 0,6%)
	let shimmer = 1; // nuovo a ogni periodo
	/** @type {number[]} */
	let ampiezze = [];
	// respiro: rumore bianco tra ~400 Hz e ~5 kHz (due filtri a un polo)
	const aHp = Math.exp((-2 * Math.PI * 400) / sampleRate);
	const aLp = Math.exp((-2 * Math.PI * 5000) / sampleRate);
	let [xPrec, hp, lp] = [0, 0, 0];
	for (let i = 0; i < voce.length; i++) {
		const t = i / sampleRate;
		faseVib += (5.5 + 0.3 * Math.sin(2 * Math.PI * 0.11 * t)) / sampleRate;
		const cents =
			vibratoCents * Math.sin(2 * Math.PI * faseVib) +
			8 * Math.sin(2 * Math.PI * 0.17 * t + 1) +
			5 * Math.sin(2 * Math.PI * 0.41 * t) +
			jitter;
		const f0 = freq * 2 ** (cents / 1200);
		if (i % 32 === 0) {
			// glottide −12 dB/ottava, labbra +6: le armoniche calano come 1/k, poi le formanti
			ampiezze = [];
			for (let k = 1; k * f0 < 5000; k++) ampiezze.push(formanti(k * f0) / k);
		}
		fase += f0 / sampleRate;
		if (fase >= 1) {
			fase -= 1;
			jitter = jitterCents * gauss();
			shimmer = 10 ** ((shimmerDb * gauss()) / 20);
		}
		let x = 0;
		for (let k = 0; k < ampiezze.length; k++)
			x += ampiezze[k] * Math.sin(2 * Math.PI * (k + 1) * fase);
		voce[i] = shimmer * x;
		const bianco = gauss();
		hp = aHp * (hp + bianco - xPrec);
		xPrec = bianco;
		lp = (1 - aLp) * hp + aLp * lp;
		respiro[i] = lp;
		// ±6 dB, lento e irregolare
		const lento =
			0.6 * Math.sin(2 * Math.PI * 0.23 * t) + 0.4 * Math.sin(2 * Math.PI * 0.57 * t + 2);
		inviluppo[i] = 10 ** ((6 * lento) / 20);
	}
	const rmsDi = (/** @type {Float64Array} */ a) =>
		Math.sqrt(a.reduce((q, x) => q + x * x, 0) / a.length);
	const kVoce = 1 / rmsDi(voce);
	const kRespiro = 10 ** (-snrDb / 20) / rmsDi(respiro);
	const misto = voce.map((x, i) => (x * kVoce + respiro[i] * kRespiro) * inviluppo[i]);
	const kMisto = rms / rmsDi(misto);
	// la stanza: un filo di rumore costante (~−62 dBFS)
	const stanza = 0.0008;
	const out = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		const x = misto[i] * kMisto;
		if (i < coda) {
			const w = (0.5 * Math.PI * i) / coda; // dissolvenza incrociata a potenza costante
			out[i] = x * Math.sin(w) + misto[n + i] * kMisto * Math.cos(w);
		} else out[i] = x;
		out[i] += stanza * gauss();
	}
	return wav(out, sampleRate);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const argomenti = process.argv.slice(2);
	const opzione = (/** @type {string} */ nome) =>
		argomenti.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1];
	const [file, freq = '440', secondi = '5'] = argomenti.filter((a) => !a.startsWith('--'));
	if (!file) {
		console.error(
			'Uso: node scripts/genera-wav.mjs <file.wav> [freq=440] [secondi=5] [--voce] [--rms=0.01] [--seme=1]'
		);
		process.exit(1);
	}
	writeFileSync(
		file,
		argomenti.includes('--voce')
			? generaVoce({
					freq: Number(freq),
					secondi: Number(secondi),
					rms: Number(opzione('rms') ?? 0.01),
					seme: Number(opzione('seme') ?? 1)
				})
			: generaWav(Number(freq), Number(secondi))
	);
}
