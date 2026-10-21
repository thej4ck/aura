# 0002. Zero dati personali

Stato: accettata · 2026-10-21

## Contesto

Gli utenti sono minori. Il progetto segue la privacy by design del GDPR (art. 25) e l'Age Appropriate Design Code (ICO UK).
Il modulo Canto usa il microfono: le famiglie devono potersi fidare che l'audio non esca dal dispositivo.

## Decisione

- Nessun account, cookie, analytics, telemetria, pubblicità, pixel o servizio di raccolta errori. Nessuna richiesta verso terzi: font e risorse sono self-hosted.
- I progressi stanno in IndexedDB. L'unico modo per portarli altrove è un file che l'adulto esporta o collega. Il profilo ha un avatar emoji e un alias facoltativo che resta in locale.
- Gli errori si registrano solo in locale; un pulsante "copia dettagli" permette all'adulto di inviarli, se vuole.
- La sintesi vocale usa solo voci locali (`voice.localService`).
- Paraglide è configurato senza la strategia `cookie` (vedi 0006).
- **Garanzia tecnica: CSP** generata da SvelteKit (`csp.mode: 'hash'`, in `<meta>` nelle pagine prerenderizzate): `default-src`, `script-src`, `connect-src`, `font-src`, `worker-src`, `manifest-src` limitati a `'self'`; immagini anche da `data:` e `blob:`, audio anche da `blob:` (generati in locale); `object-src 'none'`; `base-uri` e `form-action` a `'self'`. Anche se un bug ci provasse, il browser blocca fetch, WebSocket, beacon, immagini, script e invii di form verso altri domini: audio e progressi non possono uscire così. (La CSP non copre la navigazione verso un altro sito: per questo i link esterni stanno dietro il controllo adulti.)
- Caddy aggiunge le intestazioni che una `<meta>` non può dare: `frame-ancestors 'none'`, `Permissions-Policy: microphone=(self), camera=(), geolocation=()`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`. Nessun access log.

### Eccezione: `style-src-attr 'unsafe-inline'`

`style-src` resta `'self'`: gli elementi `<style>` inline sono vietati.
Sono permessi solo gli **attributi** `style`, con `style-src-attr 'unsafe-inline'`.

Serve perché l'annuncio dei cambi di pagina di SvelteKit per i lettori di schermo (`#svelte-announcer`, con `aria-live`) è nascosto con un attributo `style`. Senza l'eccezione il browser lo blocca: l'annuncio diventa visibile sulla pagina e la console segnala una violazione della CSP (il test e2e la intercetta).
Il rischio è basso: un attributo `style` non ha selettori e i suoi `url()` restano limitati da `img-src`/`font-src` a `'self'`, quindi non può portare dati fuori dal sito.
Abbiamo scartato `'unsafe-hashes'` con l'hash del solo annuncio: si rompe a ogni aggiornamento di SvelteKit e vieterebbe anche gli stili dinamici (`style:`) che i componenti useranno per colori e posizioni.

## Conseguenze

- Niente servizi esterni "comodi" (CDN, font di Google, monitoraggio errori): ogni risorsa si impacchetta nella build.
- Il test end-to-end fallisce se la pagina fa una richiesta verso un'altra origine o se la console riporta un errore, comprese le violazioni della CSP.
- Allentare la CSP richiede un nuovo ADR.
- Il supporto agli utenti si basa su ciò che l'adulto sceglie di condividere (file di salvataggio, dettagli dell'errore).
