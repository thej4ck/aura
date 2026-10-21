import { defineConfig, devices } from '@playwright/test';

// porta dedicata e strictPort: mai riusare per sbaglio il server di un altro progetto
const porta = 4319;

export default defineConfig({
	testDir: 'tests',
	// i *.test.ts in tests/ sono di Vitest
	testMatch: '**/*.spec.ts',
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	use: { baseURL: `http://localhost:${porta}` },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `npm run build && npm run preview -- --port ${porta} --strictPort`,
		port: porta
	}
});
