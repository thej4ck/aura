<script lang="ts">
	// Il turno ritmico (ADR 0008) di batti-ritmo e dei giochi del Ritmo (non è un widget registrato), come
	// Canto.svelte per il canto. A eco prima suona il sito: una battuta d'attacco e il ritmo col legnetto,
	// con la nota che suona evidenziata sullo Staff; poi, sempre a tempo, una battuta d'attacco e batte il
	// bambino. In lettura c'è solo l'attacco, poi il bambino legge e batte. Si batte col tocco (il tasto
	// grande, Spazio o Invio) oppure con le mani al microfono, uno solo per turno; la scelta si ricorda. Un
	// battito visivo segue i clic sentiti. Alla fine i battiti compaiono sotto le note, con un consiglio
	// che dice cosa fare (mai «sbagliato»); l'esito conta il primo tentativo.
	// Il microfono: la promessa prima di aprirlo, sordo mentre suona il sito, chiuso a fine prova, uscendo
	// dalla scheda e quando il browser lo chiude (si torna all'inizio, senza esito). Senza microfono si tocca.
	import { tick, type Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { apriBattiMani, type BattiMani } from '../audio/battimani.ts';
	import { TOLLERANZE_RITMO_MS } from '../audio/costanti.ts';
	import { sblocca, tempoSentito } from '../audio/contesto.ts';
	import { ErroreMic } from '../audio/mic.ts';
	import { suonaColpi } from '../audio/percussioni.ts';
	import type { Riproduzione } from '../audio/synth.ts';
	import type { Rigo } from '../contenuti/schema.ts';
	import type { ContestoWidget, EsitoWidget } from '../motore/widget.ts';
	import {
		battitiPerBattuta,
		finestraAscolto,
		momentoTurno,
		pianoTurno,
		segniBattiti,
		valutaBattiti,
		type FonteBattiti,
		type PianoTurno,
		type SegnoBattito,
		type ValutazioneRitmo
	} from '../musica/ritmo.ts';
	import { progressi } from '../store/progressi.svelte.ts';
	import Avviso from '../ui/Avviso.svelte';
	import Button from '../ui/Button.svelte';
	import Icona from '../ui/Icona.svelte';
	import PromessaMicrofono from '../ui/PromessaMicrofono.svelte';
	import Staff from '../ui/Staff.svelte';
	import Turni from '../ui/Turni.svelte';
	import { mostraIntero } from '../ui/scorrimento.ts';
	import AzioniScheda from './AzioniScheda.svelte';
	import { ERRORI_MIC } from './musica.ts';

	type Props = {
		/** il ritmo da battere: un Rigo con le durate (schemaRitmo in musica.ts) */
		rigo: Rigo;
		/** 'eco': prima suona il sito, poi batte il bambino; 'lettura': il bambino legge e batte */
		modo: 'eco' | 'lettura';
		/** battiti al minuto, tra BPM_RITMO_MIN e BPM_RITMO_MAX (col microfono non di più) */
		bpm: number;
		/** le sillabe ritmiche (TA, TI-TI…) sotto le note */
		sillabe: boolean;
		/** «Basta così, vado avanti» durante il turno: passa oltre senza esito (lezioni) */
		bastaCosi?: boolean;
		/** altri pulsanti che lasciano il turno (il «Basta così» dei giochi): vanno nella stessa AzioniScheda */
		azioni?: Snippet;
		contesto: ContestoWidget;
		item?: string;
		onesito: (e: EsitoWidget) => void;
		onfine: () => void;
	};

	let {
		rigo,
		modo,
		bpm,
		sillabe,
		bastaCosi = false,
		azioni,
		contesto,
		item,
		onesito,
		onfine
	}: Props = $props();

	/**
	 * La scelta tra tocco e mani si ricorda nei dati del modulo Ritmo, che è chi batte: un altro modulo che
	 * usasse il turno la condividerebbe, ed è giusto (stesso bambino, stessa stanza, stesso dispositivo).
	 */
	const DATI = 'musica.ritmo';
	const FONTI: readonly FonteBattiti[] = ['tocco', 'mani'];
	const id = $props.id();

	type Fase = 'pronto' | 'permesso' | 'turno' | 'esito';
	let fase = $state<Fase>('pronto');
	let fonte = $state<FonteBattiti>(progressi.doc?.dati[DATI]?.fonte === 'mani' ? 'mani' : 'tocco');
	/** il battito della battuta che si sente, la nota che suona il sito, a chi tocca */
	let battito = $state<number | null>(null);
	let suona = $state<number | null>(null);
	let turno = $state<'ascolta' | 'batti'>('ascolta');
	let premuto = $state(false);
	let valutazione = $state.raw<ValutazioneRitmo>();
	let segni = $state.raw<SegnoBattito[]>([]);
	/** battiti dentro la finestra d'ascolto: zero vuol dire "non ti ho sentito" */
	let sentiti = $state(0);
	/**
	 * quando (scala di performance.now()) va battuta ogni nota: per i test end-to-end, che toccano a tempo
	 * con la tastiera. Si scrive all'inizio dell'attacco del bambino, quando l'uscita audio è già partita
	 */
	let attesi = $state<string>();
	let errore = $state('');
	let elPalco = $state<HTMLElement>();
	let elTasto = $state<HTMLButtonElement>();
	let elAzioni = $state<HTMLElement>();
	let mani: BattiMani | undefined;
	let riproduzione: Riproduzione | undefined;
	let battiti: number[] = [];
	let raf = 0;
	let emesso = false;
	let vivo = true;

	const latenzaMs = $derived(contesto.preferenze.latenzaAudioMs);
	const perBattuta = $derived(rigo.tempo ? battitiPerBattuta(rigo.tempo) : 4);
	const basta = $derived(bastaCosi && fase === 'turno');
	/** la nota del consiglio (o la pausa del battito in più), evidenziata sullo Staff */
	const consigliata = $derived.by(() => {
		const c = valutazione?.consiglio;
		return !c || !sentiti ? undefined : c.tipo === 'in-piu' ? c.pausa : c.nota;
	});

	function scegli(f: FonteBattiti) {
		fonte = f;
		if (progressi.doc) progressi.aggiornaDati(DATI, { fonte: f });
	}

	/**
	 * A ogni frame `passo(t, adesso)`, con `t` i secondi sentiti (tempoSentito, ADR 0008) dall'inizio di
	 * `r` e `adesso` il performance.now() di quell'istante, finché restituisce true.
	 */
	function segui(r: Riproduzione, passo: (t: number, adesso: number) => boolean) {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(function giro() {
			const adesso = performance.now();
			if (passo(tempoSentito(adesso, latenzaMs) - r.t0, adesso)) raf = requestAnimationFrame(giro);
		});
	}

	function ferma() {
		cancelAnimationFrame(raf);
		riproduzione?.ferma();
		riproduzione = undefined;
		battito = null;
		suona = null;
	}

	async function comincia() {
		void sblocca(); // nel gesto, prima di ogni await (iOS)
		ferma();
		errore = '';
		if (fonte === 'mani') {
			fase = 'permesso';
			try {
				const aperto = await apriBattiMani({
					onbattito: (b) => battiti.push(b.t),
					onchiuso: daCapo,
					latenzaMs
				});
				// scheda lasciata mentre si aspettava il permesso: il microfono si chiude subito
				if (!vivo) return aperto.chiudi();
				mani = aperto;
			} catch (e) {
				if (!vivo) return;
				errore = ERRORI_MIC[e instanceof ErroreMic ? e.codice : 'non-supportato']();
				scegli('tocco'); // senza microfono si batte col tocco: mai senza un modo di battere
			}
		}
		suonaTurno();
	}

	function suonaTurno() {
		const p = pianoTurno(rigo, bpm, { eco: modo === 'eco', fonte });
		const r = suonaColpi(p.colpi);
		riproduzione = r;
		battiti = [];
		attesi = undefined;
		valutazione = undefined;
		segni = [];
		turno = 'ascolta';
		premuto = false;
		fase = 'turno';
		void tick().then(() => {
			// tocca al bambino (anche mentre ascolta): il rigo e il tasto, o il battito, sullo schermo
			if (elPalco) mostraIntero(elPalco);
			// il pulsante premuto non c'è più: il focus va sul tasto (Spazio e Invio battono subito)
			if (!document.activeElement || document.activeElement === document.body)
				(elTasto ?? elPalco)?.focus({ preventScroll: true });
		});
		segui(r, (t, adesso) => {
			const x = momentoTurno(p, t);
			battito = x.battito;
			suona = x.suona;
			turno = x.turno;
			if (attesi === undefined && t >= p.da) {
				const note = p.bimbo.note.filter((n) => !n.pausa);
				attesi = JSON.stringify(note.map((n) => Math.round(adesso + (p.da + n.inizio - t) * 1000)));
			}
			if (!x.finito) return true;
			concludi(p, r.t0 + p.da);
			return false;
		});
	}

	function concludi(p: PianoTurno, t0: number) {
		mani?.chiudi();
		mani = undefined;
		ferma();
		const tolleranzaS = TOLLERANZE_RITMO_MS[contesto.preferenze.tolleranza] / 1000;
		const v = valutaBattiti(p.bimbo, t0, battiti, tolleranzaS);
		const [da, a] = finestraAscolto(p.bimbo, t0);
		sentiti = battiti.filter((b) => b >= da && b <= a).length;
		valutazione = v;
		segni = segniBattiti(v, p.bimbo, t0);
		fase = 'esito';
		void tick().then(() => {
			if (!document.activeElement || document.activeElement === document.body)
				elAzioni?.querySelector('button')?.focus();
		});
		if (emesso) return;
		emesso = true; // conta il primo tentativo; poi si riprova quanto si vuole
		onesito({
			corretto: v.riuscita,
			item,
			dettagli: {
				giuste: v.giuste,
				totale: v.note.length,
				inPiu: v.inPiu.length,
				scartoMs: Math.round(v.scarto * 1000),
				fonte
			}
		});
	}

	/** microfono chiuso dal browser o pagina nascosta durante il turno: non conta, si ricomincia */
	function daCapo() {
		mani?.chiudi();
		mani = undefined;
		ferma();
		if (fase === 'turno' || fase === 'permesso') fase = 'pronto';
	}

	/** il ritmo come lo suona il sito (attacco, legnetto e clic), con la nota che suona evidenziata */
	function ascolta() {
		ferma();
		void sblocca();
		const p = pianoTurno(rigo, bpm, { eco: true, fonte });
		const r = suonaColpi(p.colpi.filter((k) => k.inizio < p.da));
		riproduzione = r;
		segui(r, (t) => {
			suona = momentoTurno(p, t).suona;
			return t < p.da;
		});
	}

	/** un battito col tocco, nel riferimento del suono sentito */
	function batti(ms: number) {
		premuto = true;
		if (fase === 'turno' && fonte === 'tocco') battiti.push(tempoSentito(ms, latenzaMs));
	}

	function tasto(e: KeyboardEvent) {
		if (e.key !== ' ' && e.key !== 'Enter') return;
		e.preventDefault(); // niente clic sul tasto, niente scorrimento con lo Spazio
		if (!e.repeat) batti(e.timeStamp);
	}

	$effect(() => () => {
		vivo = false;
		mani?.chiudi();
		ferma();
	});

	const CONSIGLI = { presto: m.ritmo_presto, tardi: m.ritmo_tardi, mancato: m.ritmo_mancato };
	const feedback = $derived.by(() => {
		if (fase !== 'esito' || !valutazione)
			return errore && fase === 'turno' ? `${errore} ${m.ritmo_senza_microfono()}` : '';
		const v = valutazione;
		if (v.riuscita) return m.ritmo_riuscita();
		if (!sentiti) return fonte === 'mani' ? m.ritmo_non_sentito() : m.ritmo_nessun_tocco();
		const c = v.consiglio!;
		const consiglio =
			c.tipo !== 'in-piu'
				? CONSIGLI[c.tipo]()
				: c.pausa !== undefined
					? m.ritmo_pausa()
					: m.ritmo_in_piu();
		const giuste = v.giuste > 0 && m.ritmo_giuste({ count: v.giuste, totale: v.note.length });
		return [giuste, consiglio].filter(Boolean).join(' ');
	});
</script>

<!-- pagina nascosta o lasciata durante il turno: col tocco non si può valutare a metà (e il metronomo
	rallenta), col microfono si chiude da solo; in tutti e due i casi si ricomincia -->
<svelte:document
	onvisibilitychange={() => {
		if (document.visibilityState === 'hidden' && fase === 'turno') daCapo();
	}}
/>
<svelte:window onpagehide={() => fase === 'turno' && daCapo()} />

<div class="ritmo">
	<div class="palco" tabindex="-1" data-attesi={attesi} bind:this={elPalco}>
		<Staff
			{rigo}
			etichetta={m.ritmo_rigo()}
			{sillabe}
			evidenzia={suona !== null
				? [suona]
				: fase === 'esito' && consigliata !== undefined
					? [consigliata]
					: []}
			battiti={fase === 'esito' ? segni : []}
		/>

		{#if fase === 'turno'}
			<Turni
				tappe={[
					{ icona: 'volume', testo: m.canta_turno_ascolta() },
					{ icona: fonte === 'mani' ? 'microfono' : 'mano', testo: m.ritmo_turno_batti() }
				]}
				attuale={turno === 'ascolta' ? 0 : 1}
			/>
			<div class="battere">
				<!-- il battito che si sente: numero, pieno e (col movimento) più grande, non solo il colore -->
				<ol class="pulsazione" aria-hidden="true" data-battito={battito ?? undefined}>
					{#each { length: perBattuta }, i (i)}
						<li class={{ attivo: battito === i, primo: i === 0 }}>{i + 1}</li>
					{/each}
				</ol>
				{#if fonte === 'tocco'}
					<button
						type="button"
						class={['tasto', { attesa: turno === 'ascolta' }]}
						data-premuto={premuto || undefined}
						bind:this={elTasto}
						onpointerdown={(e) => {
							e.preventDefault(); // il tempo è quello del dito che scende: niente clic, niente focus
							batti(e.timeStamp);
						}}
						onpointerup={() => (premuto = false)}
						onpointercancel={() => (premuto = false)}
						onpointerleave={() => (premuto = false)}
						onkeydown={tasto}
						onkeyup={() => (premuto = false)}
						onblur={() => (premuto = false)}
					>
						{m.ritmo_tasto()}
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if fase === 'pronto' || fase === 'permesso'}
		<fieldset class="fonte" disabled={fase === 'permesso'}>
			<legend>{m.ritmo_come()}</legend>
			<div class="opzioni">
				{#each FONTI as f (f)}
					<label class="opzione">
						<input
							type="radio"
							name="fonte-{id}"
							value={f}
							checked={fonte === f}
							onchange={() => scegli(f)}
						/>
						<Icona nome={f === 'tocco' ? 'mano' : 'microfono'} dimensione="1.5rem" />
						{f === 'tocco' ? m.ritmo_fonte_tocco() : m.ritmo_fonte_mani()}
					</label>
				{/each}
			</div>
		</fieldset>
		{#if fonte === 'mani'}
			<PromessaMicrofono perTe={m.ritmo_microfono()} perAdulti={m.ritmo_microfono_adulti()} />
		{/if}
	{/if}

	<Avviso
		tono={fase !== 'esito' ? 'info' : valutazione?.riuscita ? 'successo' : 'attenzione'}
		testo={feedback}
	/>

	{#if fase !== 'turno'}
		<div class="azioni" bind:this={elAzioni}>
			{#if fase === 'esito'}
				<Button dimensione="l" variante="secondaria" icona="volume" onclick={ascolta}>
					{modo === 'eco' ? m.widget_ascolta_di_nuovo() : m.widget_ascolta()}
				</Button>
				<Button
					dimensione="l"
					variante={valutazione?.riuscita ? 'secondaria' : 'primaria'}
					icona="ricomincia"
					onclick={comincia}
				>
					{m.canta_riprova_pulsante()}
				</Button>
			{:else}
				<Button
					dimensione="l"
					icona="play"
					aria-disabled={fase === 'permesso'}
					onclick={() => fase === 'pronto' && comincia()}
				>
					{modo === 'eco' ? m.ritmo_inizia() : m.ritmo_leggi_inizia()}
				</Button>
			{/if}
		</div>
	{/if}

	{#if azioni || basta || fase === 'esito'}
		<AzioniScheda>
			{@render azioni?.()}
			{#if basta}
				<Button dimensione="l" variante="quieta" icona="chiudi" onclick={onfine}>
					{m.canta_basta_avanti()}
				</Button>
			{/if}
			{#if fase === 'esito'}
				<Button
					dimensione="l"
					variante={valutazione?.riuscita ? 'primaria' : 'secondaria'}
					onclick={onfine}
				>
					{m.pulsante_avanti()}
				</Button>
			{/if}
		</AzioniScheda>
	{/if}
</div>

<style>
	.ritmo,
	.palco {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
	}
	.palco:focus {
		outline: none; /* riceve il focus solo dal codice, quando il pulsante premuto sparisce */
	}

	.battere {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
		align-items: center;
	}

	/* il battito visivo: in fase con i clic sentiti */
	.pulsazione {
		display: flex;
		gap: var(--spazio-4);
		align-items: center;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.pulsazione li {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 2px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-pieno);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
		font-variant-numeric: tabular-nums;
		transition: transform var(--durata-breve) var(--easing);
	}
	/* il primo della battuta, l'accento: più grande */
	.pulsazione .primo {
		width: 3.25rem;
		height: 3.25rem;
	}
	.pulsazione .attivo {
		border-color: var(--colore-accento);
		background: var(--colore-accento);
		color: var(--colore-su-accento);
		font-weight: var(--peso-forte);
		transform: scale(1.2);
	}

	/* il tasto per battere: grande (≥ 96 px), il dito non deve mirare */
	.tasto {
		display: grid;
		place-items: center;
		width: 7.5rem;
		height: 7.5rem;
		padding: var(--spazio-3);
		border: 4px solid var(--colore-accento-forte);
		border-radius: var(--raggio-pieno);
		background: var(--colore-accento);
		color: var(--colore-su-accento);
		font-size: var(--testo-l);
		font-weight: var(--peso-forte);
		line-height: 1.1;
		cursor: pointer;
		/* tocchi veloci: niente zoom, niente scorrimento, niente selezione o menu */
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
		-webkit-tap-highlight-color: transparent;
		transition:
			transform var(--durata-breve) var(--easing),
			background-color var(--durata-breve) var(--easing);
	}
	.tasto[data-premuto] {
		background: var(--colore-accento-forte);
		transform: scale(0.94);
	}
	/* mentre suona il sito si aspetta: i tocchi non contano ancora. Tratteggiato e chiaro, con il testo
	   scuro: si vede che aspetta senza perdere contrasto (un tasto sbiadito scende sotto 3:1) */
	.tasto.attesa {
		border-style: dashed;
		background: var(--colore-accento-tenue);
		color: var(--colore-testo);
	}

	/* movimento ridotto: il battito e il tocco cambiano stato, senza cambiare grandezza */
	:global(:root[data-riduci-movimento]) .pulsazione .attivo,
	:global(:root[data-riduci-movimento]) .tasto[data-premuto] {
		transform: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.pulsazione .attivo,
		.tasto[data-premuto] {
			transform: none;
		}
	}

	.fonte {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		margin: 0;
		padding: 0;
		border: 0;
	}
	.fonte legend {
		margin-block-end: var(--spazio-3);
		padding: 0;
		font-size: var(--testo-l);
		font-weight: var(--peso-medio);
	}
	.opzioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
	.opzione {
		display: inline-flex;
		flex: 1 1 14rem;
		gap: var(--spazio-3);
		align-items: center;
		min-height: var(--target);
		padding: var(--spazio-2) var(--spazio-5);
		border: 2px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-m);
		font-size: var(--testo-l);
		cursor: pointer;
	}
	.opzione input {
		width: 1.25rem;
		height: 1.25rem;
		margin: 0;
		accent-color: var(--colore-accento);
	}
	/* la scelta fatta: bordo, sfondo e grassetto, oltre al pallino */
	.opzione:has(input:checked) {
		border-color: var(--colore-accento);
		background: var(--colore-accento-tenue);
		font-weight: var(--peso-forte);
	}
	.opzione:has(input:focus-visible) {
		outline: 3px solid var(--colore-focus);
		outline-offset: 2px;
	}

	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
</style>
