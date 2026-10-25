<script lang="ts">
	// «TA-A»: un suono lungo due battiti (il legnetto risuona piano finché dura), da solo e con le
	// altre figure.
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import RitmoAPassi, { type Fotogramma } from './RitmoAPassi.svelte';

	let stato: Partial<StatoDisegno> = $props();
	const PASSI: Fotogramma[] = [
		{ sillabe: 'ta-a ta-a' },
		{ sillabe: 'ta ta ta-a' },
		{ sillabe: 'ta-a ti-ti ta' }
	];
</script>

<RitmoAPassi {...stato} passi={PASSI} />
