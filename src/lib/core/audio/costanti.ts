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
