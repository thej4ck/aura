import { defineConfig, devices } from '@playwright/test';
import { WAV_MIC, WAV_VOCE } from './tests/setup-mic';

/** Chromium legge il WAV come se fosse il microfono e accetta il permesso da solo */
const microfonoFinto = (wav: string) => ({
	args: [
		'--use-fake-ui-for-media-stream',
		'--use-fake-device-for-media-stream',
		`--use-file-for-fake-audio-capture=${wav}`
	]
});

// porte dedicate e strictPort: mai riusare per sbaglio il server di un altro progetto
// PORTA_E2E sposta le due porte (es. 4419 e 4420): lavori in parallelo in più worktree
const porta = Number(process.env.PORTA_E2E ?? 4319); // build di produzione (vite preview)
const portaDev = porta + 1; // server di sviluppo: serve per /dev, che in produzione non esiste

export default defineConfig({
	testDir: 'tests',
	// i *.test.ts in tests/ sono di Vitest
	testMatch: '**/*.spec.ts',
	forbidOnly: !!process.env.CI,
	// ogni test ha il suo contesto (storage isolato): si possono eseguire in parallelo anche dentro un file
	fullyParallel: true,
	reporter: process.env.CI ? 'github' : 'list',
	// genera il WAV del microfono finto
	globalSetup: './tests/setup-mic.ts',
	// ogni progetto deve comparire nei gruppi e2e di .github/workflows/ci.yml, altrimenti la CI non lo esegue
	projects: [
		{
			name: 'chromium',
			testIgnore: ['**/*.dev.spec.ts', '**/*.mic.spec.ts', '**/*.voce.spec.ts'],
			use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${porta}` }
		},
		{
			name: 'dev',
			testMatch: '**/*.dev.spec.ts',
			// il server di sviluppo compila le pagine al primo accesso: con i test in parallelo serve più margine
			expect: { timeout: 10_000 },
			use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${portaDev}` }
		},
		{
			// microfono finto con una nota pulita
			name: 'mic',
			testMatch: '**/*.mic.spec.ts',
			expect: { timeout: 10_000 },
			use: {
				...devices['Desktop Chrome'],
				baseURL: `http://localhost:${portaDev}`,
				launchOptions: microfonoFinto(WAV_MIC)
			}
		},
		{
			// microfono finto con una voce cantata realistica, sulla build di produzione
			name: 'voce',
			testMatch: '**/*.voce.spec.ts',
			use: {
				...devices['Desktop Chrome'],
				baseURL: `http://localhost:${porta}`,
				launchOptions: microfonoFinto(WAV_VOCE)
			}
		}
	],
	webServer: [
		{
			// la build la fa `npm run test:e2e` una volta sola, prima di Playwright
			command: `npm run preview -- --port ${porta} --strictPort`,
			port: porta
		},
		{ command: `npm run dev -- --port ${portaDev} --strictPort`, port: portaDev }
	]
});
