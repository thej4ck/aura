# Stato del progetto e prossimi passi

Documento di passaggio tra una sessione di lavoro e la successiva. Va aggiornato a ogni fine fase.

## Stato al 2026-10-25

- **In produzione**: https://aura-production-0151.up.railway.app. Railway fa il deploy a ogni push su `main` di github.com/thej4ck/aura, che è pubblico, con il check `ci` obbligatorio (CI in parallelo, circa 3 minuti). Due servizi: il sito (Caddy) e `statistiche` (contatori anonimi, ADR 0007); la configurazione di Railway è descritta nell'ADR.
- **Area Musica pubblicata**:
  - modulo Pentagramma: 6 lezioni e 3 giochi (che-nota-e con scatole di Leitner, trovala, leggi-e-canta);
  - modulo Canto: 5 lezioni e 3 giochi (tieni-la-nota, eco, estensione vocale per semitoni);
  - percorso consigliato che alterna i due moduli (`src/lib/moduli/musica/area.ts`).
- **Modulo Ritmo, in stato 'bozza'** (`src/lib/moduli/musica/ritmo/`, ADR 0008): non è pubblicato fino alla prova dell'utente.
  - 5 lezioni: il battito; TA e TI-TI; TA-A; la pausa; battute e tempo con l'accento sul primo.
  - 3 giochi: eco ritmica, leggi e batti, che ritmo è? (ascolta e scegli).
  - Input a tocco (pointerdown, Spazio/Invio) e battito di mani dal microfono (`audio/battimani.ts` con AudioWorklet); sillabe TA, TI-TI, TA-A, SST; pause, punto, tempo e rigo ritmico nello schema e in `Staff`.
  - Logica pura in `musica/ritmo.ts` (`valutaBattiti`, `segniBattiti`, `rigoRitmico`...); percussioni e metronomo in `audio/percussioni.ts`.
- **Profili e canto**: i profili hanno un soprannome facoltativo (resta in locale); il turno di canto scorre fino al misuratore (`mostraIntero` in `core/ui/scorrimento.ts`), così sul telefono si vede sempre ciò che serve.
- **Piattaforma**:
  - motore delle attività a schede con widget, catalogo dei moduli, grafo delle competenze con padronanza e ripasso distanziato;
  - progressi in IndexedDB, profili multipli, backup `.kgz` (gzip) e sincronizzazione su file;
  - PWA offline;
  - controllo adulti (GateAdulti), pagine /genitori (cinque schede) e /informazioni;
  - barra in fondo alle attività con «Indietro» e i pulsanti del widget (`AzioniScheda`), sempre sullo schermo;
  - quattro dimensioni del testo (schema dei progressi 2), versione e data della build nel piè di pagina;
  - segnalazioni su GitHub dietro GateAdulti, statistiche d'uso anonime (`scripts/statistiche.mjs` per leggerle).
- **Problemi noti per piattaforma** (regola in CLAUDE.md; rilevamento in `core/piattaforma.ts`, registro in `core/problemi-noti.ts`, avviso `ProblemaNoto`): un avviso breve per l'adulto, solo sul dispositivo coinvolto e dove serve. Attivi:
  - iOS: suoni più piano e cuffie Bluetooth a scatti col microfono aperto (promessa del microfono); permesso del microfono a ogni visita o apertura (Prova il microfono); audio muto dopo un'altra app (Impostazioni); tasto silenzioso con iOS 16 (Impostazioni e pagina dell'area); salvataggio bloccato da iOS 17, dopo un nuovo tentativo o già all'avvio (banner in alto);
  - iOS e Safari per Mac, sito non installato: dati cancellati dopo 7 giorni, dati separati da quelli dell'app (Backup e app; sul Mac solo da Safari 17); Modalità di isolamento (banner in alto);
  - browser senza `outputLatency` (Safari prima della 18.4): ritardo del Bluetooth (Impostazioni, sotto la manopola);
  - Chrome per Android: voce italiana da installare (Impostazioni);
  - Firefox, non su iOS: la persistenza dei dati la chiede l'adulto da Backup e app, dietro il controllo.
  - mitigazioni nel codice, fatte e non ancora provate su un iPhone vero, con l'avviso come ripiego: il contesto audio rimasto muto su iOS ('interrupted', o 'running' con il clock fermo) si rimette in moto con `suspend()` e `resume()` al primo tocco, anche se si ferma con la pagina in vista, e al ritorno sulla pagina; IndexedDB riapre la connessione persa e riprova una volta; senza Web Audio (Modalità di isolamento) Aura resta muta ma giocabile, con un banner, e «Prova il microfono» dice che il browser non lo permette.
