<script lang="ts">
	// Il turno di canto di canta-nota e canta-sequenza (non è un widget registrato).
	// A turni: prima suona il sito (il microfono intanto non ascolta), poi canta il bambino, con il
	// misuratore e l'anello della tenuta. La prova finisce quando le note sono tenute in ordine o dopo
	// ASCOLTO_MAX_MS di ascolto; l'esito conta il primo tentativo. Senza microfono si ascolta e si canta
	// lo stesso, ma senza esito: la scheda non conta né come giusta né come da rivedere.
	// Il microfono si chiude a fine prova e sempre quando si lascia la scheda.
	import { m } from '#lib/paraglide/messages.js';
	import { ASCOLTO_MAX_MS, TOLLERANZE_CENTS } from '../audio/costanti.ts';
	import { sblocca } from '../audio/contesto.ts';
	import { ErroreMic, apriMicrofono, type FrameMic, type Microfono } from '../audio/mic.ts';
	import type { Riproduzione } from '../audio/synth.ts';
	import type { Rigo } from '../contenuti/schema.ts';
	import type { ContestoWidget, EsitoWidget } from '../motore/widget.ts';
	import { avanzaSequenza, nuovaSequenza } from '../musica/intonazione.ts';
	import { midi, nomeNota } from '../musica/note.ts';
	import Avviso from '../ui/Avviso.svelte';
	import Button from '../ui/Button.svelte';
	import Icona from '../ui/Icona.svelte';
	import PitchMeter from '../ui/PitchMeter.svelte';
	import ProgressRing from '../ui/ProgressRing.svelte';
	import Staff from '../ui/Staff.svelte';
	import { ERRORI_MIC, suonaSeguendo } from './musica.ts';

	type Props = {
		/** le note da cantare, in ordine */
		rigo: Rigo;
		/** tenuta di ogni nota, in ms */
		tenutaMs: number;
		equivalenzaOttava: boolean;
		/** secondi di ogni nota suonata dal sito */
		durataS: number;
		etichette: boolean;
		colori: boolean;
		contesto: ContestoWidget;
		item?: string;
		onesito: (e: EsitoWidget) => void;
		onfine: () => void;
	};

	let {
		rigo,
		tenutaMs,
		equivalenzaOttava,
		durataS,
		etichette,
		colori,
		contesto,
		item,
		onesito,
		onfine
	}: Props = $props();

	type Fase = 'pronto' | 'permesso' | 'ascolto' | 'riuscita' | 'scaduta' | 'senza-microfono';
	let fase = $state<Fase>('pronto');
	let stato = $state.raw(nuovaSequenza());
	let frame = $state.raw<FrameMic | null>(null);
	let riproduzione = $state.raw<Riproduzione>();
	let suona = $state<number | null>(null);
	let errore = $state('');
	let microfono: Microfono | undefined;
	let emesso = false;
	let vivo = true;

	const altezze = $derived(rigo.note.map((n) => n.altezza));
	const una = $derived(altezze.length === 1);
	const opzioni = $derived({
		note: altezze.map(midi),
		tolleranzaCents: TOLLERANZE_CENTS[contesto.preferenze.tolleranza],
		tenutaMs,
		timeoutMs: ASCOLTO_MAX_MS,
		equivalenzaOttava
	});
	const corrente = $derived(Math.min(stato.indice, altezze.length - 1));
	const finita = $derived(fase === 'riuscita' || fase === 'scaduta' || fase === 'senza-microfono');

	function ascolta() {
		riproduzione?.ferma();
		const r = suonaSeguendo(altezze, durataS, (i) => (suona = i));
		riproduzione = r;
		void r.fine.then(() => {
			if (riproduzione === r) riproduzione = undefined;
		});
	}

	async function comincia() {
		void sblocca(); // nel gesto, prima di ogni await (iOS)
		fase = 'permesso';
		errore = '';
		let aperto: Microfono;
		try {
			aperto = await apriMicrofono({
				onframe: ascoltaFrame,
				latenzaMs: contesto.preferenze.latenzaAudioMs
			});
		} catch (e) {
			if (!vivo) return;
			errore = ERRORI_MIC[e instanceof ErroreMic ? e.codice : 'non-supportato']();
			fase = 'senza-microfono';
			ascolta(); // si canta lo stesso, senza verifica
			return;
		}
		// scheda lasciata mentre si aspettava il permesso: il microfono si chiude subito
		if (!vivo) return aperto.chiudi();
		microfono = aperto;
		stato = nuovaSequenza();
		fase = 'ascolto';
		ascolta(); // prima il turno del sito, poi quello del bambino
	}

	function ascoltaFrame(f: FrameMic) {
		if (fase !== 'ascolto') return;
		frame = f;
		stato = avanzaSequenza(stato, f, opzioni);
		if (stato.esito !== 'in-corso') concludi();
	}

	function concludi() {
		microfono?.chiudi();
		microfono = undefined;
		frame = null;
		const riuscita = stato.esito === 'riuscita';
		fase = riuscita ? 'riuscita' : 'scaduta';
		if (emesso) return;
		emesso = true; // conta il primo tentativo; poi si riprova quanto si vuole
		onesito({
			corretto: riuscita,
			item,
			dettagli: { riuscite: stato.indice, totale: altezze.length }
		});
	}

	/** un solo pulsante principale, che cambia nome: il focus della tastiera non si perde */
	function principale() {
		if (fase === 'permesso') return;
		if (fase === 'ascolto' || fase === 'riuscita') ascolta();
		else void comincia();
	}

	$effect(() => () => {
		vivo = false;
		microfono?.chiudi();
		riproduzione?.ferma();
	});

	const feedback = $derived.by(() => {
		switch (fase) {
			case 'riuscita':
				return una ? m.canta_riuscita() : m.canta_sequenza_riuscita();
			case 'scaduta':
				if (!stato.sentita) return m.canta_non_sentito();
				return [
					stato.indice > 0 && m.canta_cantate({ count: stato.indice, totale: altezze.length }),
					m.canta_riprova({ count: altezze.length })
				]
					.filter(Boolean)
					.join(' ');
			case 'senza-microfono':
				return `${errore} ${m.canta_senza_microfono()}`;
			default:
				return '';
		}
	});
