<script lang="ts" module>
	import * as v from 'valibot';

	/** Props di `eco-ritmica`: nessuna. I ritmi li sceglie il seed (serieEco in ritmi.ts). */
	export const schemaProps = v.object({});
</script>

<script lang="ts">
	// «Eco ritmica»: il sito suona un ritmo col legnetto, il bambino lo ripete battendo, a tempo. Cinque
	// giri che crescono piano (GIRI_ECO): TA e TI-TI, poi TA-A, la pausa e due battute. Le sillabe sono
	// sotto le note, come in `batti-ritmo` a eco. Un esito per giro (item = le sillabe, "ta ti ti ta").
	import { untrack } from 'svelte';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import { itemDi, rigoDi, serieEco } from '../ritmi.ts';
	import GiriRitmo from './GiriRitmo.svelte';

	let { contesto, onesito, onfine }: WidgetProps = $props();

	const giri = serieEco(untrack(() => contesto.seed)).map((x) => {
		const rigo = rigoDi(x);
		return { rigo, item: itemDi(rigo), sillabe: true };
	});
	let i = $state(0);
</script>

<GiriRitmo
	giro={giri[i]}
	numero={i + 1}
	totale={giri.length}
	modo="eco"
	{contesto}
	{onesito}
	avanti={() => (i < giri.length - 1 ? i++ : onfine())}
	{onfine}
/>
