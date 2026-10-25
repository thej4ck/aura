<script lang="ts" module>
	import * as v from 'valibot';

	/** Props di `estensione`: nessuna. */
	export const schemaProps = v.object({});
</script>

<script lang="ts">
	// Gioco G3 "Fin dove arriva la tua voce". La logica è pura in sequenza.ts (avanzaEstensione): qui ci
	// sono il microfono, l'arpeggio suonato a ogni giro, la pausa per bere e il risultato su Staff e
	// tastiera, salvato in 'musica.canto'.estensione e confrontato con la prova precedente.
	// La voce non si forza mai: «Basta così» è sempre in vista e finisce subito, con quello che c'è.
	// Il microfono è aperto solo mentre si canta (chiuso nella pausa); se lo chiude il browser (scheda
	// nascosta, pagina lasciata) si torna all'inizio senza salvare. È una misura solo la prova arrivata in
	// fondo con almeno un arpeggio riuscito: si salva, si confronta con la precedente ed è l'unico esito
	// (giusto). Fermata prima con «Basta così», mostra le note raggiunte, ma non si salva e non conta.
	import { TOLLERANZE_CENTS } from '#lib/core/audio/costanti.ts';
	import { sblocca } from '#lib/core/audio/contesto.ts';
	import { distanzaCents } from '#lib/core/audio/frequenze.ts';
	import { ErroreMic, apriMicrofono, type FrameMic, type Microfono } from '#lib/core/audio/mic.ts';
	import type { Riproduzione } from '#lib/core/audio/synth.ts';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import { midi, nomeNota, scomponi } from '#lib/core/musica/note.ts';
	import { avanzaVoceForte, nuovaVoceForte } from '#lib/core/musica/voce-forte.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Button from '#lib/core/ui/Button.svelte';
	import { nonPerdereIlFocus } from '#lib/core/ui/focus.ts';
	import Icona from '#lib/core/ui/Icona.svelte';
	import Keyboard from '#lib/core/ui/Keyboard.svelte';
	import { mostraIntero } from '#lib/core/ui/scorrimento.ts';
	import PitchMeter from '#lib/core/ui/PitchMeter.svelte';
	import ProgressRing from '#lib/core/ui/ProgressRing.svelte';
	import PromessaMicrofono from '#lib/core/ui/PromessaMicrofono.svelte';
	import Staff from '#lib/core/ui/Staff.svelte';
	import AzioniScheda from '#lib/core/widget/AzioniScheda.svelte';
	import { ERRORI_MIC, suonaSeguendo } from '#lib/core/widget/musica.ts';
	import { m } from '#lib/paraglide/messages.js';
	import {
		ID_DATI,
		aggiungiEstensione,
		arpeggio,
		avanzaEstensione,
		basta,
		crescita,
		leggiEstensioni,
		limitiScritti,
		notaInCorso,
		nuovaEstensione,
		rigoDi,
		riprendi,
		risultato,
		type StatoEstensione
	} from '../sequenza.ts';

	let { contesto, onesito, onfine }: WidgetProps = $props();

	/** secondi di ogni nota dell'arpeggio suonato */
	const DURATA_S = 0.7;

	type Vista = 'pronto' | 'permesso' | 'gioco' | 'senza-microfono';
	let vista = $state<Vista>('pronto');
	let stato = $state.raw<StatoEstensione>(nuovaEstensione());
	/** ai limiti della voce si forza facilmente: il consiglio di non cantare più forte (musica/voce-forte.ts) */
	let voceForte = $state.raw(nuovaVoceForte());
	let frame = $state.raw<FrameMic | null>(null);
	let riproduzione = $state.raw<Riproduzione>();
	let suona = $state<number | null>(null);
	let errore = $state('');
	/**
	 * le note raggiunte; `crescita` solo per una misura salvata: quanto è cresciuta (null alla prima),
	 * undefined per una prova fermata prima, che non si confronta
	 */
	let esito = $state.raw<{ basso: number; alto: number; crescita?: number | null } | null>(null);
	let microfono: Microfono | undefined;
	/** il messaggio: il focus ci va quando il pulsante premuto sparisce (Comincia, Continua, Basta così) */
	let messaggio = $state<HTMLElement>();
	/** cresce a ogni apertura: un'apertura superata da «Basta così» o dall'uscita si chiude subito */
	let tentativo = 0;
	let emesso = false;
	let vivo = true;

	const nomi = $derived(contesto.preferenze.nomiNote);
	const opzioni = $derived({ tolleranzaCents: TOLLERANZE_CENTS[contesto.preferenze.tolleranza] });
	const rigo = $derived(stato.radice !== null ? arpeggio(stato.radice) : null);
	const corrente = $derived(Math.min(stato.sequenza.indice, (rigo?.note.length ?? 1) - 1));
	/** misura finita, o senza microfono: al posto di «Basta così» c'è «Avanti» */
	const finita = $derived(stato.fase === 'fine' || vista === 'senza-microfono');
	const nomeConOttava = (a: string) =>
		m.notazione_tasto({ nome: nomeNota(a, nomi), ottava: scomponi(a).ottava });

	function chiudiMicrofono() {
		tentativo++;
		microfono?.chiudi();
		microfono = undefined;
		frame = null;
	}

	/** apre il microfono; false se non si può (e allora si spiega perché) o se nel frattempo è finita */
	async function apri(): Promise<boolean> {
		const mio = ++tentativo;
		let aperto: Microfono;
		try {
			aperto = await apriMicrofono({
				onframe: ascoltaFrame,
				onchiuso: daCapo,
				latenzaMs: contesto.preferenze.latenzaAudioMs
			});
		} catch (e) {
			if (!vivo || mio !== tentativo) return false;
			errore = ERRORI_MIC[e instanceof ErroreMic ? e.codice : 'non-supportato']();
			vista = 'senza-microfono';
			return false;
		}
		if (!vivo || mio !== tentativo) {
			aperto.chiudi();
			return false;
		}
		microfono = aperto;
		return true;
	}

	async function comincia() {
		void sblocca(); // nel gesto, prima di ogni await (iOS)
		riproduzione?.ferma();
		stato = nuovaEstensione();
		voceForte = nuovaVoceForte();
		esito = null;
		vista = 'permesso';
		if (await apri()) vista = 'gioco';
		void nonPerdereIlFocus(messaggio);
	}

	async function continua() {
		void sblocca();
		if (!microfono && !(await apri())) return;
		stato = riprendi(stato);
		suonaArpeggio();
		void nonPerdereIlFocus(messaggio);
	}

	function suonaArpeggio() {
		riproduzione?.ferma();
		const r = suonaSeguendo(
			arpeggio(stato.radice!).note.map((n) => n.altezza),
			DURATA_S,
			(i) => (suona = i)
		);
		riproduzione = r;
		void r.fine.then(() => {
			if (riproduzione === r) riproduzione = undefined;
		});
	}

	function ascoltaFrame(f: FrameMic) {
		if (vista !== 'gioco' || (stato.fase !== 'nota-comoda' && stato.fase !== 'giro')) return;
		frame = f;
		// fuori nota solo nei giri, dove c'è una nota da cantare; cercando la nota comoda conta il volume
		const fuori =
			stato.fase === 'giro' &&
			rigo !== null &&
			f.freq !== null &&
			Math.abs(distanzaCents(f.freq, midi(rigo.note[corrente].altezza))) > opzioni.tolleranzaCents;
		const avvisata = voceForte.avviso;
		voceForte = avanzaVoceForte(voceForte, f, fuori);
		if (voceForte.avviso && !avvisata) contesto.conta?.('voce-forte');
		const prima = stato;
		stato = avanzaEstensione(stato, f, opzioni);
		if (stato.fase === 'giro' && stato.giro !== prima.giro) {
			// il consiglio vale per la nota di adesso: a ogni giro riparte (la voce di partenza resta)
			voceForte = { ...voceForte, avviso: false, forteMs: 0 };
			suonaArpeggio(); // prima il turno del sito
		} else if (stato.fase === 'pausa')
			chiudiMicrofono(); // si beve: il microfono non serve
		else if (stato.fase === 'fine') concludi();
	}

	/** microfono chiuso dal browser: la prova non conta, al ritorno si ricomincia */
	function daCapo() {
		microfono = undefined;
		frame = null;
		riproduzione?.ferma();
		if (vista === 'gioco' && stato.fase !== 'fine') {
			vista = 'pronto';
			stato = nuovaEstensione();
		}
	}

	function concludi() {
		chiudiMicrofono();
		riproduzione?.ferma();
		void nonPerdereIlFocus(messaggio);
		const r = risultato(stato);
		if (!r) return;
		if (stato.motivo !== 'finita') {
			esito = r; // una prova a metà: non è la misura della voce
			return;
		}
		const prove = leggiEstensioni(progressi.doc?.dati[ID_DATI]);
		const ultima = prove.at(-1);
		if (progressi.doc) {
			const nuova = { data: new Date().toISOString(), ...r };
			progressi.aggiornaDati(ID_DATI, { estensione: aggiungiEstensione(prove, nuova) });
		}
		esito = { ...r, crescita: ultima ? crescita(ultima, r) : null };
		if (emesso) return;
		emesso = true; // conta la prima misura; poi si rifà quanto si vuole
		onesito({ corretto: true, item: 'estensione', dettagli: r });
	}

	function bastaCosi() {
		if (vista === 'pronto' || vista === 'senza-microfono') return onfine();
		vista = 'gioco';
		stato = basta(stato);
		concludi();
	}

	$effect(() => () => {
		vivo = false;
		microfono?.chiudi();
		riproduzione?.ferma();
	});

	const feedback = $derived.by(() => {
		if (vista !== 'gioco') return '';
		if (stato.fase === 'pausa') return m.canto_estensione_pausa();
		if (stato.fase === 'fine') return '';
		const consiglio = voceForte.avviso ? ` ${m.canta_troppo_forte()}` : '';
		return istruzione() + consiglio;
	});

	function istruzione() {
		switch (stato.evento) {
			case 'radice':
				return m.canto_estensione_radice({ nome: nomeNota(rigo!.note[0].altezza, nomi) });
			case 'su':
				return m.canto_estensione_su();
			case 'giu':
				return m.canto_estensione_giu();
			case 'ripeti':
				return m.canto_estensione_ripeti();
			case 'scendiamo':
				return m.canto_estensione_scendiamo();
			default:
				return m.canto_estensione_comoda();
		}
	}

	const fine = $derived.by(() => {
		if (stato.fase !== 'fine') return '';
		if (esito) {
			const [basso, alto] = limitiScritti(esito);
			if (esito.crescita === undefined)
				return m.canto_estensione_fin_qui({
					basso: nomeConOttava(basso),
					alto: nomeConOttava(alto)
				});
			return [
				m.canto_estensione_risultato({
					basso: nomeConOttava(basso),
					alto: nomeConOttava(alto),
					count: esito.alto - esito.basso + 1
				}),
				esito.crescita === null
					? m.canto_estensione_prima_volta()
					: esito.crescita > 0
						? m.canto_estensione_crescita({ count: esito.crescita })
						: esito.crescita === 0
							? m.canto_estensione_uguale()
							: m.canto_estensione_stretta()
			].join(' ');
		}
		if (stato.motivo === 'non-sentita') return m.canto_estensione_non_sentita();
		if (stato.motivo === 'basta') return m.canto_estensione_basta();
		return m.canto_estensione_nessuno();
	});
