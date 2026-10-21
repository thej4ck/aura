import type { HandleClientError } from '@sveltejs/kit/hooks';
import { registraErrore } from '#lib/core/errori.ts';

// Errori senza tracciamento: si registrano solo in locale (errori.ts), nessun invio di rete.
// Solo quelli 'unknown' (difetti del codice): i 404 e gli error() voluti non sono guasti.
export const handleError: HandleClientError = ({ kind, error }) => {
	if (kind === 'unknown') registraErrore(error);
};

// anche quelli fuori dal ciclo di SvelteKit (handler di eventi, promesse non gestite)
addEventListener('error', (e) => registraErrore(e.error ?? e.message));
addEventListener('unhandledrejection', (e) => registraErrore(e.reason));
