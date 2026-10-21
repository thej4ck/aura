# 0004. Contenuti come dati, widget e grafo delle competenze

Stato: accettata · 2026-10-21

## Contesto

Oggi c'è la musica, domani matematica, fisica e scienze, magari in altre lingue e in classe.
Se ogni modulo avesse il proprio motore, ogni nuova materia richiederebbe nuovo codice per schede, verifica, stelle, ripasso e salvataggio.

## Decisione

Sul modello di H5P e dei widget Perseus di Khan Academy:

- Un modulo è **dati validati** in `src/lib/moduli/<area>/<modulo>/modulo.ts`: meta, competenze, attività, percorso. Il registry li trova con `import.meta.glob` e in produzione scarta le bozze (`stato: 'bozza'`).
- Un'attività è un elenco tipizzato di **schede**. Ogni scheda ha una `fase` (scopri, proviamo insieme, prova) e usa un **widget** (`spiegazione`, `ascolta`, `staff-tocca`, `scelta`, `canta-nota`, `canta-sequenza`, ...).
- Ogni widget emette lo stesso esito `{ corretto, item?, dettagli? }`. Un **motore unico** gestisce schede, verifica, stelle, competenze e salvataggio per tutti i moduli; conta per la padronanza solo la fase "prova".
- Un modulo può registrare **widget propri**, caricati in lazy.
- **Grafo delle competenze**: id globali (`musica.pentagramma.note-linee`), prerequisiti anche tra aree diverse; le attività dichiarano quali competenze allenano. Padronanza 0-4 con ripasso distanziato. I prerequisiti sono suggerimenti, non lucchetti.
- **Id stabili e qualificati** (`area.modulo.attivita`), usati anche negli URL: non si rinominano mai (vedi CONTRIBUTING).
- **Notazione standard**: `Nota = { altezza: 'F#4', durata? }`, `Rigo = { chiave, armatura?, note }`.
- Gli esercizi casuali usano un **PRNG con seed**, per test deterministici.

## Conseguenze

- Aggiungere un modulo è aggiungere una cartella: routing, selettore, percorso, progressi e pagina genitori funzionano senza toccare il core.
- Un test valida tutti i contenuti: schema, id unici, prerequisiti esistenti, grafo aciclico, widget registrati.
- L'interfaccia dei widget e la forma dell'esito sono un contratto: cambiarle tocca tutti i widget.
- Chiave di basso, ritmo o un renderer diverso (per esempio VexFlow) arrivano senza modificare i contenuti.
- I contenuti sono separabili dal codice e hanno la loro licenza (CC BY-SA 4.0).