</script>

<div class="estensione">
	<p class="salute">
		<Icona nome="germoglio" dimensione="1.5rem" />
		<span>{m.canto_estensione_salute()}</span>
	</p>

	{#if vista === 'pronto' || vista === 'permesso'}
		<PromessaMicrofono perTe={m.canta_microfono()} perAdulti={m.canta_microfono_adulti()} />
	{:else if vista === 'senza-microfono'}
		<Avviso tono="info" testo="{errore} {m.canto_estensione_senza_microfono()}" />
	{:else if stato.fase === 'nota-comoda'}
		{@const cantata = notaInCorso(stato)}
		{#if cantata}
			<Staff
				rigo={rigoDi([cantata])}
				etichetta={m.canto_estensione_rigo_comoda()}
				etichette
				colori
				nomiNote={nomi}
			/>
		{/if}
		<ProgressRing
			valore={stato.comoda.copertura * 100}
			etichetta={m.canto_estensione_comoda_valore({
				valore: Math.round(stato.comoda.copertura * 100)
			})}
			dimensione="3.5rem"
		/>
	{:else if stato.fase === 'giro' && rigo}
		<Staff
			{rigo}
			etichetta={m.canto_estensione_rigo()}
			evidenzia={suona !== null ? [suona] : [corrente]}
			etichette
			colori
			nomiNote={nomi}
		/>
		<p class="turno" aria-live="polite">
			<Icona nome={riproduzione ? 'volume' : 'microfono'} dimensione="1.5rem" />
			{riproduzione ? m.canto_estensione_ascolta() : m.canto_estensione_canta()}
		</p>
		<div class="tenuta">
			<ProgressRing
				valore={stato.sequenza.tenuta.progresso * 100}
				etichetta={m.canta_tenuta_valore({
					valore: Math.round(stato.sequenza.tenuta.progresso * 100)
				})}
				dimensione="3.5rem"
			/>
			<p>{m.canta_nota_di({ numero: corrente + 1, totale: rigo.note.length })}</p>
		</div>
		<!-- quando tocca al bambino il misuratore deve essere sullo schermo -->
		<div
			{@attach (el) => {
				if (!riproduzione) mostraIntero(el);
			}}
		>
			<PitchMeter
				target={midi(rigo.note[corrente].altezza)}
				tolleranzaCents={opzioni.tolleranzaCents}
				{frame}
				nomeTarget={nomeNota(rigo.note[corrente].altezza, nomi)}
			/>
		</div>
	{:else if stato.fase === 'fine' && esito}
		{@const scritti = limitiScritti(esito)}
		<Staff
			rigo={rigoDi(scritti)}
			etichetta={m.canto_estensione_rigo_limiti()}
			etichette
			colori
			rivelaNomi
			nomiNote={nomi}
		/>
		<Keyboard
			da={esito.basso - 3}
			a={esito.alto + 3}
			intervallo={[esito.basso, esito.alto]}
			etichette
			nomiNote={nomi}
			etichetta={m.canto_estensione_tastiera()}
		/>
	{/if}

	<div tabindex="-1" bind:this={messaggio}>
		<Avviso
			tono={stato.fase === 'fine' && esito?.crescita !== undefined ? 'successo' : 'info'}
			testo={stato.fase === 'fine' ? fine : feedback}
		/>
	</div>

	{#if vista === 'pronto' || vista === 'permesso'}
		<div class="azioni">
			<Button
				dimensione="l"
				icona="play"
				aria-disabled={vista === 'permesso'}
				onclick={() => vista === 'pronto' && comincia()}
			>
				{m.canto_estensione_inizia()}
			</Button>
		</div>
	{:else if stato.fase === 'pausa'}
		<div class="azioni">
			<Button dimensione="l" icona="play" onclick={continua}>
				{m.canto_estensione_continua()}
			</Button>
		</div>
	{:else if finita && vista === 'gioco'}
		<div class="azioni">
			<Button dimensione="l" variante="secondaria" icona="ricomincia" onclick={comincia}>
				{m.canto_estensione_ricomincia()}
			</Button>
		</div>
	{/if}

	{#if !finita}
		<AzioniScheda>
			<Button dimensione="l" variante="secondaria" icona="chiudi" onclick={bastaCosi}>
				{m.canto_basta()}
			</Button>
		</AzioniScheda>
	{:else if stato.fase !== 'pausa'}
		<!-- in pausa senza microfono c'è solo «Continua», che riprova ad aprirlo -->
		<AzioniScheda>
			<Button dimensione="l" onclick={onfine}>{m.pulsante_avanti()}</Button>
		</AzioniScheda>
	{/if}
</div>

<style>
	.estensione {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
	}
	.salute {
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
	}

	.turno {
		display: flex;
		gap: var(--spazio-2);
		align-items: center;
		font-size: var(--testo-l);
		font-weight: var(--peso-forte);
	}
	.tenuta {
		display: flex;
		gap: var(--spazio-4);
		align-items: center;
	}
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
</style>
