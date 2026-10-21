// Microfono finto (un La4 da file, vedi setup-mic.ts) sulla sezione audio di /dev: solo server di sviluppo.
import { expect, test } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(90_000); // la prima visita al server di sviluppo compila al volo

test('il microfono sente il La4 a ~440 Hz, e non ascolta mentre suona il sito', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	const sezione = page.getByRole('region', { name: 'Audio' });
	const freq = sezione.getByTestId('freq-rilevata');
	/** distanza in cent dal La4 della frequenza mostrata (Infinity se non ce n'è una) */
	const centsDaLa4 = async () => {
		const hz = parseFloat(((await freq.textContent()) ?? '').replace(',', '.'));
		return Number.isFinite(hz) ? Math.abs(1200 * Math.log2(hz / 440)) : Infinity;
	};

	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	await expect(freq).toHaveText('nessuna');
	await sezione.getByRole('button', { name: 'Prova il microfono' }).click();
	await expect.poll(centsDaLa4, { timeout: 15_000 }).toBeLessThan(15);
	// l'indicazione visibile, e l'annuncio (più calmo) per i lettori di schermo
	await expect(sezione.locator('p[aria-hidden="true"]')).toHaveText('Così! Tieni la nota');
	await expect(sezione.locator('[aria-live="polite"]')).toHaveText('Così! Tieni la nota');

	// turni ascolta/canta: mentre suona la scala il microfono non ascolta, poi riprende
	await sezione.getByRole('button', { name: 'Suona una scala' }).click();
	await expect(freq).toHaveText('in pausa mentre suona il sito');
	await expect(sezione.getByRole('button', { name: 'Ferma' })).toBeVisible();
	await expect.poll(centsDaLa4, { timeout: 20_000 }).toBeLessThan(15);
	await expect(sezione.getByRole('button', { name: 'Suona una scala' })).toBeVisible();

	await sezione.getByRole('button', { name: 'Chiudi il microfono' }).click();
	await expect(freq).toHaveText('nessuna');
	await expect(sezione.locator('p[aria-hidden="true"]')).toHaveText(
		'Ti ascolto: canta quando vuoi.'
	);

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
	expect(await violazioniGravi(page)).toEqual([]);
});
