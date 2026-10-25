// Il turno ritmico (batti-ritmo) nella vetrina /dev, col tocco da tastiera: solo server di sviluppo. Si
// batte con lo Spazio ai tempi che il widget scrive in data-attesi (performance.now() della pagina,
// ricavato dal clock audio), così l'esito è deterministico: la valutazione toglie lo scarto costante, e
// il ritardo della tastiera finta resta molto sotto la tolleranza facile (150 ms).
import { expect, test, type Page } from '@playwright/test';
import { batti, spiaColpi } from './battere';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(90_000); // la prima visita al server di sviluppo compila al volo

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
	// in lettura tocca subito al bambino: il conteggio (una battuta di clic) è il suo «pronti, via»
	const turno = w.getByRole('list', { name: 'A chi tocca' }).locator('[aria-current="step"]');
	await expect(turno).toHaveText('Batti');
	await expect(tasto).not.toHaveClass(/attesa/);
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
	// il tasto aspetta, tratteggiato, senza perdere contrasto (axe anche durante il turno, non solo alla fine)
	await expect(w.getByRole('button', { name: 'Batti qui' })).toHaveClass(/attesa/);
	expect(await violazioniGravi(page)).toEqual([]);
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

	// due battiti in più dentro la minima: il consiglio li conta
	await w.getByRole('button', { name: 'Riprova' }).click();
	await batti(page, w, { extra: [2.5, 3] });
	await expect(w.getByRole('status')).toHaveText(
		'Hai già battuto 4 note su 4 al momento giusto. Ci sono 2 battiti in più: batti una volta sola per ogni nota.',
		{ timeout: 10_000 }
	);
});

test('battuto di reazione, dopo ogni clic: il ritmo è giusto, ma il consiglio dice di battere insieme', async ({
	page
}) => {
	await apriVetrina(page);
	const w = widget(page, 'batti-ritmo-lettura');
	await w.getByRole('button', { name: 'Leggi e batti' }).click();
	// 'ta ti-ti ta-a', ogni nota 330 ms dopo il suo clic (0,4 battiti a 72 BPM): il tempo di reazione
	const dopo = (0.33 * 72) / 60;
	await batti(page, w, { salta: [0, 1, 2, 3], extra: [0, 1, 1.5, 2].map((b) => b + dopo) });
	await expect(w.getByRole('status')).toHaveText(
		'Il ritmo è giusto! Però ogni battito arriva un po’ dopo il clic: batti proprio insieme a lui, senza aspettarlo.',
		{ timeout: 10_000 }
	);
	await expect(esiti(page, 'batti-ritmo-lettura')).toHaveText([
		'corretto: true, item: ta ti ti ta-a'
	]);
});

test.describe('su un telefono con il tocco', () => {
	test.use({ hasTouch: true, viewport: { width: 360, height: 640 } });

	test('due dita insieme sul tasto battono una volta sola', async ({ page }) => {
		await apriVetrina(page);
		const w = widget(page, 'batti-ritmo-lettura');
		await w.getByRole('button', { name: 'Leggi e batti' }).click();
		const tasto = w.getByRole('button', { name: 'Batti qui' });
		await expect(tasto).toBeVisible();
		const b = (await tasto.boundingBox())!;
		const y = b.y + b.height / 2;
		const dita = [-15, 15].map((dx, id) => ({ x: b.x + b.width / 2 + dx, y, id }));
		const cdp = await page.context().newCDPSession(page);
		const pointerdown = await page.evaluateHandle(() => {
			const conta = { n: 0 };
			addEventListener('pointerdown', () => conta.n++, true);
			return conta;
		});
		await batti(page, w, {
			premi: async () => {
				await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: dita });
				await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
			}
		});
		await expect(w.getByRole('status')).toHaveText(
			'Ce l’hai fatta! Ogni battito è arrivato al momento giusto.',
			{ timeout: 10_000 }
		);
		expect(await pointerdown.evaluate((c) => c.n)).toBe(8); // due dita per nota, davvero
	});
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

type ConMicrofono = { __ctx: AudioContext; __tracce: MediaStreamTrack[]; __rifiuta: boolean };

