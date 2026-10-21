/** Giorno di calendario locale, 'AAAA-MM-GG'. Confrontabile come stringa. */
export type Giorno = string;

const due = (n: number) => String(n).padStart(2, '0');

/** Il giorno locale (non UTC) di un istante. */
export function giorno(d: Date): Giorno {
	return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

export function aggiungiGiorni(g: Giorno, n: number): Giorno {
	const [a, m, d] = g.split('-').map(Number);
	return giorno(new Date(a, m - 1, d + n));
}
