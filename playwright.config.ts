import { defineConfig, devices } from '@playwright/test';
import { WAV_MIC } from './tests/setup-mic';

// porte dedicate e strictPort: mai riusare per sbaglio il server di un altro progetto
const porta = 4319; // build di produzione (vite preview)
const portaDev = 4320; // server di sviluppo: serve per /dev, che in produzione non esiste

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
	projects: [
		{
			name: 'chromium',
			testIgnore: ['**/*.dev.spec.ts', '**/*.mic.spec.ts'],
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
			// microfono finto: Chromium legge il WAV come se fosse la voce e accetta il permesso da solo
			name: 'mic',
			testMatch: '**/*.mic.spec.ts',
			expect: { timeout: 10_000 },
			use: {
				...devices['Desktop Chrome'],
				baseURL: `http://localhost:${portaDev}`,
				launchOptions: {
					args: [
						'--use-fake-ui-for-media-stream',
						'--use-fake-device-for-media-stream',
						`--use-file-for-fake-audio-capture=${WAV_MIC}`
					]
				}
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
