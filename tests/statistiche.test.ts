// Il servizio delle statistiche anonime (statistiche/): cosa si conta, cosa si butta, e il server vero.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { MAX_CONTATORI, chiave, conta } from '../statistiche/conteggi.mjs';

const GIORNO = '2026-10-24';

describe('conteggi', () => {
	it('un evento valido diventa un contatore del giorno', () => {
		expect(chiave({ e: 'scheda', a: 'musica.canto.eco', s: 3 }, GIORNO)).toBe(
			'2026-10-24|scheda|musica.canto.eco|3'
		);
		expect(chiave({ e: 'mic', v: 'permesso-negato', b: 'Chrome 140, Android' }, GIORNO)).toBe(
			'2026-10-24|mic|permesso-negato|Chrome 140, Android'
		);
		const conteggi: Record<string, number> = {};
		const adesso = new Date('2026-10-24T09:30:00Z');
		conta(conteggi, { e: 'inizio', a: 'musica.canto.eco' }, adesso);
		conta(conteggi, { e: 'inizio', a: 'musica.canto.eco' }, adesso);
		expect(conteggi).toEqual({ '2026-10-24|inizio|musica.canto.eco': 2 });
	});

	it('si butta tutto ciò che non è previsto, anche un solo campo in più', () => {
		for (const evento of [
			null,
			'inizio',
			{ e: 'sconosciuto' },
			{ e: '__proto__' },
			{ e: 'inizio', a: 'Musica Canto' }, // maiuscole e spazi: non è un id
			{ e: 'inizio', a: 'musica.canto.eco', nome: 'Ada' }, // un campo in più
			{ e: 'scheda', a: 'musica.canto.eco', s: 0 },
			{ e: 'scheda', a: 'musica.canto.eco', s: '3' },
			{ e: 'mic', v: 'permesso-negato', b: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' }
		])
			expect(chiave(evento, GIORNO), JSON.stringify(evento)).toBeNull();
	});

	it('oltre MAX_CONTATORI non nascono contatori nuovi, quelli esistenti crescono ancora', () => {
		const conteggi = Object.fromEntries(
			Array.from({ length: MAX_CONTATORI }, (_, i) => [`k${i}`, 1])
		) as Record<string, number>;
		conteggi['2026-10-24|inizio|a'] = 1;
		const adesso = new Date('2026-10-24T09:30:00Z');
		expect(conta(conteggi, { e: 'inizio', a: 'b' }, adesso)).toBe(false);
		expect(conta(conteggi, { e: 'inizio', a: 'a' }, adesso)).toBe(true);
		expect(conteggi['2026-10-24|inizio|a']).toBe(2);
	});
});

describe('server', () => {
	it('conta, legge solo con la chiave e salva i contatori sul file', async () => {
		const dati = join(mkdtempSync(join(tmpdir(), 'aura-statistiche-')), 'conteggi.json');
		const porta = 40_000 + Math.floor(Math.random() * 10_000);
		const server = spawn(process.execPath, ['statistiche/server.mjs'], {
			env: {
				...process.env,
				PORT: String(porta),
				DATI: dati,
				STATISTICHE_CHIAVE: 'prova',
				SCRIVI_DOPO_MS: '50'
			}
		});
		const base = `http://localhost:${porta}/statistiche`;
		try {
			await expect
				.poll(() =>
					fetch(`${base}/salute`).then(
						(r) => r.status,
						() => 0
					)
				)
				.toBe(200);
			const invia = (corpo: string) => fetch(`${base}/evento`, { method: 'POST', body: corpo });
			expect((await invia(JSON.stringify({ e: 'inizio', a: 'musica.canto.eco' }))).status).toBe(
				204
			);
			expect((await invia('non json')).status).toBe(204);
			expect((await invia(JSON.stringify({ e: 'inizio', a: 'x', email: 'a@b.it' }))).status).toBe(
				204
			);

			expect((await fetch(`${base}/riepilogo`)).status).toBe(401);
			const sbagliata = { headers: { Authorization: 'Bearer altra' } };
			expect((await fetch(`${base}/riepilogo`, sbagliata)).status).toBe(401);
			const riepilogo = await fetch(`${base}/riepilogo`, {
				headers: { Authorization: 'Bearer prova' }
			}).then((r) => r.json());
			expect(Object.values(riepilogo)).toEqual([1]);
			expect(Object.keys(riepilogo)[0]).toMatch(/^\d{4}-\d{2}-\d{2}\|inizio\|musica\.canto\.eco$/);
			// su disco poco dopo (in produzione anche alla chiusura, con SIGTERM: Windows non lo manda)
			const salvati = () => {
				try {
					return Object.values(JSON.parse(readFileSync(dati, 'utf8')));
				} catch {
					return [];
				}
			};
			await expect.poll(salvati).toEqual([1]);
		} finally {
			server.kill('SIGTERM');
			await once(server, 'exit');
		}
	});
});
