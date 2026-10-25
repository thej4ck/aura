<script lang="ts">
	// La promessa sul microfono, prima di aprirlo: per il bambino in grande, per l'adulto sotto (canto, ritmo),
	// con i problemi noti del microfono su questo dispositivo.
	import Icona from './Icona.svelte';
	import ProblemaNoto from './ProblemaNoto.svelte';

	let { perTe, perAdulti }: { perTe: string; perAdulti: string } = $props();
</script>

<div class="microfono">
	<span class="icona-mic"><Icona nome="microfono" dimensione="1.75rem" /></span>
	<div class="spiega">
		<p class="per-te">{perTe}</p>
		<p class="per-adulti">{perAdulti}</p>
	</div>
	<ProblemaNoto id="ios-microfono" />
</div>

<style>
	.microfono {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--spazio-3) var(--spazio-4);
		align-items: start;
		padding: var(--spazio-4) var(--spazio-5);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie-tenue);
	}
	/* a tutta larghezza sotto la promessa: nella colonna del testo, su telefono, sarebbe lunghissimo */
	.microfono > :global(.problema-noto) {
		grid-column: 1 / -1;
	}
	.icona-mic {
		display: grid;
		place-items: center;
		flex: none;
		width: 3rem;
		height: 3rem;
		border-radius: var(--raggio-pieno);
		background: var(--colore-accento-tenue);
		color: var(--colore-accento-forte);
	}
	.spiega {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		max-width: var(--larghezza-testo);
	}
	.per-te {
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
		line-height: var(--interlinea-titoli);
	}
	.per-adulti {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
</style>
