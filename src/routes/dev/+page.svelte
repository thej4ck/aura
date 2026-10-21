<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.dev_titolo()} – {m.app_nome()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<data.Vetrina />
