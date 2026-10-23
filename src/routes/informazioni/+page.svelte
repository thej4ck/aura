<script lang="ts">
	// Pagina per gli adulti: chi fa Aura, gratuità, codice aperto, segnalazioni, avvertenze.
	// I link verso altri siti passano da GateAdulti, come nella pagina per i genitori.
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { REPO as CODICE } from '#lib/core/segnalazione.ts';
	import GateAdulti from '#lib/core/ui/GateAdulti.svelte';
	import SegnalaProblema from '#lib/core/ui/SegnalaProblema.svelte';

	const AUTORE = 'https://www.backuppati.it/about';
	const VULNERABILITA = `${CODICE}/security/advisories/new`;
	/** il testo del link è l'indirizzo, senza protocollo né www: l'adulto vede dove va */
	const breve = (url: string) => url.replace(/^https:\/\/(www\.)?/, '');

	let gateAperto = $state(false);
	let destinazione = '';
	/** clic (anche con Ctrl o rotellina) su un link esterno: prima la domanda per gli adulti */
	function chiedi(e: MouseEvent) {
		if (e.button === 2) return; // tasto destro: resta il menu del browser
		e.preventDefault();
		destinazione = (e.currentTarget as HTMLAnchorElement).href;
		gateAperto = true;
	}
	// subito, nello stesso gesto della conferma: altrimenti il browser blocca la finestra nuova
	const apri = () => window.open(destinazione, '_blank', 'noopener,noreferrer');

	const BREVE: [() => string, () => string][] = [
		[m.informazioni_breve_chi, m.informazioni_breve_chi_valore],
		[m.informazioni_breve_costo, m.informazioni_breve_costo_valore],
		[m.informazioni_breve_dati, m.informazioni_breve_dati_valore],
		[m.informazioni_breve_codice, m.informazioni_breve_codice_valore],
		[m.informazioni_breve_contenuti, m.informazioni_breve_contenuti_valore],
		[m.informazioni_breve_segnalazioni, m.informazioni_breve_segnalazioni_valore]
	];
	const AVVERTENZE: [() => string, () => string][] = [
		[m.informazioni_avvertenze_supporto_titolo, m.informazioni_avvertenze_supporto],
		[m.informazioni_avvertenze_voce_titolo, m.informazioni_avvertenze_voce],
		[m.informazioni_avvertenze_adulto_titolo, m.informazioni_avvertenze_adulto],
		[m.informazioni_avvertenze_garanzie_titolo, m.informazioni_avvertenze_garanzie],
		[m.informazioni_avvertenze_responsabilita_titolo, m.informazioni_avvertenze_responsabilita],
		[m.informazioni_avvertenze_terzi_titolo, m.informazioni_avvertenze_terzi],
		[m.informazioni_avvertenze_sponsor_titolo, m.informazioni_avvertenze_sponsor]
	];
</script>

<svelte:head>
	<title>{m.layout_informazioni()} – {m.app_nome()}</title>
</svelte:head>

