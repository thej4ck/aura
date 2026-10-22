<script lang="ts">
	// "Semitono e tono" su un'ottava di tastiera (Do4-Do5): il tasto nero tra Do e Re, il semitono
	// (al tasto vicino), il tono (due semitoni), e i semitoni Mi-Fa e Si-Do senza tasto nero in mezzo.
	// Gli archi si disegnano uno dopo l'altro; i tasti del passo hanno un pallino (non solo il colore).
	import { nomeNota } from '#lib/core/musica/note.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';

	let {
		passo = 4,
		inRiproduzione = false,
		riduciMovimento = true
	}: Partial<StatoDisegno> = $props();

	const X0 = 16;
	const LB = 36; // tasto bianco
	const LN = 22; // tasto nero
	const ALTO = 70; // dove comincia la tastiera (sopra ci sono gli archi)
	const HB = 110;
	const HN = 68;
	const BIANCHI = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
	/** i tasti neri: dopo quale bianco stanno */
	const NERI = [0, 1, 3, 4, 5];

	// un tasto è 'b<i>' (bianco i) oppure 'n<i>' (nero dopo il bianco i)
	type Tasto = `b${number}` | `n${number}`;
	const centro = (t: Tasto) =>
		t[0] === 'b' ? X0 + Number(t.slice(1)) * LB + LB / 2 : X0 + (Number(t.slice(1)) + 1) * LB;
	type Arco = { da: Tasto; a: Tasto; alto?: boolean };
	const PASSI: { tasti: Tasto[]; archi: Arco[] }[] = [
		{ tasti: ['b0', 'n0', 'b1'], archi: [] },
		{ tasti: ['b0', 'n0'], archi: [{ da: 'b0', a: 'n0' }] },
		{
			tasti: ['b0', 'n0', 'b1'],
			archi: [
				{ da: 'b0', a: 'n0' },
				{ da: 'n0', a: 'b1' },
				{ da: 'b0', a: 'b1', alto: true }
			]
		},
		{ tasti: ['b2', 'b3'], archi: [{ da: 'b2', a: 'b3' }] },
		{ tasti: ['b6', 'b7'], archi: [{ da: 'b6', a: 'b7' }] }
	];
	const corrente = $derived(PASSI[Math.min(Math.max(0, passo), PASSI.length - 1)]);
	const nomi = $derived(progressi.doc?.preferenze.nomiNote ?? 'solfeggio');
	const d = ({ da, a, alto }: Arco) => {
		const [x1, x2] = [centro(da), centro(a)];
		return `M${x1} ${ALTO - 4} Q${(x1 + x2) / 2} ${alto ? -14 : 18} ${x2} ${ALTO - 4}`;
	};

	const linee: SVGPathElement[] = $state([]);
	let animazioni: Animation[] = [];
	let animato = -1;

	$effect(() => {
		const p = passo;
		if (animazioni.length && animato !== p) {
			for (const a of animazioni) a.cancel(); // cambio di passo: si salta al fotogramma finale
			animazioni = [];
		}
		if (riduciMovimento) return animazioni.forEach((a) => a.finish());
		if (!inRiproduzione) return animazioni.forEach((a) => a.pause());
		if (animazioni.length) return animazioni.forEach((a) => a.play());
		if (animato === p) return;
		animato = p;
		animazioni = linee
			.slice(0, corrente.archi.length)
			.filter(Boolean)
			.map((l, i) =>
				l.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
					duration: 700,
					delay: i * 700,
					fill: 'backwards',
					easing: 'ease-out'
				})
			);
		const ultima = animazioni.at(-1);
		if (ultima) ultima.onfinish = () => (animazioni = []);
	});
</script>

<svg
	class="tastiera"
	viewBox="0 0 {X0 * 2 + BIANCHI.length * LB} {ALTO + HB + 24}"
	aria-hidden="true"
>
	{#each BIANCHI as altezza, i (altezza)}
		{@const acceso = corrente.tasti.includes(`b${i}`)}
		<rect class={['bianco', { acceso }]} x={X0 + i * LB} y={ALTO} width={LB} height={HB} rx="3" />
		{#if acceso}<circle class="pallino" cx={X0 + i * LB + LB / 2} cy={ALTO + HB - 16} r="6" />{/if}
		<text x={X0 + i * LB + LB / 2} y={ALTO + HB + 17}>{nomeNota(altezza, nomi)}</text>
	{/each}
	{#each NERI as i (i)}
		{@const acceso = corrente.tasti.includes(`n${i}`)}
		<rect
			class={['nero', { acceso }]}
			x={X0 + (i + 1) * LB - LN / 2}
			y={ALTO}
			width={LN}
			height={HN}
			rx="2"
		/>
		{#if acceso}<circle
				class="pallino su-nero"
				cx={X0 + (i + 1) * LB}
				cy={ALTO + HN - 12}
				r="5"
			/>{/if}
	{/each}
	{#each corrente.archi as arco, i (passo + '-' + i)}
		<path
			bind:this={linee[i]}
			class={['arco', { tono: arco.alto }]}
			d={d(arco)}
			pathLength="1"
			stroke-dasharray="1"
		/>
	{/each}
</svg>

<style>
	.tastiera {
		width: min(100%, 26rem);
		height: auto;
	}
	.bianco {
		fill: var(--colore-superficie);
		stroke: var(--colore-testo);
		stroke-width: 2;
	}
	.nero {
		fill: var(--colore-testo);
	}
	.bianco.acceso {
		fill: var(--colore-accento-tenue);
	}
	.nero.acceso {
		fill: var(--colore-accento-forte);
	}
	.pallino {
		fill: var(--colore-accento-forte);
	}
	.pallino.su-nero {
		fill: var(--colore-superficie);
	}
	.arco {
		fill: none;
		stroke: var(--colore-accento-forte);
		stroke-width: 3;
		stroke-linecap: round;
	}
	/* il tono: più alto e più sottile, per distinguerlo dai due semitoni */
	.arco.tono {
		stroke: var(--colore-testo);
		stroke-width: 2;
	}
	text {
		fill: var(--colore-testo);
		font-size: 12px;
		font-weight: var(--peso-medio);
		text-anchor: middle;
	}
</style>
