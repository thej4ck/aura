<script lang="ts" module>
	import * as v from 'valibot';
	import { schemaAspetto } from '#lib/core/widget/musica.ts';

	/** Props di `leggi-e-canta`. */
	export const schemaProps = v.object({
		/** quante melodie leggere e cantare */
		quante: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)), 4),
		/** nomi e colori sotto le note: un aiuto per «Proviamo insieme», di default spenti */
		...schemaAspetto
	});
</script>

<script lang="ts">
	// PG3 «Leggi e canta», come nel solfeggio cantato: il sito suona solo la nota di partenza, il Do; il
	// bambino la canta, poi legge e canta le altre note di una breve melodia, per gradi vicini e piccoli
	// salti. Ogni melodia è il turno di canto del core (Canto.svelte, `lettura`): il Do scritto come nota di
	// riferimento, misuratore, esito al primo tentativo, microfono chiuso quando si passa oltre. Tutte le
	// note si sentono solo dopo, per controllarsi. «Basta così» è sempre lì: la voce non si forza.
	import { m } from '#lib/paraglide/messages.js';
	import { TENUTA_SEQUENZA_MS } from '#lib/core/audio/costanti.ts';
	import { creaCasuale } from '#lib/core/casuale.ts';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import Button from '#lib/core/ui/Button.svelte';
	import { nonPerdereIlFocus } from '#lib/core/ui/focus.ts';
	import Canto from '#lib/core/widget/Canto.svelte';
	import { melodieDaDo } from '../lettura.ts';

	let { props, contesto, onesito, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	const melodie = $derived(melodieDaDo(p.quante, creaCasuale(contesto.seed)));
	let i = $state(0);
	let contatore = $state<HTMLElement>();
	const melodia = $derived(melodie[Math.min(i, melodie.length - 1)]);

	function prossima() {
		if (i < melodie.length - 1) {
			i++;
			void nonPerdereIlFocus(contatore); // il turno di canto ricomincia, con i suoi pulsanti
		} else onfine();
	}
</script>

<p class="conta" tabindex="-1" bind:this={contatore}>
	{m.pentagramma_melodia_di({ numero: i + 1, totale: melodie.length })}
</p>
<p class="consiglio">{m.pentagramma_leggi_consiglio()}</p>

{#key i}
	<Canto
		rigo={{ chiave: 'violino', note: melodia.map((altezza) => ({ altezza })) }}
		tenutaMs={TENUTA_SEQUENZA_MS}
		equivalenzaOttava
		lettura
		durataS={1}
		etichette={p.etichette}
		colori={p.colori}
		{contesto}
		item={melodia.join('-')}
		{onesito}
		onfine={prossima}
	>
		{#snippet azioni()}
			<!-- «Basta così» sempre in vista: nella barra della scheda, accanto ad «Avanti» -->
			<Button variante="quieta" icona="chiudi" onclick={onfine}>
				{m.pentagramma_basta_cosi()}
			</Button>
		{/snippet}
	</Canto>
{/key}

<style>
	.conta {
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
	}
	.consiglio {
		margin-block: var(--spazio-2) var(--spazio-4);
		color: var(--colore-testo-tenue);
	}
</style>
