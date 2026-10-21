<script lang="ts">
	// Vetrina dell'audio: il synth suona una scala, il microfono misura la voce sul La4.
	import { TOLLERANZE_CENTS } from '#lib/core/audio/costanti.ts';
	import { sblocca } from '#lib/core/audio/contesto.ts';
	import { ErroreMic, apriMicrofono, type FrameMic, type Microfono } from '#lib/core/audio/mic.ts';
	import { suona, type Riproduzione } from '#lib/core/audio/synth.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Button from '#lib/core/ui/Button.svelte';
	import PitchMeter from '#lib/core/ui/PitchMeter.svelte';
	import { ERRORI_MIC } from '#lib/core/widget/musica.ts';
	import { m } from '#lib/paraglide/messages.js';

	const LA4 = 69;
	const DO_MAGGIORE = [60, 62, 64, 65, 67, 69, 71, 72];
	const SCALA = [...DO_MAGGIORE, ...DO_MAGGIORE.toReversed().slice(1)].map((midi, i) => ({
		midi,
		inizio: i * 0.4,
		durata: 0.35
	}));
	const hz = new Intl.NumberFormat('it', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

	// raw: oggetti sostituiti in blocco, niente proxy (e `riproduzione === r` resta vero)
	let riproduzione = $state.raw<Riproduzione>();
	let microfono = $state.raw<Microfono>();
	let apertura = false;
	let vivo = true;
	let frame = $state.raw<FrameMic | null>(null);
	let errore = $state('');

	function scala() {
		if (riproduzione) return riproduzione.ferma();
		void sblocca(); // nel gesto, prima di tutto (iOS)
		const r = suona(SCALA);
		riproduzione = r;
		void r.fine.then(() => {
			if (riproduzione === r) riproduzione = undefined;
		});
	}

	async function provaMicrofono() {
		if (microfono) {
			microfono.chiudi();
			microfono = undefined;
			frame = null;
			return;
		}
		if (apertura) return;
		apertura = true;
		errore = '';
		void sblocca();
		try {
			const aperto = await apriMicrofono({
				onframe: (f) => (frame = f),
				onchiuso: () => {
					microfono = undefined;
					frame = null;
				},
				latenzaMs: progressi.doc?.preferenze.latenzaAudioMs
			});
			// pagina lasciata mentre si aspettava il permesso: si chiude subito
			if (vivo) microfono = aperto;
			else aperto.chiudi();
		} catch (e) {
			errore = e instanceof ErroreMic ? ERRORI_MIC[e.codice]() : m.audio_errore_non_supportato();
		} finally {
			apertura = false;
		}
	}

	// uscendo dalla pagina si chiude tutto
	$effect(() => () => {
		vivo = false;
		microfono?.chiudi();
		riproduzione?.ferma();
	});

	const lettura = $derived(
		frame?.silenziato
			? m.audio_dev_in_pausa()
			: frame?.freq
				? `${hz.format(frame.freq)} Hz`
				: m.audio_dev_nessuna()
	);
</script>

<section aria-labelledby="sez-audio">
	<h2 id="sez-audio">{m.audio_dev_titolo()}</h2>
	<div class="fila">
		<Button variante="secondaria" icona={riproduzione ? 'pausa' : 'play'} onclick={scala}>
			{riproduzione ? m.audio_dev_ferma() : m.audio_dev_scala()}
		</Button>
		<Button variante="secondaria" onclick={provaMicrofono}>
			{microfono ? m.audio_dev_chiudi_microfono() : m.audio_dev_microfono()}
		</Button>
	</div>
	<Avviso tono="attenzione" testo={errore} />
	<PitchMeter
		target={LA4}
		tolleranzaCents={TOLLERANZE_CENTS.medio}
		{frame}
		nomeTarget={m.audio_dev_la4()}
	/>
	<p>{m.audio_dev_frequenza()} <span data-testid="freq-rilevata">{lettura}</span></p>
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
</style>
