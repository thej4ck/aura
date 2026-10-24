<script lang="ts" module>
	import { createContext, type Snippet } from 'svelte';

	/** la barra in fondo alla scheda (motore/Attivita.svelte): mostra le azioni, toglierle è la funzione restituita */
	export type BarraScheda = { mostra(azioni: Snippet): () => void };
	export const [barraScheda, impostaBarraScheda, haBarraScheda] = createContext<BarraScheda>();
</script>

<script lang="ts">
	// I pulsanti di un widget (Avanti, Ascolta, Basta così…). Dentro un'attività finiscono nella barra in
	// fondo alla scheda, accanto a «Indietro», che resta sempre sullo schermo anche quando la scheda è più
	// alta; fuori (la vetrina di /dev) restano qui. Un widget ne mostra una sola alla volta.
	let { children }: { children: Snippet } = $props();

	const barra = haBarraScheda() ? barraScheda() : undefined;
	$effect(() => barra?.mostra(children));
</script>

{#if !barra}
	<div class="azioni">{@render children()}</div>
{/if}

<style>
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
		align-items: center;
	}
</style>
