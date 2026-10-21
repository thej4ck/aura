<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { segnaVoce } from '../audio/contesto.ts';
	import { ferma, parla, ttsDisponibile } from '../tts';
	import Button from './Button.svelte';

	type Props = {
		testo: string;
		/** voce registrata (URL servito dal sito): se c'è, si usa al posto della sintesi */
		audio?: string;
		/** preferenza "lettura ad alta voce": senza, il pulsante compare solo se c'è una voce registrata */
		attivo: boolean;
		lingua?: string;
	};

	let { testo, audio, attivo, lingua = 'it' }: Props = $props();

	let disponibile = $state(false);
	let parlando = $state(false);
	let lettore: HTMLAudioElement | undefined;
	let rilascia: (() => void) | undefined;

	// solo voci locali: se non ce ne sono il pulsante non compare (tts.ts non usa mai voci di rete)
	$effect(() => {
		if (!attivo || audio) return;
		let vivo = true;
		void ttsDisponibile(lingua).then((d) => {
			if (vivo) disponibile = d;
		});
		return () => {
			vivo = false;
		};
	});

	const visibile = $derived(!!audio || (attivo && disponibile));

	function smetti() {
		lettore?.pause();
		lettore = undefined;
		ferma();
		parlando = false;
		rilascia?.();
		rilascia = undefined;
	}

	// cambio scheda o pagina: la lettura si ferma
	$effect(() => smetti);

	async function leggi() {
		if (parlando) return smetti();
		parlando = true;
		// con un microfono aperto (schede di canto) la lettura non va sentita come canto
		const r = (rilascia = segnaVoce());
		try {
			if (audio) {
				lettore = new Audio(audio);
				await new Promise<void>((fine) => {
					lettore!.onended = lettore!.onerror = () => fine();
					lettore!.play().catch(() => fine());
				});
			} else {
				await parla(testo, lingua);
			}
		} finally {
			r();
			if (rilascia === r) {
				rilascia = undefined;
				parlando = false;
			}
		}
	}
</script>

{#if visibile}
	<Button
		variante="secondaria"
		icona={parlando ? 'pausa' : 'volume'}
		aria-label={parlando ? m.leggi_ferma() : m.leggi_ascolta()}
		onclick={leggi}
	/>
{/if}
