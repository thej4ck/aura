/** Store `profili`: un documento per profilo (keyPath profilo.id). Store `sistema`: chiave → valore. */
export type NomeStore = 'profili' | 'sistema';

export interface Db {
	/** false se IndexedDB manca o non si apre (es. navigazione privata): i dati restano solo in memoria */
	readonly persistente: boolean;
	get<T>(store: NomeStore, chiave: string): Promise<T | undefined>;
	/** in `profili` la chiave è `valore.profilo.id`; in `sistema` va passata */
	put(store: NomeStore, valore: unknown, chiave?: string): Promise<void>;
	del(store: NomeStore, chiave: string): Promise<void>;
	tutti<T>(store: NomeStore): Promise<T[]>;
}

function fabbricaPredefinita(): IDBFactory | null {
	try {
		return globalThis.indexedDB ?? null; // in alcuni contesti anche solo leggerlo lancia
	} catch {
		return null;
	}
}

function apri(fabbrica: IDBFactory): Promise<IDBDatabase> {
	return new Promise((ok, ko) => {
		const r = fabbrica.open('aura', 1);
		r.onupgradeneeded = () => {
			r.result.createObjectStore('profili', { keyPath: 'profilo.id' });
			r.result.createObjectStore('sistema');
		};
		r.onsuccess = () => ok(r.result);
		r.onerror = () => ko(r.error);
	});
}

function suIdb(db: IDBDatabase): Db {
	// ponytail: un'altra scheda che aggiorna la versione del db chiude questa connessione; questa poi va ricaricata
	db.onversionchange = () => db.close();
	// ponytail: su iOS 17.4+ la connessione si può perdere da sola (WebKit 273827, evento close): si ritenta
	// la scrittura e l'avviso ios-salvataggio dice di ricaricare. Riaprire il db su 'close' se un iPhone vero
	// mostra che basta (docs/prove-su-dispositivi.md): spesso anche una connessione nuova fallisce.
	const op = <T>(
		store: NomeStore,
		modo: IDBTransactionMode,
		f: (s: IDBObjectStore) => IDBRequest
	) =>
		new Promise<T>((ok, ko) => {
			const tx = db.transaction(store, modo);
			const r = f(tx.objectStore(store));
			tx.oncomplete = () => ok(r.result as T);
			tx.onerror = tx.onabort = () => ko(tx.error ?? r.error);
		});
	return {
		persistente: true,
		get: (store, chiave) => op(store, 'readonly', (s) => s.get(chiave)),
		put: (store, valore, chiave) => op(store, 'readwrite', (s) => s.put(valore, chiave)),
		del: (store, chiave) => op(store, 'readwrite', (s) => s.delete(chiave)),
		tutti: (store) => op(store, 'readonly', (s) => s.getAll())
	};
}

function inMemoria(): Db {
	const dati = { profili: new Map<string, unknown>(), sistema: new Map<string, unknown>() };
	return {
		persistente: false,
		get: async (store, chiave) => structuredClone(dati[store].get(chiave)) as never,
		put: async (store, valore, chiave) => {
			const k = chiave ?? (valore as { profilo: { id: string } }).profilo.id;
			dati[store].set(k, structuredClone(valore));
		},
		del: async (store, chiave) => void dati[store].delete(chiave),
		tutti: async (store) => [...dati[store].values()].map((x) => structuredClone(x)) as never
	};
}

/** Apre il database; se IndexedDB non c'è o fallisce, torna un db in memoria con `persistente = false`. */
export async function apriDb(fabbrica: IDBFactory | null = fabbricaPredefinita()): Promise<Db> {
	if (!fabbrica) return inMemoria();
	try {
		return suIdb(await apri(fabbrica));
	} catch {
		return inMemoria();
	}
}