test('la pagina si nasconde mentre si aspetta il microfono: niente turno nascosto, si riparte da capo', async ({
	page
}) => {
	// un microfono che risponde dopo un secondo (il permesso), dal contesto audio della pagina stessa
	await page.addInitScript(() => {
		const w = window as unknown as ConMicrofono;
		w.__tracce = [];
		const Contesto = window.AudioContext;
		window.AudioContext = class extends Contesto {
			constructor(...a: ConstructorParameters<typeof AudioContext>) {
				super(...a);
				w.__ctx = this;
			}
		};
		navigator.mediaDevices.getUserMedia = () =>
			new Promise((ok, ko) =>
				setTimeout(() => {
					if (w.__rifiuta) return ko(new DOMException('chiuso', 'NotAllowedError'));
					const d = w.__ctx.createMediaStreamDestination();
					w.__tracce.push(...d.stream.getTracks());
					ok(d.stream);
				}, 1000)
			);
	});
	await apriVetrina(page);
	const w = widget(page, 'batti-ritmo-lettura');
	const pagina = (stato: 'hidden' | 'visible') =>
		page.evaluate((s) => {
			Object.defineProperty(document, 'visibilityState', { value: s, configurable: true });
			document.dispatchEvent(new Event('visibilitychange'));
		}, stato);
	// il permesso dato e quello negato (passando a un'altra app con la richiesta aperta)
	for (const rifiuta of [false, true]) {
		await page.evaluate((r) => ((window as unknown as ConMicrofono).__rifiuta = r), rifiuta);
		await w.getByRole('radio', { name: 'Batto le mani' }).check();
		await w.getByRole('button', { name: 'Leggi e batti' }).click();
		await pagina('hidden');
		await page.waitForTimeout(1500); // la risposta arriva a pagina nascosta
		await expect(w.getByRole('list', { name: 'A chi tocca' })).toHaveCount(0);
		const accese = await page.evaluate(
			() =>
				(window as unknown as ConMicrofono).__tracce.filter((t) => t.readyState === 'live').length
		);
		expect(accese, `rifiuta: ${rifiuta}`).toBe(0);
		await pagina('visible');
		await expect(w.getByRole('button', { name: 'Leggi e batti' })).toBeVisible();
		await expect(w.getByRole('radio', { name: 'Batto le mani' })).toBeChecked(); // la scelta resta
	}
	await expect(esiti(page, 'batti-ritmo-lettura')).toHaveText(['Nessun esito per ora.']);
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

type ConLatenza = { __ctx?: AudioContext; __legnetto: number[]; __accese: number[] };

test('con le cuffie Bluetooth la nota si evidenzia quando si sente, non quando parte', async ({
	page
}) => {
	// 250 ms di latenza d'uscita dichiarata, senza getOutputTimestamp: si sente a currentTime − 0,25
	await page.addInitScript(() => {
		const w = window as unknown as ConLatenza;
		w.__legnetto = [];
		w.__accese = [];
		Object.defineProperty(AudioContext.prototype, 'outputLatency', { get: () => 0.25 });
		Object.defineProperty(AudioContext.prototype, 'getOutputTimestamp', { value: undefined });
		const Contesto = window.AudioContext;
		window.AudioContext = class extends Contesto {
			constructor(...a: ConstructorParameters<typeof AudioContext>) {
				super(...a);
				w.__ctx = this;
			}
		};
		const start = OscillatorNode.prototype.start;
		OscillatorNode.prototype.start = function (this: OscillatorNode, quando = 0) {
			if (Math.round(69 + 12 * Math.log2(this.frequency.value / 440)) === 84) {
				w.__legnetto.push(quando);
			}
			return start.call(this, quando);
		};
		// quando una voce del rigo diventa «evidenziata», nel tempo sentito
		let prima = -1;
		new MutationObserver(() => {
			const voci = [...document.querySelectorAll('[data-sonda] li')];
			const i = voci.findIndex((v) => v.textContent?.includes('evidenziata'));
			if (i >= 0 && i !== prima) w.__accese.push(w.__ctx!.currentTime - 0.25);
			prima = i;
		}).observe(document, { subtree: true, childList: true, characterData: true });
	});
	await apriVetrina(page);
	const w = widget(page, 'ascolta-ritmo');
	const rigo = w.getByRole('group', { name: 'Il ritmo da ascoltare' });
	await rigo.evaluate((el) => el.setAttribute('data-sonda', ''));
	await w.getByRole('button', { name: 'Ascolta', exact: true }).click();
	await expect(w.getByRole('button', { name: 'Avanti' })).toBeVisible({ timeout: 10_000 });
	const { legnetto, accese } = await page.evaluate(() => {
		const { __legnetto, __accese } = window as unknown as ConLatenza;
		return { legnetto: __legnetto, accese: __accese };
	});
	expect(accese).toHaveLength(4); // 'ta ti-ti ta-a'
	accese.forEach((t, i) => {
		expect(t - legnetto[i], `nota ${i}: accesa − sentita (s)`).toBeGreaterThanOrEqual(-0.03);
		expect(t - legnetto[i], `nota ${i}: accesa − sentita (s)`).toBeLessThanOrEqual(0.2);
	});
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
	// non si è sentito niente: si può scegliere un altro modo di battere prima di riprovare
	await expect(w.getByRole('radio', { name: 'Batto le mani' })).toBeVisible();

	// 'ta ti-ti ta sst': il sito suona attacco e ritmo (4 + 4 clic, 4 legnetti: la pausa tace), poi
	// l'attacco del bambino e i clic piano sotto i suoi battiti (4 + 4); un clic ogni battito, senza buchi
	const tutti = await colpi();
	expect(tutti.filter((c) => c.midi === 84)).toHaveLength(4);
	const clic = tutti.filter((c) => c.midi !== 84);
	expect(clic).toHaveLength(16);
	expect(clic.filter((c) => c.midi === 103)).toHaveLength(4); // il primo di ogni battuta
	intervalli(clic.map((c) => c.t)).forEach((x) => expect(x).toBeCloseTo(60 / 72, 3));
});
