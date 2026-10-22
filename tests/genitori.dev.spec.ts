// Pagina per i genitori e pagine della shell (solo server di sviluppo: /dev ha il catalogo di prova).
import { expect, test, type Page } from '@playwright/test';
import { numeroInLettere } from '../src/lib/core/numeri';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(90_000); // la prima visita al server di sviluppo compila al volo

const STORE = '/src/lib/core/store/progressi.svelte.ts';
const NUMERI = new Map(Array.from({ length: 900 }, (_, i) => [numeroInLettere(i + 100), i + 100]));

async function apri(page: Page, percorso: string) {
	await page.goto(percorso);
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
}

/** Supera il controllo per gli adulti: il numero è scritto in lettere, si risponde in cifre. */
async function superaGate(page: Page) {
	const dialog = page.getByRole('dialog', { name: 'Questa parte è per gli adulti' });
	await expect(dialog).toBeVisible();
	const lettere = (await dialog.locator('.numero').textContent())!.trim();
	await dialog.getByLabel('Il numero in cifre').fill(String(NUMERI.get(lettere)));
	await dialog.getByRole('button', { name: 'Conferma' }).click();
	await expect(dialog).toBeHidden();
}

/** Stato del profilo attivo, letto dallo store dell'app (stesso modulo servito da vite). */
const statoProfilo = (page: Page) =>
	page.evaluate(async (u) => {
		const { progressi } = await import(/* @vite-ignore */ u);
		const doc = progressi.doc;
		return {
			id: doc.profilo.id as string,
			alias: doc.profilo.alias as string | undefined,
			scheda: doc.attivita['esempio.linee.cinque-linee']?.scheda as number | undefined,
			profili: progressi.profili.length as number
		};
	}, STORE);

test('backup: si scarica un file .kgz e la data dell’ultimo backup compare', async ({ page }) => {
	await apri(page, '/genitori');
	await expect(page.getByText('Non avete ancora fatto un backup.')).toBeVisible();
	const scaricato = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Scarica il backup' }).click();
	const file = await scaricato;
	// nel nome del file la parola dell'avatar (ASCII), mai il nome del bambino
	expect(file.suggestedFilename()).toMatch(
		new RegExp(String.raw`^aura-[a-z]+-\d{4}-\d{2}-\d{2}\.kgz$`, 'u')
	);
	await expect(page.getByText(`Backup scaricato: ${file.suggestedFilename()}.`)).toBeVisible();
	await expect(page.getByText(/^Ultimo backup: /)).toBeVisible();
});

test('backup: esporta, elimina il profilo, importa di nuovo: progressi identici', async ({
	page,
	baseURL
}, info) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await apri(page, '/genitori');
	await page.evaluate(async (u) => {
		const { progressi } = await import(/* @vite-ignore */ u);
		progressi.aggiornaAttivita('esempio.linee.cinque-linee', { stato: 'in_corso', scheda: 2 });
		progressi.aggiornaProfilo({ alias: 'Ada' });
		await progressi.flush();
	}, STORE);
	const prima = await statoProfilo(page);
	expect(prima).toMatchObject({ alias: 'Ada', scheda: 2 });

	const scaricato = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Scarica il backup' }).click();
	const percorso = info.outputPath('backup.kgz');
	await (await scaricato).saveAs(percorso);

	// eliminare è protetto: il profilo sparisce e al suo posto ne nasce uno nuovo, vuoto
	await page.getByRole('button', { name: 'Elimina il profilo Ada' }).click();
	await superaGate(page);
	await expect(page.getByText('Profilo eliminato.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Elimina il profilo Ada' })).toHaveCount(0);
	const dopo = await statoProfilo(page);
	expect(dopo.id).not.toBe(prima.id);
	expect(dopo.scheda).toBeUndefined();

	// importare è protetto: superato il controllo si apre subito la scelta del file
	const scelta = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Importa un backup' }).click();
	await superaGate(page);
	await (await scelta).setFiles(percorso);
	await expect(
		page.getByText('Backup importato: i progressi sono uniti a quelli già presenti.')
	).toBeVisible();
	expect(await statoProfilo(page)).toEqual({ ...prima, profili: 2 });

	await page.waitForLoadState('networkidle');
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
	expect(await violazioniGravi(page)).toEqual([]);
});

