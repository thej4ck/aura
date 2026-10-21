<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLElement> & {
		/** elemento HTML da usare (section, article, aside… per la semantica) */
		as?: 'div' | 'section' | 'article' | 'aside' | 'li';
		/** 'normale' = superficie con bordo, 'tenue' = fondo tenue senza bordo, 'evidenza' = tinta dell'accento */
		tono?: 'normale' | 'tenue' | 'evidenza';
		children?: Snippet;
	};

	let { as = 'div', tono = 'normale', children, class: classe, ...resto }: Props = $props();
</script>

<svelte:element this={as} class={['card', tono, classe]} {...resto}>
	{@render children?.()}
</svelte:element>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		padding: var(--spazio-5);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
		color: var(--colore-testo);
	}

	.normale {
		border: 1px solid var(--colore-bordo);
	}

	.tenue {
		background: var(--colore-superficie-tenue);
	}

	.evidenza {
		background: var(--colore-accento-tenue);
	}
</style>
