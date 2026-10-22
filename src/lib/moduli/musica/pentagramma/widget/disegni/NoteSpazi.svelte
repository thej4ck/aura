<script lang="ts">
	// Le note negli spazi compaiono dal basso, una per passo, con il nome e il suono.
	import { m } from '#lib/paraglide/messages.js';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import RigoAPassi, { type Fotogramma } from './RigoAPassi.svelte';

	let stato: Partial<StatoDisegno> = $props();

	const FOTOGRAMMI: Fotogramma[] = [
		{ note: ['F4'], evidenzia: [0] },
		{ note: ['F4', 'A4'], evidenzia: [1] },
		{ note: ['F4', 'A4', 'C5'], evidenzia: [2] },
		{ note: ['F4', 'A4', 'C5', 'E5'], evidenzia: [3], suona: [0, 1, 2, 3] }
	];
</script>

<RigoAPassi
	{...stato}
	fotogrammi={FOTOGRAMMI}
	etichetta={m.pentagramma_disegno_note_spazi()}
	etichette
	colori
/>
