<script lang="ts">
	// Vetrina del Ritmo: il legnetto e i clic (un ritmo con una battuta d'attacco) e i battiti di mani dal
	// microfono, contati. Per provarli dal vero su telefoni e tablet: i test sintetici non sentono un
	// microfono che salta o un altoparlante muto.
	import { apriBattiMani, type BattiMani } from '#lib/core/audio/battimani.ts';
	import { BPM_RITMO } from '#lib/core/audio/costanti.ts';
	import { sblocca } from '#lib/core/audio/contesto.ts';
	import { ErroreMic } from '#lib/core/audio/mic.ts';
	import { suonaColpi } from '#lib/core/audio/percussioni.ts';
	import type { Riproduzione } from '#lib/core/audio/synth.ts';
	import { colpi, eventiRitmo, rigoRitmico } from '#lib/core/musica/ritmo.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Button from '#lib/core/ui/Button.svelte';
	import { ERRORI_MIC } from '#lib/core/widget/musica.ts';
	import { m } from '#lib/paraglide/messages.js';

	const RITMO = colpi(eventiRitmo(rigoRitmico('ta ti-ti ta-a', '4/4'), BPM_RITMO, 1), {
		metronomo: 'attacco'
	});
	const ms = new Intl.NumberFormat('it', { maximumFractionDigits: 0 });

	let riproduzione = $state.raw<Riproduzione>();
	let mani = $state.raw<BattiMani>();
	let apertura = false;
	let vivo = true;
	/** i tempi (s, clock audio) dei battiti sentiti, e la forza dell'ultimo */
	let tempi = $state<number[]>([]);
	let forza = $state(0);
	let errore = $state('');

	function ritmo() {
		if (riproduzione) return riproduzione.ferma();
		void sblocca(); // nel gesto, prima di tutto (iOS)
		const r = suonaColpi(RITMO);
		riproduzione = r;
		void r.fine.then(() => {
			if (riproduzione === r) riproduzione = undefined;
		});
	}

	async function ascolta() {
		if (mani) {
			mani.chiudi();
			mani = undefined;
			return;
		}
		if (apertura) return;
		apertura = true;
		errore = '';
		tempi = [];
		void sblocca();
		try {
			const aperto = await apriBattiMani({
				onbattito: (b) => {
					tempi.push(b.t);
					forza = b.forza;
				},
				onchiuso: () => (mani = undefined),
				latenzaMs: progressi.doc?.preferenze.latenzaAudioMs
			});
			if (vivo) mani = aperto;
			else aperto.chiudi();
		} catch (e) {
			errore = e instanceof ErroreMic ? ERRORI_MIC[e.codice]() : m.audio_errore_non_supportato();
		} finally {
			apertura = false;
		}
	}

	$effect(() => () => {
		vivo = false;
		mani?.chiudi();
		riproduzione?.ferma();
	});

	/** gli intervalli tra gli ultimi battiti, in ms */
	const intervalli = $derived(
		tempi
			.slice(-9)
			.slice(1)
			.map((t, i) => ms.format((t - tempi.slice(-9)[i]) * 1000))
			.join(' · ')
	);
</script>

<section aria-labelledby="sez-mani">
	<h2 id="sez-mani">{m.mani_dev_titolo()}</h2>
	<p>{m.mani_dev_spiegazione()}</p>
	<div class="fila">
		<Button variante="secondaria" icona={riproduzione ? 'pausa' : 'play'} onclick={ritmo}>
			{riproduzione ? m.audio_dev_ferma() : m.mani_dev_ritmo()}
		</Button>
		<Button variante="secondaria" onclick={ascolta}>
			{mani ? m.audio_dev_chiudi_microfono() : m.mani_dev_ascolta()}
		</Button>
	</div>
	<Avviso tono="attenzione" testo={errore} />
	{#if mani}
		<dl>
			<dt>{m.mani_dev_battiti()}</dt>
			<dd data-testid="mani-conteggio">{tempi.length}</dd>
			<dt>{m.mani_dev_intervalli()}</dt>
			<dd data-testid="mani-intervalli">{intervalli}</dd>
			<dt>{m.mani_dev_forza()}</dt>
			<dd>{forza.toFixed(2)}</dd>
			<dt>{m.mani_dev_cattura()}</dt>
			<dd data-testid="mani-cattura">{mani.cattura}, {mani.sampleRate} Hz</dd>
		</dl>
		<!-- i tempi esatti per i test end-to-end -->
		<output hidden data-testid="mani-tempi">{JSON.stringify(tempi)}</output>
	{/if}
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
		max-width: var(--larghezza-testo);
	}
	h2 {
		padding-block-end: var(--spazio-2);
		border-bottom: 1px solid var(--colore-bordo);
	}
	.fila {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--spazio-1) var(--spazio-3);
	}
	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
</style>
