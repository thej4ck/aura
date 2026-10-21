import { expect, test } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

const PAGINE = [
	{ percorso: '/', titolo: 'Kindergarden' },
	{ percorso: '/moduli', titolo: 'Moduli' },
	{ percorso: '/genitori', titolo: 'Per i genitori' }
];

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`tema ${colorScheme}`, () => {
		test.use({ colorScheme });

		for (const { percorso, titolo } of PAGINE) {
			test(`${percorso} si carica senza richieste a terzi, errori o violazioni a11y gravi`, async ({
				page,
				baseURL
			}) => {
				const { esterne, errori } = sorveglia(page, baseURL!);

				await page.goto(percorso);
				await expect(page.getByRole('heading', { level: 1, name: titolo })).toBeVisible();
				// il profilo si carica da IndexedDB: l'avatar compare nell'header
				await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible();
				await page.waitForLoadState('networkidle');

				expect(esterne).toEqual([]);
				expect(errori).toEqual([]);
				expect(await violazioniGravi(page)).toEqual([]);
			});
		}
	});
}

test('/dev in produzione non esiste: pagina 404 amichevole', async ({ page }) => {
	const risposta = await page.goto('/dev');
	expect(risposta?.status()).toBe(404);
	await expect(
		page.getByRole('heading', { level: 1, name: "Questa pagina non c'è" })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Torna alla home' })).toBeVisible();
});
