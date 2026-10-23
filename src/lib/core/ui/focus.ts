import { tick } from 'svelte';

/**
 * Dopo un cambio che toglie dal DOM il pulsante appena premuto (il giro dopo di un gioco, una fase nuova):
 * il focus va su `el` (di solito con tabindex="-1") invece di perdersi su <body>, e il lettore di schermo
 * legge dove si è arrivati. Se il focus è altrove non lo sposta.
 */
export async function nonPerdereIlFocus(el: HTMLElement | undefined) {
	await tick();
	if (!document.activeElement || document.activeElement === document.body) el?.focus();
}