</script>

<div class="canto">
	<Staff
		{rigo}
		etichetta={m.canta_rigo({ count: altezze.length })}
		evidenzia={suona !== null ? [suona] : fase === 'ascolto' ? [corrente] : []}
		{etichette}
		{colori}
		nomiNote={contesto.preferenze.nomiNote}
	/>

	{#if fase === 'pronto' || fase === 'permesso'}
		<div class="microfono">
			<span class="icona-mic"><Icona nome="microfono" dimensione="1.75rem" /></span>
			<div class="spiega">
				<p class="per-te">{m.canta_microfono()}</p>
				<p class="per-adulti">{m.canta_microfono_adulti()}</p>
			</div>
		</div>
	{:else if fase === 'ascolto'}
		<ol class="turni" aria-label={m.canta_turni()}>
			<li aria-current={riproduzione ? 'step' : undefined}>
				<Icona nome="volume" />
				{m.canta_turno_ascolta()}
			</li>
			<li aria-current={riproduzione ? undefined : 'step'}>
				<Icona nome="microfono" />
				{m.canta_turno_canta()}
			</li>
		</ol>
		<div class="tenuta">
			<ProgressRing
				valore={stato.tenuta.progresso * 100}
				etichetta={m.canta_tenuta_valore({ valore: Math.round(stato.tenuta.progresso * 100) })}
				dimensione="3.5rem"
			/>
			<p>
				<span class="tieni">{m.canta_tenuta({ count: altezze.length })}</span>
				{#if !una}
					<span class="quale">
						{m.canta_nota_di({ numero: corrente + 1, totale: altezze.length })}
					</span>
				{/if}
			</p>
		</div>
		<PitchMeter
			target={opzioni.note[corrente]}
			tolleranzaCents={opzioni.tolleranzaCents}
			{frame}
			{equivalenzaOttava}
			nomeTarget={nomeNota(altezze[corrente], contesto.preferenze.nomiNote)}
		/>
	{/if}

	<Avviso
		tono={fase === 'riuscita' ? 'successo' : fase === 'senza-microfono' ? 'info' : 'attenzione'}
		testo={feedback}
	/>

	<div class="azioni">
		<Button
			dimensione="l"
			variante={fase === 'pronto' || fase === 'scaduta' ? 'primaria' : 'secondaria'}
			icona={fase === 'scaduta' ? 'ricomincia' : fase === 'pronto' ? 'play' : 'volume'}
			aria-disabled={fase === 'permesso'}
			onclick={principale}
		>
			{fase === 'ascolto' || fase === 'riuscita'
				? m.widget_ascolta_di_nuovo()
				: fase === 'scaduta'
					? m.canta_riprova_pulsante()
					: m.canta_inizia()}
		</Button>
		{#if finita}
			<Button
				dimensione="l"
				variante={fase === 'scaduta' ? 'secondaria' : 'primaria'}
				onclick={onfine}
			>
				{m.pulsante_avanti()}
			</Button>
		{/if}
	</div>
</div>

<style>
	.canto {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
	}

	/* la promessa sul microfono, prima di aprirlo: per il bambino in grande, per l'adulto sotto */
	.microfono {
		display: flex;
		gap: var(--spazio-4);
		align-items: flex-start;
		padding: var(--spazio-4) var(--spazio-5);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie-tenue);
	}
	.icona-mic {
		display: grid;
		place-items: center;
		flex: none;
		width: 3rem;
		height: 3rem;
		border-radius: var(--raggio-pieno);
		background: var(--colore-accento-tenue);
		color: var(--colore-accento-forte);
	}
	.spiega {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		max-width: var(--larghezza-testo);
	}
	.per-te {
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
		line-height: var(--interlinea-titoli);
	}
	.per-adulti {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}

	/* a chi tocca: due tappe, quella attuale piena e in grassetto (non solo il colore) */
	.turni {
		display: flex;
		gap: var(--spazio-5);
		align-items: center;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.turni li {
		position: relative;
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
		min-height: var(--target);
		padding-inline: var(--spazio-4);
		border: 2px dashed var(--colore-bordo-forte);
		border-radius: var(--raggio-pieno);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
		transition:
			background-color var(--durata-breve) var(--easing),
			color var(--durata-breve) var(--easing);
	}
	/* il filo tra le due tappe */
	.turni li + li::before {
		content: '';
		position: absolute;
		inset-inline-end: calc(100% + 2px);
		top: 50%;
		width: var(--spazio-5);
		border-top: 2px solid var(--colore-bordo-forte);
	}
	.turni li[aria-current='step'] {
		border-style: solid;
		border-color: var(--colore-accento);
		background: var(--colore-accento);
		color: var(--colore-su-accento);
		font-weight: var(--peso-forte);
	}

	.tenuta {
		display: flex;
		gap: var(--spazio-4);
		align-items: center;
	}
	.tenuta p {
		display: flex;
		flex-direction: column;
	}
	.tieni {
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
	}
	.quale {
		color: var(--colore-testo-tenue);
	}

	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
</style>
