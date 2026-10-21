/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';
import { scegliStrategia } from '#lib/core/pwa/strategia.ts';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `kindergarden-${version}`;
const PAGINA_404 = '/404.html';
// il precache non invia Origin ma i moduli sì: con `Vary: Origin` (es. vite preview) non si troverebbero
const SENZA_VARY = { ignoreVary: true };
// tutto ciò che serve a funzionare offline; /dev non si precarica mai
const precache = [...immutable, ...assets, ...prerendered]
	// i percorsi sono relativi alla base (la home è '', da qui il ./): si risolvono contro l'indirizzo del worker
	.map((f) => new URL('./' + f.path, sw.location.href).pathname)
	.filter(
		(p) =>
			scegliStrategia({ method: 'GET', url: sw.location.origin + p }, sw.location.origin) !==
			'ignora'
	);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(precache);
			// la 404 (shell dell'app) non è in nessun elenco: se manca, pazienza
			// (con cache.add() un 404 verrebbe rifiutato: qui si salva comunque, è la shell dell'app)
			await fetch(PAGINA_404)
				.then((r) => cache.put(PAGINA_404, r))
				.catch(() => {});
			await sw.skipWaiting();
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const chiave of await caches.keys()) {
				if (chiave !== CACHE) await caches.delete(chiave);
			}
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	const strategia = scegliStrategia(request, sw.location.origin);
	if (strategia === 'ignora') return;
	event.respondWith(strategia === 'cache-prima' ? cachePrima(request) : retePrima(request));
});

async function cachePrima(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	const trovata = await cache.match(request, SENZA_VARY);
	if (trovata) return trovata;
	const risposta = await fetch(request);
	if (risposta.ok) await cache.put(request, risposta.clone());
	return risposta;
}

async function retePrima(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	try {
		const risposta = await fetch(request);
		if (risposta.ok) await cache.put(request, risposta.clone());
		return risposta;
	} catch (e) {
		const trovata = await cache.match(request, SENZA_VARY);
		if (trovata) return trovata;
		if (request.mode === 'navigate') {
			const nonTrovata = await cache.match(PAGINA_404, SENZA_VARY);
			if (nonTrovata) return nonTrovata;
		}
		throw e;
	}
}
