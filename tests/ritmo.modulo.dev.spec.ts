// Modulo Ritmo end-to-end, sul server di sviluppo. Si batte con lo Spazio ai
// tempi che il turno scrive in data-attesi (vedi battere.ts); i colpi suonati si contano con una spia
// sugli OscillatorNode: un oscillatore per colpo, il legnetto è il Do6 (midi 84).
import { expect, test, type Page } from '@playwright/test';
import { batti, spiaColpi } from './battere';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(150_000); // la prima visita al server di sviluppo compila al volo, e i turni vanno a tempo

const BATTITO_S = 60 / 72; // BPM_RITMO
const LEGNETTO = 84;
const RIUSCITA = 'Ce l’hai fatta! Ogni battito è arrivato al momento giusto.';

async function apri(page: Page, attivita: string) {
	await page.goto(`/musica/ritmo/${attivita}`);
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	await page.getByRole('button', { name: /^(Inizia|Ripeti|Ricomincia dall'inizio)$/ }).click();
}

const avanti = (page: Page) => page.getByRole('button', { name: 'Avanti', exact: true }).click();
const feedback = (page: Page) => page.getByRole('main').getByRole('status');
const rigo = (page: Page) => page.getByRole('group', { name: 'Il ritmo da battere' });
/**
 * Le minime del rigo, voce per voce: «Figura 2 di 3: minima» (e la sillaba, se c'è), mai «semiminima».
 * Nel testo di tutto il gruppo le voci sono attaccate («…: minimaFigura 2…») e un \b non le separa.
 */
const minime = (page: Page) =>
	rigo(page)
		.getByRole('listitem')
		.filter({ hasText: /: minima\b/ });

/** Dove cominciano i suoni di un ritmo scritto con una sillaba per nota ('ta ti ti ta-a sst'), in battiti. */
function attacchi(sillabe: string): string {
	const durata: Record<string, number> = { ta: 1, ti: 0.5, 'ta-a': 2, sst: 1 };
	let t = 0;
	const out: number[] = [];
	for (const s of sillabe.split(' ')) {
		if (s !== 'sst') out.push(t);
		t += durata[s];
	}
	return out.join(' ');
}

/** Il bordo di sopra della barra in fondo alla scheda: sotto non si vede niente. */
const fondo = (page: Page) =>
	page.locator('[data-barra-fondo]').evaluate((el) => el.getBoundingClientRect().top);

/** Un turno: si comincia, si batte a tempo e la prova riesce. */
async function battiTutto(page: Page, inizia: 'Ascolta e batti' | 'Leggi e batti') {
	await page.getByRole('button', { name: inizia }).click();
	await batti(page, page.getByRole('main'));
	await expect(feedback(page)).toHaveText(RIUSCITA, { timeout: 15_000 });
}

test('«Il battito» per intero su un telefono: si ascolta, si batte a tempo, si risponde', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await page.setViewportSize({ width: 360, height: 640 });
	await page.emulateMedia({ reducedMotion: 'reduce' }); // si scorre subito, senza animazioni da aspettare
	await apri(page, 'il-battito');

	await expect(page.getByRole('heading', { name: 'Tum, tum, tum' })).toBeFocused();
	await avanti(page);
	await expect(page.getByText('Ascolta: un colpo, poi un altro')).toBeVisible();
	await avanti(page);

	// l'ascolto: «Avanti» arriva dopo il primo ascolto completo
	await page.getByRole('button', { name: 'Ascolta', exact: true }).click();
	await avanti(page);

	// Proviamo insieme: quando tocca battere, rigo e tasto sono sullo schermo, sopra la barra in fondo
	await page.getByRole('button', { name: 'Ascolta e batti' }).click();
	const tasto = page.getByRole('button', { name: 'Batti qui' });
	await expect(tasto).toBeFocused();
	for (const el of [tasto, rigo(page)]) {
		const r = (await el.boundingBox())!;
		expect(r.y).toBeGreaterThanOrEqual(0);
		expect(r.y + r.height).toBeLessThanOrEqual(await fondo(page));
	}
	await batti(page, page.getByRole('main'));
	await expect(feedback(page)).toHaveText(RIUSCITA, { timeout: 15_000 });
	expect(await violazioniGravi(page)).toEqual([]);
	await avanti(page);

	// Prova tu: l'eco di otto battiti, poi in lettura, dopo il conteggio
	await battiTutto(page, 'Ascolta e batti');
	await expect(rigo(page).locator('svg .battito.giusto')).toHaveCount(8);
	await avanti(page);
	await battiTutto(page, 'Leggi e batti');
	await avanti(page);
	await page.getByRole('button', { name: 'Sempre alla stessa distanza' }).click();
	await avanti(page);
	await page.getByRole('button', { name: 'Nello stesso momento dei suoi' }).click();
	await avanti(page);

	await expect(page.getByRole('heading', { name: 'Attività completata' })).toBeFocused();
	await expect(page.getByRole('img', { name: 'Stelle: 2 su 3' })).toBeVisible();
	await expect(page.getByText('La musica ha un battito regolare')).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});

test('col testo «Molto grande» su un telefono il turno sta nello schermo, sopra la barra, senza scorrere di lato', async ({
	page
}) => {
	await page.setViewportSize({ width: 360, height: 640 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await apri(page, 'semiminima-e-crome');
	// la preferenza dei genitori «Testo molto grande» mette questo attributo
	await page.evaluate(() => (document.documentElement.dataset.testo = 'molto-grande'));
	await avanti(page);
	await avanti(page);
	await page.getByRole('button', { name: 'Ascolta', exact: true }).click();
	await avanti(page);
	await page.getByRole('button', { name: 'Ascolta e batti' }).click();
	const tasto = page.getByRole('button', { name: 'Batti qui' });
	await expect(tasto).toBeVisible();
	for (const el of [tasto, rigo(page), page.locator('.pulsazione')]) {
		const r = (await el.boundingBox())!;
		expect(r.y).toBeGreaterThanOrEqual(0);
		expect(r.y + r.height).toBeLessThanOrEqual(await fondo(page));
	}
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
	const turni = page.getByRole('list', { name: 'A chi tocca' });
	expect(await turni.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
	// i nomi delle tappe restano per i lettori di schermo
	await expect(turni.getByRole('listitem')).toHaveText(['Ascolta', 'Batti']);
});

test('«Che ritmo è?» per intero su un telefono: suona proprio il ritmo giusto, e lo si trova contando i colpi', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await page.setViewportSize({ width: 360, height: 640 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const colpi = await spiaColpi(page);
	await apri(page, 'che-ritmo-e');
	await avanti(page);

	/** Ascolta, conta i colpi e tocca l'unico ritmo scritto che suona così: al primo tentativo. */
	async function trova() {
		const prima = (await colpi()).length;
		await page.getByRole('button', { name: 'Ascolta', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Ferma' })).toBeVisible();
		// mentre suona, i ritmi tra cui scegliere sono tutti sullo schermo
		const ritmi = page.locator('[data-sillabe]');
		const sopra = (await ritmi.first().boundingBox())!;
		const sotto = (await ritmi.last().boundingBox())!;
		expect(sopra.y).toBeGreaterThanOrEqual(0);
		expect(sotto.y + sotto.height).toBeLessThanOrEqual(await fondo(page));
		await expect(page.getByRole('button', { name: 'Ferma' })).toHaveCount(0, { timeout: 15_000 });

		// una battuta d'attacco (quattro clic, senza accento: niente tempo in chiave), poi il legnetto
		const nuovi = (await colpi()).slice(prima);
		const clic = nuovi.filter((c) => c.midi !== LEGNETTO);
		const legnetto = nuovi.filter((c) => c.midi === LEGNETTO).map((c) => c.t);
		expect(clic.map((c) => c.midi)).toEqual([96, 96, 96, 96]);
		expect(legnetto[0] - clic[0].t).toBeCloseTo(4 * BATTITO_S, 3);
		const battiti = legnetto.map((t) => (t - legnetto[0]) / BATTITO_S);
		for (const b of battiti) expect(Math.abs(b * 2 - Math.round(b * 2))).toBeLessThan(0.01);
		const sentito = battiti.map((b) => Math.round(b * 2) / 2).join(' ');

		const scritti = await ritmi.evaluateAll((l) => l.map((e) => e.getAttribute('data-sillabe')!));
		const uguali = scritti.flatMap((s, i) => (attacchi(s) === sentito ? [i] : []));
		expect(uguali, `${sentito} tra ${scritti.join(' / ')}`).toHaveLength(1);
		await page.getByRole('button', { name: `Ritmo ${uguali[0] + 1}`, exact: true }).click();
		await expect(feedback(page)).toHaveText('Sì, è proprio questo ritmo!');
	}

	await trova(); // Proviamo insieme
	await avanti(page);
	for (let g = 1; g <= 6; g++) {
		await expect(page.getByText(`Giro ${g} di 6`, { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Basta così' })).toBeVisible();
		await trova();
		if (g === 4) expect(await violazioniGravi(page)).toEqual([]);
		await avanti(page);
	}

	await expect(page.getByRole('heading', { name: 'Attività completata' })).toBeFocused();
	await expect(page.getByRole('img', { name: 'Stelle: 2 su 3' })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});

test('«Leggi e batti»: tre ritmi riusciti di fila portano TA-A, che resta; dopo uno non riuscito, un ripasso con le sillabe', async ({
	page
}) => {
	await apri(page, 'leggi-e-batti');
	await avanti(page);
	await battiTutto(page, 'Leggi e batti'); // Proviamo insieme, con le sillabe
	await avanti(page);

	for (let g = 1; g <= 3; g++) {
		await expect(page.getByText(`Giro ${g} di 6`, { exact: true })).toBeVisible();
		await expect(minime(page)).toHaveCount(0);
		await battiTutto(page, 'Leggi e batti');
		await avanti(page);
	}

	// la figura nuova arriva presentata, con le sillabe sotto le note
	await expect(page.getByText('Giro 4 di 6', { exact: true })).toBeFocused();
	await expect(page.getByText('Arriva una figura nuova: TA-A')).toBeVisible();
	await expect(minime(page)).not.toHaveCount(0);
	// senza battere: il consiglio dice cosa fare, e il ritmo dopo è un ripasso con le sillabe
	await page.getByRole('button', { name: 'Leggi e batti' }).click();
	await expect(feedback(page)).toHaveText(
		'Quando arriva «Batti», tocca il tasto grande una volta per ogni nota.',
		{ timeout: 20_000 }
	);
	await avanti(page);
	await expect(page.getByText('Giro 5 di 6', { exact: true })).toBeVisible();
	await expect(page.getByText('Le sillabe sotto le note ti aiutano')).toBeVisible();
	await expect(minime(page)).toHaveCount(0);

	// quattro ritmi bastano: il gioco è completato
	await page.getByRole('button', { name: 'Basta così' }).click();
	await expect(page.getByRole('heading', { name: 'Attività completata' })).toBeFocused();

	// il livello resta nei progressi, e non scende: la partita dopo comincia con TA-A
	await page.waitForTimeout(800); // salvataggio debounced (400 ms) su IndexedDB
	await apri(page, 'leggi-e-batti');
	await avanti(page);
	await page.getByRole('button', { name: 'Leggi e batti' }).click();
	await page.getByRole('button', { name: 'Basta così, vado avanti' }).click();
	await expect(page.getByText('Giro 1 di 6', { exact: true })).toBeVisible();
	await expect(minime(page)).not.toHaveCount(0);
});

test('su un telefono i disegni stanno interi, e la pausa tace mentre il suo battito si accende', async ({
	page
}) => {
	await page.setViewportSize({ width: 360, height: 640 });
	const colpi = await spiaColpi(page);
	for (const attivita of [
		'il-battito',
		'semiminima-e-crome',
		'la-minima',
		'la-pausa',
		'battute-e-tempo'
	]) {
		await apri(page, attivita);
		await avanti(page);
		const successivo = page.getByRole('button', { name: 'Passo successivo' });
		for (;;) {
			const misure = await page.locator('.battiti').evaluate((b) => {
				const staff = b.parentElement!.querySelector<HTMLElement>('.staff');
				return {
					rigo: staff ? staff.scrollWidth - staff.clientWidth : 0,
					battiti: b.scrollWidth - b.clientWidth,
					pagina: document.documentElement.scrollWidth - innerWidth
				};
			});
			expect(misure, attivita).toEqual({ rigo: 0, battiti: 0, pagina: 0 });
			if ((await successivo.getAttribute('aria-disabled')) === 'true') break;
			await successivo.click();
		}
	}

	// «La pausa», primo passo: TA, TA, SST, TA. Tre colpi di legnetto; sulla pausa niente suona ma il
	// terzo battito si accende
	await apri(page, 'la-pausa');
	await avanti(page);
	const prima = (await colpi()).length;
	await page.getByRole('button', { name: 'Riproduci' }).click();
	const stato = () =>
		page.evaluate(
			() =>
				`${document.querySelector('.battiti .acceso')?.textContent?.trim()}|${document.querySelectorAll('[data-suona]').length}`
		);
	await expect.poll(stato, { intervals: [20] }).toBe('3|0');
	await expect.poll(stato, { intervals: [20] }).toBe('4|1');
	await page.getByRole('button', { name: 'Pausa' }).click();
	const legnetto = (await colpi())
		.slice(prima)
		.filter((c) => c.midi === LEGNETTO)
		.map((c) => c.t / BATTITO_S);
	expect(legnetto.map((b) => +(b - legnetto[0]).toFixed(3))).toEqual([0, 1, 3]);
});
