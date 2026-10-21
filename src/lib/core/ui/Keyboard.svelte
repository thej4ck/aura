<script lang="ts">
	// Tastiera di pianoforte: tasti bianchi e neri, una zona colorata (es. il registro vocale) e tasti
	// evidenziati, sempre con un segno oltre al colore (barra sopra la zona, pallino sul tasto).
	// Con `onpick` i tasti sono pulsanti (frecce per muoversi, Invio o Spazio per scegliere);
	// senza è un'immagine con una descrizione. Inizia e finisce sempre su un tasto bianco.
	import {
		altezza,
		classe,
		nomeNota,
		nomeNotaParlato,
		scomponi,
		type NomiNote
	} from '#lib/core/musica/note.ts';
	import { m } from '#lib/paraglide/messages.js';

	type Props = {
		/** midi del primo e dell'ultimo tasto */
		da: number;
		a: number;
		evidenzia?: readonly number[];
		/** [basso, alto] in midi, da colorare */
		intervallo?: readonly [number, number];
		/** nomi visibili sui tasti bianchi */
		etichette?: boolean;
		nomiNote?: NomiNote;
		onpick?: (midi: number) => void;
		/** nome accessibile */
		etichetta?: string;
	};

	let {
		da,
		a,
		evidenzia = [],
		intervallo,
		etichette = false,
		nomiNote = 'solfeggio',
		onpick,
		etichetta = m.notazione_tastiera()
	}: Props = $props();

	const id = $props.id();
	const NERI = [1, 3, 6, 8, 10];
	const nero = (n: number) => NERI.includes(classe(n));
	const inizio = $derived(nero(da) ? da - 1 : da);
	const fine = $derived(nero(a) ? a + 1 : a);
	// x: indice del tasto bianco; per i neri, del bianco alla loro destra (il confine su cui stanno)
	const tasti = $derived.by(() => {
		let bianchi = 0;
		return Array.from({ length: fine - inizio + 1 }, (_, i) => {
			const n = inizio + i;
			return { midi: n, nero: nero(n), x: nero(n) ? bianchi : bianchi++ };
		});
	});
	const bianchi = $derived(tasti.filter((t) => !t.nero).length);

	const zona = $derived.by(() => {
		if (!intervallo) return undefined;
		const basso = Math.max(inizio, Math.min(...intervallo));
		const alto = Math.min(fine, Math.max(...intervallo));
		if (basso > alto) return undefined;
		const tb = tasti[basso - inizio];
		const ta = tasti[alto - inizio];
		return {
			basso,
			alto,
			sinistra: tb.nero ? tb.x - 0.3 : tb.x,
			destra: ta.nero ? ta.x + 0.3 : ta.x + 1
		};
	});

	const nomeTasto = (n: number) => {
		const alt = altezza(n);
		return m.notazione_tasto({
			nome: nomeNotaParlato(alt, nomiNote),
			ottava: scomponi(alt).ottava
		});
	};
	const evidenziato = (n: number) => evidenzia.includes(n);
	const testoZona = $derived(
		zona && m.notazione_zona({ da: nomeTasto(zona.basso), a: nomeTasto(zona.alto) })
	);
	const descrizione = $derived(
		[
			etichetta,
			testoZona,
			evidenzia.length &&
				m.notazione_tasti_evidenziati({ elenco: evidenzia.map(nomeTasto).join(', ') })
		]
			.filter(Boolean)
			.join('. ')
	);

	// roving tabindex
	let corrente = $state<number>();
	const tabulabile = $derived.by(() => {
		const dentro = (n: number | undefined) => n !== undefined && n >= inizio && n <= fine;
		if (dentro(corrente)) return corrente;
		return evidenzia.find(dentro) ?? (dentro(60) ? 60 : inizio);
	});

	function tasto(e: KeyboardEvent) {
		const dove: Record<string, number> = {
			ArrowRight: tabulabile! + 1,
			ArrowUp: tabulabile! + 1,
			ArrowLeft: tabulabile! - 1,
			ArrowDown: tabulabile! - 1,
			Home: inizio,
			End: fine
		};
		if (!(e.key in dove)) return;
		e.preventDefault();
		corrente = Math.min(fine, Math.max(inizio, dove[e.key]));
		const tastiera = (e.currentTarget as HTMLElement).parentElement;
		tastiera?.querySelector<HTMLElement>(`[data-midi="${corrente}"]`)?.focus();
	}
</script>

