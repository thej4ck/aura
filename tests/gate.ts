import { expect, type Page } from '@playwright/test';
import { numeroInLettere } from '../src/lib/core/numeri';

const NUMERI = new Map(Array.from({ length: 900 }, (_, i) => [numeroInLettere(i + 100), i + 100]));

/** Supera il controllo per gli adulti: il numero è scritto in lettere, si risponde in cifre. */
export async function superaGate(page: Page) {
	const dialog = page.getByRole('dialog', { name: 'Questa parte è per gli adulti' });
	await expect(dialog).toBeVisible();
	const lettere = (await dialog.locator('.numero').textContent())!.trim();
	await dialog.getByLabel('Il numero in cifre').fill(String(NUMERI.get(lettere)));
	await dialog.getByRole('button', { name: 'Conferma' }).click();
	await expect(dialog).toBeHidden();
}
