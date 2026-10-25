<script lang="ts">
	// «La pausa»: SST tace, ma il suo battito passa lo stesso. Nessun ritmo finisce con la pausa: il suono
	// finirebbe prima e il suo battito non si accenderebbe.
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import RitmoAPassi, { type Fotogramma } from './RitmoAPassi.svelte';

	let stato: Partial<StatoDisegno> = $props();
	const PASSI: Fotogramma[] = [
		{ sillabe: 'ta ta sst ta' },
		{ sillabe: 'ti-ti ta sst ta' },
		{ sillabe: 'ta sst ta ta' }
	];
</script>

<RitmoAPassi {...stato} passi={PASSI} />
