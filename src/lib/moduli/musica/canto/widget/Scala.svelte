<script lang="ts" module>
	/** Un passo della scala disegnata: i gradini toccati dalla voce, in ordine, e quelli scavalcati. */
	export type PassoScala = { percorso: readonly number[]; scavalca?: readonly number[] };
</script>

<script lang="ts">
	// La scala di Do come gradini con i colori delle note, e una pallina (la voce) che salta di gradino
	// in gradino: è il disegno comune di "gradini", "gradi-congiunti" e "salti" (StatoDisegno di
	// PlayerPassi). Il percorso resta tratteggiato anche da fermo, così il fotogramma statico dice tutto.
	import { LETTERE, nomeNota } from '#lib/core/musica/note.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';

	type Props = Partial<StatoDisegno> & { gradini: number; passi: readonly PassoScala[] };

	let {
		passo: passoDato,
		inRiproduzione = false,
		riduciMovimento = true,
		gradini,
		passi
	}: Props = $props();

	const COLORE = { C: 'do', D: 're', E: 'mi', F: 'fa', G: 'sol', A: 'la', B: 'si' } as const;
	const L = 36; // larghezza di un gradino
	const H = 14; // alzata
	const X0 = 12;
	const BASE = 160;
	const SALTO = 28; // quanto sale la pallina sopra il gradino più alto del salto
	const MS_SALTO = 650;

	const passo = $derived(Math.min(passoDato ?? passi.length - 1, passi.length - 1));
	const corrente = $derived(passi[passo]);
	/** il disegno comincia appena sopra il salto più alto possibile: niente spazio vuoto con pochi gradini */
	const cima = $derived(Math.max(0, BASE - gradini * H - 10 - SALTO - 12));
	const nomi = $derived(progressi.doc?.preferenze.nomiNote ?? 'solfeggio');
	const scala = $derived(
		Array.from({ length: gradini }, (_, i) => {
			const lettera = LETTERE[i % 7];
			return {
				x: X0 + i * L,
				cima: BASE - (i + 1) * H,
				colore: `var(--nota-${COLORE[lettera]})`,
				nome: nomeNota(`${lettera}4`, nomi)
			};
		})
	);
	const punto = (i: number) => ({ x: X0 + i * L + L / 2, y: BASE - (i + 1) * H - 10 });
	const picco = (a: number, b: number) => ({
		x: (punto(a).x + punto(b).x) / 2,
		y: Math.min(punto(a).y, punto(b).y) - SALTO
	});
	const tappe = $derived(corrente.percorso);
	const traccia = $derived(
		tappe
			.slice(1)
			.map((b, k) => {
				const a = tappe[k];
				const p = picco(a, b);
				return `M${punto(a).x} ${punto(a).y} Q${p.x} ${p.y} ${punto(b).x} ${punto(b).y}`;
			})
			.join(' ')
	);
	const fine = $derived(punto(tappe.at(-1)!));
	const sposta = (p: { x: number; y: number }) => `translate(${p.x}px, ${p.y}px)`;

	let palla: SVGCircleElement | undefined = $state();
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
		if (animato === p || !palla) return;
		animato = p;
		const t = passi[p].percorso;
		// fermi sul primo gradino un attimo, poi un salto ad arco per ogni tappa
		const fotogrammi =
			t.length > 1
				? t.flatMap((b, k) =>
						k === 0
							? [{ transform: sposta(punto(b)) }]
							: [{ transform: sposta(picco(t[k - 1], b)) }, { transform: sposta(punto(b)) }]
					)
				: [
						{ transform: sposta(punto(t[0])) },
						{ transform: sposta(picco(t[0], t[0])) },
						{ transform: sposta(punto(t[0])) }
					];
		anim = palla.animate(fotogrammi, {
			duration: MS_SALTO * Math.max(1, t.length - 1),
			easing: 'ease-in-out'
		});
		anim.onfinish = () => (anim = undefined);
	});
</script>

<svg
	class="scala"
	style:--gradini={gradini}
	viewBox="0 {cima} {X0 * 2 + gradini * L} {BASE + 24 - cima}"
	aria-hidden="true"
>
	{#each scala as g, i (i)}
		<rect
			class={{
				gradino: true,
				toccato: tappe.includes(i),
				scavalcato: corrente.scavalca?.includes(i)
			}}
			x={g.x + 2}
			y={g.cima}
			width={L - 4}
			height={BASE - g.cima}
			rx="4"
			style:fill={g.colore}
		/>
		<text x={g.x + L / 2} y={BASE + 17}>{g.nome}</text>
	{/each}
	<path class="traccia" d={traccia} />
	<circle bind:this={palla} class="palla" r="8" style:transform={sposta(fine)} />
</svg>

<style>
	/* un gradino largo circa 3,75rem: con pochi gradini il disegno non diventa enorme */
	.scala {
		width: min(100%, calc(var(--gradini) * 3.75rem + 1.5rem));
		height: auto;
	}
	.gradino {
		opacity: 0.55;
		stroke: var(--colore-testo);
		stroke-width: 0;
	}
	/* i gradini della voce: pieni e bordati (non solo il colore) */
	.toccato {
		opacity: 1;
		stroke-width: 2.5;
	}
	/* scavalcato: tratteggiato */
	.scavalcato {
		opacity: 0.35;
		stroke-width: 2;
		stroke-dasharray: 4 3;
	}
	.traccia {
		fill: none;
		stroke: var(--colore-testo-tenue);
		stroke-width: 2;
		stroke-dasharray: 3 5;
		stroke-linecap: round;
	}
	.palla {
		fill: var(--colore-testo);
		stroke: var(--colore-superficie);
		stroke-width: 2;
	}
	text {
		fill: var(--colore-testo);
		font-size: 12px;
		font-weight: var(--peso-medio);
		text-anchor: middle;
	}
</style>
