# Come aggiungere un modulo

Un modulo è una cartella di **dati** (le attività) più, se servono, dei **widget propri**.
Routing, selettore dei moduli, percorso consigliato, progressi, stelle, padronanza e pagina genitori funzionano senza toccare il core: li fa il motore unico (`src/lib/core/motore/`).

Le decisioni dietro questo modello sono in [ADR 0004](adr/0004-contenuti-come-dati-e-widget.md).

## 1. Le cartelle

```
src/lib/moduli/
  musica/                 un'area
    area.ts               metadati dell'area e percorso consigliato
    pentagramma/          un modulo
      modulo.ts           metadati, competenze, attività (dati)
      widget/             widget e disegni SVG propri (facoltativo)
      lettura.ts          logica pura del modulo, con i suoi test (facoltativo)
```

Il registry (`src/lib/core/contenuti/registry.ts`) trova da solo tutti i file `*/area.ts` e `*/*/modulo.ts`: non c'è un elenco da aggiornare.

## 2. Gli id: stabili per sempre

Gli id sono in kebab-case (`note-linee`) e nel catalogo diventano qualificati: `area.modulo` per i moduli, `area.modulo.attivita` e `area.modulo.competenza` per attività e competenze.
Finiscono negli URL (`/musica/pentagramma/note-linee`) e nei file di salvataggio delle famiglie, quindi **un id non si rinomina mai e non si riusa**. Il titolo visibile si può cambiare quando vuoi.
L'id di un'area è il primo pezzo dell'URL (`/musica`): non può essere `moduli`, `genitori` o `dev`, che sono già pagine del sito.
Se un id deve proprio cambiare, serve una migrazione in `src/lib/core/store/migrazioni.ts` (vedi CONTRIBUTING).

Dentro un modulo i riferimenti (competenze allenate, prerequisiti) si scrivono con l'id locale (`note-linee`); verso altri moduli o aree con l'id qualificato (`musica.canto.estensione`).

## 3. `area.ts`

Solo se l'area è nuova.

```ts
import type { AreaDati } from '#lib/core/contenuti/schema.ts';

export const area = {
	id: 'musica',
	titolo: 'Musica',
	descrizione: 'Leggere e cantare le note.',
	icona: '🎵',
	colore: '#1f6b5a',
	// id qualificati delle attività, nell'ordine consigliato (anche di moduli diversi)
	percorso: ['musica.pentagramma.linee-spazi', 'musica.canto.note-colorate']
} satisfies AreaDati;
```

Il percorso è un consiglio, mai un lucchetto: ogni attività resta sempre aperta.

## 4. `modulo.ts`

```ts
import type { ModuloDati } from '#lib/core/contenuti/schema.ts';

export const modulo = {
	id: 'pentagramma',
	area: 'musica',
	eta: [6, 10],
	titolo: 'Pentagramma',
	descrizione: 'Le note scritte sulle cinque linee.',
	icona: '🎼',
	stato: 'bozza', // 'pubblicata' dopo la revisione; le bozze si vedono solo in sviluppo
	introduzione: {
		cosaImparerai: ['Dove stanno le note sul pentagramma.'],
		comeFunziona: 'Prima guardi, poi provi con noi, poi provi da solo.',
		cosaServe: ['Niente: basta il dito.'],
		consigliPerAdulti: ['Lasciate sbagliare: il feedback dice cosa fare.']
	},
	glossario: [{ termine: 'Pentagramma', spiegazione: 'Le cinque linee della musica.' }],
	competenze: [
		{ id: 'linee-spazi', titolo: 'Linee e spazi', descrizione: 'Conta linee e spazi dal basso.' }
	],
	attivita: [/* … vedi sotto … */]
} satisfies ModuloDati;
```

`satisfies ModuloDati` dà gli errori di battitura già nell'editor; la validazione vera la fa Valibot quando si costruisce il catalogo.

## 5. Le attività

Un'attività è un elenco di **schede**. Ogni scheda ha una **fase** e usa un **widget**.

