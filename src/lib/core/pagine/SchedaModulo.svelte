<script lang="ts">
	// Scheda di un modulo (selettore e pagina dell'area): tutta la scheda porta al modulo.
	import { m } from '#lib/paraglide/messages.js';
	import ProgressRing from '../ui/ProgressRing.svelte';
	import type { VoceModulo } from '../vista/pagine';
	import { indirizzoModulo } from './indirizzi';
	import { etichettaEta, NOMI_STATO } from './testi';

	type Props = {
		voce: VoceModulo;
		/** livello del titolo nella pagina */
		livello?: 2 | 3;
		/** il nome dell'area: utile nel selettore, superfluo nella pagina dell'area */
		mostraArea?: boolean;
	};

	let { voce, livello = 2, mostraArea = true }: Props = $props();
	const { modulo, area, avanzamento } = $derived(voce);
</script>

<article class="scheda" style:--tinta={area.colore}>
	<div class="testa">
		<span class="icona" aria-hidden="true">{modulo.icona}</span>
		<ProgressRing
			valore={avanzamento.percentuale}
			etichetta={m.vista_avanzamento(avanzamento)}
			dimensione="2.75rem"
		/>
	</div>
	<svelte:element this={`h${livello}`} class="titolo">
		<a href={indirizzoModulo(modulo)}>{modulo.titolo}</a>
	</svelte:element>
	<p class="descrizione">{modulo.descrizione}</p>
	<p class="meta">
		{#if mostraArea}<span>{area.icona} {area.titolo}</span>{/if}
		<span>{etichettaEta(modulo.eta)}</span>
	</p>
	<p class={['stato', avanzamento.stato]}>{NOMI_STATO[avanzamento.stato]()}</p>
</article>

<style>
	.scheda {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		height: 100%;
		padding: var(--spazio-5);
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
		transition: border-color var(--durata-breve) var(--easing);
	}
	.scheda:hover {
		border-color: var(--colore-bordo-forte);
	}
	/* il focus si vede su tutta la scheda, che è l'area cliccabile */
	.scheda:has(a:focus-visible) {
		outline: var(--bordo-focus) solid var(--colore-focus);
		outline-offset: 3px;
	}

	.testa {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-block-end: var(--spazio-2);
	}
	.icona {
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: var(--raggio-m);
		background: color-mix(in srgb, var(--tinta) 18%, var(--colore-superficie));
		font-size: 1.9rem;
		line-height: 1;
	}

	.titolo {
		font-size: var(--testo-xl);
	}
	.titolo a {
		color: var(--colore-testo);
		text-decoration: none;
	}
	.titolo a:focus-visible {
		outline: none;
	}
	/* tutta la scheda è il bersaglio del link */
	.titolo a::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: var(--raggio-l);
	}
	.scheda:hover .titolo a {
		text-decoration: underline;
		text-decoration-color: var(--colore-accento);
		text-decoration-thickness: 0.1em;
		text-underline-offset: 0.2em;
	}

	.descrizione {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-1) var(--spazio-4);
		margin-block-start: auto;
		padding-block-start: var(--spazio-2);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.stato {
		font-size: var(--testo-s);
		font-weight: var(--peso-medio);
	}
	.stato.in_corso {
		color: var(--colore-accento-forte);
	}
	.stato.completato {
		color: var(--colore-successo);
	}
</style>
