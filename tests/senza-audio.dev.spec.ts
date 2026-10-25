// Senza Web Audio, come con la Modalità di isolamento di Apple (audio/contesto.ts): niente eccezioni al primo
// tocco, le attività vanno avanti mute (il canto senza microfono, il ritmo col tocco) e il banner lo dice.
// Server di sviluppo: il Ritmo è ancora una bozza.
import { expect, test, type Page } from '@playwright/test';
import { batti } from './battere';
import { sorveglia } from './sorveglianza';

test.setTimeout(150_000); // la prima visita al server di sviluppo compila al volo, e i turni vanno a tempo

const avanti = (page: Page) => page.getByRole('button', { name: 'Avanti', exact: true }).click();
const feedback = (page: Page) => page.getByRole('main').getByRole('status');

async function apri(page: Page, percorso: string) {
	await page.goto(percorso);
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	await expect(page.getByText('Aura non può suonare né usare il microfono')).toBeVisible();
	await page.getByRole('button', { name: 'Inizia' }).click();
}

test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.addInitScript(() => {
		delete (window as { AudioContext?: unknown }).AudioContext;
		delete (window as { webkitAudioContext?: unknown }).webkitAudioContext;
	});
});

test('il canto: si ascolta e si canta lo stesso, senza microfono, fino alla fine', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await apri(page, '/musica/canto/tieni-la-nota');
	await avanti(page);

	await page.getByRole('button', { name: 'Ascolta e canta' }).click();
	await expect(feedback(page)).toContainText('Puoi ascoltare e cantare lo stesso');
	await avanti(page);

	await page.getByRole('button', { name: 'Ascolta e canta' }).click();
	await expect(feedback(page)).toContainText('Puoi ascoltare e cantare lo stesso');
	await page.getByRole('button', { name: 'Basta così' }).click();
	await expect(page.getByRole('heading', { name: 'Per oggi va bene così' })).toBeFocused();

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});

test('il ritmo: si ascolta e si batte col tocco a tempo, sul clock muto', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await apri(page, '/musica/ritmo/il-battito');
	await avanti(page);
	await avanti(page);

	// «Avanti» arriva dopo il primo ascolto completo: anche muto, l'ascolto finisce
	await page.getByRole('button', { name: 'Ascolta', exact: true }).click();
	await avanti(page);

	await page.getByRole('button', { name: 'Ascolta e batti' }).click();
	await batti(page, page.getByRole('main'));
	await expect(feedback(page)).toHaveText(
		'Ce l’hai fatta! Ogni battito è arrivato al momento giusto.',
		{ timeout: 15_000 }
	);

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});
