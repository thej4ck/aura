// Ogni spiegazione animata e ogni illustrazione dell'area Musica che mostra note o altezze le fa sentire,
// in sincrono. Una spia conta gli OscillatorNode avviati (con la loro nota) e segue l'evidenziazione: il
// disegno segna con `data-suona` (il midi) quello che mostra la nota che suona. Le schede si trovano dai
// dati dei moduli, così un disegno nuovo è provato da solo. Solo server di sviluppo.
import { expect, test, type Page } from '@playwright/test';
import { modulo as canto } from '../src/lib/moduli/musica/canto/modulo';
import { modulo as pentagramma } from '../src/lib/moduli/musica/pentagramma/modulo';
import { sorveglia } from './sorveglianza';

test.setTimeout(90_000); // la prima visita al server di sviluppo compila al volo

/** I disegni muti ammessi: non mostrano note né altezze. */
const MUTI: Record<string, string> = {
	'disegno-linee-spazi': 'solo le cinque linee e i quattro spazi, numerati: nessuna nota',
	'disegno-linea-spazio':
		'una testa di nota su tre linee senza chiave: insegna la posizione (linea o spazio), non un’altezza, e un suono inventato ne insegnerebbe una falsa'
};

type Caso = {
	modulo: string;
	attivita: string;
	indice: number;
	widget: 'animazione' | 'spiegazione';
	componente: string;
};
type Props = { componente?: string; illustrazione?: { componente?: string } };
type Dati = {
	id: string;
	attivita: { id: string; schede: { id: string; widget: string; props?: Props }[] }[];
};

/** schede che si superano con «Avanti»: per arrivare al disegno basta premerlo */
const PASSIVE = new Set(['spiegazione', 'animazione']);

const casi: Caso[] = ([canto, pentagramma] as Dati[]).flatMap((m) =>
	m.attivita.flatMap((a) =>
		a.schede.flatMap((s, indice): Caso[] => {
			const p = s.props;
			const componente =
				s.widget === 'animazione'
					? p?.componente
					: s.widget === 'spiegazione'
						? p?.illustrazione?.componente
						: undefined;
			if (!componente) return [];
			const prima = a.schede.slice(0, indice).filter((x) => !PASSIVE.has(x.widget));
			if (prima.length) {
				throw new Error(`${a.id}#${s.id}: prima ci sono schede da risolvere (${prima[0].id})`);
			}
			const widget = s.widget as Caso['widget'];
			return [{ modulo: m.id, attivita: a.id, indice, widget, componente }];
		})
	)
);

type Spia = { __note: number[]; __evidenziate: string[] };

/** Prima che la pagina parta: le note avviate (midi) e le evidenziazioni (data-suona) in ordine. */
async function spia(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as Spia;
		w.__note = [];
		w.__evidenziate = [''];
		const start = OscillatorNode.prototype.start;
		OscillatorNode.prototype.start = function (this: OscillatorNode, ...a: [number?]) {
			w.__note.push(Math.round(69 + 12 * Math.log2(this.frequency.value / 440)));
			return start.apply(this, a);
		};
		new MutationObserver(() => {
			const v = [...document.querySelectorAll('[data-suona]')].map((e) =>
				e.getAttribute('data-suona')
			);
			const stato = [...new Set(v)].join(',');
			if (w.__evidenziate.at(-1) !== stato) w.__evidenziate.push(stato);
		}).observe(document, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['data-suona']
		});
	});
	return {
		note: () => page.evaluate(() => (window as unknown as Spia).__note.length),
		/** note suonate ed evidenziate finora, senza ripetizioni consecutive (l'unisono vale una) */
		sequenze: () =>
			page.evaluate(() => {
				const w = window as unknown as Spia;
				const unisci = (a: string[]) => a.filter((x, i) => x !== a[i - 1]);
				return {
					suonate: unisci(w.__note.map(String)),
					evidenziate: unisci(w.__evidenziate.filter(Boolean))
				};
			}),
		ultima: () => page.evaluate(() => (window as unknown as Spia).__evidenziate.at(-1))
	};
}

async function apri(page: Page, c: Caso) {
	await page.goto(`/musica/${c.modulo}/${c.attivita}`);
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
	await page.getByRole('button', { name: 'Inizia' }).click();
	for (let i = 0; i < c.indice; i++) {
		await expect(page.getByText(new RegExp(`^Scheda ${i + 1} di \\d+$`))).toBeVisible();
		await page.getByRole('button', { name: 'Avanti' }).click();
	}
	await expect(page.getByText(new RegExp(`^Scheda ${c.indice + 1} di \\d+$`))).toBeVisible();
}

