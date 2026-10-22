<script lang="ts">
	// Le cinque linee si disegnano dal basso, poi si numerano; poi si colorano i quattro spazi e si
	// numerano anche loro. Passi: 0 linee, 1 numeri delle linee, 2 spazi, 3 numeri degli spazi.
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import { ingresso } from './ingresso.svelte.ts';

	let stato: Partial<StatoDisegno> = $props();

	const LINEE = [116, 92, 68, 44, 20]; // y dal basso verso l'alto
	const passo = $derived(stato.passo ?? 3);
	const anima = ingresso(() => stato);
	/** classe degli elementi che entrano al passo `p` (il ritardo a cascata è --i) */
	const entra = (p: number) => ({ entra: anima.passo === p });
</script>

<svg class={['disegno', { fermo: !stato.inRiproduzione }]} viewBox="0 0 320 136" aria-hidden="true">
	{#if passo >= 2}
		{#each LINEE.slice(1) as y, i (i)}
			<rect
				class={['spazio', entra(2)]}
				style:--i={i}
				x="40"
				{y}
				width="248"
				height={LINEE[i] - y}
			/>
		{/each}
	{/if}
	{#each LINEE as y, i (i)}
		<line class={['linea', entra(0)]} style:--i={i} x1="40" x2="288" y1={y} y2={y} pathLength="1" />
		{#if passo >= 1}
			<text class={['numero', entra(1)]} style:--i={i} x="22" y={y + 6}>{i + 1}</text>
		{/if}
	{/each}
	{#if passo >= 3}
		{#each LINEE.slice(1) as y, i (i)}
			<text
				class={['numero', 'numero-spazio', entra(3)]}
				style:--i={i}
				x="304"
				y={(y + LINEE[i]) / 2 + 6}>{i + 1}</text
			>
		{/each}
	{/if}
</svg>

<style>
	.disegno {
		width: min(100%, 28rem);
		height: auto;
	}
	.linea {
		stroke: var(--colore-testo);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-dasharray: 1;
	}
	.spazio {
		fill: var(--colore-accento-tenue);
	}
	.numero {
		fill: var(--colore-testo);
		font-size: 17px;
		font-weight: var(--peso-forte);
		text-anchor: middle;
	}
	.numero-spazio {
		fill: var(--colore-accento-forte);
	}
	/* ingresso a cascata, dal basso */
	.entra {
		animation: compari 500ms var(--easing-uscita) calc(var(--i) * 260ms) both;
	}
	.linea.entra {
		animation-name: disegna;
		animation-duration: 700ms;
	}
	.fermo .entra {
		animation-play-state: paused;
	}
	@keyframes disegna {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes compari {
		from {
			opacity: 0;
		}
	}
</style>
