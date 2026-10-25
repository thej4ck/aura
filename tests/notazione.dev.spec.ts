// Pentagramma interattivo e tastiera della vetrina /dev, usati da tastiera, e il disegno del ritmo
// (solo server di sviluppo).
import { expect, test, type Locator } from '@playwright/test';
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

/** Il centro orizzontale di un elemento, in px della pagina. */
const centroX = async (l: Locator) => {
	const r = (await l.boundingBox())!;
	return r.x + r.width / 2;
};
/** Il verso di ogni gambo, in ordine: 'su' se finisce sopra la testa. */
const versi = (rigo: Locator) =>
	rigo
		.locator('line.gambo')
		.evaluateAll((gambi) =>
			gambi.map((g) => (Number(g.getAttribute('y2')) < Number(g.getAttribute('y1')) ? 'su' : 'giu'))
		);

test('ritmo: figure, travature, pause, stanghette e tempo; i battiti con una forma per esito', async ({
	page,
	baseURL
}) => {
	const { esterne, errori } = sorveglia(page, baseURL!);
	await page.setViewportSize({ width: 360, height: 800 });
	await page.goto('/dev');
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // idratata
	const sezione = page.locator('section[aria-labelledby="sez-notazione"]');

	// 'ta ti-ti ta-a | sst ta-a-a' in 4/4 sul rigo ritmico, con le sillabe e i battiti del bambino
	const ritmico = sezione.getByRole('group', {
		name: 'Rigo ritmico in 4/4, con le sillabe e i battiti'
	});
	const svg = ritmico.locator('svg');
	await expect(svg.locator('line.linea')).toHaveCount(1); // una linea, niente chiave
	await expect(svg.locator('line.gambo')).toHaveCount(5);
	expect(await versi(ritmico)).toEqual(['su', 'su', 'su', 'su', 'su']);
	await expect(svg.locator('path.travatura')).toHaveCount(1);
	await expect(svg.locator('path.codetta')).toHaveCount(0); // le due crome sono unite
	await expect(svg.locator('path.pausa')).toHaveCount(1);
	await expect(svg.locator('path.punto')).toHaveCount(1);
	await expect(svg.locator('path.tempo')).toHaveCount(2);
	await expect(svg.locator('line.stanghetta:not(.finale)')).toHaveCount(1);
	await expect(svg.locator('line.stanghetta.finale')).toHaveCount(2); // la doppia finale…
	await expect(svg.locator('line.stanghetta.finale.spessa')).toHaveCount(1); // …sottile e spessa
	await expect(svg.locator('text')).toHaveText(['TA', 'TI', 'TI', 'TA-A', 'SST', 'TA-A-A']);
	// una forma per esito, non solo un colore
	await expect(svg.locator('circle.battito.giusto')).toHaveCount(2);
	await expect(svg.locator('path.battito.presto')).toHaveCount(1);
	await expect(svg.locator('path.battito.tardi')).toHaveCount(1);
	await expect(svg.locator('circle.battito.mancato')).toHaveCount(1);
	await expect(svg.locator('path.battito.in-piu')).toHaveCount(1);
	// presto a sinistra della sua nota, tardi a destra, mancato proprio sotto
	const testa = (i: number) => centroX(svg.locator(`[data-nota="${i}"]`));
	expect(await centroX(svg.locator('.battito.presto'))).toBeLessThan(await testa(1));
	expect(await centroX(svg.locator('.battito.tardi'))).toBeGreaterThan(await testa(3));
	expect(
		Math.abs((await centroX(svg.locator('.battito.mancato'))) - (await testa(5)))
	).toBeLessThan(1);
	// i lettori di schermo: tempo, figure con sillaba ed esito, poi i battiti in più
	await expect(ritmico.getByRole('listitem')).toHaveText([
		'Figura 1 di 6: semiminima, TA, battuta giusta',
		"Figura 2 di 6: croma, TI, battuta un po' presto",
		'Figura 3 di 6: croma, TI, battuta giusta',
		"Figura 4 di 6: minima, TA-A, battuta un po' tardi",
		'Figura 5 di 6: pausa di semiminima, SST',
		'Figura 6 di 6: minima puntata, TA-A-A, mancata'
	]);
	await expect(ritmico.locator('p')).toHaveText([
		'Tempo in chiave: 4 quarti',
		'Un battito in più, uno nella pausa'
	]);
	// due battute in 4/4 stanno su un telefono senza scorrere
	expect(await ritmico.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

	// melodia in 4/4: gambi su e giù, crome unite (la seconda coppia di traverso), la pausa evidenziata
	// senza nome né colore
	const melodia = sezione.getByRole('group', { name: 'Melodia in 4/4, con la pausa evidenziata' });
	expect(await versi(melodia)).toEqual(['su', 'su', 'su', 'giu', 'giu', 'giu', 'su', 'su']);
	await expect(melodia.locator('svg path.travatura')).toHaveCount(2);
	await expect(melodia.locator('svg line.linea')).toHaveCount(5);
	await expect(melodia.locator('svg path.pausa')).toHaveCount(1);
	await expect(melodia.locator('svg path.pausa')).not.toHaveClass(/nota-/);
	await expect(melodia.locator('svg ellipse.anello')).toHaveCount(1);
	await expect(melodia.locator('svg text')).toHaveCount(8); // i nomi, non sotto la pausa
	await expect(melodia.getByRole('listitem').nth(6)).toHaveText(
		'Figura 7 di 9: pausa di semiminima, evidenziata'
	);

	// melodia in 3/4: crome isolate con la codetta (su e giù), pause di croma, minima puntata
	const tre = sezione.getByRole('group', { name: /Melodia in 3\/4/ });
	expect(await versi(tre)).toEqual(['su', 'giu', 'giu', 'su']);
	await expect(tre.locator('svg path.codetta')).toHaveCount(2);
	await expect(tre.locator('svg path.travatura')).toHaveCount(0);
	await expect(tre.locator('svg path.pausa')).toHaveCount(2);
	await expect(tre.locator('svg path.punto')).toHaveCount(1);

	// sul rigo ritmico la pausa di semibreve pende dalla linea, quella di minima ci sta sopra
	const pause = sezione.getByRole('group', { name: /Pause .* sul rigo ritmico/ });
	const centroY = async (l: Locator) => {
		const r = (await l.boundingBox())!;
		return r.y + r.height / 2;
	};
	const linea = await centroY(pause.locator('svg line.linea'));
	expect(await centroY(pause.locator('svg path.pausa').first())).toBeGreaterThan(linea);
	expect(await centroY(pause.locator('svg path.pausa').last())).toBeLessThan(linea);

	expect(await violazioniGravi(page)).toEqual([]);
	expect(esterne).toEqual([]);
	expect(errori).toEqual([]);
});
