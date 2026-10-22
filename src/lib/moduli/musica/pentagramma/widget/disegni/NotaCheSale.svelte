<script lang="ts">
	// Una nota sale sul rigo a gradini, e a ogni gradino il suono sale con lei; alla fine si confrontano
	// la più bassa e la più alta.
	import { m } from '#lib/paraglide/messages.js';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import RigoAPassi, { type Fotogramma } from './RigoAPassi.svelte';

	let stato: Partial<StatoDisegno> = $props();

	const FOTOGRAMMI: Fotogramma[] = [
		{ note: ['C4'], evidenzia: [0] },
		{ note: ['C4', 'E4'], evidenzia: [1] },
		{ note: ['C4', 'E4', 'G4'], evidenzia: [2] },
		{ note: ['C4', 'E4', 'G4', 'C5'], evidenzia: [3] },
		{ note: ['C4', 'E4', 'G4', 'C5'], evidenzia: [0, 3], suona: [0, 3] }
	];
</script>

<RigoAPassi {...stato} fotogrammi={FOTOGRAMMI} etichetta={m.pentagramma_disegno_nota_sale()} />
