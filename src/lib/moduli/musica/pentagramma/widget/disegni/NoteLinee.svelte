<script lang="ts">
	// Le note sulle linee compaiono dal basso, una per passo, con il nome e il suono.
	import { m } from '#lib/paraglide/messages.js';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import RigoAPassi, { type Fotogramma } from './RigoAPassi.svelte';

	let stato: Partial<StatoDisegno> = $props();

	const FOTOGRAMMI: Fotogramma[] = [
		{ note: ['E4'], evidenzia: [0] },
		{ note: ['E4', 'G4'], evidenzia: [1] },
		{ note: ['E4', 'G4', 'B4'], evidenzia: [2] },
		{ note: ['E4', 'G4', 'B4', 'D5'], evidenzia: [3] },
		{ note: ['E4', 'G4', 'B4', 'D5', 'F5'], evidenzia: [4], suona: [0, 1, 2, 3, 4] }
	];
</script>

<RigoAPassi
	{...stato}
	fotogrammi={FOTOGRAMMI}
	etichetta={m.pentagramma_disegno_note_linee()}
	etichette
	colori
/>
