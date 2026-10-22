<script lang="ts">
	// Un pezzo di pentagramma ingrandito: una nota sulla linea (la linea la attraversa nel mezzo), poi una
	// nota nello spazio (sta tra due linee e le tocca). Passi: 0 sulla linea, 1 nello spazio, 2 tutte e due.
	import { m } from '#lib/paraglide/messages.js';
	import { GLIFI } from '#lib/core/musica/glifi.ts';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import { ingresso } from './ingresso.svelte.ts';

	let stato: Partial<StatoDisegno> = $props();

	const S = 30; // uno spazio
	const LINEE = [100, 70, 40];
	const TESTA = GLIFI.testaPiena;
	const passo = $derived(stato.passo ?? 2);
	const anima = ingresso(() => stato);
</script>

<svg class={['disegno', { fermo: !stato.inRiproduzione }]} viewBox="0 0 320 150" aria-hidden="true">
	{#if passo >= 1}
		<rect class={['spazio', { entra: anima.passo === 1 }]} x="170" y="70" width="130" height="30" />
	{/if}
	{#each LINEE as y (y)}
		<line class={['linea', { attiva: y === 70 && passo !== 1 }]} x1="16" x2="304" y1={y} y2={y} />
	{/each}

	<g class={{ entra: anima.passo === 0 }}>
		<path
			class="testa"
			d={TESTA.d}
			transform="translate({90 - (TESTA.larghezza * S) / 2} 70) scale({S})"
		/>
		<text x="90" y="138">{m.pentagramma_disegno_sulla_linea()}</text>
	</g>
	{#if passo >= 1}
		<g class={{ entra: anima.passo === 1 }}>
			<path
				class="testa"
				d={TESTA.d}
				transform="translate({235 - (TESTA.larghezza * S) / 2} 85) scale({S})"
			/>
			<text x="235" y="138">{m.pentagramma_disegno_nello_spazio()}</text>
		</g>
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
	}
	.attiva {
		stroke: var(--colore-accento);
		stroke-width: 5;
	}
	.spazio {
		fill: var(--colore-accento-tenue);
	}
	.testa {
		fill: var(--colore-testo);
	}
	text {
		fill: var(--colore-testo);
		font-size: 16px;
		font-weight: var(--peso-medio);
		text-anchor: middle;
	}
	.entra {
		animation: scendi 600ms var(--easing-uscita) both;
	}
	rect.entra {
		animation-name: compari;
	}
	.fermo .entra {
		animation-play-state: paused;
	}
	@keyframes scendi {
		from {
			opacity: 0;
			transform: translateY(-18px);
		}
	}
	@keyframes compari {
		from {
			opacity: 0;
		}
	}
</style>
