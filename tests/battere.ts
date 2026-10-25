// Aiuti per i test e2e del Ritmo: battere a tempo con lo Spazio, contare i colpi suonati, seguire il
// microfono.
import { expect, type Locator, type Page } from '@playwright/test';

type Spia = { __colpi: { midi: number; t: number }[] };

/** Conta gli OscillatorNode avviati, con la nota (midi) e l'istante sul clock audio: uno per colpo. */
export async function spiaColpi(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as Spia;
		w.__colpi = [];
		const start = OscillatorNode.prototype.start;
		OscillatorNode.prototype.start = function (this: OscillatorNode, quando = 0) {
			w.__colpi.push({
				midi: Math.round(69 + 12 * Math.log2(this.frequency.value / 440)),
				t: quando
			});
			return start.call(this, quando);
		};
	});
	return () => page.evaluate(() => (window as unknown as Spia).__colpi);
}

/**
 * Batte con lo Spazio le note del turno ritmico in `ambito` (indici delle note da battere, pause escluse),
 * tranne quelle in `salta`, più i battiti `extra` (in battiti dalla prima nota; il ritmo deve cominciare
 * con TA). I tempi vengono dalla pagina: data-attesi di TurnoRitmo, in performance.now().
 */
export async function batti(
	page: Page,
	ambito: Locator,
	{ salta = [], extra = [] }: { salta?: number[]; extra?: number[] } = {}
) {
	const palco = ambito.locator('[data-attesi]');
	await expect(palco).toHaveAttribute('data-attesi', /\d/, { timeout: 20_000 });
	const attesi: number[] = JSON.parse((await palco.getAttribute('data-attesi'))!);
	const battitoMs = attesi[1] - attesi[0];
	const tempi = [
		...attesi.filter((_, i) => !salta.includes(i)),
		...extra.map((b) => attesi[0] + b * battitoMs)
	].sort((a, b) => a - b);
	// l'orologio della pagina rispetto a quello del test, a metà dell'andata e ritorno
	const prima = Date.now();
	const pagina = await page.evaluate(() => performance.now());
	const scarto = pagina - (prima + Date.now()) / 2;
	for (const t of tempi) {
		const attesa = t - scarto - Date.now();
		if (attesa > 0) await new Promise((r) => setTimeout(r, attesa));
		await page.keyboard.press('Space');
	}
}

type ConFlussi = { __flussi: MediaStream[] };

/** Tiene da parte i flussi del microfono aperti dalla pagina: per controllare che si spengano. */
export async function spiaMicrofono(page: Page) {
	await page.addInitScript(() => {
		const flussi: MediaStream[] = [];
		(window as unknown as ConFlussi).__flussi = flussi;
		const apri = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
		navigator.mediaDevices.getUserMedia = async (vincoli) => {
			const flusso = await apri(vincoli);
			flussi.push(flusso);
			return flusso;
		};
	});
	return () =>
		page.evaluate(() => {
			const flussi = (window as unknown as ConFlussi).__flussi;
			const accese = flussi.flatMap((f) => f.getTracks()).filter((t) => t.readyState === 'live');
			return { aperti: flussi.length, accesi: accese.length };
		});
}
