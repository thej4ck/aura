// Stato reattivo dei progressi (profilo attivo, profili, sync su file).
// All'import non tocca IndexedDB, window o document: tutto parte da carica(), che nel prerender non fa nulla.
import { scegli } from '../casuale';
import { giorno } from '../giorno';
import { aggiornaCompetenza, calcolaStelle, type Esito } from '../padronanza';
import { apriDb, type Db } from './db';
import {
	collegaFileEsistente,
	collegaNuovoFile,
	esporta,
	handleSalvato,
	leggi,
	permesso,
	salvaHandle,
	scrivi
} from './file';
import { migra } from './migrazioni';
import {
	ErroreProgressi,
	nuovoDocumento,
	type Documento,
	type Preferenze,
	type Profilo,
	type RecordAttivita,
	type RecordDati
} from './schema-progressi';
import { unisci } from './unisci';

/** Ritardo del salvataggio dopo l'ultima modifica. */
export const SALVA_DOPO_MS = 400;
/** Avatar proposti a un nuovo profilo; al primo avvio se ne sceglie uno a caso. */
export const AVATARI = ['🦊', '🐻', '🐼', '🐨', '🐸', '🦉', '🐙', '🦋', '🐢', '🐧'] as const;

/**
 * Sincronizzazione con il file collegato (File System Access).
 * 'in-pausa': c'è un file ma manca il permesso di scrittura, serve un gesto dell'utente (riprendiSync).
 */
export type StatoSync = 'nessuna' | 'attiva' | 'in-pausa' | 'errore';

const CHIAVE_ATTIVO = 'profiloAttivo';
const ora = () => new Date().toISOString();

export class Progressi {
	/** profili presenti sul dispositivo */
	profili: Profilo[] = $state([]);
	/** documento del profilo attivo; undefined prima di carica() */
	doc: Documento | undefined = $state();
	/** false se IndexedDB manca o è bloccato: i dati vivono solo in memoria */
	persistente = $state(true);
	sync: StatoSync = $state('nessuna');
	/** true quando l'ultimo salvataggio su IndexedDB è fallito (si ritenta al prossimo flush) */
	erroreSalvataggio = $state(false);
	pronto = $state(false);

	#db: Db | undefined;
	#handle: FileSystemFileHandle | undefined;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#sporco = false;
	#coda: Promise<void> = Promise.resolve();
	#persistenzaChiesta = false;

	/** Apre il db, carica i profili e attiva l'ultimo usato (al primo avvio ne crea uno). In SSR non fa nulla. */
	async carica(): Promise<void> {
		if (typeof window === 'undefined' || this.#db) return;
		const db = (this.#db = await apriDb());
		this.persistente = db.persistente;
		await this.#aggiornaProfili();
		const salvato = await db.get<string>('sistema', CHIAVE_ATTIVO);
		const id = this.profili.find((p) => p.id === salvato)?.id ?? this.profili[0]?.id;
		if (id) await this.scegliProfilo(id);
		else await this.creaProfilo(scegli(AVATARI, Math.random));
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') void this.flush();
		});
		window.addEventListener('pagehide', () => void this.flush());
		this.pronto = true;
	}

	async creaProfilo(avatar: string, alias?: string): Promise<Profilo> {
		const doc = nuovoDocumento(avatar, alias);
		await this.#richiediDb().put('profili', doc);
		this.#chiediPersistenza();
		await this.#aggiornaProfili();
		await this.scegliProfilo(doc.profilo.id);
		return doc.profilo;
	}

