import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// SvelteKit 3: la configurazione del kit sta qui (svelte.config.js non è più supportato).
export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				// pagina servita da Caddy per i 404 (shell SPA che mostra +error.svelte)
				fallback: '404.html',
				precompress: true,
				strict: true
			}),
			// il commit della build (Railway lo passa come ARG nel Dockerfile): finisce nelle segnalazioni
			// e nel nome della cache del service worker. Altrove resta il default di SvelteKit (un timestamp)
			version: process.env.RAILWAY_GIT_COMMIT_SHA
				? { name: process.env.RAILWAY_GIT_COMMIT_SHA.slice(0, 7) }
				: undefined,
			prerender: {
				// /genitori mostra una scheda alla volta scelta dall'hash: nell'HTML prerenderizzato c'è solo
				// la prima. I link alle altre schede e alle loro sezioni li controlla tests/genitori.dev.spec.ts
				handleMissingId: ({ path, message }) => {
					if (path !== '/genitori') throw new Error(message);
				}
			},
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self'],
					// solo gli attributi style (es. l'annuncio delle pagine di SvelteKit per i lettori di schermo); i <style> restano vietati. Vedi docs/adr/0002
					'style-src-attr': ['unsafe-inline'],
					'img-src': ['self', 'data:', 'blob:'],
					'media-src': ['self', 'blob:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'worker-src': ['self'],
					'manifest-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self']
				}
			}
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// niente cookie né localStorage: la lingua arriverà dalle preferenze del profilo.
			// Stessa strategia nello script `i18n` di package.json (genera i tipi per `npm run check`)
			strategy: ['globalVariable', 'baseLocale']
		})
	],
	test: {
		expect: { requireAssertions: true },
		passWithNoTests: true,
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.test.ts', 'tests/**/*.test.ts']
				}
			}
		]
	}
});
