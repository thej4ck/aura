<script lang="ts">
	// Sezione della vetrina: i widget musicali core da soli, con gli esiti che manderebbero al motore.
	// Ogni esempio ha il nome del suo id: è il nome del widget, o del widget con props particolari.
	import type { Scheda } from '#lib/core/contenuti/schema.ts';
	import { caricaWidget, type EsitoWidget } from '#lib/core/motore/widget.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import { PREFERENZE_PREDEFINITE } from '#lib/core/store/schema-progressi.ts';
	import Button from '#lib/core/ui/Button.svelte';
	import { m } from '#lib/paraglide/messages.js';

	const ESEMPI: Scheda[] = [
		{
			id: 'ascolta',
			fase: 'scopri',
			widget: 'ascolta',
			props: { note: ['C4', 'E4', 'G4', 'C5'], etichette: true, colori: true }
		},
		{ id: 'staff-tocca', fase: 'prova', widget: 'staff-tocca', props: { nota: 'G4' } },
		{ id: 'canta-nota', fase: 'prova', widget: 'canta-nota', props: { nota: 'A4' } },
		{
			id: 'canta-nota-da-leggere',
			fase: 'prova',
			widget: 'canta-nota',
			props: { nota: 'A4', suonaPrima: false }
		},
		{
			id: 'canta-sequenza',
			fase: 'prova',
			widget: 'canta-sequenza',
			props: { note: ['G4', 'A4', 'B4'], etichette: true, item: 'sol-la-si' }
		}
	];

	const preferenze = $derived(progressi.doc?.preferenze ?? PREFERENZE_PREDEFINITE);
	/** cambia con «Ricomincia»: il widget riparte da zero (e chiude il microfono) */
	let giri: Record<string, number> = $state({});
	let esiti: Record<string, string[]> = $state({});

	function registra(id: string, e?: EsitoWidget) {
		const riga = e
			? m.widget_dev_esito({ corretto: String(e.corretto), item: e.item ?? '–' })
			: m.widget_dev_fine();
		esiti[id] = [...(esiti[id] ?? []), riga];
	}

	function ricomincia(id: string) {
		giri[id] = (giri[id] ?? 0) + 1;
		esiti[id] = [];
	}
</script>

<section aria-labelledby="sez-widget">
	<h2 id="sez-widget">{m.widget_dev_titolo()}</h2>
	<p class="nota">{m.widget_dev_testo()}</p>
	{#each ESEMPI as scheda (scheda.id)}
		<article class="esempio" aria-labelledby="widget-{scheda.id}">
			<header>
				<h3 id="widget-{scheda.id}"><code>{scheda.id}</code></h3>
				<Button variante="quieta" icona="ricomincia" onclick={() => ricomincia(scheda.id)}>
					{m.widget_dev_ricomincia()}
				</Button>
			</header>
			<div class="widget">
				{#key giri[scheda.id]}
					{#await caricaWidget(scheda.widget) then Widget}
						<Widget
							{scheda}
							props={scheda.props}
							contesto={{ preferenze, seed: 1, fase: scheda.fase, carica: caricaWidget }}
							onesito={(e: EsitoWidget) => registra(scheda.id, e)}
							onfine={() => registra(scheda.id)}
						/>
					{/await}
				{/key}
			</div>
			<div class="esiti">
				<h4>{m.widget_dev_esiti()}</h4>
				<ol aria-label="{m.widget_dev_esiti()} {scheda.id}">
					{#each esiti[scheda.id] ?? [] as riga, i (i)}
						<li><code>{riga}</code></li>
					{:else}
						<li class="vuoto">{m.widget_dev_nessun_esito()}</li>
					{/each}
				</ol>
			</div>
		</article>
	{/each}
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
	}
	h2 {
		padding-block-end: var(--spazio-2);
		border-bottom: 1px solid var(--colore-bordo);
	}
	.nota {
		color: var(--colore-testo-tenue);
	}
	.esempio {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
		max-width: 44rem;
		padding: var(--spazio-5);
		border: 2px dashed var(--colore-bordo);
		border-radius: var(--raggio-l);
	}
	header {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
		align-items: center;
		justify-content: space-between;
	}
	.widget {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
	}
	.esiti {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		font-size: var(--testo-s);
	}
	.esiti h4 {
		font-size: var(--testo-s);
		font-weight: var(--peso-medio);
	}
	ol {
		margin: 0;
		padding-inline-start: var(--spazio-5);
	}
	.vuoto {
		list-style: none;
		margin-inline-start: calc(-1 * var(--spazio-5));
		color: var(--colore-testo-tenue);
	}
	code {
		font-size: var(--testo-xs);
	}
</style>
