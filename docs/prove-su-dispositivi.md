# Prove su dispositivi veri prima del rilascio

I test automatici (Vitest, Playwright) non hanno audio, microfono né Safari mobile. Questa lista copre quello che si può verificare solo con dispositivi e bambini veri. Segna ogni voce con data, dispositivo, versione del sistema e esito; se una prova fallisce, apri una issue con quei dati.

Le costanti da calibrare sono in `src/lib/core/audio/costanti.ts`. Cambiarle non tocca i salvataggi.

## iPhone e iPad (Safari, Safari 16.4 o successivo)

La sessione audio è gestita in `src/lib/core/audio/contesto.ts`.

- [ ] **Tasto silenzioso attivo**: i suoni del sito (note, accordi, feedback) si sentono comunque. Modalità `playback`: è una scelta di prodotto confermata (il sito si comporta come un video), non un difetto.
- [ ] **Microfono aperto** (attività di canto): il sito continua a suonare dall'**altoparlante** e non dall'auricolare di chiamata; il volume non crolla.
- [ ] Il microfono non si sente "rientrare" nelle note suonate dal sito (il bambino ascolta, poi canta: durante il suono del sito il microfono non ascolta).
- [ ] **Chiusura del microfono** (fine attività, cambio pagina, scheda in background): l'audio torna in `playback`, di nuovo udibile col tasto silenzioso; l'indicatore del microfono di Safari si spegne.
- [ ] Richiesta del permesso del microfono: testo chiaro; negandolo l'attività propone un'alternativa e non si blocca.
- [ ] Rotazione dello schermo, blocco e sblocco, ritorno da un'altra app: l'audio riparte al primo tocco.
- [ ] **Salvataggio dopo ore in background** (iOS 17.4 o successivo, WebKit 273827): se compare l'avviso di salvataggio, annota se basta ricaricare la pagina. In quel caso la riapertura del database sull'evento `close` (`src/lib/core/store/db.ts`) può farlo da sola.
- [ ] Sia iPhone sia iPad, con almeno una versione di iOS/iPadOS recente e una più vecchia ancora supportata.

## Android (Chrome)

- [ ] Suoni udibili, nessun ritardo percepibile tra tocco e suono.
- [ ] Microfono: permesso richiesto una volta, canto riconosciuto; l'echo cancellation del telefono non spegne la voce.
- [ ] Almeno un telefono economico e un tablet: latenza e prestazioni del riconoscimento dell'altezza.
- [ ] Bluetooth e cuffie: audio e microfono sul dispositivo giusto; il ritardo del Bluetooth non fa fallire le prove.
- [ ] Tastiera, TalkBack e zoom del testo: target ≥48px, focus visibile, niente testo tagliato.

## Firefox (computer e Android)

I test automatici girano solo su Chromium: la finestra del permesso di Firefox non si vede mai.

- [ ] **Persistenza dei dati**: durante il gioco Firefox non chiede niente. In Per i genitori › Backup e app ci sono l'avviso e il pulsante «Chiedi a Firefox di conservare i dati»; superato il controllo per gli adulti compare la finestra di Firefox, e l'esito si legge sotto. Dopo «Consenti» o «Non consentire», alla visita successiva avviso e pulsante non ci sono più.

## Calibrazione con bambini veri

Con bambini di età diverse (in particolare 6-7 e 9-10 anni), in stanze vere (silenziosa, con rumore di fondo), su tablet e telefoni veri. Annota per ogni costante il valore che funziona e quello attuale.

