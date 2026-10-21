// Motore delle attività end-to-end sull'attività di esempio di /dev (solo server di sviluppo).
import { expect, test, type Page } from '@playwright/test';
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

/** Dall'obiettivo alla prima scheda "Prova tu" (scheda 4 di 5) dell'attività di esempio. */
async function finoAllaProva(page: Page) {
	const attivita = page.getByRole('region', { name: 'Attività di esempio' });
	const avanti = attivita.getByRole('button', { name: 'Avanti' });
	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	await attivita.getByRole('button', { name: 'Inizia' }).click();
	await avanti.click();
	await avanti.click();
	await attivita.getByRole('button', { name: 'Cinque' }).click();
	await avanti.click();
	await expect(attivita.getByText('Scheda 4 di 5')).toBeVisible();
	return { attivita, avanti };
}

test('verifica: tornare indietro e rispondere di nuovo non cancella il primo errore', async ({
	page
}) => {
	const { attivita, avanti } = await finoAllaProva(page);
	await attivita.getByRole('button', { name: 'Dall’alto' }).click(); // primo tentativo: da rivedere
	await expect(attivita.getByRole('status')).toContainText('«Dall’alto» non è questa');
	await attivita.getByRole('button', { name: 'Dal basso' }).click();
	await avanti.click();
	await attivita.getByRole('button', { name: 'La terza' }).click();

	// Indietro: la scheda 4 si rifà sapendo la risposta, ma conta la prima (1 su 2, sotto la soglia)
	await attivita.getByRole('button', { name: 'Indietro' }).click();
	await attivita.getByRole('button', { name: 'Dal basso' }).click();
	await avanti.click();
	await attivita.getByRole('button', { name: 'La terza' }).click();
	await avanti.click();
	await expect(attivita.getByRole('heading', { name: 'Ci sei quasi' })).toBeFocused();
	await expect(attivita.getByRole('link', { name: 'Torna alla home' })).toBeVisible();
});

test('verifica: dopo un ricaricamento a metà «Prova tu» si riprende dalla prima scheda prova', async ({
	page
}) => {
	const { attivita, avanti } = await finoAllaProva(page);
	await attivita.getByRole('button', { name: 'Dall’alto' }).click();
	await attivita.getByRole('button', { name: 'Dal basso' }).click();
	await avanti.click();
	await expect(attivita.getByText('Scheda 5 di 5')).toBeVisible();
	await page.waitForTimeout(800); // salvataggio debounced (400 ms) su IndexedDB
	await page.reload();
	await attivita.getByRole('button', { name: 'Riprendi da dove eri' }).click();
	await expect(attivita.getByText('Scheda 4 di 5')).toBeVisible();
});

test('cambio di profilo a metà attività: il motore riparte e il nuovo profilo resta pulito', async ({
	page
}) => {
	const { attivita } = await finoAllaProva(page);
	// il secondo profilo si crea con lo store dell'app (stesso modulo servito da vite): la UI arriverà con /genitori
	const store = '/src/lib/core/store/progressi.svelte.ts';
	const progressiDi = (url: string) =>
		page.evaluate(async (u) => {
			const { progressi } = await import(/* @vite-ignore */ u);
			return progressi.doc.attivita['esempio.linee.cinque-linee'] ?? null;
		}, url);
	await page.evaluate(async (u) => {
		const { progressi } = await import(/* @vite-ignore */ u);
		await progressi.creaProfilo('🦄', 'Teo');
	}, store);

	// il motore è ripartito per Teo: niente schede del profilo di prima, niente risposte registrate
	await expect(attivita.getByRole('button', { name: 'Inizia' })).toBeVisible();
	await expect(attivita.getByText('Scheda 4 di 5')).toHaveCount(0);
	expect(await progressiDi(store)).toBeNull();

	// dal menu si torna al primo profilo: la voce attiva ha la spunta, e l'attività si riprende da lì
	await page.getByRole('button', { name: /Cambia profilo/ }).click();
	const menu = page.getByRole('list').filter({ has: page.getByRole('button', { name: 'Teo' }) });
	await expect(menu.getByRole('button', { name: 'Teo' })).toHaveAttribute('aria-current', 'true');
	await menu.getByRole('button', { name: /^Profilo / }).click();
	await attivita.getByRole('button', { name: 'Riprendi da dove eri' }).click();
	await expect(attivita.getByText('Scheda 4 di 5')).toBeVisible();
});
