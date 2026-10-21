<script lang="ts">
	// Vetrina per lo sviluppo: token, componenti UI e un'attività di esempio per provare il motore.
	import { m } from '#lib/paraglide/messages.js';
	import { catalogoEsempio } from '#lib/core/contenuti/__fixtures__/esempio/catalogo.ts';
	import CinqueLinee from '#lib/core/contenuti/__fixtures__/esempio/linee/CinqueLinee.svelte';
	import Attivita from '#lib/core/motore/Attivita.svelte';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import type { Preferenze } from '#lib/core/store/schema-progressi.ts';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Button from '#lib/core/ui/Button.svelte';
	import Card from '#lib/core/ui/Card.svelte';
	import GateAdulti from '#lib/core/ui/GateAdulti.svelte';
	import Icona, { NOMI_ICONE } from '#lib/core/ui/Icona.svelte';
	import PlayerPassi from '#lib/core/ui/PlayerPassi.svelte';
	import ProgressRing from '#lib/core/ui/ProgressRing.svelte';
	import Stelle from '#lib/core/ui/Stelle.svelte';
	import Pagine from './sezioni/Pagine.svelte';

	const attivita = catalogoEsempio.attivita('esempio.linee.cinque-linee')!;

	const SUPERFICI = ['fondo', 'superficie', 'superficie-tenue', 'bordo', 'bordo-forte'];
	const TESTI = ['testo', 'testo-tenue', 'accento', 'accento-tenue', 'focus'];
	const STATI = ['successo', 'successo-tenue', 'attenzione', 'attenzione-tenue', 'info', 'stella'];
	const NOTE = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
	const SCALA = ['3xl', '2xl', 'xl', 'l', 'm', 's', 'xs'];

	type Accessibilita = Preferenze['accessibilita'];
	const ACCESSIBILITA: [keyof Accessibilita, () => string][] = [
		['testoGrande', m.pref_testo_grande],
		['contrastoAlto', m.pref_contrasto_alto],
		['riduciMovimento', m.pref_riduci_movimento]
	];
	function imposta(chiave: keyof Accessibilita, valore: boolean) {
		const a = progressi.doc!.preferenze.accessibilita;
		progressi.aggiornaPreferenze({ accessibilita: { ...a, [chiave]: valore } });
	}

	let gateAperto = $state(false);
	let gateSuperato = $state(false);

	const PASSI = [
		{ testo: 'Questa è la prima linea, in basso.', durataMs: 1800 },
		{ testo: 'Ecco la seconda.', durataMs: 1800 },
		{ testo: 'La terza sta nel mezzo.', durataMs: 1800 },
		{ testo: 'Poi viene la quarta.', durataMs: 1800 },
		{ testo: 'E la quinta, in alto. Sono cinque!', durataMs: 2400 }
	];
</script>

