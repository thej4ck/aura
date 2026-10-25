// Contenitori che scorrono in orizzontale (una tastiera o un rigo lunghi su un telefono) e la pagina,
// quando deve mostrare qualcosa che il bambino deve guardare adesso.

/** movimento ridotto dal sistema o dalle impostazioni di Aura: si salta, senza scorrere piano */
const salta = () =>
	matchMedia('(prefers-reduced-motion: reduce)').matches ||
	document.documentElement.hasAttribute('data-riduci-movimento');

/**
 * Attachment (`{@attach scorrevole}`): il bordo oltre cui c'è altro da vedere sfuma (`data-oltre`, stili
 * in base.css), così si capisce che si può scorrere. Se scorre e non ha niente di focalizzabile, prende il
 * focus: anche con la tastiera si può scorrere.
 */
export function scorrevole(el: HTMLElement) {
	const misura = () => {
		const resto = el.scrollWidth - el.clientWidth - el.scrollLeft;
		const oltre = [el.scrollLeft > 1 && 'inizio', resto > 1 && 'fine'].filter(Boolean).join(' ');
		if (oltre) el.dataset.oltre = oltre;
		else delete el.dataset.oltre;
		if (oltre && !el.querySelector('button')) el.tabIndex = 0;
		else el.removeAttribute('tabindex');
	};
	const osserva = new ResizeObserver(misura);
	osserva.observe(el);
	for (const figlio of el.children) osserva.observe(figlio);
	el.addEventListener('scroll', misura, { passive: true });
	return () => {
		osserva.disconnect();
		el.removeEventListener('scroll', misura);
	};
}

/** Porta in vista `figlio` (es. il tasto o la nota che suona) scorrendo solo `el`: la pagina resta ferma. */
export function inVista(el: HTMLElement, figlio: Element | null | undefined) {
	if (!figlio || el.scrollWidth <= el.clientWidth) return;
	const c = el.getBoundingClientRect();
	const r = figlio.getBoundingClientRect();
	const margine = c.width / 6; // non proprio sul bordo, dove sfuma
	const prima = r.left - c.left - margine;
	const dopo = r.right - c.right + margine;
	const dx = prima < 0 ? prima : dopo > 0 ? dopo : 0;
	if (!dx) return;
	el.scrollBy({ left: dx, behavior: salta() ? 'instant' : 'smooth' });
}

/**
 * Fa scorrere la pagina finché `el` (es. il misuratore della voce, quando tocca al bambino cantare) è tutto
 * sullo schermo, sopra la barra agganciata in fondo alla scheda (`[data-barra-fondo]`). Se è già in vista non
 * si muove niente; se non ci sta, resta in vista il suo bordo di sopra.
 */
export function mostraIntero(el: HTMLElement) {
	const margine = 8;
	const r = el.getBoundingClientRect();
	const barra =
		document.querySelector('[data-barra-fondo]')?.getBoundingClientRect().top ?? innerHeight;
	const fondo = Math.min(innerHeight, barra) - margine;
	const dy =
		r.top < margine
			? r.top - margine
			: r.bottom > fondo
				? Math.min(r.bottom - fondo, r.top - margine)
				: 0;
	if (dy) scrollBy({ top: dy, behavior: salta() ? 'instant' : 'smooth' });
}
