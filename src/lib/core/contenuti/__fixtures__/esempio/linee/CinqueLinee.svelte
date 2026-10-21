<script lang="ts">
	// Esempio di disegno per il widget `animazione` (contratto StatoDisegno di PlayerPassi):
	// le linee del pentagramma compaiono una alla volta, disegnate con la Web Animations API.
	// Senza props (come illustrazione di `spiegazione`) mostra il fotogramma finale: tutte e cinque.
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';

	let {
		passo: passoDato,
		inRiproduzione = false,
		riduciMovimento = true
	}: Partial<StatoDisegno> = $props();

	const Y = [104, 84, 64, 44, 24]; // dal basso verso l'alto
	// senza passo è un'illustrazione: tutte le linee, nessuna evidenziata
	const passo = $derived(passoDato ?? Y.length - 1);
	const linee: SVGLineElement[] = $state([]);
	let anim: Animation | undefined;
	let animato = -1;

	$effect(() => {
		const p = passo;
		if (anim && animato !== p) {
			anim.cancel(); // cambio di passo: si salta al fotogramma finale
			anim = undefined;
		}
		if (riduciMovimento) return anim?.finish();
		if (!inRiproduzione) return anim?.pause();
		if (anim) return anim.play();
		if (animato === p) return; // già animato: resta il fotogramma finale
		animato = p;
		anim = linee[p]?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
			duration: 900,
			easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)'
		});
		if (anim) anim.onfinish = () => (anim = undefined);
	});
</script>

<svg class="pentagramma" viewBox="0 0 320 128" aria-hidden="true">
	{#each Y as y, i (i)}
		{#if i <= passo}
			<text x="8" y={y + 5}>{i + 1}</text>
			<line
				bind:this={linee[i]}
				class={{ corrente: i === passoDato }}
				x1="32"
				x2="308"
				y1={y}
				y2={y}
				pathLength="1"
				stroke-dasharray="1"
			/>
		{:else}
			<line class="guida" x1="32" x2="308" y1={y} y2={y} />
		{/if}
	{/each}
</svg>

<style>
	.pentagramma {
		width: min(100%, 26rem);
		height: auto;
	}
	line {
		stroke: var(--colore-testo);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.corrente {
		stroke: var(--colore-accento);
		stroke-width: 4;
	}
	.guida {
		stroke: var(--colore-bordo);
		stroke-width: 2;
		stroke-dasharray: 4 8;
	}
	text {
		fill: var(--colore-testo-tenue);
		font-size: 14px;
		font-weight: var(--peso-medio);
	}
</style>
