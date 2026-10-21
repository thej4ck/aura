<script lang="ts">
	// Pagina di un modulo: introduzione (Cosa imparerai · Come funziona · Cosa serve · Consigli per gli adulti),
	// le attività come percorso con stato, stelle e prerequisiti suggeriti, e il glossario.
	import { m } from '#lib/paraglide/messages.js';
	import { catalogo as catalogoReale, type Catalogo } from '../contenuti/registry';
	import { progressi } from '../store/progressi.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import ProgressRing from '../ui/ProgressRing.svelte';
	import { DOC_VUOTO, vistaModulo } from '../vista/pagine';
	import { indirizzoArea, indirizzoAttivita } from './indirizzi';
	import Percorso from './Percorso.svelte';
	import { etichettaEta } from './testi';

	/** `modulo`: id qualificato `area.modulo` */
	type Props = { modulo: string; catalogo?: Catalogo };
	let { modulo, catalogo = catalogoReale }: Props = $props();

	const id = $props.id();
	const v = $derived(vistaModulo(catalogo, progressi.doc ?? DOC_VUOTO, modulo));
	const consigliata = $derived(v?.percorso.find((t) => t.consigliata));
</script>

{#if v}
	{@const intro = v.modulo.introduzione}
	<div class="pagina-modulo" style:--tinta={v.area.colore}>
		<a class="indietro" href={indirizzoArea(v.area.id)}>
			<span aria-hidden="true">{v.area.icona}</span>
			{m.modulo_torna({ area: v.area.titolo })}
		</a>

		<header class="testata">
			<span class="icona" aria-hidden="true">{v.modulo.icona}</span>
			<div class="testi">
				<h1>{v.modulo.titolo}</h1>
				<p class="lead">{v.modulo.descrizione}</p>
				<p class="meta">
					<span>{etichettaEta(v.modulo.eta)}</span>
					<span class="avanzamento">
						<span aria-hidden="true">
							<ProgressRing valore={v.avanzamento.percentuale} etichetta="" dimensione="2rem" />
						</span>
						{m.vista_avanzamento(v.avanzamento)}
					</span>
				</p>
				{#if consigliata}
					<div>
						<Button dimensione="l" icona="play" href={indirizzoAttivita(consigliata.attivita)}>
							{consigliata.stato === 'in_corso' ? m.modulo_continua() : m.modulo_inizia()}
						</Button>
					</div>
				{/if}
			</div>
		</header>

		<div class="colonne">
			<div class="principale">
				<section aria-labelledby="{id}-imparerai">
					<h2 id="{id}-imparerai">{m.modulo_cosa_imparerai()}</h2>
					<ul class="elenco">
						{#each intro.cosaImparerai as punto, i (i)}<li>{punto}</li>{/each}
					</ul>
				</section>
				<section aria-labelledby="{id}-funziona">
					<h2 id="{id}-funziona">{m.modulo_come_funziona()}</h2>
					<p class="testo">{intro.comeFunziona}</p>
				</section>
				{#if intro.cosaServe.length}
					<section aria-labelledby="{id}-serve">
						<h2 id="{id}-serve">{m.modulo_cosa_serve()}</h2>
						<ul class="elenco">
							{#each intro.cosaServe as punto, i (i)}<li>{punto}</li>{/each}
						</ul>
					</section>
				{/if}
				<section aria-labelledby="{id}-attivita">
					<h2 id="{id}-attivita">{m.modulo_attivita()}</h2>
					<Percorso tappe={v.percorso} />
				</section>
			</div>

			<div class="laterale">
				{#if intro.consigliPerAdulti.length}
					<Card as="aside" tono="tenue" aria-labelledby="{id}-consigli">
						<h2 id="{id}-consigli">{m.modulo_consigli()}</h2>
						<ul class="elenco">
							{#each intro.consigliPerAdulti as punto, i (i)}<li>{punto}</li>{/each}
						</ul>
					</Card>
				{/if}
				{#if v.modulo.glossario.length}
					<section aria-labelledby="{id}-glossario">
						<h2 id="{id}-glossario">{m.modulo_glossario()}</h2>
						<dl class="glossario">
							{#each v.modulo.glossario as voce (voce.termine)}
								<div>
									<dt>{voce.termine}</dt>
									<dd>{voce.spiegazione}</dd>
								</div>
							{/each}
						</dl>
					</section>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.pagina-modulo {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-6);
	}
	.indietro {
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
		align-self: flex-start;
		min-height: var(--target);
		font-weight: var(--peso-medio);
	}

	.testata {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-4) var(--spazio-5);
		align-items: flex-start;
	}
	.icona {
		display: grid;
		flex: none;
		place-items: center;
		width: 4.5rem;
		height: 4.5rem;
		border-radius: var(--raggio-l);
		background: color-mix(in srgb, var(--tinta) 20%, var(--colore-superficie));
		font-size: 2.5rem;
		line-height: 1;
	}
	.testi {
		display: flex;
		flex: 1 1 18rem;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	.lead {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2) var(--spazio-5);
		align-items: center;
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.avanzamento {
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
	}
	.avanzamento span {
		display: inline-flex;
	}

	.colonne {
		display: grid;
		gap: var(--spazio-7);
	}
	@media (min-width: 56rem) {
		.colonne {
			grid-template-columns: minmax(0, 3fr) minmax(16rem, 2fr);
			align-items: start;
		}
	}
	.principale,
	.laterale {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-6);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	.testo {
		max-width: var(--larghezza-testo);
	}
	.elenco {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		max-width: var(--larghezza-testo);
		padding-inline-start: 1.25em;
	}
	.elenco li::marker {
		color: var(--colore-accento);
	}

	.glossario {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		margin: 0;
	}
	.glossario div {
		padding-block-end: var(--spazio-3);
		border-bottom: 1px solid var(--colore-bordo);
	}
	dt {
		font-weight: var(--peso-forte);
	}
	dd {
		margin: 0;
		color: var(--colore-testo-tenue);
	}
</style>
