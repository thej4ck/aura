// La barra della scheda (build di produzione): «Indietro» e «Avanti» restano sullo schermo anche quando
// la scheda è più alta, senza bisogno di scorrere (un bambino di 8 anni non lo intuisce).
import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1024, height: 600 } }); // tablet in orizzontale: lo schermo più basso

test('Indietro e Avanti sempre visibili, anche con la scheda più alta dello schermo', async ({
	page
}) => {
	await page.goto('/musica/pentagramma/linee-e-spazi');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	await page.getByRole('button', { name: 'Inizia' }).click();
	await expect(page.getByText(/^Scheda 1 di \d+$/)).toBeVisible();
	await page.getByRole('button', { name: 'Avanti' }).click();
	await expect(page.getByText(/^Scheda 2 di \d+$/)).toBeVisible();

	const indietro = page.getByRole('button', { name: 'Indietro' });
	const avanti = page.getByRole('button', { name: 'Avanti' });
	expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
	await expect(indietro).toBeInViewport({ ratio: 1 });
	await expect(avanti).toBeInViewport({ ratio: 1 });

	// e restano lì scorrendo
	await page.mouse.wheel(0, 300);
	await expect(indietro).toBeInViewport({ ratio: 1 });
	await indietro.click();
	await expect(page.getByText(/^Scheda 1 di \d+$/)).toBeVisible();
});
