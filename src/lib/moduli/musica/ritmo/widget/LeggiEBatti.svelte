<script lang="ts" module>
	import * as v from 'valibot';

	/** Props di `leggi-e-batti`: nessuna. Il livello viene dai progressi del profilo. */
	export const schemaProps = v.object({});
</script>

<script lang="ts">
	// «Leggi e batti»: un ritmo scritto, una battuta d'attacco, e il bambino lo legge battendo. Sei giri.
	// Progressione adattiva, senza punizioni (ritmi.ts): tre ritmi riusciti di fila portano una figura
	// nuova, presentata con le sillabe; dopo un ritmo non riuscito arriva un ripasso del livello prima,
	// con le sillabe, e il livello resta. Il livello si salva in dati['musica.ritmo'].lettura.
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
	let giro = $state.raw(crea(prossimoRitmo(stato, c, {})));
	let nota = $state<string>();
	/** l'esito del giro (primo tentativo), per scegliere il prossimo ritmo */
	let ultimo: { riuscito: boolean; nuovo: boolean } | undefined;

	function crea({ ritmo, sillabe }: { ritmo: Ritmo; sillabe: boolean }) {
		const rigo = rigoDi(ritmo);
		return { ritmo, rigo, item: itemDi(rigo), sillabe };
	}

	function esito(e: EsitoWidget) {
		onesito(e);
		const s = dopoRitmo(stato, e.corretto);
		stato = { livello: s.livello, serie: s.serie };
		ultimo = { riuscito: e.corretto, nuovo: !!s.nuovo };
		if (progressi.doc) progressi.aggiornaDati(MODULO, { lettura: stato });
	}

	function avanti() {
		if (numero >= GIRI_LETTURA) return onfine();
		const { riuscito = true, nuovo = false } = ultimo ?? {};
		const x = prossimoRitmo(stato, c, { ripasso: !riuscito, nuovo, prima: giro.ritmo });
		giro = crea(x);
		nota = nuovo ? NUOVO[stato.livello]() : x.sillabe ? m.ritmo_lettura_sillabe() : undefined;
		ultimo = undefined;
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
