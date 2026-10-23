<script lang="ts">
	// Il turno di canto di canta-nota e canta-sequenza (non è un widget registrato).
	// A turni: prima suona il sito (il microfono intanto non ascolta), poi canta il bambino, con il
	// misuratore e l'anello della tenuta. La prova finisce quando le note sono tenute in ordine o dopo
	// ASCOLTO_MAX_MS di ascolto; l'esito conta il primo tentativo. Senza microfono si ascolta e si canta
	// lo stesso, ma senza esito: la scheda non conta né come giusta né come da rivedere.
	// Il microfono si chiude a fine prova e sempre quando si lascia la scheda; se lo chiude il browser
	// (scheda nascosta, pagina lasciata) si torna all'inizio, senza esito.
	// In lettura (`lettura`) le note sono da leggere: il sito suona solo la prima, la nota di partenza, che
	// sullo Staff è scritta come nota di riferimento. Sentirle tutte serve dopo, per controllarsi.
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
		/**
		 * note da leggere: prima del turno del bambino il sito suona solo la prima, la nota di partenza (come
		 * nel solfeggio cantato); le altre si leggono. Di default le suona tutte
		 */
		lettura?: boolean;
		/** «Basta così, vado avanti» mentre il microfono ascolta: passa oltre senza esito (lezioni) */
		bastaCosi?: boolean;
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
		lettura = false,
		bastaCosi = false,
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
	/** quante note, dall'inizio, suona il sito prima del turno del bambino */
	const suonate = $derived(lettura ? 1 : altezze.length);
	const opzioni = $derived({
		note: altezze.map(midi),
		tolleranzaCents: TOLLERANZE_CENTS[contesto.preferenze.tolleranza],
		tenutaMs,
		timeoutMs: ASCOLTO_MAX_MS,
		equivalenzaOttava
	});
	const corrente = $derived(Math.min(stato.indice, altezze.length - 1));
	const finita = $derived(fase === 'riuscita' || fase === 'scaduta' || fase === 'senza-microfono');

	function ascolta(quante = altezze.length) {
		riproduzione?.ferma();
		const r = suonaSeguendo(altezze.slice(0, quante), durataS, (i) => (suona = i));
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
				onchiuso: daCapo,
				latenzaMs: contesto.preferenze.latenzaAudioMs
			});
		} catch (e) {
			if (!vivo) return;
			errore = ERRORI_MIC[e instanceof ErroreMic ? e.codice : 'non-supportato']();
			fase = 'senza-microfono';
			ascolta(suonate); // si canta lo stesso, senza verifica
			return;
		}
		// scheda lasciata mentre si aspettava il permesso: il microfono si chiude subito
		if (!vivo) return aperto.chiudi();
		microfono = aperto;
		stato = nuovaSequenza();
		fase = 'ascolto';
		ascolta(suonate); // prima il turno del sito, poi quello del bambino
	}

	function ascoltaFrame(f: FrameMic) {
		if (fase !== 'ascolto') return;
		frame = f;
		stato = avanzaSequenza(stato, f, opzioni);
		if (stato.esito !== 'in-corso') concludi();
	}

	/** microfono chiuso dal browser: la prova non conta, al ritorno si rifà «Ascolta e canta» */
	function daCapo() {
		microfono = undefined;
		frame = null;
		riproduzione?.ferma();
		if (fase === 'ascolto') fase = 'pronto';
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
		if (fase === 'riuscita' || (fase === 'ascolto' && !lettura)) ascolta();
		else if (fase === 'ascolto')
			ascolta(suonate); // di nuovo la nota di partenza
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
					lettura
						? m.canta_leggi_riprova({ count: altezze.length })
						: m.canta_riprova({ count: altezze.length })
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
			nomeTarget={corrente < suonate
				? nomeNota(altezze[corrente], contesto.preferenze.nomiNote)
				: undefined}
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
			{fase === 'ascolto' && lettura
				? m.canta_ascolta_partenza({ nome: nomeNota(altezze[0], contesto.preferenze.nomiNote) })
				: fase === 'ascolto' || fase === 'riuscita'
					? lettura
						? m.widget_ascolta()
						: m.widget_ascolta_di_nuovo()
					: fase === 'scaduta'
						? m.canta_riprova_pulsante()
						: lettura
							? m.canta_leggi_inizia()
							: m.canta_inizia()}
		</Button>
		{#if lettura && (fase === 'scaduta' || fase === 'senza-microfono')}
			<!-- le note da leggere, da sentire per controllarsi -->
			<Button dimensione="l" variante="secondaria" icona="volume" onclick={() => ascolta()}>
				{m.widget_ascolta()}
			</Button>
		{/if}
		{#if bastaCosi && fase === 'ascolto'}
			<!-- la voce non si forza: ci si può fermare senza aspettare la fine dell'ascolto -->
			<Button dimensione="l" variante="quieta" icona="chiudi" onclick={onfine}>
				{m.canta_basta_avanti()}
			</Button>
		{/if}
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