{#snippet contenuto(n: number, bianco: boolean)}
	{#if evidenziato(n)}<span class="punto"></span>{/if}
	{#if etichette && bianco}<span class="nome">{nomeNota(altezza(n), nomiNote)}</span>{/if}
{/snippet}

<div
	class={['tastiera', { interattiva: !!onpick }]}
	role={onpick ? 'group' : 'img'}
	aria-label={onpick ? etichetta : descrizione}
	aria-describedby={onpick && zona ? `${id}-zona` : undefined}
>
	{#if onpick && testoZona}<span id="{id}-zona" class="sr-only">{testoZona}</span>{/if}
	<div class="tasti" style:--bianchi={bianchi}>
		{#if zona}
			<span
				class="zona"
				style:left="{(zona.sinistra / bianchi) * 100}%"
				style:width="{((zona.destra - zona.sinistra) / bianchi) * 100}%"
			></span>
		{/if}
		{#each tasti as t (t.midi)}
			{@const classi = [
				'tasto',
				t.nero ? 'nero' : 'bianco',
				{
					evidenziato: evidenziato(t.midi),
					'in-zona': !!zona && t.midi >= zona.basso && t.midi <= zona.alto
				}
			]}
			{#if onpick}
				<button
					type="button"
					class={classi}
					style:--x={t.x}
					data-midi={t.midi}
					tabindex={t.midi === tabulabile ? 0 : -1}
					aria-label={evidenziato(t.midi)
						? m.notazione_tasto_evidenziato({ nome: nomeTasto(t.midi) })
						: nomeTasto(t.midi)}
					onclick={() => {
						corrente = t.midi;
						onpick(t.midi);
					}}
					onkeydown={tasto}
				>
					{@render contenuto(t.midi, !t.nero)}
				</button>
			{:else}
				<span class={classi} style:--x={t.x}>{@render contenuto(t.midi, !t.nero)}</span>
			{/if}
		{/each}
	</div>
</div>

<style>
	.tastiera {
		--tasto-bianco: var(--colore-superficie);
		--tasto-nero: var(--colore-testo);
		--min-tasto: 0;
		--altezza-tasti: 6rem;
		overflow-x: auto;
		/* spazio per la barra della zona sopra i tasti */
		padding-block-start: var(--spazio-4);
	}
	@media (prefers-color-scheme: dark) {
		.tastiera {
			--tasto-bianco: var(--colore-testo);
			--tasto-nero: var(--colore-fondo);
		}
	}
	.interattiva {
		--min-tasto: var(--target);
		--altezza-tasti: 9rem;
	}
	.tasti {
		position: relative;
		display: flex;
		min-width: calc(var(--bianchi) * var(--min-tasto));
		height: var(--altezza-tasti);
	}
	.tasto {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		gap: var(--spazio-1);
		margin: 0;
		padding: 0 0 var(--spazio-2);
		border: 1px solid var(--colore-bordo-forte);
		font-size: var(--testo-xs);
		font-weight: var(--peso-medio);
		line-height: 1;
		color: var(--tasto-nero);
		transition: background-color var(--durata-breve) var(--easing);
	}
	.bianco {
		flex: 1 1 0;
		min-width: var(--min-tasto);
		background: var(--tasto-bianco);
		border-radius: 0 0 var(--raggio-s) var(--raggio-s);
	}
	.bianco + .bianco,
	.nero + .bianco {
		margin-inline-start: -1px;
	}
	.nero {
		position: absolute;
		z-index: 1;
		top: 0;
		left: calc((var(--x) - 0.3) / var(--bianchi) * 100%);
		width: calc(60% / var(--bianchi));
		height: 62%;
		background: var(--tasto-nero);
		border-color: var(--tasto-nero);
		border-radius: 0 0 var(--raggio-s) var(--raggio-s);
	}
	.bianco.in-zona {
		background: color-mix(in srgb, var(--colore-info) 22%, var(--tasto-bianco));
	}
	.nero.in-zona {
		background: color-mix(in srgb, var(--colore-info) 50%, var(--tasto-nero));
	}
	.tasto.evidenziato {
		background: var(--colore-accento);
		color: var(--colore-su-accento);
	}
	.punto {
		width: 0.75rem;
		height: 0.75rem;
		border: 2px solid var(--colore-accento);
		border-radius: var(--raggio-pieno);
		background: var(--colore-su-accento);
	}
	.nome {
		max-width: 100%;
		overflow: hidden;
	}
	.zona {
		position: absolute;
		bottom: calc(100% + var(--spazio-1));
		height: var(--spazio-2);
		border-radius: var(--raggio-pieno);
		background: var(--colore-info);
	}
	button.tasto {
		cursor: pointer;
		touch-action: manipulation;
	}
	button.bianco:hover {
		background: color-mix(in srgb, var(--tasto-nero) 8%, var(--tasto-bianco));
	}
	button.nero:hover {
		background: color-mix(in srgb, var(--tasto-bianco) 25%, var(--tasto-nero));
	}
	button.tasto.evidenziato:hover {
		background: var(--colore-accento-forte);
	}
	.tasto:focus-visible {
		outline: var(--bordo-focus) solid var(--colore-focus);
		outline-offset: calc(-2 * var(--bordo-focus));
	}
</style>
