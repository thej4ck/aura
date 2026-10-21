import { giorno, type Giorno } from '../giorno';
import type { Db } from './db';
import { migra } from './migrazioni';
import { ErroreProgressi, type Documento } from './schema-progressi';

export const MAX_COMPRESSO = 2 * 1024 * 1024;
export const MAX_DECOMPRESSO = 10 * 1024 * 1024;
const TIPI = [{ description: 'Kindergarden', accept: { 'application/gzip': ['.kgz'] } }];

/** Alias usabile in un nome di file; l'avatar emoji non lo è. */
function perNomeFile(alias: string | undefined): string {
	const s = (alias ?? '')
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 30)
		.replace(/-+$/, '');
	return s || 'profilo';
}

/** File di salvataggio: JSON gzip `.kgz`, oppure `.json` semplice se CompressionStream manca. */
export async function esporta(
	doc: Documento,
	oggi: Giorno = giorno(new Date())
): Promise<{ blob: Blob; nomeFile: string }> {
	const base = `kindergarden-${perNomeFile(doc.profilo.alias)}-${oggi}`;
	const json = JSON.stringify(doc);
	if (typeof CompressionStream !== 'function') {
		return { blob: new Blob([json], { type: 'application/json' }), nomeFile: `${base}.json` };
	}
	const gz = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
	const blob = new Blob([await new Response(gz).arrayBuffer()], { type: 'application/gzip' });
	return { blob, nomeFile: `${base}.kgz` };
}

/** Legge lo stream fermandosi appena supera `max` byte (difesa dalle bombe gzip). */
async function leggiConLimite(
	stream: ReadableStream<Uint8Array>,
	max: number
): Promise<Uint8Array> {
	const pezzi: Uint8Array[] = [];
	let totale = 0;
	const lettore = stream.getReader();
	for (;;) {
		const { done, value } = await lettore.read();
		if (done) break;
		totale += value.byteLength;
		if (totale > max) {
			await lettore.cancel();
			throw new ErroreProgressi('troppo-grande', `Il file decompresso supera ${max} byte.`);
		}
		pezzi.push(value);
	}
	const out = new Uint8Array(totale);
	let i = 0;
	for (const p of pezzi) {
		out.set(p, i);
		i += p.byteLength;
	}
	return out;
}

/**
 * Legge un file di progressi (input non fidato): gzip (magic 1f 8b) o JSON semplice,
 * limiti di dimensione, JSON.parse protetto, migrazione e validazione.
 */
export async function importa(file: Blob): Promise<Documento> {
	const testa = new Uint8Array(await file.slice(0, 2).arrayBuffer());
	const gzip = testa[0] === 0x1f && testa[1] === 0x8b;
	const max = gzip ? MAX_COMPRESSO : MAX_DECOMPRESSO;
	if (file.size > max) throw new ErroreProgressi('troppo-grande', `Il file supera ${max} byte.`);

	let byte: Uint8Array;
	if (gzip) {
		if (typeof DecompressionStream !== 'function') {
			throw new ErroreProgressi('non-supportato', 'Questo browser non sa aprire i file .kgz.');
		}
		try {
			const s = file.stream().pipeThrough(new DecompressionStream('gzip'));
			byte = await leggiConLimite(s, MAX_DECOMPRESSO);
		} catch (e) {
			if (e instanceof ErroreProgressi) throw e;
			throw new ErroreProgressi('corrotto', 'Il file compresso è danneggiato.', { cause: e });
		}
	} else {
		byte = new Uint8Array(await file.arrayBuffer());
	}

	let json: unknown;
	try {
		json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(byte));
	} catch (e) {
		throw new ErroreProgressi('corrotto', 'Il file non contiene JSON leggibile.', { cause: e });
	}
	return migra(json);
}

// File System Access API (Chrome, Edge): tipi minimi, non ancora in lib.dom
type HandleConPermessi = FileSystemFileHandle & {
	queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
	requestPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
};
type ConPicker = {
	showSaveFilePicker(o: {
		suggestedName: string;
		types: typeof TIPI;
	}): Promise<FileSystemFileHandle>;
	showOpenFilePicker(o: { types: typeof TIPI }): Promise<FileSystemFileHandle[]>;
};
const picker = () => globalThis as unknown as ConPicker;

/** Feature detection: si può collegare un file per la sincronizzazione automatica? */
export function supportaFileCollegato(): boolean {
	return typeof (globalThis as Partial<ConPicker>).showSaveFilePicker === 'function';
}

export async function scrivi(handle: FileSystemFileHandle, doc: Documento): Promise<void> {
	const { blob } = await esporta(doc);
	const w = await handle.createWritable();
	await w.write(blob);
	await w.close();
}

/**
 * Il documento nel file collegato; `undefined` se il file è vuoto (l'unico caso in cui lo si può riscrivere
 * senza perdere niente). Un file che non si legge lancia come `importa`.
 */
export async function leggi(handle: FileSystemFileHandle): Promise<Documento | undefined> {
	const file = await handle.getFile();
	return file.size ? importa(file) : undefined;
}

/** Permesso di scrittura sul file. `richiedi` mostra la richiesta al browser: serve un gesto dell'utente. */
export async function permesso(handle: FileSystemFileHandle, richiedi: boolean): Promise<boolean> {
	const h = handle as HandleConPermessi;
	try {
		if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
		return richiedi && (await h.requestPermission({ mode: 'readwrite' })) === 'granted';
	} catch {
		return false;
	}
}

/** Fa scegliere dove salvare un nuovo file (.kgz) e ci scrive il documento. Lancia AbortError se si annulla. */
export async function collegaNuovoFile(doc: Documento): Promise<FileSystemFileHandle> {
	const { nomeFile } = await esporta(doc);
	const handle = await picker().showSaveFilePicker({ suggestedName: nomeFile, types: TIPI });
	await scrivi(handle, doc);
	return handle;
}

/** Fa scegliere un file esistente e lo legge: il documento (assente se il file è vuoto) va poi unito ai progressi. */
export async function collegaFileEsistente(): Promise<{
	handle: FileSystemFileHandle;
	doc: Documento | undefined;
}> {
	const [handle] = await picker().showOpenFilePicker({ types: TIPI });
	return { handle, doc: await leggi(handle) };
}

const chiaveFile = (profiloId: string) => `file:${profiloId}`;

/** Handle del file collegato al profilo, salvato nello store `sistema`. `null` lo scollega. */
export async function salvaHandle(db: Db, profiloId: string, handle: FileSystemFileHandle | null) {
	if (handle) await db.put('sistema', handle, chiaveFile(profiloId));
	else await db.del('sistema', chiaveFile(profiloId));
}

export function handleSalvato(
	db: Db,
	profiloId: string
): Promise<FileSystemFileHandle | undefined> {
	return db.get<FileSystemFileHandle>('sistema', chiaveFile(profiloId));
}
