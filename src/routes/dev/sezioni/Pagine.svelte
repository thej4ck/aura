<script lang="ts">
	// Le pagine dell'app con il catalogo di prova (o vuoto), sui progressi del profilo attivo.
	import { m } from '#lib/paraglide/messages.js';
	import {
		catalogoVetrina,
		catalogoVuoto
	} from '#lib/core/contenuti/__fixtures__/vetrina/catalogo.ts';
	import Area from '#lib/core/pagine/Area.svelte';
	import Genitori from '#lib/core/pagine/Genitori.svelte';
	import Home from '#lib/core/pagine/Home.svelte';
	import Moduli from '#lib/core/pagine/Moduli.svelte';
	import Modulo from '#lib/core/pagine/Modulo.svelte';

	const VISTE = [
		['home', m.dev_pagine_home],
		['moduli', m.layout_moduli],
		['area', m.dev_pagine_area],
		['modulo', m.dev_pagine_modulo],
		['genitori', m.layout_genitori]
	] as const;

	let vista: (typeof VISTE)[number][0] = $state('home');
	let vuoto = $state(false);
	const catalogo = $derived(vuoto ? catalogoVuoto : catalogoVetrina);
</script>

<section aria-labelledby="sez-pagine">
	<h2 id="sez-pagine">{m.dev_pagine()}</h2>
	<p class="nota">{m.dev_pagine_testo()}</p>
	<div class="comandi">
		<label class="campo">
			{m.dev_pagine_scegli()}
			<select bind:value={vista}>
				{#each VISTE as [valore, nome] (valore)}
					<option value={valore}>{nome()}</option>
				{/each}
			</select>
		</label>
		<label class="campo">
			<input type="checkbox" bind:checked={vuoto} />
			{m.dev_pagine_vuoto()}
		</label>
	</div>
	<div class="cornice">
		{#if vista === 'home'}
			<Home {catalogo} />
		{:else if vista === 'moduli'}
			<Moduli {catalogo} />
		{:else if vista === 'area'}
			<Area area="suoni" {catalogo} />
		{:else if vista === 'modulo'}
			<Modulo modulo="suoni.ascolto" {catalogo} />
		{:else}
			<Genitori {catalogo} />
		{/if}
	</div>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	h2 {
		padding-block-end: var(--spazio-2);
		border-bottom: 1px solid var(--colore-bordo);
	}
	.nota {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
	}
	.comandi {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
		align-items: center;
	}
	.campo {
		display: inline-flex;
		gap: var(--spazio-3);
		align-items: center;
		min-height: var(--target);
		padding-inline: var(--spazio-4);
		border: 1px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-m);
		background: var(--colore-superficie);
	}
	select {
		min-height: 2.5rem;
		padding-inline: var(--spazio-2);
		border: 1px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-s);
		background: var(--colore-superficie);
	}
	.campo input {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--colore-accento);
	}
	.cornice {
		padding: var(--spazio-5) var(--spazio-4);
		border: 2px dashed var(--colore-bordo);
		border-radius: var(--raggio-l);
	}
	@media (min-width: 40rem) {
		.cornice {
			padding: var(--spazio-6);
		}
	}
</style>
