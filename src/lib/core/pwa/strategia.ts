export type Strategia = 'ignora' | 'cache-prima' | 'rete-prima';

export type Richiesta = { method: string; url: string };

/**
 * Sceglie come il service worker risponde a una richiesta.
 * - 'ignora': non si intercetta (non GET, altre origini, /dev, il service worker stesso)
 * - 'cache-prima': file con l'hash nel nome (/_app/immutable): non cambiano mai
 * - 'rete-prima': pagine e file senza hash: si prova la rete, se manca si usa la cache
 */
export function scegliStrategia(r: Richiesta, origine: string): Strategia {
	if (r.method !== 'GET') return 'ignora';
	const url = new URL(r.url);
	if (url.origin !== origine) return 'ignora';
	const p = url.pathname;
	if (p === '/dev' || p.startsWith('/dev/') || p === '/service-worker.js') return 'ignora';
	if (p.startsWith('/_app/immutable/')) return 'cache-prima';
	return 'rete-prima';
}
