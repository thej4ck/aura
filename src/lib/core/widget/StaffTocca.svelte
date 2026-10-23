<script lang="ts" module>
	import * as v from 'valibot';
	import { SchemaRigo } from '../contenuti/schema.ts';
	import { SELEZIONABILI, passo } from '../musica/notazione.ts';
	import { schemaAltezza } from './musica.ts';

	const testo = v.pipe(v.string(), v.trim(), v.nonEmpty());
	const passoRigo = v.pipe(v.number(), v.integer(), v.minValue(-8), v.maxValue(16));

	/** Props di `staff-tocca`. */
	export const schemaProps = v.pipe(
		v.object({
			/** la nota da trovare: conta la posizione (linea o spazio), l'alterazione no */
			nota: schemaAltezza,
			/** di default "Tocca il {nome}", con i nomi delle preferenze */
			domanda: v.optional(testo),
			chiave: v.optional(SchemaRigo.entries.chiave, 'violino'),
			armatura: SchemaRigo.entries.armatura,
			/** dopo una risposta da rivedere: cosa fare, mai "sbagliato" */
			suggerimento: v.optional(testo),
			/** passi toccabili [min, max]; default dal Do sotto al La sopra in chiave di violino */
			selezionabili: v.optional(
				v.pipe(
					v.tuple([passoRigo, passoRigo]),
					v.check(([min, max]) => min < max, 'selezionabili: [min, max]')
				),
				[...SELEZIONABILI]
			)
		}),
		v.check(({ nota, chiave, selezionabili: [min, max] }) => {
			const p = passo(nota, chiave);
			return p >= min && p <= max;
		}, 'nota fuori dalle posizioni selezionabili')
	);
</script>

<script lang="ts">
	// "Tocca il Sol": la nota si cerca sul pentagramma. Ogni tocco suona la nota toccata; l'esito conta
	// solo il primo tentativo, poi si riprova con un aiuto che cresce (dove si è toccato, verso dove
	// andare, e dal secondo tentativo dove sta la nota). L'item è l'altezza da trovare.
	import { m } from '#lib/paraglide/messages.js';
	import { sblocca } from '../audio/contesto.ts';
	import { suonaNota, type Riproduzione } from '../audio/synth.ts';
	import type { WidgetProps } from '../motore/widget.ts';
	import { midi, nomeNota } from '../musica/note.ts';
	import { altezzaDaPasso, nomePosizione, posizione } from '../musica/notazione.ts';
	import Avviso from '../ui/Avviso.svelte';
	import Button from '../ui/Button.svelte';
	import Domanda from '../ui/Domanda.svelte';
	import Staff from '../ui/Staff.svelte';

	let { props, contesto, onesito, onfine }: WidgetProps = $props();

	const p = $derived(v.parse(schemaProps, props));
	const nomi = $derived(contesto.preferenze.nomiNote);
	const obiettivo = $derived(passo(p.nota, p.chiave));
	const nome = $derived(nomeNota(p.nota, nomi));
	const domanda = $derived(p.domanda ?? m.staff_tocca_domanda({ nome }));

	let toccato = $state<number>();
	let tentativi = $state(0);
	let trovata = $state(false);
	let riproduzione: Riproduzione | undefined;

	const rigo = $derived({
		chiave: p.chiave,
		armatura: p.armatura,
		note:
			toccato === undefined
				? []
				: [{ altezza: trovata ? p.nota : altezzaDaPasso(toccato, p.chiave, p.armatura) }]
	});

	/** linea, spazio, taglio o spazio fuori dal rigo: decide articoli e preposizioni dei messaggi */
	const dove = (q: number) => {
		const tipo = posizione(q).tipo;
		return { tipo: tipo === 'spazio-fuori' ? 'fuori' : tipo, posizione: nomePosizione(q) };
	};

	const feedback = $derived.by(() => {
		if (toccato === undefined) return '';
		const qui = m.staff_tocca_dove({ ...dove(obiettivo), nome });
		if (trovata) return `${m.staff_tocca_giusto()} ${qui}`;
		const sentita = nomeNota(altezzaDaPasso(toccato, p.chiave, p.armatura), nomi);
		return [
			m.staff_tocca_toccato({ ...dove(toccato), nome: sentita }),
			obiettivo > toccato ? m.staff_tocca_piu_su({ nome }) : m.staff_tocca_piu_giu({ nome }),
			// dal secondo tentativo l'aiuto dice anche dove sta la nota
			tentativi > 1 ? qui : '',
			p.suggerimento ?? ''
		]
			.filter(Boolean)
			.join(' ');
	});

	function scegli(scelta: { passo: number; altezza: string }) {
		// trovata: la nota giusta resta sul rigo (ogni nota che suona è anche scritta)
		if (trovata) return;
		tentativi++;
		const giusta = scelta.passo === obiettivo;
		if (tentativi === 1) {
			onesito({ corretto: giusta, item: p.nota, dettagli: { toccata: scelta.altezza } });
		}
		toccato = scelta.passo;
		trovata = giusta;
		void sblocca(); // nel gesto (iOS)
		riproduzione?.ferma();
		riproduzione = suonaNota(midi(giusta ? p.nota : scelta.altezza), 0.8);
	}

	$effect(() => () => riproduzione?.ferma());
</script>

<Domanda testo={domanda} poi={[feedback]} attivo={contesto.preferenze.letturaAltaVoce} />

<Staff
	{rigo}
	etichetta={domanda}
	interattivo
	onpick={scegli}
	evidenzia={toccato === undefined ? [] : [0]}
	nomiNote={nomi}
	selezionabili={p.selezionabili}
/>

<Avviso tono={trovata ? 'successo' : 'attenzione'} testo={feedback} />

{#if trovata}
	<div class="azioni">
		<Button dimensione="l" onclick={onfine}>{m.pulsante_avanti()}</Button>
	</div>
{/if}

<style>
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
</style>
