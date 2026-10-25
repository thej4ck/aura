# 0008. Ritmo: input, base dei tempi, latenza e valutazione

Stato: accettata · 2026-10-25 · il modulo Ritmo resta in bozza fino alla prova sui dispositivi veri

## Contesto

Il modulo Ritmo chiede al bambino (6-10 anni) di battere un ritmo: a eco (prima suona il sito, poi batte lui) o leggendolo.
Il canto misura altezze su frame da 30 al secondo e regge centinaia di millisecondi; il ritmo misura istanti, e 60-150 ms sono già la differenza tra "giusto" e "un po' presto".
Tocco, tastiera e microfono arrivano su orologi diversi (eventi del DOM, clock audio), e l'altoparlante è in ritardo di una quantità che il browser conosce solo in parte: le cuffie Bluetooth aggiungono 150-300 ms, Safari non dichiara `outputLatency`.

## Decisione

- **Input**, uno solo per turno:
  - tocco su un tasto grande con `pointerdown` (non `click`, che arriva al rilascio del dito) e Spazio o Invio con `keydown` (senza le ripetizioni del tasto tenuto);
  - battito di mani col microfono, a scelta (`audio/battimani.ts`), con le regole e la promessa del canto: niente si registra, il microfono si chiude a fine prova, uscendo dalla scheda e quando il browser nasconde la pagina.
- **Base dei tempi**: tutto sul clock audio. I suoni si programmano con `pianifica` (`audio/contesto.ts`). Ogni battito si porta nel **riferimento del suono sentito**: il tempo, sul clock audio, di quello che usciva dall'altoparlante in quel momento. Per gli eventi del DOM `tempoSentito(e.timeStamp)` usa `AudioContext.getOutputTimestamp()` (la coppia clock audio ↔ `performance.now()` del campione in uscita), con ripiego su `currentTime − outputLatency`; per il microfono si tolgono la latenza d'uscita e quella d'ingresso nota. Anche il battito visivo si disegna da `tempoSentito()`, così resta in fase con i clic sentiti.
- **Latenza**: oltre a quella che dichiara il browser si toglie la manopola `latenzaAudioMs` delle preferenze, che con il Ritmo si mostra ai genitori. Il resto (tocco, microfono, browser che non la dichiarano) è uno **scarto costante**: la valutazione toglie la mediana delle differenze tra battiti e note, entro ±`SCARTO_MAX_MS` (200 ms) e mai oltre metà della distanza minima tra due note. Conta il ritmo relativo: un tablet lento o le cuffie Bluetooth non fanno sbagliare tutto, un battito fuori dal gruppo sì.
- **Turni col microfono**, come nel canto: mentre il sito suona il microfono non sente (`riproduzioneAttiva()`). Il turno del bambino comincia con una battuta di clic (l'attacco), poi l'altoparlante tace e resta un battito visivo. Col tocco il metronomo può continuare piano (`VOLUME_CLIC_PIANO`). I BPM stanno tra 50 e 100 (`BPM_RITMO_MAX`): più veloce, la coda dell'attacco coprirebbe il primo battito del bambino. Si parte da 72.
- **Tolleranze**, dalla preferenza `tolleranza` e dopo aver tolto lo scarto: facile ±150 ms, medio ±100, preciso ±60 (`TOLLERANZE_RITMO_MS`).
- **Esito** (`musica/ritmo.ts`, puro): ogni battito va alla nota più vicina entro `ABBINAMENTO_MAX_MS` (250 ms); una nota tiene un solo battito, il più vicino, e gli altri sono in più. Una nota è giusta entro la tolleranza, altrimenti presto o tardi; senza battito è mancata. Le pause non si battono. La prova è riuscita se tutte le note sono giuste e non ci sono battiti in più; conta il primo tentativo, come nel canto. Il feedback dice il primo problema e cosa fare ("questa è arrivata un po' presto: aspetta il battito", "nella pausa le mani riposano"), mai "sbagliato". Alla fine i battiti compaiono sotto le note con una forma oltre al colore.
- **Sillabe ritmiche** (metodo Kodály, in uso nella scuola primaria): TA semiminima, TI-TI due crome, TA-A minima (TA-A-A puntata, TA-A-A-A semibreve), SST pausa. Un battito è una semiminima: i tempi sono 2/4, 3/4 e 4/4.
- **Notazione**: `Nota` aggiunge `pausa` e `punto`; `Rigo` aggiunge `tempo` (con le stanghette e il controllo che le battute siano piene) e `ritmico` (una linea, l'altezza non serve). Senza durate, tempo né pause un rigo resta quello di prima.

## Alternative scartate

- **`click`** per il tocco: arriva al rilascio, 50-150 ms dopo il gesto, e varia con il bambino.
- **Tutto su `performance.now()`**: i suoni non si programmano lì, e si perderebbe il legame con quello che esce dall'altoparlante.
- **Calibrazione guidata della latenza** (suona e tocca) al primo uso: un passaggio in più prima di giocare, e la mediana fa quasi lo stesso lavoro. Si aggiunge se le prove la chiedono.
- **Correggere anche il tempo** (un bambino che accelera piano piano): oggi si toglie solo lo scarto costante; se le prove mostrano che col battito solo visivo i bambini scivolano, si stima anche la pendenza, entro un limite.
- **Riconoscere il battito di mani nel thread principale a 30 frame al secondo**, come il canto: la precisione sarebbe di un frame (33 ms) e un thread occupato farebbe perdere battiti.

## Conseguenze

- Le prove vere decidono: tolleranze, scarto massimo, soglie del battito di mani e BPM sono costanti da calibrare in `audio/costanti.ts`.
- Ogni funzione audio nuova (legnetto, clic, battito di mani, `tempoSentito`) ha test che contano gli eventi con segnali realistici: rumore, voce, eco dell'altoparlante, battiti irregolari.
- La manopola della latenza nella pagina dei genitori torna visibile con il modulo.
