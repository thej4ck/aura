import { readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

/**
 * Tutte le pagine prerenderizzate (build/**\/*.html tranne la 404), così le pagine generate dai contenuti
 * (moduli, attività) entrano nei controlli da sole. Si legge dentro il test: la build la fa il webServer.
 */
function pagine(): string[] {
	return readdirSync('build', { recursive: true, encoding: 'utf8' })
		.map((f) => f.replaceAll('\\', '/'))
		.filter((f) => f.endsWith('.html') && f !== '404.html')
		.map((f) => '/' + f.replace(/(^|\/)index\.html$/, '').replace(/\.html$/, ''))
		.sort();
}

for (const colorScheme of ['light', 'dark'] as const) {
	test(`tema ${colorScheme}: ogni pagina senza richieste a terzi, errori o violazioni a11y gravi`, async ({
		page,
		baseURL
	}) => {
		const elenco = pagine();
		expect(elenco).toEqual(expect.arrayContaining(['/', '/moduli', '/genitori']));
		test.setTimeout(30_000 + elenco.length * 10_000);
		await page.emulateMedia({ colorScheme });
		const { esterne, errori } = sorveglia(page, baseURL!);

		for (const percorso of elenco) {
			await test.step(percorso, async () => {
				esterne.length = errori.length = 0;
				await page.goto(percorso);
				await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
				// il profilo si carica da IndexedDB: l'avatar compare nell'header
				await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible();
				await page.waitForLoadState('networkidle');

				expect(esterne, percorso).toEqual([]);
				expect(errori, percorso).toEqual([]);
				expect(await violazioniGravi(page), percorso).toEqual([]);
			});
		}
	});
}

test('/dev in produzione non esiste: pagina 404 amichevole, accessibile e senza terzi', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	const risposta = await page.goto('/dev');
	expect(risposta?.status()).toBe(404);
	await expect(
		page.getByRole('heading', { level: 1, name: "Questa pagina non c'è" })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Torna alla home' })).toBeVisible();
	await page.waitForLoadState('networkidle');

	expect(esterne).toEqual([]);
	// ammesso solo il 404 del documento stesso, che Chrome riporta in console
	const documento = `Failed to load resource: the server responded with a status of 404 (Not Found) @ ${risposta?.url()}`;
	expect(errori.filter((e) => e !== documento)).toEqual([]);
	expect(await violazioniGravi(page)).toEqual([]);
});
