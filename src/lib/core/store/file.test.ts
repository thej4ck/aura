import { describe, expect, it, vi } from 'vitest';
import {
	esporta,
	handleSalvato,
	importa,
	MAX_COMPRESSO,
	MAX_DECOMPRESSO,
	permesso,
	salvaHandle,
	scrivi,
	supportaFileCollegato
} from './file';
import { apriDb } from './db';
import { ErroreProgressi, nuovoDocumento, type CodiceErrore } from './schema-progressi';

async function codice(p: Promise<unknown>): Promise<CodiceErrore> {
	const e = await p.then(
		() => undefined,
		(e: unknown) => e
	);
	expect(e).toBeInstanceOf(ErroreProgressi);
	return (e as ErroreProgressi).codice;
}

const gzip = (b: BlobPart) =>
	new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('gzip'))).blob();

function documento() {
	const doc = nuovoDocumento('🦊', 'Zoë Martí');
	doc.attivita['musica.canto.estensione'] = {
		stato: 'completata',
		scheda: 0,
		stelle: 2,
		tentativi: 3,
		primaVolta: '2026-10-20',
		aggiornato: '2026-10-20T10:00:00.000Z'
	};
	return doc;
}

describe('esporta e importa', () => {
	it('roundtrip gzip .kgz, con l’avatar nel nome del file e mai il nome del bambino', async () => {
		const doc = documento();
		const { blob, nomeFile } = await esporta(doc, '2026-10-21');
		expect(nomeFile).toBe('aura-🦊-2026-10-21.kgz');
		expect(blob.type).toBe('application/gzip');
		expect([...new Uint8Array(await blob.slice(0, 2).arrayBuffer())]).toEqual([0x1f, 0x8b]);
		expect(await importa(blob)).toEqual(doc);
	});

	it('un avatar importato senza emoji (o con caratteri da file system) dà "profilo"', async () => {
		const { nomeFile } = await esporta(nuovoDocumento('a/b:c', 'Zoë'), '2026-01-02');
		expect(nomeFile).toBe('aura-profilo-2026-01-02.kgz');
		expect((await esporta(nuovoDocumento('🐻/x'), '2026-01-02')).nomeFile).toBe(
			'aura-🐻-2026-01-02.kgz'
		);
	});

	it('senza CompressionStream esporta JSON semplice, che si reimporta', async () => {
		vi.stubGlobal('CompressionStream', undefined);
		try {
			const doc = documento();
			const { blob, nomeFile } = await esporta(doc, '2026-10-21');
			expect(nomeFile).toBe('aura-🦊-2026-10-21.json');
			expect(JSON.parse(await blob.text())).toEqual(doc);
			expect(await importa(blob)).toEqual(doc);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('legge anche un JSON scritto a mano, con BOM', async () => {
		const doc = documento();
		const file = new File(['﻿' + JSON.stringify(doc, null, 2)], 'a-mano.json');
		expect(await importa(file)).toEqual(doc);
	});

	it('file corrotti', async () => {
		expect(await codice(importa(new Blob(['{ non è json'])))).toBe('corrotto');
		expect(await codice(importa(new Blob([new Uint8Array([0x1f, 0x8b, 1, 2, 3, 4])])))).toBe(
			'corrotto'
		);
		const buono = new Uint8Array(await (await esporta(documento())).blob.arrayBuffer());
		expect(await codice(importa(new Blob([buono.slice(0, buono.length - 8)])))).toBe('corrotto');
		expect(await codice(importa(new Blob([new Uint8Array([0xff, 0xfe, 0x00])])))).toBe('corrotto');
	});

	it('formato sbagliato o contenuto non valido', async () => {
		expect(await codice(importa(new Blob(['{"ciao": 1}'])))).toBe('formato');
		const doc = { ...documento(), profilo: { id: 'non-uuid', avatar: '🦊' } };
		expect(await codice(importa(await gzip(JSON.stringify(doc))))).toBe('non-valido');
	});

	it('troppo grande, compresso e decompresso', async () => {
		expect(await codice(importa(new Blob([' '.repeat(MAX_DECOMPRESSO + 1)])))).toBe(
			'troppo-grande'
		);
		const grosso = new Uint8Array(MAX_COMPRESSO + 1);
		grosso.set([0x1f, 0x8b]);
		expect(await codice(importa(new Blob([grosso])))).toBe('troppo-grande');
		// bomba: pochi KB compressi, più di 10 MB decompressi
		const bomba = await gzip(' '.repeat(MAX_DECOMPRESSO + 1));
		expect(bomba.size).toBeLessThan(MAX_COMPRESSO);
		expect(await codice(importa(bomba))).toBe('troppo-grande');
	});
});

describe('file collegato', () => {
	it('feature detection', () => {
		expect(supportaFileCollegato()).toBe(false);
		vi.stubGlobal('showSaveFilePicker', () => {});
		try {
			expect(supportaFileCollegato()).toBe(true);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('scrivi e permesso su un handle finto', async () => {
		const scritti: Blob[] = [];
		let stato: PermissionState = 'prompt';
		const handle = {
			createWritable: async () => ({
				write: async (b: Blob) => void scritti.push(b),
				close: async () => {}
			}),
			queryPermission: async () => stato,
			requestPermission: async () => (stato = 'granted')
		} as unknown as FileSystemFileHandle;

		const doc = documento();
		await scrivi(handle, doc);
		expect(await importa(scritti[0])).toEqual(doc);

		expect(await permesso(handle, false)).toBe(false);
		expect(await permesso(handle, true)).toBe(true);
		expect(await permesso(handle, false)).toBe(true);
		expect(await permesso({} as FileSystemFileHandle, true)).toBe(false);
	});

	it('handle salvato per profilo', async () => {
		const db = await apriDb(null);
		await salvaHandle(db, 'p1', { nome: 'finto' } as unknown as FileSystemFileHandle);
		expect(await handleSalvato(db, 'p1')).toEqual({ nome: 'finto' });
		expect(await handleSalvato(db, 'p2')).toBeUndefined();
		await salvaHandle(db, 'p1', null);
		expect(await handleSalvato(db, 'p1')).toBeUndefined();
	});
});
