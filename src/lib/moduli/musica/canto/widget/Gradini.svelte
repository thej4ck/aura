<script lang="ts">
	// "La scala di Do": gli otto gradini, poi la voce che sale e che scende (lezione una-alla-volta).
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import Scala from './Scala.svelte';

	let stato: Partial<StatoDisegno> = $props();
	const su = [0, 1, 2, 3, 4, 5, 6, 7];
</script>

<Scala
	{...stato}
	gradini={8}
	passi={[{ percorso: [0] }, { percorso: su }, { percorso: su.toReversed() }]}
/>
