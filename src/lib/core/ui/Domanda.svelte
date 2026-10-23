<script lang="ts">
	// La domanda di un widget, con accanto il pulsante che la legge ad alta voce, per chi non legge ancora.
	// Legge anche `poi` (il feedback dopo una risposta, le opzioni), una frase alla volta.
	import { m } from '#lib/paraglide/messages.js';
	import LeggiAltaVoce from './LeggiAltaVoce.svelte';

	type Props = {
		testo: string;
		/** da leggere dopo la domanda; i vuoti si saltano */
		poi?: readonly (string | false | null | undefined)[];
		/** la preferenza "lettura ad alta voce" del profilo */
		attivo: boolean;
		id?: string;
	};

	let { testo, poi = [], attivo, id }: Props = $props();

	/** un punto alla fine di ogni parte che non ce l'ha: la voce fa una pausa tra le opzioni */
	const frase = (s: string) => (/[.!?…:]$/.test(s) ? s : `${s}.`);
	const daLeggere = $derived(
		[testo, ...poi]
			.filter((s): s is string => !!s)
			.map(frase)
			.join(' ')
	);
</script>

<div class="domanda">
	<p {id}>{testo}</p>
	<LeggiAltaVoce testo={daLeggere} {attivo} etichetta={m.leggi_domanda()} />
</div>

<style>
	.domanda {
		display: flex;
		gap: var(--spazio-4);
		align-items: flex-start;
		justify-content: space-between;
	}
	p {
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
	}
</style>
