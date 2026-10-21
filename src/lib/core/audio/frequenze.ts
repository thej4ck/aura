// Conversioni pure tra frequenza (Hz), numero MIDI (69 = La4) e cent (100 cent = 1 semitono).

export const freqDaMidi = (midi: number, la4 = 440): number => la4 * 2 ** ((midi - 69) / 12);

/** Numero MIDI con la parte frazionaria (69.25 = La4 crescente di 25 cent). */
export const midiDaFreq = (freq: number, la4 = 440): number => 69 + 12 * Math.log2(freq / la4);

/** Cent di `freq` rispetto alla nota: positivo = troppo alto, negativo = troppo basso. */
export const centsTra = (freq: number, midiTarget: number): number =>
	100 * (midiDaFreq(freq) - midiTarget);

/**
 * Come centsTra; con `equivalenzaOttava` conta la stessa nota in qualunque ottava (un bambino canta
 * il La un'ottava sopra l'adulto) e dà la distanza più vicina, in [-600, 600].
 */
export function distanzaCents(
	freq: number,
	midiTarget: number,
	{ equivalenzaOttava = false }: { equivalenzaOttava?: boolean } = {}
): number {
	const c = centsTra(freq, midiTarget);
	return equivalenzaOttava ? c - 1200 * Math.round(c / 1200) : c;
}
