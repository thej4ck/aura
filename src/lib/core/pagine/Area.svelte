<script lang="ts">
	// Pagina di un'area: il percorso consigliato (con lo stato di ogni attività) e i moduli.
	import { m } from '#lib/paraglide/messages.js';
	import { catalogo as catalogoReale, type Catalogo } from '../contenuti/registry';
	import { progressi } from '../store/progressi.svelte';
	import ProblemaNoto from '../ui/ProblemaNoto.svelte';
	import ProgressRing from '../ui/ProgressRing.svelte';
	import { DOC_VUOTO, vistaArea } from '../vista/pagine';
	import Percorso from './Percorso.svelte';
	import SchedaModulo from './SchedaModulo.svelte';

	type Props = { area: string; catalogo?: Catalogo };
	let { area, catalogo = catalogoReale }: Props = $props();

	const id = $props.id();
	const v = $derived(vistaArea(catalogo, progressi.doc ?? DOC_VUOTO, area));
</script>

{#if v}
	<div class="pagina-area" style:--tinta={v.area.colore}>
		<header class="testata">
			<span class="icona" aria-hidden="true">{v.area.icona}</span>
			<div class="testi">
				<h1>{v.area.titolo}</h1>
				<p class="lead">{v.area.descrizione}</p>
				<p class="avanzamento">
					<span aria-hidden="true">
						<ProgressRing valore={v.avanzamento.percentuale} etichetta="" dimensione="2.25rem" />
					</span>
					{m.vista_avanzamento(v.avanzamento)}
				</p>
				<!-- il silenzio arriva alla prima «Ascolta»: l'adulto lo legge qui, prima delle attività -->
				<ProblemaNoto id="ios16-silenzioso" />
			</div>
		</header>

		<div class="colonne">
			<section class="percorso" aria-labelledby="{id}-percorso">
				<h2 id="{id}-percorso">{m.area_percorso()}</h2>
				<p class="tenue">{m.area_percorso_testo()}</p>
				<Percorso tappe={v.percorso} mostraModulo={v.moduli.length > 1} />
			</section>

			<section class="moduli" aria-labelledby="{id}-moduli">
				<h2 id="{id}-moduli">{m.area_moduli()}</h2>
				<ul>
					{#each v.moduli as voce (voce.modulo.id)}
						<li><SchedaModulo {voce} livello={3} mostraArea={false} /></li>
					{/each}
				</ul>
			</section>
		</div>
	</div>
{/if}

<style>
	.pagina-area {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-7);
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
	.tenue {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.avanzamento {
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
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
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	.percorso :global(.percorso) {
		margin-block-start: var(--spazio-3);
	}
	.moduli ul {
		display: grid;
		gap: var(--spazio-4);
		padding: 0;
		list-style: none;
	}
</style>
