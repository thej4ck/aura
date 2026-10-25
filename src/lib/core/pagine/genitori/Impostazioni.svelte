<script lang="ts">
	// Impostazioni del profilo in uso. La prima modifica della visita chiede il controllo per gli adulti;
	// se l'adulto annulla, il controllo torna com'era.
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { progressi } from '../../store/progressi.svelte';
	import type { Preferenze } from '../../store/schema-progressi';
	import { ttsDisponibile } from '../../tts';
	import Avviso from '../../ui/Avviso.svelte';
	import ProblemaNoto from '../../ui/ProblemaNoto.svelte';

	let { conGate }: { conGate: (azione: () => void) => void } = $props();

	const id = $props.id();
	let sbloccato = $state(false);
	let salvata = $state('');
	let voceLocale = $state(true);
	onMount(() => {
		void ttsDisponibile('it').then((ok) => (voceLocale = ok));
	});

	type Accessibilita = Preferenze['accessibilita'];
	const DIMENSIONI: [Preferenze['dimensioneTesto'], () => string][] = [
		['piccolo', m.genitori_testo_piccolo],
		['normale', m.genitori_testo_normale],
		['grande', m.genitori_testo_grande],
		['molto-grande', m.genitori_testo_molto_grande]
	];
	const ACCESSIBILITA: [keyof Accessibilita, () => string][] = [
		['contrastoAlto', m.pref_contrasto_alto],
		['riduciMovimento', m.pref_riduci_movimento]
	];
	const NOMI_NOTE: [Preferenze['nomiNote'], () => string][] = [
		['solfeggio', m.genitori_nomi_solfeggio],
		['lettere', m.genitori_nomi_lettere]
	];
	const TOLLERANZE: [Preferenze['tolleranza'], () => string][] = [
		['facile', m.genitori_tolleranza_facile],
		['medio', m.genitori_tolleranza_medio],
		['preciso', m.genitori_tolleranza_preciso]
	];

	type Evento = Event & { currentTarget: HTMLInputElement };
	type Patch = Partial<Omit<Preferenze, 'aggiornato'>>;

	/** applica la modifica (dopo il controllo, la prima volta); `ripristina` rimette il controllo com'era */
	function cambia(patch: () => Patch, ripristina: () => void) {
		salvata = '';
		const applica = () => {
			progressi.aggiornaPreferenze(patch());
			salvata = m.genitori_impostazione_salvata();
		};
		if (sbloccato) return applica();
		ripristina();
		conGate(() => {
			sbloccato = true;
			applica();
		});
	}

	function interruttore(e: Evento, patch: (valore: boolean) => Patch) {
		const el = e.currentTarget;
		const valore = el.checked;
		cambia(
			() => patch(valore),
			() => (el.checked = !valore)
		);
	}

	function scelta<K extends 'nomiNote' | 'tolleranza' | 'dimensioneTesto'>(
		e: Evento,
		chiave: K,
		valore: Preferenze[K]
	) {
		const el = e.currentTarget;
		const prima = progressi.doc!.preferenze[chiave];
		cambia(
			() => ({ [chiave]: valore }),
			() => ((el.form?.elements.namedItem(el.name) as RadioNodeList).value = prima)
		);
	}

	/** Il ritardo dell'audio, in ms: un numero intero tra 0 e LATENZA_MAX_MS (fuori, si riporta lì). */
	const LATENZA_MAX_MS = 500;
	function latenza(e: Evento) {
		const el = e.currentTarget;
		const prima = progressi.doc!.preferenze.latenzaAudioMs;
		const ms = Math.min(LATENZA_MAX_MS, Math.max(0, Math.round(el.valueAsNumber || 0)));
		el.value = String(ms);
		cambia(
			() => ({ latenzaAudioMs: ms }),
			() => (el.value = String(prima))
		);
	}

	// letta al momento di applicare: gli oggetti annidati vanno passati interi
	const accessibilita = (chiave: keyof Accessibilita, valore: boolean): Patch => ({
		accessibilita: { ...progressi.doc!.preferenze.accessibilita, [chiave]: valore }
	});
</script>

<p class="lead">{m.genitori_impostazioni_intro()}</p>

