<script lang="ts" module>
	import * as v from 'valibot';

	const testo = v.pipe(v.string(), v.trim(), v.nonEmpty());
	/**
	 * Props di `animazione`: una spiegazione animata a passi.
	 * `componente` è il nome di un componente SVG del modulo (in `widget` di modulo.ts) che riceve
	 * `StatoDisegno` = { passo, inRiproduzione, riduciMovimento } (vedi ui/PlayerPassi.svelte).
	 */
	export const schemaProps = v.object({
		componente: v.pipe(v.string(), v.nonEmpty()),
		passi: v.pipe(
			v.array(
				v.object({
					testo,
					durataMs: v.optional(v.pipe(v.number(), v.integer(), v.minValue(500)))
				})
			),
			v.nonEmpty('almeno un passo')
		),
		/** nome accessibile del disegno; se manca si usa il titolo della scheda */
		etichetta: v.optional(testo)
	});
</script>

<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { m } from '#lib/paraglide/messages.js';
	import Avviso from '../ui/Avviso.svelte';
	import Button from '../ui/Button.svelte';
	import PlayerPassi from '../ui/PlayerPassi.svelte';
	import type { WidgetProps } from '../motore/widget';

	let { scheda, props, contesto, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	const riduci = $derived(
		contesto.preferenze.accessibilita.riduciMovimento || prefersReducedMotion.current
	);
</script>

{#await contesto.carica(p.componente) then Disegno}
	<PlayerPassi
		passi={p.passi}
		etichetta={p.etichetta ?? scheda.titolo ?? p.passi[0].testo}
		leggi={contesto.preferenze.letturaAltaVoce}
		riduciMovimento={riduci}
	>
		{#snippet disegno(stato)}
			<Disegno {...stato} />
		{/snippet}
	</PlayerPassi>
{:catch}
	<Avviso tono="attenzione" testo={m.attivita_widget_errore()} />
{/await}

<div class="azioni">
	<Button dimensione="l" onclick={onfine}>{m.pulsante_avanti()}</Button>
</div>

<style>
	.azioni {
		display: flex;
	}
</style>
