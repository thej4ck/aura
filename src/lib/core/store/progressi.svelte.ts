// Stato reattivo dei progressi (profilo attivo, profili, sync su file).
// All'import non tocca IndexedDB, window o document: tutto parte da carica(), che nel prerender non fa nulla.
// Ogni modifica passa dagli schemi Valibot prima di entrare nel documento: un valore fuori schema in IndexedDB
// farebbe fallire migra() al riavvio e il profilo sparirebbe dall'elenco.
import * as v from 'valibot';
import { scegli } from '../casuale';
import { registraErrore } from '../errori';
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
	nuovoDocumento,
	SchemaDocumento,
	SchemaPreferenze,
	SchemaProfilo,
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
const iso = (ms: number) => new Date(ms).toISOString();
const ora = () => iso(Date.now());
// le mappe del documento: validano insieme la chiave (id qualificato) e il record
const {
	attivita: SchemaMappaAttivita,
	competenze: SchemaMappaCompetenze,
	dati: SchemaMappaDati
} = SchemaDocumento.entries;

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
	/** documenti in IndexedDB che questa versione non sa leggere (es. scritti da una più nuova): restano lì, non si cancellano */
	illeggibili = $state(0);
	pronto = $state(false);

	#db: Db | undefined;
	#handle: FileSystemFileHandle | undefined;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#sporco = false;
	#coda: Promise<void> = Promise.resolve();
	#persistenzaChiesta = false;
	#ultimoIstante = 0;

	/**
	 * Apre il db, carica i profili e attiva l'ultimo usato (al primo avvio ne crea uno). In SSR non fa nulla.
	 * Se IndexedDB si apre ma poi non risponde (disco pieno, connessione persa su iOS) si continua in memoria,
	 * con l'avviso per l'adulto, invece di restare senza profilo.
	 */
	async carica(): Promise<void> {
		if (typeof window === 'undefined' || this.#db) return;
		try {
			await this.#avvia(await apriDb());
		} catch (e) {
			registraErrore(e);
			if (this.doc) this.erroreSalvataggio = true;
			else await this.#avvia(await apriDb(null));
		}
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') void this.flush();
		});
		window.addEventListener('pagehide', () => void this.flush());
		this.pronto = true;
	}

	/** Lancia ValiError se avatar o alias non sono validi (e non salva niente). */
	async creaProfilo(avatar: string, alias?: string): Promise<Profilo> {
		const doc = v.parse(SchemaDocumento, nuovoDocumento(avatar, alias));
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

	/**
	 * Avatar e alias (un alias vuoto o di soli spazi toglie l'alias). Aggiorna anche `preferenze.aggiornato`:
	 * nell'unione il profilo segue le preferenze. Valori non validi → ValiError, e niente cambia.
	 */
	aggiornaProfilo(patch: Partial<Omit<Profilo, 'id'>>): void {
		const doc = this.#documento();
		const { alias, ...resto } = { ...doc.profilo, ...patch, id: doc.profilo.id };
		doc.profilo = v.parse(SchemaProfilo, alias?.trim() ? { ...resto, alias } : resto);
		doc.preferenze.aggiornato = this.#adesso();
		this.#rifletti();
		this.#programma();
	}

	/** Valori non validi → ValiError, e niente cambia. Gli oggetti annidati vanno passati interi. */
	aggiornaPreferenze(patch: Partial<Omit<Preferenze, 'aggiornato'>>): void {
		const doc = this.#documento();
		doc.preferenze = v.parse(SchemaPreferenze, {
			...doc.preferenze,
			...patch,
			aggiornato: this.#adesso()
		});
		this.#programma();
	}

	/** Crea o aggiorna il record di un'attività (es. `{ stato: 'in_corso', scheda: 2 }`). Id o valori non validi → ValiError. */
	aggiornaAttivita(id: string, patch: Partial<Omit<RecordAttivita, 'aggiornato'>>): RecordAttivita {
		const doc = this.#documento();
		const prev = doc.attivita[id] ?? { stato: 'nuova', scheda: 0, stelle: 0, tentativi: 0 };
		const nuovo = { [id]: { ...prev, ...patch, aggiornato: this.#adesso() } };
		doc.attivita[id] = v.parse(SchemaMappaAttivita, nuovo)[id];
		this.#programma();
		return doc.attivita[id];
	}

	/**
	 * Esito di una verifica (fase "prova"): l'attività diventa completata se superata (e lo resta),
	 * stelle e tentativi si aggiornano, ogni competenza allenata passa da `aggiornaCompetenza`.
	 * Con `esito.risposte === 0` (niente da valutare) le competenze non cambiano.
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
		// tutto validato prima di toccare il documento: o cambia tutto o niente
		const attivita = v.parse(SchemaMappaAttivita, { [attivitaId]: record });
		const competenze = v.parse(
			SchemaMappaCompetenze,
			Object.fromEntries(
				(esito.risposte === 0 ? [] : competenzeIds).map((id) => [
					id,
					aggiornaCompetenza(doc.competenze[id], esito, oggi)
				])
			)
		);
		Object.assign(doc.attivita, attivita);
		Object.assign(doc.competenze, competenze);
		this.#programma();
		return attivita[attivitaId];
	}

	/** Blocco di dati di un modulo (`musica.canto`): la forma la decide il modulo. */
	aggiornaDati(moduloId: string, patch: Record<string, unknown>): RecordDati {
		const doc = this.#documento();
		const nuovo = { [moduloId]: { ...doc.dati[moduloId], ...patch, aggiornato: this.#adesso() } };
		doc.dati[moduloId] = v.parse(SchemaMappaDati, nuovo)[moduloId];
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
			this.#rifletti();
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

	/** Riprende la sync (dopo un riavvio o un errore): chiede il permesso, legge il file, unisce e riscrive. */
	async riprendiSync(): Promise<void> {
		this.#handle ??= await handleSalvato(this.#richiediDb(), this.#documento().profilo.id);
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
		if (doc) await this.importaEUnisci(doc); // un file vuoto si collega e basta
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

	async #avvia(db: Db): Promise<void> {
		this.#db = db;
		this.persistente = db.persistente;
		await this.#aggiornaProfili();
		const salvato = await db.get<string>('sistema', CHIAVE_ATTIVO);
		const id = this.profili.find((p) => p.id === salvato)?.id ?? this.profili[0]?.id;
		if (id) await this.scegliProfilo(id);
		else await this.creaProfilo(scegli(AVATARI, Math.random));
	}

	async #aggiornaProfili(): Promise<void> {
		const docs = await this.#richiediDb().tutti<unknown>('profili');
		// ponytail: un documento illeggibile resta nel db, non compare e si conta (avviso nel layout); un export grezzo per l'adulto se mai servirà
		let illeggibili = 0;
		this.profili = docs.flatMap((d) => {
			try {
				return [migra(d).profilo];
			} catch (e) {
				illeggibili++;
				registraErrore(e);
				return [];
			}
		});
		this.illeggibili = illeggibili;
	}

	/** L'elenco dei profili mostra avatar e alias del documento attivo. */
	#rifletti(): void {
		const { profilo } = this.#documento();
		this.profili = this.profili.map((p) => (p.id === profilo.id ? { ...profilo } : p));
	}

	/**
	 * Istante per `aggiornato`: sempre successivo al precedente di questa istanza, così nell'unione con
	 * IndexedDB (#salva) una modifica nuova non pareggia mai con quella salvata un attimo prima.
	 */
	#adesso(): string {
		this.#ultimoIstante = Math.max(Date.now(), this.#ultimoIstante + 1);
		return iso(this.#ultimoIstante);
	}

	#programma(): void {
		this.#sporco = true;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => void this.flush(), SALVA_DOPO_MS);
	}

	/**
	 * Valida e unisce con quello che c'è già in IndexedDB prima di scrivere: un'altra scheda aperta sullo stesso
	 * profilo può aver salvato record che questa non ha in memoria (unisci lavora per record, non si perde niente).
	 * Un documento non valido, o illeggibile in IndexedDB, non si scrive: si segnala e si ritenta al flush dopo.
	 */
	async #salva(): Promise<void> {
		if (!this.doc) return;
		const db = this.#richiediDb();
		let doc: Documento;
		try {
			doc = v.parse(SchemaDocumento, $state.snapshot(this.doc));
			const salvato = await db.get<unknown>('profili', doc.profilo.id);
			if (salvato) doc = unisci(migra(salvato), doc);
			await db.put('profili', doc);
			this.erroreSalvataggio = false;
		} catch (e) {
			registraErrore(e);
			this.erroreSalvataggio = true;
			this.#sporco = true;
			return;
		}
		// ponytail: l'altra scheda vede questi record solo quando ricarica; BroadcastChannel se servirà dal vivo
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
			// solo un file vuoto (undefined) si riscrive senza unire. Uno illeggibile (versione più nuova del sito,
			// modificato a mano, danneggiato) o di un altro profilo (unisci lancia) può contenere progressi: si ferma tutto
			const suFile = await leggi(handle);
			if (suFile) this.doc = unisci($state.snapshot(this.#documento()), suFile);
			this.#rifletti();
			this.#sporco = true;
			await this.flush();
		} catch (e) {
			registraErrore(e);
			// il collegamento resta in IndexedDB, ma non si scrive sul file finché riprendiSync non riesce a leggerlo
			this.#handle = undefined;
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
