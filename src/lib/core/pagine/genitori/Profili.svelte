<script lang="ts">
	// Profili sul dispositivo: scegli, modifica (avatar e nome), crea, elimina (dietro il controllo adulti).
	import { tick } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { registraErrore } from '../../errori';
	import { AVATARI, progressi } from '../../store/progressi.svelte';
	import type { Profilo } from '../../store/schema-progressi';
	import Avviso from '../../ui/Avviso.svelte';
	import Button from '../../ui/Button.svelte';
	import Icona from '../../ui/Icona.svelte';

	let { conGate }: { conGate: (azione: () => void) => void } = $props();

	const id = $props.id();
	type Esito = { tono: 'successo' | 'attenzione'; testo: string };
	let esito: Esito | undefined = $state();
	type Campi = { avatar: string; alias: string };
	let modifica: Campi = $state({ avatar: '', alias: '' });
	let nuovo: Campi = $state({ avatar: AVATARI[1], alias: '' });
	let lista: HTMLUListElement | undefined = $state();

	// il modulo di modifica segue il profilo in uso (anche quando lo si cambia dal menu in alto)
	$effect(() => {
		const p = progressi.doc?.profilo;
		if (!p) return;
		modifica.avatar = p.avatar;
		modifica.alias = p.alias ?? '';
	});

	const nome = (p: Profilo) => p.alias ?? p.avatar;

	async function prova(
		azione: () => Promise<unknown> | unknown,
		riuscito: string,
		fallito = m.genitori_errore_generico()
	) {
		try {
			await azione();
			esito = { tono: 'successo', testo: riuscito };
		} catch (e) {
			registraErrore(e);
			esito = { tono: 'attenzione', testo: fallito };
		}
	}

	/** il pulsante premuto sparisce (usa, elimina): il fuoco va sul profilo in uso, non sul fondo della pagina */
	async function fuocoSulProfiloInUso() {
		await tick();
		lista?.querySelector<HTMLElement>('li.attivo')?.focus();
	}

	async function usa(p: Profilo) {
		await progressi.scegliProfilo(p.id).catch(registraErrore);
		await fuocoSulProfiloInUso();
	}

	function salva(e: SubmitEvent) {
		e.preventDefault();
		void prova(
			() => progressi.aggiornaProfilo({ avatar: modifica.avatar, alias: modifica.alias }),
			m.genitori_profilo_salvato(),
			m.genitori_profilo_non_valido()
		);
	}

	function crea(e: SubmitEvent) {
		e.preventDefault();
		void prova(
			async () => {
				await progressi.creaProfilo(nuovo.avatar, nuovo.alias);
				nuovo.alias = '';
			},
			m.genitori_profilo_creato(),
			m.genitori_profilo_non_valido()
		);
	}

	function elimina(p: Profilo) {
		conGate(async () => {
			await prova(() => progressi.eliminaProfilo(p.id), m.genitori_profilo_eliminato());
			await fuocoSulProfiloInUso();
		});
	}
</script>

