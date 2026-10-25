<script lang="ts">
	// «Il battito»: prima solo i colpi regolari, poi gli stessi battiti scritti con le note
	// (le sillabe arrivano nella lezione dopo).
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import RitmoAPassi, { type Fotogramma } from './RitmoAPassi.svelte';

	let stato: Partial<StatoDisegno> = $props();
	const PASSI: Fotogramma[] = [
		{ sillabe: 'ta ta ta ta', rigo: false },
		{ sillabe: 'ta ta ta ta ta ta ta ta', rigo: false },
		{ sillabe: 'ta ta ta ta', senzaSillabe: true }
	];
</script>

<RitmoAPassi {...stato} passi={PASSI} />
