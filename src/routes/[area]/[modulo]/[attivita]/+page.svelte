<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Attivita from '#lib/core/motore/Attivita.svelte';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.attivita.titolo} – {m.app_nome()}</title>
</svelte:head>

<!-- key: un'altra attività sulla stessa route, o un cambio di profilo a metà, fanno ripartire il motore da zero
	(gli esiti in memoria appartengono a chi li ha dati) -->
{#key `${data.attivita.id}:${progressi.doc?.profilo.id}`}
	<Attivita attivita={data.attivita} />
{/key}
