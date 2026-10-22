<script lang="ts" module>
	import * as v from 'valibot';
	import { schemaAltezza, schemaAspetto, schemaNote } from '#lib/core/widget/musica.ts';

	const testo = v.pipe(v.string(), v.trim(), v.nonEmpty());
	const almenoDue = <T extends v.GenericSchema>(s: T) =>
		v.optional(v.pipe(v.array(s), v.minLength(2, 'almeno due opzioni')));

	/**
	 * Props di `guarda-e-scegli`: le note sul pentagramma (con `ascolta` anche il loro suono), poi una
	 * domanda a scelta come `scelta`. Con `opzioniNote` le opzioni sono note, scritte con i nomi del profilo.
	 */
	export const schemaProps = v.pipe(
		v.object({
			note: schemaNote,
			ascolta: v.optional(v.boolean(), false),
			...schemaAspetto,
			domanda: testo,
			opzioni: almenoDue(testo),
			opzioniNote: almenoDue(schemaAltezza),
			corretta: v.pipe(v.number(), v.integer(), v.minValue(0)),
			suggerimento: v.optional(testo),
			spiegazione: v.optional(testo),
			/** di default, con `opzioniNote`, la nota giusta */
			item: v.optional(testo)
		}),
		v.check(
			(p) => (p.opzioni === undefined) !== (p.opzioniNote === undefined),
			'servono opzioni oppure opzioniNote'
		),
		v.check(
			(p) => p.corretta < (p.opzioni ?? p.opzioniNote ?? []).length,
			'corretta: indice oltre le opzioni'
		)
	);
</script>

<script lang="ts">
	// Guarda (e ascolta) le note, poi rispondi: la parte della domanda è il widget core `scelta`.
	import { m } from '#lib/paraglide/messages.js';
	import type { Riproduzione } from '#lib/core/audio/synth.ts';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import { nomeNota } from '#lib/core/musica/note.ts';
	import Button from '#lib/core/ui/Button.svelte';
	import Staff from '#lib/core/ui/Staff.svelte';
	import { suonaSeguendo } from '#lib/core/widget/musica.ts';
	import Scelta from '#lib/core/widget/Scelta.svelte';

	let { scheda, props, contesto, onesito, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	const nomi = $derived(contesto.preferenze.nomiNote);
	const scelta = $derived({
		domanda: p.domanda,
		opzioni: p.opzioni ?? (p.opzioniNote ?? []).map((n) => nomeNota(n, nomi)),
		corretta: p.corretta,
		suggerimento: p.suggerimento,
		spiegazione: p.spiegazione,
		item: p.item ?? p.opzioniNote?.[p.corretta]
	});

	let riproduzione = $state.raw<Riproduzione>();
	let suona = $state<number | null>(null);

	function ascolta() {
		if (riproduzione) return riproduzione.ferma();
		const r = suonaSeguendo(
			p.note.note.map((n) => n.altezza),
			0.8,
			(i) => (suona = i)
		);
		riproduzione = r;
		void r.fine.then(() => {
			if (riproduzione === r) riproduzione = undefined;
		});
	}

	$effect(() => () => riproduzione?.ferma());
</script>

<div class="guarda">
	<Staff
		rigo={p.note}
		etichetta={m.pentagramma_guarda_rigo({ count: p.note.note.length })}
		evidenzia={suona === null ? [] : [suona]}
		etichette={p.etichette}
		colori={p.colori}
		nomiNote={nomi}
	/>
	{#if p.ascolta}
		<div class="azioni">
			<Button variante="secondaria" icona={riproduzione ? 'pausa' : 'volume'} onclick={ascolta}>
				{riproduzione ? m.widget_ferma() : m.widget_ascolta()}
			</Button>
		</div>
	{/if}
</div>

<Scelta {scheda} props={scelta} {contesto} {onesito} {onfine} />

<style>
	.guarda {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		margin-block-end: var(--spazio-5);
	}
	.azioni {
		display: flex;
	}
</style>
