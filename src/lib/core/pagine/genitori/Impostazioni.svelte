<script lang="ts">
	// Impostazioni del profilo in uso. La prima modifica della visita chiede il controllo per gli adulti;
	// se l'adulto annulla, il controllo torna com'era.
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { progressi } from '../../store/progressi.svelte';
	import type { Preferenze } from '../../store/schema-progressi';
	import { ttsDisponibile } from '../../tts';
	import Avviso from '../../ui/Avviso.svelte';

	let { conGate }: { conGate: (azione: () => void) => void } = $props();

	const id = $props.id();
	let sbloccato = $state(false);
	let salvata = $state('');
	let voceLocale = $state(true);
	onMount(() => {
		void ttsDisponibile('it').then((ok) => (voceLocale = ok));
	});

	type Accessibilita = Preferenze['accessibilita'];
	const ACCESSIBILITA: [keyof Accessibilita, () => string][] = [
		['testoGrande', m.pref_testo_grande],
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

	function scelta<K extends 'nomiNote' | 'tolleranza'>(
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
			ponytail: manopola della latenza audio (preferenze.latenzaAudioMs, 0..500 ms, messaggi
			genitori_latenza e genitori_latenza_aiuto) nascosta: oggi nessun widget ne ha bisogno. Va
			mostrata quando arriva il modulo Ritmo o una calibrazione guidata (suona e tocca, la
			latenza si misura invece di chiederla); la preferenza resta nello schema, nel salvataggio e
			nel microfono.
		-->
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
	legend {
		padding: 0;
		margin-block-end: var(--spazio-2);
		font-weight: var(--peso-forte);
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
	.aiuto {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
</style>
