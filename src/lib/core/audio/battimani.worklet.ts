// AudioWorklet del battito di mani (battimani.ts): passa al thread principale i campioni del microfono a
// blocchi continui, ognuno con il frame del suo primo campione sul clock audio. Nessuna analisi qui: se
// il thread principale è occupato i blocchi aspettano in coda e il tempo di ogni campione resta quello
// vero. Caricato da 'self' (?worker&url), come vuole la CSP.

// l'ambiente del worklet non è nei tipi di TypeScript
declare const currentFrame: number;
declare function registerProcessor(nome: string, processore: unknown): void;
declare class AudioWorkletProcessor {
	readonly port: MessagePort;
}

/** campioni per messaggio: ~11 ms a 48 kHz */
const BLOCCO = 512;

registerProcessor(
	'battimani',
	class extends AudioWorkletProcessor {
		blocco = new Float32Array(BLOCCO);
		n = 0;
		primo = 0;
		finito = false;

		constructor() {
			super();
			// chiudi(): niente più blocchi, e process() che restituisce false lascia liberare il nodo
			this.port.onmessage = () => (this.finito = true);
		}

		process(ingressi: Float32Array[][]): boolean {
			if (this.finito) return false;
			// senza ingresso (microfono non ancora partito) passa silenzio: i frame restano continui
			const x = ingressi[0]?.[0];
			const quanti = x?.length ?? 128;
			if (this.n + quanti > BLOCCO) this.invia();
			if (this.n === 0) this.primo = currentFrame;
			if (x) this.blocco.set(x, this.n);
			this.n += quanti;
			if (this.n === BLOCCO) this.invia();
			return true;
		}

		invia() {
			const campioni = this.blocco.subarray(0, this.n);
			this.port.postMessage({ primo: this.primo, campioni }, [this.blocco.buffer]);
			this.blocco = new Float32Array(BLOCCO);
			this.n = 0;
		}
	}
);

export {};
