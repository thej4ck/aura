// WAV PCM 16 bit mono di una nota con qualche armonica (come una voce semplice), per il microfono finto
// di Chromium negli e2e. Node puro, niente dipendenze.
// Uso: node scripts/genera-wav.mjs <file.wav> [freq=440] [secondi=5]
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ARMONICHE = [1, 0.5, 0.25, 0.12];

/**
 * Con un numero intero di periodi in `secondi` il file si ripete senza scatti (Chromium lo manda in loop).
 * @param {number} [freq]
 * @param {number} [secondi]
 * @param {number} [sampleRate]
 * @returns {Buffer}
 */
export function generaWav(freq = 440, secondi = 5, sampleRate = 48_000) {
	const n = Math.round(secondi * sampleRate);
	const wav = Buffer.alloc(44 + n * 2);
	wav.write('RIFF', 0, 'ascii');
	wav.writeUInt32LE(36 + n * 2, 4);
	wav.write('WAVEfmt ', 8, 'ascii');
	wav.writeUInt32LE(16, 16); // dimensione del blocco fmt
	wav.writeUInt16LE(1, 20); // PCM
	wav.writeUInt16LE(1, 22); // mono
	wav.writeUInt32LE(sampleRate, 24);
	wav.writeUInt32LE(sampleRate * 2, 28); // byte al secondo
	wav.writeUInt16LE(2, 32); // byte per campione
	wav.writeUInt16LE(16, 34); // bit per campione
	wav.write('data', 36, 'ascii');
	wav.writeUInt32LE(n * 2, 40);
	const somma = ARMONICHE.reduce((a, b) => a + b);
	for (let i = 0; i < n; i++) {
		let x = 0;
		ARMONICHE.forEach(
			(a, k) => (x += a * Math.sin((2 * Math.PI * freq * (k + 1) * i) / sampleRate))
		);
		wav.writeInt16LE(Math.round(((0.5 * x) / somma) * 32767), 44 + i * 2);
	}
	return wav;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const [file, freq = '440', secondi = '5'] = process.argv.slice(2);
	if (!file) {
		console.error('Uso: node scripts/genera-wav.mjs <file.wav> [freq=440] [secondi=5]');
		process.exit(1);
	}
	writeFileSync(file, generaWav(Number(freq), Number(secondi)));
}
