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
		<ProblemaNoto id="ios-microfono" />
	</div>
</div>

<style>
	.microfono {
		display: flex;
		gap: var(--spazio-4);
		align-items: flex-start;
		padding: var(--spazio-4) var(--spazio-5);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie-tenue);
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
