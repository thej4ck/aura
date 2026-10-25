<script lang="ts">
	// I giri di «Eco ritmica» e di «Leggi e batti»: un turno ritmico del core (TurnoRitmo) per giro, con il
	// contatore e il «Basta così» del gioco sempre in vista. «Avanti», alla fine del turno, chiama `avanti`;
	// ogni giro ha il suo turno, che chiude il microfono quando si passa oltre. Un esito per giro, sul primo
	// tentativo.
	import { BPM_RITMO } from '#lib/core/audio/costanti.ts';
	import type { Rigo } from '#lib/core/contenuti/schema.ts';
	import type { ContestoWidget, EsitoWidget } from '#lib/core/motore/widget.ts';
	import Button from '#lib/core/ui/Button.svelte';
	import { nonPerdereIlFocus } from '#lib/core/ui/focus.ts';
	import TurnoRitmo from '#lib/core/widget/TurnoRitmo.svelte';
	import { m } from '#lib/paraglide/messages.js';

	type Props = {
		giro: { rigo: Rigo; item: string; sillabe: boolean };
		numero: number;
		totale: number;
		modo: 'eco' | 'lettura';
		/** una riga sopra il turno: cosa c'è di nuovo, un aiuto */
		nota?: string;
		contesto: ContestoWidget;
		onesito: (e: EsitoWidget) => void;
		/** il giro dopo (o la fine, dopo l'ultimo) */
		avanti: () => void;
		/** «Basta così»: il gioco finisce qui, i giri non fatti non contano */
		onfine: () => void;
	};

	let { giro, numero, totale, modo, nota, contesto, onesito, avanti, onfine }: Props = $props();

	let elContatore = $state<HTMLElement>();
</script>

<div class="giri">
	<p class="contatore" tabindex="-1" bind:this={elContatore}>
		{m.ritmo_giro_di({ numero, totale })}
	</p>
	{#if nota}<p class="nota">{nota}</p>{/if}
	{#key numero}
		<TurnoRitmo
			rigo={giro.rigo}
			{modo}
			bpm={BPM_RITMO}
			sillabe={giro.sillabe}
			{contesto}
			item={giro.item}
			{onesito}
			onfine={() => {
				avanti();
				void nonPerdereIlFocus(elContatore); // il turno ricomincia, con i suoi pulsanti
			}}
		>
			{#snippet azioni()}
				<!-- «Basta così» sempre in vista: nella barra della scheda, accanto ad «Avanti» -->
				<Button variante="quieta" icona="chiudi" onclick={onfine}>{m.ritmo_basta()}</Button>
			{/snippet}
		</TurnoRitmo>
	{/key}
</div>

<style>
	.giri {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	.contatore {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
	}
	.nota {
		color: var(--colore-testo-tenue);
	}
</style>
