<script lang="ts" module>
	import * as v from 'valibot';

	/** Props di `tieni-la-nota`: nessuna. Le note le sceglie il seed, nel registro comodo del bambino. */
	export const schemaProps = v.object({});
</script>

<script lang="ts">
	// Gioco G1 "Tieni la nota": da 3 a 5 note naturali, scelte con il seed nel registro comodo (l'ultima
	// prova di estensione salvata, con un tono di margine; senza prove Do4-Do5). Per ogni nota il turno di
	// canta-nota: in zona per TENUTA_MS (3 s), fuori zona il progresso cala piano, equivalenza d'ottava.
	// Un esito per nota (item = l'altezza); «Basta così» sempre in vista.
	import { TENUTA_MS } from '#lib/core/audio/costanti.ts';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { ID_DATI, leggiEstensioni, registroComodo, rigoDi, serieTieni } from '../sequenza.ts';
	import Serie from './Serie.svelte';

	let { contesto, onesito, onfine }: WidgetProps = $props();

	const registro = $derived(registroComodo(leggiEstensioni(progressi.doc?.dati[ID_DATI])));
	const giri = $derived(
		serieTieni(contesto.seed, registro).map((a) => ({ rigo: rigoDi([a]), item: a }))
	);
</script>

<Serie
	{giri}
	contatore={(numero, totale) => m.canta_nota_di({ numero, totale })}
	tenutaMs={TENUTA_MS}
	durataS={1.5}
	{contesto}
	{onesito}
	{onfine}
/>