	/** Rende attivo un profilo (dopo aver salvato quello corrente) e riprende la sua sync, se il permesso c'è già. */
	async scegliProfilo(id: string): Promise<void> {
		const db = this.#richiediDb();
		await this.flush();
		const salvato = await db.get<unknown>('profili', id);
		if (!salvato) throw new Error(`Profilo ${id} non trovato.`);
		this.doc = migra(salvato);
		await db.put('sistema', id, CHIAVE_ATTIVO);
		this.#handle = await handleSalvato(db, id);
		this.sync = this.#handle ? 'in-pausa' : 'nessuna';
		if (this.#handle) await this.#sincronizza(false);
	}

	/** Cancella profilo e collegamento al file (non il file). Se era attivo passa a un altro o ne crea uno nuovo. */
	async eliminaProfilo(id: string): Promise<void> {
		const db = this.#richiediDb();
		if (this.doc?.profilo.id === id) {
			clearTimeout(this.#timer);
			this.#sporco = false; // un salvataggio in sospeso lo farebbe risorgere
			await this.#coda;
			this.doc = undefined;
			this.#handle = undefined;
			this.sync = 'nessuna';
		}
		await db.del('profili', id);
		await salvaHandle(db, id, null);
		await this.#aggiornaProfili();
		if (!this.doc) {
			const altro = this.profili[0];
			if (altro) await this.scegliProfilo(altro.id);
			else await this.creaProfilo(scegli(AVATARI, Math.random));
		}
	}

	/** Avatar e alias. Aggiorna anche `preferenze.aggiornato`: nell'unione il profilo segue le preferenze. */
	aggiornaProfilo(patch: Partial<Omit<Profilo, 'id'>>): void {
		const doc = this.#documento();
		doc.profilo = { ...doc.profilo, ...patch };
		doc.preferenze.aggiornato = ora();
		this.profili = this.profili.map((p) => (p.id === doc.profilo.id ? { ...doc.profilo } : p));
		this.#programma();
	}

	aggiornaPreferenze(patch: Partial<Omit<Preferenze, 'aggiornato'>>): void {
		const doc = this.#documento();
		doc.preferenze = { ...doc.preferenze, ...patch, aggiornato: ora() };
		this.#programma();
	}

	/** Crea o aggiorna il record di un'attività (es. `{ stato: 'in_corso', scheda: 2 }`). */
	aggiornaAttivita(id: string, patch: Partial<Omit<RecordAttivita, 'aggiornato'>>): RecordAttivita {
		const doc = this.#documento();
		const prev = doc.attivita[id] ?? { stato: 'nuova', scheda: 0, stelle: 0, tentativi: 0 };
		doc.attivita[id] = { ...prev, ...patch, aggiornato: ora() };
		this.#programma();
		return doc.attivita[id];
	}

	/**
	 * Esito di una verifica (fase "prova"): l'attività diventa completata se superata (e lo resta),
	 * stelle e tentativi si aggiornano, ogni competenza allenata passa da `aggiornaCompetenza`.
	 */
	registraVerifica(
		attivitaId: string,
		competenzeIds: readonly string[],
		esito: Esito,
		oggi: Date
	): RecordAttivita {
		const doc = this.#documento();
		const prev = doc.attivita[attivitaId];
		const g = giorno(oggi);
		const record: RecordAttivita = {
			stato: esito.superata || prev?.stato === 'completata' ? 'completata' : 'in_corso',
			scheda: prev?.scheda ?? 0,
			stelle: calcolaStelle(prev, esito, oggi),
			tentativi: (prev?.tentativi ?? 0) + 1,
			ultimaVolta: g,
			aggiornato: oggi.toISOString()
		};
		const primaVolta = prev?.primaVolta ?? (esito.superata ? g : undefined);
		if (primaVolta) record.primaVolta = primaVolta;
		doc.attivita[attivitaId] = record;
		for (const id of competenzeIds) {
			doc.competenze[id] = aggiornaCompetenza(doc.competenze[id], esito, oggi);
		}
		this.#programma();
		return record;
	}

	/** Blocco di dati di un modulo (`musica.canto`): la forma la decide il modulo. */
	aggiornaDati(moduloId: string, patch: Record<string, unknown>): RecordDati {
		const doc = this.#documento();
		doc.dati[moduloId] = { ...doc.dati[moduloId], ...patch, aggiornato: ora() };
		this.#programma();
		return doc.dati[moduloId];
	}

	/**
	 * Importa un documento già letto e validato (`importa` di file.ts): stesso profilo → unione;
	 * profilo già sul dispositivo → unione e passaggio a quello; profilo nuovo → aggiunto e scelto.
	 */
	async importaEUnisci(importato: Documento): Promise<Documento> {
		const db = this.#richiediDb();
		const doc = this.#documento();
		const id = importato.profilo.id;
		if (id === doc.profilo.id) {
			this.doc = unisci($state.snapshot(doc), importato);
			this.#sporco = true;
			await this.flush();
			return this.doc;
		}
		const locale = await db.get<unknown>('profili', id);
		const unito = locale ? unisci(migra(locale), importato) : importato;
		await db.put('profili', unito);
		await this.#aggiornaProfili();
		await this.scegliProfilo(id);
		return unito;
	}

	/** File di backup da far scaricare; segna il backup come fatto adesso. */
	async esportaBackup(): Promise<{ blob: Blob; nomeFile: string }> {
		const doc = this.#documento();
		doc.ultimoBackup = ora();
		this.#programma();
		return esporta($state.snapshot(doc));
	}

	/** Salva subito quello che è in sospeso (e sul file collegato, se la sync è attiva). */
	flush(): Promise<void> {
		clearTimeout(this.#timer);
		if (this.#sporco) {
			this.#sporco = false;
			this.#coda = this.#coda.then(() => this.#salva());
		}
		return this.#coda;
	}

	// --- file collegato (File System Access API); le chiamate con il picker richiedono un gesto dell'utente ---

	/** Riprende la sync dopo un riavvio: chiede il permesso, legge il file, unisce e riscrive. */
	riprendiSync(): Promise<void> {
		return this.#sincronizza(true);
	}

	/** Crea il file di sincronizzazione dove sceglie l'utente. Annullato → AbortError. */
	async collegaNuovoFile(): Promise<void> {
		const doc = this.#documento();
		await this.flush();
		await this.#collega(await collegaNuovoFile($state.snapshot(doc)));
	}

	/** Collega un file esistente: lo importa (anche se di un altro profilo) e lo tiene sincronizzato. */
	async collegaFileEsistente(): Promise<void> {
		const { handle, doc } = await collegaFileEsistente();
		await this.importaEUnisci(doc);
		await this.#collega(handle);
	}

	async scollegaFile(): Promise<void> {
		this.#handle = undefined;
		this.sync = 'nessuna';
		await salvaHandle(this.#richiediDb(), this.#documento().profilo.id, null);
	}

	// --- interni ---

	#richiediDb(): Db {
		if (!this.#db) throw new Error('Progressi non caricati: chiama carica().');
		return this.#db;
	}

	#documento(): Documento {
		if (!this.doc) throw new Error('Nessun profilo attivo: chiama carica().');
		return this.doc;
	}

	async #aggiornaProfili(): Promise<void> {
		const docs = await this.#richiediDb().tutti<unknown>('profili');
		// ponytail: un documento che non passa la validazione resta nel db ma non compare; un recupero se mai servirà
		this.profili = docs.flatMap((d) => {
			try {
				return [migra(d).profilo];
			} catch {
				return [];
			}
		});
	}

	#programma(): void {
		this.#sporco = true;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => void this.flush(), SALVA_DOPO_MS);
	}

	async #salva(): Promise<void> {
		if (!this.doc) return;
		const doc = $state.snapshot(this.doc);
		try {
			await this.#richiediDb().put('profili', doc);
			this.erroreSalvataggio = false;
		} catch {
			this.erroreSalvataggio = true;
			this.#sporco = true;
			return;
		}
		this.#chiediPersistenza();
		await this.#dopoSalvataggio(doc);
	}

