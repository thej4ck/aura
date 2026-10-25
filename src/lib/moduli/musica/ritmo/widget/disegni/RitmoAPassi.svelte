<script lang="ts" module>
	import type { Ritmo } from '../../ritmi.ts';

	/**
	 * Un fotogramma: il ritmo del passo; con `rigo: false` si vedono solo i battiti, senza le note; con
	 * `senzaSillabe` le note senza le sillabe (un rigo di due battute sta così su un telefono).
	 */
	export type Fotogramma = Ritmo & { rigo?: boolean; senzaSillabe?: boolean };
</script>

<script lang="ts">
	// Base dei disegni del Ritmo (StatoDisegno di PlayerPassi): per ogni passo il rigo ritmico con le
	// sillabe e, sotto, il battito: un cerchio numerato per battito, il primo di ogni battuta più grande
	// quando c'è il tempo in chiave. Entrando nel passo il ritmo suona col legnetto (suonoDisegno) e il
	// disegno segue l'audio: la nota che suona ha l'anello sul rigo e il battito che passa si accende, anche
	// nella pausa, che tace ma conta. Col movimento ridotto cambia solo lo stato (pieno e grassetto).
	import { BPM_RITMO } from '#lib/core/audio/costanti.ts';
	import { battitiPerBattuta, lunghezza } from '#lib/core/musica/ritmo.ts';
	import type { StatoDisegno } from '#lib/core/ui/PlayerPassi.svelte';
	import Staff from '#lib/core/ui/Staff.svelte';
	import { suonoDisegno } from '#lib/core/widget/suono.svelte.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { rigoDi } from '../../ritmi.ts';

	type Props = Partial<StatoDisegno> & { passi: readonly Fotogramma[] };

	let { passi, ...stato }: Props = $props();

	const righi = $derived(passi.map(rigoDi));
	// senza passo (illustrazione di `spiegazione`) si vede l'ultimo fotogramma
	const passo = $derived(Math.min(stato.passo ?? passi.length - 1, passi.length - 1));
	const rigo = $derived(righi[passo]);
	const totale = $derived(lunghezza(rigo.note));
	const perBattuta = $derived(rigo.tempo ? battitiPerBattuta(rigo.tempo) : 4);

	const suono = suonoDisegno(
		() => ({ passo, inRiproduzione: stato.inRiproduzione }),
		(p) => righi[p],
		60 / BPM_RITMO
	);
	/** il battito che passa, sul clock audio (anche in una pausa); null in silenzio */
	const battito = $derived(
		suono.tempo === null ? null : Math.min(totale - 1, Math.floor(suono.tempo / suono.ritmo))
	);
</script>

<div class={['disegno', { fermo: stato.riduciMovimento !== false }]} data-suona={suono.midi}>
	{#if passi[passo].rigo !== false}
		<Staff
			{rigo}
			etichetta={m.ritmo_disegno_rigo()}
			sillabe={!passi[passo].senzaSillabe}
			evidenzia={suono.nota === null ? [] : [suono.nota]}
		/>
	{/if}
	<ol class="battiti">
		{#each { length: totale }, b (b)}
			<li
				class={{
					acceso: b === battito,
					primo: !!rigo.tempo && b % perBattuta === 0,
					battuta: b > 0 && b % perBattuta === 0
				}}
			>
				{(b % perBattuta) + 1}
			</li>
		{/each}
	</ol>
</div>

<style>
	.disegno {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
		width: 100%;
	}
	.battiti {
		display: flex;
		gap: var(--spazio-1);
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* due battute di 4/4 stanno su un telefono: i cerchi si stringono, sempre tondi */
	.battiti li {
		display: grid;
		flex: 0 1 2rem;
		place-items: center;
		min-width: 0;
		aspect-ratio: 1;
		border: 2px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-pieno);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
		font-variant-numeric: tabular-nums;
		transition: transform var(--durata-breve) var(--easing);
	}
	/* una battuta nuova: un po' di spazio prima, come la stanghetta */
	.battiti .battuta {
		margin-inline-start: var(--spazio-3);
	}
	/* il primo battito della battuta, l'accento: più grande */
	.battiti .primo {
		flex-basis: 2.75rem;
	}
	/* il battito che passa: pieno, in grassetto e (col movimento) un po' più grande, non solo il colore */
	.battiti .acceso {
		border-color: var(--colore-accento);
		background: var(--colore-accento);
		color: var(--colore-su-accento);
		font-weight: var(--peso-forte);
		transform: scale(1.15);
	}
	.fermo .battiti .acceso {
		transform: none;
	}
</style>
