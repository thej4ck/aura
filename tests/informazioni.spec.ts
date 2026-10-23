// Pagina «Informazioni» (build di produzione): contenuti chiave, link dal piè di pagina e da /genitori,
// link esterni dietro il controllo per gli adulti. Axe in chiaro e scuro: home.spec.ts, come ogni pagina.
import { expect, test, type Page } from '@playwright/test';
import { numeroInLettere } from '../src/lib/core/numeri';

const NUMERI = new Map(Array.from({ length: 900 }, (_, i) => [numeroInLettere(i + 100), i + 100]));

async function apri(page: Page, percorso: string) {
	await page.goto(percorso);
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
}

// ponytail: copia di quella in genitori.dev.spec.ts; un modulo comune se servirà a un terzo file
async function superaGate(page: Page) {
	const dialog = page.getByRole('dialog', { name: 'Questa parte è per gli adulti' });
	await expect(dialog).toBeVisible();
	const lettere = (await dialog.locator('.numero').textContent())!.trim();
	await dialog.getByLabel('Il numero in cifre').fill(String(NUMERI.get(lettere)));
	await dialog.getByRole('button', { name: 'Conferma' }).click();
	await expect(dialog).toBeHidden();
}

const ESTERNI = {
	'backuppati.it/about': 'https://www.backuppati.it/about',
	'github.com/thej4ck/aura': 'https://github.com/thej4ck/aura',
	'github.com/thej4ck/aura/issues': 'https://github.com/thej4ck/aura/issues',
	'Segnala una vulnerabilità in privato': 'https://github.com/thej4ck/aura/security/advisories/new'
};

test('chi fa Aura, licenze, segnalazioni e avvertenze', async ({ page }) => {
	await apri(page, '/informazioni');
	const main = page.getByRole('main');
	await expect(main.getByRole('heading', { level: 1, name: 'Informazioni' })).toBeVisible();
	await expect(
		main.getByText('Aura è sviluppato e messo a disposizione gratuitamente da Nicola Mondinelli.')
	).toBeVisible();
	await expect(main.getByText('Il codice è rilasciato con licenza MIT.')).toBeVisible();
	await expect(main.getByText(/licenza Creative Commons .*\(CC BY-SA 4\.0\)/)).toBeVisible();
	for (const titolo of ['Un aiuto, non una scuola', 'I consigli sulla voce', 'Così com’è']) {
		await expect(main.getByRole('heading', { level: 3, name: titolo })).toBeVisible();
	}
	await expect(main.getByText(/non un parere medico o logopedico/)).toBeVisible();

	for (const [nome, url] of Object.entries(ESTERNI)) {
		const link = main.getByRole('link', { name: nome, exact: true });
		await expect(link).toHaveAttribute('href', url);
		await expect(link).toHaveAttribute('target', '_blank');
		await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	}

	await main.getByRole('link', { name: 'Crediti e licenze', exact: true }).click();
	await expect(page).toHaveURL(/\/genitori#crediti$/);
});

test('ci si arriva dal piè di pagina e dalla pagina per i genitori', async ({ page }) => {
	await apri(page, '/');
	const piede = page.getByRole('contentinfo');
	await expect(piede.getByText('Un progetto gratuito di Nicola Mondinelli.')).toBeVisible();
	await piede.getByRole('link', { name: 'Informazioni' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Informazioni' })).toBeVisible();

	await apri(page, '/genitori');
	await page.getByRole('main').getByRole('link', { name: 'Informazioni' }).click();
	await expect(page).toHaveURL(/\/informazioni$/);
});

test('i link esterni chiedono prima la domanda per gli adulti', async ({ page, context }) => {
	// nessuna richiesta vera verso altri siti
	await context.route(/^https:/, (r) => r.fulfill({ contentType: 'text/plain', body: 'ok' }));
	await apri(page, '/informazioni');
	const dialog = page.getByRole('dialog', { name: 'Questa parte è per gli adulti' });
	const link = page.getByRole('link', { name: 'github.com/thej4ck/aura', exact: true });

	// annullare: non si apre niente
	await link.click();
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Annulla' }).click();
	await expect(dialog).toBeHidden();
	// anche con la rotellina
	await link.click({ button: 'middle' });
	await expect(dialog).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	expect(context.pages()).toHaveLength(1);

	// superata la domanda: il sito esterno in una nuova scheda, questa resta dov'è
	await link.click();
	const nuova = context.waitForEvent('page');
	await superaGate(page);
	const scheda = await nuova;
	await expect(scheda).toHaveURL('https://github.com/thej4ck/aura');
	await expect(page).toHaveURL(/\/informazioni$/);
});
