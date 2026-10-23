<script lang="ts" module>
	import * as v from 'valibot';

	/** Props di `che-nota-e`: nessuna. Le note in gioco e le scatole vengono dai progressi del profilo. */
	export const schemaProps = v.object({});
</script>

<script lang="ts">
	// PG1 «Che nota è?»: una nota sul pentagramma, sette nomi da toccare. Al proprio ritmo, senza timer:
	// la nota dopo arriva solo quando si trova il nome. Conta il primo tentativo (esito e scatola di
	// Leitner); dopo SERIE_SBLOCCO giuste di fila arriva una nota nuova, presentata con il suo nome.
	// Si smette quando si vuole con «Ho finito», che compare dopo la prima risposta.
	import { untrack } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { creaCasuale } from '#lib/core/casuale.ts';
	import type { WidgetProps } from '#lib/core/motore/widget.ts';
	import { LETTERE, nomeNota, scomponi, type Lettera } from '#lib/core/musica/note.ts';
	import { nomePosizione, passo, posizione } from '#lib/core/musica/notazione.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Domanda from '#lib/core/ui/Domanda.svelte';
	import Button from '#lib/core/ui/Button.svelte';
	import Staff from '#lib/core/ui/Staff.svelte';
	import {
		estrai,
		leggiLeitner,
		rispondi,
		sbloccate,
		vicina,
		type StatoLettura
	} from '../lettura.ts';

	let { contesto, onesito, onfine }: WidgetProps = $props();
	const id = $props.id();

	const MODULO = 'musica.pentagramma';
	const COLORI: Record<Lettera, string> = {
		C: 'do',
		D: 're',
		E: 'mi',
		F: 'fa',
		G: 'sol',
		A: 'la',
		B: 'si'
	};

	const nomi = $derived(contesto.preferenze.nomiNote);
	// seed e scatole si leggono una volta, all'inizio della scheda
	const r = creaCasuale(untrack(() => contesto.seed));
	const iniziale = leggiLeitner(progressi.doc?.dati[MODULO]?.leitner);
	let stato = $state.raw<StatoLettura>({ leitner: iniziale, serie: 0 });
	let nota = $state(estrai(iniziale, r));
	/** nota appena sbloccata: si presenta con il nome scritto e non conta */
	let nuova = $state(false);
	let provate = $state<Lettera[]>([]);
	let lette = $state(0);
	let feedback = $state('');
	let trovata = $state(false);

	const giusta = $derived(scomponi(nota).lettera);
	const inGioco = $derived(sbloccate(stato.leitner).map((n) => nomeNota(n, nomi)));

	const tipo = (q: number) => {
		const t = posizione(q).tipo;
		return t === 'spazio-fuori' ? 'fuori' : t;
	};
	/** "Il Mi sta sulla prima linea." */
	const doveSta = (altezza: string) =>
		m.staff_tocca_dove({
			tipo: tipo(passo(altezza)),
			posizione: nomePosizione(passo(altezza)),
			nome: nomeNota(altezza, nomi)
		});

	function salva() {
		if (progressi.doc) progressi.aggiornaDati(MODULO, { leitner: stato.leitner });
	}

	function scegli(l: Lettera) {
		if (provate.includes(l)) return;
		const ok = l === giusta;
		let sbloccata: string | undefined;
		if (provate.length === 0 && !nuova) {
			onesito({ corretto: ok, item: nota });
			const s = rispondi(stato, nota, ok);
			stato = { leitner: s.leitner, serie: s.serie };
			sbloccata = s.sbloccata;
			salva();
		}
		if (!ok) {
			provate.push(l);
			const scelta = vicina(l, nota);
			const elenco = (note: string[]) => note.map((n) => nomeNota(n, nomi)).join(', ');
			// prima: dove sta il nome scelto e verso dove guardare; poi anche dove sta questa nota
			// e come si contano linee e spazi
			feedback = [
				doveSta(scelta),
				provate.length === 1
					? passo(nota) > passo(scelta)
						? m.pentagramma_che_nota_su()
						: m.pentagramma_che_nota_giu()
					: [
							m.pentagramma_che_nota_dove({
								tipo: tipo(passo(nota)),
								posizione: nomePosizione(passo(nota))
							}),
							m.pentagramma_che_nota_aiuto({
								linee: elenco(['E4', 'G4', 'B4', 'D5', 'F5']),
								spazi: elenco(['F4', 'A4', 'C5', 'E5'])
							})
						].join(' ')
			].join(' ');
			trovata = false;
			return;
		}
		// trovata: subito la nota dopo, senza fretta
		feedback = m.pentagramma_che_nota_giusta({ nome: nomeNota(nota, nomi) });
		lette++;
		trovata = true;
		provate = [];
		if (sbloccata) {
			nota = sbloccata;
			nuova = true;
			feedback += ` ${m.pentagramma_che_nota_nuova({ nome: nomeNota(sbloccata, nomi) })} ${doveSta(sbloccata)}`;
		} else {
			nota = estrai(stato.leitner, r, nota);
			nuova = false;
		}
	}
