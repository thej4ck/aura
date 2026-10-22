<script lang="ts" module>
	import * as v from 'valibot';

	const testo = v.pipe(v.string(), v.trim(), v.nonEmpty());
	/** Props di `tocca-rigo`: una linea o uno spazio da trovare, contando dal basso (senza note). */
	export const schemaProps = v.object({
		/** 0 = prima linea, 1 = primo spazio, … 8 = quinta linea */
		passo: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(8)),
		/** di default "Tocca la terza linea" */
		domanda: v.optional(testo),
		/** dopo una risposta da rivedere: cosa fare, mai "sbagliato" */
		suggerimento: v.optional(testo)
	});
</script>

<script lang="ts">
	// Un pentagramma grande, senza chiave e senza note: ogni linea e ogni spazio è un pulsante alto
	// almeno 48 px che si illumina quando lo tocchi. Frecce su e giù per muoversi, Invio per scegliere.
	// L'esito conta il primo tentativo; poi si riprova con un aiuto che cresce.
	import { m } from '#lib/paraglide/messages.js';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import { nomePosizione, suLinea } from '#lib/core/musica/notazione.ts';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Button from '#lib/core/ui/Button.svelte';

	let { props, onesito, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	const PASSI = [8, 7, 6, 5, 4, 3, 2, 1, 0]; // dall'alto in basso, come si vedono
	/** "la terza linea", "il primo spazio" */
	const dove = (q: number) =>
		m.pentagramma_posizione({ tipo: suLinea(q) ? 'linea' : 'spazio', posizione: nomePosizione(q) });
	const domanda = $derived(p.domanda ?? m.pentagramma_tocca_domanda({ dove: dove(p.passo) }));

	let toccato = $state<number>();
	let tentativi = $state(0);
	const trovato = $derived(toccato === p.passo);
	let corrente = $state(4);

	const feedback = $derived.by(() => {
		if (toccato === undefined) return '';
		if (trovato) return m.pentagramma_tocca_giusto({ dove: dove(p.passo) });
		return [
			m.pentagramma_tocca_toccato({ dove: dove(toccato) }),
			p.passo > toccato
				? m.pentagramma_tocca_piu_su({ dove: dove(p.passo) })
				: m.pentagramma_tocca_piu_giu({ dove: dove(p.passo) }),
			tentativi > 1 ? m.pentagramma_tocca_conta() : '',
			p.suggerimento ?? ''
		]
			.filter(Boolean)
			.join(' ');
	});

	function scegli(q: number) {
		if (trovato) return;
		tentativi++;
		if (tentativi === 1) onesito({ corretto: q === p.passo, dettagli: { toccato: q } });
		toccato = q;
		corrente = q;
	}

	function tasto(e: KeyboardEvent) {
		const dove: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, Home: 8, End: 0 };
		if (!(e.key in dove)) return;
		e.preventDefault();
		corrente =
			e.key === 'Home' || e.key === 'End'
				? dove[e.key]
				: Math.min(8, Math.max(0, corrente + dove[e.key]));
		const gruppo = (e.currentTarget as HTMLElement).parentElement;
		gruppo?.querySelector<HTMLElement>(`[data-passo="${corrente}"]`)?.focus();
	}
</script>

<p class="domanda">{domanda}</p>

<div class="rigo" role="group" aria-label={domanda}>
	{#each PASSI as q (q)}
		{@const luce = toccato === q}
		<button
			type="button"
			data-passo={q}
			class={['fascia', suLinea(q) ? 'linea' : 'spazio', { luce, trovato: luce && trovato }]}
			tabindex={q === corrente ? 0 : -1}
			aria-label={nomePosizione(q)}
			aria-pressed={luce}
			onclick={() => scegli(q)}
			onkeydown={tasto}
			onfocus={() => (corrente = q)}
		>
			{#if luce}<span class="nome" aria-hidden="true">{nomePosizione(q)}</span>{/if}
		</button>
	{/each}
</div>

<Avviso tono={trovato ? 'successo' : 'attenzione'} testo={feedback} />

{#if trovato}
	<div class="azioni">
		<Button dimensione="l" onclick={onfine}>{m.pulsante_avanti()}</Button>
	</div>
{/if}

<style>
	.domanda {
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
	}
	.rigo {
		display: flex;
		flex-direction: column;
		margin-block: var(--spazio-4);
		padding-inline: var(--spazio-3);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
	}
	.fascia {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		/* ogni linea e ogni spazio è un'area di tocco piena */
		height: 3rem;
		padding-inline: var(--spazio-3);
		border: 0;
		border-radius: var(--raggio-s);
		background: transparent;
		color: var(--colore-testo);
		cursor: pointer;
		touch-action: manipulation;
		transition: background-color var(--durata-breve) var(--easing);
	}
	.linea::before {
		content: '';
		position: absolute;
		inset-inline: var(--spazio-2);
		top: calc(50% - 1.5px);
		border-top: 3px solid var(--colore-testo);
		border-radius: 2px;
	}
	.fascia:hover {
		background: color-mix(in srgb, var(--colore-accento) 10%, transparent);
	}
	.fascia:focus-visible {
		outline: var(--bordo-focus) solid var(--colore-focus);
		outline-offset: calc(-1 * var(--bordo-focus));
	}
	/* illuminata: la linea si fa spessa e colorata, lo spazio si colora; il nome dice dove sei */
	.spazio.luce {
		background: var(--colore-accento-tenue);
	}
	.linea.luce::before {
		top: calc(50% - 3px);
		border-top: 6px solid var(--colore-accento);
	}
	.nome {
		position: relative;
		padding: 0 var(--spazio-2);
		border-radius: var(--raggio-s);
		background: var(--colore-superficie);
		font-weight: var(--peso-forte);
	}
	.spazio.luce .nome {
		background: transparent;
	}
	.trovato .nome::after {
		content: ' ✓';
	}
	.azioni {
		display: flex;
	}
</style>
