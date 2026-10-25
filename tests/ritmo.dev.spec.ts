// Il turno ritmico (batti-ritmo) nella vetrina /dev, col tocco da tastiera: solo server di sviluppo. Si
// batte con lo Spazio ai tempi che il widget scrive in data-attesi (performance.now() della pagina,
// ricavato dal clock audio), così l'esito è deterministico: la valutazione toglie lo scarto costante, e
// il ritardo della tastiera finta resta molto sotto la tolleranza facile (150 ms).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(90_000); // la prima visita al server di sviluppo compila al volo

type Spia = { __colpi: { midi: number; t: number }[] };

/** Conta gli OscillatorNode avviati, con la nota (midi) e l'istante sul clock audio: uno per colpo. */
async function spiaColpi(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as Spia;
		w.__colpi = [];
		const start = OscillatorNode.prototype.start;
		OscillatorNode.prototype.start = function (this: OscillatorNode, quando = 0) {
			w.__colpi.push({
				midi: Math.round(69 + 12 * Math.log2(this.frequency.value / 440)),
				t: quando
			});
			return start.call(this, quando);
		};
	});
	return () => page.evaluate(() => (window as unknown as Spia).__colpi);
}

/** Gli intervalli (s) tra istanti in ordine. */
const intervalli = (t: number[]) => t.slice(1).map((x, i) => x - t[i]);

async function apriVetrina(page: Page) {
	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
}

const widget = (page: Page, nome: string) => page.getByRole('article', { name: nome, exact: true });
const esiti = (page: Page, nome: string) =>
	widget(page, nome)
		.getByRole('list', { name: `Esiti ${nome}` })
		.getByRole('listitem');

/**
 * Batte con lo Spazio le note del turno (indici delle note da battere, pause escluse), tranne quelle in
 * `salta`, più i battiti `extra` (in battiti dalla prima nota). I tempi vengono dalla pagina.
 */
async function batti(
	page: Page,
	w: Locator,
	{ salta = [], extra = [] }: { salta?: number[]; extra?: number[] } = {}
) {
	const palco = w.locator('[data-attesi]');
	await expect(palco).toHaveAttribute('data-attesi', /\d/, { timeout: 20_000 });
	const attesi: number[] = JSON.parse((await palco.getAttribute('data-attesi'))!);
	const battitoMs = attesi[1] - attesi[0]; // i ritmi della vetrina cominciano con TA
	const tempi = [
		...attesi.filter((_, i) => !salta.includes(i)),
		...extra.map((b) => attesi[0] + b * battitoMs)
	].sort((a, b) => a - b);
	// l'orologio della pagina rispetto a quello del test, a metà dell'andata e ritorno
	const prima = Date.now();
	const pagina = await page.evaluate(() => performance.now());
	const scarto = pagina - (prima + Date.now()) / 2;
	for (const t of tempi) {
		const attesa = t - scarto - Date.now();
		if (attesa > 0) await new Promise((r) => setTimeout(r, attesa));
		await page.keyboard.press('Space');
	}
}

test('in lettura, battuto a tempo: la prova riesce e i battiti giusti stanno sotto le note', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await apriVetrina(page);
	const w = widget(page, 'batti-ritmo-lettura');
	await expect(w.getByRole('radio', { name: 'Tocco lo schermo' })).toBeChecked();
	await w.getByRole('button', { name: 'Leggi e batti' }).click();

	// il pulsante premuto sparisce: il focus va sul tasto grande, e lo Spazio batte subito
	const tasto = w.getByRole('button', { name: 'Batti qui' });
	await expect(tasto).toBeFocused();
	const lato = await tasto.boundingBox();
	expect(Math.min(lato!.width, lato!.height)).toBeGreaterThanOrEqual(96);
	const turno = w.getByRole('list', { name: 'A chi tocca' }).locator('[aria-current="step"]');
	await expect(turno).toHaveText('Ascolta'); // l'attacco: una battuta di clic
	await batti(page, w);

	await expect(w.getByRole('status')).toHaveText(
		'Ce l’hai fatta! Ogni battito è arrivato al momento giusto.',
		{ timeout: 10_000 }
	);
	await expect(esiti(page, 'batti-ritmo-lettura')).toHaveText([
		'corretto: true, item: ta ti ti ta-a'
	]);
	const rigo = w.getByRole('group', { name: 'Il ritmo da battere' });
	await expect(rigo.locator('svg .battito.giusto')).toHaveCount(4);
	await expect(rigo.locator('svg .battito:not(.giusto)')).toHaveCount(0);
	await expect(rigo.getByRole('listitem').first()).toContainText('battuta giusta');
	await expect(w.getByRole('button', { name: 'Batti qui' })).toHaveCount(0);

	await w.getByRole('button', { name: 'Avanti' }).click();
	await expect(esiti(page, 'batti-ritmo-lettura')).toHaveText([
		'corretto: true, item: ta ti ti ta-a',
		'fine (Avanti)'
	]);
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
	expect(await violazioniGravi(page)).toEqual([]);
});

