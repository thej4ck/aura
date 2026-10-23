<script lang="ts">
	// Pagina per i genitori: privacy, progressi, profili, backup e file, impostazioni, voce, come aiutare,
	// installazione, crediti e licenze.
	// Le azioni delicate (importa, elimina, collega/scollega, impostazioni, link esterni) passano da GateAdulti.
	import { asset, resolve } from '$app/paths';
	import type { AssetPath } from '$app/types';
	import { m } from '#lib/paraglide/messages.js';
	import { catalogo as catalogoReale, type Catalogo } from '../contenuti/registry';
	import { progressi } from '../store/progressi.svelte';
	import Avviso from '../ui/Avviso.svelte';
	import Button from '../ui/Button.svelte';
	import GateAdulti from '../ui/GateAdulti.svelte';
	import InstallaApp from '../ui/InstallaApp.svelte';
	import SegnalaProblema from '../ui/SegnalaProblema.svelte';
	import { serveBackup } from '../vista/genitori';
	import Backup from './genitori/Backup.svelte';
	import Impostazioni from './genitori/Impostazioni.svelte';
	import Profili from './genitori/Profili.svelte';
	import Progressi from './genitori/Progressi.svelte';
	import ProvaMicrofono from './genitori/ProvaMicrofono.svelte';

	type Props = { catalogo?: Catalogo };
	let { catalogo = catalogoReale }: Props = $props();

	const RAILWAY_PRIVACY = 'https://railway.com/legal/privacy';
	const apriRailway = () => window.open(RAILWAY_PRIVACY, '_blank', 'noopener,noreferrer');

	// un solo controllo per tutta la pagina: chi lo chiede passa l'azione da fare quando l'adulto lo supera
	let gateAperto = $state(false);
	let dopoGate: (() => void) | undefined;
	function conGate(azione: () => void) {
		dopoGate = azione;
		gateAperto = true;
	}
	function superato() {
		const azione = dopoGate;
		dopoGate = undefined;
		azione?.(); // subito, nello stesso gesto: serve ai picker dei file e alle finestre nuove
	}

	const SEZIONI: [string, () => string][] = [
		['privacy', m.genitori_privacy],
		['progressi', m.genitori_progressi],
		['profili', m.genitori_profili],
		['backup', m.genitori_backup],
		['impostazioni', m.genitori_impostazioni],
		['voce', m.genitori_voce],
		['microfono', m.mic_titolo],
		['aiutare', m.genitori_aiutare],
		['installa', m.genitori_installa],
		['segnalazioni', m.informazioni_segnalazioni],
		['crediti', m.genitori_crediti]
	];
	const VOCE = [m.genitori_voce_1, m.genitori_voce_2, m.genitori_voce_3, m.genitori_voce_4];
	const AIUTARE = [
		m.genitori_aiutare_1,
		m.genitori_aiutare_2,
		m.genitori_aiutare_3,
		m.genitori_aiutare_4,
		m.genitori_aiutare_5,
		m.genitori_aiutare_6
	];
	const PRIVACY: [() => string, () => string][] = [
		[m.genitori_privacy_dove_titolo, m.genitori_privacy_dove],
		[m.genitori_privacy_invii_titolo, m.genitori_privacy_invii],
		[m.genitori_privacy_microfono_titolo, m.genitori_privacy_microfono],
		[m.genitori_privacy_server_titolo, m.genitori_privacy_server]
	];

	// opere di altri incluse nel sito: la licenza chiede di distribuirne il testo insieme alle copie
	const CREDITI: [() => string, string, AssetPath][] = [
		[m.genitori_crediti_bravura, 'Bravura', 'licenze/bravura-ofl.txt'],
		[
			m.genitori_crediti_atkinson,
			'Atkinson Hyperlegible Next',
			'licenze/atkinson-hyperlegible-next-ofl.txt'
		],
		[m.genitori_crediti_lucide, 'Lucide', 'licenze/lucide-isc.txt']
	];

	const promemoria = $derived(!!progressi.doc && serveBackup(progressi.doc, new Date()));
</script>

