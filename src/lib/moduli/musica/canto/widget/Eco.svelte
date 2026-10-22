<script lang="ts" module>
	import * as v from 'valibot';

	/** Props di `eco`: nessuna. Le melodie le sceglie il seed, nel registro comodo del bambino. */
	export const schemaProps = v.object({});
</script>

<script lang="ts">
	// Gioco G2 "Eco": il sito suona da 3 a 5 note, il bambino le ripete (TENUTA_SEQUENZA_MS per nota).
	// Quattro giri: i primi per gradi congiunti, gli altri con qualche piccolo salto (GIRI_ECO), nel
	// registro comodo come "Tieni la nota". Un esito per giro (item = le note, "C4-D4-E4").
	import { TENUTA_SEQUENZA_MS } from '#lib/core/audio/costanti.ts';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { ID_DATI, leggiEstensioni, registroComodo, rigoDi, serieEco } from '../sequenza.ts';
	import Serie from './Serie.svelte';

	let { contesto, onesito, onfine }: WidgetProps = $props();

	const registro = $derived(registroComodo(leggiEstensioni(progressi.doc?.dati[ID_DATI])));
	const giri = $derived(
		serieEco(contesto.seed, registro).map((note) => ({ rigo: rigoDi(note), item: note.join('-') }))
	);
</script>

<Serie
	{giri}
	contatore={(numero, totale) => m.canto_giro_di({ numero, totale })}
	tenutaMs={TENUTA_SEQUENZA_MS}
	durataS={0.7}
	{contesto}
	{onesito}
	{onfine}
/>
