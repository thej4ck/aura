<script lang="ts">
	// Una serie di turni di canto, uno dopo l'altro (i giochi "Tieni la nota" ed "Eco"). Ogni giro è il
	// turno di canto dei widget core (Canto.svelte): ascolta, poi canta; un esito per giro, sul primo
	// tentativo. «Avanti» passa al giro dopo; «Basta così» finisce la serie quando si vuole: i giri non
	// fatti non contano. Ogni giro ha il suo Canto, che chiude il microfono quando si passa oltre.
	import type { Rigo } from '#lib/core/contenuti/schema.ts';
	import type { ContestoWidget, EsitoWidget } from '#lib/core/motore/widget.ts';
	import Button from '#lib/core/ui/Button.svelte';
	import Canto from '#lib/core/widget/Canto.svelte';
	import { m } from '#lib/paraglide/messages.js';

	type Props = {
		giri: readonly { rigo: Rigo; item: string }[];
		/** testo del contatore: "Nota 2 di 4", "Giro 2 di 4" */
		contatore: (numero: number, totale: number) => string;
		tenutaMs: number;
		/** secondi di ogni nota suonata dal sito */
		durataS: number;
		contesto: ContestoWidget;
		onesito: (e: EsitoWidget) => void;
		onfine: () => void;
	};

	let { giri, contatore, tenutaMs, durataS, contesto, onesito, onfine }: Props = $props();

	let indice = $state(0);
	const giro = $derived(giri[Math.min(indice, giri.length - 1)]);

	function prossimo() {
		if (indice < giri.length - 1) indice++;
		else onfine();
	}
</script>

<div class="serie">
	<div class="testa">
		<p class="contatore">{contatore(indice + 1, giri.length)}</p>
		<Button variante="quieta" icona="chiudi" onclick={onfine}>{m.canto_basta()}</Button>
	</div>
	{#key indice}
		<Canto
			rigo={giro.rigo}
			{tenutaMs}
			equivalenzaOttava
			{durataS}
			etichette
			colori
			{contesto}
			item={giro.item}
			{onesito}
			onfine={prossimo}
		/>
	{/key}
</div>

<style>
	.serie {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	.contatore {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
	}
	/* «Basta così» sempre in vista, in alto accanto al contatore */
	.testa {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
		align-items: center;
		justify-content: space-between;
	}
</style>
