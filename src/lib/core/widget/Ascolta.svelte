<script lang="ts" module>
	import * as v from 'valibot';
	import { schemaAspetto, schemaNote } from './musica.ts';

	/** Props di `ascolta`. */
	export const schemaProps = v.object({
		/** altezze ('G4') in chiave di violino, oppure un Rigo */
		note: schemaNote,
		/** secondi per nota */
		durata: v.optional(v.pipe(v.number(), v.minValue(0.2), v.maxValue(4)), 0.8),
		...schemaAspetto
	});
</script>

<script lang="ts">
	// Suona una nota o una sequenza e la mostra sempre sullo Staff, evidenziando la nota che suona.
	// Nessun esito: "Avanti" compare dopo il primo ascolto.
	import { m } from '#lib/paraglide/messages.js';
	import type { Riproduzione } from '../audio/synth.ts';
	import type { WidgetProps } from '../motore/widget.ts';
	import Button from '../ui/Button.svelte';
	import Staff from '../ui/Staff.svelte';
	import { suonaSeguendo } from './musica.ts';

	let { props, contesto, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	let riproduzione = $state.raw<Riproduzione>();
	let suona = $state<number | null>(null);
	let ascoltata = $state(false);

	function ascolta() {
		if (riproduzione) return riproduzione.ferma();
		const r = suonaSeguendo(
			p.note.note.map((n) => n.altezza),
			p.durata,
			(i) => (suona = i)
		);
		riproduzione = r;
		void r.fine.then(() => {
			if (riproduzione === r) riproduzione = undefined;
			ascoltata = true;
		});
	}

	// uscendo dalla scheda il suono si ferma
	$effect(() => () => riproduzione?.ferma());
</script>

<Staff
	rigo={p.note}
	etichetta={m.ascolta_rigo({ count: p.note.note.length })}
	evidenzia={suona === null ? [] : [suona]}
	etichette={p.etichette}
	colori={p.colori}
	nomiNote={contesto.preferenze.nomiNote}
/>

<div class="azioni">
	<Button
		dimensione="l"
		variante={ascoltata ? 'secondaria' : 'primaria'}
		icona={riproduzione ? 'pausa' : 'volume'}
		onclick={ascolta}
	>
		{riproduzione ? m.widget_ferma() : ascoltata ? m.widget_ascolta_di_nuovo() : m.widget_ascolta()}
	</Button>
	{#if ascoltata}
		<Button dimensione="l" onclick={onfine}>{m.pulsante_avanti()}</Button>
	{/if}
</div>

<style>
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
</style>