</script>

<div class="gioco">
	{#key lette}
		<div class="nota">
			<Staff
				rigo={{ chiave: 'violino', note: [{ altezza: nota }] }}
				etichetta={m.pentagramma_che_nota_rigo()}
				etichette={nuova}
				colori={nuova}
				nomiNote={nomi}
			/>
		</div>
	{/key}

	<div class="nomi" role="group" aria-labelledby="{id}-domanda">
		<Domanda
			testo={m.pentagramma_che_nota_domanda()}
			poi={[feedback, ...LETTERE.map((l) => nomeNota(`${l}4`, nomi))]}
			attivo={contesto.preferenze.letturaAltaVoce}
			id="{id}-domanda"
		/>
		<ul>
			{#each LETTERE as l (l)}
				{@const provata = provate.includes(l)}
				<li>
					<button
						type="button"
						class={['nome', `nota-${COLORI[l]}`, { provata }]}
						aria-disabled={provata}
						onclick={() => scegli(l)}
					>
						{nomeNota(`${l}4`, nomi)}
						{#if provata}<span class="sr-only">({m.scelta_provata()})</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
	</div>

	<Avviso tono={trovata ? 'successo' : 'attenzione'} testo={feedback} />

	<div class="piede">
		<p class="conta">
			<span>{m.pentagramma_che_nota_lette({ count: lette })}</span>
			<span class="in-gioco">{m.pentagramma_che_nota_in_gioco({ note: inGioco.join(', ') })}</span>
		</p>
		<!-- si può smettere dopo la prima risposta: un gioco senza risposte non misura niente -->
		{#if lette || provate.length}
			<Button variante="secondaria" dimensione="l" onclick={onfine}>
				{m.pentagramma_ho_finito()}
			</Button>
		{/if}
	</div>
</div>

<style>
	.gioco {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
	}
	.nota {
		animation: entra var(--durata-lunga) var(--easing-uscita);
	}
	@keyframes entra {
		from {
			opacity: 0;
			transform: translateY(0.5rem);
		}
	}
	.nomi {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(4.5rem, 1fr));
		gap: var(--spazio-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.nome {
		width: 100%;
		min-height: calc(var(--target) + var(--spazio-2));
		padding: var(--spazio-2) var(--spazio-3);
		border: 2px solid transparent;
		border-radius: var(--raggio-m);
		background: var(--colore-nota);
		color: var(--colore-su-nota);
		font-size: var(--testo-xl);
		font-weight: var(--peso-forte);
		cursor: pointer;
		touch-action: manipulation;
	}
	.nome:hover:not([aria-disabled='true']) {
		border-color: var(--colore-testo);
	}
	/* già provato: si spegne, senza segni di errore; il nome resta leggibile */
	.provata {
		border: 2px dashed var(--colore-nota);
		background: var(--colore-superficie);
		color: var(--colore-testo-tenue);
		cursor: default;
	}
	.nota-do {
		--colore-nota: var(--nota-do);
	}
	.nota-re {
		--colore-nota: var(--nota-re);
	}
	.nota-mi {
		--colore-nota: var(--nota-mi);
	}
	.nota-fa {
		--colore-nota: var(--nota-fa);
	}
	.nota-sol {
		--colore-nota: var(--nota-sol);
	}
	.nota-la {
		--colore-nota: var(--nota-la);
	}
	.nota-si {
		--colore-nota: var(--nota-si);
	}
	.piede {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-4);
		align-items: center;
		justify-content: space-between;
	}
	.conta {
		display: flex;
		flex-direction: column;
	}
	.in-gioco {
		color: var(--colore-testo-tenue);
	}
</style>
