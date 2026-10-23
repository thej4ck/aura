import { existsSync, readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

/**
 * Tutte le pagine prerenderizzate (build/**\/*.html tranne la 404), così le pagine generate dai contenuti
 * (moduli, attività) entrano nei controlli da sole. Si legge alla raccolta dei test, per farne un test
 * per pagina che Playwright esegue in parallelo: la build va fatta prima (`npm run test:e2e` la fa).
 */
function pagine(): string[] {
	if (!existsSync('build'))
		throw new Error('Manca build/: lancia `npm run test:e2e`, che fa la build');
	return readdirSync('build', { recursive: true, encoding: 'utf8' })
		.map((f) => f.replaceAll('\\', '/'))
		.filter((f) => f.endsWith('.html') && f !== '404.html')
		.map((f) => '/' + f.replace(/(^|\/)index\.html$/, '').replace(/\.html$/, ''))
		.sort();
}

const elenco = pagine();

test('la build contiene le pagine principali', () => {
	expect(elenco).toEqual(expect.arrayContaining(['/', '/moduli', '/genitori', '/informazioni']));
});

for (const colorScheme of ['light', 'dark'] as const) {
	// /genitori mostra una scheda alla volta: anche le altre quattro
	for (const percorso of [
		...elenco,
		...['impostazioni', 'backup', 'consigli', 'privacy'].map((s) => `/genitori#${s}`)
	]) {
		test(`tema ${colorScheme} ${percorso}: niente terzi, errori o violazioni a11y gravi`, async ({
			page,
			baseURL
		}) => {
			await page.emulateMedia({ colorScheme });
			const { esterne, errori } = sorveglia(page, baseURL!);
			await page.goto(percorso);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			// il profilo si carica da IndexedDB: l'avatar compare nell'header
			await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible();
			await page.waitForLoadState('networkidle');

			expect(esterne).toEqual([]);
			expect(errori).toEqual([]);
			expect(await violazioniGravi(page)).toEqual([]);
		});
	}
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

test('crediti: il link alla licenza apre il testo, non una pagina dell’app', async ({ page }) => {
	await page.goto('/genitori#crediti');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	await page.getByRole('link', { name: 'Leggi la licenza di Bravura' }).click();
	await expect(page).toHaveURL(/\/licenze\/bravura-ofl\.txt$/);
	await expect(page.getByText('SIL OPEN FONT LICENSE Version 1.1')).toBeVisible();
});