test('controllo adulti: annullato, non si apre nessun file e non si elimina niente', async ({
	page
}) => {
	await apri(page, '/genitori');
	let scelte = 0;
	page.on('filechooser', () => scelte++);
	const dialog = page.getByRole('dialog', { name: 'Questa parte è per gli adulti' });

	await page.getByRole('button', { name: 'Importa un backup' }).click();
	await expect(dialog).toBeVisible();
	expect(await violazioniGravi(page)).toEqual([]);
	await dialog.getByRole('button', { name: 'Annulla' }).click();
	await expect(dialog).toBeHidden();

	const { id } = await statoProfilo(page);
	await page.getByRole('button', { name: /^Elimina il profilo/ }).click();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	expect(scelte).toBe(0);
	expect((await statoProfilo(page)).id).toBe(id);
});

test('impostazioni: dopo il controllo si riflettono sugli attributi di <html> e restano', async ({
	page
}) => {
	await apri(page, '/genitori');
	const html = page.locator('html');
	const testoGrande = page.getByRole('checkbox', { name: 'Testo grande' });

	// annullato il controllo, la casella torna com'era
	await page.getByRole('checkbox', { name: 'Meno movimento' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Annulla' }).click();
	await expect(page.getByRole('checkbox', { name: 'Meno movimento' })).not.toBeChecked();
	await expect(html).not.toHaveAttribute('data-riduci-movimento');

	await testoGrande.click();
	await superaGate(page);
	await expect(testoGrande).toBeChecked();
	await expect(html).toHaveAttribute('data-testo-grande');
	await expect(page.getByText('Impostazione salvata.')).toBeVisible();

	// una volta per visita: la modifica dopo non chiede di nuovo
	await page.getByRole('checkbox', { name: 'Contrasto alto' }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(html).toHaveAttribute('data-contrasto-alto');
	await page.getByRole('radio', { name: 'C, D, E' }).click();
	await expect(page.getByRole('radio', { name: 'C, D, E' })).toBeChecked();

	await page.waitForTimeout(800); // salvataggio debounced (400 ms) su IndexedDB
	await apri(page, '/genitori');
	await expect(html).toHaveAttribute('data-testo-grande');
	await expect(html).toHaveAttribute('data-contrasto-alto');
	await expect(page.getByRole('radio', { name: 'C, D, E' })).toBeChecked();
	// la manopola della latenza è nascosta finché non c'è il modulo Ritmo o una calibrazione
	await expect(page.getByRole('spinbutton')).toHaveCount(0);
});

test('selettore: il filtro si annuncia e resta nelle preferenze', async ({ page }) => {
	await apri(page, '/dev');
	const pagine = page.getByRole('region', { name: 'Pagine', exact: true });
	await pagine.getByLabel('Pagina da mostrare').selectOption('moduli');
	const conteggio = pagine.getByRole('status').filter({ hasText: /modul/ });
	await expect(conteggio).toHaveText('3 moduli');

	await pagine.getByRole('radio', { name: 'Suoni' }).check();
	await expect(conteggio).toHaveText('2 moduli');
	await pagine.getByRole('radio', { name: '9 anni' }).check();
	await expect(conteggio).toHaveText('1 modulo');
	await pagine.getByRole('radio', { name: 'Completati' }).check();
	await expect(conteggio).toHaveText('Nessun modulo con questi filtri.');
	await pagine.getByRole('button', { name: 'Mostra tutti i moduli' }).click();
	await expect(conteggio).toHaveText('3 moduli');

	await pagine.getByRole('radio', { name: 'Numeri' }).check();
	await page.waitForTimeout(800);
	await apri(page, '/dev');
	await pagine.getByLabel('Pagina da mostrare').selectOption('moduli');
	await expect(pagine.getByRole('radio', { name: 'Numeri' })).toBeChecked();
	await expect(conteggio).toHaveText('1 modulo');
});

test('pausa gentile: dopo 15 minuti di uso un invito che si chiude', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' }); // axe non deve vedere la dissolvenza a metà
	await page.clock.install();
	await apri(page, '/');
	const pausa = page.getByText('Che ne dici di una pausa?');
	await page.clock.runFor('14:00');
	await expect(pausa).toHaveCount(0);
	await page.clock.runFor('01:30');
	await expect(pausa).toBeVisible();
	expect(await violazioniGravi(page)).toEqual([]);
	await page.getByRole('button', { name: 'Va bene' }).click();
	await expect(pausa).toHaveCount(0);
});

for (const colorScheme of ['light', 'dark'] as const) {
	test(`pagine con il catalogo di prova, tema ${colorScheme}: niente terzi, errori o violazioni a11y`, async ({
		page,
		baseURL
	}) => {
		await page.emulateMedia({ colorScheme });
		const { esterne, errori } = sorveglia(page, baseURL!);
		await apri(page, '/dev');
		// un po' di progressi, perché compaiano tutti gli stati (fatta, in corso, da fare)
		await page.evaluate(async (u) => {
			const { progressi } = await import(/* @vite-ignore */ u);
			const esito = { superata: true, errori: 0, risposte: 2 };
			progressi.registraVerifica('suoni.ascolto.forte-piano', [], esito, new Date());
			progressi.aggiornaAttivita('suoni.ascolto.lungo-corto', { stato: 'in_corso', scheda: 1 });
		}, STORE);
		const pagine = page.getByRole('region', { name: 'Pagine', exact: true });
		const scegli = pagine.getByLabel('Pagina da mostrare');
		for (const vuoto of [false, true]) {
			await pagine.getByLabel('Catalogo vuoto').setChecked(vuoto);
			for (const vista of ['home', 'moduli', 'area', 'modulo', 'genitori']) {
				await test.step(`${vista}${vuoto ? ' (vuoto)' : ''}`, async () => {
					await scegli.selectOption(vista);
					if (!vuoto || vista === 'home' || vista === 'moduli' || vista === 'genitori') {
						await expect(pagine.getByRole('heading', { level: 1 })).toBeVisible();
					}
					expect(await violazioniGravi(page)).toEqual([]);
				});
			}
		}
		await scegli.selectOption('home');
		await expect(pagine.getByText('Le prime attività stanno arrivando')).toBeVisible();
		expect(esterne).toEqual([]);
		expect(errori).toEqual([]);
	});
}

test('profili: dopo «Usa questo profilo» o un’eliminazione il fuoco va sul profilo in uso', async ({
	page
}) => {
	await apri(page, '/genitori');
	await page.getByRole('button', { name: 'Crea il profilo' }).click();
	await expect(page.getByText('Profilo creato: adesso è quello in uso.')).toBeVisible();
	const lista = page.locator('#profili ul.profili');
	const inUso = lista.locator('li.attivo');

	await page.getByRole('button', { name: /^Usa questo profilo/ }).focus();
	await page.keyboard.press('Enter');
	await expect(inUso).toBeFocused();

	await lista
		.getByRole('button', { name: /^Elimina il profilo/ })
		.last()
		.click();
	await superaGate(page);
	await expect(page.getByText('Profilo eliminato.')).toBeVisible();
	await expect(inUso).toBeFocused();
	// senza nome: l'avatar una volta sola, accanto a «Senza nome»
	await expect(inUso.locator('.nome')).toHaveText('Senza nome');
});
