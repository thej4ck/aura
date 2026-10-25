// Manopole di calibrazione dell'audio. Sono valori di partenza ragionevoli, da regolare dopo le prove
// reali con i bambini (tablet e telefoni veri, stanze vere). Cambiarle non tocca i salvataggi.

/** Quanto può scostarsi la voce dalla nota (100 cent = 1 semitono), per livello. */
export const TOLLERANZE_CENTS = { facile: 50, medio: 30, preciso: 15 } as const;
export type LivelloTolleranza = keyof typeof TOLLERANZE_CENTS;

/**
 * Volume minimo assoluto (RMS del segnale dopo il passa-basso, 0-1; 0.001 = −60 dBFS): sotto non si
 * analizza nemmeno. Con il controllo automatico del volume spento una voce a distanza normale sta tra
 * −46 e −34 dBFS e oscilla di ±6 dB: il vecchio gate fisso a 0.01 (−40 dBFS) ne buttava via un terzo,
 * a −46 dBFS tutta (misure con il microfono finto: vedi mic.ts).
 */
export const GATE_RMS = 0.001;

/**
 * Gate adattivo: il frame deve stare almeno MARGINE_GATE volte sopra il rumore di fondo stimato, e mai
 * sotto GATE_RMS. Con 2 (+6 dB, rumore compreso) la voce ha ~5 dB sul rumore: il minimo che YIN regge
 * con il passa-basso. Il rumore si stima dai frame senza nota: scende subito al livello più
 * basso sentito e risale al massimo di RISALITA_RUMORE_DB_S al secondo, così una tosse non alza la
 * soglia e una ventola accesa sì, in qualche secondo. I frame con la nota non lo toccano mai: una
 * voce tenuta non diventa "rumore".
 */
export const MARGINE_GATE = 2;
export const RISALITA_RUMORE_DB_S = 6;

/** Campioni per frame del microfono: a 48 kHz sono ~43 ms, più di due periodi della nota più grave. */
export const FFT = 2048;

/**
 * Passa-basso prima di YIN (Hz): toglie il rumore a banda larga (ventola, fruscio, respiro), che sotto
 * ~8 dB di SNR non fa più riconoscere la voce, e permette di analizzare metà dei campioni. Resta sopra
 * FREQ_MAX con margine: la fondamentale non si tocca.
 */
export const PASSA_BASSO_HZ = 2000;

/** Frame del microfono al secondo (anche con schermi a 60 o 120 Hz). */
export const FPS_MIC = 30;

/**
 * Frame su cui si calcola la mediana dell'altezza (a ~30 frame/s sono ~170 ms). Esce una nota quando
 * più di metà dei frame della finestra ne hanno una: un buco di uno o due frame non rompe la scia.
 */
export const MEDIANA = 5;

/** Intervallo delle voci (adulti e bambini, parlato e canto), in Hz: fuori da qui il frame è scartato. */
export const FREQ_MIN = 80;
export const FREQ_MAX = 1100;

/** Soglia assoluta di YIN: più bassa = più esigente sulla periodicità (meno falsi, più frame persi). */
export const SOGLIA_YIN = 0.15;

/**
 * Ripiego di YIN (come nell'articolo): se nessun lag scende sotto SOGLIA_YIN si prende il minimo
 * globale, purché sotto questo limite. Le voci vere, ruvide o con il respiro, stanno spesso tra 0.15 e
 * 0.35; il rumore senza altezza, passato dal passa-basso come nel microfono, non scende sotto 0.6.
 * La chiarezza (1 − CMNDF) dice quando è un ripiego.
 */
export const SOGLIA_YIN_RIPIEGO = 0.35;

/**
 * Un buco nella voce più corto di così (respiro, consonante, frame persi) non rompe niente: la tenuta
 * aspetta invece di calare e il misuratore unisce la scia.
 */
export const BUCO_VOCE_MS = 300;

/** Dopo quanto tempo senza suoni né microfono l'AudioContext si sospende (batteria). */
export const IDLE_SUSPEND_MS = 30_000;

/** Volume generale del sito (0-1), dopo il compressore: moderato, per le orecchie dei bambini. */
export const VOLUME = 0.5;

/** Tenuta di una nota da sola (canta-nota, "Tieni la nota"): in zona per 3 s, anche a più riprese. */
export const TENUTA_MS = 3000;

/** Tenuta minima di ogni nota di una sequenza (canta-sequenza, "Eco"). */
export const TENUTA_SEQUENZA_MS = 600;

/** Fuori zona o in silenzio il progresso della tenuta cala a questa frazione della velocità con cui cresce. */
export const CALO_TENUTA = 0.5;

/**
 * Tempo di ascolto (senza i momenti in cui suona il sito) prima di proporre di riascoltare. Era 20 s:
 * provando dal vero, a un bambino che cerca ancora la nota sembrava di essere interrotto.
 */
export const ASCOLTO_MAX_MS = 40_000;

/**
 * «Non serve cantare più forte» (musica/voce-forte.ts): per arrivare a una nota molti bambini alzano il
 * volume e forzano la voce. VOCE_BASE_MS di voce danno il livello di partenza; l'avviso arriva dopo
 * FORTE_MS di voce più forte di CRESCENDO_DB rispetto alla partenza mentre è fuori nota, oppure oltre
 * FORTE_DBFS in assoluto (con il controllo automatico del volume spento una voce normale sta tra −46 e
 * −34 dBFS, vedi GATE_RMS). Valori di partenza: da calibrare con le prove sui dispositivi veri.
 */
export const VOCE_BASE_MS = 1000;
export const CRESCENDO_DB = 10;
export const FORTE_DBFS = -14;
export const FORTE_MS = 800;

