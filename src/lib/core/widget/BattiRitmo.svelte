<script lang="ts" module>
	import * as v from 'valibot';
	import { schemaBpm, schemaRitmo } from './musica.ts';

	/** Props di `batti-ritmo`. La tolleranza viene dalle preferenze del profilo (TOLLERANZE_RITMO_MS). */
	export const schemaProps = v.object({
		/** il ritmo da battere: un Rigo con le durate, di solito rigoRitmico('ta ti-ti ta-a sst', '4/4') */
		rigo: schemaRitmo,
		/** 'eco': prima suona il sito, poi batte il bambino; 'lettura': lo legge e lo batte */
		modo: v.optional(v.picklist(['eco', 'lettura']), 'eco'),
		bpm: schemaBpm,
		/** le sillabe sotto le note; di default sì a eco, no in lettura (si legge il ritmo) */
		sillabe: v.optional(v.boolean()),
		/** item allenato, passato nell'esito; di default le sillabe del ritmo ("ta ti ti ta-a") */
		item: v.optional(v.pipe(v.string(), v.trim(), v.nonEmpty()))
	});
</script>

<script lang="ts">
	// Batti il ritmo: a eco (prima ascolti, poi batti) o in lettura, col tocco o con le mani al
	// microfono. Esito alla fine del primo tentativo: giusto se ogni nota è battuta a tempo e nessun battito
	// è in più. Tutto il turno è in TurnoRitmo.svelte, che usano anche i giochi del Ritmo.
	import type { WidgetProps } from '../motore/widget.ts';
	import { sillaba } from '../musica/ritmo.ts';
	import TurnoRitmo from './TurnoRitmo.svelte';

	let { props, contesto, onesito, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
</script>

<TurnoRitmo
	rigo={p.rigo}
	modo={p.modo}
	bpm={p.bpm}
	sillabe={p.sillabe ?? p.modo === 'eco'}
	bastaCosi
	{contesto}
	item={p.item ?? p.rigo.note.map(sillaba).join(' ')}
	{onesito}
	{onfine}
/>
