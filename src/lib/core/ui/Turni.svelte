<script lang="ts">
	// A chi tocca, nei turni col sito (ascolta, poi canta o batti): le tappe in fila, quella attuale piena e
	// in grassetto (non solo il colore) e detta ai lettori di schermo come passo attuale.
	import { m } from '#lib/paraglide/messages.js';
	import Icona, { type NomeIcona } from './Icona.svelte';

	type Props = {
		tappe: readonly { icona: NomeIcona; testo: string }[];
		/** indice della tappa attuale */
		attuale: number;
	};

	let { tappe, attuale }: Props = $props();
</script>

<ol class="turni" aria-label={m.canta_turni()}>
	{#each tappe as tappa, i (i)}
		<li aria-current={i === attuale ? 'step' : undefined}>
			<Icona nome={tappa.icona} />
			{tappa.testo}
		</li>
	{/each}
</ol>

<style>
	.turni {
		display: flex;
		gap: var(--spazio-5);
		align-items: center;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.turni li {
		position: relative;
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
		min-height: var(--target);
		padding-inline: var(--spazio-4);
		border: 2px dashed var(--colore-bordo-forte);
		border-radius: var(--raggio-pieno);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
		transition:
			background-color var(--durata-breve) var(--easing),
			color var(--durata-breve) var(--easing);
	}
	/* il filo tra le due tappe */
	.turni li + li::before {
		content: '';
		position: absolute;
		inset-inline-end: calc(100% + 2px);
		top: 50%;
		width: var(--spazio-5);
		border-top: 2px solid var(--colore-bordo-forte);
	}
	.turni li[aria-current='step'] {
		border-style: solid;
		border-color: var(--colore-accento);
		background: var(--colore-accento);
		color: var(--colore-su-accento);
		font-weight: var(--peso-forte);
	}
</style>
