<script lang="ts">
	// Diesis, bemolle e bequadro: la nota sul rigo e il suo tasto sul pianoforte. Il semitono è il tasto
	// subito accanto; si sentono le due note una dopo l'altra.
	import { m } from '#lib/paraglide/messages.js';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import RigoAPassi, { type Fotogramma } from './RigoAPassi.svelte';

	let stato: Partial<StatoDisegno> = $props();

	const FOTOGRAMMI: Fotogramma[] = [
		{ note: ['F4'], evidenzia: [0], tasti: [65] },
		{ note: ['F4', 'F#4'], evidenzia: [1], suona: [0, 1], tasti: [66] },
		{ note: ['B4'], evidenzia: [0], tasti: [71] },
		{ note: ['B4', 'Bb4'], evidenzia: [1], suona: [0, 1], tasti: [70] },
		{ note: ['B4', 'Bb4', 'B4'], evidenzia: [2], suona: [1, 2], tasti: [71] }
	];
</script>

<RigoAPassi
	{...stato}
	fotogrammi={FOTOGRAMMI}
	etichetta={m.pentagramma_disegno_semitono()}
	etichette
	tastiera={[60, 72]}
/>
