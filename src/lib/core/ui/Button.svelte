<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import Icona, { type NomeIcona } from './Icona.svelte';

	type Comuni = {
		variante?: 'primaria' | 'secondaria' | 'quieta';
		/** 'm' = target minimo (48 px, 56 px nella fascia 6-10), 'l' = azione principale della schermata */
		dimensione?: 'm' | 'l';
		icona?: NomeIcona;
		children?: Snippet;
	};
	/** Con `href` diventa un link (già risolto con `resolve()`), altrimenti un `<button type="button">`. */
	type Props = Comuni &
		(
			| (Omit<HTMLButtonAttributes, 'children'> & { href?: undefined })
			| (Omit<HTMLAnchorAttributes, 'children'> & { href: string })
		);

	let {
		variante = 'primaria',
		dimensione = 'm',
		icona,
		children,
		class: classe,
		...resto
	}: Props = $props();

	const classi = $derived(['pulsante', variante, dimensione, { 'solo-icona': !children }, classe]);
</script>

{#if resto.href !== undefined}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- chi usa Button passa un href già risolto -->
	<a class={classi} {...resto as HTMLAnchorAttributes}>
		{#if icona}<Icona nome={icona} />{/if}
		{@render children?.()}
	</a>
{:else}
	<button type="button" class={classi} {...resto as HTMLButtonAttributes}>
		{#if icona}<Icona nome={icona} />{/if}
		{@render children?.()}
	</button>
{/if}

<style>
	.pulsante {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--spazio-2);
		min-height: var(--target);
		min-width: var(--target);
		padding: var(--spazio-2) var(--spazio-5);
		border: 2px solid transparent;
		border-radius: var(--raggio-m);
		font-size: var(--testo-m);
		font-weight: var(--peso-medio);
		line-height: 1.2;
		text-align: center;
		text-decoration: none;
		cursor: pointer;
		transition:
			background-color var(--durata-breve) var(--easing),
			border-color var(--durata-breve) var(--easing),
			transform var(--durata-breve) var(--easing);
		-webkit-tap-highlight-color: transparent;
	}

	.pulsante:active:not(:disabled, [aria-disabled='true']) {
		transform: translateY(1px);
	}

	.l {
		min-height: calc(var(--target) + var(--spazio-2));
		padding-inline: var(--spazio-6);
		font-size: var(--testo-l);
	}

	.solo-icona {
		padding: 0;
	}

	.primaria {
		background: var(--colore-accento);
		color: var(--colore-su-accento);
	}
	.primaria:hover {
		background: var(--colore-accento-forte);
		color: var(--colore-su-accento);
	}

	.secondaria {
		background: var(--colore-superficie);
		border-color: var(--colore-bordo-forte);
		color: var(--colore-testo);
	}
	.secondaria:hover {
		border-color: var(--colore-accento);
		color: var(--colore-testo);
	}

	.quieta {
		background: transparent;
		color: var(--colore-accento);
	}
	.quieta:hover {
		background: var(--colore-accento-tenue);
		color: var(--colore-accento-forte);
	}

	.pulsante:disabled,
	.pulsante[aria-disabled='true'] {
		cursor: not-allowed;
		opacity: 0.55;
	}
</style>
