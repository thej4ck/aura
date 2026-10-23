// Widget musicali della vetrina /dev con il microfono finto (un La4, vedi setup-mic.ts): solo server di sviluppo.
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

async function apriVetrina(page: Page) {
	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
}

const widget = (page: Page, nome: string) => page.getByRole('article', { name: nome, exact: true });
const esiti = (page: Page, nome: string) =>
	widget(page, nome)
		.getByRole('list', { name: `Esiti ${nome}` })
		.getByRole('listitem');

test('canta-nota: il La4 tenuto arriva all’esito giusto, poi il microfono si spegne', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	const microfono = await spiaMicrofono(page);
	await apriVetrina(page);
	const w = widget(page, 'canta-nota');

	// prima di aprire il microfono si spiega a cosa serve
	await expect(
		w.getByText('Il microfono serve solo per ascoltarti. Niente viene registrato.')
	).toBeVisible();
	await w.getByRole('button', { name: 'Ascolta e canta' }).click();

	// a turni: prima suona il sito, poi si canta
	const turno = w.getByRole('list', { name: 'A chi tocca' }).locator('[aria-current="step"]');
	await expect(turno).toHaveText('Ascolta');
	await expect(turno).toHaveText('Canta', { timeout: 10_000 });
	await expect(w.getByRole('img', { name: /^Nota tenuta: \d+ per cento$/ })).toBeVisible();

	await expect(w.getByRole('status')).toHaveText('Ce l’hai fatta! Hai tenuto la nota.', {
		timeout: 20_000
	});
	await expect(esiti(page, 'canta-nota')).toHaveText(['corretto: true, item: A4']);
	expect(await microfono()).toEqual({ aperti: 1, accesi: 0 });

	await w.getByRole('button', { name: 'Avanti' }).click();
	await expect(esiti(page, 'canta-nota')).toHaveText(['corretto: true, item: A4', 'fine (Avanti)']);

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
	expect(await violazioniGravi(page)).toEqual([]);
});

test('canta-nota: lasciando la scheda mentre ascolta, il microfono si spegne', async ({ page }) => {
	const microfono = await spiaMicrofono(page);
	await apriVetrina(page);
	const w = widget(page, 'canta-nota');
	await w.getByRole('button', { name: 'Ascolta e canta' }).click();
	await expect(w.getByRole('list', { name: 'A chi tocca' })).toBeVisible();
	expect(await microfono()).toEqual({ aperti: 1, accesi: 1 });

	// «Ricomincia» smonta il widget, come il motore quando si cambia scheda
	await w.getByRole('button', { name: 'Ricomincia' }).click();
	await expect(w.getByRole('button', { name: 'Ascolta e canta' })).toBeVisible();
	expect(await microfono()).toEqual({ aperti: 1, accesi: 0 });
	await expect(esiti(page, 'canta-nota')).toHaveText(['Nessun esito per ora.']);
});

test('staff-tocca da tastiera: feedback che aiuta, esito al primo tentativo', async ({ page }) => {
	await apriVetrina(page);
	const w = widget(page, 'staff-tocca');
	const rigo = w.getByRole('group', { name: 'Tocca il Sol' });
	const posizioni = rigo.getByRole('group', { name: 'Scegli una linea o uno spazio' });
	const feedback = w.getByRole('status');

	await expect(w.getByText('Tocca il Sol', { exact: true })).toBeVisible();
	await posizioni.getByRole('button', { name: 'terza linea', exact: true }).focus();
	await page.keyboard.press('Enter');
	// dove si è toccato, che nota c'è lì e verso dove andare; ai lettori di schermo il rigo dice solo la posizione
	await expect(feedback).toHaveText(
		'Hai toccato la terza linea: lì c’è il Si. Il Sol è più in basso.'
	);
	await expect(rigo.getByRole('listitem')).toHaveText('Nota 1 di 1: terza linea, evidenziata');
	await expect(esiti(page, 'staff-tocca')).toHaveText(['corretto: false, item: G4']);

	// dal secondo tentativo l'aiuto dice anche dove sta la nota
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('Enter');
	await expect(feedback).toHaveText(
		'Hai toccato il terzo spazio: lì c’è il Do. Il Sol è più in basso. Il Sol sta sulla seconda linea.'
	);

	for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
	await expect(posizioni.getByRole('button', { name: 'seconda linea' })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(feedback).toHaveText('Sì, è proprio qui! Il Sol sta sulla seconda linea.');
	// conta solo il primo tentativo
	await expect(esiti(page, 'staff-tocca')).toHaveText(['corretto: false, item: G4']);

	await w.getByRole('button', { name: 'Avanti' }).click();
	await expect(esiti(page, 'staff-tocca')).toHaveText([
		'corretto: false, item: G4',
		'fine (Avanti)'
	]);
});

test('ascolta: fermato subito non vale come ascolto; «Avanti» arriva dopo un ascolto completo', async ({
	page
}) => {
	await apriVetrina(page);
	const w = widget(page, 'ascolta');
	await w.getByRole('button', { name: 'Ascolta', exact: true }).click();
	await w.getByRole('button', { name: 'Ferma' }).click();
	await expect(w.getByRole('button', { name: 'Ascolta', exact: true })).toBeVisible();
	await page.waitForTimeout(500);
	await expect(w.getByRole('button', { name: 'Avanti' })).toHaveCount(0);

	await w.getByRole('button', { name: 'Ascolta', exact: true }).click();
	await expect(w.getByRole('button', { name: 'Avanti' })).toBeVisible({ timeout: 10_000 });
	await expect(w.getByRole('button', { name: 'Ascolta di nuovo' })).toBeVisible();
});

test('canta-nota: con la scheda nascosta o la pagina lasciata il microfono si spegne, e si ricomincia', async ({
	page
}) => {
	const microfono = await spiaMicrofono(page);
	await apriVetrina(page);
	const w = widget(page, 'canta-nota');
	const visibilita = (stato: 'hidden' | 'visible') =>
		page.evaluate((s) => {
			Object.defineProperty(document, 'visibilityState', { value: s, configurable: true });
			document.dispatchEvent(new Event('visibilitychange'));
		}, stato);

	await w.getByRole('button', { name: 'Ascolta e canta' }).click();
	await expect(w.getByRole('list', { name: 'A chi tocca' })).toBeVisible();
	expect(await microfono()).toEqual({ aperti: 1, accesi: 1 });
	await visibilita('hidden'); // qui rAF si fermerebbe: niente frame, niente fine della prova
	await expect(w.getByRole('button', { name: 'Ascolta e canta' })).toBeVisible();
	expect(await microfono()).toEqual({ aperti: 1, accesi: 0 });
	await visibilita('visible');

	await w.getByRole('button', { name: 'Ascolta e canta' }).click();
	await expect(w.getByRole('list', { name: 'A chi tocca' })).toBeVisible();
	// verso la bfcache: al ritorno la scheda non resta bloccata in ascolto
	await page.evaluate(() =>
		dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
	);
	await expect(w.getByRole('button', { name: 'Ascolta e canta' })).toBeVisible();
	expect(await microfono()).toEqual({ aperti: 2, accesi: 0 });
	await expect(esiti(page, 'canta-nota')).toHaveText(['Nessun esito per ora.']);
});
