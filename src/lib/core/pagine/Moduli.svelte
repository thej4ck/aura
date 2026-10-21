<script lang="ts">
	// Selettore dei moduli: catalogo a schede con filtri per area, età e stato. Il filtro resta nelle preferenze.
	import { m } from '#lib/paraglide/messages.js';
	import { catalogo as catalogoReale, type Catalogo } from '../contenuti/registry';
	import { progressi } from '../store/progressi.svelte';
	import type { StatoAvanzamento } from '../store/schema-progressi';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icona from '../ui/Icona.svelte';
	import { filtraModuli, filtroValido, opzioniFiltro, type Filtro } from '../vista/filtro';
	import { DOC_VUOTO } from '../vista/pagine';
	import SchedaModulo from './SchedaModulo.svelte';

	type Props = { catalogo?: Catalogo };
	let { catalogo = catalogoReale }: Props = $props();

	const id = $props.id();
	const STATI: [StatoAvanzamento, () => string][] = [
		['da_iniziare', m.moduli_stato_da_iniziare],
		['in_corso', m.moduli_stato_in_corso],
		['completato', m.moduli_stato_completato]
	];

	/** prima che il profilo sia caricato il filtro vive qui; poi sta nelle preferenze */
	let locale: Filtro = $state({});
	const opzioni = $derived(opzioniFiltro(catalogo));
	const filtro = $derived(filtroValido(catalogo, progressi.doc?.preferenze.filtroModuli ?? locale));
	const risultati = $derived(filtraModuli(catalogo, progressi.doc ?? DOC_VUOTO, filtro));
	const filtrato = $derived(Object.keys(filtro).length > 0);

	function imposta(nuovo: Filtro) {
		// niente chiavi undefined nel documento salvato
		const pulito = Object.fromEntries(
			Object.entries(nuovo).filter(([, v]) => v !== undefined)
		) as Filtro;
		locale = pulito;
		if (progressi.doc) progressi.aggiornaPreferenze({ filtroModuli: pulito });
	}
</script>

{#snippet scelta(
	gruppo: string,
	valore: string | number | undefined,
	attuale: string | number | undefined,
	etichetta: string,
	cambia: () => void
)}
	<label class="chip">
		<input
			type="radio"
			name="{id}-{gruppo}"
			value={valore ?? ''}
			checked={valore === attuale}
			onchange={cambia}
		/>
		<span class="spunta" aria-hidden="true"><Icona nome="check" /></span>
		{etichetta}
	</label>
{/snippet}

<div class="moduli">
	<header class="intro">
		<h1>{m.layout_moduli()}</h1>
		<p class="lead">{m.moduli_intro()}</p>
	</header>

	{#if opzioni.aree.length === 0}
		<Card tono="tenue" class="vuoto">
			<p class="lead">{m.moduli_vuoto()}</p>
		</Card>
	{:else}
		<section class="filtri" aria-label={m.moduli_filtri()}>
			{#if opzioni.aree.length > 1}
				<fieldset>
					<legend>{m.moduli_filtro_area()}</legend>
					<div class="chips">
						{@render scelta('area', undefined, filtro.area, m.moduli_tutte(), () =>
							imposta({ ...filtro, area: undefined })
						)}
						{#each opzioni.aree as a (a.id)}
							{@render scelta('area', a.id, filtro.area, `${a.icona} ${a.titolo}`, () =>
								imposta({ ...filtro, area: a.id })
							)}
						{/each}
					</div>
				</fieldset>
			{/if}
			{#if opzioni.eta.length > 1}
				<fieldset>
					<legend>{m.moduli_filtro_eta()}</legend>
					<div class="chips">
						{@render scelta('eta', undefined, filtro.eta, m.moduli_tutte(), () =>
							imposta({ ...filtro, eta: undefined })
						)}
						{#each opzioni.eta as e (e)}
							{@render scelta('eta', e, filtro.eta, m.vista_eta_una({ eta: e }), () =>
								imposta({ ...filtro, eta: e })
							)}
						{/each}
					</div>
				</fieldset>
			{/if}
			<fieldset>
				<legend>{m.moduli_filtro_stato()}</legend>
				<div class="chips">
					{@render scelta('stato', undefined, filtro.stato, m.moduli_tutti(), () =>
						imposta({ ...filtro, stato: undefined })
					)}
					{#each STATI as [s, etichetta] (s)}
						{@render scelta('stato', s, filtro.stato, etichetta(), () =>
							imposta({ ...filtro, stato: s })
						)}
					{/each}
				</div>
			</fieldset>
		</section>

		<div class="risultati">
			<!-- sempre nel DOM: il numero dei moduli si annuncia a ogni cambio di filtro -->
			<p class="conteggio" role="status">
				{risultati.length ? m.moduli_risultato({ count: risultati.length }) : m.moduli_nessuno()}
			</p>
			{#if !risultati.length && filtrato}
				<div>
					<Button variante="secondaria" icona="ricomincia" onclick={() => imposta({})}>
						{m.moduli_togli_filtri()}
					</Button>
				</div>
			{/if}
			{#if risultati.length}
				<ul class="griglia">
					{#each risultati as voce (voce.modulo.id)}
						<li><SchedaModulo {voce} /></li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	.moduli {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-6);
	}
	.intro {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	.lead {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
	}
	.moduli :global(.vuoto) {
		max-width: 44rem;
		padding: var(--spazio-6);
	}

	.filtri {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	fieldset {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
		margin-block-end: var(--spazio-2);
		font-weight: var(--peso-medio);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2);
	}
	.chip {
		position: relative;
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
		min-height: var(--target);
		padding: var(--spazio-2) var(--spazio-4);
		border: 1px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-pieno);
		background: var(--colore-superficie);
		font-size: var(--testo-s);
		font-weight: var(--peso-medio);
		cursor: pointer;
		user-select: none;
	}
	.chip:hover {
		border-color: var(--colore-accento);
	}
	/* il radio vero resta (tastiera, lettori di schermo), nascosto sotto la pillola */
	.chip input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}
	.chip:has(input:focus-visible) {
		outline: var(--bordo-focus) solid var(--colore-focus);
		outline-offset: 2px;
	}
	/* scelta attiva: tinta, bordo più spesso e spunta (non solo il colore) */
	.chip:has(input:checked) {
		border-color: var(--colore-accento);
		box-shadow: inset 0 0 0 1px var(--colore-accento);
		background: var(--colore-accento-tenue);
		color: var(--colore-accento-forte);
	}
	.spunta {
		display: none;
	}
	.chip:has(input:checked) .spunta {
		display: inline-flex;
	}

	.risultati {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	.conteggio {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
		font-weight: var(--peso-medio);
	}
	.griglia {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
		gap: var(--spazio-4);
		padding: 0;
		list-style: none;
	}
</style>
