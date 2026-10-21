/** Generatore di numeri in [0, 1). Con lo stesso seed dà sempre la stessa sequenza. */
export type Casuale = () => number;

/** PRNG mulberry32: veloce, 32 bit, più che sufficiente per gli esercizi (non per la crittografia). */
export function creaCasuale(seed: number): Casuale {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function scegli<T>(voci: readonly T[], r: Casuale): T {
	if (!voci.length) throw new RangeError('scegli: nessuna voce');
	return voci[Math.floor(r() * voci.length)];
}

/** Copia mescolata (Fisher-Yates). */
export function mescola<T>(voci: readonly T[], r: Casuale): T[] {
	const out = [...voci];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** Sceglie con probabilità proporzionale al peso (pesi negativi = 0; tutti a 0 = scelta uniforme). */
export function sceltaPesata<T>(voci: readonly T[], peso: (v: T) => number, r: Casuale): T {
	const pesi = voci.map((v) => Math.max(0, peso(v)));
	const totale = pesi.reduce((a, b) => a + b, 0);
	if (!(totale > 0)) return scegli(voci, r);
	let x = r() * totale;
	for (let i = 0; i < voci.length; i++) {
		x -= pesi[i];
		if (x < 0) return voci[i];
	}
	return voci[voci.length - 1]; // arrotondamenti
}