- [ ] `GATE_RMS` (0.01): la voce sommessa di un bambino timido supera la soglia; il rumore di fondo di un'aula non la supera.
- [ ] `PASSA_BASSO_HZ` (2000): con ventola, fruscio e respiro la nota viene riconosciuta lo stesso; la voce acuta dei bambini piccoli non viene tagliata.
- [ ] Soglie di tenuta: `TENUTA_MS` (3 s), `TENUTA_SEQUENZA_MS` (600 ms) e `CALO_TENUTA` (0.5). Tenere la nota è raggiungibile ma non banale; il calo fuori zona non frustra.
- [ ] `ASCOLTO_MAX_MS` (20 s): il consiglio con "Riprova" non arriva troppo presto, né troppo tardi.
- [ ] Tolleranze `TOLLERANZE_CENTS` (facile ±50, medio ±30, preciso ±15): "facile" accoglie i bambini piccoli senza regalare la nota; "preciso" è alla portata di chi canta bene.
- [ ] `FINESTRA_NOTA_COMODA_MS` e `COPERTURA_NOTA_COMODA`: la "nota comoda" proposta è davvero comoda da cantare.
- [ ] Il feedback resta formativo e senza pressione (nessun conto alla rovescia, nessun "sbagliato").
- [ ] Latenza audio: la manopola «Ritardo dell'audio» in `/genitori` (0-500 ms). Misura il ritardo reale sui dispositivi di prova (con e senza cuffie Bluetooth) e annota quanto serve.

## Ritmo (il modulo è in bozza fino a queste prove)

- [ ] Legnetto e clic udibili, anche col tasto silenzioso su iOS; il clic piano del turno col tocco si sente ma non copre il legnetto.
- [ ] Il tocco sul tasto grande: un battito per tocco, anche con due dita o il palmo; a tempo la prova riesce senza cuffie e con le cuffie Bluetooth (se dice sempre «dopo il clic», prova la manopola della latenza).
- [ ] Battere le mani su Safari (iPhone, iPad) e Firefox: i battiti arrivano (nella vetrina `/dev`, pannello «Battiti di mani», la cattura dice `worklet` o `raf`); il microfono non salta durante il turno; una chiamata o il microfono scollegato riportano il turno all'inizio.
- [ ] La voce che dice le sillabe (TA, TI-TI, SST) non conta come battito; in un'aula con eco non si perdono battiti.
- [ ] Su un telefono, col testo «Grande» e «Molto grande», quando tocca al bambino il rigo e il tasto sono sullo schermo, sopra la barra.

## Installazione PWA e offline

- [ ] **iOS**: Condividi, Aggiungi a Home; l'icona e il nome "Aura" sono giusti, l'app si apre a schermo intero.
- [ ] **Android**: installazione da Chrome (banner o menu), icona e nome giusti.
- [ ] **Desktop** (Chrome, Edge): installazione dal browser.
- [ ] Prima visita online, poi modalità aereo: la home e le attività già visitate si aprono; le altre mostrano un messaggio comprensibile.
- [ ] Dopo un nuovo rilascio, la versione nuova arriva alla visita successiva online (il service worker cambia cache col `version`) e le vecchie cache spariscono.
- [ ] Nessuna richiesta di rete verso terzi (scheda Rete degli strumenti di sviluppo) e nessun cookie.
- [ ] Safari non installato: l'avviso sulla cancellazione dei dati dopo 7 giorni compare e invita a installare l'app.

## Backup e ripristino tra dispositivi

- [ ] Da `/genitori` scarica il backup: il nome è `aura-<parola>-<AAAA-MM-GG>.kgz` (parola ASCII dell'avatar), senza emoji né il nome del bambino.
- [ ] Trasferisci il file (AirDrop, e-mail, cartella condivisa) su un altro dispositivo, anche di sistema diverso (iPhone, Android, computer) e importalo: profilo, progressi e preferenze identici.
- [ ] Importa lo stesso file due volte: nessun duplicato, nessuna perdita.
- [ ] Progressi diversi sui due dispositivi: dopo l'importazione si uniscono record per record (vince il più recente), nessuno si perde.
- [ ] Browser senza `CompressionStream`: il backup è un `.json` che si reimporta.
- [ ] File sbagliato o danneggiato (altro formato, troncato, rinominato): messaggio chiaro, nessun dato toccato.
- [ ] Dove c'è la File System Access API (Chrome, Edge): collega un file, gioca, chiudi; il file si aggiorna da solo; scollegalo e ricollegalo.
- [ ] Avviso di backup vecchio (più di 14 giorni) e testo di conferma dopo l'importazione.