{#snippet esterno(url: string, testo = breve(url))}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- un altro sito, non una pagina dell'app -->
	<a
		class="vai"
		href={url}
		target="_blank"
		rel="noopener noreferrer"
		onclick={chiedi}
		onauxclick={chiedi}
	>
		{testo}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{/snippet}

<div class="informazioni">
	<header class="intro">
		<h1>{m.layout_informazioni()}</h1>
		<p class="lead">{m.informazioni_intro()}</p>
		<p class="tenue">{m.informazioni_esterni()}</p>
	</header>

	<section class="breve" aria-labelledby="titolo-breve">
		<h2 id="titolo-breve">{m.informazioni_breve()}</h2>
		<dl>
			{#each BREVE as [voce, valore] (voce)}
				<div>
					<dt>{voce()}</dt>
					<dd>{valore()}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section id="chi" aria-labelledby="titolo-chi">
		<h2 id="titolo-chi">{m.informazioni_chi()}</h2>
		<p class="lead">{m.informazioni_chi_testo()}</p>
		<p class="testo">{m.informazioni_chi_bio()}</p>
		<p>{m.informazioni_chi_altro()} {@render esterno(AUTORE)}</p>
	</section>

	<section id="gratuito" aria-labelledby="titolo-gratuito">
		<h2 id="titolo-gratuito">{m.informazioni_gratuito()}</h2>
		<p class="testo">{m.informazioni_gratuito_testo()}</p>
		<p>
			<a class="vai" href="{resolve('/genitori')}#privacy">{m.informazioni_gratuito_privacy()}</a>
		</p>
	</section>

	<section id="codice" aria-labelledby="titolo-codice">
		<h2 id="titolo-codice">{m.informazioni_codice()}</h2>
		<p class="testo">{m.informazioni_codice_testo()}</p>
		<p>{@render esterno(CODICE)}</p>
		<ul class="punti">
			<li>{m.informazioni_codice_mit()}</li>
			<li>{m.informazioni_codice_cc()}</li>
		</ul>
		<p class="testo">{m.informazioni_codice_riuso()}</p>
	</section>

	<section id="segnalazioni" aria-labelledby="titolo-segnalazioni">
		<h2 id="titolo-segnalazioni">{m.informazioni_segnalazioni()}</h2>
		<p class="testo">{m.informazioni_segnalazioni_testo()}</p>
		<div><SegnalaProblema variante="secondaria" /></div>
		<p class="testo tenue">{m.informazioni_segnalazioni_account()}</p>
		<div class="blocco sicurezza">
			<h3>{m.informazioni_sicurezza()}</h3>
			<p class="testo">{m.informazioni_sicurezza_testo()}</p>
			<p>{@render esterno(VULNERABILITA, m.informazioni_sicurezza_link())}</p>
		</div>
	</section>

	<section id="avvertenze" aria-labelledby="titolo-avvertenze">
		<h2 id="titolo-avvertenze">{m.informazioni_avvertenze()}</h2>
		<p class="lead">{m.informazioni_avvertenze_intro()}</p>
		<div class="griglia">
			{#each AVVERTENZE as [titolo, testo] (titolo)}
				<div class="blocco">
					<h3>{titolo()}</h3>
					<p>{testo()}</p>
				</div>
			{/each}
		</div>
	</section>

	<section id="crediti" aria-labelledby="titolo-crediti">
		<h2 id="titolo-crediti">{m.informazioni_crediti()}</h2>
		<p class="testo">{m.informazioni_crediti_testo()}</p>
		<p><a class="vai" href="{resolve('/genitori')}#crediti">{m.genitori_crediti()}</a></p>
	</section>
</div>

<GateAdulti bind:aperto={gateAperto} onsuperato={apri} />

<style>
	.informazioni {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-7);
		max-width: 52rem;
		/* pagina per gli adulti, come quella per i genitori */
		font-size: var(--testo-m);
	}
	.intro {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	.lead {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
	}
	.testo {
		max-width: var(--larghezza-testo);
	}
	.tenue {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
		padding-block-start: var(--spazio-6);
		border-top: 1px solid var(--colore-bordo);
		scroll-margin-top: var(--spazio-4);
	}
	section > h2 {
		font-size: var(--testo-2xl);
	}

	/* la scheda in breve: domanda a sinistra, risposta a destra; su telefono una sotto l'altra */
	.breve {
		padding: var(--spazio-5) var(--spazio-6);
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
	}
	.breve > h2 {
		font-size: var(--testo-xl);
	}
	dl {
		display: grid;
		grid-template-columns: minmax(10rem, max-content) 1fr;
		margin: 0;
	}
	dl > div {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
		gap: var(--spazio-1) var(--spazio-6);
		padding-block: var(--spazio-3);
		border-top: 1px solid var(--colore-bordo);
	}
	dt {
		color: var(--colore-testo-tenue);
	}
	dd {
		margin: 0;
		font-weight: var(--peso-medio);
	}
	@media (max-width: 36rem) {
		.breve {
			padding: var(--spazio-4);
		}
		dl > div {
			grid-template-columns: 1fr;
		}
	}

	.griglia {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
		gap: var(--spazio-5) var(--spazio-6);
	}
	.blocco {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
	}
	.blocco h3 {
		font-size: var(--testo-l);
	}
	.sicurezza {
		margin-block-start: var(--spazio-4);
	}
	.griglia .blocco p {
		color: var(--colore-testo-tenue);
	}

	.punti {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		max-width: var(--larghezza-testo);
		padding-inline-start: 1.25em;
	}
	.punti li::marker {
		color: var(--colore-accento);
	}

	/* link nel testo, ma con l'area di tocco piena; gli indirizzi lunghi vanno a capo */
	.vai {
		display: inline-flex;
		align-items: center;
		min-height: var(--target);
		overflow-wrap: anywhere;
	}
</style>
