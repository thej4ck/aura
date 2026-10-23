// Il microfono con una voce cantata realistica (un La4 basso, con vibrato e respiro, che non smette mai:
// vedi setup-mic.ts), sulla build di produzione: deve ascoltare in continuo, senza buchi.
import { expect, test, type Page } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(60_000);

async function apri(page: Page, percorso: string) {
	await page.goto(percorso);
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
}

test('genitori, «Prova il microfono»: solo numeri, e più del 95% dei frame ha la voce', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await apri(page, '/genitori');
	const sezione = page.getByRole('region', { name: 'Prova il microfono' });
	await sezione.getByRole('button', { name: 'Apri il microfono' }).click();

	const numero = (testo: string) => sezione.getByRole('definition').filter({ hasText: testo });
	// il campionamento dipende dall'uscita audio: sui runner della CI non è sempre 48.000 Hz
	const campionamento = sezione.locator('dt', { hasText: 'Frequenza di campionamento' });
	await expect(campionamento.locator('+ dd')).toHaveText(/^\d{2}\.\d{3} Hz$/);
	await expect(sezione.getByText('AnalyserNode', { exact: false })).toBeVisible();
	// i filtri per le chiamate sono spenti davvero, e il suggerimento non serve
	await expect(sezione.getByRole('definition').filter({ hasText: /^no$/ })).toHaveCount(3);
	await expect(sezione.getByRole('status').filter({ hasText: 'filtri' })).toHaveCount(0);
	await expect(numero('La4')).toBeVisible();

	// la finestra dei frame si riempie (5 s), poi la voce continua resta sopra il 95% in ogni lettura
	const validi = sezione.getByTestId('mic-validi');
	const percento = async () => parseInt((await validi.textContent()) ?? '', 10);
	await page.waitForTimeout(5500);
	for (let i = 0; i < 4; i++) {
		expect(await percento()).toBeGreaterThan(95);
		await page.waitForTimeout(1000);
	}
	expect(await violazioniGravi(page)).toEqual([]);

	await sezione.getByRole('button', { name: 'Chiudi il microfono' }).click();
	await expect(validi).toBeHidden();
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});

test('tieni la nota: con la voce realistica i 3 s di tenuta arrivano subito, senza cali', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await apri(page, '/musica/canto/tieni-la-nota');
	await page.getByRole('button', { name: 'Inizia' }).click();
	await page.getByRole('button', { name: 'Avanti' }).click();

	// Proviamo insieme: canta-nota sul La
	await page.getByRole('button', { name: 'Ascolta e canta' }).click();
	const turno = page.getByRole('list', { name: 'A chi tocca' }).locator('[aria-current="step"]');
	await expect(turno).toHaveText('Canta', { timeout: 10_000 });
	const inizio = Date.now();
	await expect(page.getByRole('main').getByRole('status')).toHaveText(
		'Ce l’hai fatta! Hai tenuto la nota.',
		{ timeout: 10_000 }
	);
	// 3 s in zona più il margine della pagina; con il gate fisso di prima, a questo volume, mai
	expect(Date.now() - inizio).toBeLessThan(6000);
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});
