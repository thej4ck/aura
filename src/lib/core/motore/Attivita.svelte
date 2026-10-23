<script lang="ts">
	// Motore unico delle attività: obiettivo → schede (Scopri / Proviamo insieme / Prova tu) → riepilogo.
	// Raccoglie gli esiti dei widget, salva la scheda corrente a ogni passo e alla fine registra la verifica.
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import {
		catalogo as catalogoReale,
		type AttivitaCatalogo,
		type Catalogo
	} from '../contenuti/registry';
	import type { Fase } from '../contenuti/schema';
	import { registraErrore } from '../errori';
	import { prerequisitiMancanti, prossimoPasso } from '../percorso';
	import { progressi } from '../store/progressi.svelte';
	import { PREFERENZE_PREDEFINITE } from '../store/schema-progressi';
	import Avviso from '../ui/Avviso.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icona, { type NomeIcona } from '../ui/Icona.svelte';
	import LeggiAltaVoce from '../ui/LeggiAltaVoce.svelte';
	import Stelle from '../ui/Stelle.svelte';
	import {
		avanzamentoSchede,
		gruppiFase,
		primaSchedaProva,
		puntoDiRipresa,
		senzaRisposte,
		suggerisci,
		valutaVerifica,
		type EsitoRegistrato
	} from './logica';
	import { caricaWidget, type EsitoWidget } from './widget';

	type Props = {
		attivita: AttivitaCatalogo;
		/** di default il catalogo reale; /dev passa quello delle fixture */
		catalogo?: Catalogo;
	};

	let { attivita, catalogo = catalogoReale }: Props = $props();

	const NOMI_FASE: Record<Fase, () => string> = {
		scopri: m.fase_scopri,
		insieme: m.fase_insieme,
		prova: m.fase_prova
	};
	const ICONE_FASE: Record<Fase, NomeIcona> = {
		scopri: 'occhio',
		insieme: 'insieme',
		prova: 'matita'
	};
	const nuovoSeed = () => Math.floor(Math.random() * 2 ** 32);

	const id = $props.id();
	let vista: 'obiettivo' | 'schede' | 'riepilogo' = $state('obiettivo');
	let indice = $state(0);
	/** cambia a ogni ripetizione: i widget ripartono da zero */
	let giro = $state(0);
	let seed = $state(nuovoSeed());
	let esiti: EsitoRegistrato[] = $state([]);
	let risultato:
		{ superata: boolean; vuota: boolean; stelle: number; prossimo?: AttivitaCatalogo } | undefined =
		$state();
	let titolo: HTMLElement | undefined = $state();

	const record = $derived(progressi.doc?.attivita[attivita.id]);
	const preferenze = $derived(progressi.doc?.preferenze ?? PREFERENZE_PREDEFINITE);
	const widgetModulo = $derived(catalogo.modulo(attivita.modulo)?.widget ?? {});
	const stato = $derived(avanzamentoSchede(attivita.schede, indice));
	const scheda = $derived(attivita.schede[stato.indice]);
	const gruppi = $derived(gruppiFase(attivita.schede));
	const ripresa = $derived(puntoDiRipresa(attivita.schede, record?.scheda ?? 0));
	const mancanti = $derived(
		progressi.doc
			? prerequisitiMancanti(attivita, progressi.doc).flatMap((p) => catalogo.attivita(p) ?? [])
			: []
	);

	const indirizzo = (a: AttivitaCatalogo) =>
		resolve('/[area]/[modulo]/[attivita]', {
			area: a.area,
			modulo: a.modulo.slice(a.area.length + 1),
			attivita: a.idLocale
		});

	/** widget core o del modulo; un nome sconosciuto finisce nel registro degli errori */
	const carica = (nome: string) =>
		caricaWidget(nome, widgetModulo).catch((e: unknown) => {
			registraErrore(e);
			throw e;
		});

	async function mostra(v: typeof vista, i = indice) {
		vista = v;
		indice = i;
		await tick();
		titolo?.focus();
	}

	/** la scheda corrente nel salvataggio, per "Riprendi da dove eri" */
	function salvaScheda(i: number) {
		if (!progressi.doc) return;
		progressi.aggiornaAttivita(attivita.id, {
			stato: record?.stato === 'completata' ? 'completata' : 'in_corso',
			scheda: i
		});
	}

	/** la scheda mostrata ha già i suoi esiti in questo giro: ci si è tornati con Indietro */
	let rivista = false;

	function vaiA(i: number) {
		// conta la prima risposta: rifare una scheda "prova" sapendo già la soluzione non cancella gli errori
		rivista = esiti.some((e) => e.scheda === i);
		salvaScheda(i);
		void mostra('schede', i);
	}

	function inizia(da: number) {
		esiti = [];
		giro++;
		seed = nuovoSeed();
		risultato = undefined;
		vaiA(da);
	}

	function registra(e: EsitoWidget) {
		if (!rivista) esiti.push({ scheda: stato.indice, corretto: e.corretto, item: e.item });
	}

	function avanti() {
		if (stato.ultima) concludi();
		else vaiA(stato.indice + 1);
	}

	/** il riepilogo da leggere ad alta voce, per chi non legge ancora */
	function testoRiepilogo(r: NonNullable<typeof risultato>) {
		if (r.superata)
			return [
				`${m.riepilogo_completata()}. ${m.riepilogo_imparato()}: ${attivita.riepilogo}`,
				r.prossimo && `${m.riepilogo_prossimo()}: ${r.prossimo.titolo}.`
			]
				.filter(Boolean)
				.join(' ');
		if (r.vuota) return `${m.riepilogo_vuota()}. ${m.riepilogo_vuota_testo()}`;
		return `${m.riepilogo_quasi()}. ${m.riepilogo_quasi_testo()}`;
	}

	function concludi() {
		const esito = valutaVerifica(attivita.schede, esiti, attivita);
		const vuota = senzaRisposte(esito);
		const oggi = new Date();
		let stelle = 0;
		let prossimo: AttivitaCatalogo | undefined;
		if (vuota) {
			// un gioco lasciato prima di rispondere: niente da registrare, si riparte dal gioco
			if (progressi.doc)
				progressi.aggiornaAttivita(attivita.id, { scheda: primaSchedaProva(attivita.schede) });
		} else if (progressi.doc) {
			stelle = progressi.registraVerifica(attivita.id, attivita.allena, esito, oggi).stelle;
			// da dove ripartire la prossima volta: dall'inizio, o dalla pratica se c'è ancora da fare
			progressi.aggiornaAttivita(attivita.id, {
				scheda: esito.superata ? 0 : primaSchedaProva(attivita.schede)
			});
			prossimo = suggerisci(prossimoPasso(catalogo, progressi.doc, oggi), attivita.id);
		}
		risultato = { superata: esito.superata, vuota, stelle, prossimo };
		void mostra('riepilogo');
	}
