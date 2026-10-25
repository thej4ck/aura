// Il turno ritmico (batti-ritmo) con le mani al microfono finto (battiti di mani in una stanza, poi una
// voce che dice le sillabe senza battere: vedi setup-mic.ts), nella vetrina /dev: solo server di
// sviluppo. I battiti del WAV non seguono il ritmo da battere, quindi l'esito può andare in tutti e due i
// modi: qui contano il flusso (promessa, turni, battito visivo, esito, segni) e il microfono che si spegne.
import { expect, test, type Page } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(90_000); // la prima visita al server di sviluppo compila al volo

type ConFlussi = { __flussi: MediaStream[] };

/** Tiene da parte i flussi del microfono aperti dalla pagina: per controllare che si spengano. */
async function spiaMicrofono(page: Page) {
	await page.addInitScript(() => {
		const flussi: MediaStream[] = [];
		(window as unknown as ConFlussi).__flussi = flussi;
		const apri = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
		navigator.mediaDevices.getUserMedia = async (vincoli) => {
			const flusso = await apri(vincoli);
			flussi.push(flusso);
			return flusso;
		};
	});
	return () =>
		page.evaluate(() => {
			const flussi = (window as unknown as ConFlussi).__flussi;
			const accese = flussi.flatMap((f) => f.getTracks()).filter((t) => t.readyState === 'live');
			return { aperti: flussi.length, accesi: accese.length };
		});
}

type Spia = { __clic: number };

/** Conta gli OscillatorNode avviati che non sono il legnetto (Do6): i clic del metronomo. */
async function spiaClic(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as Spia;
		w.__clic = 0;
		const start = OscillatorNode.prototype.start;
		OscillatorNode.prototype.start = function (this: OscillatorNode, quando = 0) {
			if (Math.round(69 + 12 * Math.log2(this.frequency.value / 440)) !== 84) w.__clic++;
			return start.call(this, quando);
		};
	});
	return () => page.evaluate(() => (window as unknown as Spia).__clic);
}

async function apri(page: Page) {
	const microfono = await spiaMicrofono(page);
	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	const w = page.getByRole('article', { name: 'batti-ritmo', exact: true });
	await w.getByRole('radio', { name: 'Batto le mani' }).check();
	const esiti = w.getByRole('list', { name: 'Esiti batti-ritmo' }).getByRole('listitem');
	const turno = w.getByRole('list', { name: 'A chi tocca' }).locator('[aria-current="step"]');
	return { w, esiti, turno, microfono };
}

test('con le mani: la promessa, i turni, il battito visivo, l’esito, e il microfono si spegne', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	const clic = await spiaClic(page);
	const { w, esiti, turno, microfono } = await apri(page);
	await expect(
		w.getByText('Il microfono serve solo per sentire le tue mani. Niente viene registrato.')
	).toBeVisible();
	await w.getByRole('button', { name: 'Ascolta e batti' }).click();

	// prima suona il sito (il microfono è aperto ma non sente), poi si battono le mani: niente tasto
	await expect(turno).toHaveText('Ascolta');
	expect(await microfono()).toEqual({ aperti: 1, accesi: 1 });
	await expect(w.getByRole('button', { name: 'Batti qui' })).toHaveCount(0);
	await expect(w.locator('.pulsazione')).toHaveAttribute('data-battito', /\d/);
	await expect(turno).toHaveText('Batti', { timeout: 15_000 });

	await expect(esiti).toHaveText([/^corretto: (true|false), item: ta ti ti ta sst$/], {
		timeout: 15_000
	});
	await expect(w.getByRole('status')).not.toBeEmpty();
	// un segno per ogni nota da battere (giusta, presto, tardi o mancata), più quelli in più
	const rigo = w.getByRole('group', { name: 'Il ritmo da battere' });
	expect(await rigo.locator('svg .battito').count()).toBeGreaterThanOrEqual(4);
	expect(await microfono()).toEqual({ aperti: 1, accesi: 0 });
	// il sito: attacco e ritmo con i clic (4 + 4); il bambino: solo l'attacco (4), poi l'altoparlante tace
	expect(await clic()).toBe(12);
	await expect(w.getByRole('radio', { name: 'Batto le mani' })).toHaveCount(0); // la scelta è fatta

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
	expect(await violazioniGravi(page)).toEqual([]);
});

test('lasciando la scheda o nascondendo la pagina durante il turno, il microfono si spegne', async ({
	page
}) => {
	const { w, esiti, turno, microfono } = await apri(page);
	await w.getByRole('button', { name: 'Ascolta e batti' }).click();
	await expect(turno).toBeVisible();
	expect(await microfono()).toEqual({ aperti: 1, accesi: 1 });

	// la pagina nascosta: si torna all'inizio, senza esito
	await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await expect(w.getByRole('button', { name: 'Ascolta e batti' })).toBeVisible();
	expect(await microfono()).toEqual({ aperti: 1, accesi: 0 });
	await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
		document.dispatchEvent(new Event('visibilitychange'));
	});

	// «Ricomincia» smonta il widget, come il motore quando si cambia scheda
	await w.getByRole('button', { name: 'Ascolta e batti' }).click();
	await expect(turno).toBeVisible();
	expect(await microfono()).toEqual({ aperti: 2, accesi: 1 });
	await w.getByRole('button', { name: 'Ricomincia' }).click();
	await expect(w.getByRole('button', { name: 'Ascolta e batti' })).toBeVisible();
	expect(await microfono()).toEqual({ aperti: 2, accesi: 0 });
	await expect(esiti).toHaveText(['Nessun esito per ora.']);
});
