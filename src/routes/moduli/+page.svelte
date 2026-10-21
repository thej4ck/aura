<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Moduli from '#lib/core/pagine/Moduli.svelte';
</script>

<svelte:head>
	<title>{m.layout_moduli()} – {m.app_nome()}</title>
</svelte:head>

<Moduli />