<div class="vetrina">
	<header class="intro">
		<h1>{m.dev_titolo()}</h1>
		<p>{m.dev_sottotitolo()}</p>
	</header>

	<section aria-labelledby="sez-preferenze">
		<h2 id="sez-preferenze">{m.dev_preferenze()}</h2>
		{#if progressi.doc}
			{@const a = progressi.doc.preferenze.accessibilita}
			<div class="opzioni">
				{#each ACCESSIBILITA as [chiave, etichetta] (chiave)}
					<label class="interruttore">
						<input
							type="checkbox"
							checked={a[chiave]}
							onchange={(e) => imposta(chiave, e.currentTarget.checked)}
						/>
						{etichetta()}
					</label>
				{/each}
				<label class="interruttore">
					<input
						type="checkbox"
						checked={progressi.doc.preferenze.letturaAltaVoce}
						onchange={(e) =>
							progressi.aggiornaPreferenze({ letturaAltaVoce: e.currentTarget.checked })}
					/>
					{m.pref_lettura()}
				</label>
			</div>
		{/if}
	</section>

	<section aria-labelledby="sez-colori">
		<h2 id="sez-colori">{m.dev_colori()}</h2>
		{#each [SUPERFICI, TESTI, STATI] as gruppo, n (n)}
			<ul class="campioni">
				{#each gruppo as nome (nome)}
					<li>
						<span class="campione" style:background="var(--colore-{nome})"></span>
						<code>--colore-{nome}</code>
					</li>
				{/each}
			</ul>
		{/each}
		<h3>{m.dev_note()}</h3>
		<ul class="note">
			{#each NOTE as nota (nota)}
				<li style:background="var(--nota-{nota})"><code>--nota-{nota}</code></li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="sez-tipo">
		<h2 id="sez-tipo">{m.dev_tipografia()}</h2>
		<ul class="scala">
			{#each SCALA as t (t)}
				<li>
					<code>--testo-{t}</code>
					<span style:font-size="var(--testo-{t})">{m.dev_esempio_testo()}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="sez-pulsanti">
		<h2 id="sez-pulsanti">{m.dev_pulsanti()}</h2>
		{#each ['m', 'l'] as const as dimensione (dimensione)}
			<div class="fila">
				<Button {dimensione}>{m.attivita_inizia()}</Button>
				<Button {dimensione} variante="secondaria" icona="ricomincia">
					{m.attivita_ricomincia()}
				</Button>
				<Button {dimensione} variante="quieta" icona="freccia-sinistra">
					{m.pulsante_indietro()}
				</Button>
				<Button {dimensione} variante="secondaria" icona="volume" aria-label={m.leggi_ascolta()} />
			</div>
		{/each}
		<div class="fila">
			<Button disabled>{m.dev_disattivato()}</Button>
			<Button variante="secondaria" href="#sez-pulsanti">{m.pulsante_avanti()}</Button>
		</div>
	</section>

	<section aria-labelledby="sez-contenitori">
		<h2 id="sez-contenitori">{m.dev_contenitori()}</h2>
		<div class="griglia">
			{#each ['normale', 'tenue', 'evidenza'] as const as tono (tono)}
				<Card {tono}>
					<h3>{tono}</h3>
					<p>{m.dev_card_testo()}</p>
				</Card>
			{/each}
		</div>
		<div class="fila">
			{#each [0, 40, 100] as valore (valore)}
				<ProgressRing {valore} etichetta={m.dev_anello({ valore })} />
			{/each}
			{#each [0, 1, 2, 3] as stelle (stelle)}
				<Stelle {stelle} />
			{/each}
		</div>
	</section>

	<section aria-labelledby="sez-icone">
		<h2 id="sez-icone">{m.dev_icone()}</h2>
		<ul class="icone">
			{#each NOMI_ICONE as nome (nome)}
				<li><Icona {nome} dimensione="1.5rem" /> <code>{nome}</code></li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="sez-avvisi">
		<h2 id="sez-avvisi">{m.dev_avvisi()}</h2>
		<div class="pila">
			<Avviso tono="info" testo={m.dev_avviso_info()} />
			<Avviso tono="successo" testo={m.dev_avviso_successo()} />
			<Avviso tono="attenzione" testo={m.dev_avviso_attenzione()} />
		</div>
	</section>

	<section aria-labelledby="sez-gate">
		<h2 id="sez-gate">{m.dev_gate()}</h2>
		<div class="fila">
			<Button variante="secondaria" icona="lucchetto" onclick={() => (gateAperto = true)}>
				{m.dev_gate_apri()}
			</Button>
		</div>
		<Avviso tono="successo" testo={gateSuperato ? m.dev_gate_superato() : ''} />
		<GateAdulti bind:aperto={gateAperto} onsuperato={() => (gateSuperato = true)} />
	</section>

	<section aria-labelledby="sez-player">
		<h2 id="sez-player">{m.dev_player()}</h2>
		<PlayerPassi passi={PASSI} etichetta={m.dev_player()} leggi>
			{#snippet disegno(stato)}
				<CinqueLinee {...stato} />
			{/snippet}
		</PlayerPassi>
	</section>

	<section aria-labelledby="sez-attivita" class="sezione-attivita">
		<h2 id="sez-attivita">{m.dev_attivita()}</h2>
		<div class="cornice">
			<!-- come nella route delle attività: un altro profilo fa ripartire il motore -->
			{#key progressi.doc?.profilo.id}
				<Attivita {attivita} catalogo={catalogoEsempio} />
			{/key}
		</div>
	</section>

	<Pagine />
</div>

<style>
	.vetrina {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-8);
	}
	.intro {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		max-width: var(--larghezza-testo);
	}
	.intro p {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-l);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	h2 {
		padding-block-end: var(--spazio-2);
		border-bottom: 1px solid var(--colore-bordo);
	}
	code {
		font-size: var(--testo-xs);
		color: var(--colore-testo-tenue);
	}
	ul {
		padding: 0;
		list-style: none;
	}
	.opzioni,
	.fila {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
		align-items: center;
	}
	.interruttore {
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
		min-height: var(--target);
		padding-inline: var(--spazio-4);
		border: 1px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-m);
		background: var(--colore-superficie);
		cursor: pointer;
	}
	.interruttore input {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--colore-accento);
	}
	.campioni {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: var(--spazio-3);
	}
	.campioni li {
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
	}
	.campione {
		flex: none;
		width: 2.5rem;
		height: 2.5rem;
		border: 1px solid var(--colore-bordo);
		border-radius: var(--raggio-s);
	}
	.note {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
		gap: var(--spazio-2);
	}
	.note li {
		display: flex;
		align-items: flex-end;
		min-height: 4rem;
		padding: var(--spazio-2) var(--spazio-3);
		border-radius: var(--raggio-m);
	}
	.note code {
		color: var(--colore-su-nota);
	}
	.scala {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
	}
	.scala li {
		display: grid;
		gap: var(--spazio-1) var(--spazio-4);
		align-items: baseline;
	}
	@media (min-width: 40rem) {
		.scala li {
			grid-template-columns: 7rem 1fr;
		}
	}
	.scala span {
		line-height: var(--interlinea-titoli);
		overflow-wrap: anywhere;
	}
	.griglia {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
		gap: var(--spazio-4);
	}
	.icone {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: var(--spazio-3);
	}
	.icone li {
		display: flex;
		gap: var(--spazio-3);
		align-items: center;
	}
	.pila {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		max-width: var(--larghezza-testo);
	}
	.cornice {
		padding: var(--spazio-5) var(--spazio-4);
		border: 2px dashed var(--colore-bordo);
		border-radius: var(--raggio-l);
	}
	@media (min-width: 40rem) {
		.cornice {
			padding: var(--spazio-6);
		}
	}
</style>
