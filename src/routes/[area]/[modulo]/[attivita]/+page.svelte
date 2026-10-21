<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Attivita from '#lib/core/motore/Attivita.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.attivita.titolo} – {m.app_nome()}</title>
</svelte:head>

<!-- key: passando a un'altra attività (stessa route) il motore riparte da zero -->
{#key data.attivita.id}
	<Attivita attivita={data.attivita} />
{/key}
