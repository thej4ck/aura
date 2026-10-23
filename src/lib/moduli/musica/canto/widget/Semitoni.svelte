<script lang="ts">
	// "Semitono e tono" su un'ottava di tastiera (Do4-Do5): il tasto nero tra Do e Re, il semitono
	// (al tasto vicino), il tono (due semitoni), e i semitoni Mi-Fa e Si-Do senza tasto nero in mezzo.
	// I tasti del passo hanno un pallino (non solo il colore) e suonano uno dopo l'altro: il pallino del
	// tasto che suona cresce, e ogni arco si disegna mentre si va da una nota alla successiva, guidato dal
	// suono. Con il movimento ridotto gli archi sono già disegnati.
	import { nomeNota } from '#lib/core/musica/note.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import { suonoDisegno } from '#lib/core/widget/suono.svelte.ts';

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
	/** l'altezza di un tasto: i neri si chiamano con il diesis del bianco prima */
	const altezza = (t: Tasto) => {
		const bianco = BIANCHI[Number(t.slice(1))];
		return t[0] === 'b' ? bianco : `${bianco[0]}#${bianco.slice(1)}`;
	};
	/** un arco va dalla nota `da` alla nota `a` di `suona` (indici) */
	type Arco = { da: number; a: number; alto?: boolean };
	const PASSI: { tasti: Tasto[]; suona: Tasto[]; archi: Arco[] }[] = [
		{ tasti: ['b0', 'n0', 'b1'], suona: ['b0', 'n0', 'b1'], archi: [] },
		{ tasti: ['b0', 'n0'], suona: ['b0', 'n0'], archi: [{ da: 0, a: 1 }] },
		{
			// i due semitoni, poi il tono: Do, Do♯, Re, e di nuovo Do, Re
			tasti: ['b0', 'n0', 'b1'],
			suona: ['b0', 'n0', 'b1', 'b0', 'b1'],
			archi: [
				{ da: 0, a: 1 },
				{ da: 1, a: 2 },
				{ da: 3, a: 4, alto: true }
			]
		},
		{ tasti: ['b2', 'b3'], suona: ['b2', 'b3'], archi: [{ da: 0, a: 1 }] },
		{ tasti: ['b6', 'b7'], suona: ['b6', 'b7'], archi: [{ da: 0, a: 1 }] }
	];
	const indice = $derived(Math.min(Math.max(0, passo), PASSI.length - 1));
	const corrente = $derived(PASSI[indice]);
	const nomi = $derived(progressi.doc?.preferenze.nomiNote ?? 'solfeggio');
	const d = ({ da, a, alto }: Arco) => {
		const [x1, x2] = [centro(corrente.suona[da]), centro(corrente.suona[a])];
		return `M${x1} ${ALTO - 4} Q${(x1 + x2) / 2} ${alto ? -14 : 18} ${x2} ${ALTO - 4}`;
	};

	const suono = suonoDisegno(
		() => ({ passo: indice, inRiproduzione }),
		(p) => PASSI[p].suona.map(altezza),
		0.55
	);
	/** il tasto che suona */
	const suona = $derived(suono.nota === null ? undefined : corrente.suona[suono.nota]);
	/** quanto è disegnato un arco (0-1): sul clock audio, dalla nota `da` alla nota `a`; in silenzio tutto */
	function disegnato({ da, a }: Arco) {
		const { tempo, ritmo } = suono;
		if (tempo === null || riduciMovimento) return 1;
		return Math.min(1, Math.max(0, (tempo - da * ritmo) / ((a - da) * ritmo)));
	}
</script>

<svg
	class="tastiera"
	viewBox="0 0 {X0 * 2 + BIANCHI.length * LB} {ALTO + HB + 24}"
	aria-hidden="true"
>
	{#each BIANCHI as altezza, i (altezza)}
		{@const acceso = corrente.tasti.includes(`b${i}`)}
		<rect
			class={['bianco', { acceso }]}
			data-suona={suona === `b${i}` ? suono.midi : undefined}
			x={X0 + i * LB}
			y={ALTO}
			width={LB}
			height={HB}
			rx="3"
		/>
		{#if acceso}<circle
				class="pallino"
				cx={X0 + i * LB + LB / 2}
				cy={ALTO + HB - 16}
				r={suona === `b${i}` ? 9 : 6}
			/>{/if}
		<text x={X0 + i * LB + LB / 2} y={ALTO + HB + 17}>{nomeNota(altezza, nomi)}</text>
	{/each}
	{#each NERI as i (i)}
		{@const acceso = corrente.tasti.includes(`n${i}`)}
		<rect
			class={['nero', { acceso }]}
			data-suona={suona === `n${i}` ? suono.midi : undefined}
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
				r={suona === `n${i}` ? 8 : 5}
			/>{/if}
	{/each}
	{#each corrente.archi as arco, i (passo + '-' + i)}
		<path
			class={['arco', { tono: arco.alto }]}
			d={d(arco)}
			pathLength="1"
			stroke-dasharray="1"
			stroke-dashoffset={1 - disegnato(arco)}
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
	/* il tasto che suona: il pallino cresce e il bianco ha il bordo spesso (non solo il colore) */
	.bianco[data-suona] {
		stroke: var(--colore-accento-forte);
		stroke-width: 5;
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
