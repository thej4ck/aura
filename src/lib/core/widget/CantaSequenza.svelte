<script lang="ts" module>
	import * as v from 'valibot';
	import { TENUTA_SEQUENZA_MS } from '../audio/costanti.ts';
	import { schemaAspetto, schemaNote } from './musica.ts';

	/** Props di `canta-sequenza`. La tolleranza viene dalle preferenze del profilo. */
	export const schemaProps = v.object({
		/** altezze ('G4') in chiave di violino, oppure un Rigo: si cantano in quest'ordine */
		note: schemaNote,
		/** tenuta minima di ogni nota, in ms */
		tenutaMs: v.optional(
			v.pipe(v.number(), v.integer(), v.minValue(200), v.maxValue(5000)),
			TENUTA_SEQUENZA_MS
		),
		equivalenzaOttava: v.optional(v.boolean(), true),
		/** item allenato, passato nell'esito (es. "do-re-mi") */
		item: v.optional(v.pipe(v.string(), v.trim(), v.nonEmpty())),
		...schemaAspetto
	});
</script>

<script lang="ts">
	// Il sito suona la sequenza, poi il bambino la canta in ordine, una nota alla volta: lo Staff
	// evidenzia quella da cantare. Esito alla fine: giusto se le ha cantate tutte.
	import type { WidgetProps } from '../motore/widget.ts';
	import Canto from './Canto.svelte';

	let { props, contesto, onesito, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
</script>

<Canto
	rigo={p.note}
	tenutaMs={p.tenutaMs}
	equivalenzaOttava={p.equivalenzaOttava}
	durataS={0.7}
	etichette={p.etichette}
	colori={p.colori}
	{contesto}
	item={p.item}
	{onesito}
	{onfine}
/>
