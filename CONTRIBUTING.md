# Contribuire a Kindergarden

Grazie per il tuo aiuto. Questo progetto è usato da bambini: privacy, accessibilità e tono dei contenuti contano quanto il codice.

## Come si lavora

1. Leggi il [README](README.md) e le decisioni in [`docs/adr/`](docs/adr/).
2. Crea un branch da `main`.
3. Prima di aprire la pull request, tutti i controlli devono essere verdi:

   ```sh
   npm run lint
   npm run check
   npm test
   npm run build
   npm run test:e2e
   ```

4. Una pull request fa una cosa sola. Se cambia una decisione di architettura, aggiunge o aggiorna un ADR.

## Commit

- Messaggi in inglese secondo [Conventional Commits](https://www.conventionalcommits.org/): `feat(store): ...`, `fix(audio): ...`, `docs: ...`, `test: ...`, `build: ...`, `ci: ...`, `chore: ...`.
- Commit piccoli, un passo logico per commit.
- **DCO**: ogni commit porta la riga `Signed-off-by` (`git commit -s`). Con questa riga dichiari di avere il diritto di inviare il contributo secondo il [Developer Certificate of Origin](https://developercertificate.org/).

## Id stabili

Aree, moduli, attività e competenze hanno id qualificati, minuscoli, con le parole separate da trattini:

- attività: `area.modulo.attivita` (es. `musica.canto.estensione`)
- competenze: `area.modulo.competenza` (es. `musica.pentagramma.note-linee`)

Gli id finiscono negli URL e nei file di salvataggio delle famiglie. Quindi:

- **un id non si rinomina mai e non si riusa** per qualcosa di diverso;
- se proprio serve cambiare, si aggiunge una **migrazione** dello schema dei progressi (versione `schema` + 1, funzione di migrazione, test con un file della versione precedente);
- i titoli visibili si possono cambiare liberamente: l'id resta.

## Contenuti per bambini

- Frasi brevi, parole semplici, un concetto per scheda, una sola azione per schermata.
- Tono calmo e incoraggiante. Non si scrive mai "sbagliato": il feedback dice cosa fare ("un po' più su ↑").
- Si riconosce l'impegno, non si confronta con gli altri.
- Ogni attività ha un obiettivo esplicito all'inizio e un riepilogo alla fine; le schede seguono le fasi scopri, proviamo insieme, prova tu.
- Ogni concetto passa per vista, udito e azione. Il colore non è mai l'unico segnale.
- Niente timer, serie da non interrompere, vite, classifiche, ricompense casuali, notifiche.
- Per il canto: non si forza mai la voce, "Basta così" è sempre a portata di mano.
- I testi dell'interfaccia vanno in `messages/it.json`, mai scritti direttamente nei componenti. I testi delle lezioni stanno nei dati del modulo.
- I contenuti nuovi partono come `stato: 'bozza'` e diventano `pubblicata` dopo una revisione.
- Indica nel meta dell'attività i traguardi delle Indicazioni Nazionali a cui si riferisce.

I contenuti didattici sono rilasciati sotto [CC BY-SA 4.0](LICENSE-CONTENUTI.md): contribuisci solo materiale tuo o compatibile con questa licenza, citando le fonti.

## Privacy

- Nessuna richiesta di rete verso terzi, né a runtime né da risorse incorporate: font, immagini, audio e script sono serviti dal sito stesso.
- Niente cookie, analytics, telemetria, servizi di raccolta errori (per esempio Sentry), pixel o widget esterni.
- I dati restano nel browser. Il microfono si elabora solo in locale e il suo audio non esce mai dal dispositivo.
- La sintesi vocale usa solo voci locali (`voice.localService`): quelle di rete inviano il testo a terzi.
- Mai `{@html}` su dati che non siano statici e scritti da noi.
- I file importati sono input non fidato: si validano (Valibot), si limita la dimensione e si migrano prima di unirli ai progressi.
- Ogni nuova dipendenza va motivata nella pull request. Le dipendenze a runtime devono restare pochissime.
- La CSP non si allenta senza un ADR che spieghi perché.

## Comportamento

Partecipando accetti il [Codice di Comportamento](CODE_OF_CONDUCT.md). Le vulnerabilità si segnalano come descritto in [SECURITY.md](SECURITY.md), non con issue pubbliche.
