<script lang="ts" module>
	/** Un fotogramma: le note sul rigo dopo quel passo, quali evidenziare, quali suonare, i tasti. */
	export type Fotogramma = {
		note: string[];
		/** indici in `note`; di default nessuno */
		evidenzia?: number[];
		/** indici in `note` da suonare entrando nel passo; di default quelli evidenziati */
		suona?: number[];
		/** midi dei tasti da evidenziare sulla tastiera */
		tasti?: number[];
	};
</script>

<script lang="ts">
	// Base dei disegni animati fatti con lo Staff (e la Keyboard) del core: un fotogramma per passo.
	// Entrando in un passo (in riproduzione o con i pulsanti dei passi) suona le sue note, evidenziate sul
	// rigo mentre suonano: ogni nota che suona si vede. All'apertura non suona niente.
	import type { Riproduzione } from '#lib/core/audio/synth.ts';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import Keyboard from '#lib/core/ui/Keyboard.svelte';
	import Staff from '#lib/core/ui/Staff.svelte';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import { suonaSeguendo } from '#lib/core/widget/musica.ts';
	import { ingresso } from './ingresso.svelte.ts';

	type Props = Partial<StatoDisegno> & {
		fotogrammi: readonly Fotogramma[];
		/** nome accessibile del rigo (il disegno intero è già un'immagine con il testo del passo) */
		etichetta: string;
		etichette?: boolean;
		colori?: boolean;
		/** [da, a] in midi: mostra anche la tastiera */
		tastiera?: readonly [number, number];
	};

	let {
		fotogrammi,
		etichetta,
		etichette = false,
		colori = false,
		tastiera,
		...stato
	}: Props = $props();

	// senza passo (illustrazione di `spiegazione`) si vede l'ultimo fotogramma
	const passo = $derived(Math.min(stato.passo ?? fotogrammi.length - 1, fotogrammi.length - 1));
	const f = $derived(fotogrammi[passo]);
	const anima = ingresso(() => stato);
	const nomiNote = $derived(progressi.doc?.preferenze.nomiNote ?? 'solfeggio');

	let suono: Riproduzione | undefined;
	let suonaOra = $state<number | null>(null);
	let ultimo: number | undefined;
	let suonava = false;

	$effect(() => {
		const p = passo;
		const inRiproduzione = !!stato.inRiproduzione;
		const entra = ultimo !== undefined && p !== ultimo;
		const parte = inRiproduzione && !suonava;
		ultimo = p;
		suonava = inRiproduzione;
		if (!entra && !parte) return;
		const fot = fotogrammi[p];
		const indici = fot.suona ?? fot.evidenzia ?? [];
		suono?.ferma();
		suono = indici.length
			? suonaSeguendo(
					indici.map((i) => fot.note[i]),
					0.7,
					(i) => (suonaOra = i === null ? null : indici[i])
				)
			: undefined;
	});
	$effect(() => () => suono?.ferma());

	const evidenzia = $derived(suonaOra === null ? (f.evidenzia ?? []) : [suonaOra]);
	const tasti = $derived(f.tasti ?? []);
</script>

<div class={['disegno', { fermo: !stato.inRiproduzione }]}>
	{#key passo}
		<div class={['fotogramma', { entra: anima.passo === passo }]}>
			<Staff
				rigo={{ chiave: 'violino', note: f.note.map((altezza) => ({ altezza })) }}
				{etichetta}
				{evidenzia}
				{etichette}
				{colori}
				{nomiNote}
			/>
			{#if tastiera}
				<div class="tastiera">
					<Keyboard da={tastiera[0]} a={tastiera[1]} evidenzia={tasti} {nomiNote} />
				</div>
			{/if}
		</div>
	{/key}
</div>

<style>
	.disegno {
		width: 100%;
	}
	.fotogramma {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	.entra {
		animation: entra var(--durata-lunga) var(--easing-uscita) both;
	}
	.fermo .entra {
		animation-play-state: paused;
	}
	@keyframes entra {
		from {
			opacity: 0.2;
			transform: translateY(0.75rem);
		}
	}
	.tastiera {
		max-width: 28rem;
		margin-inline: auto;
		width: 100%;
	}
</style>
