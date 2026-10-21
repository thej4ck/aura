// Rasterizza la favicon SVG in static/icons/*.png con il Chromium di Playwright (già installato).
// Uso: node scripts/genera-icone.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync('src/lib/assets/favicon.svg', 'utf8');
const glifo = svg.match(/<g [\s\S]*<\/g>/)[0]; // il germoglio, senza lo sfondo
const FONDO = '#1f6b5a';

// "any": la favicon com'è. "maskable": sfondo a tutto campo e glifo nella zona sicura
const any = svg;
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${FONDO}"/><g transform="translate(16 16) scale(0.9) translate(-16 -16)">${glifo}</g></svg>`;

const icone = [
	['icon-192.png', any, 192],
	['icon-512.png', any, 512],
	['icon-maskable-192.png', maskable, 192],
	['icon-maskable-512.png', maskable, 512],
	['apple-touch-icon.png', maskable, 180] // iOS arrotonda da sé
];

mkdirSync('static/icons', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [nome, sorgente, lato] of icone) {
	await page.setViewportSize({ width: lato, height: lato });
	await page.setContent(
		`<body style="margin:0;background:transparent">${sorgente.replace('<svg ', `<svg width="${lato}" height="${lato}" `)}</body>`
	);
	await page.screenshot({ path: `static/icons/${nome}`, omitBackground: true });
	console.log(nome);
}
await browser.close();
