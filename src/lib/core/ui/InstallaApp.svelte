<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import Avviso from './Avviso.svelte';
	import Button from './Button.svelte';

	// evento non standard (Chromium): non è nei tipi del DOM
	type PromptInstallazione = Event & { prompt(): Promise<unknown> };

	let invito: PromptInstallazione | undefined = $state();
	let installata = $state(false);
	let ios = $state(false);

	onMount(() => {
		installata =
			matchMedia('(display-mode: standalone)').matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true;
		// iPadOS si presenta come Mac con il touch
		ios =
			/iPhone|iPad|iPod/.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

		const prima = (e: Event) => {
			e.preventDefault();
			invito = e as PromptInstallazione;
		};
		const dopo = () => {
			installata = true;
			invito = undefined;
		};
		addEventListener('beforeinstallprompt', prima);
		addEventListener('appinstalled', dopo);
		return () => {
			removeEventListener('beforeinstallprompt', prima);
			removeEventListener('appinstalled', dopo);
		};
	});

	async function installa() {
		const i = invito;
		invito = undefined; // il prompt si può usare una volta sola
		await i?.prompt();
	}
</script>

<section class="installa" aria-labelledby="installa-titolo">
	<h2 id="installa-titolo">{m.pwa_titolo()}</h2>
	<p>{m.pwa_perche()}</p>
	{#if installata}
		<Avviso tono="successo" testo={m.pwa_gia_installata()} />
	{:else if invito}
		<Button onclick={installa}>{m.pwa_installa()}</Button>
	{:else if ios}
		<Avviso tono="info" testo={m.pwa_ios()} />
	{/if}
</section>

<style>
	.installa {
		display: grid;
		gap: var(--spazio-3);
		justify-items: start;
	}
	h2 {
		margin: 0;
		font-size: var(--testo-xl);
	}
	p {
		margin: 0;
		max-width: var(--larghezza-testo);
	}
</style>
