<script lang="ts">
	import { browser } from '$app/env';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { dettagliErrori } from '#lib/core/errori.ts';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Button from '#lib/core/ui/Button.svelte';

	const nonTrovata = $derived(page.status === 404);
	const titolo = $derived(nonTrovata ? m.errore_404_titolo() : m.errore_titolo());
	// handleError ha già registrato l'errore quando questa pagina si mostra
	const dettagli = $derived(browser && !nonTrovata ? dettagliErrori() : '');
	let copia: 'fatta' | 'fallita' | undefined = $state();

	async function copiaDettagli() {
		try {
			await navigator.clipboard.writeText(dettagli);
			copia = 'fatta';
		} catch {
			copia = 'fallita';
		}
	}
</script>

<svelte:head>
	<title>{titolo} – {m.app_nome()}</title>
</svelte:head>

<section class="errore">
	<h1>{titolo}</h1>
	<p class="testo">{nonTrovata ? m.errore_404_testo() : m.errore_testo()}</p>
	<div class="azioni">
		<Button dimensione="l" href={resolve('/')}>{m.errore_home()}</Button>
		{#if !nonTrovata}
			<Button variante="secondaria" icona="copia" onclick={copiaDettagli}>{m.errore_copia()}</Button
			>
		{/if}
	</div>
	{#if !nonTrovata}
		<Avviso
			tono={copia === 'fallita' ? 'attenzione' : 'successo'}
			testo={copia === 'fatta'
				? m.errore_copiati()
				: copia === 'fallita'
					? m.errore_non_copiati()
					: ''}
		/>
		<details open={copia === 'fallita'}>
			<summary>{m.errore_mostra()}</summary>
			<pre>{dettagli}</pre>
		</details>
	{/if}
</section>

<style>
	.errore {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
		max-width: var(--larghezza-testo);
		padding-block: var(--spazio-7);
	}
	.testo {
		font-size: var(--testo-l);
		color: var(--colore-testo-tenue);
	}
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
	summary {
		padding-block: var(--spazio-3);
		cursor: pointer;
		color: var(--colore-accento);
		font-size: var(--testo-s);
	}
	pre {
		max-height: 16rem;
		overflow: auto;
		padding: var(--spazio-4);
		border-radius: var(--raggio-m);
		background: var(--colore-superficie-tenue);
		font-size: var(--testo-xs);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
