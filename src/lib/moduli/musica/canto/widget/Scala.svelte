<script lang="ts" module>
	/** Un passo della scala disegnata: i gradini toccati dalla voce, in ordine, e quelli scavalcati. */
	export type PassoScala = { percorso: readonly number[]; scavalca?: readonly number[] };
</script>

<script lang="ts">
	// La scala di Do come gradini con i colori delle note, e una pallina (la voce) che salta di gradino
	// in gradino: è il disegno comune di "gradini", "gradi-congiunti" e "salti" (StatoDisegno di
	// PlayerPassi). Si sentono proprio le note dei gradini toccati, e il suono guida la pallina: atterra su
	// un gradino quando parte la sua nota, che intanto si evidenzia. Con il movimento ridotto la pallina
	// salta da un gradino all'altro senza volare. Il percorso resta tratteggiato anche da fermo, così il
	// fotogramma statico dice tutto.
	import { LETTERE, nomeNota } from '#lib/core/musica/note.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import { suonoDisegno } from '#lib/core/widget/suono.svelte.ts';

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
	const SALTO = 28; // il punto di controllo dell'arco, sopra il gradino più alto del salto
	const DURATA_S = 0.5; // una nota: con la pausa, un salto ogni 0,65 s

	const passo = $derived(Math.min(passoDato ?? passi.length - 1, passi.length - 1));
	const corrente = $derived(passi[passo]);
	/** il disegno comincia appena sopra il salto più alto possibile: niente spazio vuoto con pochi gradini */
	const cima = $derived(Math.max(0, BASE - gradini * H - 10 - SALTO - 12));
	const nomi = $derived(progressi.doc?.preferenze.nomiNote ?? 'solfeggio');
	/** il gradino i della scala di Do che parte dal Do4 */
	const altezza = (i: number) => `${LETTERE[i % 7]}${4 + Math.floor(i / 7)}`;
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

	const suono = suonoDisegno(
		() => ({ passo, inRiproduzione }),
		(p) => passi[p].percorso.map(altezza),
		DURATA_S
	);
	/** il gradino della nota che suona */
	const suona = $derived(
		suono.nota === null ? undefined : tappe[Math.min(suono.nota, tappe.length - 1)]
	);
	/**
	 * La pallina sul clock audio: il salto k va dal gradino della nota k a quello della nota k + 1 lungo la
	 * traccia (un arco di Bézier quadratica), e atterra quando parte la nota. Una tappa sola: un saltello.
	 */
	const pallina = $derived.by(() => {
		const { tempo, ritmo } = suono;
		if (suona === undefined || tempo === null) return fine;
		if (riduciMovimento) return punto(suona);
		const k = Math.floor(tempo / ritmo);
		if (k >= Math.max(1, tappe.length - 1)) return fine;
		const [a, b] = [tappe[k], tappe[Math.min(k + 1, tappe.length - 1)]];
		const [p0, c, p1] = [punto(a), picco(a, b), punto(b)];
		const s = tempo / ritmo - k;
		const arco = (u: 'x' | 'y') => (1 - s) ** 2 * p0[u] + 2 * (1 - s) * s * c[u] + s ** 2 * p1[u];
		return { x: arco('x'), y: arco('y') };
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
			data-suona={i === suona ? suono.midi : undefined}
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
	<circle class="palla" r="8" style:transform={sposta(pallina)} />
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
	/* il gradino che suona: il bordo si ingrossa */
	.gradino[data-suona] {
		opacity: 1;
		stroke-width: 5;
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
