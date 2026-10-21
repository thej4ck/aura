<script lang="ts">
	type Props = {
		/** percentuale 0-100 */
		valore: number;
		/** testo accessibile completo, es. "3 attività su 5 completate" */
		etichetta: string;
		dimensione?: string;
	};

	let { valore, etichetta, dimensione = '3rem' }: Props = $props();

	const R = 20;
	const CIRCONFERENZA = 2 * Math.PI * R;
	const pieno = $derived(Math.min(100, Math.max(0, valore)) / 100);
</script>

<svg
	class="anello"
	viewBox="0 0 48 48"
	width={dimensione}
	height={dimensione}
	role="img"
	aria-label={etichetta}
>
	<circle class="traccia" cx="24" cy="24" r={R} />
	{#if pieno > 0}
		<circle
			class="valore"
			cx="24"
			cy="24"
			r={R}
			stroke-dasharray={CIRCONFERENZA}
			stroke-dashoffset={CIRCONFERENZA * (1 - pieno)}
			transform="rotate(-90 24 24)"
		/>
	{/if}
	{#if pieno >= 1}
		<path class="spunta" d="M16 24.5l5.5 5.5L32 19" />
	{/if}
</svg>

<style>
	.anello {
		flex: none;
	}
	circle {
		fill: none;
		stroke-width: 5;
	}
	.traccia {
		stroke: var(--colore-bordo);
	}
	.valore {
		stroke: var(--colore-accento);
		stroke-linecap: round;
		transition: stroke-dashoffset var(--durata-lunga) var(--easing-uscita);
	}
	.spunta {
		fill: none;
		stroke: var(--colore-accento);
		stroke-width: 3.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
