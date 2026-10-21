<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.app_nome()}</title>
</svelte:head>

<main>
	<h1>{m.app_nome()}</h1>
	<p>{m.home_benvenuto()}</p>
</main>
