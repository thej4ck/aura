<script lang="ts">
	// «Segnala un problema»: dietro GateAdulti, poi l'anteprima di cosa arriverà su GitHub
	// (issue form precompilata). Mai dati personali né progressi: vedi segnalazione.ts.
	import { tick } from 'svelte';
	import { version } from '$app/env';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { ambienteBreve } from '../piattaforma';
	import {
		indirizzoSegnalazione,
		TIPI,
		type DatiSegnalazione,
		type TipoSegnalazione
	} from '../segnalazione';
	import Button from './Button.svelte';
	import GateAdulti from './GateAdulti.svelte';

	type Props = {
		/** id qualificato dell'attività, quando si segnala da una scheda */
		attivita?: string;
		/** scheda corrente, es. «3/12» */
		scheda?: string;
		variante?: 'secondaria' | 'quieta';
	};
	let { attivita, scheda, variante = 'quieta' }: Props = $props();

	const NOMI: Record<TipoSegnalazione, () => string> = {
		contenuti: m.segnala_tipo_contenuti,
		tecnico: m.segnala_tipo_tecnico,
		idea: m.segnala_tipo_idea
	};

	const id = $props.id();
	let gateAperto = $state(false);
	let dialog: HTMLDialogElement | undefined = $state();
	let tipo: TipoSegnalazione = $state('tecnico');
	let dati: DatiSegnalazione | undefined = $state();

	const voci = $derived(
		dati
			? ([
					[m.segnala_pagina, dati.pagina],
					[m.segnala_attivita, dati.attivita],
					[m.segnala_scheda, dati.scheda],
					[m.segnala_versione, dati.versione],
					[m.segnala_ambiente, dati.ambiente]
				] as const)
			: []
	);

	async function anteprima() {
		dati = {
			pagina: page.url.pathname,
			attivita,
			scheda,
			versione: version,
			ambiente: ambienteBreve()
		};
		tipo = attivita ? 'contenuti' : 'tecnico';
		await tick(); // prima si chiude il controllo per gli adulti
		dialog?.showModal();
	}

	function continua() {
		if (dati) window.open(indirizzoSegnalazione(tipo, dati), '_blank', 'noopener,noreferrer');
		dialog?.close();
	}
</script>

<Button {variante} icona="lucchetto" onclick={() => (gateAperto = true)}>
	{m.segnala_pulsante()}
</Button>

<GateAdulti bind:aperto={gateAperto} onsuperato={anteprima} />

<dialog bind:this={dialog} class="segnala" aria-labelledby="{id}-titolo">
	<div class="corpo">
		<h2 id="{id}-titolo">{m.segnala_pulsante()}</h2>
		<fieldset>
			<legend>{m.segnala_tipo()}</legend>
			{#each TIPI as t (t)}
				<label class="tipo">
					<input type="radio" name="{id}-tipo" value={t} bind:group={tipo} />
					{NOMI[t]()}
				</label>
			{/each}
		</fieldset>
		<p>{m.segnala_anteprima()}</p>
		<dl>
			{#each voci as [nome, valore] (nome)}
				{#if valore}
					<div>
						<dt>{nome()}</dt>
						<dd>{valore}</dd>
					</div>
				{/if}
			{/each}
		</dl>
		<p class="tenue">{m.segnala_nota()}</p>
		<div class="azioni">
			<Button icona="freccia-destra" onclick={continua}>{m.segnala_continua()}</Button>
			<Button variante="secondaria" onclick={() => dialog?.close()}>{m.gate_annulla()}</Button>
		</div>
	</div>
</dialog>

<style>
	.segnala {
		width: min(36rem, calc(100vw - 2 * var(--spazio-4)));
		padding: 0;
		border: 0;
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
		color: var(--colore-testo);
		box-shadow: var(--ombra-2);
		/* pagina per gli adulti */
		font-size: var(--testo-m);
	}
	.segnala::backdrop {
		background: var(--colore-velo);
	}
	.corpo {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
		padding: var(--spazio-6);
	}
	fieldset {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-block-end: var(--spazio-2);
		font-weight: var(--peso-medio);
	}
	.tipo {
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
		min-height: var(--target);
	}
	.tipo input {
		flex-shrink: 0;
		width: 1.25em;
		height: 1.25em;
		accent-color: var(--colore-accento);
	}
	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--spazio-1) var(--spazio-4);
		margin: 0;
		padding: var(--spazio-3) var(--spazio-4);
		border-radius: var(--raggio-s);
		background: var(--colore-sfondo);
	}
	dl > div {
		display: contents;
	}
	dt {
		color: var(--colore-testo-tenue);
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
		font-family: var(--font-mono, monospace);
	}
	.tenue {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
	/* su telefono il nome sopra il valore: due colonne spezzerebbero gli indirizzi lettera per lettera */
	@media (max-width: 30rem) {
		.corpo {
			padding: var(--spazio-4);
		}
		dl {
			grid-template-columns: 1fr;
		}
		dl > div + div dt {
			margin-block-start: var(--spazio-2);
		}
	}
</style>
