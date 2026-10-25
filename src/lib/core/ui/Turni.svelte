<script lang="ts">
	// A chi tocca, nei turni col sito (ascolta, poi canta o batti): le tappe in fila, quella attuale piena e
	// in grassetto (non solo il colore) e detta ai lettori di schermo come passo attuale. Dove i nomi non
	// stanno in fila (col testo grande, su un telefono) restano le icone: i nomi li legge il lettore.
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
			<span class="nome">{tappa.testo}</span>
		</li>
	{/each}
</ol>

<style>
	.turni {
		container-type: inline-size;
		display: flex;
		gap: var(--spazio-4);
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
		width: var(--spazio-4);
		border-top: 2px solid var(--colore-bordo-forte);
	}
	.turni li[aria-current='step'] {
		border-style: solid;
		border-color: var(--colore-accento);
		background: var(--colore-accento);
		color: var(--colore-su-accento);
		font-weight: var(--peso-forte);
	}
	/* due tappe con il nome vogliono circa 17 rem, a ogni misura del testo */
	@container (max-width: 17rem) {
		.turni li {
			min-height: auto;
			padding: var(--spazio-1) var(--spazio-3);
		}
		.nome {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	}
</style>
