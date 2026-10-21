// Manopole di calibrazione dell'audio. Sono valori di partenza ragionevoli, da regolare dopo le prove
// reali con i bambini (tablet e telefoni veri, stanze vere). Cambiarle non tocca i salvataggi.

/** Quanto può scostarsi la voce dalla nota (100 cent = 1 semitono), per livello. */
export const TOLLERANZE_CENTS = { facile: 50, medio: 30, preciso: 15 } as const;
export type LivelloTolleranza = keyof typeof TOLLERANZE_CENTS;

/** Volume minimo (RMS del segnale, 0-1; 0.01 ≈ −40 dBFS): sotto è silenzio o rumore di fondo. */
export const GATE_RMS = 0.01;

/** Campioni per frame del microfono: a 48 kHz sono ~43 ms, più di due periodi della nota più grave. */
export const FFT = 2048;

/** Frame su cui si calcola la mediana dell'altezza (a ~30 frame/s sono ~170 ms). */
export const MEDIANA = 5;

/** Intervallo delle voci (adulti e bambini, parlato e canto), in Hz: fuori da qui il frame è scartato. */
export const FREQ_MIN = 80;
export const FREQ_MAX = 1100;

/** Soglia assoluta di YIN: più bassa = più esigente sulla periodicità (meno falsi, più frame persi). */
export const SOGLIA_YIN = 0.15;

/** Dopo quanto tempo senza suoni né microfono l'AudioContext si sospende (batteria). */
export const IDLE_SUSPEND_MS = 30_000;

/** Volume generale del sito (0-1), dopo il compressore: moderato, per le orecchie dei bambini. */
export const VOLUME = 0.5;
