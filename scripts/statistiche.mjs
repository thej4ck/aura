// Legge le statistiche anonime (docs/adr/0007-statistiche-anonime.md) e le stampa in tabelle.
//   STATISTICHE_CHIAVE=… node scripts/statistiche.mjs [--dal AAAA-MM-GG] [--url https://…]
// La chiave si può anche leggere da un file: STATISTICHE_KEY_FILE=percorso. Non si stampa mai.
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
	options: {
		dal: { type: 'string', default: '0000-00-00' },
		url: { type: 'string', default: 'https://aura-production-0151.up.railway.app' }
	}
});
const chiave =
	process.env.STATISTICHE_CHIAVE ??
	(process.env.STATISTICHE_KEY_FILE &&
		readFileSync(process.env.STATISTICHE_KEY_FILE, 'utf8').trim());
if (!chiave) {
	console.error('Manca la chiave: STATISTICHE_CHIAVE o STATISTICHE_KEY_FILE.');
	process.exit(1);
}

const risposta = await fetch(`${values.url}/statistiche/riepilogo`, {
	headers: { Authorization: `Bearer ${chiave}` }
});
if (!risposta.ok) {
	console.error(`Il servizio ha risposto ${risposta.status}.`);
	process.exit(1);
}
/** @type {Record<string, number>} */
const conteggi = await risposta.json();

/** somma per chiave senza il giorno, dal giorno scelto in poi */
const totali = new Map();
for (const [k, n] of Object.entries(conteggi)) {
	const [giorno, ...resto] = k.split('|');
	if (giorno < values.dal) continue;
	const senzaGiorno = resto.join('|');
	totali.set(senzaGiorno, (totali.get(senzaGiorno) ?? 0) + n);
}
const righe = (evento) =>
	[...totali]
		.filter(([k]) => k.startsWith(`${evento}|`))
		.map(([k, n]) => [...k.split('|').slice(1), n]);

// le attività: iniziate, fin dove si arriva, come finiscono, dove scade il canto e dove si forza la voce
const attivita = new Map();
const di = (a) =>
	attivita.get(a) ??
	attivita.set(a, { inizio: 0, schede: [], fine: {}, scaduta: [], forte: [] }).get(a);
for (const [a, n] of righe('inizio')) di(a).inizio += n;
for (const [a, s, n] of righe('scheda')) di(a).schede[s] = (di(a).schede[s] ?? 0) + n;
for (const [a, v, n] of righe('fine')) di(a).fine[v] = (di(a).fine[v] ?? 0) + n;
for (const [a, s, n] of righe('scaduta')) di(a).scaduta.push(`${s}:${n}`);
for (const [a, s, n] of righe('voce-forte')) di(a).forte.push(`${s}:${n}`);

console.log(
	`Statistiche anonime dal ${values.dal === '0000-00-00' ? 'primo giorno' : values.dal}\n`
);
console.table(
	Object.fromEntries(
		[...attivita].sort().map(([a, d]) => [
			a,
			{
				iniziate: d.inizio,
				superate: d.fine.superata ?? 0,
				quasi: d.fine.quasi ?? 0,
				vuote: d.fine.vuota ?? 0,
				// Array.from e non map: map salta i buchi, e una scheda mai raggiunta deve valere 0
				'schede (1, 2, …)': Array.from(d.schede.slice(1), (n) => n ?? 0).join(' '),
				'canto scaduto (scheda:volte)': d.scaduta.join(' '),
				'voce forte (scheda:volte)': d.forte.join(' ')
			}
		])
	)
);
const tabella = (titolo, evento, colonne) => {
	const r = righe(evento);
	console.log(`\n${titolo}${r.length ? '' : ': nessuno'}`);
	if (r.length)
		console.table(
			r
				.sort((x, y) => y.at(-1) - x.at(-1))
				.map((x) => Object.fromEntries(colonne.map((c, i) => [c, x[i]])))
		);
};
tabella('Microfono non aperto', 'mic', ['codice', 'browser e sistema', 'volte']);
tabella('Errori del sito', 'errore', ['pagina', 'tipo', 'browser e sistema', 'volte']);