/** "Nota comoda": mediana della voce negli ultimi FINESTRA ms, quando ne è piena almeno COPERTURA. */
export const FINESTRA_NOTA_COMODA_MS = 2000;
export const COPERTURA_NOTA_COMODA = 0.75;

// --- Ritmo (ADR 0008) ---------------------------------------------------------------------------

/**
 * Quanto può scostarsi un battito dalla sua nota (ms), per livello, dopo aver tolto lo scarto costante.
 * Oltre è "un po' presto" o "un po' tardi", mai "sbagliato".
 */
export const TOLLERANZE_RITMO_MS = {
	facile: 150,
	medio: 100,
	preciso: 60
} as const satisfies Record<LivelloTolleranza, number>;

/** Battiti al minuto di partenza: lento e calmo (una semiminima ~0,83 s, una croma ~0,42 s). */
export const BPM_RITMO = 72;
/**
 * BPM ammessi nei contenuti. Sopra 100, col microfono, la coda dell'attacco (ultimo clic, eco, latenza)
 * finirebbe dentro la finestra del primo battito del bambino e lo zittirebbe.
 */
export const BPM_RITMO_MIN = 50;
export const BPM_RITMO_MAX = 100;

/**
 * Scarto costante massimo (ms) che la valutazione toglie: la latenza che resta dopo outputLatency e la
 * manopola (tocco, microfono, Bluetooth, Safari che non la dichiara). Mai oltre metà della distanza
 * minima tra due note, così un battito non salta sulla nota vicina.
 */
export const SCARTO_MAX_MS = 200;

/** Oltre questa distanza (ms) dalla nota più vicina, scarto tolto, un battito è "in più". */
export const ABBINAMENTO_MAX_MS = 250;

/** Dopo un battito di mani, per quanto (ms) non se ne sente un altro: doppio picco, eco della stanza. */
export const REFRATTARIO_BATTITO_MS = 150;

/** Volume dei clic sotto i battiti del bambino quando batte col tocco (0-1; l'attacco è a 1). */
export const VOLUME_CLIC_PIANO = 0.35;

// --- Battito di mani (audio/battimani.ts) --------------------------------------------------------
// Misure sui segnali sintetici di scripts/genera-wav.mjs (battimani.test.ts): battiti di mani in stanze
// diverse, rumori, voci parlate e cantate. Da ricontrollare con i dispositivi veri (pannello in /dev).

/**
 * Il battito si cerca negli acuti, sopra PASSA_ALTO_BATTITO_HZ: un battito di mani lì ha ancora molta
 * energia, le vocali, il rimbombo, le ventole e il ronzio della corrente quasi niente.
 */
export const PASSA_ALTO_BATTITO_HZ = 2000;

/**
 * L'attacco: l'energia acuta di un millisecondo sale di almeno SALTO_BATTITO_DB sopra la media dei
 * SALTO_PRIMA_MS prima (tolti i 2 ms appena prima, dove l'attacco può essere già cominciato). Un rumore
 * costante non salta mai così in un millisecondo, una vocale sale in 20-50 ms. Con 12 dB un battito
 * piano (−30 dBFS) dentro una ventola a −40 dBFS si perdeva una volta su due.
 */
export const SALTO_BATTITO_DB = 9;
export const SALTO_PRIMA_MS = 20;

/**
 * Soglia adattiva: quel millisecondo sta almeno MARGINE_BATTITO_DB sopra il rumore di fondo negli acuti
 * (RumoreDiFondo come nel canto, a blocchi di 10 ms: scende subito, risale piano) e mai sotto
 * SOGLIA_BATTITO_RMS (−54 dBFS negli acuti): nel silenzio si sente un battito con il picco a −40 dBFS.
 */
export const MARGINE_BATTITO_DB = 10;
export const SOGLIA_BATTITO_RMS = 0.002;

/**
 * Un battito si spegne subito: CALO_DA_MS-CALO_A_MS dopo l'attacco l'energia sopra PASSA_ALTO_CALO_HZ
 * (lì il rimbombo e le ventole, che ondeggiano piano, non ci sono) sta almeno CALO_BATTITO_DB sotto
 * quella dei primi 10 ms, tolta in entrambi quella che c'era già prima. Un battito cala di 13-15 dB in
 * un soggiorno e di 7-9 dB in un'aula che rimbomba, a due metri; la /t/ di «ta», seguita dalla sua
 * vocale, sale di 10 dB e più. Il battito si decide quindi CALO_A_MS dopo, ma il suo tempo resta
 * quello dell'attacco.
 */
export const CALO_BATTITO_DB = 3;
export const PASSA_ALTO_CALO_HZ = 400;
export const CALO_DA_MS = 40;
export const CALO_A_MS = 80;

/** Banda larga: nei primi 10 ms gli acuti sono almeno ACUTI_BATTITO_DB dell'energia (un tonfo sordo no). */
export const ACUTI_BATTITO_DB = -12;

/**
 * Né una /t/ né una /s/: un battito ha più energia sotto PASSA_ALTO_SIBILI_HZ (la cavità tra le mani
 * risuona tra 0,8 e 3 kHz) che sopra, o al massimo SIBILI_BATTITO_DB in meno; l'esplosione di una /t/
 * senza vocale dopo, come in «sst», sta quasi tutta sopra. Battiti tra +0,7 e +9 dB, la /t/ di «sst» tra
 * −5 e −2 dB: il margine è stretto, da verificare con le voci vere.
 */
export const PASSA_ALTO_SIBILI_HZ = 4000;
export const SIBILI_BATTITO_DB = 0;
