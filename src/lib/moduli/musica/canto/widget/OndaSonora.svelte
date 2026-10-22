<script lang="ts">
	// "Acuto e grave": l'onda del suono che viaggia. Grave = onde larghe e lente, acuto = strette e
	// fitte; l'ultimo passo le mette una sopra l'altra. Tutte viaggiano alla stessa velocità, come nell'aria:
	// l'onda fitta passa più volte al secondo. In pausa l'onda si ferma; con riduci-movimento è ferma.
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';

	let {
		passo = 3,
		inRiproduzione = false,
		riduciMovimento = true
	}: Partial<StatoDisegno> = $props();

	const id = $props.id();
	const W = 320;
	const VELOCITA = 80; // unità del disegno al secondo
	type Onda = { lunghezza: number; y: number; colore: string; spessore: number };
	const MEDIA: Onda = { lunghezza: 80, y: 70, colore: 'var(--colore-accento)', spessore: 4 };
	const GRAVE: Onda = { lunghezza: 160, y: 70, colore: 'var(--nota-do)', spessore: 6 };
	const ACUTA: Onda = { lunghezza: 28, y: 70, colore: 'var(--nota-si)', spessore: 3 };
	const PASSI: Onda[][] = [
		[MEDIA],
		[GRAVE],
		[ACUTA],
		[
			{ ...GRAVE, y: 38 },
			{ ...ACUTA, y: 104 }
		]
	];
	const onde = $derived(PASSI[Math.min(Math.max(0, passo), PASSI.length - 1)]);

	/** una sinusoide da −λ a W + λ, a punti: scorrendo di λ torna identica */
	function sinusoide({ lunghezza, y }: Onda, ampiezza = 22) {
		const punti: string[] = [];
		for (let x = -lunghezza; x <= W + lunghezza; x += 2) {
			punti.push(`${x},${(y + ampiezza * Math.sin((2 * Math.PI * x) / lunghezza)).toFixed(1)}`);
		}
		return `M${punti.join(' L')}`;
	}
</script>

<svg
	class={['onda', { ferma: riduciMovimento, in_moto: inRiproduzione && !riduciMovimento }]}
	viewBox="0 0 {W} 140"
	aria-hidden="true"
>
	<!-- la sorgente a sinistra: un altoparlante stilizzato -->
	<path class="sorgente" d="M4 58 h10 l12 -12 v48 l-12 -12 h-10 z" />
	<clipPath id="{id}-campo"><rect x="34" y="0" width={W - 34} height="140" /></clipPath>
	<g clip-path="url(#{id}-campo)">
		{#each onde as o (o.lunghezza + '-' + o.y)}
			<path
				class="linea"
				d={sinusoide(o)}
				stroke={o.colore}
				stroke-width={o.spessore}
				style:--l={o.lunghezza}
				style:--durata="{o.lunghezza / VELOCITA}s"
			/>
		{/each}
	</g>
</svg>

<style>
	.onda {
		width: min(100%, 28rem);
		height: auto;
	}
	.sorgente {
		fill: var(--colore-testo-tenue);
	}
	.linea {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		animation: scorre var(--durata) linear infinite paused;
	}
	.in_moto .linea {
		animation-play-state: running;
	}
	.ferma .linea {
		animation: none;
	}
	@keyframes scorre {
		to {
			transform: translateX(calc(var(--l) * 1px));
		}
	}
</style>
