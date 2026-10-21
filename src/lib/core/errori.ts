// Registro degli ultimi errori: solo in memoria e nel localStorage del browser, mai inviato.
// L'adulto può copiarne i dettagli (pagina di errore) e mandarli lui, se vuole.
import * as v from 'valibot';

export const MAX_ERRORI = 10;
const CHIAVE = 'kindergarden:errori';

const SchemaVoce = v.object({
	quando: v.string(),
	pagina: v.string(),
	messaggio: v.string(),
	stack: v.optional(v.string())
});
export type VoceErrore = v.InferOutput<typeof SchemaVoce>;

let voci: VoceErrore[] | undefined;

function salvate(): VoceErrore[] {
	try {
		const r = v.safeParse(v.array(SchemaVoce), JSON.parse(localStorage.getItem(CHIAVE) ?? '[]'));
		return r.success ? r.output.slice(-MAX_ERRORI) : [];
	} catch {
		return []; // localStorage assente, bloccato o contenuto illeggibile
	}
}

export function ultimiErrori(): readonly VoceErrore[] {
	return (voci ??= salvate());
}

export function registraErrore(errore: unknown): void {
	const e = errore instanceof Error ? errore : new Error(String(errore));
	const voce: VoceErrore = {
		quando: new Date().toISOString(),
		// solo il percorso: niente query string né frammento
		pagina: typeof location === 'undefined' ? '' : location.pathname,
		messaggio: e.message.slice(0, 500),
		stack: e.stack?.slice(0, 2000)
	};
	voci = [...ultimiErrori(), voce].slice(-MAX_ERRORI);
	try {
		localStorage.setItem(CHIAVE, JSON.stringify(voci));
	} catch {
		// resta in memoria
	}
}

/** Testo da copiare: errori recenti più browser, nient'altro. */
export function dettagliErrori(): string {
	const browser = typeof navigator === 'undefined' ? '' : navigator.userAgent;
	const righe = ultimiErrori().map(
		(e) => `[${e.quando}] ${e.pagina}\n${e.messaggio}${e.stack ? `\n${e.stack}` : ''}`
	);
	return [`Kindergarden - browser: ${browser}`, ...righe].join('\n\n');
}
