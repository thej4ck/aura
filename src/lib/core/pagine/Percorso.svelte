<script lang="ts">
	// Il percorso come un sentiero: una tappa per attività, con stato, stelle e prerequisiti suggeriti.
	// Il tratto già fatto è pieno, quello ancora da fare tratteggiato. Niente lucchetti: tutto si apre.
	import { m } from '#lib/paraglide/messages.js';
	import Icona from '../ui/Icona.svelte';
	import Stelle from '../ui/Stelle.svelte';
	import type { Tappa } from '../vista/pagine';
	import { indirizzoAttivita } from './indirizzi';
	import { NOMI_TAPPA } from './testi';

	type Props = {
		tappe: Tappa[];
		/** il modulo di ogni tappa: serve quando il percorso mescola moduli (pagina dell'area) */
		mostraModulo?: boolean;
		livello?: 2 | 3;
	};

	let { tappe, mostraModulo = false, livello = 3 }: Props = $props();
</script>

<ol class="percorso">
	{#each tappe as t, i (t.attivita.id)}
		<li class={['tappa', t.stato, { consigliata: t.consigliata }]}>
			<span class="segno" aria-hidden="true">
				{#if t.stato === 'completata'}<Icona nome="check" dimensione="1.25rem" />{:else}{i + 1}{/if}
			</span>
			<div class="corpo">
				{#if t.consigliata}
					<!-- come nella home: "Continua" per quella in corso, "Prossimo passo" per una nuova -->
					<p class="consiglio">
						<Icona nome="germoglio" />
						{t.stato === 'in_corso' ? m.percorso_continua() : m.percorso_consigliata()}
					</p>
				{/if}
				<svelte:element this={`h${livello}`} class="titolo">
					<a href={indirizzoAttivita(t.attivita)}>{t.attivita.titolo}</a>
				</svelte:element>
				<p class="meta">
					<span>
						<Icona nome={t.attivita.tipo === 'gioco' ? 'gioco' : 'libro'} />
						{t.attivita.tipo === 'gioco' ? m.attivita_gioco() : m.attivita_lezione()}
					</span>
					<span><Icona nome="orologio" /> {m.attivita_minuti({ count: t.attivita.minuti })}</span>
					{#if mostraModulo}<span>{t.modulo.icona} {t.modulo.titolo}</span>{/if}
				</p>
				<p class="stato">
					<span>{NOMI_TAPPA[t.stato]()}</span>
					{#if t.stelle > 0}<Stelle stelle={t.stelle} dimensione="1.125rem" />{/if}
				</p>
				{#if t.mancanti.length && t.stato !== 'completata'}
					<div class="prima">
						<p>{m.percorso_prerequisiti()}</p>
						<ul>
							{#each t.mancanti as a (a.id)}
								<li><a href={indirizzoAttivita(a)}>{a.titolo}</a></li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</li>
	{/each}
</ol>

<style>
	.percorso {
		--segno: 2.75rem;
		display: flex;
		flex-direction: column;
		padding: 0;
		list-style: none;
	}

	.tappa {
		position: relative;
		display: grid;
		grid-template-columns: var(--segno) minmax(0, 1fr);
		gap: var(--spazio-4);
		padding-block-end: var(--spazio-4);
	}
	/* il sentiero: dal segno di questa tappa al segno della prossima */
	.tappa:not(:last-child)::before {
		content: '';
		position: absolute;
		top: calc(var(--segno) + var(--spazio-1));
		bottom: var(--spazio-1);
		inset-inline-start: calc(var(--segno) / 2 - 1px);
		border-inline-start: 2px dashed var(--colore-bordo-forte);
	}
	.tappa.completata:not(:last-child)::before {
		border-inline-start-style: solid;
		border-color: var(--colore-accento);
	}

	.segno {
		display: grid;
		place-items: center;
		width: var(--segno);
		height: var(--segno);
		border: 2px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-pieno);
		background: var(--colore-superficie);
		color: var(--colore-testo-tenue);
		font-weight: var(--peso-forte);
		font-variant-numeric: tabular-nums;
	}
	.completata .segno {
		border-color: var(--colore-accento);
		background: var(--colore-accento);
		color: var(--colore-su-accento);
	}
	.in_corso .segno {
		border-color: var(--colore-accento);
		background: var(--colore-accento-tenue);
		color: var(--colore-accento-forte);
	}
	.consigliata .segno {
		box-shadow: 0 0 0 5px var(--colore-accento-tenue);
	}

	.corpo {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		padding: var(--spazio-4) var(--spazio-5);
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
	}
	.corpo:hover {
		border-color: var(--colore-bordo-forte);
	}
	.corpo:has(.titolo a:focus-visible) {
		outline: var(--bordo-focus) solid var(--colore-focus);
		outline-offset: 3px;
	}
	.consigliata .corpo {
		border: 2px solid var(--colore-accento);
	}

	.consiglio {
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
		color: var(--colore-accento-forte);
		font-size: var(--testo-s);
		font-weight: var(--peso-medio);
	}

	.titolo {
		font-size: var(--testo-l);
	}
	.titolo a {
		color: var(--colore-testo);
		text-decoration: none;
	}
	.titolo a:focus-visible {
		outline: none;
	}
	/* tutta la tappa porta all'attività; i link dei prerequisiti stanno sopra */
	.titolo a::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: var(--raggio-l);
	}
	.corpo:hover .titolo a {
		text-decoration: underline;
		text-decoration-color: var(--colore-accento);
		text-underline-offset: 0.2em;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-1) var(--spazio-4);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.meta span {
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
	}

	.stato {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
		align-items: center;
		font-size: var(--testo-s);
		font-weight: var(--peso-medio);
	}
	.completata .stato {
		color: var(--colore-successo);
	}
	.in_corso .stato {
		color: var(--colore-accento-forte);
	}

	.prima {
		position: relative;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--spazio-3);
		align-items: center;
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.prima ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--spazio-3);
		padding: 0;
		list-style: none;
	}
	.prima a {
		display: inline-flex;
		align-items: center;
		min-height: var(--target);
		font-weight: var(--peso-medio);
	}
</style>
