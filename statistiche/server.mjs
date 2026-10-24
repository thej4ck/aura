// Il servizio delle statistiche anonime (docs/adr/0007-statistiche-anonime.md). Node, senza dipendenze.
// Lo raggiunge solo Caddy, dalla rete privata di Railway, che toglie gli header con l'IP.
//   POST /statistiche/evento     un evento (JSON, max 1 KB) → +1 su un contatore del giorno; risponde 204
//   GET  /statistiche/riepilogo  i contatori, con «Authorization: Bearer <STATISTICHE_CHIAVE>»
//   GET  /statistiche/salute     per il controllo di Railway
// Nessun registro delle richieste. I contatori stanno in memoria e su DATI (un file sul volume), scritto
// pochi secondi dopo ogni modifica e alla chiusura.
import { createServer } from 'node:http';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { conta } from './conteggi.mjs';

const PORTA = Number(process.env.PORT ?? 8080);
const DATI = process.env.DATI ?? '/data/conteggi.json';
const CHIAVE = process.env.STATISTICHE_CHIAVE ?? '';
const MAX_BYTE = 1024;
const SCRIVI_DOPO_MS = Number(process.env.SCRIVI_DOPO_MS ?? 5000);

/** @type {Record<string, number>} */
let conteggi = {};
try {
	conteggi = JSON.parse(readFileSync(DATI, 'utf8'));
} catch {
	// primo avvio: nessun file
}

let timer;
function salva() {
	clearTimeout(timer);
	timer = undefined;
	// prima un file a parte, poi lo scambio: un riavvio a metà non rovina i dati
	writeFileSync(`${DATI}.tmp`, JSON.stringify(conteggi));
	renameSync(`${DATI}.tmp`, DATI);
}

function autorizzato(req) {
	const data = Buffer.from(req.headers.authorization ?? '');
	const attesa = Buffer.from(`Bearer ${CHIAVE}`);
	return CHIAVE !== '' && data.length === attesa.length && timingSafeEqual(data, attesa);
}

const server = createServer((req, res) => {
	const percorso = (req.url ?? '').split('?')[0];
	if (req.method === 'POST' && percorso === '/statistiche/evento') {
		const parti = [];
		let byte = 0;
		req.on('data', (c) => {
			byte += c.length;
			if (byte > MAX_BYTE) req.destroy();
			else parti.push(c);
		});
		req.on('end', () => {
			try {
				if (conta(conteggi, JSON.parse(Buffer.concat(parti).toString('utf8')), new Date()))
					timer ??= setTimeout(salva, SCRIVI_DOPO_MS);
			} catch {
				// JSON non valido: si ignora
			}
			// sempre 204: chi manda spazzatura non impara niente
			res.writeHead(204).end();
		});
		return;
	}
	if (req.method === 'GET' && percorso === '/statistiche/riepilogo') {
		if (!autorizzato(req)) return void res.writeHead(401).end();
		res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
		return void res.end(JSON.stringify(conteggi));
	}
	if (req.method === 'GET' && percorso === '/statistiche/salute')
		return void res.writeHead(200).end();
	res.writeHead(404).end();
});

for (const segnale of ['SIGTERM', 'SIGINT']) {
	process.on(segnale, () => {
		if (timer) salva();
		server.close(() => process.exit(0));
	});
}

// '::' ascolta anche in IPv6: la rete privata di Railway lo usa
server.listen(PORTA, '::');
