<script lang="ts" module>
	import * as v from 'valibot';
	import { schemaAltezza } from '#lib/core/widget/musica.ts';

	/** Props di `leggi-e-canta`. */
	export const schemaProps = v.object({
		/** il mazzo da cui si estraggono le note; di default la scala di Do, comoda per le voci dei bambini */
		note: v.optional(v.pipe(v.array(schemaAltezza), v.minLength(1)), [
			'C4',
			'D4',
			'E4',
			'F4',
			'G4',
			'A4',
			'B4',
			'C5'
		]),
		/** quante note cantare */
		quante: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10)), 5)
	});
</script>

<script lang="ts">
	// PG3 «Leggi e canta»: la nota è solo scritta, il sito non la suona prima; il bambino la legge e la
	// canta, e il misuratore conferma. Ogni nota è il widget core `canta-nota` con `suonaPrima: false`
	// (microfono, turni, esito al primo tentativo, chiusura quando si lascia la scheda).
	// «Basta così» è sempre lì: non si forza mai la voce.
	import { m } from '#lib/paraglide/messages.js';
	import { creaCasuale } from '#lib/core/casuale.ts';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import Button from '#lib/core/ui/Button.svelte';
	import CantaNota from '#lib/core/widget/CantaNota.svelte';
	import { serie } from '../lettura.ts';

	let { scheda, props, contesto, onesito, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	const note = $derived(serie(p.note, p.quante, creaCasuale(contesto.seed)));
	let i = $state(0);

	function prossima() {
		if (i < note.length - 1) i++;
		else onfine();
	}
</script>

<div class="testa">
	<p class="conta">{m.pentagramma_nota_di({ numero: i + 1, totale: note.length })}</p>
	<p class="consiglio">{m.pentagramma_leggi_consiglio()}</p>
</div>

{#key i}
	<CantaNota
		{scheda}
		props={{ nota: note[i], suonaPrima: false }}
		{contesto}
		{onesito}
		onfine={prossima}
	/>
{/key}

<div class="basta">
	<Button variante="secondaria" icona="chiudi" onclick={onfine}>
		{m.pentagramma_basta_cosi()}
	</Button>
</div>

<style>
	.testa {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-1);
		margin-block-end: var(--spazio-4);
	}
	.conta {
		font-weight: var(--peso-medio);
	}
	.consiglio {
		color: var(--colore-testo-tenue);
	}
	.basta {
		display: flex;
		margin-block-start: var(--spazio-5);
	}
</style>
