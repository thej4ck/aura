# Aura — istruzioni per Claude

Piattaforma didattica gratuita per bambini, a moduli (oggi area Musica: Pentagramma e Canto). Sito statico SvelteKit servito da Caddy su Railway. Decisioni architetturali in `docs/adr/`, guida ai moduli in `docs/come-aggiungere-un-modulo.md`.

## Principi non negoziabili

- **Zero dati personali**: nessun cookie, analytics, telemetria, account o richiesta di rete verso terzi a runtime. La CSP (`vite.config.ts`, nella config di `sveltekit()`; con SvelteKit 3 `svelte.config.js` non esiste) e gli header (`Caddyfile`) devono continuare a garantirlo.
- **Browser-first**: quello che può girare nel browser gira lì. Lavoro lato server solo dopo una valutazione esplicita (va scritta in un ADR).
- **Niente dark pattern**: niente streak, vite, timer di pressione, notifiche, classifiche, ricompense casuali. Il feedback è formativo e orientato alla crescita, mai "sbagliato".
- **Contenuti come dati**: un'attività è un elenco di schede che usano widget. Un nuovo modulo aggiunge cartelle in `src/lib/moduli/<area>/<modulo>/` e non tocca il core.
- **Id stabili**: id di aree, moduli, attività e competenze non si rinominano mai; se serve, si scrive una migrazione.
- **Stringhe UI via Paraglide** (`messages/it.json`), niente testo hardcoded nei componenti.
- **Accessibilità WCAG 2.2 AA**: target ≥48px, focus visibile, il colore non è mai l'unico segnale, rispetto di `prefers-reduced-motion`.
- **Ogni animazione che mostra note o altezze le fa sentire in sincrono, guidata dall'audio** (anche le illustrazioni, con «Ascolta»): il disegno usa `suonoDisegno` (`src/lib/core/widget/suono.svelte.ts`). Il movimento ridotto toglie il movimento, non il suono. I disegni muti sono elencati, con il motivo, in `tests/animazioni.dev.spec.ts`.

## Comandi

- `npm run dev` · `npm run build` · `npm run preview`
- `npm run lint` · `npm run check` · `npm run test` (Vitest) · `npm run test:e2e` (Playwright)
- Container (in locale c'è podman, non docker): `podman build -t aura .` → `podman run --rm -e PORT=8080 -p 8080:8080 aura`
- `npm run verifica` = la suite completa (lint, check, vitest, build, e2e): circa 4 minuti.

## Test e verifiche (tempi)

- **Durante lo sviluppo** si lanciano solo i controlli mirati: `npm run test:changed` (Vitest sui file toccati), `npx vitest run <percorso>`, `npm run test:e2e:changed` o `npx playwright test tests/<modulo>*`, più `npm run check` se cambiano tipi o componenti.
- **La suite completa (`npm run verifica`) si lancia UNA volta sullo stato finale**, prima di consegnare o pushare. La CI la ripete su ogni push.
- **Non si riverifica ogni commit uno per uno** (worktree per commit, check ripetuti): moltiplica i tempi per il numero di commit. Si fa solo se l'utente lo chiede esplicitamente.
- Ogni modulo ha i suoi test (`tests/<modulo>.*.spec.ts`, `src/lib/moduli/**/*.test.ts`), così si possono lanciare da soli.

## Git

- Branch `main`, Conventional Commits in inglese, commit piccoli e logici.
- Mai push, mai creare remote/repo e mai azioni su Railway senza conferma esplicita dell'utente.

## Immagini e animazioni

- **Prima scelta: SVG vettoriali** (illustrazioni e glifi), coerenti con i token di `src/lib/core/tokens.css`.
- **Spiegazioni animate ("video vettoriali")**: componenti Svelte con SVG animati via CSS o Web Animations API. Sono segmentati in passi (principio di segmentazione), con controlli play/pausa/passo, testo o narrazione sincronizzati, e diventano fotogrammi statici con `prefers-reduced-motion`. Niente librerie pesanti (Lottie e simili) senza un ADR.
- **Immagini raster generate con AI**: solo quando aggiungono valore didattico rispetto a un SVG.
  - Si generano solo durante lo sviluppo con OpenRouter, tramite uno script in `scripts/` che legge la chiave da `OPENROUTER_API_KEY` o dal file indicato in `OPENROUTER_KEY_FILE` (percorso locale in `CLAUDE.local.md`).
  - Il modello si sceglie interrogando `https://openrouter.ai/api/v1/models` e filtrando quelli con output di tipo immagine.
  - **La chiave non entra mai nel repo, nel bundle o nell'output dei comandi**; nessuna chiamata AI a runtime nel sito.
  - Le immagini si salvano ottimizzate (WebP o AVIF, dimensione massima ragionevole) accanto al modulo. Un file sidecar `<nome>.json` registra prompt, modello, data e condizioni d'uso.
  - Stile coerente: piatto, pulito, palette dei token, niente testo dentro l'immagine, inclusivo, niente persone fotorealistiche.

## Lavorare con gli agenti (ultracode)

Lo sviluppo sostanziale si fa con Workflow multi-agente: implementazione → revisione indipendente → correzioni. Modello in base al compito:

- `fable`: **solo eccezionalmente**, per compiti fondamentali che solo lui sa fare con qualità (es. un audit finale trasversale prima di un rilascio, un problema che Opus non ha risolto). Costa più del doppio di Opus: in ogni altro caso Opus;
- `opus`: default per codice non banale, design, UI, motore, audio/pitch, logica dei giochi, contenuti didattici, revisioni, correzioni;
- `sonnet`: lavoro meccanico (tooling, configurazione, pagine semplici, commit).