/** Aspetta la prima nota: se il passo è muto (per esempio le linee prima della chiave) va al successivo. */
async function finoAllaPrimaNota(page: Page, note: () => Promise<number>) {
	const successivo = page.getByRole('button', { name: 'Passo successivo' });
	for (;;) {
		try {
			await expect.poll(note, { timeout: 1500 }).toBeGreaterThan(0);
			return;
		} catch (e) {
			if ((await successivo.getAttribute('aria-disabled')) === 'true') throw e;
			await successivo.click();
		}
	}
}

/** Il suono finisce da solo e quello che si è visto evidenziato è proprio quello che si è sentito. */
async function controllaSincronia(s: Awaited<ReturnType<typeof spia>>) {
	await expect.poll(s.ultima, { timeout: 10_000 }).toBe('');
	const { suonate, evidenziate } = await s.sequenze();
	expect(suonate.length).toBeGreaterThan(0);
	expect(evidenziate, 'l’evidenziazione segue le note suonate').toEqual(suonate);
}

/** Dopo un gesto che deve zittire il disegno: niente più evidenziazione, niente note nuove. */
async function controllaSilenzio(page: Page, s: Awaited<ReturnType<typeof spia>>) {
	await expect(page.locator('[data-suona]')).toHaveCount(0);
	const prima = await s.note();
	await page.waitForTimeout(800);
	expect(await s.note()).toBe(prima);
}

for (const c of casi) {
	const muto = MUTI[c.componente];
	test(`${c.attivita}, scheda ${c.indice + 1}: ${c.componente} ${muto ? 'muto' : 'suona'}`, async ({
		page,
		baseURL
	}) => {
		const { esterne, errori } = sorveglia(page, baseURL!);
		const s = await spia(page);
		await apri(page, c);
		await page.waitForTimeout(500);
		expect(await s.note(), 'all’apertura non suona niente').toBe(0);

		if (c.widget === 'spiegazione') {
			const ascolta = page.getByRole('button', { name: 'Ascolta', exact: true });
			if (muto) {
				await expect(ascolta).toHaveCount(0);
			} else {
				await ascolta.click();
				await controllaSincronia(s);
				// di nuovo, poi «Avanti» mentre suona: il suono si ferma uscendo dalla scheda
				await ascolta.click();
				await expect.poll(s.ultima).not.toBe('');
				await page.getByRole('button', { name: 'Avanti' }).click();
				await controllaSilenzio(page, s);
			}
		} else if (muto) {
			// tutti i passi, in riproduzione: nessuna nota
			await page.getByRole('button', { name: 'Riproduci' }).click();
			const successivo = page.getByRole('button', { name: 'Passo successivo' });
			while ((await successivo.getAttribute('aria-disabled')) !== 'true') await successivo.click();
			await page.waitForTimeout(800);
			expect(await s.note()).toBe(0);
		} else {
			await page.getByRole('button', { name: 'Riproduci' }).click();
			await finoAllaPrimaNota(page, s.note);
			await controllaSincronia(s);
			// play riparte dall'inizio del passo; la pausa e l'uscita dalla scheda fermano subito il suono
			const pausa = page.getByRole('button', { name: 'Pausa' });
			if (await pausa.isVisible()) await pausa.click();
			await page.getByRole('button', { name: 'Riproduci' }).click();
			await expect.poll(s.ultima).not.toBe('');
			await pausa.click();
			await controllaSilenzio(page, s);
			await page.getByRole('button', { name: 'Riproduci' }).click();
			await expect.poll(s.ultima).not.toBe('');
			await page.getByRole('button', { name: 'Avanti' }).click();
			await controllaSilenzio(page, s);
		}

		expect(esterne).toEqual([]);
		expect(errori).toEqual([]);
	});
}

test('con il movimento ridotto la scala si sente lo stesso, e la pallina segue le note', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const s = await spia(page);
	await apri(page, { modulo: 'canto', attivita: 'una-alla-volta', indice: 1 } as Caso);
	await page.getByRole('button', { name: 'Passo successivo' }).click(); // la scala che sale
	await controllaSincronia(s);
	expect((await s.sequenze()).suonate).toEqual(['60', '62', '64', '65', '67', '69', '71', '72']);
});
