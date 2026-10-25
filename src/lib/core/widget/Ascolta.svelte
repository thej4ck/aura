<script lang="ts" module>
	import * as v from 'valibot';
	import { schemaAspetto, schemaBpm, schemaNote, schemaRitmo } from './musica.ts';

	/** Props di `ascolta`: le note (col synth) oppure un ritmo (col legnetto), uno dei due. */
	export const schemaProps = v.pipe(
		v.object({
			/** altezze ('G4') in chiave di violino, oppure un Rigo */
			note: v.optional(schemaNote),
			/** secondi per nota */
			durata: v.optional(v.pipe(v.number(), v.minValue(0.2), v.maxValue(4)), 0.8),
			/** un ritmo (un Rigo con le durate, di solito il rigo ritmico), suonato col legnetto */
			ritmo: v.optional(schemaRitmo),
			bpm: schemaBpm,
			/** col ritmo, i clic del metronomo su ogni battito (si sente quanto dura TA-A) */
			metronomo: v.optional(v.boolean(), false),
			/** col ritmo, le sillabe sotto le note */
			sillabe: v.optional(v.boolean(), true),
			...schemaAspetto
		}),
		v.check((p) => !p.note !== !p.ritmo, 'ascolta vuole `note` oppure `ritmo`, uno dei due')
	);
</script>

<script lang="ts">
	// Suona una nota, una sequenza o un ritmo e li mostra sempre sullo Staff, evidenziando la nota che
	// suona. Il ritmo suona col legnetto (le pause tacciono), con l'accento sul primo di ogni battuta se c'è
	// il tempo in chiave. Nessun esito: "Avanti" compare dopo il primo ascolto completo (non se lo si
	// ferma prima).
	import { m } from '#lib/paraglide/messages.js';
	import { sblocca } from '../audio/contesto.ts';
	import { suonaColpi } from '../audio/percussioni.ts';
	import type { Riproduzione } from '../audio/synth.ts';
	import type { WidgetProps } from '../motore/widget.ts';
	import { colpi, eventiRitmo } from '../musica/ritmo.ts';
	import Button from '../ui/Button.svelte';
	import Staff from '../ui/Staff.svelte';
	import AzioniScheda from './AzioniScheda.svelte';
	import { segui, suonaSeguendo } from './musica.ts';

	let { props, contesto, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	const rigo = $derived((p.ritmo ?? p.note)!);
	let riproduzione = $state.raw<Riproduzione>();
	let suona = $state<number | null>(null);
	let ascoltata = $state(false);

	let fermata = false;

	function suonaRitmo(): Riproduzione {
		void sblocca(); // nel gesto (iOS)
		const e = eventiRitmo(rigo, p.bpm);
		const r = suonaColpi(colpi(e, { metronomo: p.metronomo ? 'tutti' : 'no' }));
		segui(
			r,
			e.note.map((n) => n.inizio),
			(i) => (suona = i)
		);
		return r;
	}

	function ascolta() {
		if (riproduzione) {
			fermata = true;
			return riproduzione.ferma();
		}
		fermata = false;
		const r = p.ritmo
			? suonaRitmo()
			: suonaSeguendo(
					rigo.note.map((n) => n.altezza),
					p.durata,
					(i) => (suona = i)
				);
		riproduzione = r;
		void r.fine.then(() => {
			if (riproduzione !== r) return;
			riproduzione = undefined;
			if (!fermata) ascoltata = true;
		});
	}

	// uscendo dalla scheda il suono si ferma
	$effect(() => () => riproduzione?.ferma());
</script>

<Staff
	{rigo}
	etichetta={p.ritmo ? m.ascolta_ritmo() : m.ascolta_rigo({ count: rigo.note.length })}
	evidenzia={suona === null ? [] : [suona]}
	sillabe={!!p.ritmo && p.sillabe}
	etichette={p.etichette}
	colori={p.colori}
	nomiNote={contesto.preferenze.nomiNote}
/>

<div class="azioni">
	<Button
		dimensione="l"
		variante={ascoltata ? 'secondaria' : 'primaria'}
		icona={riproduzione ? 'pausa' : 'volume'}
		onclick={ascolta}
	>
		{riproduzione ? m.widget_ferma() : ascoltata ? m.widget_ascolta_di_nuovo() : m.widget_ascolta()}
	</Button>
</div>
{#if ascoltata}
	<AzioniScheda>
		<Button dimensione="l" onclick={onfine}>{m.pulsante_avanti()}</Button>
	</AzioniScheda>
{/if}

<style>
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
</style>
