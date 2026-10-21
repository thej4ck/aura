<script lang="ts">
	// Home: benvenuto alla prima visita, poi Continua da dove eri · Il prossimo passo · Da ripassare, e le aree.
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { catalogo as catalogoReale, type Catalogo } from '../contenuti/registry';
	import { progressi } from '../store/progressi.svelte';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import Icona from '../ui/Icona.svelte';
	import ProgressRing from '../ui/ProgressRing.svelte';
	import { DOC_VUOTO, vistaHome } from '../vista/pagine';
	import { indirizzoArea, indirizzoAttivita } from './indirizzi';

	type Props = { catalogo?: Catalogo };
	let { catalogo = catalogoReale }: Props = $props();

	const id = $props.id();
	const doc = $derived(progressi.doc);
	const v = $derived(vistaHome(catalogo, doc ?? DOC_VUOTO, new Date()));
	const alias = $derived(doc?.profilo.alias);
	const inizio = $derived(v.prossimo ? indirizzoAttivita(v.prossimo.attivita) : resolve('/moduli'));
</script>

<div class="home">
	<header class="saluto">
		<h1>{alias ? m.home_titolo_nome({ nome: alias }) : m.home_titolo()}</h1>
		{#if doc}
			<p class="lead">{v.primaVisita ? m.home_benvenuto() : m.home_ritorno()}</p>
		{/if}
	</header>

	{#if v.aree.length === 0}
		<Card tono="tenue" class="vuoto">
			<span class="germoglio"><Icona nome="germoglio" dimensione="2.5rem" /></span>
			<h2>{m.home_vuoto_titolo()}</h2>
			<p>{m.home_vuoto_testo()}</p>
		</Card>
	{:else if doc && v.primaVisita}
		<Card as="section" tono="evidenza" class="benvenuto" aria-labelledby="{id}-come">
			<h2 id="{id}-come">{m.home_come_titolo()}</h2>
			<ol class="come">
				<li><Icona nome="germoglio" dimensione="1.5rem" /> {m.home_come_scegli()}</li>
				<li><Icona nome="insieme" dimensione="1.5rem" /> {m.home_come_fasi()}</li>
				<li><Icona nome="lucchetto" dimensione="1.5rem" /> {m.home_come_salva()}</li>
			</ol>
			<div class="azioni">
				<Button dimensione="l" href={inizio}>{m.home_comincia()}</Button>
				<Button variante="quieta" href={resolve('/genitori')}>{m.home_adulti()}</Button>
			</div>
		</Card>
	{:else if doc}
		<div class={['passi', { doppi: v.riprendi && v.prossimo }]}>
			{#if v.riprendi}
				{@const r = v.riprendi}
				<Card as="section" tono="evidenza" class="passo" aria-labelledby="{id}-riprendi">
					<h2 class="etichetta" id="{id}-riprendi">{m.home_riprendi()}</h2>
					<p class="titolo-attivita grande">{r.attivita.titolo}</p>
					<p class="modulo">{r.modulo.icona} {r.modulo.titolo}</p>
					<div class="schede" aria-hidden="true">
						{#each { length: r.totale }, i (i)}
							<span class={['segmento', { fatto: i < r.scheda, corrente: i === r.scheda }]}></span>
						{/each}
					</div>
					<p class="contatore">{m.attivita_scheda({ numero: r.scheda + 1, totale: r.totale })}</p>
					<div class="azioni">
						<Button dimensione="l" icona="play" href={indirizzoAttivita(r.attivita)}>
							{m.home_riprendi_azione()}
						</Button>
					</div>
				</Card>
			{/if}
			{#if v.prossimo}
				{@const p = v.prossimo}
				<Card
					as="section"
					tono={v.riprendi ? 'normale' : 'evidenza'}
					class="passo"
					aria-labelledby="{id}-prossimo"
				>
					<h2 class="etichetta" id="{id}-prossimo">{m.home_prossimo()}</h2>
					<p class={['titolo-attivita', { grande: !v.riprendi }]}>{p.attivita.titolo}</p>
					<p class="modulo">{p.modulo.icona} {p.modulo.titolo}</p>
					<p class="obiettivo">{p.attivita.obiettivo}</p>
					<div class="azioni">
						<Button
							dimensione={v.riprendi ? 'm' : 'l'}
							variante={v.riprendi ? 'secondaria' : 'primaria'}
							href={indirizzoAttivita(p.attivita)}
						>
							{m.home_inizia()}
						</Button>
					</div>
				</Card>
			{/if}
			{#if !v.riprendi && !v.prossimo}
				<Card tono="evidenza" class="passo">
					<p class="lead">{m.home_finito()}</p>
				</Card>
			{/if}
		</div>

		{#if v.ripassi.length}
			<section class="ripassi" aria-labelledby="{id}-ripassi">
				<h2 id="{id}-ripassi">{m.home_ripassi()}</h2>
				<p class="tenue">{m.home_ripassi_testo()}</p>
				<ul>
					{#each v.ripassi as r (r.attivita.id)}
						<li>
							<a href={indirizzoAttivita(r.attivita)}>
								<Icona nome="ricomincia" />
								<span>{r.attivita.titolo}</span>
								<span class="tenue">{r.modulo.icona} {r.modulo.titolo}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}

	{#if v.aree.length}
		<section class="aree" aria-labelledby="{id}-aree">
			<div class="riga-titolo">
				<h2 id="{id}-aree">{m.home_aree()}</h2>
				<a class="tutti" href={resolve('/moduli')}>{m.home_tutti_moduli()}</a>
			</div>
			<ul>
				{#each v.aree as { area, avanzamento } (area.id)}
					<li class="area" style:--tinta={area.colore}>
						<span class="icona" aria-hidden="true">{area.icona}</span>
						<div class="testo-area">
							<h3><a href={indirizzoArea(area.id)}>{area.titolo}</a></h3>
							<p class="tenue">{area.descrizione}</p>
						</div>
						<p class="avanzamento">
							<span aria-hidden="true">
								<ProgressRing valore={avanzamento.percentuale} etichetta="" dimensione="2.5rem" />
							</span>
							<span>{m.vista_avanzamento(avanzamento)}</span>
						</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-7);
	}

	.saluto {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	.lead {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
	}
	.tenue {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}

	.home :global(.vuoto),
	.home :global(.benvenuto) {
		gap: var(--spazio-4);
		max-width: 44rem;
		padding: var(--spazio-6);
	}
	.germoglio {
		color: var(--colore-accento);
	}

	.come {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		padding: 0;
		list-style: none;
		font-size: var(--testo-l);
	}
	.come li {
		display: flex;
		gap: var(--spazio-3);
		align-items: flex-start;
	}
	.come :global(.icona) {
		margin-block-start: 0.15em;
		color: var(--colore-accento-forte);
	}

	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
		align-items: center;
		margin-block-start: var(--spazio-2);
	}

	.passi {
		display: grid;
		gap: var(--spazio-5);
		max-width: 44rem;
	}
	@media (min-width: 52rem) {
		.passi.doppi {
			grid-template-columns: 3fr 2fr;
			max-width: none;
		}
	}
	.home :global(.passo) {
		padding: var(--spazio-6);
	}
	.etichetta {
		color: var(--colore-accento-forte);
		font-size: var(--testo-m);
		font-weight: var(--peso-medio);
		letter-spacing: 0;
	}
	.titolo-attivita {
		font-size: var(--testo-xl);
		font-weight: var(--peso-forte);
		line-height: var(--interlinea-titoli);
	}
	.titolo-attivita.grande {
		font-size: var(--testo-2xl);
	}
	.modulo,
	.contatore,
	.obiettivo {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}

	.schede {
		display: flex;
		gap: 3px;
		align-items: center;
		height: 0.75rem;
		max-width: 20rem;
		margin-block-start: var(--spazio-2);
	}
	.segmento {
		flex: 1;
		height: 0.375rem;
		border-radius: var(--raggio-pieno);
		background: color-mix(in srgb, var(--colore-accento) 25%, transparent);
	}
	.segmento.fatto {
		background: var(--colore-accento);
	}
	.segmento.corrente {
		height: 0.75rem;
		background: var(--colore-accento);
	}

	.ripassi {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	.ripassi ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
		padding: 0;
		list-style: none;
	}
	.ripassi a {
		display: inline-flex;
		flex-wrap: wrap;
		gap: var(--spazio-1) var(--spazio-3);
		align-items: center;
		min-height: var(--target);
		padding: var(--spazio-2) var(--spazio-4);
		border: 1px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-m);
		background: var(--colore-superficie);
		color: var(--colore-testo);
		font-weight: var(--peso-medio);
		text-decoration: none;
	}
	.ripassi a:hover {
		border-color: var(--colore-accento);
	}
	.ripassi a :global(.icona) {
		color: var(--colore-accento);
	}

	.aree {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	.riga-titolo {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2) var(--spazio-4);
		align-items: baseline;
		justify-content: space-between;
	}
	.tutti {
		display: inline-flex;
		align-items: center;
		min-height: var(--target);
		font-weight: var(--peso-medio);
	}
	.aree ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
		gap: var(--spazio-4);
		padding: 0;
		list-style: none;
	}
	.area {
		position: relative;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: var(--spazio-3) var(--spazio-4);
		padding: var(--spazio-5);
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
	}
	.area:hover {
		border-color: var(--colore-bordo-forte);
	}
	.area:has(a:focus-visible) {
		outline: var(--bordo-focus) solid var(--colore-focus);
		outline-offset: 3px;
	}
	.area .icona {
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: var(--raggio-m);
		background: color-mix(in srgb, var(--tinta) 18%, var(--colore-superficie));
		font-size: 1.9rem;
		line-height: 1;
	}
	.testo-area {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-1);
	}
	.area h3 {
		font-size: var(--testo-xl);
	}
	.area h3 a {
		color: var(--colore-testo);
		text-decoration: none;
	}
	.area h3 a:focus-visible {
		outline: none;
	}
	.area h3 a::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: var(--raggio-l);
	}
	.area:hover h3 a {
		text-decoration: underline;
		text-decoration-color: var(--colore-accento);
		text-underline-offset: 0.2em;
	}
	.avanzamento {
		grid-column: 1 / -1;
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.avanzamento > span:first-child {
		display: inline-flex;
	}
</style>
