// «Segnala un problema» (build di produzione): dietro il controllo per gli adulti, l'anteprima
// di cosa arriva su GitHub e la issue form precompilata. Solo dati tecnici.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { superaGate } from './gate';

async function apri(page: Page, percorso: string) {
	await page.goto(percorso);
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
}

/** apre GitHub dall'anteprima e restituisce i campi precompilati */
async function continua(context: BrowserContext, anteprima: ReturnType<Page['getByRole']>) {
	const nuova = context.waitForEvent('page');
	await anteprima.getByRole('button', { name: 'Continua su GitHub' }).click();
	const url = new URL((await nuova).url());
	expect(url.origin + url.pathname).toBe('https://github.com/thej4ck/aura/issues/new');
	return Object.fromEntries(url.searchParams);
}

test.beforeEach(async ({ context }) => {
	// nessuna richiesta vera verso GitHub
	await context.route(/^https:/, (r) => r.fulfill({ contentType: 'text/plain', body: 'ok' }));
});

test('dal piè di pagina: controllo, anteprima, poi la issue form scelta', async ({
	page,
	context
}) => {
	await apri(page, '/informazioni');
	const anteprima = page.getByRole('dialog', { name: 'Segnala un problema' });
	const pulsante = page.getByRole('contentinfo').getByRole('button', { name: 'Segnala un problema' });

	// annullare l'anteprima: non si apre niente
	await pulsante.click();
	await superaGate(page);
	await expect(anteprima).toBeVisible();
	await expect(anteprima.getByRole('radio', { name: 'Qualcosa che non funziona' })).toBeChecked();
	const voci = anteprima.getByRole('definition');
	await expect(voci).toHaveCount(3); // pagina, versione, browser: niente attività né scheda
	await expect(voci.first()).toHaveText('/informazioni');
	await anteprima.getByRole('button', { name: 'Annulla' }).click();
	await expect(anteprima).toBeHidden();
	expect(context.pages()).toHaveLength(1);

	await pulsante.click();
	await superaGate(page);
	await anteprima.getByText('Un’idea o un suggerimento').click();
	const campi = await continua(context, anteprima);
	expect(campi).toMatchObject({ template: 'idea.yml', pagina: '/informazioni' });
	expect(campi.versione).toBeTruthy();
	expect(campi.ambiente).toMatch(/^Chrome \d+, \w+/);
	expect(Object.keys(campi).sort()).toEqual(['ambiente', 'pagina', 'template', 'versione']);
	await expect(anteprima).toBeHidden();
	await expect(page).toHaveURL(/\/informazioni$/);
});

test('da una scheda: attività e numero della scheda, errore nei contenuti già scelto', async ({
	page,
	context
}) => {
	await apri(page, '/musica/pentagramma/linee-e-spazi');
	await page.getByRole('button', { name: 'Inizia' }).click();
	await expect(page.getByText(/^Scheda 1 di \d+$/)).toBeVisible();
	await page.getByRole('main').getByRole('button', { name: 'Segnala un problema' }).click();
	await superaGate(page);

	const anteprima = page.getByRole('dialog', { name: 'Segnala un problema' });
	await expect(anteprima.getByRole('radio', { name: /errore nei contenuti/ })).toBeChecked();
	const campi = await continua(context, anteprima);
	expect(campi).toMatchObject({
		template: 'contenuti.yml',
		pagina: '/musica/pentagramma/linee-e-spazi',
		attivita: 'musica.pentagramma.linee-e-spazi'
	});
	expect(campi.scheda).toMatch(/^1\/\d+$/);
});
