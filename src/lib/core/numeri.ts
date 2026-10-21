// ponytail: solo italiano e solo 0-999 (basta alla domanda per gli adulti); un'altra lingua avrà la sua funzione
const UNITA = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];
const DA_DIECI = [
	'dieci',
	'undici',
	'dodici',
	'tredici',
	'quattordici',
	'quindici',
	'sedici',
	'diciassette',
	'diciotto',
	'diciannove'
];
const DECINE = [
	'',
	'',
	'venti',
	'trenta',
	'quaranta',
	'cinquanta',
	'sessanta',
	'settanta',
	'ottanta',
	'novanta'
];

function sottoCento(n: number): string {
	if (n < 10) return UNITA[n];
	if (n < 20) return DA_DIECI[n - 10];
	const decina = DECINE[Math.floor(n / 10)];
	const u = n % 10;
	if (u === 0) return decina;
	// elisione davanti a uno e otto (ventuno, trentotto); "tre" in fondo vuole l'accento (ventitré)
	return (u === 1 || u === 8 ? decina.slice(0, -1) : decina) + (u === 3 ? 'tré' : UNITA[u]);
}

/** Un numero intero da 0 a 999 scritto in lettere (342 → "trecentoquarantadue"). */
export function numeroInLettere(n: number): string {
	if (!Number.isInteger(n) || n < 0 || n > 999) throw new RangeError(`numeroInLettere: ${n}`);
	if (n < 100) return sottoCento(n);
	const c = Math.floor(n / 100);
	const resto = n % 100;
	const cento = c === 1 ? 'cento' : UNITA[c] + 'cento';
	if (resto === 0) return cento;
	// centottanta: la "o" di cento cade davanti a "ottanta"
	return (
		(Math.floor(resto / 10) === 8 ? cento.slice(0, -1) : cento) +
		(resto === 3 ? 'tré' : sottoCento(resto))
	);
}
