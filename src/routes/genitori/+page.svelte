<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Genitori from '#lib/core/pagine/Genitori.svelte';
</script>

<svelte:head>
	<title>{m.layout_genitori()} – {m.app_nome()}</title>
</svelte:head>

<Genitori />