```ts
{
	id: 'linee-spazi',
	titolo: 'Le 5 linee e i 4 spazi',
	tipo: 'lezione',            // oppure 'gioco'
	obiettivo: 'Scopri come si contano linee e spazi.',   // si legge all'inizio
	riepilogo: 'Le linee sono cinque, gli spazi quattro.', // "Oggi hai imparato"
	minuti: 5,
	allena: ['linee-spazi'],      // competenze
	prerequisiti: [],             // attività consigliate prima (suggerimento, mai blocco)
	traguardi: ['Riconosce gli elementi base della notazione.'], // Indicazioni Nazionali
	schede: [
		{ id: 'cosa-sono', fase: 'scopri', widget: 'spiegazione', titolo: 'Il pentagramma', testo: '…' },
		{ id: 'insieme', fase: 'insieme', widget: 'scelta', props: { /* … */ } },
		{ id: 'prova-1', fase: 'prova', widget: 'scelta', props: { /* … */ } }
	]
}
```

- **Fasi**: `scopri` (si mostra), `insieme` (si prova con aiuto), `prova` (si prova da soli). Il motore mostra la fase e l'avanzamento, e **conta per la verifica solo la fase `prova`**.
- **Verifica**: superata se almeno l'80% delle risposte della fase `prova` è giusto (`SOGLIA_SUPERATA` in `motore/logica.ts`). Conta la prima risposta di ogni scheda: tornare indietro e rifarla non cancella un errore, e un'attività interrotta riprende al massimo dalla prima scheda `prova`. Un'attività senza risposte da valutare (nessuna scheda `prova`, o schede che non emettono esiti) si completa arrivando in fondo, con al massimo una stella e senza toccare la padronanza: per allenare una competenza servono schede `prova` con widget che valutano. Si può ripetere senza limiti; le stelle non si perdono mai.
- **Una scheda, un concetto, un'azione.** Frasi brevi, tono calmo. Il feedback dice cosa fare, mai "sbagliato".
- `titolo` e `testo` della scheda li mostra il motore (con il pulsante 🔊 se c'è una voce locale e la lettura ad alta voce è attiva). Senza `titolo`, il titolo della scheda è il nome della fase.
- `audio`: una voce registrata (URL di un file servito dal sito, es. `import voce from './voce/linee.mp3'`). Se c'è, il pulsante 🔊 la usa al posto della sintesi vocale.

### Widget core

| widget        | props                                                                                             | esito                                     |
| ------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `spiegazione` | `illustrazione?`: `{ componente, alt }` (disegno SVG del modulo) oppure `{ src, alt }` (immagine) | nessuno; "Avanti" passa oltre             |
| `scelta`      | `domanda`, `opzioni` (≥ 2), `corretta` (indice), `suggerimento?`, `spiegazione?`, `item?`         | giusto al primo tentativo; poi si riprova |
| `animazione`  | `componente` (disegno SVG del modulo), `passi: [{ testo, durataMs? }]`, `etichetta?`              | nessuno                                   |

#### Widget musicali

Le note si scrivono come altezze in notazione scientifica (`'C4'` è il Do centrale, `'F#4'`, `'Bb3'`). Dove si legge `note`, vale sia un elenco di altezze (in chiave di violino) sia un `Rigo` (`{ chiave, armatura?, note: [{ altezza }] }`), sempre con almeno una nota. `etichette` mostra i nomi sotto le note, `colori` colora le teste con i colori delle note; i nomi seguono la preferenza del profilo (solfeggio o lettere).

| widget           | props                                                                                                                                                                             | esito                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `ascolta`        | `note`, `durata?` (secondi per nota, 0,8), `etichette?`, `colori?`                                                                                                                | nessuno; "Avanti" compare dopo il primo ascolto completo                                    |
| `staff-tocca`    | `nota` (da trovare: conta la posizione, non l'alterazione), `domanda?` (di default "Tocca il Sol"), `chiave?`, `armatura?`, `suggerimento?`, `selezionabili?: [min, max]` (passi) | al primo tentativo, `item` = `nota`; poi si riprova con aiuti che crescono                  |
| `canta-nota`     | `nota`, `tenutaMs?` (3000), `equivalenzaOttava?` (`true`), `etichette?`, `colori?`                                                                                                | giusto quando la nota è tenuta abbastanza, `item` = `nota`; conta il primo tentativo        |
| `canta-sequenza` | `note` (si cantano in ordine), `tenutaMs?` (600 per nota), `equivalenzaOttava?` (`true`), `item?`, `etichette?`, `colori?`                                                        | alla fine: giusto se le note sono tutte cantate in ordine; `dettagli: { riuscite, totale }` |

- **Sempre sullo Staff**: ogni nota che suona o che si canta è anche scritta, ed è evidenziata mentre suona o mentre tocca cantarla. Il rigo non ha stanghette e vale come una sola battuta: un'alterazione resta in vigore per la stessa nota fino alla fine e si annulla con il bequadro; in più ogni nota fuori dall'armatura ha sempre il suo segno.
- `staff-tocca`: ogni tocco suona la nota toccata. Il feedback dice dove si è toccato e che nota c'è lì, verso dove andare e, dal secondo tentativo, dove sta la nota. `selezionabili` sono i passi toccabili (0 = prima linea, 8 = quinta, −2 = primo taglio in basso): il default va dal Do sotto al La sopra in chiave di violino, e la `nota` deve starci dentro (per il Si sopra il rigo serve `[-2, 12]`).
- `canta-nota` e `canta-sequenza` lavorano **a turni**: prima suona il sito (intanto il microfono non ascolta), poi canta il bambino, con il misuratore della voce e un anello che si riempie mentre tiene la nota. Fuori zona l'anello cala piano, non si svuota. La **tolleranza** viene dalle preferenze (facile ±50 cent, medio ±30, preciso ±15); `equivalenzaOttava` accetta la stessa nota in un'altra ottava.
- Prima di aprire il microfono il widget spiega a bambino e adulto a cosa serve ("Niente viene registrato"). Il microfono si chiude a fine prova, sempre quando si lascia la scheda e anche quando il browser nasconde la pagina o la lascia (si torna a "Ascolta e canta", senza esito). Mentre il sito suona o legge ad alta voce il microfono non ascolta. Se non c'è o non ha il permesso, si ascolta e si canta lo stesso, ma **senza esito**: la scheda non conta né come giusta né come da rivedere.
- Dopo circa 20 secondi di ascolto senza riuscire (`ASCOLTO_MAX_MS`, senza mai un conto alla rovescia) la prova finisce con un consiglio e un "Riprova". Tempi di tenuta, calo e tempo di ascolto sono costanti da calibrare in `src/lib/core/audio/costanti.ts`.

Per i giochi di canto di un modulo (es. "Tieni la nota", "Eco", l'estensione vocale) le stesse regole stanno in `src/lib/core/musica/intonazione.ts`, puro e provato con frame sintetici: `avanzaTenuta` (una nota tenuta), `avanzaSequenza` (note in ordine con tenuta minima e tempo massimo) e `avanzaNotaComoda` (la mediana della voce su ~2 s). Ognuno riceve lo stato e un frame del microfono e restituisce lo stato nuovo. Il microfono si apre con `apriMicrofono({ onframe, onchiuso, latenzaMs })` da `src/lib/core/audio/mic.ts`, dopo `sblocca()` nel gesto: `onchiuso` arriva quando lo chiude il browser (pagina nascosta o lasciata), e il gioco deve tornare all'inizio.

## 6. Widget propri

Se un'attività ha bisogno di un'interazione nuova, il modulo dichiara un widget proprio e lo carica in lazy:

```ts
// in modulo.ts
export const widget = {
	'lettura-lampo': () => import('./widget/LetturaLampo.svelte'),
	'cinque-linee': () => import('./widget/CinqueLinee.svelte') // anche i disegni SVG si registrano qui
};
```

I nomi dei widget core sono riservati (il test dei contenuti lo controlla). Un widget riceve sempre le stesse props (`WidgetProps` in `src/lib/core/motore/widget.ts`):

```ts
type WidgetProps<P = Record<string, unknown>> = {
	scheda: Scheda; // la scheda intera
	props: P; // scheda.props: dati non tipizzati, li valida il widget
	contesto: {
		preferenze: Preferenze; // nomi delle note, tolleranza, lettura ad alta voce, accessibilità…
		seed: number; // per creaCasuale(seed): stesso seed, stesso esercizio
		fase: Fase;
		carica: (nome: string) => Promise<Component>; // un altro widget o disegno del modulo
	};
	onesito: (e: { corretto: boolean; item?: string; dettagli?: unknown }) => void;
	onfine: () => void; // il bambino ha finito: il motore passa alla scheda successiva
};
```

Regole:

1. **Valida le props** con Valibot ed esporta lo schema da `<script module>` come `schemaProps`: il test dei contenuti lo usa per controllare ogni scheda che usa il widget.
   ```svelte
   <script lang="ts" module>
   	import * as v from 'valibot';
   	export const schemaProps = v.object({ note: v.array(v.string()) });
   </script>
   ```
2. **Un esito per ogni risposta valutata** (`onesito`), anche più di uno per scheda. Lo stesso formato per tutti: il motore li conta, calcola stelle e padronanza e salva, in un unico punto.
3. **`onfine`** quando la scheda è finita (di solito un pulsante "Avanti" visibile). Niente timer di pressione.
4. **Casualità con seed**: `creaCasuale(contesto.seed)` da `#lib/core/casuale.ts`, così i test sono deterministici.
5. **Dati del modulo** che devono restare (es. le scatole di Leitner): `progressi.aggiornaDati('musica.pentagramma', { … })`. La forma la decide e la valida il modulo.
6. Testi dell'interfaccia del widget in `messages/it.json`; testi della lezione nei dati. Target ≥ 48 px, focus visibile, colore mai unico segnale, feedback in una regione `aria-live` (il componente `Avviso` lo è già).

## 7. Spiegazioni animate ("video vettoriali")

Il widget `animazione` usa `PlayerPassi` (play/pausa, passo avanti e indietro, ricomincia, testo del passo in `aria-live`, 🔊). Il modulo fornisce solo il **disegno**: un componente SVG registrato in `widget`, che riceve

```ts
type StatoDisegno = {
	passo: number; // il disegno mostra lo stato "dopo" questo passo (0 = primo)
	inRiproduzione: boolean; // true: anima l'ingresso del passo; false: metti in pausa l'animazione
	riduciMovimento: boolean; // true: nessuna animazione, solo il fotogramma finale del passo
};
```

Si anima con CSS o con la Web Animations API (`elemento.animate(...)`), mai con librerie pesanti senza un ADR. Se il passo cambia mentre si è in pausa, si salta al fotogramma finale del nuovo passo. Un esempio completo è `src/lib/core/contenuti/__fixtures__/esempio/linee/CinqueLinee.svelte` (le linee del pentagramma che compaiono una alla volta), visibile in `/dev`.

Colori dai token (`var(--colore-testo)`, `var(--nota-sol)`, …): così il disegno segue tema chiaro, scuro e contrasto alto.

## 8. Immagini

Prima scelta: SVG (componenti del modulo o file `.svg`). Le immagini raster generate con l'AI solo se aggiungono valore didattico, solo in sviluppo e con il file sidecar `<nome>.json` (prompt, modello, data, condizioni d'uso): le regole sono in `CLAUDE.md`.

## 9. Provare e validare

1. `npm run dev` e apri il modulo: le bozze si vedono solo in sviluppo. `/dev` ha la vetrina dei componenti, i widget musicali da provare uno per uno (con gli esiti che mandano al motore) e due attività di esempio.
2. `npm test` esegue `tests/contenuti.test.ts` su tutti i contenuti reali, con e senza bozze:
   - schema di aree, moduli, attività e schede;
   - id unici, riferimenti esistenti (competenze, prerequisiti, percorso), grafi dei prerequisiti senza cicli;
   - ogni scheda usa un widget registrato (core o del modulo), con props valide per il suo `schemaProps`;
   - i componenti citati nelle props (`componente`, `illustrazione.componente`) sono registrati nel modulo.

   Se qualcosa non va, il registry elenca tutti gli errori con il file di provenienza.

3. La logica pura del modulo (estrazioni, macchine a stati) ha i suoi test Vitest accanto (`lettura.test.ts`).
4. `npm run lint`, `npm run check`, `npm test` e `npm run build` devono essere verdi prima del commit.

## Checklist

- [ ] cartella `src/lib/moduli/<area>/<modulo>/` con `modulo.ts` (`satisfies ModuloDati`)
- [ ] id in kebab-case, scelti per durare
- [ ] ogni attività: obiettivo, riepilogo, minuti, competenze allenate, traguardi, schede Scopri → Proviamo insieme → Prova tu
- [ ] attività aggiunte al `percorso` dell'area
- [ ] widget propri registrati in `widget`, con `schemaProps`, esiti e `onfine`
- [ ] testi brevi e incoraggianti; feedback che dice cosa fare
- [ ] `stato: 'bozza'` finché non c'è una revisione
- [ ] test verdi
