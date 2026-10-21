import { defineConfig, devices } from '@playwright/test';

// porte dedicate e strictPort: mai riusare per sbaglio il server di un altro progetto
const porta = 4319; // build di produzione (vite preview)
const portaDev = 4320; // server di sviluppo: serve per /dev, che in produzione non esiste

export default defineConfig({
	testDir: 'tests',
	// i *.test.ts in tests/ sono di Vitest
	testMatch: '**/*.spec.ts',
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	projects: [
		{
			name: 'chromium',
			testIgnore: '**/*.dev.spec.ts',
			use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${porta}` }
		},
		{
			name: 'dev',
			testMatch: '**/*.dev.spec.ts',
			use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${portaDev}` }
		}
	],
	webServer: [
		{
			command: `npm run build && npm run preview -- --port ${porta} --strictPort`,
			port: porta
		},
		{ command: `npm run dev -- --port ${portaDev} --strictPort`, port: portaDev }
	]
});
