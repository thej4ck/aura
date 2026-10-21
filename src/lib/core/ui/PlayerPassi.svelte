<script lang="ts" module>
	/** Un passo della spiegazione: il testo è anche l'alternativa testuale del disegno. */
	export type Passo = { testo: string; durataMs?: number };
	/** Quello che riceve il disegno (snippet o componente SVG del modulo). */
	export type StatoDisegno = {
		/** passo da mostrare (0-based): il disegno mostra lo stato "dopo" questo passo */
		passo: number;
		/** true: anima l'ingresso del passo; false: metti in pausa l'animazione in corso */
		inRiproduzione: boolean;
		/** true: nessuna animazione, solo il fotogramma finale del passo */
		riduciMovimento: boolean;
	};
	/** durata di un passo senza `durataMs` */
	export const DURATA_PASSO_MS = 4000;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { m } from '#lib/paraglide/messages.js';
	import { progressi } from '../store/progressi.svelte';
	import Button from './Button.svelte';
	import LeggiAltaVoce from './LeggiAltaVoce.svelte';

	type Props = {
		passi: readonly Passo[];
		/** disegna l'SVG per lo stato corrente */
		disegno: Snippet<[StatoDisegno]>;
		/** nome accessibile della figura */
		etichetta: string;
		/** mostra 🔊 sul testo del passo (se c'è una voce locale) */
		leggi?: boolean;
		/** di default: preferenza del profilo o del sistema */
		riduciMovimento?: boolean;
		/** fine dell'ultimo passo in riproduzione */
		onfine?: () => void;
	};

	let { passi, disegno, etichetta, leggi = false, riduciMovimento, onfine }: Props = $props();

	const id = $props.id();
	let passo = $state(0);
	let inRiproduzione = $state(false);

	const ridotto = $derived(
		riduciMovimento ??
			(prefersReducedMotion.current || !!progressi.doc?.preferenze.accessibilita.riduciMovimento)
	);
	const ultimo = $derived(passi.length - 1);
	const corrente = $derived(passi[Math.min(passo, ultimo)]);

	// avanza da solo solo in riproduzione.
	// ponytail: dopo una pausa il passo riparte con la durata intera; tenere il tempo residuo se mai servirà
	$effect(() => {
		if (!inRiproduzione) return;
		const t = setTimeout(() => {
			if (passo < ultimo) passo++;
			else {
				inRiproduzione = false;
				onfine?.();
			}
		}, corrente.durataMs ?? DURATA_PASSO_MS);
		return () => clearTimeout(t);
	});

	function riproduci() {
		if (!inRiproduzione && passo === ultimo) passo = 0;
		inRiproduzione = !inRiproduzione;
	}
	const vai = (p: number) => (passo = Math.min(Math.max(0, p), ultimo));
</script>

<div class="player">
	<figure class="tela" aria-labelledby="{id}-testo">
		<div class="disegno" role="img" aria-label={etichetta}>
			{@render disegno({ passo, inRiproduzione, riduciMovimento: ridotto })}
		</div>
		<figcaption class="didascalia">
			<p id="{id}-testo" aria-live="polite">{corrente.testo}</p>
			{#if leggi}<LeggiAltaVoce testo={corrente.testo} attivo={leggi} />{/if}
		</figcaption>
	</figure>

	<div class="controlli">
		<Button
			variante="quieta"
			icona="ricomincia"
			aria-label={m.player_ricomincia()}
			onclick={() => vai(0)}
		/>
		<Button
			variante="secondaria"
			icona="passo-indietro"
			aria-label={m.player_precedente()}
			aria-disabled={passo === 0}
			onclick={() => vai(passo - 1)}
		/>
		<Button
			dimensione="l"
			icona={inRiproduzione ? 'pausa' : 'play'}
			aria-label={inRiproduzione ? m.player_pausa() : m.player_riproduci()}
			onclick={riproduci}
		/>
		<Button
			variante="secondaria"
			icona="passo-avanti"
			aria-label={m.player_successivo()}
			aria-disabled={passo === ultimo}
			onclick={() => vai(passo + 1)}
		/>
		<p class="contatore">{m.player_passo({ numero: passo + 1, totale: passi.length })}</p>
	</div>
	<div class="puntini" aria-hidden="true">
		{#each passi, i (i)}
			<span class={['puntino', { fatto: i < passo, corrente: i === passo }]}></span>
		{/each}
	</div>
</div>

<style>
	.player {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	.tela {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
		overflow: hidden;
	}
	.disegno {
		display: grid;
		place-items: center;
		padding: var(--spazio-5);
		min-height: 10rem;
		color: var(--colore-testo);
	}
	.didascalia {
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
		justify-content: space-between;
		padding: var(--spazio-4) var(--spazio-5);
		border-top: 1px solid var(--colore-bordo);
		background: var(--colore-superficie-tenue);
		min-height: calc(var(--target) + 2 * var(--spazio-4));
	}
	.didascalia p {
		font-size: var(--testo-l);
	}
	.controlli {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2);
		align-items: center;
	}
	.contatore {
		margin-inline-start: auto;
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.puntini {
		display: flex;
		gap: var(--spazio-1);
	}
	.puntino {
		flex: 1;
		height: 0.375rem;
		border-radius: var(--raggio-pieno);
		background: var(--colore-bordo);
		transition: background-color var(--durata-media) var(--easing);
	}
	.fatto {
		background: var(--colore-accento);
	}
	.corrente {
		background: var(--colore-accento);
		box-shadow:
			0 0 0 2px var(--colore-superficie),
			0 0 0 4px var(--colore-accento);
	}
</style>
