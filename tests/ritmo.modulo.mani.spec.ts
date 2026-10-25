// «Eco ritmica» con le mani al microfono finto (battiti di mani in una stanza: vedi setup-mic.ts), server
// di sviluppo perché il modulo è una bozza. I battiti del WAV non seguono il ritmo, quindi l'esito può
// andare in tutti e due i modi: qui contano i giri e il microfono, che si apre e si chiude a ogni giro.
import { expect, test } from '@playwright/test';
import { spiaMicrofono } from './battere';
import { sorveglia } from './sorveglianza';

test.setTimeout(120_000); // la prima visita al server di sviluppo compila al volo, e i turni vanno a tempo

test('«Eco ritmica» con le mani: ogni giro apre e chiude il microfono, la scelta resta, «Basta così» lo spegne', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	const microfono = await spiaMicrofono(page);
	await page.goto('/musica/ritmo/eco-ritmica');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	await page.getByRole('button', { name: 'Inizia' }).click();
	await page.getByRole('button', { name: 'Avanti', exact: true }).click();
	const feedback = page.getByRole('main').getByRole('status');
	const turno = page.getByRole('list', { name: 'A chi tocca' }).locator('[aria-current="step"]');

	// Proviamo insieme: si sceglie di battere le mani, con la promessa prima di aprire il microfono
	await page.getByRole('radio', { name: 'Batto le mani' }).check();
	await expect(
		page.getByText('Il microfono serve solo per sentire le tue mani. Niente viene registrato.')
	).toBeVisible();
	await page.getByRole('button', { name: 'Ascolta e batti' }).click();
	await expect(turno).toHaveText('Batti', { timeout: 15_000 });
	expect(await microfono()).toEqual({ aperti: 1, accesi: 1 });
	await expect(page.getByRole('button', { name: 'Riprova' })).toBeVisible({ timeout: 15_000 });
	await expect(feedback).not.toBeEmpty();
	expect(await microfono()).toEqual({ aperti: 1, accesi: 0 });
	await page.getByRole('button', { name: 'Avanti', exact: true }).click();

	// il gioco: la scelta delle mani resta, e ogni giro ha il suo microfono, chiuso alla fine del turno
	await expect(page.getByText('Giro 1 di 5', { exact: true })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'Batto le mani' })).toBeChecked();
	await page.getByRole('button', { name: 'Ascolta e batti' }).click();
	await expect(turno).toHaveText('Batti', { timeout: 15_000 });
	expect(await microfono()).toEqual({ aperti: 2, accesi: 1 });
	await expect(page.getByRole('button', { name: 'Riprova' })).toBeVisible({ timeout: 15_000 });
	expect(await microfono()).toEqual({ aperti: 2, accesi: 0 });
	await page.getByRole('button', { name: 'Avanti', exact: true }).click();

	// «Basta così» durante il turno: il microfono si spegne e il gioco finisce. Un giro solo non misura
	// ancora niente: il gioco aspetta
	await expect(page.getByText('Giro 2 di 5', { exact: true })).toBeFocused();
	await page.getByRole('button', { name: 'Ascolta e batti' }).click();
	await expect(turno).toBeVisible();
	await expect.poll(microfono).toEqual({ aperti: 3, accesi: 1 });
	await page.getByRole('button', { name: 'Basta così' }).click();
	await expect(page.getByRole('heading', { name: 'Per oggi va bene così' })).toBeFocused();
	expect(await microfono()).toEqual({ aperti: 3, accesi: 0 });

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});
