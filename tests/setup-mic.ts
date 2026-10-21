// globalSetup di Playwright: il WAV del microfono finto si genera a ogni esecuzione, niente binari nel repo.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generaWav } from '../scripts/genera-wav.mjs';

/** un La4 con armoniche, letto da Chromium come se fosse il microfono (progetto "mic") */
export const WAV_MIC = fileURLToPath(new URL('../test-results/mic/la440.wav', import.meta.url));

export default function setup() {
	mkdirSync(dirname(WAV_MIC), { recursive: true });
	writeFileSync(WAV_MIC, generaWav(440, 5));
}
