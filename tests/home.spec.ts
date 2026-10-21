import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('la home si carica senza richieste a terzi, errori o violazioni a11y gravi', async ({
	page,
	baseURL
}) => {
	const origine = new URL(baseURL!).origin;
	const esterne: string[] = [];
	const errori: string[] = [];
	page.on('request', (r) => {
		const url = new URL(r.url());
		if (url.protocol !== 'data:' && url.protocol !== 'blob:' && url.origin !== origine) {
			esterne.push(r.url());
		}
	});
	// cattura anche le violazioni della CSP, che il browser riporta come errori in console
	page.on('console', (msg) => {
		if (msg.type() === 'error') errori.push(msg.text());
	});
	page.on('pageerror', (e) => errori.push(e.message));

	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1, name: 'Kindergarden' })).toBeVisible();
	await page.waitForLoadState('networkidle');

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);

	const { violations } = await new AxeBuilder({ page }).analyze();
	const gravi = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
	expect(gravi.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
