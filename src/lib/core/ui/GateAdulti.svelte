<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { creaCasuale, type Casuale } from '../casuale';
	import { numeroInLettere } from '../numeri';
	import Button from './Button.svelte';
	import Icona from './Icona.svelte';

	type Props = {
		/** apre e chiude il dialog (bind:aperto) */
		aperto?: boolean;
		/** chiamata quando l'adulto scrive il numero giusto; il dialog si chiude da solo */
		onsuperato: () => void;
		onannulla?: () => void;
		/** generatore dei numeri; di default con seed casuale (nei test se ne passa uno fisso) */
		casuale?: Casuale;
	};

	let {
		aperto = $bindable(false),
		onsuperato,
		onannulla,
		casuale = creaCasuale(Math.floor(Math.random() * 2 ** 32))
	}: Props = $props();

	const id = $props.id();
	let dialog: HTMLDialogElement | undefined = $state();
	let campo: HTMLInputElement | undefined = $state();
	let numero = $state(100);
	let risposta = $state('');
	let errore = $state(false);

	const nuovoNumero = () => (numero = 100 + Math.floor(casuale() * 900));

	$effect(() => {
		if (!dialog) return;
		if (aperto && !dialog.open) {
			nuovoNumero();
			risposta = '';
			errore = false;
			dialog.showModal();
		} else if (!aperto && dialog.open) dialog.close();
	});

	async function conferma(e: SubmitEvent) {
		e.preventDefault();
		if (Number(risposta.trim()) === numero && risposta.trim() !== '') {
			aperto = false;
			onsuperato();
			return;
		}
		errore = true;
		risposta = '';
		nuovoNumero();
		await tick();
		campo?.focus();
	}

	function annulla() {
		aperto = false;
		onannulla?.();
	}
</script>

<!-- Esc chiude il dialog nativo: onclose riallinea lo stato -->
<dialog
	bind:this={dialog}
	class="gate"
	aria-labelledby="{id}-titolo"
	onclose={() => {
		if (aperto) annulla();
	}}
>
	<form onsubmit={conferma}>
		<h2 id="{id}-titolo"><Icona nome="lucchetto" /> {m.gate_titolo()}</h2>
		<p id="{id}-istruzioni">{m.gate_istruzioni()}</p>
		<p class="numero">{numeroInLettere(numero)}</p>
		<label for="{id}-campo">{m.gate_etichetta()}</label>
		<input
			bind:this={campo}
			bind:value={risposta}
			id="{id}-campo"
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			maxlength="3"
			autocomplete="off"
			aria-describedby="{id}-istruzioni {id}-errore"
			aria-invalid={errore}
			required
		/>
		<p id="{id}-errore" class="errore" aria-live="polite">{errore ? m.gate_errore() : ''}</p>
		<div class="azioni">
			<Button type="submit">{m.gate_conferma()}</Button>
			<Button variante="secondaria" onclick={annulla}>{m.gate_annulla()}</Button>
		</div>
	</form>
</dialog>

<style>
	.gate {
		width: min(32rem, calc(100vw - 2 * var(--spazio-4)));
		padding: 0;
		border: 0;
		border-radius: var(--raggio-l);
		background: var(--colore-superficie);
		color: var(--colore-testo);
		box-shadow: var(--ombra-2);
	}
	.gate::backdrop {
		background: var(--colore-velo);
	}
	form {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		padding: var(--spazio-6);
	}
	h2 {
		display: flex;
		gap: var(--spazio-2);
		align-items: center;
		color: var(--colore-testo);
	}
	.numero {
		margin-block: var(--spazio-2);
		font-size: var(--testo-xl);
		font-weight: var(--peso-forte);
		overflow-wrap: anywhere;
		color: var(--colore-accento);
	}
	label {
		font-weight: var(--peso-medio);
	}
	input {
		min-height: var(--target);
		width: 8ch;
		padding: var(--spazio-2) var(--spazio-3);
		border: 2px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-s);
		background: var(--colore-superficie);
		font-size: var(--testo-xl);
		letter-spacing: 0.1em;
	}
	.errore {
		min-height: 1.5em;
		color: var(--colore-attenzione);
	}
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
</style>
