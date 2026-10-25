<script lang="ts">
	// Sezione della vetrina: pentagramma e tastiera con la teoria di musica/note.ts, e il ritmo.
	import * as v from 'valibot';
	import { SchemaRigo, type Rigo } from '#lib/core/contenuti/schema.ts';
	import { rigoRitmico, type SegnoBattito } from '#lib/core/musica/ritmo.ts';
	import {
		altezza,
		arpeggioMaggiore,
		nomeNota,
		scalaCromatica,
		scalaMaggiore,
		type NomiNote
	} from '#lib/core/musica/note.ts';
	import { nomePosizione } from '#lib/core/musica/notazione.ts';
	import { m } from '#lib/paraglide/messages.js';
	import Avviso from '#lib/core/ui/Avviso.svelte';
	import Keyboard from '#lib/core/ui/Keyboard.svelte';
	import Staff from '#lib/core/ui/Staff.svelte';

	const rigo = (altezze: string[], armatura?: number): Rigo => ({
		chiave: 'violino',
		armatura,
		note: altezze.map((altezza) => ({ altezza }))
	});
	const SCALA = rigo(scalaMaggiore(60));
	const ARPEGGIO = arpeggioMaggiore(63);
	const CROMATICA = rigo(scalaCromatica(60, 72));
	const TAGLI = rigo(['A3', 'B3', 'C4', 'A5', 'B5', 'C6']);
	const SEMIBREVI: Rigo = {
		chiave: 'violino',
		note: ['G4', 'D5'].map((altezza) => ({ altezza, durata: '1' as const }))
	};

	// ritmo (ADR 0008): righi ritmici e melodie con le durate, validati come i contenuti
	const RITMICO = v.parse(SchemaRigo, rigoRitmico('ta ti-ti ta-a sst ta-a-a', '4/4'));
	// un esempio di ogni segno: giusto, presto, tardi, in più (nella pausa), mancato
	const BATTITI: SegnoBattito[] = [
		{ battito: 0.03, giudizio: 'giusto', nota: 0 },
		{ battito: 0.84, giudizio: 'presto', nota: 1 },
		{ battito: 1.52, giudizio: 'giusto', nota: 2 },
		{ battito: 2.22, giudizio: 'tardi', nota: 3 },
		{ battito: 4.45, giudizio: 'in-piu', nota: 4 },
		{ battito: 5, giudizio: 'mancato', nota: 5 }
	];
	const RITMICO_TRE = v.parse(SchemaRigo, rigoRitmico('ta-a ta ti-ti ti-ti ta ta-a-a', '3/4'));
	const melodia = (tempo: '3/4' | '4/4', note: string) =>
		v.parse(SchemaRigo, {
			tempo,
			note: note.split(' ').map((n) => {
				const [altezza, durata] = n.split(':');
				const punto = durata.endsWith('.');
				const d = durata.replace('.', '');
				return altezza === 'p'
					? { pausa: true, durata: d }
					: { altezza, durata: d, ...(punto ? { punto } : {}) };
			})
		});
	const MELODIA = melodia('4/4', 'G4:4 A4:8 B4:8 C5:4 D5:4 E5:2 p:4 F4:8 D5:8');
	const MELODIA_TRE = melodia('3/4', 'G4:8 p:8 D5:8 p:8 C5:4 G4:2.');
	const PAUSE = melodia('4/4', 'E5:1 p:1 G4:2 p:2');
	const PAUSE_RITMICO = v.parse(SchemaRigo, { ...PAUSE, ritmico: true });

	let nomi = $state<NomiNote>('solfeggio');
	let rivela = $state(false);
	let scelta = $state<{ passo: number; altezza: string }>();
	let toccato = $state<number>();
</script>

