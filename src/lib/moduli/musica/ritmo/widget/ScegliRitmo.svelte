<script lang="ts" module>
	import * as v from 'valibot';
	import { schemaBpm, schemaRitmo } from '#lib/core/widget/musica.ts';
	import { suonanoUguali } from '../ritmi.ts';

	const testo = v.pipe(v.string(), v.trim(), v.nonEmpty());

	/**
	 * Props di `scegli-ritmo`: due o tre ritmi scritti tra cui scegliere. Con `ascolta` il sito suona quello
	 * giusto («quale hai sentito?»), e nessun altro può suonare uguale (TA-A e TA SST all'orecchio sono
	 * un colpo e poi niente: vedi suonanoUguali); senza, la domanda è di lettura.
	 */
	export const schemaProps = v.pipe(
		v.object({
			domanda: testo,
			ritmi: v.pipe(v.array(schemaRitmo), v.minLength(2), v.maxLength(3)),
			corretta: v.pipe(v.number(), v.integer(), v.minValue(0)),
			ascolta: v.optional(v.boolean(), false),
			bpm: schemaBpm,
			/** le sillabe sotto le note dei ritmi */
			sillabe: v.optional(v.boolean(), false),
			/** dopo una risposta da rivedere: cosa fare, mai "sbagliato" */
			suggerimento: v.optional(testo),
			/** dopo la risposta giusta: perché è giusta */
			spiegazione: v.optional(testo),
			/** di default le sillabe del ritmo giusto ('ta ti ti ta') */
			item: v.optional(testo)
		}),
		v.check((p) => p.corretta < p.ritmi.length, 'corretta: indice oltre i ritmi'),
		v.check(
			(p) =>
				!p.ascolta ||
				p.ritmi.every((r, i) => i === p.corretta || !suonanoUguali(r, p.ritmi[p.corretta])),
			'con ascolta, un altro ritmo suona uguale a quello giusto'
		)
	);
</script>

<script lang="ts">
	// Scegli il ritmo: due o tre ritmi scritti, ognuno sul suo rigo; si tocca quello che si è sentito (o
	// quello che la domanda descrive). Conta il primo tentativo, poi si riprova finché non si trova. Mentre
	// suona per la domanda nessun rigo si evidenzia (direbbe la risposta); dopo, «Ascolta di nuovo» segue le
	// note sul rigo giusto. Lo usa anche il gioco «Che ritmo è?», che porta il suo «Basta così» in `azioni`.
	import type { Snippet } from 'svelte';
	import { sblocca } from '#lib/core/audio/contesto.ts';
	import { suonaColpi } from '#lib/core/audio/percussioni.ts';
	import type { Riproduzione } from '#lib/core/audio/synth.ts';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import { colpi, eventiRitmo } from '#lib/core/musica/ritmo.ts';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Button from '#lib/core/ui/Button.svelte';
	import Domanda from '#lib/core/ui/Domanda.svelte';
	import Icona from '#lib/core/ui/Icona.svelte';
	import Staff from '#lib/core/ui/Staff.svelte';
	import { mostraIntero } from '#lib/core/ui/scorrimento.ts';
	import AzioniScheda from '#lib/core/widget/AzioniScheda.svelte';
	import { segui } from '#lib/core/widget/musica.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { itemDi } from '../ritmi.ts';

	let { props, contesto, onesito, onfine, azioni }: WidgetProps & { azioni?: Snippet } = $props();

	const p = $derived(v.parse(schemaProps, props));
	const id = $props.id();
	let provate = $state<number[]>([]);
	let trovata = $state(false);
	let riproduzione = $state.raw<Riproduzione>();
	/** la nota che suona sul rigo giusto: solo dopo averlo trovato */
	let suona = $state<number | null>(null);
	let elRitmi = $state<HTMLElement>();

	const numero = (i: number) => i + 1;
	const feedback = $derived(
		trovata
			? [m.ritmo_scegli_giusto(), p.spiegazione].filter(Boolean).join(' ')
			: provate.length
				? [
						p.ascolta
							? m.ritmo_scegli_riprova_ascolta({ numero: numero(provate.at(-1)!) })
							: m.ritmo_scegli_riprova({ numero: numero(provate.at(-1)!) }),
						p.suggerimento
					]
						.filter(Boolean)
						.join(' ')
				: ''
	);

	/** il ritmo giusto, con una battuta d'attacco: «uno, due, tre, quattro» e via */
	function ascolta() {
		if (riproduzione) return riproduzione.ferma();
		void sblocca(); // nel gesto (iOS)
		const e = eventiRitmo(p.ritmi[p.corretta], p.bpm, 1);
		const r = suonaColpi(colpi(e, { metronomo: 'attacco' }));
		riproduzione = r;
		segui(
			r,
			[0, ...e.note.map((n) => n.inizio)],
			(i) => (suona = i === null || i === 0 ? null : i - 1)
		);
		void r.fine.then(() => {
			if (riproduzione === r) riproduzione = undefined;
		});
		// su un telefono i ritmi tra cui scegliere vanno sullo schermo mentre si ascolta
		if (elRitmi) mostraIntero(elRitmi);
	}

	function scegli(i: number) {
		if (trovata || provate.includes(i)) return;
		// l'esito conta solo il primo tentativo; poi si riprova finché non si trova
		if (!provate.length) {
			onesito({
				corretto: i === p.corretta,
				item: p.item ?? itemDi(p.ritmi[p.corretta]),
				dettagli: { scelta: i }
			});
		}
		if (i === p.corretta) trovata = true;
		else provate.push(i);
	}

	$effect(() => () => riproduzione?.ferma());
