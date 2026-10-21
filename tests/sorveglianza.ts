import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Registra le richieste verso altre origini e gli errori in console (comprese le violazioni della CSP,
 * che il browser riporta come errori). Da chiamare prima di `page.goto`.
 */
export function sorveglia(page: Page, baseURL: string) {
	const origine = new URL(baseURL).origin;
	const esterne: string[] = [];
	const errori: string[] = [];
	page.on('request', (r) => {
		const url = new URL(r.url());
		if (url.protocol !== 'data:' && url.protocol !== 'blob:' && url.origin !== origine) {
			esterne.push(r.url());
		}
	});
	page.on('console', (msg) => {
		const { url } = msg.location();
		if (msg.type() === 'error') errori.push(url ? `${msg.text()} @ ${url}` : msg.text());
	});
	page.on('pageerror', (e) => errori.push(e.message));
	return { esterne, errori };
}

/** Violazioni axe gravi (serious/critical) della pagina, come "id: descrizione". */
export async function violazioniGravi(page: Page): Promise<string[]> {
	const { violations } = await new AxeBuilder({ page }).analyze();
	return violations
		.filter((v) => v.impact === 'serious' || v.impact === 'critical')
		.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}
