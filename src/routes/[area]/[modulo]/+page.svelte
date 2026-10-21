<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Modulo from '#lib/core/pagine/Modulo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.modulo.titolo} – {m.app_nome()}</title>
</svelte:head>

<Modulo modulo={data.modulo.id} />
