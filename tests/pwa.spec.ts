import { expect, test } from '@playwright/test';
import { sorveglia } from './sorveglianza';

test('il service worker si registra e una pagina già visitata si apre offline', async ({
	page,
	context,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await page.goto('/moduli');
	// il worker si installa e prende il controllo (skipWaiting + claim)
	await page.evaluate(() => navigator.serviceWorker.ready);
	await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

	const manifest = await page.request.get('/manifest.webmanifest');
	expect(manifest.ok()).toBe(true);
	expect(((await manifest.json()) as { lang: string }).lang).toBe('it');

	await context.setOffline(true);
	// anche con la query o con lo slash finale è la stessa pagina, non la 404
	for (const percorso of ['/moduli', '/genitori', '/', '/?da=home', '/moduli/']) {
		await page.goto(percorso);
		await expect(page.locator('h1'), percorso).toBeVisible();
		await expect(page.locator('h1'), percorso).not.toHaveText("Questa pagina non c'è");
	}
	// come online con Caddy, senza lo slash finale (i percorsi relativi della pagina restano giusti)
	await page.goto('/moduli/');
	await expect(page).toHaveURL(/\/moduli$/);
	// una pagina che non esiste offline mostra la 404 dell'app, non l'errore del browser
	await page.goto('/non-esiste');
	await expect(page.locator('h1')).toHaveText("Questa pagina non c'è");
	await context.setOffline(false);

	expect(esterne).toEqual([]);
	expect(errori.filter((e) => !/Failed to load resource|net::ERR/.test(e))).toEqual([]);
});

test('l’invito a installare arriva nella home e si ritrova in /genitori', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	// Chromium lo manda una volta sola, poco dopo il caricamento: qui lo si simula
	await page.evaluate(() =>
		dispatchEvent(
			Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
				prompt: async () => ({ outcome: 'dismissed' })
			})
		)
	);
	await page
		.getByRole('navigation', { name: 'Navigazione principale' })
		.getByRole('link', { name: 'Per i genitori' })
		.click();
	await expect(page.getByRole('heading', { name: "Installa l'app" })).toBeVisible();
	await expect(page.getByRole('button', { name: "Installa l'app" })).toBeVisible();
});
