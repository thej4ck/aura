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
	for (const percorso of ['/moduli', '/genitori', '/']) {
		await page.goto(percorso);
		await expect(page.locator('h1')).toBeVisible();
	}
	// una pagina che non esiste offline mostra la 404 dell'app, non l'errore del browser
	await page.goto('/non-esiste');
	await expect(page.locator('h1')).toBeVisible();
	await context.setOffline(false);

	expect(esterne).toEqual([]);
	expect(errori.filter((e) => !/Failed to load resource|net::ERR/.test(e))).toEqual([]);
});
