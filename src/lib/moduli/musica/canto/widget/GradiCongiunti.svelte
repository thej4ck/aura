<script lang="ts">
	// "Do-Re-Mi su e giù": tre gradini vicini; la voce sale, scende, poi su e giù (lezione su-e-giu).
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import Scala from './Scala.svelte';

	let stato: Partial<StatoDisegno> = $props();
</script>

<Scala
	{...stato}
	gradini={3}
	passi={[{ percorso: [0, 1, 2] }, { percorso: [2, 1, 0] }, { percorso: [0, 1, 2, 1, 0] }]}
/>