	/** Al primo salvataggio chiede al browser di non cancellare i dati del sito (Safari li scade dopo 7 giorni). */
	#chiediPersistenza(): void {
		if (this.#persistenzaChiesta || !this.persistente) return;
		this.#persistenzaChiesta = true;
		navigator.storage?.persist?.().catch(() => {});
	}

	/** Hook dopo ogni salvataggio: con il permesso scrive anche sul file collegato, altrimenti sync in pausa. */
	async #dopoSalvataggio(doc: Documento): Promise<void> {
		const handle = this.#handle;
		if (!handle) return;
		if (!(await permesso(handle, false))) {
			this.sync = 'in-pausa';
			return;
		}
		try {
			doc.ultimoBackup = ora(); // il file è il backup: porta con sé la data
			await scrivi(handle, doc);
			await this.#richiediDb().put('profili', doc);
			if (this.doc?.profilo.id === doc.profilo.id) this.doc.ultimoBackup = doc.ultimoBackup;
			this.sync = 'attiva';
		} catch {
			this.sync = 'errore';
		}
	}

	/** Con il permesso sul file collegato: legge il file, unisce e riscrive. Senza permesso: sync in pausa. */
	async #sincronizza(richiedi: boolean): Promise<void> {
		const handle = this.#handle;
		if (!handle) return;
		if (!(await permesso(handle, richiedi))) {
			this.sync = 'in-pausa';
			return;
		}
		try {
			let unito: Documento = $state.snapshot(this.#documento());
			try {
				unito = unisci(unito, await leggi(handle));
			} catch (e) {
				// un file vuoto o danneggiato si riscrive; un file di un altro profilo no
				if (e instanceof ErroreProgressi && e.codice === 'profili-diversi') throw e;
			}
			this.doc = unito;
			this.#sporco = true;
			await this.flush();
		} catch {
			this.sync = 'errore';
		}
	}

	async #collega(handle: FileSystemFileHandle): Promise<void> {
		this.#handle = handle;
		await salvaHandle(this.#richiediDb(), this.#documento().profilo.id, handle);
		this.#sporco = true;
		await this.flush();
	}
}

export const progressi = new Progressi();
