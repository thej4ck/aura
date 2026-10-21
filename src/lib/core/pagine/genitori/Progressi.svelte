<script lang="ts">
	// Progressi del profilo in uso, modulo per modulo: attività fatte e da fare, competenze, prossimo passo.
	import { m } from '#lib/paraglide/messages.js';
	import type { Catalogo } from '../../contenuti/registry';
	import { LIVELLI } from '../../padronanza';
	import { progressi } from '../../store/progressi.svelte';
	import Icona from '../../ui/Icona.svelte';
	import Stelle from '../../ui/Stelle.svelte';
	import { progressiPerModulo } from '../../vista/genitori';
	import { indirizzoAttivita } from '../indirizzi';
	import { NOMI_LIVELLO, NOMI_STATO } from '../testi';

	let { catalogo }: { catalogo: Catalogo } = $props();

	const doc = $derived(progressi.doc);
	const voci = $derived(doc ? progressiPerModulo(catalogo, doc, new Date()) : []);
</script>

{#if doc}
	<p class="lead">{m.genitori_progressi_intro()}</p>
	<p class="profilo">
		<span class="avatar" aria-hidden="true">{doc.profilo.avatar}</span>
		{doc.profilo.alias ?? m.genitori_profilo_senza_nome({ avatar: doc.profilo.avatar })}
	</p>

	{#if voci.length === 0}
		<p class="tenue">{m.genitori_progressi_vuoto()}</p>
	{:else}
		<div class="moduli">
			{#each voci as v (v.modulo.id)}
				<details open={v.avanzamento.stato === 'in_corso'}>
					<summary>
						<span class="icona" aria-hidden="true">{v.modulo.icona}</span>
						<h3>
							{v.modulo.titolo}
							<span class="area">{v.area.titolo}</span>
						</h3>
						<span class="conto">
							<span>{NOMI_STATO[v.avanzamento.stato]()}</span>
							<span>{m.vista_avanzamento(v.avanzamento)}</span>
						</span>
					</summary>
					<div class="dettagli">
						<div class="colonne">
							<div>
								<h4>{m.genitori_fatte()}</h4>
								{#if v.fatte.length}
									<ul>
										{#each v.fatte as t (t.attivita.id)}
											<li>
												<span>{t.attivita.titolo}</span>
												<Stelle stelle={t.stelle} dimensione="1rem" />
											</li>
										{/each}
									</ul>
								{:else}
									<p class="tenue">{m.genitori_nessuna()}</p>
								{/if}
							</div>
							<div>
								<h4>{m.genitori_da_fare()}</h4>
								{#if v.daFare.length}
									<ul>
										{#each v.daFare as t (t.attivita.id)}
											<li>
												<span>{t.attivita.titolo}</span>
												{#if t.stato === 'in_corso'}
													<span class="etichetta">{m.percorso_in_corso()}</span>
												{/if}
											</li>
										{/each}
									</ul>
								{:else}
									<p class="tenue">{m.genitori_tutte_fatte()}</p>
								{/if}
							</div>
						</div>

						{#if v.competenze.length}
							<h4>{m.genitori_competenze()}</h4>
							<ul class="competenze">
								{#each v.competenze as c (c.competenza.id)}
									<li>
										<span>{c.competenza.titolo}</span>
										<span class="livello">
											<span class="tacche" aria-hidden="true">
												{#each [1, 2, 3, 4] as n (n)}
													<span class={['tacca', { piena: n <= c.livello }]}></span>
												{/each}
											</span>
											<span class="sr-only">
												{m.genitori_livello({
													numero: c.livello,
													nome: NOMI_LIVELLO[LIVELLI[c.livello]]()
												})}
											</span>
											<span aria-hidden="true">{NOMI_LIVELLO[LIVELLI[c.livello]]()}</span>
											{#if c.daRipassare}
												<span class="etichetta">
													<Icona nome="ricomincia" />
													{m.genitori_da_ripassare()}
												</span>
											{/if}
										</span>
									</li>
								{/each}
							</ul>
						{/if}

						{#if v.prossimo}
							<p class="prossimo">
								<Icona nome="germoglio" />
								<a href={indirizzoAttivita(v.prossimo.attivita)}>
									{m.genitori_prossimo({ titolo: v.prossimo.attivita.titolo })}
								</a>
							</p>
						{/if}
					</div>
				</details>
			{/each}
		</div>
	{/if}
{/if}

<style>
	.lead {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
	}
	.tenue {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.profilo {
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
		font-weight: var(--peso-medio);
	}
	.avatar {
		font-size: 1.75rem;
		line-height: 1;
	}

	.moduli {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	details {
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
	}
	summary {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: var(--spazio-1) var(--spazio-4);
		align-items: center;
		min-height: var(--target);
		padding: var(--spazio-4) var(--spazio-5);
		border-radius: var(--raggio-l);
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary:hover h3 {
		text-decoration: underline;
		text-decoration-color: var(--colore-accento);
		text-underline-offset: 0.2em;
	}
	.icona {
		grid-row: span 2;
		font-size: 1.75rem;
		line-height: 1;
	}
	summary h3 {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--spazio-3);
		align-items: baseline;
		font-size: var(--testo-l);
	}
	/* il triangolo nativo è nascosto: al suo posto una freccia che gira */
	summary h3::after {
		content: '';
		width: 0.55em;
		height: 0.55em;
		margin-inline-start: auto;
		border-right: 2px solid var(--colore-testo-tenue);
		border-bottom: 2px solid var(--colore-testo-tenue);
		transform: translateY(-0.15em) rotate(45deg);
		transition: transform var(--durata-breve) var(--easing);
	}
	details[open] summary h3::after {
		transform: translateY(0.1em) rotate(-135deg);
	}
	.area {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
		font-weight: var(--peso-normale);
	}
	.conto {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--spazio-4);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}

	.dettagli {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		padding: 0 var(--spazio-5) var(--spazio-5);
	}
	.colonne {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
		gap: var(--spazio-4) var(--spazio-6);
	}
	.colonne > div {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
	}
	h4 {
		margin: 0;
		font-size: var(--testo-s);
		font-weight: var(--peso-forte);
	}
	ul {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-1) var(--spazio-3);
		align-items: center;
	}
	.competenze li {
		justify-content: space-between;
		padding-block: var(--spazio-1);
		border-bottom: 1px solid var(--colore-bordo);
	}
	.livello {
		display: inline-flex;
		flex-wrap: wrap;
		gap: var(--spazio-2) var(--spazio-3);
		align-items: center;
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.tacche {
		display: inline-flex;
		gap: 3px;
	}
	.tacca {
		width: 0.75rem;
		height: 0.75rem;
		border: 1.5px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-pieno);
	}
	.tacca.piena {
		border-color: var(--colore-accento);
		background: var(--colore-accento);
	}
	.etichetta {
		display: inline-flex;
		gap: var(--spazio-1);
		align-items: center;
		padding: 0 var(--spazio-2);
		border-radius: var(--raggio-pieno);
		background: var(--colore-accento-tenue);
		color: var(--colore-accento-forte);
		font-size: var(--testo-xs);
		font-weight: var(--peso-medio);
	}
	.prossimo {
		display: flex;
		gap: var(--spazio-2);
		align-items: center;
		color: var(--colore-accento);
	}
	.prossimo a {
		display: inline-flex;
		align-items: center;
		min-height: var(--target);
		font-weight: var(--peso-medio);
	}
</style>
