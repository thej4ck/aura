# 0001. Sito statico, prima il browser

Stato: accettata · 2026-10-21

## Contesto

Kindergarden è gratuito, pubblico e usato da bambini. Non deve raccogliere dati personali, deve funzionare anche offline e costare poco da tenere in linea.
Quasi tutto il lavoro (motore delle attività, progressi, sintesi del suono, riconoscimento dell'altezza della voce) può girare nel browser.

## Decisione

- Quello che può girare nel browser gira lì. Un lavoro lato server si aggiunge solo dopo aver valutato che serve davvero, e con un ADR.
- Oggi il sito è **statico**: SvelteKit con `adapter-static`, `prerender = true` nel layout radice, `strict: true` (la build fallisce se una pagina non è prerenderizzabile).
- La build genera già i file `.br` e `.gz` (`precompress: true`) e una pagina `404.html`.
- In produzione i file sono serviti da **Caddy** in un container (`Dockerfile` multi-stage), con deploy su Railway.
- Lo stato vive nel browser (IndexedDB); service worker e manifest rendono il sito installabile e utilizzabile offline.

## Conseguenze

- Nessun backend da mantenere né da proteggere, nessun dato che arriva al server oltre alla richiesta dei file.
- Caddy non comprime a runtime: serve i file precompressi (meno banda, zero CPU) e usa `encode` solo come ripiego. I file con l'hash nel nome (`/_app/immutable/*`) hanno cache permanente, tutto il resto si rivalida (`no-cache`).
- Le pagine con parametri (`[area]/[modulo]/...`) devono elencare i propri valori con `entries()` dal registry dei moduli.
- Se un giorno servirà un server, si passa ad `adapter-node` senza riscrivere pagine e componenti.
- Il proxy di Railway vede le richieste HTTP: lo si dichiara con onestà nella pagina per i genitori.
