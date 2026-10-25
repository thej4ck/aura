<script lang="ts">
	// Un problema noto della piattaforma, per l'adulto (problemi-noti.ts): compare solo sul dispositivo a cui
	// si applica. Si decide nel browser, al montaggio: nel prerender non c'è niente. Non è una regione live:
	// si legge arrivandoci, come il testo intorno.
	import { onMount } from 'svelte';
	import { problemaNoto, type IdProblema } from '../problemi-noti.ts';
	import Icona from './Icona.svelte';

	/** idTesto: l'id dell'avviso, per l'aria-describedby di un campo a cui si riferisce */
	let { id, idTesto }: { id: IdProblema; idTesto?: string } = $props();

	let montato = $state(false);
	onMount(() => {
		montato = true;
	});
	const testo = $derived(montato && problemaNoto(id));
</script>

{#if testo}
	<p class="problema-noto" id={idTesto} data-problema={id}>
		<span class="icona"><Icona nome="info" dimensione="1.25em" /></span>
		<span>{testo}</span>
	</p>
{/if}

<style>
	.problema-noto {
		display: flex;
		gap: var(--spazio-2);
		align-items: flex-start;
		max-width: var(--larghezza-testo);
		margin: 0;
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	/* l'icona è il segnale oltre al colore; il testo dice già di che piattaforma si tratta */
	.icona {
		display: flex;
		flex: none;
		color: var(--colore-info);
	}
</style>
