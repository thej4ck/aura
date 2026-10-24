# 0007. Statistiche d'uso anonime e aggregate

Stato: accettata · 2026-10-24 · modifica la 0002 (zero dati personali) e la 0001 (browser-first)

## Contesto

Le prove vere con i bambini mostrano problemi che i test non vedono: il microfono che non si apre su certi tablet, prove di canto che scadono, attività lasciate a metà. Oggi li conosciamo solo se un adulto li segnala.
Per capire dove ci sono errori o blocchi e quali attività sono troppo difficili servono dei numeri, raccolti senza dati personali.
La 0002 vietava ogni telemetria e la 0001 il lavoro lato server senza una valutazione scritta: questa è quella valutazione.

## Decisione

Il sito conta alcuni eventi in forma anonima e aggregata. Li manda al nostro server, sullo stesso dominio, e lì diventano solo contatori.

- **Cosa si conta**: un evento è un nome più pochi campi tecnici, validati da `statistiche/conteggi.mjs`. Un evento con un campo in più si scarta tutto.
  - `inizio` (attività), `scheda` (attività, numero della scheda raggiunta), `fine` (attività, esito: superata, quasi, vuota);
  - `scaduta` e `voce-forte` (attività, scheda): la prova di canto finita senza riuscire, il consiglio di non forzare la voce;
  - `mic` (codice dell'errore, browser e sistema in breve, es. «Chrome 140, Android»): il microfono che non si apre;
  - `errore` (percorso della pagina, tipo di errore, browser e sistema in breve): mai il messaggio né lo stack.
- **Cosa non si conta mai**: identificativi di nessun tipo, nomi o alias, progressi, audio, indirizzi IP, user agent completi, orari precisi, provenienza. Senza identificativi due eventi dello stesso bambino non si possono collegare tra loro.
- **Aggregazione al momento della scrittura**: il servizio non tiene gli eventi. Aumenta di uno il contatore `giorno|evento|campi` e salva solo i contatori.
- **Niente IP**: Caddy inoltra `/statistiche/*` al servizio sulla rete privata di Railway e toglie `X-Forwarded-For`, `X-Real-Ip` e `X-Envoy-External-Address`. Il servizio non scrive registri delle richieste. Il proxy di Railway vede l'IP come per ogni pagina, già detto nella privacy.
- **Nel browser**: `src/lib/core/statistiche.ts` usa `navigator.sendBeacon` verso `'self'`: la CSP non cambia (`connect-src 'self'`). Niente cookie, storage o identificativi. Non parte niente se il browser manda Global Privacy Control o Do Not Track, né in sviluppo o in locale.
- **Consenso**: non si chiede. Non ci sono dati personali né accesso al dispositivo oltre quello che serve a mostrare il sito, e l'uso è dichiarato nella pagina per i genitori e in Informazioni.
- **Lettura**: `GET /statistiche/riepilogo` con la chiave segreta `STATISTICHE_CHIAVE` (variabile del servizio su Railway, mai nel repo). Si legge con `scripts/statistiche.mjs`.
- **Servizio**: `statistiche/` (Node 24, nessuna dipendenza, Dockerfile proprio) è un servizio a parte nello stesso progetto Railway, con un volume su `/data`. Abbiamo scelto un servizio separato invece di mettere Node nel container di Caddy: un processo per container e un deploy indipendente.

## Configurazione su Railway

Railway ha deprecato `railway.json` («Config as Code»): quello nella radice tiene solo il build con il Dockerfile, che vale per entrambi i servizi. Il resto sta nelle impostazioni dei servizi (dashboard o API):

- servizio `statistiche`: Root Directory `statistiche`, watch path `/statistiche/**`, healthcheck `/statistiche/salute`, niente sospensione e niente dominio pubblico, volume su `/data`, variabili `PORT=8080` e `STATISTICHE_CHIAVE`;
- servizio del sito: healthcheck `/`, sospensione attiva, variabile `STATISTICHE_HOST=statistiche.railway.internal:8080`.

## Alternative scartate

- **Servizi di analytics esterni** (Plausible, Umami cloud, Google Analytics): i dati e l'IP passerebbero da terzi, contro la 0002.
- **Analytics self-hosted completi** (Umami, Plausible CE): tengono gli eventi singoli e chiedono un database; per dei contatori sono troppo.
- **Solo i log di Caddy**: niente servizio nuovo, ma gli eventi resterebbero singoli finché non si sommano, e Railway tiene i log pochi giorni.

## Conseguenze

- Ogni evento nuovo si aggiunge qui, in `statistiche/conteggi.mjs`, in `src/lib/core/statistiche.ts` e nei testi della privacy (`genitori_privacy_invii` e `informazioni_gratuito_testo`). Un test verifica che ogni evento del sito sia accettato dal servizio.
- Chi manda eventi falsi può sporcare i numeri, ma non riempire il disco: i contatori diversi sono al massimo 50.000 e il corpo di una richiesta al massimo 1 KB.
- Il servizio costa poco (un processo Node piccolo e un volume) e non va in sospensione: deve poter ricevere dalla rete privata.
