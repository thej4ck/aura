<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	/* ponytail: solo il sottoinsieme latin (basta per l'italiano); latin-ext si aggiunge con un secondo @font-face se servirà */
	@font-face {
		font-family: 'Atkinson Hyperlegible Next';
		font-style: normal;
		font-display: swap;
		font-weight: 200 800;
		src: url('@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2')
			format('woff2-variations');
	}

	:global(html) {
		font-family: 'Atkinson Hyperlegible Next', system-ui, sans-serif;
	}

	:global(.app) {
		display: contents;
	}
</style>
