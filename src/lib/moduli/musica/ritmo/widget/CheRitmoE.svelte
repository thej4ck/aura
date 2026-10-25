<script lang="ts" module>
	import * as v from 'valibot';

	/** Props di `che-ritmo-e`: nessuna. Le domande le sceglie il seed (domandeAscolto in ritmi.ts). */
	export const schemaProps = v.object({});
</script>

<script lang="ts">
	// «Che ritmo è?»: il sito suona un ritmo, il bambino lo trova tra due o tre ritmi scritti. Sei giri
	// (GIRI_ASCOLTO): prima due ritmi con TA e TI-TI, poi tre, con TA-A e la pausa. Due ritmi che
	// all'orecchio suonano uguali (TA-A e TA SST) non sono mai insieme. Ogni giro è `scegli-ritmo`, con il
	// «Basta così» del gioco; un esito per giro, sul primo tentativo.
	import { untrack } from 'svelte';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import Button from '#lib/core/ui/Button.svelte';
	import { nonPerdereIlFocus } from '#lib/core/ui/focus.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { domandeAscolto, rigoDi } from '../ritmi.ts';
	import ScegliRitmo from './ScegliRitmo.svelte';

	let { scheda, contesto, onesito, onfine }: WidgetProps = $props();

	const domande = domandeAscolto(untrack(() => contesto.seed)).map((d) => ({
		domanda: m.ritmo_che_ritmo_domanda(),
		ritmi: d.ritmi.map(rigoDi),
		corretta: d.corretta,
		ascolta: true
	}));
	let i = $state(0);
	let elContatore = $state<HTMLElement>();

	function avanti() {
		if (i < domande.length - 1) {
			i++;
			void nonPerdereIlFocus(elContatore); // la domanda dopo, con i suoi pulsanti
		} else onfine();
	}
</script>

<div class="gioco">
	<p class="contatore" tabindex="-1" bind:this={elContatore}>
		{m.ritmo_giro_di({ numero: i + 1, totale: domande.length })}
	</p>
	{#key i}
		<ScegliRitmo {scheda} props={domande[i]} {contesto} {onesito} onfine={avanti}>
			{#snippet azioni()}
				<!-- «Basta così» sempre in vista: nella barra della scheda, accanto ad «Avanti» -->
				<Button variante="quieta" icona="chiudi" onclick={onfine}>{m.ritmo_basta()}</Button>
			{/snippet}
		</ScegliRitmo>
	{/key}
</div>

<style>
	.gioco {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	.contatore {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
	}
</style>
