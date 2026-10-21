// Pentagramma interattivo e tastiera della vetrina /dev, usati da tastiera (solo server di sviluppo).
import { expect, test } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(90_000); // la prima visita al server di sviluppo compila al volo

test('pentagramma da toccare: frecce e Invio scelgono la posizione, senza svelare i nomi', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // idratata
	const sezione = page.locator('section[aria-labelledby="sez-notazione"]');
	const rigo = sezione.getByRole('group', { name: 'Pentagramma da toccare' });
	const posizioni = rigo.getByRole('group', { name: 'Scegli una linea o uno spazio' });
	const esito = sezione.getByRole('status').filter({ hasText: 'Hai scelto' });

	// da C4 ad A5: 13 posizioni, un solo punto di tabulazione (la terza linea)
	await expect(posizioni.getByRole('button')).toHaveCount(13);
	const terza = posizioni.getByRole('button', { name: 'terza linea', exact: true });
	await expect(terza).toHaveAttribute('tabindex', '0');
	await terza.focus();
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await expect(posizioni.getByRole('button', { name: 'seconda linea' })).toBeFocused();
	await expect(terza).toHaveAttribute('tabindex', '-1');
	await page.keyboard.press('Enter');
	await expect(esito).toHaveText('Hai scelto: seconda linea (Sol).');
	// la nota scelta compare sul rigo e ai lettori di schermo resta solo la posizione
	await expect(rigo.getByRole('listitem')).toHaveText('Nota 1 di 1: seconda linea, evidenziata');

	// Fine e Home portano agli estremi, oltre i quali le frecce non vanno
	await page.keyboard.press('End');
	const doSotto = posizioni.getByRole('button', { name: 'primo taglio in basso' });
	await expect(doSotto).toBeFocused();
	await page.keyboard.press('ArrowDown');
	await expect(doSotto).toBeFocused();
	await page.keyboard.press('Space');
	await expect(esito).toHaveText('Hai scelto: primo taglio in basso (Do).');
	await page.keyboard.press('Home');
	await expect(posizioni.getByRole('button', { name: 'primo taglio in alto' })).toBeFocused();

	// i nomi delle note arrivano ai lettori di schermo solo se richiesti; si sceglie anche col puntatore
	await sezione.getByLabel('Nomi delle note per i lettori di schermo').check();
	await expect(posizioni.getByRole('button', { name: 'La, primo taglio in alto' })).toHaveCount(1);
	await posizioni.getByRole('button', { name: 'Mi, quarto spazio' }).click();
	await expect(esito).toHaveText('Hai scelto: quarto spazio (Mi).');
	await expect(rigo.getByRole('listitem')).toHaveText(
		'Nota 1 di 1: Mi, quarto spazio, evidenziata'
	);

	// tastiera: frecce per i semitoni, Invio per scegliere
	const tastiera = sezione.getByRole('group', { name: 'Tastiera da toccare' });
	const do4 = tastiera.getByRole('button', { name: 'Do 4, evidenziato' });
	await expect(do4).toHaveAttribute('tabindex', '0');
	await do4.focus();
	await page.keyboard.press('ArrowRight');
	await expect(tastiera.getByRole('button', { name: 'Do diesis 4', exact: true })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(sezione.getByRole('status').filter({ hasText: 'Hai toccato' })).toHaveText(
		'Hai toccato: Do♯.'
	);
	await expect(tastiera.getByRole('button', { name: 'Do diesis 4, evidenziato' })).toBeFocused();
	await expect(
		sezione.getByRole('img', {
			name: 'Registro vocale, solo da guardare. Zona colorata: da Sol 3 a Re 5'
		})
	).toBeVisible();

	expect(await violazioniGravi(page)).toEqual([]);
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});
