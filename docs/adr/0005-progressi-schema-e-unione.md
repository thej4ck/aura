# 0005. Progressi: schema versionato e unione per record

Stato: accettata · 2026-10-21

## Contesto

I progressi vivono solo nel browser (vedi 0002), ma devono sopravvivere a cancellazioni del browser, passare da un dispositivo all'altro tramite file e, in futuro, essere letti da una vista insegnante.
Il file e il browser possono divergere (per esempio un backup vecchio importato dopo settimane di uso): non si deve perdere nessun progresso.

## Decisione

- **Un documento per profilo**, più profili sullo stesso dispositivo fin dalla prima versione. Lo stesso JSON è il dato in IndexedDB, il file esportato e il file sincronizzato.
- Il documento dichiara `formato: 'aura-progressi'` e `schema: 1`. Ogni cambio di forma incrementa `schema` e aggiunge una **migrazione** pura, con test.
- Ogni record (ogni attività, ogni competenza, ogni blocco di `dati` e le `preferenze`) ha il proprio campo **`aggiornato`**.
- La funzione pura **`unisci(a, b)`** applica last-write-wins **record per record**, mai sull'intero documento.
- File: `aura-<parola>-<AAAA-MM-GG>.kgz`, dove `<parola>` è una parola italiana ASCII minuscola associata all'avatar (`volpe` per 🦊; `profilo` per un avatar sconosciuto), mai l'alias del bambino. JSON compresso con `CompressionStream('gzip')`; `.json` semplice dove `CompressionStream` manca. Niente emoji nei nomi di file: si rompono su alcuni file system, archivi e allegati.
- Import: decompressione → controllo della dimensione → validazione Valibot → migrazione → `unisci`. Il file è sempre input non fidato.
- Ogni modifica passa dallo schema Valibot prima di entrare nel documento: un valore fuori schema in IndexedDB farebbe fallire la migrazione al riavvio e il profilo sparirebbe. Ogni salvataggio unisce con il documento già in IndexedDB, così più schede aperte sullo stesso profilo non si cancellano i record a vicenda.
- La sincronizzazione riscrive senza unire solo un file vuoto. Un file collegato che non si legge (versione più nuova del sito, modificato a mano, danneggiato) o di un altro profilo ferma la sincronizzazione: decide l'adulto.
- Sincronizzazione automatica con la File System Access API dove esiste (Chrome, Edge); altrove esporta e importa. `navigator.storage.persist()` al primo salvataggio, PWA installabile per evitare la pulizia di Safari, avviso per l'adulto se l'ultimo backup ha più di 14 giorni.

## Conseguenze

- File e browser possono divergere senza perdere progressi; la stessa `unisci` servirà per il trasferimento tra dispositivi e per la vista insegnante.
- Una cancellazione non può essere l'assenza di una chiave (l'unione la farebbe ricomparire): va rappresentata come record con un `aggiornato` più recente.
- A parità di `aggiornato` la scelta deve essere deterministica, così `unisci(a, b)` e `unisci(b, a)` danno lo stesso risultato.
- L'ordine dipende dagli orologi dei dispositivi: per progressi scolastici è un compromesso accettabile.
- Gli id usati come chiavi non si rinominano mai: se serve, migrazione.

## Nota sul nome del formato

Il formato è stato rinominato (`kindergarden-progressi` → `aura-progressi`, database IndexedDB `kindergarden` → `aura`) prima del primo rilascio, quindi senza migrazione: non esistevano utenti né dati. Da ora gli id e il formato sono stabili.