- **Audio**:
  - sintetizzatore, microfono con YIN e gate adattivo al rumore di fondo, PitchMeter;
  - animazioni che suonano in sincrono, guidate dall'audio, con test di regressione;
  - diagnostica del microfono in /genitori, sezione «Prova il microfono», con i passi quando il permesso è negato senza richiesta;
  - ascolto fino a 40 s prima di «Riprova» e consiglio di non cantare più forte (`musica/voce-forte.ts`).
- **Qualità**:
  - `npm run verifica` (lint, check, Vitest, build, Playwright) dura circa 3-4 minuti: 487 test unitari e 156 e2e (progetti chromium, dev, mic, mani, voce);
  - durante lo sviluppo solo i test mirati (vedi CLAUDE.md, «Test e verifiche»).

## Prossimi passi, in ordine

0. **Dipendenze**: chiuso, `vitest` 5 è su `main`. Dependabot ignora i major di `@types/node` e di `typescript` (svelte-check supporta TypeScript 6).
1. **Leggere le statistiche** ogni tanto (`STATISTICHE_KEY_FILE=… node scripts/statistiche.mjs`): attività lasciate a metà, schede dove scade il canto, errori del microfono per browser. C'è un contatore di prova `prova.collegamento` del 2026-10-24, da ignorare. Da verificare dal vivo: che GitHub precompili i campi delle segnalazioni.
2. **Rileggere i testi legali** di /informazioni (avvertenze, «così com'è», servizi di terzi) e decidere se aggiungere un contatto email.
3. **Prove su dispositivi veri** con bambini veri: checklist in `docs/prove-su-dispositivi.md`.
   - iPhone/iPad: modalità audio 'playback', sblocco dell'audio, microfono.
   - **Mitigazioni iOS** (voci della checklist, su un iPhone vero): l'audio riparte al primo tocco dopo un'altra app, il blocco dello schermo o il timer dell'Orologio, anche nell'app installata; i progressi si salvano dopo ore in background (iOS 17.4 o successivo); con la Modalità di isolamento il banner compare, le attività restano giocabili in silenzio e «Prova il microfono» spiega perché non si apre.
   - Android.
   - **Ritmo, battito di mani** (da provare su dispositivi veri, bambini compresi):
     - AudioWorklet su Safari/iOS e su Firefox (se manca, c'è il ripiego: la diagnostica in /genitori mostra la modalità di cattura);
     - latenza Bluetooth: tocco e microfono contro la manopola «Ritardo dell'audio», con `SCARTO_MAX_MS` (200) e `ABBINAMENTO_MAX_MS` (250);
     - soglie del battito da calibrare con battiti veri e rumore di stanza: `SOGLIA_BATTITO_RMS`, `MARGINE_BATTITO_DB`, `SALTO_BATTITO_DB`, `SALTO_PRIMA_MS`, `REFRATTARIO_BATTITO_MS`, `PASSA_ALTO_BATTITO_HZ`, `CALO_BATTITO_DB` (con `PASSA_ALTO_CALO_HZ`, `CALO_DA_MS`, `CALO_A_MS`), `ACUTI_BATTITO_DB`, `SIBILI_BATTITO_DB` (con `PASSA_ALTO_SIBILI_HZ`);
     - tolleranze `TOLLERANZE_RITMO_MS` (150/100/60), tempo `BPM_RITMO` (72) e limiti `BPM_RITMO_MIN`/`BPM_RITMO_MAX` (50-100), `VOLUME_CLIC_PIANO`.
   - Calibrazione di GATE_RMS, tolleranze, tenute, ASCOLTO_MAX_MS e delle soglie della voce forte (CRESCENDO_DB, FORTE_DBFS) con la diagnostica del microfono e le statistiche `voce-forte`.
4. **Decisioni aperte minori**:
   - a 360 px la tastiera di 7 tasti scorre di 10 px (tasti da 48 px): va bene così?
   - valutare l'output Paraglide a un file per lingua: svelte-check analizza circa 2.000 file, quasi tutti messaggi generati;
5. **Prova dell'utente del modulo Ritmo, poi la pubblicazione** (stato 'pubblicata' in `modulo.ts`), con il percorso consigliato aggiornato.
6. **Prossime aree e moduli**: matematica, scienze e così via, seguendo `docs/come-aggiungere-un-modulo.md`.

## Promemoria per chi lavora con gli agenti

- Workflow multi-agente: implementazione → revisione indipendente → correzioni. Opus come default, Sonnet per il lavoro meccanico, Fable solo per compiti eccezionali.
- Lavori in parallelo: un worktree per agente, porte dedicate per dev e preview, merge alla fine; poi `npm run verifica` una volta sola.
- Errori di rete degli agenti: si riprende il run con `resumeFromRunId`. Gli agenti committano spesso, quindi si riparte dal lavoro già fatto e si controlla `git status` prima di rilanciare.
- Windows/Git Bash: `MSYS_NO_PATHCONV=1` quando si passano a node argomenti che iniziano con `/`.
