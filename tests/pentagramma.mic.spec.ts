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

test('«Leggi e canta»: si sente solo il Do di partenza; ci si ferma quando si vuole', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await page.goto('/musica/pentagramma/leggi-e-canta');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	const turno = page.getByRole('list', { name: 'A chi tocca' }).locator('[aria-current="step"]');

	await page.getByRole('button', { name: 'Inizia' }).click();
	await page.getByRole('button', { name: 'Avanti' }).click();

	// con l'aiuto: suona tutte le note; mentre il microfono ascolta ci si può fermare
	await expect(page.getByRole('heading', { name: 'Prima con l’aiuto' })).toBeVisible();
	await page.getByRole('button', { name: 'Ascolta e canta' }).click();
	await expect(turno).toHaveText('Ascolta');
	await page.getByRole('button', { name: 'Basta così, vado avanti' }).click();

	// da leggere: il sito suona solo il Do, e il misuratore dice il nome solo di quello
	await expect(page.getByRole('heading', { name: 'Ora leggile tu' })).toBeVisible();
	await expect(page.getByText('Melodia 1 di 1')).toBeVisible();
	await page.getByRole('button', { name: 'Leggi e canta' }).click();
	await expect(turno).toHaveText('Ascolta');
	await expect(turno).toHaveText('Canta', { timeout: 10_000 });
	await expect(page.getByText('Nota da cantare: Do')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Ascolta il Do' })).toBeVisible();
	expect(await axe(page)).toEqual([]);
	await page.getByRole('button', { name: 'Basta così', exact: true }).click();

	// il gioco: melodie da leggere, e «Basta così» sempre lì
	await expect(page.getByText('Melodia 1 di 4')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Leggi e canta' })).toBeVisible();
	expect(await axe(page)).toEqual([]);
	await page.getByRole('button', { name: 'Basta così', exact: true }).click();

	// senza nessuna risposta il gioco non si completa: aspetta, senza stelle
	await expect(page.getByRole('heading', { name: 'Per oggi va bene così' })).toBeFocused();
	await expect(page.getByRole('img', { name: /Stelle/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Torna al gioco' })).toBeVisible();

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});