test('a eco, con un battito mancato e uno nella pausa: il consiglio e i segni giusti; conta il primo tentativo', async ({
	page
}) => {
	await apriVetrina(page);
	const w = widget(page, 'batti-ritmo');
	await w.getByRole('button', { name: 'Ascolta e batti' }).click();

	// prima suona il sito: la nota che suona è evidenziata sul rigo, seguendo l'audio
	const turno = w.getByRole('list', { name: 'A chi tocca' }).locator('[aria-current="step"]');
	await expect(turno).toHaveText('Ascolta');
	const rigo = w.getByRole('group', { name: 'Il ritmo da battere' });
	await expect(rigo.getByRole('listitem').filter({ hasText: 'evidenziata' })).toHaveCount(1, {
		timeout: 10_000
	});
	// 'ta ti-ti ta sst': la prima TI non si batte, un battito cade nella pausa (il quarto battito)
	await batti(page, w, { salta: [1], extra: [3] });
	await expect(turno).toHaveText('Batti');

	const avviso = w.getByRole('status');
	await expect(avviso).toHaveText(
		'Hai già battuto 3 note su 4 al momento giusto. Qui manca un battito: anche la nota cerchiata va battuta.',
		{ timeout: 10_000 }
	);
	await expect(rigo.locator('svg .battito.giusto')).toHaveCount(3);
	await expect(rigo.locator('svg .battito.mancato')).toHaveCount(1);
	await expect(rigo.locator('svg .battito.in-piu')).toHaveCount(1);
	await expect(rigo.getByRole('listitem').nth(1)).toContainText('mancata');
	await expect(rigo.getByRole('listitem').nth(1)).toContainText('evidenziata'); // la nota del consiglio
	await expect(rigo).toContainText('Un battito in più, uno nella pausa');
	await expect(esiti(page, 'batti-ritmo')).toHaveText(['corretto: false, item: ta ti ti ta sst']);

	// si riprova: di nuovo prima il sito, poi a tempo; l'esito resta quello del primo tentativo
	await w.getByRole('button', { name: 'Riprova' }).click();
	await batti(page, w);
	await expect(avviso).toHaveText('Ce l’hai fatta! Ogni battito è arrivato al momento giusto.', {
		timeout: 10_000
	});
	await expect(esiti(page, 'batti-ritmo')).toHaveText(['corretto: false, item: ta ti ti ta sst']);
});

test('battiti in più senza pausa e battiti in anticipo: il consiglio dice cosa fare', async ({
	page
}) => {
	await apriVetrina(page);
	const w = widget(page, 'batti-ritmo-lettura');
	await w.getByRole('button', { name: 'Leggi e batti' }).click();
	// 'ta ti-ti ta-a': un battito in più a metà della minima (battito 3), oltre a tutte le note
	await batti(page, w, { extra: [3] });
	await expect(w.getByRole('status')).toHaveText(
		'Hai già battuto 4 note su 4 al momento giusto. C’è un battito in più: batti una volta sola per ogni nota.',
		{ timeout: 10_000 }
	);
	await expect(esiti(page, 'batti-ritmo-lettura')).toHaveText([
		'corretto: false, item: ta ti ti ta-a'
	]);

	// si riprova battendo la minima 200 ms prima (0,24 battiti a 72 BPM): oltre la tolleranza facile
	await w.getByRole('button', { name: 'Riprova' }).click();
	await batti(page, w, { salta: [3], extra: [2 - 0.24] });
	await expect(w.getByRole('status')).toHaveText(
		'Hai già battuto 3 note su 4 al momento giusto. La nota cerchiata è arrivata un po’ presto: aspetta il suo battito.',
		{ timeout: 10_000 }
	);
	const rigo = w.getByRole('group', { name: 'Il ritmo da battere' });
	await expect(rigo.locator('svg .battito.presto')).toHaveCount(1);
	await expect(rigo.getByRole('listitem').nth(3)).toContainText("battuta un po' presto");
});

test('senza microfono si batte col tocco, e la scelta si ricorda', async ({ page }) => {
	await apriVetrina(page);
	const w = widget(page, 'batti-ritmo-lettura');
	await w.getByRole('radio', { name: 'Batto le mani' }).check();
	// prima di aprire il microfono si spiega a cosa serve
	await expect(
		w.getByText('Il microfono serve solo per sentire le tue mani. Niente viene registrato.')
	).toBeVisible();
	await w.getByRole('button', { name: 'Leggi e batti' }).click();
	// questo browser non ha un microfono: si spiega all'adulto e si batte col tasto
	await expect(w.getByRole('status')).toContainText(
		'Puoi battere lo stesso toccando il tasto grande.'
	);
	await expect(w.getByRole('button', { name: 'Batti qui' })).toBeVisible();

	await w.getByRole('button', { name: 'Ricomincia' }).click();
	await expect(w.getByRole('radio', { name: 'Tocco lo schermo' })).toBeChecked();
});

