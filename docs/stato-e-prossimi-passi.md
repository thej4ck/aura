# Stato del progetto e prossimi passi

Documento di passaggio tra una sessione di lavoro e la successiva. Va aggiornato a ogni fine fase.

## Stato al 2026-10-24

- **In produzione**: https://aura-production-0151.up.railway.app. Railway fa il deploy a ogni push su `main` di github.com/thej4ck/aura, che è pubblico, con il check `ci` obbligatorio (CI in parallelo, circa 3 minuti). Due servizi: il sito (Caddy) e `statistiche` (contatori anonimi, ADR 0007); la configurazione di Railway è descritta nell'ADR.
- **Area Musica pubblicata**:
  - modulo Pentagramma: 6 lezioni e 3 giochi (che-nota-e con scatole di Leitner, trovala, leggi-e-canta);
  - modulo Canto: 5 lezioni e 3 giochi (tieni-la-nota, eco, estensione vocale per semitoni);
  - percorso consigliato che alterna i due moduli (`src/lib/moduli/musica/area.ts`).
- **Piattaforma**:
  - motore delle attività a schede con widget, catalogo dei moduli, grafo delle competenze con padronanza e ripasso distanziato;
  - progressi in IndexedDB, profili multipli, backup `.kgz` (gzip) e sincronizzazione su file;
  - PWA offline;
  - controllo adulti (GateAdulti), pagine /genitori (cinque schede) e /informazioni;
  - barra in fondo alle attività con «Indietro» e i pulsanti del widget (`AzioniScheda`), sempre sullo schermo;
  - quattro dimensioni del testo (schema dei progressi 2), versione e data della build nel piè di pagina;
  - segnalazioni su GitHub dietro GateAdulti, statistiche d'uso anonime (`scripts/statistiche.mjs` per leggerle).
- **Audio**:
  - sintetizzatore, microfono con YIN e gate adattivo al rumore di fondo, PitchMeter;
  - animazioni che suonano in sincrono, guidate dall'audio, con test di regressione;
  - diagnostica del microfono in /genitori, sezione «Prova il microfono», con i passi quando il permesso è negato senza richiesta;
  - ascolto fino a 40 s prima di «Riprova» e consiglio di non cantare più forte (`musica/voce-forte.ts`).
- **Qualità**:
  - `npm run verifica` (lint, check, Vitest, build, Playwright) dura circa 3-4 minuti: circa 330 test unitari e circa 100 e2e (progetti chromium, dev, mic, voce);
  - durante lo sviluppo solo i test mirati (vedi CLAUDE.md, «Test e verifiche»).

## Prossimi passi, in ordine

0. **Dipendenze**: resta la PR #1, `vitest` 5: aggiornamento major, CI verde, da valutare con calma. Dependabot ignora i major di `@types/node` e di `typescript` (svelte-check supporta TypeScript 6).
1. **Leggere le statistiche** ogni tanto (`STATISTICHE_KEY_FILE=… node scripts/statistiche.mjs`): attività lasciate a metà, schede dove scade il canto, errori del microfono per browser. C'è un contatore di prova `prova.collegamento` del 2026-10-24, da ignorare. Da verificare dal vivo: che GitHub precompili i campi delle segnalazioni.
2. **Rileggere i testi legali** di /informazioni (avvertenze, «così com'è», servizi di terzi) e decidere se aggiungere un contatto email.
3. **Prove su dispositivi veri** con bambini veri: checklist in `docs/prove-su-dispositivi.md`.
   - iPhone/iPad: modalità audio 'playback', sblocco dell'audio, microfono.
   - Android.
   - Calibrazione di GATE_RMS, tolleranze, tenute, ASCOLTO_MAX_MS e delle soglie della voce forte (CRESCENDO_DB, FORTE_DBFS) con la diagnostica del microfono e le statistiche `voce-forte`.
4. **Decisioni aperte minori**:
   - a 360 px la tastiera di 7 tasti scorre di 10 px (tasti da 48 px): va bene così?
   - valutare l'output Paraglide a un file per lingua: svelte-check analizza circa 2.000 file, quasi tutti messaggi generati;
   - AudioWorklet solo se le misure lo giustificheranno (commento ponytail in `mic.ts`).
5. **Prossime aree e moduli**: modulo Ritmo (lo scheduler sul clock audio e il modello `Rigo` con le durate sono già pronti), poi matematica, scienze e così via, seguendo `docs/come-aggiungere-un-modulo.md`.

## Promemoria per chi lavora con gli agenti

- Workflow multi-agente: implementazione → revisione indipendente → correzioni. Opus come default, Sonnet per il lavoro meccanico, Fable solo per compiti eccezionali.
- Lavori in parallelo: un worktree per agente, porte dedicate per dev e preview, merge alla fine; poi `npm run verifica` una volta sola.
- Errori di rete degli agenti: si riprende il run con `resumeFromRunId`. Gli agenti committano spesso, quindi si riparte dal lavoro già fatto e si controlla `git status` prima di rilanciare.
- Windows/Git Bash: `MSYS_NO_PATHCONV=1` quando si passano a node argomenti che iniziano con `/`.
