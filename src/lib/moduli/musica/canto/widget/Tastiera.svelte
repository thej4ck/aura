<script lang="ts" module>
	import * as v from 'valibot';
	import { midi } from '#lib/core/musica/note.ts';
	import { schemaAltezza, schemaAspetto, schemaNote } from '#lib/core/widget/musica.ts';

	/** Props di `tastiera`: una tastiera da toccare, con la nota scritta sullo Staff. */
	export const schemaProps = v.pipe(
		v.object({
			/** primo e ultimo tasto */
			da: v.optional(schemaAltezza, 'C4'),
			a: v.optional(schemaAltezza, 'C5'),
			/** note da ascoltare in fila con «Ascolta» (es. la scala cromatica); senza, solo da toccare */
			note: v.optional(schemaNote),
			/** secondi per nota */
			durata: v.optional(v.pipe(v.number(), v.minValue(0.2), v.maxValue(4)), 0.8),
			/** come si scrivono i tasti neri toccati: Do♯ (salendo) o Re♭ (scendendo) */
			grafia: v.optional(v.picklist(['diesis', 'bemolle']), 'diesis'),
			/** i tasti neri si vedono ma non si toccano: per le lezioni che vengono prima di diesis e bemolle */
			soloBianchi: v.optional(v.boolean(), false),
			...schemaAspetto
		}),
		v.check((p) => midi(p.da) < midi(p.a), 'da: il primo tasto deve stare sotto l’ultimo')
	);
</script>

<script lang="ts">
	// Tocchi un tasto: suona e si scrive sullo Staff (i tasti neri con diesis o bemolle, secondo `grafia`).
	// Con `note`, «Ascolta» le suona in fila evidenziando insieme il tasto e la nota. Nessun esito:
	// «Avanti» c'è subito, o dopo il primo ascolto completo se ci sono note da ascoltare.
	import type { Riproduzione } from '#lib/core/audio/synth.ts';
	import type { Rigo } from '#lib/core/contenuti/schema.ts';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import { altezza, nomeNotaParlato } from '#lib/core/musica/note.ts';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Button from '#lib/core/ui/Button.svelte';
	import Keyboard from '#lib/core/ui/Keyboard.svelte';
	import Staff from '#lib/core/ui/Staff.svelte';
	import { suonaSeguendo } from '#lib/core/widget/musica.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { rigoDi } from '../sequenza.ts';

	let { props, contesto, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	const nomi = $derived(contesto.preferenze.nomiNote);
	let toccata = $state<string | null>(null);
	let suona = $state<number | null>(null);
	let riproduzione = $state.raw<Riproduzione>();
	let ascoltata = $state(false);
	let fermata = false;

	const sequenza = $derived(p.note?.note.map((n) => n.altezza) ?? []);
	const rigo = $derived<Rigo>(
		toccata ? rigoDi([toccata]) : (p.note ?? { chiave: 'violino', note: [] })
	);
	const evidenziati = $derived(
		toccata ? [midi(toccata)] : suona !== null ? [midi(sequenza[suona])] : []
	);

	function ferma() {
		fermata = true;
		riproduzione?.ferma();
		riproduzione = undefined;
	}

	function tocca(n: number) {
		ferma();
		toccata = altezza(n, p.grafia);
		riproduzione = suonaSeguendo([toccata], p.durata, () => {});
	}

	function ascolta() {
		if (riproduzione && !toccata) return ferma();
		ferma();
		toccata = null;
		fermata = false;
		const r = suonaSeguendo(sequenza, p.durata, (i) => (suona = i));
		riproduzione = r;
		void r.fine.then(() => {
			if (riproduzione !== r) return;
			riproduzione = undefined;
			if (!fermata) ascoltata = true;
		});
	}

	$effect(() => () => riproduzione?.ferma());
</script>

<div class="tastiera">
	<Staff
		{rigo}
		etichetta={toccata ? m.canto_tastiera_rigo() : m.ascolta_rigo({ count: sequenza.length })}
		evidenzia={toccata ? [0] : suona !== null ? [suona] : []}
		etichette={p.etichette}
		colori={p.colori}
		nomiNote={nomi}
	/>
	<Keyboard
		da={midi(p.da)}
		a={midi(p.a)}
		evidenzia={evidenziati}
		etichette
		nomiNote={nomi}
		onpick={tocca}
		soloBianchi={p.soloBianchi}
		etichetta={m.canto_tastiera()}
	/>
	<Avviso
		testo={toccata ? m.canto_tastiera_toccato({ nome: nomeNotaParlato(toccata, nomi) }) : ''}
	/>
	<div class="azioni">
		{#if sequenza.length}
			<Button
				dimensione="l"
				variante={ascoltata ? 'secondaria' : 'primaria'}
				icona={riproduzione && !toccata ? 'pausa' : 'volume'}
				onclick={ascolta}
			>
				{riproduzione && !toccata
					? m.widget_ferma()
					: ascoltata
						? m.widget_ascolta_di_nuovo()
						: m.widget_ascolta()}
			</Button>
		{/if}
		{#if !sequenza.length || ascoltata}
			<Button dimensione="l" onclick={onfine}>{m.pulsante_avanti()}</Button>
		{/if}
	</div>
</div>

<style>
	.tastiera {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
	}
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
</style>
