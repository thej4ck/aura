<script lang="ts" module>
	import * as v from 'valibot';
	import { TENUTA_MS } from '../audio/costanti.ts';
	import { schemaAltezza, schemaAspetto } from './musica.ts';

	/** Props di `canta-nota`. La tolleranza viene dalle preferenze del profilo. */
	export const schemaProps = v.object({
		nota: schemaAltezza,
		/** quanto tenere la nota in zona, in ms */
		tenutaMs: v.optional(
			v.pipe(v.number(), v.integer(), v.minValue(500), v.maxValue(10_000)),
			TENUTA_MS
		),
		/** la stessa nota in un'altra ottava va bene (un bambino canta un'ottava sopra l'adulto) */
		equivalenzaOttava: v.optional(v.boolean(), true),
		/**
		 * false: la nota è solo scritta e il bambino la legge: il sito non la suona prima e il misuratore
		 * non ne dice il nome; «Ascolta» resta come aiuto, ma prima dell'esito lo rende non giusto
		 */
		suonaPrima: v.optional(v.boolean(), true),
		...schemaAspetto
	});
</script>

<script lang="ts">
	// Il sito suona la nota, poi il bambino la canta e la tiene. Esito giusto quando la tiene abbastanza;
	// l'item è l'altezza.
	import type { WidgetProps } from '../motore/widget.ts';
	import Canto from './Canto.svelte';

	let { props, contesto, onesito, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
</script>

<Canto
	rigo={{ chiave: 'violino', note: [{ altezza: p.nota }] }}
	tenutaMs={p.tenutaMs}
	equivalenzaOttava={p.equivalenzaOttava}
	daSuonare={p.suonaPrima ? 'tutte' : 'nessuna'}
	bastaCosi
	durataS={1.5}
	etichette={p.etichette}
	colori={p.colori}
	{contesto}
	item={p.nota}
	{onesito}
	{onfine}
/>