</script>

<!-- nel riepilogo c'è sempre una via d'uscita, anche quando non c'è un prossimo passo -->
{#snippet home()}
	<Button variante="quieta" href={resolve('/')}>{m.riepilogo_home()}</Button>
{/snippet}

{#snippet nonCaricata()}
	<Avviso tono="attenzione" testo={m.attivita_widget_errore()} />
	<div class="azioni">
		<Button dimensione="l" onclick={avanti}>{m.pulsante_avanti()}</Button>
	</div>
{/snippet}

<div class="attivita">
	{#if vista === 'obiettivo'}
		<section class="obiettivo" aria-labelledby="{id}-titolo">
			<p class="meta">
				<span>
					<Icona nome={attivita.tipo === 'gioco' ? 'gioco' : 'libro'} />
					{attivita.tipo === 'gioco' ? m.attivita_gioco() : m.attivita_lezione()}
				</span>
				<span><Icona nome="orologio" /> {m.attivita_minuti({ count: attivita.minuti })}</span>
			</p>
			<div class="riga-titolo">
				<h1 id="{id}-titolo" tabindex="-1" bind:this={titolo}>{attivita.titolo}</h1>
				<LeggiAltaVoce
					testo={`${attivita.titolo}. ${attivita.obiettivo}`}
					attivo={preferenze.letturaAltaVoce}
				/>
			</div>
			<p class="lead">{attivita.obiettivo}</p>

			{#if mancanti.length}
				<Avviso tono="info">
					<p>{m.attivita_prerequisiti()}</p>
					<ul class="prerequisiti">
						{#each mancanti as a (a.id)}
							<li><a href={indirizzo(a)}>{a.titolo}</a></li>
						{/each}
					</ul>
				</Avviso>
			{/if}

			<div class="azioni">
				{#if record?.stato === 'in_corso'}
					<Button dimensione="l" onclick={() => inizia(ripresa)}>{m.attivita_riprendi()}</Button>
					<Button dimensione="l" variante="secondaria" onclick={() => inizia(0)}>
						{m.attivita_ricomincia()}
					</Button>
				{:else}
					<Button dimensione="l" onclick={() => inizia(0)}>
						{record?.stato === 'completata' ? m.attivita_ripeti() : m.attivita_inizia()}
					</Button>
				{/if}
			</div>
		</section>
	{:else if vista === 'schede'}
		<header class="testata">
			<h1 class="nome-attivita">{attivita.titolo}</h1>
			<div class="traccia" aria-hidden="true">
				{#each gruppi as g, n (n)}
					<div
						class={['gruppo', { attuale: g.indici.includes(stato.indice) }]}
						style:flex-grow={g.indici.length}
					>
						<div class="segmenti">
							{#each g.indici as i (i)}
								<span
									class={['segmento', { fatto: i < stato.indice, corrente: i === stato.indice }]}
								></span>
							{/each}
						</div>
						<span class="nome-fase">{NOMI_FASE[g.fase]()}</span>
					</div>
				{/each}
			</div>
		</header>

		{#key `${giro}:${stato.indice}`}
			<section class="scheda" aria-labelledby="{id}-scheda">
				{#snippet fase()}
					<Icona nome={ICONE_FASE[scheda.fase]} />
					{NOMI_FASE[scheda.fase]()}
				{/snippet}
				<div class="riga-fase">
					{#if scheda.titolo}
						<p class="fase">{@render fase()}</p>
					{:else}
						<!-- senza titolo proprio, la fase è il titolo della scheda -->
						<h2 class="fase" id="{id}-scheda" tabindex="-1" bind:this={titolo}>{@render fase()}</h2>
					{/if}
					<p class="contatore">
						{m.attivita_scheda({ numero: stato.indice + 1, totale: stato.totale })}
					</p>
				</div>
				<div class="riga-titolo">
					{#if scheda.titolo}
						<h2 class="titolo-scheda" id="{id}-scheda" tabindex="-1" bind:this={titolo}>
							{scheda.titolo}
						</h2>
					{/if}
					<LeggiAltaVoce
						testo={[scheda.titolo, scheda.testo].filter(Boolean).join('. ')}
						audio={scheda.audio}
						attivo={preferenze.letturaAltaVoce}
					/>
				</div>
				{#if scheda.testo}<p class="testo">{scheda.testo}</p>{/if}

				<svelte:boundary onerror={registraErrore}>
					{#await carica(scheda.widget)}
						<p class="attesa">{m.attivita_caricamento()}</p>
					{:then Widget}
						<Widget
							{scheda}
							props={scheda.props}
							contesto={{
								preferenze,
								seed,
								fase: scheda.fase,
								carica
							}}
							onesito={registra}
							onfine={avanti}
						/>
					{:catch}
						{@render nonCaricata()}
					{/await}
					{#snippet failed()}
						{@render nonCaricata()}
					{/snippet}
				</svelte:boundary>
			</section>
		{/key}

		{#if !stato.prima}
			<div class="indietro">
				<Button variante="quieta" icona="freccia-sinistra" onclick={() => vaiA(stato.indice - 1)}>
					{m.pulsante_indietro()}
				</Button>
			</div>
		{/if}
	{:else if risultato}
		<section class="riepilogo" aria-labelledby="{id}-riepilogo">
			<div class="riga-titolo">
				<h1 class="nome-attivita">{attivita.titolo}</h1>
				<LeggiAltaVoce testo={testoRiepilogo(risultato)} attivo={preferenze.letturaAltaVoce} />
			</div>
			{#if risultato.superata}
				<Stelle stelle={risultato.stelle} dimensione="3rem" anima />
				<h2 id="{id}-riepilogo" tabindex="-1" bind:this={titolo}>{m.riepilogo_completata()}</h2>
				<div class="imparato">
					<h3 class="etichetta">{m.riepilogo_imparato()}</h3>
					<p class="lead">{attivita.riepilogo}</p>
				</div>
				{#if risultato.prossimo}
					<Card as="aside" tono="evidenza" aria-labelledby="{id}-prossimo">
						<h3 class="etichetta" id="{id}-prossimo">{m.riepilogo_prossimo()}</h3>
						<p class="prossimo-titolo">{risultato.prossimo.titolo}</p>
						<p>{risultato.prossimo.obiettivo}</p>
						<div class="azioni">
							<Button href={indirizzo(risultato.prossimo)}>{m.riepilogo_continua()}</Button>
						</div>
					</Card>
				{/if}
				<div class="azioni">
					<Button variante="secondaria" icona="ricomincia" onclick={() => inizia(0)}>
						{m.attivita_ripeti()}
					</Button>
					{@render home()}
				</div>
			{:else if risultato.vuota}
				<h2 id="{id}-riepilogo" tabindex="-1" bind:this={titolo}>{m.riepilogo_vuota()}</h2>
				<p class="lead">{m.riepilogo_vuota_testo()}</p>
				<div class="azioni">
					<Button dimensione="l" onclick={() => inizia(primaSchedaProva(attivita.schede))}>
						{m.riepilogo_vuota_gioca()}
					</Button>
					{@render home()}
				</div>
			{:else}
				<h2 id="{id}-riepilogo" tabindex="-1" bind:this={titolo}>{m.riepilogo_quasi()}</h2>
				<p class="lead">{m.riepilogo_quasi_testo()}</p>
				<div class="azioni">
					<Button dimensione="l" onclick={() => inizia(primaSchedaProva(attivita.schede))}>
						{m.riepilogo_riprova()}
					</Button>
					<Button dimensione="l" variante="secondaria" onclick={() => inizia(0)}>
						{m.attivita_ricomincia()}
					</Button>
					{@render home()}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.attivita {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
		max-width: 44rem;
	}

	.obiettivo,
	.riepilogo {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
		max-width: var(--larghezza-testo);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2) var(--spazio-5);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.meta span {
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
	}

	.riga-titolo {
		display: flex;
		gap: var(--spazio-4);
		align-items: flex-start;
		justify-content: space-between;
	}

	.lead {
		font-size: var(--testo-l);
		line-height: 1.45;
	}

	.prerequisiti {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-1) var(--spazio-4);
		padding: 0;
		list-style: none;
	}
	.prerequisiti a {
		display: inline-flex;
		align-items: center;
		min-height: var(--target);
		font-weight: var(--peso-medio);
	}

	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}

	.nome-attivita {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
		font-weight: var(--peso-medio);
		letter-spacing: 0;
	}

	/* traccia delle fasi: gruppi di segmenti, uno per scheda */
	.testata {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	.traccia {
		display: flex;
		gap: var(--spazio-3);
	}
	.gruppo {
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		gap: var(--spazio-2);
		min-width: 0;
	}
	.segmenti {
		display: flex;
		gap: 3px;
		align-items: center;
		height: 0.75rem;
	}
	.segmento {
		flex: 1;
		height: 0.375rem;
		border-radius: var(--raggio-pieno);
		background: var(--colore-bordo);
		transition:
			background-color var(--durata-media) var(--easing),
			height var(--durata-media) var(--easing);
	}
	.segmento.fatto {
		background: var(--colore-accento);
	}
	.segmento.corrente {
		height: 0.75rem;
		background: var(--colore-accento);
	}
	.nome-fase {
		display: none;
		color: var(--colore-testo-tenue);
		font-size: var(--testo-xs);
		white-space: nowrap;
	}
	.attuale .nome-fase {
		color: var(--colore-testo);
		font-weight: var(--peso-medio);
	}
	@media (min-width: 40rem) {
		.gruppo {
			flex-basis: auto;
		}
		.nome-fase {
			display: block;
		}
	}

	.scheda {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
		padding: var(--spazio-5);
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
		animation: entra var(--durata-media) var(--easing-uscita);
	}
	@media (min-width: 40rem) {
		.scheda {
			padding: var(--spazio-6) var(--spazio-7);
		}
	}
	@keyframes entra {
		from {
			opacity: 0;
			transform: translateX(0.75rem);
		}
	}

	.riga-fase {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2) var(--spazio-4);
		align-items: center;
		justify-content: space-between;
		margin-block-end: calc(-1 * var(--spazio-2));
	}
	.fase {
		margin: 0;
		letter-spacing: 0;
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
		padding: var(--spazio-1) var(--spazio-3);
		border-radius: var(--raggio-pieno);
		background: var(--colore-accento-tenue);
		color: var(--colore-accento-forte);
		font-size: var(--testo-s);
		font-weight: var(--peso-medio);
	}
	.contatore {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.titolo-scheda {
		font-size: var(--testo-2xl);
	}
	.testo {
		font-size: var(--testo-l);
		max-width: var(--larghezza-testo);
	}
	.attesa {
		color: var(--colore-testo-tenue);
	}

	.indietro {
		display: flex;
	}

	.riepilogo h2 {
		font-size: var(--testo-titolo);
	}
	.imparato {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
	}
	.etichetta {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-m);
		font-weight: var(--peso-medio);
		letter-spacing: 0;
	}
	.prossimo-titolo {
		font-size: var(--testo-xl);
		font-weight: var(--peso-forte);
		line-height: var(--interlinea-titoli);
	}
</style>