test('su un telefono, quando tocca battere, il rigo e il tasto sono sullo schermo; il battito segue i clic', async ({
	page
}) => {
	await page.setViewportSize({ width: 360, height: 640 });
	await page.emulateMedia({ reducedMotion: 'reduce' }); // si salta, senza scorrere piano: niente attese
	await apriVetrina(page);
	const w = widget(page, 'batti-ritmo-lettura');
	await w.getByRole('button', { name: 'Leggi e batti' }).click();

	const tasto = w.getByRole('button', { name: 'Batti qui' });
	const rigo = w.getByRole('group', { name: 'Il ritmo da battere' });
	await expect(tasto).toBeVisible();
	for (const el of [tasto, rigo]) {
		const r = (await el.boundingBox())!;
		expect(r.y).toBeGreaterThanOrEqual(0);
		expect(r.y + r.height).toBeLessThanOrEqual(640);
	}
	// il battito visivo passa 1, 2, 3, 4 durante l'attacco; col movimento ridotto non cambia grandezza
	const pulsazione = w.locator('.pulsazione');
	for (const b of ['0', '1', '2', '3'])
		await expect(pulsazione).toHaveAttribute('data-battito', b, { timeout: 5_000 });
	await expect(pulsazione.locator('li.attivo')).toHaveCSS('transform', 'none');
});

test('ascolta un ritmo: un colpo di legnetto per nota, i clic sui battiti, e la nota che suona è evidenziata', async ({
	page
}) => {
	const colpi = await spiaColpi(page);
	await apriVetrina(page);
	const w = widget(page, 'ascolta-ritmo');
	await expect(w.getByRole('group', { name: 'Il ritmo da ascoltare' })).toContainText('TA-A');
	await w.getByRole('button', { name: 'Ascolta', exact: true }).click();
	const rigo = w.getByRole('group', { name: 'Il ritmo da ascoltare' });
	await expect(rigo.getByRole('listitem').filter({ hasText: 'evidenziata' })).toHaveCount(1);
	await expect(w.getByRole('button', { name: 'Avanti' })).toBeVisible({ timeout: 10_000 });

	// 'ta ti-ti ta-a' a 72 BPM col metronomo: legnetto (Do6) su 0, 1, 1½, 2; clic su 0, 1, 2, 3 (il primo acuto)
	const tutti = await colpi();
	const legnetto = tutti.filter((c) => c.midi === 84).map((c) => c.t);
	const clic = tutti.filter((c) => c.midi !== 84);
	expect(legnetto).toHaveLength(4);
	expect(clic.map((c) => c.midi)).toEqual([103, 96, 96, 96]);
	const battito = 60 / 72;
	intervalli(legnetto).forEach((x, i) => expect(x).toBeCloseTo([1, 0.5, 0.5][i] * battito, 3));
	intervalli(clic.map((c) => c.t)).forEach((x) => expect(x).toBeCloseTo(battito, 3));
	expect(legnetto[0]).toBeCloseTo(clic[0].t, 3);
});

test('il turno a eco col tocco: il sito e poi il bambino, a tempo, con i colpi giusti', async ({
	page
}) => {
	const colpi = await spiaColpi(page);
	await apriVetrina(page);
	const w = widget(page, 'batti-ritmo');
	await w.getByRole('button', { name: 'Ascolta e batti' }).click();
	// senza toccare: alla fine il consiglio dice cosa fare, e ogni nota ha il suo segno «mancata»
	await expect(w.getByRole('status')).toHaveText(
		'Quando arriva «Batti», tocca il tasto grande una volta per ogni nota.',
		{ timeout: 20_000 }
	);
	const rigo = w.getByRole('group', { name: 'Il ritmo da battere' });
	await expect(rigo.locator('svg .battito.mancato')).toHaveCount(4);

	// 'ta ti-ti ta sst': il sito suona attacco e ritmo (4 + 4 clic, 4 legnetti: la pausa tace), poi
	// l'attacco del bambino e i clic piano sotto i suoi battiti (4 + 4); un clic ogni battito, senza buchi
	const tutti = await colpi();
	expect(tutti.filter((c) => c.midi === 84)).toHaveLength(4);
	const clic = tutti.filter((c) => c.midi !== 84);
	expect(clic).toHaveLength(16);
	expect(clic.filter((c) => c.midi === 103)).toHaveLength(4); // il primo di ogni battuta
	intervalli(clic.map((c) => c.t)).forEach((x) => expect(x).toBeCloseTo(60 / 72, 3));
});
