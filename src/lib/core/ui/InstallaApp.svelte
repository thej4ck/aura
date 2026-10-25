<script lang="ts">
	// Il perché e il come dell'installazione, senza titolo: lo mette la pagina che lo contiene. Su iPhone, iPad
	// e Safari per Mac anche i problemi noti dei dati: cancellati dopo 7 giorni, separati da quelli dell'app.
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { dispositivo, type Dispositivo } from '../piattaforma.ts';
	import { installazione } from '../pwa/installazione.svelte.ts';
	import Avviso from './Avviso.svelte';
	import Button from './Button.svelte';
	import ProblemaNoto from './ProblemaNoto.svelte';

	let d = $state.raw<Dispositivo>();
	onMount(() => (d = dispositivo()));

	const installata = $derived(!!d?.app || installazione.installata);

	async function installa() {
		const i = installazione.invito;
		installazione.invito = undefined; // il prompt si può usare una volta sola
		await i?.prompt();
	}
</script>

<div class="installa">
	<p>{m.pwa_perche()}</p>
	{#if installata}
		<Avviso tono="successo" testo={m.pwa_gia_installata()} />
	{:else}
		<ProblemaNoto id="safari-dati-7-giorni" />
		<!-- prima delle istruzioni: il backup si scarica prima di installare -->
		<ProblemaNoto id="app-dati-separati" />
		{#if installazione.invito}
			<Button onclick={installa}>{m.pwa_installa()}</Button>
		{:else if d?.sistema === 'iOS'}
			<Avviso tono="info" testo={m.pwa_ios()} />
		{:else if d?.apple && (d.versione ?? 0) >= 17}
			<!-- Aggiungi al Dock: Safari 17 su macOS Sonoma o successivo (la versione di macOS non si legge) -->
			<p>{m.pwa_mac()}</p>
		{:else}
			<p>{m.pwa_altri()}</p>
		{/if}
	{/if}
</div>

<style>
	.installa {
		display: grid;
		gap: var(--spazio-3);
		justify-items: start;
	}
	p {
		margin: 0;
		max-width: var(--larghezza-testo);
	}
</style>
