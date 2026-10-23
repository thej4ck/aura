// Sintesi vocale solo con voci locali (voice.localService): le voci di rete mandano il testo a terzi.
// Nessun accesso a speechSynthesis durante l'import: il modulo è sicuro in SSR e nel prerender.

const sintesi = (): SpeechSynthesis | undefined =>
	typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis;

function voceLocale(lingua: string): SpeechSynthesisVoice | undefined {
	const l = lingua.toLowerCase();
	const locali = (sintesi()?.getVoices() ?? []).filter(
		(v) => v.localService && v.lang.toLowerCase().replace('_', '-').split('-')[0] === l
	);
	return locali.find((v) => v.default) ?? locali[0];
}

/** C'è una voce locale per la lingua? Aspetta (al massimo `attesaMs`) che il browser carichi le voci. */
export async function ttsDisponibile(lingua: string, attesaMs = 1500): Promise<boolean> {
	const s = sintesi();
	if (!s) return false;
	if (!s.getVoices().length) {
		await new Promise<void>((ok) => {
			const fine = () => {
				s.removeEventListener('voiceschanged', fine);
				ok();
			};
			s.addEventListener('voiceschanged', fine);
			setTimeout(fine, attesaMs);
		});
	}
	return voceLocale(lingua) !== undefined;
}

/**
 * Legge il testo con una voce locale; si risolve a fine lettura (o subito se non c'è una voce locale:
 * mai la voce predefinita, che potrebbe essere di rete).
 */
export function parla(testo: string, lingua: string): Promise<void> {
	const s = sintesi();
	const voce = voceLocale(lingua);
	if (!s || !voce) return Promise.resolve();
	s.cancel();
	return new Promise((ok) => {
		const u = new SpeechSynthesisUtterance(testo);
		u.voice = voce;
		u.lang = voce.lang;
		u.rate = 0.9; // un po' più lenta, per i bambini
		// Chrome a volte non manda onend (frase raccolta dal GC, cancel da un'altra lettura): senza fine
		// la lettura terrebbe il microfono in pausa. Si chiude anche quando la sintesi non parla più,
		// o al più tardi dopo una stima generosa della durata.
		let finita = false;
		const fine = () => {
			if (finita) return;
			finita = true;
			clearInterval(controllo);
			clearTimeout(limite);
			if (inLettura === u) inLettura = undefined;
			ok();
		};
		// i timer prima di speak: una sintesi può chiamare onend subito, dentro speak
		const controllo = setInterval(() => {
			if (!s.speaking && !s.pending) fine();
		}, CONTROLLO_MS);
		const limite = setTimeout(fine, Math.min(LIMITE_MAX_MS, 5_000 + testo.length * 120));
		u.onend = u.onerror = fine;
		inLettura = u; // un riferimento vivo: senza, Chrome può perdere la frase e i suoi eventi
		s.speak(u);
	});
}

const CONTROLLO_MS = 500;
const LIMITE_MAX_MS = 60_000;
let inLettura: SpeechSynthesisUtterance | undefined;

export function ferma(): void {
	sintesi()?.cancel();
}
