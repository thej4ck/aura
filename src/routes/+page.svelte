<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Home from '#lib/core/pagine/Home.svelte';
</script>

<svelte:head>
	<title>{m.app_nome()}</title>
</svelte:head>

<Home />
