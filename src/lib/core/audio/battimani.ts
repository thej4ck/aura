// Battito di mani dal microfono (ADR 0008): tutto dentro la pagina, come mic.ts. L'audio non si registra,
// non si salva e non esce mai dal browser.
// CONTRATTO: firme fissate, corpo da implementare (con battimani.test.ts e segnali realistici).
import type { MotivoChiusura } from './mic.ts';

export type BattitoMani = {
	/**
	 * clock audio (s) dell'attacco del battito nel riferimento del suono sentito, come tempoSentito()
	 * (contesto.ts): tolte la latenza d'uscita, quella d'ingresso nota e la manopola `latenzaMs`. Preciso
	 * al campione dentro il blocco analizzato, non al frame (i frame di mic.ts sono a 30 al secondo)
	 */
	t: number;
	/** picco dell'attacco (ampiezza 0-1), per la diagnostica */
	forza: number;
};

export type BattiMani = {
	chiudi(): void;
	/** per la diagnostica: frequenza di campionamento, come si cattura, filtri davvero applicati */
	sampleRate: number;
	cattura: 'worklet' | 'raf';
	impostazioni: MediaTrackSettings;
};

/**
 * Apre il microfono e chiama `onbattito` a ogni battito di mani. Stesse regole di apriMicrofono (mic.ts):
 * sblocca() prima, nel gesto; lancia ErroreMic (e lo conta nelle statistiche anonime come 'mic'); senza
 * filtri per le chiamate; si chiude da solo quando la scheda si nasconde o la pagina viene lasciata, e
 * allora chiama `onchiuso`; chiudi() rilascia le tracce (idempotente).
 *
 * Comportamento atteso, ognuno con il suo test che CONTA gli eventi generati:
 * - un battito vero = un evento, entro ±5 ms dall'attacco, anche con battiti irregolari, piano e forte;
 * - mentre suona il sito (riproduzioneAttiva()) nessun evento: turni come nel canto, l'eco dei clic
 *   dell'attacco compresa;
 * - niente eventi dal rumore di fondo (ventola, fruscio) né dalla voce, parlata ("ta ti-ti") o cantata:
 *   il battito è un transitorio a banda larga con attacco di pochi ms, la voce no;
 * - dopo un battito, REFRATTARIO_BATTITO_MS di sordità: doppio picco ed eco della stanza non contano;
 * - soglia adattiva sul rumore di fondo stimato (come RumoreDiFondo in pitch.ts);
 * - il thread principale occupato fino a 100 ms non fa perdere battiti (AudioWorklet da 'self', già
 *   permesso dalla CSP, oppure buffer che si sovrappongono; rAF solo come ripiego).
 */
export async function apriBattiMani(opzioni: {
	onbattito: (b: BattitoMani) => void;
	onchiuso?: (motivo: MotivoChiusura) => void;
	/** la manopola latenzaAudioMs delle preferenze */
	latenzaMs?: number;
}): Promise<BattiMani> {
	void opzioni;
	throw new Error('apriBattiMani: da implementare (ADR 0008)');
}
