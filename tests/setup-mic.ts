// globalSetup di Playwright: il WAV del microfono finto si genera a ogni esecuzione, niente binari nel repo.
// Poi una prima visita al server di sviluppo, che compila al primo accesso: senza, i primi test in parallelo
// aspettano l'idratazione di /dev più a lungo del timeout.
import { chromium, type FullConfig } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generaWav } from '../scripts/genera-wav.mjs';

/** un La4 con armoniche, letto da Chromium come se fosse il microfono (progetto "mic") */
export const WAV_MIC = fileURLToPath(new URL('../test-results/mic/la440.wav', import.meta.url));

export default async function setup(config: FullConfig) {
	mkdirSync(dirname(WAV_MIC), { recursive: true });
	writeFileSync(WAV_MIC, generaWav(440, 5));

	// i webServer sono già partiti: si scaldano la vetrina e una pagina di attività
	const dev = config.projects.find((p) => p.name === 'dev')?.use.baseURL;
	if (!dev) return;
	const browser = await chromium.launch();
	const page = await browser.newPage();
	for (const percorso of ['/dev', '/musica/canto/cosa-sono-le-note']) {
		await page.goto(new URL(percorso, dev).href);
		await page.getByRole('img', { name: /Profilo attivo/ }).waitFor({ timeout: 60_000 });
	}
	await browser.close();
}
