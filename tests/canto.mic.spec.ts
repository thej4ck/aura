// Giochi del modulo Canto con il microfono finto (un La4, vedi setup-mic.ts): solo server di sviluppo,
// dove si vedono le bozze.
import { expect, test, type Page } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(120_000); // la prima visita al server di sviluppo compila al volo

type ConFlussi = { __flussi: MediaStream[] };

/** Tiene da parte i flussi del microfono aperti dalla pagina, per controllare che si spengano. */
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
		page.evaluate(
			() =>
				(window as unknown as ConFlussi).__flussi
					.flatMap((f) => f.getTracks())
					.filter((t) => t.readyState === 'live').length
		);
}

/** il feedback del widget (fuori da <main> c'è anche quello della pausa gentile) */
const feedback = (page: Page) => page.getByRole('main').getByRole('status');

async function apri(page: Page, attivita: string, titolo: string) {
	await page.goto(`/musica/canto/${attivita}`);
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	await expect(page.getByRole('heading', { level: 1, name: titolo })).toBeVisible();
	await page.getByRole('button', { name: 'Inizia' }).click();
}

test('tieni-la-nota: il La4 tenuto arriva all’esito giusto e la verifica è superata', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	const accesi = await spiaMicrofono(page);
	// seed fisso: la serie comincia dal La4 (lo controlla anche sequenza.test.ts)
	await page.addInitScript(() => (Math.random = () => 0.3));
	await apri(page, 'tieni-la-nota', 'Tieni la nota');
	const avanti = page.getByRole('button', { name: 'Avanti' });

	await expect(page.getByRole('heading', { name: 'Come si gioca' })).toBeFocused();
	await avanti.click();

	// Proviamo insieme: canta-nota sul La
	await page.getByRole('button', { name: 'Ascolta e canta' }).click();
	await expect(feedback(page)).toHaveText('Ce l’hai fatta! Hai tenuto la nota.', {
		timeout: 20_000
	});
	await avanti.click();

	// Prova tu: il gioco, con la prima nota della serie del seed
	await expect(page.getByText('Nota 1 di 3', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Basta così' })).toBeVisible();
	await page.getByRole('button', { name: 'Ascolta e canta' }).click();
	const turno = page.getByRole('list', { name: 'A chi tocca' }).locator('[aria-current="step"]');
	await expect(turno).toHaveText('Canta', { timeout: 10_000 });
	await expect(feedback(page)).toHaveText('Ce l’hai fatta! Hai tenuto la nota.', {
		timeout: 20_000
	});
	expect(await accesi()).toBe(0);
	expect(await violazioniGravi(page)).toEqual([]);

	// la nota dopo è un Fa: ci si ferma qui, le note non cantate non contano
	await avanti.click();
	await expect(page.getByText('Nota 2 di 3', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Basta così' }).click();

	await expect(page.getByRole('heading', { name: 'Attività completata' })).toBeFocused();
	await expect(page.getByRole('img', { name: 'Stelle: 2 su 3' })).toBeVisible();
	expect(await accesi()).toBe(0);
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});

test('estensione: la nota comoda fa da radice; «Basta così» ferma tutto e spegne il microfono', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	const accesi = await spiaMicrofono(page);
	await apri(page, 'estensione', 'Fin dove arriva la tua voce');
	const avanti = page.getByRole('button', { name: 'Avanti' });
	await avanti.click();
	await avanti.click();

	await expect(page.getByText('La voce non si forza mai', { exact: false })).toBeVisible();
	await page.getByRole('button', { name: 'Comincia' }).click();
	// il La4 del microfono finto è la nota comoda: primo arpeggio La-Do♯-Mi
	await expect(feedback(page)).toHaveText('La tua nota comoda è il La. Ascolta, poi canta.', {
		timeout: 15_000
	});
	await expect(page.getByRole('group', { name: /L’arpeggio da cantare/ })).toBeVisible();
	expect(await violazioniGravi(page)).toEqual([]);

	await page.getByRole('button', { name: 'Basta così' }).click();
	await expect(feedback(page)).toHaveText('Va bene così: ci fermiamo qui. Riproviamo quando vuoi.');
	expect(await accesi()).toBe(0);
	await expect(page.getByRole('button', { name: 'Ricomincia' })).toBeVisible();
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});
