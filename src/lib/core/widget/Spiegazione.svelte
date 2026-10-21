<script lang="ts" module>
	import * as v from 'valibot';

	const nome = v.pipe(v.string(), v.nonEmpty());
	/** Props di `spiegazione`: titolo e testo stanno nella scheda; qui solo l'illustrazione facoltativa. */
	export const schemaProps = v.object({
		/**
		 * `componente`: un componente SVG del modulo (dichiarato in `widget` di modulo.ts), segue i token e il tema;
		 * `src`: un'immagine servita dal sito (SVG o raster ottimizzato). `alt` vuoto = decorativa.
		 */
		illustrazione: v.optional(
			v.union([
				v.object({ componente: nome, alt: v.string() }),
				v.object({ src: nome, alt: v.string() })
			])
		)
	});
</script>

<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Button from '../ui/Button.svelte';
	import type { WidgetProps } from '../motore/widget';

	let { props, contesto, onfine }: WidgetProps = $props();

	const { illustrazione } = $derived(v.parse(schemaProps, props));
</script>

{#if illustrazione}
	<figure class="illustrazione">
		{#if 'src' in illustrazione}
			<img src={illustrazione.src} alt={illustrazione.alt} />
		{:else}
			{#await contesto.carica(illustrazione.componente) then Disegno}
				<div
					role={illustrazione.alt ? 'img' : undefined}
					aria-label={illustrazione.alt || undefined}
					aria-hidden={illustrazione.alt ? undefined : 'true'}
				>
					<Disegno />
				</div>
			{/await}
		{/if}
	</figure>
{/if}

<div class="azioni">
	<Button dimensione="l" onclick={onfine}>{m.pulsante_avanti()}</Button>
</div>

<style>
	.illustrazione {
		display: grid;
		place-items: center;
		padding: var(--spazio-5);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie-tenue);
		color: var(--colore-testo);
	}
	/* il disegno del modulo prende la larghezza della figura (centrato in grid si restringerebbe a 300px) */
	.illustrazione > div {
		display: grid;
		place-items: center;
		width: 100%;
	}
	img {
		max-height: 16rem;
		height: auto;
	}
	.azioni {
		display: flex;
	}
</style>