</script>

<div class="scegli" role="group" aria-labelledby="{id}-domanda">
	<Domanda
		testo={p.domanda}
		poi={[feedback, ...p.ritmi.map((_, i) => m.ritmo_scegli_opzione({ numero: numero(i) }))]}
		attivo={contesto.preferenze.letturaAltaVoce}
		id="{id}-domanda"
	/>
	{#if p.ascolta}
		<div class="ascolta">
			<Button
				dimensione="l"
				variante={provate.length || trovata ? 'secondaria' : 'primaria'}
				icona={riproduzione ? 'pausa' : 'volume'}
				onclick={ascolta}
			>
				{riproduzione
					? m.widget_ferma()
					: provate.length || trovata
						? m.widget_ascolta_di_nuovo()
						: m.widget_ascolta()}
			</Button>
		</div>
	{/if}
	<ul class="ritmi" bind:this={elRitmi}>
		{#each p.ritmi as ritmo, i (i)}
			{@const giusta = trovata && i === p.corretta}
			{@const provata = provate.includes(i)}
			<li class={['ritmo', { giusta, provata }]} data-sillabe={itemDi(ritmo)}>
				<button
					type="button"
					class="sceglie"
					aria-disabled={(trovata && !giusta) || provata}
					onclick={() => scegli(i)}
				>
					<span class="segno" aria-hidden="true">
						{#if giusta}<Icona nome="check" />{/if}
					</span>
					{m.ritmo_scegli_opzione({ numero: numero(i) })}
					{#if provata}<span class="sr-only">({m.ritmo_scegli_provato()})</span>{/if}
				</button>
				<Staff
					rigo={ritmo}
					etichetta={m.ritmo_scegli_rigo({ numero: numero(i) })}
					sillabe={p.sillabe}
					compatto
					evidenzia={giusta && suona !== null ? [suona] : []}
				/>
			</li>
		{/each}
	</ul>
</div>

<Avviso tono={trovata ? 'successo' : 'attenzione'} testo={feedback} />

{#if azioni || trovata}
	<AzioniScheda>
		{@render azioni?.()}
		{#if trovata}
			<Button dimensione="l" onclick={onfine}>{m.pulsante_avanti()}</Button>
		{/if}
	</AzioniScheda>
{/if}

<style>
	.scegli {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	.ascolta {
		display: flex;
	}
	.ritmi {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: var(--spazio-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* tutta la scheda del ritmo si tocca: il pulsante la copre (::after), il rigo resta da guardare */
	.ritmo {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--spazio-1);
		padding: var(--spazio-2) var(--spazio-3);
		border: 2px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-m);
		background: var(--colore-superficie);
		transition:
			border-color var(--durata-breve) var(--easing),
			background-color var(--durata-breve) var(--easing);
	}
	.ritmo:has(.sceglie:hover:not([aria-disabled='true'])) {
		border-color: var(--colore-accento);
		background: var(--colore-accento-tenue);
	}
	.ritmo:has(.sceglie:focus-visible) {
		outline: 3px solid var(--colore-focus);
		outline-offset: 2px;
	}
	.sceglie {
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
		/* basso: il bersaglio da toccare è tutta la scheda (::after), e tre ritmi stanno su un telefono */
		min-height: 2rem;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
		text-align: start;
		cursor: pointer;
	}
	.sceglie:focus-visible {
		outline: none; /* il contorno va su tutta la scheda */
	}
	.sceglie::after {
		position: absolute;
		inset: 0;
		content: '';
	}
	.sceglie[aria-disabled='true'] {
		cursor: default;
	}
	.segno {
		display: grid;
		place-items: center;
		flex: none;
		width: 1.75rem;
		height: 1.75rem;
		border: 2px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-pieno);
	}
	.giusta {
		border-color: var(--colore-successo);
		background: var(--colore-successo-tenue);
	}
	.giusta .segno {
		border-color: var(--colore-successo);
		background: var(--colore-successo);
		color: var(--colore-superficie);
	}
	/* già provato: si attenua, senza segni di errore */
	.provata {
		border-style: dashed;
		color: var(--colore-testo-tenue);
	}
	.provata .segno {
		border-style: dashed;
	}
</style>
