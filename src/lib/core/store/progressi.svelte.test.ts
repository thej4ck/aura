import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apriDb } from './db';
import { leggi, permesso, salvaHandle, scrivi } from './file';
import { AVATARI, Progressi, SALVA_DOPO_MS } from './progressi.svelte';
import { ErroreProgressi, nuovoDocumento, type Documento } from './schema-progressi';

// picker, permessi e scrittura su file restano finti; esporta, salvaHandle e handleSalvato sono quelli veri
vi.mock('./file', async (originale) => ({
	...(await originale<typeof import('./file')>()),
	permesso: vi.fn(async () => false),
	scrivi: vi.fn(async () => {}),
	leggi: vi.fn(async (): Promise<Documento | undefined> => undefined) // file collegato vuoto
}));

const T0 = new Date(2026, 9, 21, 10); // 21 ottobre 2026, ora locale
const eventi: Record<string, () => void> = {};
const handle = { nome: 'finto' } as unknown as FileSystemFileHandle;

/** I documenti salvati davvero in IndexedDB (stessa fabbrica finta). */
const salvati = async () => (await apriDb(indexedDB)).tutti<Documento>('profili');

async function avvia() {
	const p = new Progressi();
	await p.carica();
	return p;
}

beforeEach(() => {
	// fake-indexeddb lavora con setImmediate: resta vero
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
	vi.setSystemTime(T0);
	vi.stubGlobal('indexedDB', new IDBFactory());
	vi.stubGlobal('window', { addEventListener: (n: string, f: () => void) => (eventi[n] = f) });
	vi.stubGlobal('document', {
		visibilityState: 'visible',
		addEventListener: (n: string, f: () => void) => (eventi[n] = f)
	});
	vi.clearAllMocks();
	vi.mocked(permesso).mockResolvedValue(false);
	vi.mocked(scrivi).mockResolvedValue(undefined);
	vi.mocked(leggi).mockResolvedValue(undefined);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('avvio', () => {
	it('nel prerender non fa nulla', async () => {
		vi.stubGlobal('window', undefined);
		const p = await avvia();
		expect(p.pronto).toBe(false);
		expect(p.doc).toBeUndefined();
		expect(() => p.aggiornaPreferenze({})).toThrow(/carica/);
	});

	it('al primo avvio crea un profilo con un avatar della lista e lo ricorda', async () => {
		const p = await avvia();
		expect(p.pronto).toBe(true);
		expect(p.persistente).toBe(true);
		expect(p.sync).toBe('nessuna');
		expect(p.profili).toHaveLength(1);
		expect(AVATARI).toContain(p.doc?.profilo.avatar);
		expect(await salvati()).toEqual([p.doc]);

		const q = await avvia(); // stessa IndexedDB: ritrova lo stesso profilo attivo
		expect(q.profili).toHaveLength(1);
		expect(q.doc?.profilo.id).toBe(p.doc?.profilo.id);
	});

	it('senza IndexedDB resta in memoria e lo dice', async () => {
		vi.stubGlobal('indexedDB', undefined);
		const p = await avvia();
		expect(p.persistente).toBe(false);
		expect(p.doc).toBeDefined();
	});
});

describe('salvataggio', () => {
	it('è debounced: più modifiche, un salvataggio dopo SALVA_DOPO_MS', async () => {
		const p = await avvia();
		p.aggiornaPreferenze({ tolleranza: 'medio' });
		await vi.advanceTimersByTimeAsync(SALVA_DOPO_MS - 50);
		const t1 = new Date().toISOString();
		p.aggiornaDati('musica.canto', { estensione: [] }); // rimanda il salvataggio
		await vi.advanceTimersByTimeAsync(SALVA_DOPO_MS - 50);
		expect((await salvati())[0].preferenze.tolleranza).toBe('facile'); // non ancora
		await vi.advanceTimersByTimeAsync(50);
		await p.flush(); // attende il salvataggio partito dal timer
		const [doc] = await salvati();
		expect(doc.preferenze.tolleranza).toBe('medio');
		expect(doc.preferenze.aggiornato).toBe(T0.toISOString());
		expect(doc.dati['musica.canto']).toEqual({ estensione: [], aggiornato: t1 });
	});

	it('flush salva subito; pagina nascosta o chiusa → flush', async () => {
		const p = await avvia();
		p.aggiornaPreferenze({ nomiNote: 'lettere' });
		await p.flush();
		expect((await salvati())[0].preferenze.nomiNote).toBe('lettere');

		// si aspetta il flush partito dal gestore, senza chiamarne un altro (lo maschererebbe)
		const flush = vi.spyOn(p, 'flush');
		p.aggiornaPreferenze({ latenzaAudioMs: 120 });
		eventi.visibilitychange(); // pagina ancora visibile: niente
		expect(flush).not.toHaveBeenCalled();
		vi.stubGlobal('document', { ...document, visibilityState: 'hidden' });
		eventi.visibilitychange();
		expect(flush).toHaveBeenCalledTimes(1);
		await flush.mock.results[0].value;
		expect((await salvati())[0].preferenze.latenzaAudioMs).toBe(120);

		p.aggiornaPreferenze({ letturaAltaVoce: false });
		eventi.pagehide();
		expect(flush).toHaveBeenCalledTimes(2);
		await flush.mock.results[1].value;
		expect((await salvati())[0].preferenze.letturaAltaVoce).toBe(false);
	});

	it('chiede la persistenza al primo salvataggio', async () => {
		const persist = vi.fn(async () => true);
		vi.stubGlobal('navigator', { storage: { persist } });
		const p = await avvia();
		expect(persist).toHaveBeenCalledTimes(1);
		p.aggiornaPreferenze({ tolleranza: 'preciso' });
		await p.flush();
		expect(persist).toHaveBeenCalledTimes(1);
	});

	it('se IndexedDB rifiuta la scrittura lo segnala e ritenta al flush dopo', async () => {
		const p = await avvia();
		const put = IDBObjectStore.prototype.put;
		IDBObjectStore.prototype.put = () => {
			throw new DOMException('pieno', 'QuotaExceededError');
		};
		try {
			p.aggiornaPreferenze({ tolleranza: 'medio' });
			await p.flush();
			expect(p.erroreSalvataggio).toBe(true);
		} finally {
			IDBObjectStore.prototype.put = put;
		}
		await p.flush();
		expect(p.erroreSalvataggio).toBe(false);
		expect((await salvati())[0].preferenze.tolleranza).toBe('medio');
	});

	it('rifiuta i valori fuori schema senza toccare il documento: al riavvio il profilo è lo stesso', async () => {
		const p = await avvia();
		const id = p.doc!.profilo.id;
		p.aggiornaAttivita('musica.canto.eco', { stato: 'completata', stelle: 2 });
		expect(() => p.aggiornaProfilo({ alias: 'x'.repeat(41) })).toThrow();
		expect(() => p.aggiornaPreferenze({ latenzaAudioMs: 5000 })).toThrow();
		expect(() => p.aggiornaAttivita('musica.canto.eco', { stelle: 9 })).toThrow();
		expect(() => p.aggiornaAttivita('eco', { stato: 'in_corso' })).toThrow(); // id non qualificato
		expect(() => p.aggiornaDati('canto', { x: 1 })).toThrow();
		const verifica = { superata: true, errori: 0 };
		expect(() => p.registraVerifica('musica.canto.eco', ['note'], verifica, T0)).toThrow();
		expect(p.doc!.attivita['musica.canto.eco']).toMatchObject({ stelle: 2, tentativi: 0 });
		expect(p.doc!.profilo.alias).toBeUndefined();
		expect(p.doc!.preferenze.latenzaAudioMs).toBe(0);
		await expect(p.creaProfilo('')).rejects.toThrow();
		await p.flush();

		const q = await avvia();
		expect(q.illeggibili).toBe(0);
		expect(q.profili.map((x) => x.id)).toEqual([id]);
		expect(q.doc!.attivita['musica.canto.eco'].stelle).toBe(2);
		expect(await salvati()).toHaveLength(1);
	});

	it("un alias vuoto o di soli spazi toglie l'alias", async () => {
		const p = await avvia();
		p.aggiornaProfilo({ alias: '  Bea ' });
		expect(p.doc!.profilo.alias).toBe('Bea');
		p.aggiornaProfilo({ alias: '   ' });
		expect(p.doc!.profilo).not.toHaveProperty('alias');
		expect(p.profili[0]).not.toHaveProperty('alias');
	});

	it('un documento modificato a mano fuori schema non arriva in IndexedDB', async () => {
		const p = await avvia();
		p.doc!.preferenze.latenzaAudioMs = 5000; // senza passare dai mutatori
		p.aggiornaDati('musica.canto', { x: 1 });
		await p.flush();
		expect(p.erroreSalvataggio).toBe(true);
		expect((await salvati())[0].preferenze.latenzaAudioMs).toBe(0);
		expect((await avvia()).doc?.profilo.id).toBe(p.doc!.profilo.id);
	});

	it('due schede aperte sullo stesso profilo: i record di entrambe restano', async () => {
		const a = await avvia();
		const b = await avvia();
		expect(b.doc!.profilo.id).toBe(a.doc!.profilo.id);
		a.aggiornaAttivita('musica.canto.eco', { stato: 'completata', stelle: 1 });
		await a.flush();
		b.aggiornaAttivita('musica.canto.note', { stato: 'completata', stelle: 2 });
		await b.flush();
		const [doc] = await salvati();
		expect(Object.keys(doc.attivita).sort()).toEqual(['musica.canto.eco', 'musica.canto.note']);
	});
});

describe('avvio difficile', () => {
	it('senza crypto.randomUUID (http dalla rete locale) il primo avvio crea comunque il profilo', async () => {
		const vero = globalThis.crypto;
		vi.stubGlobal('crypto', { getRandomValues: vero.getRandomValues.bind(vero) });
		const p = await avvia();
		expect(p.pronto).toBe(true);
		expect(p.doc?.profilo.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
		);
	});

	it('IndexedDB che non accetta scritture: si segnala, e senza profili si continua in memoria', async () => {
		const primo = (await avvia()).doc!.profilo.id;
		const put = IDBObjectStore.prototype.put;
		IDBObjectStore.prototype.put = () => {
			throw new DOMException('pieno', 'QuotaExceededError');
		};
		try {
			// il profilo si legge ma non si salva: resta quello, con l'avviso
			const p = await avvia();
			expect(p).toMatchObject({ pronto: true, persistente: true, erroreSalvataggio: true });
			expect(p.doc?.profilo.id).toBe(primo);

			// nessun profilo da leggere e nessuna scrittura possibile: in memoria
			vi.stubGlobal('indexedDB', new IDBFactory());
			const q = await avvia();
			expect(q).toMatchObject({ pronto: true, persistente: false });
			expect(q.doc).toBeDefined();
		} finally {
			IDBObjectStore.prototype.put = put;
		}
	});

	it('un documento che questa versione non sa leggere resta in IndexedDB e si conta', async () => {
		await (await apriDb(indexedDB)).put('profili', { ...nuovoDocumento('🐙'), schema: 2 });
		const p = await avvia();
		expect(p.illeggibili).toBe(1);
		expect(p.profili).toHaveLength(1); // quello nuovo, per poter usare il sito
		expect(await salvati()).toHaveLength(2);
	});
});

describe('attività e competenze', () => {
	it('aggiornaAttivita crea il record se manca', async () => {
		const p = await avvia();
		expect(p.aggiornaAttivita('musica.canto.note', { stato: 'in_corso', scheda: 2 })).toEqual({
			stato: 'in_corso',
			scheda: 2,
			stelle: 0,
			tentativi: 0,
			aggiornato: T0.toISOString()
		});
	});

	it('registraVerifica: completata resta completata, stelle e padronanza da padronanza.ts', async () => {
		const p = await avvia();
		const a = 'musica.pentagramma.note-linee';
		const c = ['musica.pentagramma.note-linee', 'musica.pentagramma.chiave'];
		p.aggiornaAttivita(a, { stato: 'in_corso', scheda: 3 });

		expect(p.registraVerifica(a, c, { superata: true, errori: 1 }, T0)).toEqual({
			stato: 'completata',
			scheda: 3,
			stelle: 2,
			tentativi: 1,
			primaVolta: '2026-10-21',
			ultimaVolta: '2026-10-21',
			aggiornato: T0.toISOString()
		});
		expect(p.doc?.competenze[c[0]]).toMatchObject({ livello: 1, prossimoRipasso: '2026-10-22' });
		expect(p.doc?.competenze[c[1]]?.livello).toBe(1);

		const domani = new Date(2026, 9, 22, 9);
		const r = p.registraVerifica(a, c, { superata: false, errori: 4 }, domani);
		expect(r).toMatchObject({ stato: 'completata', stelle: 2, tentativi: 2 });
		expect(r).toMatchObject({ primaVolta: '2026-10-21', ultimaVolta: '2026-10-22' });
		expect(p.doc?.competenze[c[0]]).toMatchObject({ livello: 1, prossimoRipasso: '2026-10-23' });

		await p.flush();
		expect((await salvati())[0].attivita[a].tentativi).toBe(2);
	});

	it("una verifica non superata su un'attività nuova la lascia in corso", async () => {
		const p = await avvia();
		const r = p.registraVerifica('musica.canto.eco', [], { superata: false, errori: 2 }, T0);
		expect(r).toMatchObject({ stato: 'in_corso', stelle: 0, tentativi: 1 });
		expect(r.primaVolta).toBeUndefined();
	});
});

describe('profili', () => {
	it('crea, sceglie ed elimina; il profilo attivo si ricorda al riavvio', async () => {
		const p = await avvia();
		const primo = p.doc!.profilo.id;
		const bea = await p.creaProfilo('🐻', '  Bea ');
		expect(bea).toEqual({ id: expect.any(String), avatar: '🐻', alias: 'Bea' });
		expect(p.doc?.profilo.id).toBe(bea.id);
		expect(p.profili.map((x) => x.id)).toEqual([primo, bea.id].sort());

		p.aggiornaProfilo({ avatar: '🐼' });
		expect(p.profili.find((x) => x.id === bea.id)?.avatar).toBe('🐼');
		expect(p.doc?.preferenze.aggiornato).toBe(T0.toISOString());

		await p.scegliProfilo(primo);
		expect(p.doc?.profilo.id).toBe(primo);
		expect((await salvati()).find((d) => d.profilo.id === bea.id)?.profilo.avatar).toBe('🐼');
		expect((await avvia()).doc?.profilo.id).toBe(primo);

		await p.eliminaProfilo(bea.id);
		expect(p.profili.map((x) => x.id)).toEqual([primo]);
		expect(p.doc?.profilo.id).toBe(primo);
	});

	it('eliminare il profilo attivo passa a un altro, o ne crea uno; niente salvataggi postumi', async () => {
		const p = await avvia();
		const primo = p.doc!.profilo.id;
		const altro = await p.creaProfilo('🦉');
		p.aggiornaPreferenze({ tolleranza: 'medio' }); // in sospeso sul profilo che stiamo per eliminare
		await p.eliminaProfilo(altro.id);
		expect(p.doc?.profilo.id).toBe(primo);
		await vi.advanceTimersByTimeAsync(SALVA_DOPO_MS);
		expect((await salvati()).map((d) => d.profilo.id)).toEqual([primo]);

		await p.eliminaProfilo(primo);
		expect(p.doc?.profilo.id).not.toBe(primo);
		expect(p.profili).toHaveLength(1);
		expect((await salvati()).map((d) => d.profilo.id)).toEqual([p.doc!.profilo.id]);
	});
});

describe('importaEUnisci', () => {
	it('stesso profilo: unione per record, vince il più recente', async () => {
		const p = await avvia();
		p.aggiornaAttivita('musica.canto.eco', { stato: 'in_corso', scheda: 1 }); // T0
		const file = structuredClone(p.doc!);
		file.attivita['musica.canto.eco'] = {
			stato: 'completata',
			scheda: 0,
			stelle: 1,
			tentativi: 1,
			aggiornato: '2026-10-20T09:00:00.000Z' // il giorno prima di T0: perde
		};
		file.attivita['musica.canto.note'] = {
			stato: 'completata',
			scheda: 0,
			stelle: 3,
			tentativi: 2,
			aggiornato: '2026-10-20T09:00:00.000Z'
		};
		const unito = await p.importaEUnisci(file);
		expect(unito.attivita['musica.canto.eco'].stato).toBe('in_corso');
		expect(unito.attivita['musica.canto.note'].stelle).toBe(3);
		expect((await salvati())[0]).toEqual(unito);
	});

	it("stesso profilo con avatar e alias più recenti: anche l'elenco dei profili li mostra", async () => {
		const p = await avvia();
		const file = structuredClone(p.doc!);
		file.profilo = { ...file.profilo, avatar: '🐢', alias: 'Nuovo' };
		file.preferenze.aggiornato = '2026-10-21T08:00:00.000Z';
		await p.importaEUnisci(file);
		expect(p.profili).toEqual([file.profilo]);
	});

	it('profilo sconosciuto: aggiunto e scelto; già presente: unito', async () => {
		const p = await avvia();
		const primo = p.doc!.profilo.id;
		const nuovo = nuovoDocumento('🐢', 'Tea');
		nuovo.attivita['musica.canto.eco'] = {
			stato: 'completata',
			scheda: 0,
			stelle: 1,
			tentativi: 1,
			aggiornato: '2026-10-20T09:00:00.000Z'
		};
		await p.importaEUnisci(nuovo);
		expect(p.doc?.profilo.id).toBe(nuovo.profilo.id);
		expect(p.profili).toHaveLength(2);

		await p.scegliProfilo(primo);
		const aggiornato = structuredClone(nuovo);
		aggiornato.attivita['musica.canto.eco'].stelle = 3;
		aggiornato.attivita['musica.canto.eco'].aggiornato = '2026-10-21T09:00:00.000Z';
		await p.importaEUnisci(aggiornato);
		expect(p.profili).toHaveLength(2);
		expect(p.doc?.attivita['musica.canto.eco'].stelle).toBe(3);
	});
});

describe('backup e sync su file', () => {
	it('esportaBackup segna ultimoBackup', async () => {
		const p = await avvia();
		const { nomeFile } = await p.esportaBackup();
		expect(nomeFile).toBe('kindergarden-profilo-2026-10-21.kgz');
		expect(p.doc?.ultimoBackup).toBe(T0.toISOString());
		await p.flush();
		expect((await salvati())[0].ultimoBackup).toBe(T0.toISOString());
	});

	it('handle senza permesso: sync in pausa, niente scritture; riprendiSync unisce e riscrive', async () => {
		const p0 = await avvia();
		await salvaHandle(await apriDb(indexedDB), p0.doc!.profilo.id, handle);

		const p = await avvia();
		expect(p.sync).toBe('in-pausa');
		p.aggiornaPreferenze({ tolleranza: 'medio' });
		await p.flush();
		expect(scrivi).not.toHaveBeenCalled();
		expect(p.sync).toBe('in-pausa');

		// il gesto dell'utente: il permesso arriva e il file contiene progressi più vecchi da unire
		vi.mocked(permesso).mockResolvedValue(true);
		const suFile = structuredClone(p.doc!);
		suFile.attivita['musica.canto.eco'] = {
			stato: 'completata',
			scheda: 0,
			stelle: 2,
			tentativi: 1,
			aggiornato: '2026-10-20T09:00:00.000Z'
		};
		vi.mocked(leggi).mockResolvedValue(suFile);
		await p.riprendiSync();
		expect(p.sync).toBe('attiva');
		expect(p.doc?.attivita['musica.canto.eco'].stelle).toBe(2);
		expect(p.doc?.preferenze.tolleranza).toBe('medio');
		expect(scrivi).toHaveBeenCalledTimes(1);
		const scritto = vi.mocked(scrivi).mock.calls[0][1];
		expect(scritto.ultimoBackup).toBe(T0.toISOString());
		expect(p.doc?.ultimoBackup).toBe(T0.toISOString());
		expect((await salvati())[0]).toEqual(scritto);

		// da qui ogni salvataggio scrive anche sul file: si aspetta quello partito dal timer
		const flush = vi.spyOn(p, 'flush');
		p.aggiornaPreferenze({ nomiNote: 'lettere' });
		await vi.advanceTimersByTimeAsync(SALVA_DOPO_MS);
		expect(flush).toHaveBeenCalledTimes(1);
		await flush.mock.results[0].value;
		expect(scrivi).toHaveBeenCalledTimes(2);
		expect(vi.mocked(scrivi).mock.calls[1][1].preferenze.nomiNote).toBe('lettere');

		vi.mocked(scrivi).mockRejectedValueOnce(new Error('disco pieno'));
		p.aggiornaPreferenze({ nomiNote: 'solfeggio' });
		await p.flush();
		expect(p.sync).toBe('errore');
		expect((await salvati())[0].preferenze.nomiNote).toBe('solfeggio'); // su IndexedDB è salvato comunque

		await p.scollegaFile();
		expect(p.sync).toBe('nessuna');
		expect((await avvia()).sync).toBe('nessuna');
	});

	it('un file collegato di un altro profilo non si sovrascrive: sync in errore', async () => {
		const p0 = await avvia();
		await salvaHandle(await apriDb(indexedDB), p0.doc!.profilo.id, handle);
		vi.mocked(permesso).mockResolvedValue(true);
		vi.mocked(leggi).mockResolvedValue(nuovoDocumento('🐙'));
		const p = await avvia();
		expect(p.sync).toBe('errore');
		p.aggiornaPreferenze({ tolleranza: 'medio' });
		await p.flush();
		expect(scrivi).not.toHaveBeenCalled();
	});

	it('un file collegato illeggibile (versione più nuova, modificato a mano) non si sovrascrive', async () => {
		const p0 = await avvia();
		await salvaHandle(await apriDb(indexedDB), p0.doc!.profilo.id, handle);
		vi.mocked(permesso).mockResolvedValue(true);
		vi.mocked(leggi).mockRejectedValue(new ErroreProgressi('versione-futura', 'schema 2'));
		const p = await avvia();
		expect(p.sync).toBe('errore');
		p.aggiornaPreferenze({ tolleranza: 'medio' });
		await p.flush();
		expect(scrivi).not.toHaveBeenCalled();

		// sito aggiornato, il file ora si legge: riprendiSync lo unisce e torna a scriverlo
		vi.mocked(leggi).mockResolvedValue(structuredClone(p.doc!));
		await p.riprendiSync();
		expect(p.sync).toBe('attiva');
		expect(scrivi).toHaveBeenCalledTimes(1);
	});

	it("all'avvio con il permesso già concesso la sync riparte da sola", async () => {
		const p0 = await avvia();
		await salvaHandle(await apriDb(indexedDB), p0.doc!.profilo.id, handle);
		vi.mocked(permesso).mockResolvedValue(true);
		const p = await avvia();
		expect(p.sync).toBe('attiva');
		expect(scrivi).toHaveBeenCalledTimes(1);
	});
});
