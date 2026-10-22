// Modulo Pentagramma end-to-end (server di sviluppo: il modulo è ancora una bozza).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { sorveglia, violazioniGravi } from './sorveglianza';

test.setTimeout(120_000); // la prima visita al server di sviluppo compila al volo

/** axe ad animazioni finite: durante un ingresso i colori sono a metà strada */
async function axe(page: Page) {
	await page.waitForFunction(() =>
		document.getAnimations().every((a) => a.playState !== 'running')
	);
	return violazioniGravi(page);
}

async function apri(page: Page, attivita: string) {
	await page.goto(`/musica/pentagramma/${attivita}`);
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
}

/** Solo tastiera: Tab finché il fuoco arriva sul bersaglio. */
async function tabFino(page: Page, bersaglio: Locator, max = 40) {
	for (let i = 0; i < max; i++) {
		if (await bersaglio.evaluate((el) => el === document.activeElement)) return;
		await page.keyboard.press('Tab');
	}
	throw new Error('bersaglio non raggiunto con Tab');
}

async function premi(page: Page, bersaglio: Locator, tasto = 'Enter') {
	await tabFino(page, bersaglio);
	await page.keyboard.press(tasto);
}

test('«Le 5 linee e i 4 spazi» da tastiera, fino al riepilogo', async ({ page, baseURL }) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await apri(page, 'linee-e-spazi');
	const avanti = page.getByRole('button', { name: 'Avanti' });
	const stato = page.getByRole('main').getByRole('status');

	await page.getByRole('heading', { level: 1, name: 'Le 5 linee e i 4 spazi' }).focus();
	await premi(page, page.getByRole('button', { name: 'Inizia' }));

	// Scopri: due spiegazioni animate, con i passi comandati da tastiera
	await expect(page.getByRole('heading', { name: 'Il pentagramma' })).toBeFocused();
	await expect(page.getByText('Ecco le cinque linee del pentagramma.')).toBeVisible();
	await premi(page, page.getByRole('button', { name: 'Passo successivo' }));
	await expect(page.getByText('Le linee si contano dal basso')).toBeVisible();
	await premi(page, avanti);
	await expect(page.getByRole('heading', { name: 'Sulla linea o nello spazio' })).toBeFocused();
	expect(await axe(page)).toEqual([]);
	await premi(page, avanti);

	// Proviamo insieme: la terza linea. Frecce per muoversi, Invio per scegliere; l'aiuto dice dove andare
	const rigo = page.getByRole('group', { name: 'Tocca la terza linea' });
	await tabFino(page, rigo.locator('[tabindex="0"]'));
	await page.keyboard.press('ArrowDown');
	await expect(rigo.getByRole('button', { name: 'secondo spazio' })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(stato).toHaveText(
		'Hai toccato il secondo spazio. Più su trovi la terza linea. La terza linea sta proprio nel mezzo.'
	);
	await expect(avanti).toHaveCount(0);
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('Enter');
	await expect(stato).toHaveText('Sì, è proprio la terza linea!');
	await expect(rigo.getByRole('button', { name: 'terza linea' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	expect(await axe(page)).toEqual([]);
	await premi(page, avanti);

	await premi(page, page.getByRole('button', { name: 'In uno spazio' }));
	await expect(stato).toContainText('Sì, è proprio questa!');
	await premi(page, avanti);

	// Prova tu: cinque domande, tutte giuste al primo tentativo
	await expect(page.getByRole('heading', { name: 'Prova tu' })).toBeFocused();
	await tabFino(
		page,
		page.getByRole('group', { name: 'Tocca il primo spazio' }).locator('[tabindex="0"]')
	);
	for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	await expect(stato).toHaveText('Sì, è proprio il primo spazio!');
	await premi(page, avanti);

	await tabFino(
		page,
		page.getByRole('group', { name: 'Tocca la quinta linea' }).locator('[tabindex="0"]')
	);
	await page.keyboard.press('Home');
	await page.keyboard.press('Enter');
	await expect(stato).toHaveText('Sì, è proprio la quinta linea!');
	await premi(page, avanti);

	await premi(page, page.getByRole('button', { name: 'Su una linea' }));
	await premi(page, avanti);

	await tabFino(
		page,
		page.getByRole('group', { name: 'Tocca il terzo spazio' }).locator('[tabindex="0"]')
	);
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('Enter');
	await expect(stato).toHaveText('Sì, è proprio il terzo spazio!');
	await premi(page, avanti);

	await premi(page, page.getByRole('button', { name: 'Quattro' }));
	await premi(page, avanti);

	await expect(page.getByRole('heading', { name: 'Attività completata' })).toBeFocused();
	await expect(page.getByRole('img', { name: 'Stelle: 2 su 3' })).toBeVisible();
	await expect(page.getByText('Il pentagramma ha cinque linee e quattro spazi')).toBeVisible();
	await expect(page.getByText('Cosa sono le note', { exact: true })).toBeVisible(); // prossimo passo

	await page.waitForLoadState('networkidle');
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
	expect(await axe(page)).toEqual([]);
});

// posizione letta dal lettore di schermo → nome della nota (le prime note di «Che nota è?»)
const NOMI: Record<string, string> = {
	'prima linea': 'Mi',
	'seconda linea': 'Sol',
	'terza linea': 'Si',
	'quarta linea': 'Re',
	'quinta linea': 'Fa'
};

test('«Che nota è?»: otto giuste di fila sbloccano il Re, che resta nei progressi', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await apri(page, 'che-nota-e');
	const stato = page.getByRole('main').getByRole('status');
	const nota = page.getByRole('group', { name: 'La nota da leggere' }).getByRole('listitem');
	const nomi = page.getByRole('group', { name: 'Che nota è?' });
	const inGioco = page.getByText(/^Note in gioco:/);

	const leggi = async () => {
		const testo = (await nota.textContent())!;
		const posizione = /: (.+)$/.exec(testo)![1];
		expect(NOMI[posizione], posizione).toBeDefined();
		return NOMI[posizione];
	};
	async function alGioco() {
		await page.getByRole('button', { name: /^(Inizia|Ripeti)$/ }).click();
		await page.getByRole('button', { name: 'Avanti' }).click();
		await page.getByRole('button', { name: 'Sol' }).click();
		await page.getByRole('button', { name: 'Avanti' }).click();
		await expect(page.getByRole('heading', { name: 'Leggi le note' })).toBeVisible();
	}

	await alGioco();
	await expect(inGioco).toHaveText('Note in gioco: Mi, Sol, Si');
	expect(await axe(page)).toEqual([]);

	// una da rivedere: l'aiuto dice dove sta il nome scelto e verso dove guardare; la serie riparte
	const prima = await leggi();
	const sbagliato = prima === 'Mi' ? 'Sol' : 'Mi';
	await nomi.getByRole('button', { name: sbagliato, exact: true }).click();
	await expect(stato).toContainText('prova un altro nome');
	await expect(nomi.getByRole('button', { name: `${sbagliato} (già provata)` })).toBeVisible();
	await nomi.getByRole('button', { name: prima, exact: true }).click();
	await expect(stato).toHaveText(`Sì, era il ${prima}!`);

	for (let i = 0; i < 8; i++) {
		const nome = await leggi();
		await nomi.getByRole('button', { name: nome, exact: true }).click();
		if (i < 7) await expect(stato).toHaveText(`Sì, era il ${nome}!`);
	}
	// la nota nuova arriva subito, con il suo nome scritto sotto
	await expect(stato).toContainText('Ecco una nota nuova: il Re. Il Re sta sulla quarta linea.');
	await expect(nota).toHaveText('Nota 1 di 1: Re, quarta linea');
	await expect(inGioco).toHaveText('Note in gioco: Mi, Sol, Si, Re');
	await expect(page.getByText('Note lette: 9')).toBeVisible();
	await nomi.getByRole('button', { name: 'Re', exact: true }).click();
	await expect(stato).toHaveText('Sì, era il Re!');
	expect(await axe(page)).toEqual([]);

	// «Ho finito» porta al riepilogo: 8 giuste su 9 al primo tentativo (il Re presentato non conta)
	await page.getByRole('button', { name: 'Ho finito' }).click();
	await expect(page.getByRole('heading', { name: 'Attività completata' })).toBeFocused();

	// le scatole sono salvate: alla prossima partita il Re è già in gioco
	await page.waitForTimeout(800); // salvataggio debounced (400 ms) su IndexedDB
	await page.reload();
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible();
	await alGioco();
	await expect(inGioco).toHaveText('Note in gioco: Mi, Sol, Si, Re');

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});

test('pagine del modulo e prima scheda di ogni attività senza violazioni gravi', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	for (const indirizzo of ['/musica', '/musica/pentagramma']) {
		await page.goto(indirizzo);
		await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible();
		expect(await axe(page), indirizzo).toEqual([]);
	}
	await expect(page.getByRole('heading', { level: 1, name: 'Pentagramma' })).toBeVisible();

	for (const attivita of [
		'linee-e-spazi',
		'chiave-di-violino',
		'note-linee-spazi',
		'che-nota-e',
		'alto-e-basso',
		'tagli-addizionali',
		'trovala',
		'alterazioni',
		'leggi-e-canta'
	]) {
		await apri(page, attivita);
		expect(await axe(page), `${attivita}: obiettivo`).toEqual([]);
		await page.getByRole('button', { name: 'Inizia' }).click();
		await expect(page.getByText(/^Scheda 1 di \d+$/)).toBeVisible();
		expect(await axe(page), `${attivita}: scheda 1`).toEqual([]);
	}

	// i giochi: «Trovala!» (staff-tocca dentro il widget del modulo) e le alterazioni con la tastiera
	// già cominciate qui sopra: si ricomincia dall'inizio
	await apri(page, 'trovala');
	await page.getByRole('button', { name: /^Ricomincia/ }).click();
	await page.getByRole('button', { name: 'Avanti' }).click();
	await page.getByRole('button', { name: 'quinta linea', exact: true }).click();
	await page.getByRole('button', { name: 'Avanti' }).click();
	await expect(page.getByText('Nota 1 di 6')).toBeVisible();
	await expect(
		page.getByText(/^Tocca il (Do|Re|Mi|Fa|Sol|La|Si) più in (alto|basso)$/)
	).toBeVisible();
	expect(await axe(page), 'trovala: gioco').toEqual([]);

	await apri(page, 'alterazioni');
	await page.getByRole('button', { name: /^Ricomincia/ }).click();
	await page.getByRole('button', { name: 'Avanti' }).click();
	await expect(page.getByRole('heading', { name: 'Tre segni' })).toBeVisible();
	for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Passo successivo' }).click();
	await expect(page.getByText('Il bequadro ♮ annulla il bemolle')).toBeVisible();
	expect(await axe(page), 'alterazioni: animazione').toEqual([]);

	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});