{#snippet campi(stato: Campi, prefisso: string)}
	<fieldset class="avatari">
		<legend>{m.genitori_avatar()}</legend>
		<div class="scelte">
			{#each AVATARI.includes(stato.avatar as (typeof AVATARI)[number]) ? AVATARI : [stato.avatar, ...AVATARI] as a (a)}
				<label class="avatar-scelta">
					<input
						type="radio"
						name="{prefisso}-avatar"
						value={a}
						checked={stato.avatar === a}
						onchange={() => (stato.avatar = a)}
						aria-label={m.genitori_avatar_voce({ avatar: a })}
					/>
					<span aria-hidden="true">{a}</span>
				</label>
			{/each}
		</div>
	</fieldset>
	<div class="campo">
		<label for="{prefisso}-alias">{m.genitori_alias()}</label>
		<input
			id="{prefisso}-alias"
			type="text"
			maxlength="40"
			autocomplete="off"
			bind:value={stato.alias}
			aria-describedby="{prefisso}-aiuto"
		/>
		<p id="{prefisso}-aiuto" class="tenue">{m.genitori_alias_aiuto()}</p>
	</div>
{/snippet}

<p class="lead">{m.genitori_profili_intro()}</p>

{#if progressi.doc}
	{@const attivo = progressi.doc.profilo.id}
	<ul class="profili" bind:this={lista}>
		{#each progressi.profili as p (p.id)}
			<li class={{ attivo: p.id === attivo }} tabindex="-1">
				<span class="avatar">{p.avatar}</span>
				<span class="nome">{p.alias ?? m.genitori_profilo_senza_nome()}</span>
				<span class="azioni">
					{#if p.id === attivo}
						<span class="in-uso"><Icona nome="check" /> {m.genitori_profilo_in_uso()}</span>
					{:else}
						<Button
							variante="secondaria"
							onclick={() => usa(p)}
							aria-label={m.genitori_profilo_usa_nome({ nome: nome(p) })}
						>
							{m.genitori_profilo_usa()}
						</Button>
					{/if}
					<Button
						variante="quieta"
						icona="lucchetto"
						onclick={() => elimina(p)}
						aria-label={m.genitori_profilo_elimina_nome({ nome: nome(p) })}
					>
						{m.genitori_profilo_elimina()}
					</Button>
				</span>
			</li>
		{/each}
	</ul>
	<p class="tenue">{m.genitori_elimina_avviso()}</p>

	<Avviso tono={esito?.tono ?? 'successo'} testo={esito?.testo ?? ''} />

	<div class="moduli">
		<form class="modulo" onsubmit={salva} aria-labelledby="{id}-modifica">
			<h3 id="{id}-modifica">{m.genitori_profilo_modifica()}</h3>
			{@render campi(modifica, `${id}-mod`)}
			<div><Button type="submit" variante="secondaria">{m.genitori_salva_profilo()}</Button></div>
		</form>

		<form class="modulo" onsubmit={crea} aria-labelledby="{id}-nuovo">
			<h3 id="{id}-nuovo">{m.genitori_profilo_nuovo()}</h3>
			{@render campi(nuovo, `${id}-nuovo`)}
			<div><Button type="submit" variante="secondaria">{m.genitori_crea_profilo()}</Button></div>
		</form>
	</div>
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

	.profili {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		padding: 0;
		list-style: none;
	}
	.profili li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2) var(--spazio-4);
		align-items: center;
		padding: var(--spazio-3) var(--spazio-4);
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
	}
	.profili li.attivo {
		border: 2px solid var(--colore-accento);
	}
	.avatar {
		font-size: 2rem;
		line-height: 1;
	}
	.nome {
		flex: 1 1 8rem;
		font-weight: var(--peso-medio);
		overflow-wrap: anywhere;
	}
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2);
		align-items: center;
	}
	.in-uso {
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
		padding-inline: var(--spazio-3);
		color: var(--colore-accento-forte);
		font-weight: var(--peso-medio);
	}

	.moduli {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
		gap: var(--spazio-5);
	}
	.modulo {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
		padding: var(--spazio-5);
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
	}
	.modulo h3 {
		font-size: var(--testo-l);
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
		margin-block-end: var(--spazio-2);
		font-weight: var(--peso-medio);
	}
	.scelte {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2);
	}
	.avatar-scelta {
		position: relative;
		display: grid;
		place-items: center;
		width: var(--target);
		height: var(--target);
		border: 1px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-pieno);
		background: var(--colore-superficie);
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
	}
	.avatar-scelta input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}
	.avatar-scelta:has(input:focus-visible) {
		outline: var(--bordo-focus) solid var(--colore-focus);
		outline-offset: 2px;
	}
	/* la scelta si vede dal bordo spesso e dallo sfondo, oltre che dal colore */
	.avatar-scelta:has(input:checked) {
		border: 3px solid var(--colore-accento);
		background: var(--colore-accento-tenue);
	}
	.campo {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
	}
	.campo label {
		font-weight: var(--peso-medio);
	}
	.campo input {
		min-height: var(--target);
		padding: var(--spazio-2) var(--spazio-3);
		border: 2px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-s);
		background: var(--colore-superficie);
	}
</style>
