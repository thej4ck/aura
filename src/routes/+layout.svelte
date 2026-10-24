<script lang="ts">
	import '#lib/core/tokens.css';
	import '#lib/core/base.css';
	import { onMount } from 'svelte';
	import { version } from '$app/env';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import { m } from '#lib/paraglide/messages.js';
	import { registraErrore } from '#lib/core/errori.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Icona from '#lib/core/ui/Icona.svelte';
	import PausaGentile from '#lib/core/ui/PausaGentile.svelte';
	import SegnalaProblema from '#lib/core/ui/SegnalaProblema.svelte';
	import { serveBackup } from '#lib/core/vista/genitori.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let menuProfili: HTMLElement | undefined = $state();

	// solo nel browser: nel prerender IndexedDB non c'è
	onMount(() => {
		progressi.carica().catch(registraErrore);
	});

	// preferenze di accessibilità del profilo → attributi su <html> (i token fanno il resto)
	$effect(() => {
		const p = progressi.doc?.preferenze;
		const a = p?.accessibilita;
		const html = document.documentElement;
		if (p && p.dimensioneTesto !== 'normale') html.dataset.testo = p.dimensioneTesto;
		else delete html.dataset.testo;
		html.toggleAttribute('data-contrasto-alto', !!a?.contrastoAlto);
		html.toggleAttribute('data-riduci-movimento', !!a?.riduciMovimento);
	});

	// il commit della build (vite.config.ts); fuso fisso: il prerender e il browser scrivono la stessa data
	const versione = m.layout_versione({
		versione: version.slice(0, 7),
		data: new Intl.DateTimeFormat('it', { dateStyle: 'long', timeZone: 'Europe/Rome' }).format(
			new Date(__DATA_BUILD__)
		)
	});

	// promemoria discreto per l'adulto: solo un link nel piè di pagina, niente finestre
	const backup = $derived(!!progressi.doc && serveBackup(progressi.doc, new Date()));

	const link = [
		{ href: resolve('/moduli'), testo: m.layout_moduli },
		{ href: resolve('/genitori'), testo: m.layout_genitori }
	];
	const attuale = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(`${href}/`) ? 'page' : undefined;

	async function scegli(id: string) {
		menuProfili?.hidePopover();
		await progressi.scegliProfilo(id).catch(registraErrore);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a class="salta" href="#contenuto">{m.layout_salta()}</a>

<header class="testata">
	<a class="marchio" href={resolve('/')} aria-label={m.layout_home()}>
		<span class="simbolo"><Icona nome="germoglio" dimensione="1.5rem" /></span>
		<span class="nome">{m.app_nome()}</span>
	</a>

	<nav aria-label={m.layout_navigazione()}>
		<ul>
			{#each link as l (l.href)}
				<li><a href={l.href} aria-current={attuale(l.href)}>{l.testo()}</a></li>
			{/each}
		</ul>
	</nav>

	<div class="profilo">
		{#if progressi.doc}
			{@const avatar = progressi.doc.profilo.avatar}
			{#if progressi.profili.length > 1}
				<button
					class="avatar"
					type="button"
					popovertarget="menu-profili"
					aria-label={m.profilo_cambia({ avatar })}
				>
					{avatar}
				</button>
				<div id="menu-profili" class="menu" popover bind:this={menuProfili}>
					<p class="menu-titolo">{m.profilo_scegli()}</p>
					<ul>
						{#each progressi.profili as p (p.id)}
							{@const attivo = p.id === progressi.doc.profilo.id}
							<li>
								<!-- senza alias il nome accessibile viene dall'avatar; l'attivo ha anche la spunta, non solo il colore -->
								<button
									type="button"
									aria-current={attivo ? 'true' : undefined}
									aria-label={p.alias ? undefined : m.profilo_voce({ avatar: p.avatar })}
									onclick={() => scegli(p.id)}
								>
									<span class="avatar piccolo" aria-hidden="true">{p.avatar}</span>
									{#if p.alias}<span>{p.alias}</span>{/if}
									{#if attivo}<span class="spunta"><Icona nome="check" /></span>{/if}
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<span class="avatar" role="img" aria-label={m.profilo_attivo({ avatar })}>{avatar}</span>
			{/if}
		{:else}
			<span class="avatar vuoto" aria-hidden="true"></span>
		{/if}
	</div>
</header>

{#if progressi.pronto && (!progressi.persistente || progressi.erroreSalvataggio || progressi.illeggibili)}
	<div class="avvisi">
		{#if !progressi.persistente || progressi.erroreSalvataggio}
			<Avviso
				tono="attenzione"
				testo={progressi.erroreSalvataggio
					? m.avviso_errore_salvataggio()
					: m.avviso_non_persistente()}
			/>
		{/if}
		{#if progressi.illeggibili}
			<Avviso tono="info" testo={m.avviso_illeggibili()} />
		{/if}
	</div>
{/if}

<main id="contenuto" tabindex="-1">
	{@render children()}
</main>

<footer class="piede">
	<p>{m.layout_privacy()}</p>
	<a href={resolve('/genitori')}>{m.layout_privacy_link()}</a>
	<p>{m.layout_autore()}</p>
	<a href={resolve('/informazioni')}>{m.layout_informazioni()}</a>
	<SegnalaProblema />
	<p class="versione">{versione}</p>
	{#if backup}
		<a class="backup" href="{resolve('/genitori')}#backup">
			<Icona nome="info" />
			{m.layout_backup()}
		</a>
	{/if}
</footer>

<PausaGentile />

<style>
	.salta {
		position: absolute;
		inset-inline-start: var(--spazio-4);
		top: var(--spazio-2);
		z-index: 10;
		padding: var(--spazio-3) var(--spazio-4);
		border-radius: var(--raggio-m);
		background: var(--colore-accento);
		color: var(--colore-su-accento);
		font-weight: var(--peso-medio);
		transform: translateY(-200%);
	}
	.salta:focus-visible {
		transform: none;
	}

	.testata {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--spazio-2) var(--spazio-5);
		max-width: var(--larghezza-pagina);
		margin-inline: auto;
		padding: var(--spazio-4);
	}

	.marchio {
		display: inline-flex;
		align-items: center;
		gap: var(--spazio-3);
		min-height: var(--target);
		color: var(--colore-testo);
		text-decoration: none;
	}
	.simbolo {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--raggio-m);
		background: var(--colore-accento);
		color: var(--colore-su-accento);
	}
	.nome {
		font-size: var(--testo-l);
		font-weight: var(--peso-forte);
		letter-spacing: -0.02em;
	}

	nav {
		margin-inline-start: auto;
	}
	nav ul {
		display: flex;
		gap: var(--spazio-1);
		padding: 0;
		list-style: none;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: var(--target);
		padding-inline: var(--spazio-3);
		border-radius: var(--raggio-m);
		color: var(--colore-testo);
		font-size: var(--testo-m);
		font-weight: var(--peso-medio);
		text-decoration: none;
	}
	nav a:hover {
		background: var(--colore-superficie-tenue);
		color: var(--colore-testo);
	}
	nav a[aria-current='page'] {
		text-decoration: underline;
		text-decoration-thickness: 0.15em;
		text-underline-offset: 0.35em;
		text-decoration-color: var(--colore-accento);
	}

	.avatar {
		display: inline-grid;
		place-items: center;
		width: var(--target);
		height: var(--target);
		padding: 0;
		border: 2px solid var(--colore-bordo);
		border-radius: var(--raggio-pieno);
		background: var(--colore-superficie);
		font-size: 1.6rem;
		line-height: 1;
	}
	button.avatar {
		border-color: var(--colore-bordo-forte);
		cursor: pointer;
	}
	button.avatar:hover {
		border-color: var(--colore-accento);
	}
	.avatar.vuoto {
		border-style: dashed;
	}
	.avatar.piccolo {
		width: 2.25rem;
		height: 2.25rem;
		font-size: 1.25rem;
		border-width: 1px;
	}

	.menu {
		position: fixed;
		inset: auto;
		top: calc(var(--target) + var(--spazio-6));
		/* sotto il pulsante, che sta al bordo destro della testata centrata (anche sugli schermi larghi) */
		right: max(var(--spazio-4), calc((100vw - var(--larghezza-pagina)) / 2 + var(--spazio-4)));
		width: min(18rem, calc(100vw - 2 * var(--spazio-4)));
		margin: 0;
		padding: var(--spazio-3);
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
		color: var(--colore-testo);
		box-shadow: var(--ombra-2);
	}
	.menu-titolo {
		padding: var(--spazio-2) var(--spazio-3);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.menu ul {
		padding: 0;
		list-style: none;
	}
	.menu button {
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
		width: 100%;
		min-height: var(--target);
		padding: var(--spazio-2) var(--spazio-3);
		border: 0;
		border-radius: var(--raggio-m);
		background: none;
		text-align: start;
		cursor: pointer;
	}
	.menu button:hover {
		background: var(--colore-superficie-tenue);
	}
	.menu button[aria-current='true'] {
		background: var(--colore-accento-tenue);
		font-weight: var(--peso-medio);
	}
	.spunta {
		display: inline-flex;
		margin-inline-start: auto;
		color: var(--colore-accento-forte);
	}

	.avvisi {
		display: grid;
		gap: var(--spazio-3);
		max-width: var(--larghezza-pagina);
		margin-inline: auto;
		padding-inline: var(--spazio-4);
	}

	main {
		max-width: var(--larghezza-pagina);
		margin-inline: auto;
		padding: var(--spazio-6) var(--spazio-4) var(--spazio-8);
	}
	main:focus {
		outline: none;
	}

	.piede {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2) var(--spazio-4);
		align-items: baseline;
		max-width: var(--larghezza-pagina);
		margin-inline: auto;
		padding: var(--spazio-6) var(--spazio-4) var(--spazio-7);
		border-top: 1px solid var(--colore-bordo);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.piede p {
		max-width: var(--larghezza-testo);
	}
	.piede a {
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
		min-height: var(--target);
	}
	.piede .backup {
		color: var(--colore-info);
	}
	.piede .versione {
		font-size: var(--testo-xs);
	}

	@media (max-width: 30rem) {
		nav {
			order: 3;
			flex-basis: 100%;
			margin-inline-start: calc(-1 * var(--spazio-3));
		}
		.profilo {
			margin-inline-start: auto;
		}
	}
</style>