{#if progressi.doc}
	{@const p = progressi.doc.preferenze}
	<form class="impostazioni" onsubmit={(e) => e.preventDefault()}>
		<fieldset>
			<legend>{m.genitori_dimensione_testo()}</legend>
			<div class="opzioni">
				{#each DIMENSIONI as [valore, etichetta] (valore)}
					<label class="opzione">
						<input
							type="radio"
							name="{id}-testo"
							value={valore}
							checked={p.dimensioneTesto === valore}
							onchange={(e) => scelta(e, 'dimensioneTesto', valore)}
						/>
						<!-- l'anteprima della misura: la «A» cresce con l'opzione -->
						<span class="anteprima {valore}" aria-hidden="true">A</span>
						{etichetta()}
					</label>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend>{m.genitori_impostazioni_lettura()}</legend>
			<div class="opzioni">
				{#each ACCESSIBILITA as [chiave, etichetta] (chiave)}
					<label class="opzione">
						<input
							type="checkbox"
							checked={p.accessibilita[chiave]}
							onchange={(e) => interruttore(e, (v) => accessibilita(chiave, v))}
						/>
						{etichetta()}
					</label>
				{/each}
				<label class="opzione">
					<input
						type="checkbox"
						checked={p.letturaAltaVoce}
						aria-describedby="{id}-lettura"
						onchange={(e) => interruttore(e, (v) => ({ letturaAltaVoce: v }))}
					/>
					{m.pref_lettura()}
				</label>
			</div>
			<p id="{id}-lettura" class="aiuto">
				{m.genitori_lettura_aiuto()}
				{#if !voceLocale}{m.genitori_lettura_assente()}{/if}
			</p>
			<ProblemaNoto id="android-voce-italiana" />
		</fieldset>

		<fieldset>
			<legend>{m.genitori_nomi_note()}</legend>
			<div class="opzioni">
				{#each NOMI_NOTE as [valore, etichetta] (valore)}
					<label class="opzione">
						<input
							type="radio"
							name="{id}-nomi"
							value={valore}
							checked={p.nomiNote === valore}
							onchange={(e) => scelta(e, 'nomiNote', valore)}
						/>
						{etichetta()}
					</label>
				{/each}
			</div>
		</fieldset>

		<fieldset aria-describedby="{id}-tolleranza">
			<legend>{m.genitori_tolleranza()}</legend>
			<p id="{id}-tolleranza" class="aiuto">{m.genitori_tolleranza_aiuto()}</p>
			<div class="opzioni">
				{#each TOLLERANZE as [valore, etichetta] (valore)}
					<label class="opzione">
						<input
							type="radio"
							name="{id}-tolleranza"
							value={valore}
							checked={p.tolleranza === valore}
							onchange={(e) => scelta(e, 'tolleranza', valore)}
						/>
						{etichetta()}
					</label>
				{/each}
			</div>
		</fieldset>

		<!--
			ponytail: la latenza si chiede all'adulto invece di misurarla; una calibrazione guidata (suona
			e tocca) se le prove sui dispositivi veri la chiedono (ADR 0008)
		-->
		<div class="campo">
			<label for="{id}-latenza" class="titolo">{m.genitori_latenza()}</label>
			<p id="{id}-latenza-aiuto" class="aiuto">{m.genitori_latenza_aiuto()}</p>
			<ProblemaNoto id="output-latency-assente" idTesto="{id}-latenza-problema" />
			<input
				id="{id}-latenza"
				class="numero"
				type="number"
				inputmode="numeric"
				min="0"
				max={LATENZA_MAX_MS}
				step="10"
				value={p.latenzaAudioMs}
				aria-describedby="{id}-latenza-aiuto {id}-latenza-problema"
				onchange={latenza}
			/>
			<!-- «non si sente niente»: l'adulto cerca qui, tra le impostazioni dell'audio -->
			<ProblemaNoto id="ios-audio-muto" />
			<ProblemaNoto id="ios16-silenzioso" />
		</div>
	</form>
	<Avviso tono="successo" testo={salvata} />
{/if}

<style>
	.lead {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
	}
	.impostazioni {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-5);
	}
	fieldset {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	legend,
	.titolo {
		padding: 0;
		margin-block-end: var(--spazio-2);
		font-weight: var(--peso-forte);
	}
	.campo {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		align-items: flex-start;
	}
	.numero {
		width: 8rem;
		min-height: var(--target);
		padding-inline: var(--spazio-3);
		border: 1px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-m);
		background: var(--colore-superficie);
		color: var(--colore-testo);
		font: inherit;
	}
	.opzioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-2) var(--spazio-3);
	}
	.opzione {
		display: inline-flex;
		gap: var(--spazio-3);
		align-items: center;
		min-height: var(--target);
		padding-inline: var(--spazio-4);
		border: 1px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-m);
		background: var(--colore-superficie);
		cursor: pointer;
	}
	.opzione:has(input:checked) {
		border-color: var(--colore-accento);
		background: var(--colore-accento-tenue);
	}
	.opzione input {
		width: 1.25rem;
		height: 1.25rem;
		margin: 0;
		accent-color: var(--colore-accento);
	}
	/* in em del testo attuale, nelle stesse proporzioni delle quattro basi (tokens.css) */
	.anteprima {
		font-weight: var(--peso-forte);
		line-height: 1;
	}
	.anteprima.piccolo {
		font-size: 0.875em;
	}
	.anteprima.grande {
		font-size: 1.25em;
	}
	.anteprima.molto-grande {
		font-size: 1.5em;
	}
	.aiuto {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
</style>
