// Battiti di mani dal microfono finto (BATTITI_MANI in una stanza, poi una frase detta a voce senza
// battere: vedi setup-mic.ts) sul pannello «Battiti di mani» di /dev: solo server di sviluppo. Si
// contano i battiti che arrivano e si confrontano i loro intervalli con quelli del WAV, che Chromium
// ripete in loop: nessuno perso, nessuno in più (la voce), ognuno al suo posto entro pochi ms.
import { expect, test, type Page } from '@playwright/test';
import { BATTITI_MANI, SECONDI_MANI } from '../scripts/genera-wav.mjs';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(120_000); // la prima visita al server di sviluppo compila al volo

/** gli intervalli (s) tra un battito del WAV e il successivo, giro dopo giro */
const ATTESI = BATTITI_MANI.map(
	(b, i) => (BATTITI_MANI[i + 1]?.t ?? SECONDI_MANI + BATTITI_MANI[0].t) - b.t
);

async function apri(page: Page) {
	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	const sezione = page.getByRole('region', { name: 'Battiti di mani' });
	await sezione.getByRole('button', { name: 'Ascolta i battiti' }).click();
	await expect(sezione.getByTestId('mani-cattura')).toContainText('worklet');
	const tempi = async (): Promise<number[]> =>
		JSON.parse((await sezione.getByTestId('mani-tempi').textContent()) || '[]');
	return { sezione, tempi };
}

/**
 * L'errore massimo (ms) degli intervalli trovati rispetto a quelli del WAV, dal punto del giro che
 * combacia meglio: sotto pochi ms vuol dire nessun battito perso o in più, e tempi quasi al campione.
 */
function erroreMs(tempi: number[]): number {
	const intervalli = tempi.slice(1).map((t, i) => t - tempi[i]);
	return Math.min(
		...ATTESI.map((_, inizio) =>
			Math.max(
				...intervalli.map((x, i) => Math.abs(x - ATTESI[(inizio + i) % ATTESI.length]) * 1000)
			)
		)
	);
}

test('ogni battito una volta, al suo posto, anche con il thread occupato e la voce che parla', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	const { sezione, tempi } = await apri(page);
	// il thread principale occupato 100 ms ogni 300: i blocchi del worklet aspettano in coda
	await page.evaluate(() => {
		setInterval(() => {
			const inizio = performance.now();
			while (performance.now() - inizio < 100);
		}, 300);
	});
	// più di un giro del WAV: 8 battiti e una frase detta a voce ogni 9 s
	await expect.poll(async () => (await tempi()).length, { timeout: 40_000 }).toBeGreaterThan(10);
	const t = await tempi();
	// ~3,9 ms sono fissi (misurati, uguali a ogni giro): l'attacco è il primo campione al 30% del picco,
	// che cade un po' prima o dopo con la forza del battito e la stanza. Con il limite a 5 ms il test è
	// fallito una volta al merge: col processore carico Chromium può perdere o ripetere un blocco (10 ms)
	// del WAV del microfono finto. 15 ms li contiene e resta 4 volte sotto la tolleranza più stretta
	// (60 ms) e sotto il frame di un'analisi a 30 al secondo (33 ms); un battito perso o in più sposta
	// un intervallo di oltre 350 ms.
	expect(erroreMs(t), JSON.stringify(t)).toBeLessThan(15);
	await sezione.getByRole('button', { name: 'Chiudi il microfono' }).click();
	await expect(sezione.getByTestId('mani-conteggio')).toBeHidden();
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
	expect(await violazioniGravi(page)).toEqual([]);
});

test('un worklet che non manda blocchi: si passa al ripiego, e i battiti arrivano lo stesso', async ({
	page
}) => {
	// come un browser dove il nodo senza uscite non elabora (il rischio di Safari e Firefox)
	await page.addInitScript(() => {
		const Nodo = window.AudioWorkletNode;
		window.AudioWorkletNode = class extends Nodo {
			constructor(...a: ConstructorParameters<typeof AudioWorkletNode>) {
				super(...a);
				Object.defineProperty(this.port, 'onmessage', { set() {}, get: () => null });
			}
		};
	});
	const { sezione, tempi } = await apri(page);
	await expect.poll(async () => (await tempi()).length, { timeout: 30_000 }).toBeGreaterThan(3);
	await expect(sezione.getByTestId('mani-cattura')).toContainText('raf');
});

test('turni: mentre suona il ritmo il microfono non ascolta, poi riprende', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	const { sezione, tempi } = await apri(page);
	await expect.poll(async () => (await tempi()).length, { timeout: 20_000 }).toBeGreaterThan(1);
	await sezione.getByRole('button', { name: 'Suona un ritmo' }).click();
	const ferma = sezione.getByRole('button', { name: 'Ferma' });
	await expect(ferma).toBeVisible();
	// un battito appena prima del clic si decide 80 ms dopo: si conta da lì
	await page.waitForTimeout(300);
	const prima = (await tempi()).length;
	// una battuta di clic e «ta ti-ti ta-a» a 72 BPM: quasi 7 s, in cui il WAV batte almeno 5 volte
	let controlli = 0;
	while (await ferma.isVisible()) {
		expect((await tempi()).length).toBe(prima);
		controlli++;
		await page.waitForTimeout(250);
	}
	expect(controlli).toBeGreaterThan(20);
	await expect(sezione.getByRole('button', { name: 'Suona un ritmo' })).toBeVisible();
	await expect.poll(async () => (await tempi()).length, { timeout: 15_000 }).toBeGreaterThan(prima);
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});