<section aria-labelledby="sez-notazione">
	<h2 id="sez-notazione">{m.notazione_dev_titolo()}</h2>
	<fieldset class="opzioni">
		<legend>{m.notazione_dev_nomi()}</legend>
		{#each [['solfeggio', m.notazione_dev_solfeggio()], ['lettere', m.notazione_dev_lettere()]] as const as [valore, testo] (valore)}
			<label class="interruttore">
				<input type="radio" name="nomi-note" value={valore} bind:group={nomi} />
				{testo}
			</label>
		{/each}
	</fieldset>

	<h3>{m.notazione_dev_scala()}</h3>
	<Staff rigo={SCALA} etichetta={m.notazione_dev_scala()} etichette colori nomiNote={nomi} />

	<h3>{m.notazione_dev_arpeggio()}</h3>
	<div class="coppia">
		<Staff
			rigo={rigo(ARPEGGIO)}
			etichetta={m.notazione_dev_arpeggio()}
			etichette
			nomiNote={nomi}
			evidenzia={[ARPEGGIO[0]]}
		/>
		<Staff
			rigo={rigo(ARPEGGIO, -3)}
			etichetta={m.notazione_dev_arpeggio_armatura()}
			etichette
			nomiNote={nomi}
		/>
	</div>

	<h3>{m.notazione_dev_cromatica()}</h3>
	<Staff rigo={CROMATICA} etichetta={m.notazione_dev_cromatica()} compatto />

	<h3>{m.notazione_dev_tagli()}</h3>
	<div class="coppia">
		<Staff rigo={TAGLI} etichetta={m.notazione_dev_tagli()} etichette nomiNote={nomi} />
		<Staff rigo={SEMIBREVI} etichetta={m.notazione_dev_semibrevi()} compatto />
	</div>

	<h3>{m.notazione_dev_ritmo()}</h3>
	<div class="coppia">
		<Staff rigo={RITMICO} etichetta={m.notazione_dev_ritmico()} sillabe battiti={BATTITI} />
		<Staff rigo={RITMICO_TRE} etichetta={m.notazione_dev_ritmico_tre()} sillabe />
	</div>
	<div class="coppia">
		<Staff
			rigo={MELODIA}
			etichetta={m.notazione_dev_melodia()}
			etichette
			colori
			nomiNote={nomi}
			evidenzia={[6]}
		/>
		<Staff rigo={MELODIA_TRE} etichetta={m.notazione_dev_melodia_tre()} sillabe />
	</div>
	<div class="coppia">
		<Staff rigo={PAUSE} etichetta={m.notazione_dev_pause()} compatto />
		<Staff rigo={PAUSE_RITMICO} etichetta={m.notazione_dev_pause_ritmico()} compatto sillabe />
	</div>

	<h3>{m.notazione_dev_interattivo()}</h3>
	<label class="interruttore">
		<input type="checkbox" bind:checked={rivela} />
		{m.notazione_dev_rivela()}
	</label>
	<div class="interattivo">
		<Staff
			rigo={rigo(scelta ? [scelta.altezza] : [])}
			etichetta={m.notazione_dev_interattivo()}
			interattivo
			rivelaNomi={rivela}
			nomiNote={nomi}
			evidenzia={[0]}
			onpick={(s) => (scelta = s)}
		/>
	</div>
	<Avviso
		testo={scelta
			? m.notazione_dev_scelta({
					posizione: nomePosizione(scelta.passo),
					nome: nomeNota(scelta.altezza, nomi)
				})
			: ''}
	/>

	<h3>{m.notazione_dev_tastiera()}</h3>
	<Keyboard
		da={48}
		a={84}
		intervallo={[57, 76]}
		evidenzia={toccato === undefined ? [60, 64, 67] : [toccato]}
		etichette
		nomiNote={nomi}
		etichetta={m.notazione_dev_tastiera()}
		onpick={(n) => (toccato = n)}
	/>
	<Avviso
		testo={toccato === undefined
			? ''
			: m.notazione_dev_tasto({ nome: nomeNota(altezza(toccato), nomi) })}
	/>

	<h3>{m.notazione_dev_registro()}</h3>
	<div class="registro">
		<Keyboard da={45} a={79} intervallo={[55, 74]} etichetta={m.notazione_dev_registro()} />
	</div>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	h2 {
		padding-block-end: var(--spazio-2);
		border-bottom: 1px solid var(--colore-bordo);
	}
	.opzioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
		align-items: center;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-block-end: var(--spazio-2);
		font-weight: var(--peso-medio);
	}
	.interruttore {
		display: inline-flex;
		gap: var(--spazio-2);
		align-items: center;
		align-self: flex-start;
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
	.coppia {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
		gap: var(--spazio-5);
	}
	.interattivo {
		max-width: 32rem;
	}
	.registro {
		max-width: 28rem;
	}
</style>
