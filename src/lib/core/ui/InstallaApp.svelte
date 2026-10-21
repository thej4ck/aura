<script lang="ts">
	// Il perché e il come dell'installazione, senza titolo: lo mette la pagina che lo contiene.
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { installazione } from '../pwa/installazione.svelte.ts';
	import Avviso from './Avviso.svelte';
	import Button from './Button.svelte';

	let standalone = $state(false);
	let ios = $state(false);

	onMount(() => {
		standalone =
			matchMedia('(display-mode: standalone)').matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true;
		// iPadOS si presenta come Mac con il touch
		ios =
			/iPhone|iPad|iPod/.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	});

	const installata = $derived(standalone || installazione.installata);

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
	{:else if ios}
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
