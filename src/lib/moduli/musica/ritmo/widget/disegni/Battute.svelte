<script lang="ts">
	// «Battute e tempo»: i battiti a gruppi di due, tre e quattro, con l'accento sul primo (il legnetto più
	// forte), poi un ritmo in due battute. Senza sillabe: qui si contano i battiti, e due battute di
	// 4/4 con le sillabe non starebbero su un telefono.
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import RitmoAPassi, { type Fotogramma } from './RitmoAPassi.svelte';

	let stato: Partial<StatoDisegno> = $props();
	const PASSI: Fotogramma[] = [
		{ sillabe: 'ta ta ta ta', tempo: '2/4', senzaSillabe: true },
		{ sillabe: 'ta ta ta ta ta ta', tempo: '3/4', senzaSillabe: true },
		{ sillabe: 'ta ta ta ta ta-a ta-a', tempo: '4/4', senzaSillabe: true },
		{ sillabe: 'ta-a ta ta-a ta', tempo: '3/4', senzaSillabe: true }
	];
</script>

<RitmoAPassi {...stato} passi={PASSI} />
