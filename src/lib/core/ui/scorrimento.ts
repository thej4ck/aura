// Contenitori che scorrono in orizzontale: una tastiera o un rigo lunghi su un telefono.

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
	const piano =
		matchMedia('(prefers-reduced-motion: reduce)').matches ||
		document.documentElement.hasAttribute('data-riduci-movimento');
	el.scrollBy({ left: dx, behavior: piano ? 'instant' : 'smooth' });
}
