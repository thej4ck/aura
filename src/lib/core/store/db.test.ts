import { forceCloseDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { apriDb } from './db';
import { nuovoDocumento } from './schema-progressi';

describe.each([
	['IndexedDB', () => new IDBFactory(), true],
	['memoria', () => null, false]
])('db su %s', (_, fabbrica, persistente) => {
	it('get, put, del, tutti', async () => {
		const db = await apriDb(fabbrica());
		expect(db.persistente).toBe(persistente);

		const a = nuovoDocumento('🦊');
		const b = nuovoDocumento('🐻', 'Bea');
		await db.put('profili', a);
		await db.put('profili', b);
		await db.put('sistema', a.profilo.id, 'profiloAttivo');
		expect(await db.get('profili', b.profilo.id)).toEqual(b);
		expect(await db.get('sistema', 'profiloAttivo')).toBe(a.profilo.id);
		expect(await db.tutti('profili')).toHaveLength(2);

		// il valore salvato è una copia
		a.profilo.avatar = '🐼';
		expect((await db.get<typeof a>('profili', a.profilo.id))?.profilo.avatar).toBe('🦊');

		await db.del('profili', a.profilo.id);
		expect(await db.get('profili', a.profilo.id)).toBeUndefined();
		expect(await db.tutti('profili')).toEqual([b]);
	});
});

it('se aprire IndexedDB fallisce usa la memoria', async () => {
	const rotta = {
		open() {
			throw new DOMException('privata', 'InvalidStateError');
		}
	} as unknown as IDBFactory;
	expect((await apriDb(rotta)).persistente).toBe(false);
});

it('i dati in IndexedDB sopravvivono alla riapertura', async () => {
	const fabbrica = new IDBFactory();
	const doc = nuovoDocumento('🦉');
	await (await apriDb(fabbrica)).put('profili', doc);
	expect(await (await apriDb(fabbrica)).get('profili', doc.profilo.id)).toEqual(doc);
});

describe('connessione persa (iOS 17.4+, WebKit 273827)', () => {
	/** una fabbrica vera che tiene da parte le connessioni aperte */
	function spiata() {
		const vera = new IDBFactory();
		const connessioni: IDBDatabase[] = [];
		const fabbrica = {
			open(nome: string, versione: number) {
				const r = vera.open(nome, versione);
				r.addEventListener('success', () => connessioni.push(r.result));
				return r;
			}
		} as unknown as IDBFactory;
		return { fabbrica, connessioni };
	}
	/** la prossima scrittura (o tutte) lancia l'errore di WebKit */
	function perdi(volte = 1) {
		const put = IDBObjectStore.prototype.put;
		IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...a) {
			if (volte-- <= 0) return put.apply(this, a);
			throw new DOMException('Connection to Indexed Database server lost', 'UnknownError');
		};
		return () => (IDBObjectStore.prototype.put = put);
	}

	it('evento close: la prossima operazione riapre il database e salva', async () => {
		const { fabbrica, connessioni } = spiata();
		const db = await apriDb(fabbrica);
		const doc = nuovoDocumento('🦊');
		forceCloseDatabase(connessioni[0] as never); // i tipi di fake-indexeddb chiedono la classe
		await db.put('profili', doc);
		expect(connessioni).toHaveLength(2);
		expect(await (await apriDb(fabbrica)).get('profili', doc.profilo.id)).toEqual(doc);
	});

	it('chiusa senza evento, o persa durante la transazione: riapre e riprova una volta', async () => {
		const { fabbrica, connessioni } = spiata();
		const db = await apriDb(fabbrica);
		connessioni[0].close(); // la prossima transazione: InvalidStateError
		await db.put('sistema', 1, 'a');
		expect(connessioni).toHaveLength(2);
		const ripristina = perdi();
		try {
			await db.put('sistema', 2, 'a');
		} finally {
			ripristina();
		}
		expect(connessioni).toHaveLength(3);
		expect(await db.get('sistema', 'a')).toBe(2);
	});

	it('se non basta, l’errore arriva a chi salva: niente cicli', async () => {
		const { fabbrica, connessioni } = spiata();
		const db = await apriDb(fabbrica);
		const ripristina = perdi(Infinity);
		try {
			await expect(db.put('sistema', 1, 'a')).rejects.toThrow('server lost');
		} finally {
			ripristina();
		}
		expect(connessioni).toHaveLength(2); // un solo nuovo tentativo
		// un errore che non è della connessione non riapre niente
		await expect(db.put('sistema', 1)).rejects.toMatchObject({ name: 'DataError' });
		expect(connessioni).toHaveLength(2);
		expect(await db.get('sistema', 'a')).toBeUndefined();
	});
});
