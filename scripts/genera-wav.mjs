// WAV PCM 16 bit mono per il microfono finto di Chromium negli e2e. Node puro, niente dipendenze.
// - generaWav: una nota con qualche armonica, ferma e pulita (come una voce semplice);
// - generaVoce: una voce cantata realistica (vibrato, jitter, shimmer, formanti, respiro, volume basso).
// Uso: node scripts/genera-wav.mjs <file.wav> [freq=440] [secondi=5] [--voce] [--rms=0.01] [--seme=1]
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ARMONICHE = [1, 0.5, 0.25, 0.12];

/**
 * Numeri ripetibili (mulberry32): uniformi in [0, 1) e gaussiani (Box-Muller). Con lo stesso seme,
 * sempre la stessa sequenza.
 * @param {number} seme
 */
function generatore(seme) {
	let s = seme >>> 0;
	const casuale = () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const gauss = () => Math.sqrt(-2 * Math.log(1 - casuale())) * Math.cos(2 * Math.PI * casuale());
	return { casuale, gauss };
}

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
 * @returns {Float64Array}
 */
export function campioniVoce({
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
	const { gauss } = generatore(seme);

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
	return out;
}

/** campioniVoce in un WAV */
export const generaVoce = (/** @type {Parameters<typeof campioniVoce>[0]} */ opzioni = {}) =>
	wav(campioniVoce(opzioni), opzioni.sampleRate ?? 48_000);

// --- Il Ritmo: battiti di mani e quello che il microfono sente intorno (audio/battimani.ts) ---------

/**
 * Biquad (RBJ) su `x`, sul posto.
 * @param {Float64Array} x
 * @param {'passa-banda' | 'passa-alto' | 'passa-basso'} tipo
 * @param {number} fc
 * @param {number} q
 * @param {number} sr
 */
function biquad(x, tipo, fc, q, sr) {
	const w = (2 * Math.PI * fc) / sr;
	const [cw, al] = [Math.cos(w), Math.sin(w) / (2 * q)];
	const [b0, b1, b2] =
		tipo === 'passa-banda'
			? [al, 0, -al]
			: tipo === 'passa-alto'
				? [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
				: [(1 - cw) / 2, 1 - cw, (1 - cw) / 2];
	let [x1, x2, y1, y2] = [0, 0, 0, 0];
	for (let i = 0; i < x.length; i++) {
		const y = (b0 * x[i] + b1 * x1 + b2 * x2 + 2 * cw * y1 - (1 - al) * y2) / (1 + al);
		[x2, x1, y2, y1] = [x1, x[i], y1, y];
		x[i] = y;
	}
	return x;
}

const piccoDi = (/** @type {ArrayLike<number>} */ x) => {
	let m = 0;
	for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
	return m;
};
const rmsDi = (/** @type {ArrayLike<number>} */ x) => {
	let q = 0;
	for (let i = 0; i < x.length; i++) q += x[i] * x[i];
	return Math.sqrt(q / x.length);
};
/** salita in `salita` s e calo con costante `tau` (s): l'inviluppo di un colpo */
const colpo = (/** @type {number} */ t, /** @type {number} */ tau, salita = 0.0003) =>
	t < 0 ? 0 : (1 - Math.exp(-t / salita)) * Math.exp(-t / tau);

/**
 * @typedef {{ rt60?: number, drrDb?: number, coda?: number }} Stanza
 * `rt60`: tempo di riverbero (s); `drrDb`: energia del suono diretto sopra quella riverberata (0 dB: a un
 * metro in un soggiorno, più alto più vicini); `coda`: dopo quanti secondi la coda è tagliata
 */

/**
 * Aggiunge a `out` il suono breve `sorgente` dal campione `i0`, in una stanza: tre riflessioni nei primi
 * 15 ms e una coda diffusa (rumore che si smorza, più scuro del suono diretto) con l'energia di `drrDb`.
 * @param {Float64Array} out
 * @param {Float64Array} sorgente
 * @param {number} i0
 * @param {Stanza} stanza
 * @param {ReturnType<typeof generatore>} g
 * @param {number} sr
 */
function nellaStanza(out, sorgente, i0, { rt60 = 0.4, drrDb = 0, coda = 0.2 }, g, sr) {
	const aggiungi = (/** @type {Float64Array} */ x, /** @type {number} */ da, k = 1) => {
		for (let i = Math.max(0, -da); i < x.length && da + i < out.length; i++)
			out[da + i] += k * x[i];
	};
	aggiungi(sorgente, i0);
	for (const [ms, k] of [
		[2 + 2 * g.casuale(), 0.5],
		[5 + 4 * g.casuale(), -0.35],
		[10 + 5 * g.casuale(), 0.25]
	]) {
		aggiungi(sorgente, i0 + Math.round((ms * sr) / 1000), k);
	}
	const n = Math.round(coda * sr);
	const scia = biquad(
		Float64Array.from({ length: n }, (_, i) => {
			const t = i / sr;
			const fine = Math.min(1, (coda - t) / 0.02); // sfuma negli ultimi 20 ms
			return g.gauss() * Math.min(1, t / 0.005) * Math.exp((-6.9 * t) / rt60) * fine;
		}),
		'passa-basso',
		5000,
		Math.SQRT1_2,
		sr
	);
	const energia = (/** @type {Float64Array} */ x) => x.reduce((q, v) => q + v * v, 0);
	const k = Math.sqrt((energia(sorgente) * 10 ** (-drrDb / 10)) / energia(scia));
	aggiungi(scia, i0 + Math.round(0.002 * sr), k);
}

/**
 * Un battito di mani (il suono diretto, senza la stanza): un'esplosione di rumore in cui risuona la
 * cavità tra le mani (passa-banda tra 0,8 e 2,8 kHz: mani a coppa o piatte) più una parte a banda larga fino agli acuti; sale in
 * ~0,3 ms e cala in 3-8 ms, e a volte ha un secondo picco qualche ms dopo. Picco = `ampiezza`.
 * @param {number} ampiezza
 * @param {ReturnType<typeof generatore>} g
 * @param {number} sr
 */
function battito(ampiezza, g, sr) {
	const n = Math.round(0.04 * sr);
	const tau = 0.003 + 0.005 * g.casuale();
	const doppio = g.casuale() < 0.4 ? 0.002 + 0.005 * g.casuale() : null;
	const fc = 800 + 2000 * g.casuale();
	const cavita = biquad(
		Float64Array.from({ length: n }, g.gauss),
		'passa-banda',
		fc,
		1 + g.casuale(),
		sr
	);
	const largo = biquad(Float64Array.from({ length: n }, g.gauss), 'passa-basso', 9000, 0.7, sr);
	const kc = 1 / rmsDi(cavita);
	const x = Float64Array.from({ length: n }, (_, i) => {
		const t = i / sr;
		const inviluppo = colpo(t, tau) + (doppio === null ? 0 : 0.6 * colpo(t - doppio, tau));
		return (0.8 * kc * cavita[i] + 0.45 * largo[i]) * inviluppo;
	});
	const k = ampiezza / piccoDi(x);
	return x.map((v) => v * k);
}

/**
 * Battiti di mani credibili, ognuno al suo tempo `t` (s: l'attacco) e con il suo picco `ampiezza`
 * (0,02 piano e lontano, 0,6 forte e vicino), in una stanza che riverbera.
 * @param {{ battiti: { t: number, ampiezza: number }[], secondi: number, stanza?: Stanza, seme?: number,
 *   sampleRate?: number }} opzioni
 * @returns {Float64Array}
 */
export function campioniBattiMani({
	battiti,
	secondi,
	stanza = {},
	seme = 1,
	sampleRate = 48_000
}) {
	const g = generatore(seme);
	const out = new Float64Array(Math.round(secondi * sampleRate));
	for (const b of battiti) {
		const i0 = Math.round(b.t * sampleRate);
		nellaStanza(out, battito(b.ampiezza, g, sampleRate), i0, stanza, g, sampleRate);
	}
	return out;
}

/** timbri del sito come escono dall'altoparlante: frequenza, calo (s), durata (s) */
const TIMBRI = {
	clic: [2093, 0.005, 0.03],
	accento: [3136, 0.005, 0.03],
	legnetto: [1046.5, 0.025, 0.2]
};

/**
 * Il sito che suona, come lo sente il microfono: i clic del metronomo (sinusoide a 2 o 3 kHz più uno
 * schiocco, ~30 ms) e i colpi del legnetto (1 kHz che cala in ~25 ms), con l'eco della stanza.
 * @param {{ colpi: { t: number, ampiezza: number, timbro: keyof typeof TIMBRI }[], secondi: number,
 *   stanza?: Stanza, seme?: number, sampleRate?: number }} opzioni
 * @returns {Float64Array}
 */
export function campioniAltoparlante({
	colpi,
	secondi,
	stanza = {},
	seme = 1,
	sampleRate = 48_000
}) {
	const g = generatore(seme);
	const out = new Float64Array(Math.round(secondi * sampleRate));
	for (const c of colpi) {
		const [f, tau, durata] = TIMBRI[c.timbro];
		const x = Float64Array.from({ length: Math.round(durata * sampleRate) }, (_, i) => {
			const t = i / sampleRate;
			return (
				Math.sin(2 * Math.PI * f * t) * colpo(t, tau, 0.0005) + 0.4 * g.gauss() * colpo(t, 0.004)
			);
		});
		const k = c.ampiezza / piccoDi(x);
		const i0 = Math.round(c.t * sampleRate);
		nellaStanza(
			out,
			x.map((v) => v * k),
			i0,
			stanza,
			g,
			sampleRate
		);
	}
	return out;
}

/**
 * Rumore di fondo a livello `rms`: 'bianco' (fruscio), 'rosa' (filtro di Paul Kellet), 'ventola' (rumore
 * scuro, un ronzio a 100 Hz con le armoniche e un soffio, che ondeggia piano).
 * @param {{ tipo: 'bianco' | 'rosa' | 'ventola', rms: number, secondi: number, seme?: number,
 *   sampleRate?: number }} opzioni
 * @returns {Float64Array}
 */
export function campioniRumore({ tipo, rms, secondi, seme = 1, sampleRate = 48_000 }) {
	const { gauss } = generatore(seme);
	const n = Math.round(secondi * sampleRate);
	let x;
	if (tipo === 'bianco') x = Float64Array.from({ length: n }, gauss);
	else if (tipo === 'rosa') {
		let [b0, b1, b2, b3, b4, b5, b6] = [0, 0, 0, 0, 0, 0, 0];
		x = Float64Array.from({ length: n }, () => {
			const w = gauss();
			b0 = 0.99886 * b0 + w * 0.0555179;
			b1 = 0.99332 * b1 + w * 0.0750759;
			b2 = 0.969 * b2 + w * 0.153852;
			b3 = 0.8665 * b3 + w * 0.3104856;
			b4 = 0.55 * b4 + w * 0.5329522;
			b5 = -0.7616 * b5 - w * 0.016898;
			const y = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
			b6 = w * 0.115926;
			return y;
		});
	} else {
		const scuro = biquad(
			Float64Array.from({ length: n }, gauss),
			'passa-basso',
			400,
			0.7,
			sampleRate
		);
		const ks = 1 / rmsDi(scuro);
		x = Float64Array.from({ length: n }, (_, i) => {
			const t = i / sampleRate;
			let ronzio = 0;
			for (let k = 1; k <= 4; k++) ronzio += Math.sin(2 * Math.PI * 100 * k * t + k) / (2 * k);
			const onda = 1 + 0.1 * Math.sin(2 * Math.PI * 0.5 * t);
			return (ks * scuro[i] + 0.4 * ronzio + 0.15 * gauss()) * onda;
		});
	}
	const k = rms / rmsDi(x);
	return x.map((v) => v * k);
}

/** formanti (Hz, banda) di un bambino: «a» e «i» */
const VOCALI = {
	a: [
		[1000, 110],
		[1600, 130],
		[3100, 200]
	],
	i: [
		[380, 80],
		[3000, 180],
		[3800, 250]
	]
};
/** le note della voce cantata, in semitoni sopra `f0` */
const MELODIA = [0, 2, 4, 2, 0, 5];

/**
 * Un bambino che dice o canta le sillabe ritmiche (es. «ta ti-ti ta-a sst», una per battito di
 * `battitoS` s, la frase ripetuta da `inizio` fino alla fine). Ogni sillaba ha la sua /t/: un'esplosione
 * di rumore acuto di pochi ms, forte (−4 dB sotto la vocale: una pronuncia decisa vicino al microfono),
 * il transitorio della voce più simile a un battito di mani; poi un soffio e la vocale, che parte dopo
 * ~20 ms e sale in 25 ms. Parlata: altezza che scende, vocali brevi. Cantata: una nota per sillaba,
 * vibrato ±40 cent, vocali tenute. Picco delle vocali = `picco`.
 * @param {{ sillabe?: string, inizio?: number, battitoS?: number, picco?: number, f0?: number,
 *   cantato?: boolean, secondi: number, seme?: number, sampleRate?: number }} opzioni
 * @returns {Float64Array}
 */
export function campioniSillabe({
	sillabe = 'ta ti-ti ta-a',
	inizio = 0.3,
	battitoS = 60 / 72,
	picco = 0.1,
	f0 = 260,
	cantato = false,
	secondi,
	seme = 1,
	sampleRate: sr = 48_000
}) {
	const g = generatore(seme);
	const out = new Float64Array(Math.round(secondi * sr));
	const aggiungi = (/** @type {Float64Array} */ x, /** @type {number} */ da, k = 1) => {
		for (let i = 0; i < x.length && da + i < out.length; i++) out[da + i] += k * x[i];
	};
	/** la /t/: un'esplosione di rumore acuto di pochi ms */
	const t = (/** @type {number} */ i0) => {
		const esplosione = biquad(
			Float64Array.from({ length: Math.round(0.006 * sr) }, g.gauss),
			'passa-banda',
			4000,
			1,
			sr
		).map((v, i) => v * colpo(i / sr, 0.0015, 0.0002));
		aggiungi(esplosione, i0, (0.6 * picco) / piccoDi(esplosione));
	};
	/** @type {['a' | 'i' | 's', number][]} */
	const frase = [];
	for (const s of sillabe.split(/\s+/)) {
		if (s === 'ti-ti') frase.push(['i', 0.5], ['i', 0.5]);
		else if (s === 'ta-a') frase.push(['a', 2]);
		else if (s === 'sst') frase.push(['s', 1]);
		else frase.push(['a', 1]);
	}
	let fine = inizio;
	for (let k = 0; fine < secondi - 0.3; k++) {
		const [vocale, battiti] = frase[k % frase.length];
		const durata = battiti * battitoS;
		const i0 = Math.round(fine * sr);
		fine += durata;
		if (vocale === 's') {
			// «sst»: il soffio della /s/ (molto acuto, sale e scende in ~180 ms), un attimo di silenzio e
			// la /t/ finale, senza una vocale dopo: la sillaba più simile a un battito
			const n = Math.round(0.18 * sr);
			const s = biquad(Float64Array.from({ length: n }, g.gauss), 'passa-banda', 6000, 1.5, sr);
			aggiungi(
				s.map((v, i) => v * Math.sin((Math.PI * i) / n) ** 2),
				i0,
				(0.3 * picco) / rmsDi(s)
			);
			t(i0 + Math.round(0.23 * sr));
			continue;
		}
		t(i0);
		const soffio = biquad(
			Float64Array.from({ length: Math.round(0.02 * sr) }, g.gauss),
			'passa-banda',
			2500,
			0.7,
			sr
		);
		const arco = soffio.map((v, i) => v * Math.sin((Math.PI * i) / soffio.length));
		aggiungi(arco, i0 + Math.round(0.004 * sr), (0.08 * picco) / rmsDi(soffio));
		// la vocale
		const lunga = cantato
			? 0.85 * durata
			: battiti >= 2
				? 0.7 * durata
				: vocale === 'a'
					? 0.18
					: 0.12;
		const n = Math.round(lunga * sr);
		const v = new Float64Array(n);
		const nota = f0 * 2 ** (MELODIA[k % MELODIA.length] / 12);
		let fase = 0;
		/** @type {number[]} */
		let armoniche = [];
		for (let i = 0; i < n; i++) {
			const s = i / sr;
			const f = cantato
				? nota * 2 ** ((40 * Math.sin(2 * Math.PI * 5.5 * s)) / 1200)
				: nota * (1.1 - (0.2 * i) / n);
			if (i % 32 === 0) {
				armoniche = [];
				for (let h = 1; h * f < 5000; h++) {
					const formanti = VOCALI[vocale].reduce(
						(q, [fc, bw]) => (q * fc * fc) / Math.hypot(fc * fc - (h * f) ** 2, bw * h * f),
						1
					);
					armoniche.push(formanti / h);
				}
			}
			fase += f / sr;
			let x = 0;
			for (let h = 0; h < armoniche.length; h++)
				x += armoniche[h] * Math.sin(2 * Math.PI * (h + 1) * fase);
			const salita = 0.5 * (1 - Math.cos(Math.PI * Math.min(1, s / 0.025)));
			v[i] = x * salita * Math.max(0, Math.min(1, (lunga - s) / 0.05));
		}
		aggiungi(v, i0 + Math.round(0.02 * sr), picco / piccoDi(v));
	}
	return out;
}

/** Somma più segnali, tagliando sul più corto. */
export function somma(/** @type {Float64Array[]} */ ...segnali) {
	const n = Math.min(...segnali.map((s) => s.length));
	return Float64Array.from({ length: n }, (_, i) => segnali.reduce((q, s) => q + s[i], 0));
}

/**
 * Il microfono finto del progetto Playwright «mani» (Chromium lo ripete in loop): BATTITI_MANI (s,
 * picco) a 72 BPM con le imprecisioni di un bambino, in una stanza (coda di 200 ms), poi la stessa
 * frase detta a voce senza battere (nessun battito), su un rumore rosa leggero (~−60 dBFS).
 */
export const BATTITI_MANI = [
	[0.4, 0.3],
	[1.222, 0.08],
	[1.672, 0.5],
	[2.059, 0.15],
	[3.754, 0.04],
	[4.135, 0.6],
	[4.576, 0.2],
	[5.382, 0.1]
].map(([t, ampiezza]) => ({ t, ampiezza }));
export const SECONDI_MANI = 9;

export function generaBattiMani() {
	const secondi = SECONDI_MANI;
	const stanza = { rt60: 0.4, drrDb: 0, coda: 0.2 };
	return wav(
		somma(
			campioniBattiMani({ battiti: BATTITI_MANI, secondi, stanza }),
			campioniSillabe({ inizio: 6, battitoS: 0.6, picco: 0.12, secondi }),
			campioniRumore({ tipo: 'rosa', rms: 0.001, secondi, seme: 2 })
		),
		48_000
	);
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
