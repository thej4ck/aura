<script lang="ts" module>
	import * as v from 'valibot';
	import { passo } from '#lib/core/musica/notazione.ts';
	import { schemaAltezza } from '#lib/core/widget/musica.ts';
	import { MAX_PASSI_TROVALA, ORDINE_NOTE } from '../lettura.ts';

	const passoRigo = v.pipe(v.number(), v.integer(), v.minValue(-8), v.maxValue(16));
	/** Props di `trovala`. */
	export const schemaProps = v.pipe(
		v.object({
			/** il mazzo da cui si estraggono le note; di default tutte quelle di "Che nota è?" */
			note: v.optional(v.pipe(v.array(schemaAltezza), v.minLength(2)), [...ORDINE_NOTE]),
			/** quante note trovare */
			quante: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20)), 6),
			/**
			 * passi toccabili: di default dal Do sotto al Si sopra. Al massimo due posti per nome, così
			 * «più in alto» o «più in basso» basta a dire quale toccare
			 */
			selezionabili: v.optional(
				v.pipe(
					v.tuple([passoRigo, passoRigo]),
					v.check(([min, max]) => min < max, 'selezionabili: [min, max]'),
					v.check(
						([min, max]) => max - min <= MAX_PASSI_TROVALA,
						'selezionabili: al massimo due posti con lo stesso nome'
					)
				),
				[-2, 11]
			)
		}),
		v.check(
			({ note, selezionabili: [min, max] }) =>
				note.every((n) => passo(n) >= min && passo(n) <= max),
			'note fuori dalle posizioni selezionabili'
		)
	);
</script>

<script lang="ts">
	// PG2 «Trovala sul pentagramma»: dato il nome (e, se lo vuoi, il suono), tocchi il posto giusto.
	// Una serie di note estratte con il seed; ognuna è il widget core `staff-tocca`, che dà il feedback
	// e conta il primo tentativo. Quando lo stesso nome sta in due posti, la domanda dice quale.
	import { m } from '#lib/paraglide/messages.js';
	import { creaCasuale } from '#lib/core/casuale.ts';
	import { suonaNota, type Riproduzione } from '#lib/core/audio/synth.ts';
	import { sblocca } from '#lib/core/audio/contesto.ts';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import { midi, nomeNota } from '#lib/core/musica/note.ts';
	import Button from '#lib/core/ui/Button.svelte';
	import StaffTocca from '#lib/core/widget/StaffTocca.svelte';
	import { registro, serie } from '../lettura.ts';

	let { scheda, props, contesto, onesito, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	const note = $derived(serie(p.note, p.quante, creaCasuale(contesto.seed)));
	let i = $state(0);
	const nota = $derived(note[i]);
	const domanda = $derived(
		m.pentagramma_trovala_domanda({
			nome: nomeNota(nota, contesto.preferenze.nomiNote),
			registro: registro(nota, p.selezionabili) ?? 'unico'
		})
	);

	let suono: Riproduzione | undefined;
	function ascolta() {
		void sblocca(); // nel gesto (iOS)
		suono?.ferma();
		suono = suonaNota(midi(nota), 1);
	}
	$effect(() => () => suono?.ferma());

	function prossima() {
		suono?.ferma();
		if (i < note.length - 1) i++;
		else onfine();
	}
</script>

<div class="testa">
	<p class="conta">{m.pentagramma_nota_di({ numero: i + 1, totale: note.length })}</p>
	<Button variante="secondaria" icona="volume" onclick={ascolta}>
		{m.pentagramma_trovala_ascolta()}
	</Button>
</div>

{#key i}
	<StaffTocca
		{scheda}
		props={{ nota, domanda, selezionabili: p.selezionabili }}
		{contesto}
		{onesito}
		onfine={prossima}
	/>
{/key}

<style>
	.testa {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
		align-items: center;
		justify-content: space-between;
	}
	.conta {
		color: var(--colore-testo-tenue);
	}
</style>
