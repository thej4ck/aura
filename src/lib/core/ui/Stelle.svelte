<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Icona from './Icona.svelte';

	type Props = {
		/** stelle conquistate, 0-3: quelle non ancora conquistate restano "da conquistare", mai perse */
		stelle: number;
		dimensione?: string;
		/** fa comparire le stelle conquistate una dopo l'altra (riepilogo); spento con movimento ridotto */
		anima?: boolean;
	};

	let { stelle, dimensione = '1.5rem', anima = false }: Props = $props();

	const n = $derived(Math.min(3, Math.max(0, Math.trunc(stelle))));
</script>

<span class="stelle" role="img" aria-label={m.stelle_etichetta({ stelle: n })}>
	{#each [1, 2, 3] as i (i)}
		<span
			class={['stella', { conquistata: i <= n, anima }]}
			style:animation-delay="{(i - 1) * 180}ms"
		>
			<Icona nome="stella" {dimensione} riempita={i <= n} />
		</span>
	{/each}
</span>

<style>
	.stelle {
		display: inline-flex;
		gap: 0.15em;
		align-items: center;
	}
	.stella {
		display: inline-flex;
		color: var(--colore-bordo-forte);
	}
	.conquistata {
		color: var(--colore-stella);
	}
	.conquistata.anima {
		animation: compare var(--durata-lunga) var(--easing-uscita) both;
	}
	@keyframes compare {
		from {
			opacity: 0;
			transform: scale(0.4) rotate(-20deg);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
