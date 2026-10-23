<script lang="ts" module>
	import * as v from 'valibot';

	const testo = v.pipe(v.string(), v.trim(), v.nonEmpty());
	/** Props di `scelta`. */
	export const schemaProps = v.pipe(
		v.object({
			domanda: testo,
			opzioni: v.pipe(v.array(testo), v.minLength(2, 'almeno due opzioni')),
			/** indice dell'opzione giusta */
			corretta: v.pipe(v.number(), v.integer(), v.minValue(0)),
			/** dopo una risposta da rivedere: cosa fare, mai "sbagliato" */
			suggerimento: v.optional(testo),
			/** dopo la risposta giusta: perché è giusta */
			spiegazione: v.optional(testo),
			/** item allenato, passato nell'esito (es. "G4") */
			item: v.optional(testo)
		}),
		v.check((p) => p.corretta < p.opzioni.length, 'corretta: indice oltre le opzioni')
	);
</script>

<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Avviso from '../ui/Avviso.svelte';
	import Button from '../ui/Button.svelte';
	import Domanda from '../ui/Domanda.svelte';
	import Icona from '../ui/Icona.svelte';
	import type { WidgetProps } from '../motore/widget';

	let { props, contesto, onesito, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	const id = $props.id();
	let provate: number[] = $state([]);
	let trovata = $state(false);

	const feedback = $derived(
		trovata
			? [m.scelta_giusta(), p.spiegazione].filter(Boolean).join(' ')
			: provate.length
				? // l'opzione appena provata nel testo: ogni tentativo cambia il messaggio e la regione live lo annuncia
					[m.scelta_riprova({ opzione: p.opzioni[provate.at(-1)!] }), p.suggerimento]
						.filter(Boolean)
						.join(' ')
				: ''
	);

	function scegli(i: number) {
		if (trovata || provate.includes(i)) return;
		// l'esito conta solo il primo tentativo; poi si riprova finché non si trova
		if (provate.length === 0) {
			onesito({ corretto: i === p.corretta, item: p.item, dettagli: { scelta: i } });
		}
		if (i === p.corretta) trovata = true;
		else provate.push(i);
	}
</script>

<div class="scelta" role="group" aria-labelledby="{id}-domanda">
	<Domanda
		testo={p.domanda}
		poi={[feedback, ...p.opzioni]}
		attivo={contesto.preferenze.letturaAltaVoce}
		id="{id}-domanda"
	/>
	<ul class="opzioni">
		{#each p.opzioni as opzione, i (i)}
			{@const giusta = trovata && i === p.corretta}
			{@const provata = provate.includes(i)}
			<li>
				<button
					type="button"
					class={['opzione', { giusta, provata }]}
					aria-disabled={(trovata && !giusta) || provata}
					onclick={() => scegli(i)}
				>
					<span class="segno" aria-hidden="true">
						{#if giusta}<Icona nome="check" />{/if}
					</span>
					<span>{opzione}</span>
					{#if provata}<span class="sr-only">({m.scelta_provata()})</span>{/if}
				</button>
			</li>
		{/each}
	</ul>
</div>

<Avviso tono={trovata ? 'successo' : 'attenzione'} testo={feedback} />

{#if trovata}
	<div class="azioni">
		<Button dimensione="l" onclick={onfine}>{m.pulsante_avanti()}</Button>
	</div>
{/if}

<style>
	.scelta {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	.opzioni {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
		gap: var(--spazio-3);
		padding: 0;
		list-style: none;
	}
	.opzione {
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
		width: 100%;
		min-height: calc(var(--target) + var(--spazio-3));
		padding: var(--spazio-3) var(--spazio-4);
		border: 2px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-m);
		background: var(--colore-superficie);
		font-size: var(--testo-l);
		text-align: start;
		cursor: pointer;
		transition:
			border-color var(--durata-breve) var(--easing),
			background-color var(--durata-breve) var(--easing);
	}
	.opzione:hover:not([aria-disabled='true']) {
		border-color: var(--colore-accento);
		background: var(--colore-accento-tenue);
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
	/* già provata: si attenua, senza segni di errore */
	.provata {
		border-style: dashed;
		color: var(--colore-testo-tenue);
		cursor: default;
	}
	.provata .segno {
		border-style: dashed;
	}
	.opzione[aria-disabled='true']:not(.giusta) {
		cursor: default;
	}
	.azioni {
		display: flex;
	}
</style>