<div class="genitori">
	<header class="intro">
		<h1>{m.layout_genitori()}</h1>
		<p class="lead">{m.genitori_intro()}</p>
	</header>

	{#if promemoria}
		<Avviso tono="info">
			<p>{m.genitori_promemoria()}</p>
			<p><a class="vai" href="#backup">{m.genitori_backup()}</a></p>
		</Avviso>
	{/if}

	<nav class="indice" aria-label={m.genitori_indice()}>
		<ul>
			{#each SEZIONI as [ancora, titolo] (ancora)}
				<li><a href="#{ancora}">{titolo()}</a></li>
			{/each}
		</ul>
	</nav>

	<section id="privacy" aria-labelledby="titolo-privacy">
		<h2 id="titolo-privacy">{m.genitori_privacy()}</h2>
		<p class="lead">{m.genitori_privacy_intro()}</p>
		<div class="griglia">
			{#each PRIVACY as [titolo, testo] (titolo)}
				<div class="blocco">
					<h3>{titolo()}</h3>
					<p>{testo()}</p>
				</div>
			{/each}
		</div>
		<div class="esterno">
			<Button variante="secondaria" icona="lucchetto" onclick={() => conGate(apriRailway)}>
				{m.genitori_privacy_railway()}
			</Button>
			<p class="tenue">{m.genitori_privacy_esterno()}</p>
		</div>
	</section>

	<section id="progressi" aria-labelledby="titolo-progressi">
		<h2 id="titolo-progressi">{m.genitori_progressi()}</h2>
		<Progressi {catalogo} />
	</section>

	<section id="profili" aria-labelledby="titolo-profili">
		<h2 id="titolo-profili">{m.genitori_profili()}</h2>
		<Profili {conGate} />
	</section>

	<section id="backup" aria-labelledby="titolo-backup">
		<h2 id="titolo-backup">{m.genitori_backup()}</h2>
		<Backup {conGate} />
	</section>

	<section id="impostazioni" aria-labelledby="titolo-impostazioni">
		<h2 id="titolo-impostazioni">{m.genitori_impostazioni()}</h2>
		<Impostazioni {conGate} />
	</section>

	<section id="voce" aria-labelledby="titolo-voce">
		<h2 id="titolo-voce">{m.genitori_voce()}</h2>
		<ul class="consigli">
			{#each VOCE as testo, i (i)}<li>{testo()}</li>{/each}
		</ul>
	</section>

	<section id="microfono" aria-labelledby="titolo-microfono">
		<h2 id="titolo-microfono">{m.mic_titolo()}</h2>
		<ProvaMicrofono />
	</section>

	<section id="aiutare" aria-labelledby="titolo-aiutare">
		<h2 id="titolo-aiutare">{m.genitori_aiutare()}</h2>
		<ul class="consigli">
			{#each AIUTARE as testo, i (i)}<li>{testo()}</li>{/each}
		</ul>
	</section>

	<section id="installa" aria-labelledby="titolo-installa">
		<h2 id="titolo-installa">{m.genitori_installa()}</h2>
		<InstallaApp />
	</section>

	<section id="segnalazioni" aria-labelledby="titolo-segnalazioni">
		<h2 id="titolo-segnalazioni">{m.informazioni_segnalazioni()}</h2>
		<p class="lead">{m.genitori_segnala_testo()}</p>
		<div><SegnalaProblema variante="secondaria" /></div>
	</section>

	<section id="crediti" aria-labelledby="titolo-crediti">
		<h2 id="titolo-crediti">{m.genitori_crediti()}</h2>
		<p class="lead">{m.genitori_crediti_intro()}</p>
		<ul class="crediti">
			{#each CREDITI as [testo, opera, licenza] (licenza)}
				<li>
					<p>{testo()}</p>
					<!-- un file, non una pagina: senza reload il router lo prenderebbe per /[area]/[modulo] -->
					<a class="vai" href={asset(licenza)} data-sveltekit-reload>
						{m.genitori_crediti_licenza({ opera })}
					</a>
				</li>
			{/each}
		</ul>
		<p>
			{m.genitori_informazioni()}
			<a class="vai" href={resolve('/informazioni')}>{m.layout_informazioni()}</a>.
		</p>
	</section>
</div>

<GateAdulti
	bind:aperto={gateAperto}
	onsuperato={superato}
	onannulla={() => (dopoGate = undefined)}
/>

<style>
	.genitori {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-7);
		max-width: 52rem;
		/* pagina per gli adulti: il corpo della fascia 6-10 sarebbe troppo grande per tanto testo */
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
	.tenue {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}

	.indice ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2);
		padding: 0;
		list-style: none;
	}
	.indice a {
		display: inline-flex;
		align-items: center;
		min-height: var(--target);
		padding-inline: var(--spazio-4);
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-pieno);
		background: var(--colore-superficie);
		font-size: var(--testo-s);
		font-weight: var(--peso-medio);
		text-decoration: none;
	}
	.indice a:hover {
		border-color: var(--colore-accento);
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
	.blocco p {
		color: var(--colore-testo-tenue);
	}
	.esterno {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2) var(--spazio-4);
		align-items: center;
	}

	/* link nel testo, ma con l'area di tocco piena */
	.vai {
		display: inline-flex;
		align-items: center;
		min-height: var(--target);
	}
	.crediti {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		max-width: var(--larghezza-testo);
		padding: 0;
		list-style: none;
	}

	.consigli {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		max-width: var(--larghezza-testo);
		padding-inline-start: 1.25em;
	}
	.consigli li::marker {
		color: var(--colore-accento);
	}
</style>
