// «Leggi e canta» con il microfono finto (un La4, vedi setup-mic.ts): solo server di sviluppo.
import { expect, test, type Page } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(120_000); // la prima visita al server di sviluppo compila al volo

/** axe ad animazioni finite: durante un ingresso i colori sono a metà strada */
async function axe(page: Page) {
	await page.waitForFunction(() =>
		document.getAnimations().every((a) => a.playState !== 'running')
	);
	return violazioniGravi(page);
}

test('«Leggi e canta»: la nota solo scritta non si suona prima; «Basta così» chiude', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await page.goto('/musica/pentagramma/leggi-e-canta');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	const stato = page.getByRole('main').getByRole('status');
	const turno = page.getByRole('list', { name: 'A chi tocca' }).locator('[aria-current="step"]');
	const avanti = page.getByRole('button', { name: 'Avanti' });

	await page.getByRole('button', { name: 'Inizia' }).click();
	await avanti.click();

	// con l'aiuto: prima suona il sito, poi si canta
	await expect(page.getByRole('heading', { name: 'Prima con l’aiuto' })).toBeVisible();
	await page.getByRole('button', { name: 'Ascolta e canta' }).click();
	await expect(turno).toHaveText('Ascolta');
	await expect(stato).toHaveText('Ce l’hai fatta! Hai tenuto la nota.', { timeout: 25_000 });
	await avanti.click();

	// solo scritta: si canta subito, e il misuratore non dice il nome della nota
	await expect(page.getByRole('heading', { name: 'Ora leggila tu' })).toBeVisible();
	await page.getByRole('button', { name: 'Leggi e canta' }).click();
	await expect(turno).toHaveText('Canta');
	await expect(
		page.getByRole('img', {
			name: /^Misuratore della voce\. La linea al centro è la nota da cantare/
		})
	).toBeVisible();
	await expect(page.getByText('Nota da cantare:')).toHaveCount(0);
	// «Ascolta» resta come aiuto (l'altro «Ascolta» è la lettura ad alta voce)
	await expect(
		page.locator('.azioni').getByRole('button', { name: 'Ascolta', exact: true })
	).toBeVisible();
	await expect(stato).toHaveText('Ce l’hai fatta! Hai tenuto la nota.', { timeout: 25_000 });
	expect(await axe(page)).toEqual([]);
	await avanti.click();

	// il gioco: una serie di note da leggere e cantare, e «Basta così» sempre lì
	await expect(page.getByText('Nota 1 di 5')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Leggi e canta' })).toBeVisible();
	expect(await axe(page)).toEqual([]);
	await page.getByRole('button', { name: 'Basta così' }).click();
	await expect(page.getByRole('heading', { name: 'Attività completata' })).toBeFocused();

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});
