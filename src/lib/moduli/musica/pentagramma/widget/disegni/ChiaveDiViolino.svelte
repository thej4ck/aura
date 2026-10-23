<script lang="ts">
	// La chiave di violino si disegna attorno alla seconda linea, la linea del Sol.
	// Passi: 0 le cinque linee, 1 la seconda linea si illumina, 2 la chiave si disegna, 3 il ricciolo
	// avvolge la seconda linea, 4 sulla seconda linea c'è il Sol. Dal ricciolo in poi si sente il Sol4, e
	// la sua linea si ingrossa mentre suona.
	import { GLIFI } from '#lib/core/musica/glifi.ts';
	import { nomeNota } from '#lib/core/musica/note.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import { suonoDisegno } from '#lib/core/widget/suono.svelte.ts';
	import { ingresso } from './ingresso.svelte.ts';

	let stato: Partial<StatoDisegno> = $props();

	const S = 16; // uno spazio
	const Y0 = 100; // prima linea
	const y = (p: number) => Y0 - (p * S) / 2;
	const X_CHIAVE = 20;
	// centro del ricciolo: sulla linea del Sol, a circa metà della chiave (Bravura, gClef)
	const RICCIOLO = { x: X_CHIAVE + 1.4 * S, y: y(2) };
	const X_NOTA = 170;
	const TESTA = GLIFI.testaPiena;

	const passo = $derived(stato.passo ?? 4);
	const anima = ingresso(() => stato);
	const sol = $derived(nomeNota('G4', progressi.doc?.preferenze.nomiNote ?? 'solfeggio'));
	const suono = suonoDisegno(
		() => ({ passo, inRiproduzione: stato.inRiproduzione }),
		(p) => (p >= 3 ? ['G4'] : []),
		1.2
	);
</script>

<svg class={['disegno', { fermo: !stato.inRiproduzione }]} viewBox="0 0 320 140" aria-hidden="true">
	{#each [0, 2, 4, 6, 8] as p (p)}
		<line
			class={['linea', { sol: p === 2 && passo >= 1, entra: anima.passo === 0 }]}
			data-suona={p === 2 ? suono.midi : undefined}
			x1="8"
			x2="292"
			y1={y(p)}
			y2={y(p)}
		/>
	{/each}
	{#if passo >= 1}
		<text class={['numero', { entra: anima.passo === 1 }]} x="306" y={y(2) + 6}>2</text>
	{/if}

	{#if passo >= 2}
		<path
			class={['chiave', { entra: anima.passo === 2 }]}
			d={GLIFI.chiaveViolino.d}
			transform="translate({X_CHIAVE} {y(2)}) scale({S})"
			pathLength="1"
		/>
	{/if}
	{#if passo >= 3}
		<ellipse
			class={['ricciolo', { entra: anima.passo === 3 }]}
			cx={RICCIOLO.x}
			cy={RICCIOLO.y}
			rx={1.05 * S}
			ry={0.85 * S}
		/>
	{/if}

	{#if passo >= 4}
		<g class={{ entra: anima.passo === 4 }}>
			<path
				class="testa"
				d={TESTA.d}
				transform="translate({X_NOTA - (TESTA.larghezza * S) / 2} {y(2)}) scale({S})"
			/>
			<text class="nome" x={X_NOTA} y={Y0 + 30}>{sol}</text>
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
		stroke-width: 2;
	}
	.linea.sol {
		stroke: var(--colore-accento);
		stroke-width: 4;
	}
	/* il Sol che suona: la sua linea si ingrossa (non solo il colore) */
	.linea[data-suona] {
		stroke-width: 7;
	}
	.numero {
		fill: var(--colore-accento-forte);
		font-size: 16px;
		font-weight: var(--peso-forte);
		text-anchor: middle;
	}
	.chiave {
		fill: var(--colore-testo);
		stroke: var(--colore-testo);
		stroke-width: 0.06;
		stroke-dasharray: 1;
	}
	.ricciolo {
		fill: none;
		stroke: var(--colore-accento);
		stroke-width: 3;
	}
	.testa {
		fill: var(--nota-sol);
	}
	.nome {
		fill: var(--colore-testo);
		font-size: 18px;
		font-weight: var(--peso-forte);
		text-anchor: middle;
	}
	.entra {
		animation: compari 600ms var(--easing-uscita) both;
	}
	/* la chiave: prima il contorno si traccia, poi si riempie */
	.chiave.entra {
		animation:
			traccia 1800ms ease-in-out both,
			riempi 600ms ease-out 1500ms both;
	}
	.ricciolo.entra {
		transform-box: fill-box;
		transform-origin: center;
		animation: pulsa 1200ms var(--easing-uscita) both;
	}
	.fermo .entra {
		animation-play-state: paused;
	}
	@keyframes compari {
		from {
			opacity: 0;
		}
	}
	@keyframes traccia {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes riempi {
		from {
			fill-opacity: 0;
		}
		to {
			fill-opacity: 1;
		}
	}
	@keyframes pulsa {
		0% {
			opacity: 0;
			transform: scale(1.8);
		}
		60% {
			opacity: 1;
			transform: scale(0.9);
		}
	}
</style>
