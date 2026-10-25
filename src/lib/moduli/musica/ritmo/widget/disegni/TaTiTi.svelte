<script lang="ts">
	// «TA e TI-TI»: un suono su ogni battito, poi due suoni veloci in un battito, poi insieme.
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import RitmoAPassi, { type Fotogramma } from './RitmoAPassi.svelte';

	let stato: Partial<StatoDisegno> = $props();
	const PASSI: Fotogramma[] = [
		{ sillabe: 'ta ta ta ta' },
		{ sillabe: 'ti-ti ti-ti ti-ti ti-ti' },
		{ sillabe: 'ta ti-ti ta ti-ti' }
	];
</script>

<RitmoAPassi {...stato} passi={PASSI} />
