# Aura

Una piattaforma didattica gratuita e pubblica, a moduli, per bambini dai 6 ai 10 anni.
Si impara per aree (oggi la musica, domani matematica, fisica e scienze) e, dentro ogni area, per moduli brevi e guidati.
La prima area è la **Musica**, con i moduli **Pentagramma** e **Canto**.

## Principi

- **Zero dati personali.** Nessun account, nessun cookie, nessuna analytics, nessuna telemetria, nessuna richiesta verso terzi.
  I progressi restano nel browser (IndexedDB) e si possono esportare, importare e sincronizzare su un file che resta all'adulto.
  Una Content Security Policy rigorosa lo garantisce anche sul piano tecnico: la pagina può parlare solo con la propria origine.
- **Prima il browser.** Tutto quello che può girare nel browser gira lì, anche l'analisi della voce dal microfono.
  Per questo oggi il sito è statico. Lavoro lato server solo dopo aver valutato se serve davvero.
- **Niente dark pattern.** Nessuna serie da non interrompere, nessuna vita da perdere, nessun conto alla rovescia, nessuna notifica, nessuna classifica, nessuna pubblicità.
  Le stelle non si perdono, il feedback dice cosa fare e non giudica, il percorso è consigliato ma mai bloccato.
- **Accessibile.** Obiettivo WCAG 2.2 AA, principi dell'Age Appropriate Design Code e privacy by design (GDPR art. 25).

Le decisioni di progetto sono scritte in [`docs/adr/`](docs/adr/).

## Sviluppo

Serve **Node 24** (vedi `engines` in `package.json`).

```sh
npm ci
npx playwright install chromium   # una volta sola, per i test end-to-end
npm run dev                       # server di sviluppo
```

| Comando            | Cosa fa                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `npm run dev`      | server di sviluppo con ricaricamento a caldo                                                |
| `npm run build`    | build statica in `build/`, con file `.br` e `.gz` già compressi                             |
| `npm run preview`  | serve la build in locale                                                                    |
| `npm run check`    | controllo dei tipi (svelte-check)                                                           |
| `npm run lint`     | Prettier e ESLint                                                                           |
| `npm run format`   | formatta il codice con Prettier                                                             |
| `npm test`         | test unitari (Vitest)                                                                       |
| `npm run test:e2e` | test end-to-end (Playwright): caricamento, accessibilità con axe, nessuna richiesta a terzi |

I testi dell'interfaccia stanno in `messages/it.json` (Paraglide JS); i testi delle lezioni stanno nei dati di ogni modulo.
La build scarica i plugin di inlang da `cdn.jsdelivr.net`: succede solo in build, mai nel browser di chi usa il sito.

Prima di aprire una pull request leggi [CONTRIBUTING.md](CONTRIBUTING.md).

## Deploy

Il sito è un insieme di file statici servito da [Caddy](https://caddyserver.com/) in un container.

- `Dockerfile`: `node:24-alpine` esegue `npm ci && npm run build`, poi `caddy:2-alpine` serve `/srv` con un utente non privilegiato.
- `Caddyfile`: serve i file precompressi (brotli, gzip), cache permanente per `/_app/immutable/*`, rivalidazione per tutto il resto, intestazioni di sicurezza e privacy, nessun access log, pagina `404.html` per gli indirizzi sconosciuti. La porta viene da `PORT` (predefinita 8080).
- `railway.json`: deploy su [Railway](https://railway.com/) dal `Dockerfile`, con healthcheck su `/`.

Per provarlo in locale (Docker o Podman):

```sh
podman build -t aura .
podman run --rm -e PORT=8080 -p 8080:8080 aura
```

Il proxy di Railway può registrare dati tecnici delle richieste (per esempio l'indirizzo IP): il sito non li legge e non li conserva. La pagina per i genitori lo spiega con chiarezza.

## Struttura

```
messages/            stringhe dell'interfaccia, una lingua per file
src/
  routes/            pagine (tutte prerenderizzate)
  lib/core/          motore delle attività, widget, store dei progressi, audio, interfaccia
  lib/moduli/        aree e moduli: contenuti come dati, più gli eventuali widget propri
static/              file copiati così come sono nella build
tests/               test end-to-end (Playwright)
docs/adr/            decisioni di architettura
```

Aggiungere un modulo significa aggiungere una cartella `src/lib/moduli/<area>/<modulo>/` con il suo `modulo.ts`: routing, selettore, percorso e progressi funzionano senza toccare il core. La guida passo passo è in [`docs/come-aggiungere-un-modulo.md`](docs/come-aggiungere-un-modulo.md).

In sviluppo, `/dev` mostra token, componenti e un'attività di esempio che usa il motore; in produzione quella pagina non esiste (404).

## Licenze

- Codice: [MIT](LICENSE).
- Contenuti didattici in `src/lib/moduli/**`: [CC BY-SA 4.0](LICENSE-CONTENUTI.md).
- Font Atkinson Hyperlegible Next: SIL Open Font License 1.1 ([`static/licenze/atkinson-hyperlegible-next-ofl.txt`](static/licenze/atkinson-hyperlegible-next-ofl.txt)).
- Icone dell'interfaccia (`src/lib/core/ui/Icona.svelte`): path SVG da [Lucide](https://lucide.dev), licenza ISC (© Lucide Contributors; parte da Feather, © Cole Bemis, MIT): [`static/licenze/lucide-isc.txt`](static/licenze/lucide-isc.txt).
- Glifi musicali del pentagramma (`src/lib/core/musica/glifi.ts`): path SVG estratti dal font [Bravura](https://github.com/steinbergmedia/bravura) 1.482 (© Steinberg Media Technologies GmbH, Reserved Font Name "Bravura"), SIL Open Font License 1.1: testo in [`static/licenze/bravura-ofl.txt`](static/licenze/bravura-ofl.txt).

Partecipando al progetto accetti il [Codice di Comportamento](CODE_OF_CONDUCT.md). Per le vulnerabilità vedi [SECURITY.md](SECURITY.md).
