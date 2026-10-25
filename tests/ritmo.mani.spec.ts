// Il turno ritmico (batti-ritmo) con le mani al microfono finto (battiti di mani in una stanza, poi una
// voce che dice le sillabe senza battere: vedi setup-mic.ts), nella vetrina /dev: solo server di
// sviluppo. I battiti del WAV non seguono il ritmo da battere, quindi l'esito può andare in tutti e due i
// modi: lì contano il flusso (promessa, turni, battito visivo, esito, segni) e il microfono che si spegne.
// In fondo, con un «microfono» che è il contesto audio del sito, battiti di mani veri agli istanti giusti
// arrivano fino alla valutazione, e si contano i segni per giudizio.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { campioniBattiMani } from '../scripts/genera-wav.mjs';
import { spiaMicrofono } from './battere';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(90_000); // la prima visita al server di sviluppo compila al volo

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

// --- Il microfono da capo a fondo: battiti di mani veri agli istanti giusti -------------------------

/** Un battito di mani in una stanza (scripts/genera-wav.mjs), a 48 kHz, con 10 ms di silenzio prima. */
const BATTITO_MANI = Array.from(
	campioniBattiMani({
		battiti: [{ t: 0.01, ampiezza: 0.3 }],
		secondi: 0.3,
		stanza: { rt60: 0.4, drrDb: 0, coda: 0.2 }
	})
);

type Anello = { __ctx: AudioContext; __microfono: MediaStreamAudioDestinationNode };

/**
 * Il «microfono» è un flusso del contesto audio del sito stesso: quello che ci si suona dentro lo sente
 * apriBattiMani, che non sa la differenza. Così i battiti arrivano quando si vuole, a tempo con il turno.
 */
async function anello(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as Anello;
		const Contesto = window.AudioContext;
		window.AudioContext = class extends Contesto {
			constructor(...a: ConstructorParameters<typeof AudioContext>) {
				super(...a);
				w.__ctx = this;
			}
		};
		navigator.mediaDevices.getUserMedia = async () => {
			w.__microfono = w.__ctx.createMediaStreamDestination();
			return w.__microfono.stream;
		};
	});
}

/**
 * Batte le mani nel «microfono» quando si sente ogni nota (data-attesi di TurnoRitmo), `ritardo` s dopo,
 * più i battiti `extra` (in battiti dalla prima nota).
 */
async function battiLeMani(
	page: Page,
	ambito: Locator,
	{ ritardo = 0, extra = [] }: { ritardo?: number; extra?: number[] } = {}
) {
	const palco = ambito.locator('[data-attesi]');
	await expect(palco).toHaveAttribute('data-attesi', /\d/, { timeout: 20_000 });
	const attesi: number[] = JSON.parse((await palco.getAttribute('data-attesi'))!);
	await page.evaluate(
		({ attesi, battito, ritardo, extra }) => {
			const { __ctx: c, __microfono } = window as unknown as Anello;
			// il clock audio sentito all'istante `ms` di performance.now()
			const ts = c.getOutputTimestamp();
			const quando = (ms: number) => ts.contextTime! + (ms - ts.performanceTime!) / 1000;
			const buffer = c.createBuffer(1, battito.length, 48_000);
			buffer.copyToChannel(Float32Array.from(battito), 0);
			const passo = attesi[1] - attesi[0];
			for (const ms of [...attesi, ...extra.map((b) => attesi[0] + b * passo)]) {
				const s = c.createBufferSource();
				s.buffer = buffer;
				s.connect(__microfono);
				s.start(quando(ms) + ritardo - 0.01);
			}
		},
		{ attesi, battito: BATTITO_MANI, ritardo, extra }
	);
}

test('i battiti di mani arrivano alla valutazione: a tempo la prova riesce', async ({ page }) => {
	await anello(page);
	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible();
	const w = page.getByRole('article', { name: 'batti-ritmo-lettura', exact: true });
	await w.getByRole('radio', { name: 'Batto le mani' }).check();
	await w.getByRole('button', { name: 'Leggi e batti' }).click();
	await battiLeMani(page, w); // 'ta ti-ti ta-a'
	await expect(w.getByRole('status')).toHaveText(
		'Ce l’hai fatta! Ogni battito è arrivato al momento giusto.',
		{ timeout: 15_000 }
	);
	const rigo = w.getByRole('group', { name: 'Il ritmo da battere' });
	await expect(rigo.locator('svg .battito.giusto')).toHaveCount(4);
	await expect(rigo.locator('svg .battito:not(.giusto)')).toHaveCount(0);
	await expect(
		w.getByRole('list', { name: 'Esiti batti-ritmo-lettura' }).getByRole('listitem')
	).toHaveText(['corretto: true, item: ta ti ti ta-a']);
});

test('i battiti di mani arrivano alla valutazione: in ritardo costante si tolgono, sulla pausa no', async ({
	page
}) => {
	await anello(page);
	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible();
	const w = page.getByRole('article', { name: 'batti-ritmo', exact: true });
	await w.getByRole('radio', { name: 'Batto le mani' }).check();
	await w.getByRole('button', { name: 'Ascolta e batti' }).click();
	// 'ta ti-ti ta sst': 150 ms dopo ogni nota (cuffie Bluetooth), e un battito sulla pausa
	await battiLeMani(page, w, { ritardo: 0.15, extra: [3] });
	await expect(w.getByRole('status')).toHaveText(
		'Hai già battuto 4 note su 4 al momento giusto. Nella pausa (SST) le mani riposano: lì non si batte.',
		{ timeout: 15_000 }
	);
	const rigo = w.getByRole('group', { name: 'Il ritmo da battere' });
	await expect(rigo.locator('svg .battito.giusto')).toHaveCount(4);
	await expect(rigo.locator('svg .battito.in-piu')).toHaveCount(1);
	await expect(rigo).toContainText('Un battito in più, uno nella pausa');
});
