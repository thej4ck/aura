<script lang="ts">
	// Dopo circa 15 minuti di uso attivo, un invito calmo a fare una pausa: non blocca, non ha timer, si chiude.
	// Il conteggio vive in vista/pausa.ts; qui solo l'ora, la visibilità della scheda e il disegno.
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import {
		avanzaPausa,
		chiudiPausa,
		statoPausa,
		suggerisciPausa,
		type StatoPausa
	} from '../vista/pausa';
	import Button from './Button.svelte';
	import Icona from './Icona.svelte';

	const AGGIORNA_OGNI_MS = 30_000;

	let stato: StatoPausa | undefined = $state();
	const mostra = $derived(!!stato && suggerisciPausa(stato));

	onMount(() => {
		const visibile = () => document.visibilityState === 'visible';
		stato = statoPausa(Date.now(), visibile());
		const aggiorna = () => (stato = avanzaPausa(stato!, Date.now(), visibile()));
		const timer = setInterval(aggiorna, AGGIORNA_OGNI_MS);
		document.addEventListener('visibilitychange', aggiorna);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', aggiorna);
		};
	});
</script>

<!-- la regione resta nel DOM: il suggerimento si annuncia con garbo quando compare -->
<div class="pausa" role="status">
	{#if mostra}
		<div class="riquadro">
			<span class="icona"><Icona nome="germoglio" dimensione="1.75rem" /></span>
			<div class="testo">
				<p class="titolo">{m.pausa_titolo()}</p>
				<p>{m.pausa_testo()}</p>
			</div>
			<Button variante="secondaria" onclick={() => (stato = chiudiPausa(stato!))}>
				{m.pausa_chiudi()}
			</Button>
		</div>
	{/if}
</div>

<style>
	/* in basso, sopra la pagina, senza spostare niente: chi sta toccando un pulsante non lo perde */
	.pausa {
		position: fixed;
		inset-inline: var(--spazio-4);
		bottom: var(--spazio-4);
		z-index: 5;
		display: flex;
		justify-content: center;
		pointer-events: none;
	}
	.riquadro {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: var(--spazio-3) var(--spazio-4);
		align-items: start;
		width: min(40rem, 100%);
		padding: var(--spazio-4) var(--spazio-5);
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
		box-shadow: var(--ombra-2);
		pointer-events: auto;
		animation: compare var(--durata-lunga) var(--easing-uscita);
	}
	.icona {
		display: inline-flex;
		align-self: start;
		color: var(--colore-accento);
	}
	.testo {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-1);
	}
	/* su schermi stretti il pulsante va sotto il testo; su quelli larghi a destra */
	.riquadro :global(.pulsante) {
		grid-column: 2;
		justify-self: start;
	}
	@media (min-width: 40rem) {
		.riquadro {
			grid-template-columns: auto minmax(0, 1fr) auto;
			align-items: center;
		}
		.riquadro :global(.pulsante) {
			grid-column: auto;
		}
	}
	.titolo {
		font-weight: var(--peso-forte);
	}
	@keyframes compare {
		from {
			opacity: 0;
		}
	}
</style>
