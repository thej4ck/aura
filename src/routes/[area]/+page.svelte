<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Area from '#lib/core/pagine/Area.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.area.titolo} – {m.app_nome()}</title>
</svelte:head>

<Area area={data.area.id} />
