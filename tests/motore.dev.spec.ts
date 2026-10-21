// Motore delle attività end-to-end sull'attività di esempio di /dev (solo server di sviluppo).
import { expect, test } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(90_000); // la prima visita al server di sviluppo compila al volo

test('attività di esempio: schede, feedback, ripresa dopo il ricaricamento e riepilogo', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	const attivita = page.getByRole('region', { name: 'Attività di esempio' });
	const avanti = attivita.getByRole('button', { name: 'Avanti' });

	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible();
	await expect(attivita.getByRole('heading', { level: 1, name: 'Le 5 linee' })).toBeVisible();
	await expect(attivita.getByText('Circa 4 minuti')).toBeVisible();

	// Scopri: spiegazione; il titolo della scheda riceve il focus (tastiera e lettori di schermo)
	await attivita.getByRole('button', { name: 'Inizia' }).click();
	await expect(attivita.getByRole('heading', { name: 'Il pentagramma' })).toBeFocused();
	await expect(attivita.getByText('Scheda 1 di 5')).toBeVisible();
	await avanti.click();

	// Scopri: animazione a passi, comandata anche da tastiera
	await expect(attivita.getByRole('heading', { name: 'Contiamo le linee' })).toBeFocused();
	await expect(attivita.getByText('Questa è la prima linea, in basso.')).toBeVisible();
	await attivita.getByRole('button', { name: 'Passo successivo' }).focus();
	await page.keyboard.press('Enter');
	await expect(attivita.getByText('Ecco la seconda.')).toBeVisible();
	await expect(attivita.getByText('Passo 2 di 5')).toBeVisible();
	await avanti.click();

	// Proviamo insieme: feedback formativo, si riprova finché non si trova
	await attivita.getByRole('button', { name: 'Quattro' }).click();
	await expect(attivita.getByRole('status')).toContainText("Prova un'altra risposta");
	await expect(avanti).toHaveCount(0);
	await attivita.getByRole('button', { name: 'Cinque' }).click();
	await expect(attivita.getByRole('status')).toContainText('Sì, è proprio questa!');
	await avanti.click();

	// Prova tu: la scheda è salvata; dopo il ricaricamento si riprende da qui
	await expect(attivita.getByRole('heading', { name: 'Prova tu' })).toBeFocused();
	await expect(attivita.getByText('Scheda 4 di 5')).toBeVisible();
	await page.waitForTimeout(800); // salvataggio debounced (400 ms) su IndexedDB
	await page.reload();
	await attivita.getByRole('button', { name: 'Riprendi da dove eri' }).click();
	await expect(attivita.getByText('Scheda 4 di 5')).toBeVisible();

	await attivita.getByRole('button', { name: 'Dal basso' }).click();
	await avanti.click();
	await attivita.getByRole('button', { name: 'La terza' }).click();
	await avanti.click();

	// riepilogo: verifica superata senza errori alla prima volta → 2 stelle, e il prossimo passo
	await expect(attivita.getByRole('heading', { name: 'Attività completata' })).toBeFocused();
	await expect(attivita.getByRole('img', { name: 'Stelle: 2 su 3' })).toBeVisible();
	await expect(attivita.getByText('Il pentagramma ha cinque linee.')).toBeVisible();
	await expect(attivita.getByText('I 4 spazi')).toBeVisible();
	await expect(attivita.getByRole('button', { name: 'Ripeti' })).toBeVisible();

	await page.waitForLoadState('networkidle');
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
	expect(await violazioniGravi(page)).toEqual([]);
});

test('controllo per gli adulti: numero in lettere da scrivere in cifre', async ({ page }) => {
	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	await page.getByRole('button', { name: 'Apri il controllo' }).click();
	const dialog = page.getByRole('dialog', { name: 'Questa parte è per gli adulti' });
	await expect(dialog).toBeVisible();

	// il numero da scrivere fa parte della descrizione del campo, che ha il focus: il lettore di schermo lo legge
	const campo = dialog.getByLabel('Il numero in cifre');
	const leggiNumero = async () => (await dialog.locator('.numero').textContent())!.trim();
	await expect(campo).toBeFocused();
	await expect(campo).toHaveAccessibleDescription(new RegExp(await leggiNumero()));

	await campo.fill('1');
	await dialog.getByRole('button', { name: 'Conferma' }).click();
	// il messaggio contiene il nuovo numero: ogni tentativo cambia il testo annunciato
	await expect(dialog.getByText(/Il numero non corrisponde/)).toBeVisible();
	const lettere = await leggiNumero();
	await expect(
		dialog.getByText(`Il numero non corrisponde. Eccone un altro: ${lettere}.`)
	).toBeVisible();

	// il numero è scritto in lettere: lo si converte qui con la stessa funzione del sito
	const { numeroInLettere } = await import('../src/lib/core/numeri');
	const numero = Array.from({ length: 900 }, (_, i) => i + 100).find(
		(n) => numeroInLettere(n) === lettere
	);
	await dialog.getByLabel('Il numero in cifre').fill(String(numero));
	await dialog.getByRole('button', { name: 'Conferma' }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText('Controllo superato.')).toBeVisible();
});
