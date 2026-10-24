// Statistiche d'uso anonime (docs/adr/0007-statistiche-anonime.md): un evento diventa +1 su un contatore
// del giorno. Si tengono solo i campi previsti, validati qui; tutto il resto della richiesta (IP, browser,
// orario preciso) non arriva o si butta. Puro: lo usano server.mjs e i test.

/**
 * gli eventi che il sito manda (src/lib/core/statistiche.ts) e i campi che ognuno può avere
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const EVENTI = {
	inizio: ['a'], // attività iniziata
	scheda: ['a', 's'], // scheda raggiunta: dove ci si ferma
	fine: ['a', 'v'], // riepilogo: superata, quasi, vuota
	scaduta: ['a', 's'], // tempo di ascolto finito senza riuscire
	'voce-forte': ['a', 's'], // consiglio di non forzare la voce
	mic: ['v', 'b'], // microfono non aperto: codice dell'errore, browser e sistema
	errore: ['a', 'v', 'b'] // errore del sito: pagina, tipo di errore, browser e sistema
};

/** @type {Readonly<Record<string, (x: unknown) => boolean>>} */
const CAMPI = {
	/** id di un'attività o percorso di una pagina */
	a: (x) => typeof x === 'string' && /^[a-z0-9./-]{1,80}$/.test(x),
	/** numero della scheda */
	s: (x) => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 99,
	/** esito, codice o nome di un errore */
	v: (x) => typeof x === 'string' && /^[A-Za-z-]{1,40}$/.test(x),
	/** «Chrome 140, Android»: nome e versione principale, niente di più */
	b: (x) => typeof x === 'string' && /^[A-Za-z ]{1,20} (\d{1,4}|\?), [A-Za-z?]{1,12}$/.test(x)
};

/** oltre questo numero di contatori diversi non se ne creano di nuovi (chi manda spazzatura non riempie il disco) */
export const MAX_CONTATORI = 50_000;

/**
 * La chiave del contatore per l'evento, o null se l'evento non è valido.
 * @param {unknown} evento
 * @param {string} giorno 'AAAA-MM-GG' (UTC)
 */
export function chiave(evento, giorno) {
	if (typeof evento !== 'object' || evento === null) return null;
	const ev = /** @type {Record<string, unknown>} */ (evento);
	if (typeof ev.e !== 'string' || !Object.hasOwn(EVENTI, ev.e)) return null;
	const campi = EVENTI[ev.e];
	const parti = [giorno, ev.e];
	for (const campo of campi) {
		const valore = ev[campo];
		if (valore === undefined) parti.push('');
		else if (CAMPI[campo](valore)) parti.push(String(valore));
		else return null;
	}
	// un campo in più (un id, un nome) fa scartare tutto l'evento: non si tiene nemmeno il resto
	if (Object.keys(ev).some((k) => k !== 'e' && !campi.includes(k))) return null;
	return parti.join('|');
}

/**
 * Aggiunge l'evento ai contatori; dice se l'ha contato.
 * @param {Record<string, number>} conteggi
 * @param {unknown} evento
 * @param {Date} adesso
 */
export function conta(conteggi, evento, adesso) {
	const k = chiave(evento, adesso.toISOString().slice(0, 10));
	if (k === null) return false;
	if (!(k in conteggi) && Object.keys(conteggi).length >= MAX_CONTATORI) return false;
	conteggi[k] = (conteggi[k] ?? 0) + 1;
	return true;
}
