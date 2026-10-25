<script lang="ts" module>
	import * as v from 'valibot';

	/** Props di `leggi-e-batti`: nessuna. Il livello viene dai progressi del profilo. */
	export const schemaProps = v.object({});
</script>

<script lang="ts">
	// «Leggi e batti»: un ritmo scritto, una battuta d'attacco, e il bambino lo legge battendo. Sei giri.
	// Progressione adattiva, senza punizioni (ritmi.ts): tre ritmi riusciti di fila portano una figura
	// nuova, presentata con le sillabe; dopo un ritmo non riuscito arriva un ripasso del livello prima,
	// con le sillabe, e il livello resta. Il livello si salva in dati['musica.ritmo'].lettura, con la
	// figura ancora da presentare: arrivata all'ultimo giro, la presenta la partita dopo.
	import { untrack } from 'svelte';
	import { creaCasuale } from '#lib/core/casuale.ts';
	import type { EsitoWidget, WidgetProps } from '#lib/core/motore/widget.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import { m } from '#lib/paraglide/messages.js';
	import {
		GIRI_LETTURA,
		dopoRitmo,
		itemDi,
		leggiLettura,
		prossimoRitmo,
		rigoDi,
		type Ritmo
	} from '../ritmi.ts';
	import GiriRitmo from './GiriRitmo.svelte';

	let { contesto, onesito, onfine }: WidgetProps = $props();

	const MODULO = 'musica.ritmo';
	/** cosa arriva a ogni livello, detto al bambino quando arriva */
	const NUOVO: Record<number, () => string> = {
		1: m.ritmo_lettura_nuovo_ta_a,
		2: m.ritmo_lettura_nuovo_sst,
		3: m.ritmo_lettura_nuove_battute
	};

	// seed e livello si leggono una volta, all'inizio della scheda
	const c = creaCasuale(untrack(() => contesto.seed));
	let stato = leggiLettura(progressi.doc?.dati[MODULO]);
	let numero = $state(1);
	const primo = crea(prossimoRitmo(stato, c, {}));
	let giro = $state.raw(primo);
	let nota = $state(presenta(primo.sillabe));
	/** l'esito del giro (primo tentativo), per scegliere il prossimo ritmo */
	let riuscito = true;

	/** la riga sopra il turno: la figura nuova, o l'aiuto delle sillabe nel ripasso */
	function presenta(sillabe: boolean) {
		return stato.nuovo ? NUOVO[stato.livello]() : sillabe ? m.ritmo_lettura_sillabe() : undefined;
	}

	function crea({ ritmo, sillabe }: { ritmo: Ritmo; sillabe: boolean }) {
		const rigo = rigoDi(ritmo);
		return { ritmo, rigo, item: itemDi(rigo), sillabe };
	}

	function esito(e: EsitoWidget) {
		onesito(e);
		stato = dopoRitmo(stato, e.corretto);
		riuscito = e.corretto;
		if (progressi.doc) progressi.aggiornaDati(MODULO, { lettura: stato });
	}

	function avanti() {
		if (numero >= GIRI_LETTURA) return onfine();
		giro = crea(prossimoRitmo(stato, c, { ripasso: !riuscito, prima: giro.ritmo }));
		nota = presenta(giro.sillabe);
		riuscito = true;
		numero++;
	}
</script>

<GiriRitmo
	{giro}
	{numero}
	totale={GIRI_LETTURA}
	modo="lettura"
	{nota}
	{contesto}
	onesito={esito}
	{avanti}
	{onfine}
/>
