<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icona, { type NomeIcona } from './Icona.svelte';

	type Tono = 'info' | 'successo' | 'attenzione';
	type Props = {
		/** 'attenzione' è un suggerimento (lampadina), mai un rimprovero */
		tono?: Tono;
		testo?: string;
		children?: Snippet;
		/** role="alert" (interrompe il lettore di schermo): solo per problemi che bloccano */
		urgente?: boolean;
	};

	let { tono = 'info', testo, children, urgente = false }: Props = $props();

	const ICONE: Record<Tono, NomeIcona> = {
		info: 'info',
		successo: 'check',
		attenzione: 'lampadina'
	};
	const pieno = $derived(!!testo || !!children);
</script>

<!--
	La regione live resta sempre nel DOM: i lettori di schermo annunciano i cambi di contenuto,
	non le regioni appena create. Per un feedback si cambia `testo` (vuoto = nascosto).
-->
<div role={urgente ? 'alert' : 'status'} class={['avviso', tono, { vuoto: !pieno }]}>
	{#if pieno}
		<Icona nome={ICONE[tono]} dimensione="1.5rem" />
		<div class="corpo">
			{#if testo}<p>{testo}</p>{/if}
			{@render children?.()}
		</div>
	{/if}
</div>

<style>
	.avviso {
		display: flex;
		gap: var(--spazio-3);
		align-items: flex-start;
		padding: var(--spazio-4) var(--spazio-5);
		border-radius: var(--raggio-m);
		border-inline-start: 4px solid currentColor;
	}
	/* vuoto: niente spazio nel layout (nemmeno il gap del contenitore), ma la regione live resta nell'albero */
	.vuoto {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.corpo {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		color: var(--colore-testo);
		min-width: 0;
	}
	.info {
		background: var(--colore-info-tenue);
		color: var(--colore-info);
	}
	.successo {
		background: var(--colore-successo-tenue);
		color: var(--colore-successo);
	}
	.attenzione {
		background: var(--colore-attenzione-tenue);
		color: var(--colore-attenzione);
	}
</style>
