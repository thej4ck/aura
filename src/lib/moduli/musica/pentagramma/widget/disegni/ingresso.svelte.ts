// Comune ai disegni animati del modulo (contratto StatoDisegno di PlayerPassi): quale passo sta
// animando il suo ingresso. Le animazioni sono CSS: un elemento del passo `anima` riceve la classe che
// le fa partire; la pausa è `animation-play-state: paused` sulla radice mentre non è in riproduzione.
import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';

/**
 * -1 = nessuna animazione, si vede il fotogramma finale. Si anima entrando in un passo durante la
 * riproduzione, o premendo play su un passo fermo; mai con il movimento ridotto. Cambiando passo in
 * pausa si salta al fotogramma finale del nuovo passo.
 */
export function ingresso(stato: () => Partial<StatoDisegno>) {
	let anima = $state(-1);
	let ultimo: number | undefined;
	$effect(() => {
		const { passo = 0, inRiproduzione = false, riduciMovimento = true } = stato();
		if (riduciMovimento) anima = -1;
		else if (passo !== ultimo) anima = inRiproduzione ? passo : -1;
		else if (inRiproduzione) anima = passo;
		ultimo = passo;
	});
	return {
		get passo() {
			return anima;
		}
	};
}
