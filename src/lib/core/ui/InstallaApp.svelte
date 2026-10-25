<script lang="ts">
	// Il perché e il come dell'installazione, senza titolo: lo mette la pagina che lo contiene.
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { dispositivo, type Dispositivo } from '../piattaforma.ts';
	import { installazione } from '../pwa/installazione.svelte.ts';
	import Avviso from './Avviso.svelte';
	import Button from './Button.svelte';

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
	{:else if installazione.invito}
		<Button onclick={installa}>{m.pwa_installa()}</Button>
	{:else if d?.sistema === 'iOS'}
		<Avviso tono="info" testo={m.pwa_ios()} />
	{:else}
		<p>{m.pwa_altri()}</p>
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
