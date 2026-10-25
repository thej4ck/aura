// I problemi noti delle piattaforme (src/lib/core/problemi-noti.ts): su un iPhone emulato gli avvisi
// compaiono dove servono, su Chrome per computer nessuno. È Chromium con lo user agent, lo schermo e il
// touch di un iPhone: le API sono di Chromium, e quelle che mancano a Safari si tolgono con addInitScript.
import { devices, expect, test, type Page } from '@playwright/test';
import { superaGate } from './gate';
import { sorveglia, violazioniGravi } from './sorveglianza';

// il browser del dispositivo (webkit) no: si resta nel progetto chromium
const { userAgent, viewport, deviceScaleFactor, isMobile, hasTouch } = devices['iPhone 15'];

async function apri(page: Page, percorso: string) {
	await page.goto(percorso);
	await expect(page.getByRole('img', { name: /Profilo attivo/ })).toBeVisible(); // pagina idratata
}
const avviso = (page: Page, id: string) => page.locator(`[data-problema="${id}"]`);
const latenza = (page: Page) => page.getByLabel("Ritardo dell'audio, in millisecondi");

test.describe('su iPhone', () => {
	// senza l'entrata animata della scheda, che axe vedrebbe a metà (testo trasparente)
	test.use({ userAgent, viewport, deviceScaleFactor, isMobile, hasTouch, reducedMotion: 'reduce' });

	test('microfono, audio e installazione: gli avvisi per iPhone e iPad dove servono', async ({
		page,
		baseURL
	}) => {
		const { esterne, errori } = sorveglia(page, baseURL!);
		// come Safari prima della 18.4: l'AudioContext non dichiara outputLatency
		await page.addInitScript(() => {
			delete (AudioContext.prototype as { outputLatency?: number }).outputLatency;
		});

		await apri(page, '/genitori#impostazioni');
		await expect(latenza(page)).toBeVisible();
		await expect(avviso(page, 'output-latency-assente')).toContainText('150-250');
		await expect(avviso(page, 'ios-audio-muto')).toContainText('ricaricate la pagina');
		await expect(avviso(page, 'ios-permesso-microfono')).toContainText(
			'Safari chiede il microfono a ogni visita'
		);
		// iOS 17+ e niente Android
		await expect(avviso(page, 'ios16-silenzioso')).toHaveCount(0);
		await expect(avviso(page, 'android-voce-italiana')).toHaveCount(0);
		expect(await violazioniGravi(page)).toEqual([]);

		await page.getByRole('link', { name: 'Backup e app' }).click();
		await expect(avviso(page, 'safari-dati-7-giorni')).toContainText(
			'Su iPhone e iPad il browser cancella'
		);
		await expect(page.getByText(/^Per installarla su iPhone e iPad/)).toBeVisible();
		await expect(avviso(page, 'app-dati-separati')).toContainText('scaricate il backup');
		await expect(avviso(page, 'firefox-persistenza')).toHaveCount(0);

		// prima del canto, nella riga per gli adulti
		await apri(page, '/musica/canto/tieni-la-nota');
		await page.getByRole('button', { name: 'Inizia' }).click();
		await page.getByRole('button', { name: 'Avanti' }).click();
		await expect(page.getByRole('button', { name: 'Ascolta e canta' })).toBeVisible();
		await expect(avviso(page, 'ios-microfono')).toContainText('cuffie Bluetooth');
		expect(await violazioniGravi(page)).toEqual([]);

		expect(esterne).toEqual([]);
		expect(errori).toEqual([]);
	});

	test('IndexedDB che non si apre già all’avvio (WebKit 273827): ricaricare, non la Modalità di isolamento', async ({
		page
	}) => {
		await page.addInitScript(() => {
			IDBFactory.prototype.open = () => {
				throw new DOMException('Connection to Indexed Database server lost', 'UnknownError');
			};
		});
		await apri(page, '/');
		await expect(page.getByText('Su questo browser i progressi restano solo')).toBeVisible();
		await expect(avviso(page, 'ios-salvataggio')).toContainText('ricaricare la pagina');
		await expect(avviso(page, 'apple-isolamento')).toHaveCount(0);
	});

	test('nell’app installata: niente invito a installarla, e il permesso a ogni apertura è normale', async ({
		page
	}) => {
		await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
		await apri(page, '/genitori#impostazioni');
		await expect(avviso(page, 'ios-permesso-microfono')).toContainText('a ogni apertura');
		await page.getByRole('link', { name: 'Backup e app' }).click();
		await expect(page.getByText("L'app è già installata. Bene così!")).toBeVisible();
		await expect(avviso(page, 'safari-dati-7-giorni')).toHaveCount(0);
		await expect(avviso(page, 'app-dati-separati')).toHaveCount(0);
	});
});

test.describe('su Firefox per computer', () => {
	test.use({
		userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0'
	});

	test('la persistenza la chiede l’adulto, dietro il controllo, finché Firefox non ha risposto', async ({
		page
	}) => {
		// la finestra di Firefox non c'è: l'adulto risponde «no», e la risposta resta tra le visite
		await page.addInitScript(() => {
			const risposta = () => sessionStorage.getItem('persistenza');
			navigator.permissions.query = async () => {
				(window as { chiesto?: boolean }).chiesto = true;
				return { state: risposta() ? 'denied' : 'prompt' } as PermissionStatus;
			};
			navigator.storage.persist = async () => (sessionStorage.setItem('persistenza', 'no'), false);
		});
		await apri(page, '/genitori#backup');
		await expect(avviso(page, 'firefox-persistenza')).toContainText('Premendo il pulsante');
		const chiedi = page.getByRole('button', { name: 'Chiedi a Firefox di conservare i dati' });
		await chiedi.click();
		await superaGate(page);
		await expect(page.getByText('Firefox non conserva i dati in modo permanente')).toBeVisible();
		await expect(chiedi).toBeFocused();

		await page.reload();
		await page.waitForFunction(() => (window as { chiesto?: boolean }).chiesto);
		await expect(avviso(page, 'firefox-persistenza')).toHaveCount(0);
		await expect(chiedi).toHaveCount(0);
	});
});

test('su Chrome per computer nessun avviso di altre piattaforme', async ({ page }) => {
	await apri(page, '/genitori#impostazioni');
	await expect(latenza(page)).toBeVisible();
	await expect(page.locator('[data-problema]')).toHaveCount(0);

	await page.getByRole('link', { name: 'Backup e app' }).click();
	await expect(page.getByText(/cercate nel suo menu la voce Installa/)).toBeVisible();
	await expect(page.locator('[data-problema]')).toHaveCount(0);

	await apri(page, '/musica/canto/tieni-la-nota');
	await page.getByRole('button', { name: 'Inizia' }).click();
	await page.getByRole('button', { name: 'Avanti' }).click();
	await expect(page.getByRole('button', { name: 'Ascolta e canta' })).toBeVisible();
	await expect(page.locator('[data-problema]')).toHaveCount(0);
});
