<script lang="ts">
	// Sotto e sopra il rigo: il Re e il Do con il taglio in basso, il Sol, il La e il Si con il taglio
	// in alto. Lo Staff disegna i tagli solo per le note che li chiedono.
	import { m } from '#lib/paraglide/messages.js';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import RigoAPassi, { type Fotogramma } from './RigoAPassi.svelte';

	let stato: Partial<StatoDisegno> = $props();

	const FOTOGRAMMI: Fotogramma[] = [
		{ note: ['E4', 'D4'], evidenzia: [1] },
		{ note: ['E4', 'D4', 'C4'], evidenzia: [2] },
		{ note: ['F5', 'G5'], evidenzia: [1] },
		{ note: ['F5', 'G5', 'A5'], evidenzia: [2] },
		{ note: ['F5', 'G5', 'A5', 'B5'], evidenzia: [3] },
		{ note: ['C4', 'A5', 'B5'], evidenzia: [0, 1, 2] }
	];
</script>

<RigoAPassi
	{...stato}
	fotogrammi={FOTOGRAMMI}
	etichetta={m.pentagramma_disegno_tagli()}
	etichette
/>
