<script lang="ts">
	// "Prima, seconda, terza": la voce resta sul Do, va al Re vicino, poi salta al Mi scavalcando il Re
	// (lezione i-salti). L'ultimo passo conta le note della terza: Do, Re, Mi.
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import Scala from './Scala.svelte';

	let stato: Partial<StatoDisegno> = $props();
</script>

<Scala
	{...stato}
	gradini={5}
	passi={[
		{ percorso: [0, 0] },
		{ percorso: [0, 1] },
		{ percorso: [0, 2], scavalca: [1] },
		{ percorso: [0, 1, 2] }
	]}
/>
