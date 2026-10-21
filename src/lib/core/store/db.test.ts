import { IDBFactory } from 'fake-indexeddb';
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
