<script lang="ts">
	// Backup e file: scarica, importa (unisce), file collegato con sync automatica dove il browser lo permette.
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { registraErrore } from '../../errori';
	import { problemaNoto } from '../../problemi-noti';
	import { importa, supportaFileCollegato } from '../../store/file';
	import { progressi, type StatoSync } from '../../store/progressi.svelte';
	import { ErroreProgressi, type CodiceErrore } from '../../store/schema-progressi';
	import Avviso from '../../ui/Avviso.svelte';
	import Button from '../../ui/Button.svelte';
	import ProblemaNoto from '../../ui/ProblemaNoto.svelte';

	let { conGate }: { conGate: (azione: () => void) => void } = $props();

	const id = $props.id();
	type Esito = { tono: 'successo' | 'attenzione'; testo: string };
	let esito: Esito | undefined = $state();
	let campoFile: HTMLInputElement | undefined = $state();
	let supporta = $state(false);
	let chiediPersistenza = $state(false);
	onMount(() => {
		supporta = supportaFileCollegato();
		// Firefox chiede il permesso con una finestra: lo chiede l'adulto da qui (progressi.svelte.ts non lo fa)
		if (problemaNoto('firefox-persistenza'))
			void navigator.storage?.persisted?.().then((si) => (chiediPersistenza = !si));
	});

	async function persisti() {
		chiediPersistenza = false; // dopo una risposta non si chiede di nuovo
		esito = (await navigator.storage.persist().catch(() => false))
			? { tono: 'successo', testo: m.genitori_persistenza_si() }
			: { tono: 'attenzione', testo: m.genitori_persistenza_no() };
	}

	const ERRORI: Partial<Record<CodiceErrore, () => string>> = {
		formato: m.genitori_errore_formato,
		'versione-futura': m.genitori_errore_versione,
		'non-valido': m.genitori_errore_non_valido,
		corrotto: m.genitori_errore_corrotto,
		'troppo-grande': m.genitori_errore_grande,
		'non-supportato': m.genitori_errore_supporto
	};
	const SYNC: Record<StatoSync, () => string> = {
		nessuna: m.genitori_sync_nessuna,
		attiva: m.genitori_sync_attiva,
		'in-pausa': m.genitori_sync_in_pausa,
		errore: m.genitori_sync_errore
	};

	const ultimo = $derived(progressi.doc?.ultimoBackup);
	const data = $derived(
		ultimo &&
			new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long', timeStyle: 'short' }).format(
				new Date(ultimo)
			)
	);

	function fallito(e: unknown) {
		if (e instanceof DOMException && e.name === 'AbortError') return; // picker chiuso: niente da dire
		const testo = e instanceof ErroreProgressi ? ERRORI[e.codice]?.() : undefined;
		if (!testo) registraErrore(e);
		esito = { tono: 'attenzione', testo: testo ?? m.genitori_errore_generico() };
	}

	/** esegue e annuncia l'esito: il testo restituito, oppure niente (basta lo stato della sync) */
	async function esegui(azione: () => Promise<string | void>) {
		esito = undefined;
		try {
			const testo = await azione();
			if (testo) esito = { tono: 'successo', testo };
		} catch (e) {
			fallito(e);
		}
	}

	const esporta = () =>
		esegui(async () => {
			const { blob, nomeFile } = await progressi.esportaBackup();
			const url = URL.createObjectURL(blob);
			const a = Object.assign(document.createElement('a'), { href: url, download: nomeFile });
			document.body.append(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
			return m.genitori_esportato({ file: nomeFile });
		});

	function fileScelto() {
		const file = campoFile?.files?.[0];
		if (campoFile) campoFile.value = ''; // lo stesso file si può scegliere di nuovo
		if (!file) return;
		void esegui(async () => {
			await progressi.importaEUnisci(await importa(file));
			return m.genitori_importato();
		});
	}

	/** dietro il controllo per gli adulti, e subito dopo: i picker dei file vogliono il gesto dell'adulto */
	const protetta = (azione: () => Promise<unknown>, riuscito: () => string) => () =>
		conGate(
			() =>
				void esegui(async () => {
					await azione();
					return riuscito();
				})
		);

	const chiediImporta = () => conGate(() => campoFile?.click());
	const collegaNuovo = protetta(() => progressi.collegaNuovoFile(), m.genitori_collegato);
	const collegaEsistente = protetta(() => progressi.collegaFileEsistente(), m.genitori_collegato);
	const scollega = protetta(() => progressi.scollegaFile(), m.genitori_scollegato);
	const riprendi = () => esegui(() => progressi.riprendiSync());
</script>

{#if progressi.doc}
	<p class="lead">{m.genitori_backup_intro()}</p>
	<p class="ultimo">{data ? m.genitori_ultimo_backup({ data }) : m.genitori_mai_backup()}</p>

	<div class="azioni">
		<Button onclick={esporta}>{m.genitori_esporta()}</Button>
		<Button variante="secondaria" icona="lucchetto" onclick={chiediImporta}>
			{m.genitori_importa()}
		</Button>
	</div>
	<p class="tenue">{m.genitori_importa_aiuto()}</p>
	{#if chiediPersistenza}
		<ProblemaNoto id="firefox-persistenza" />
		<div class="azioni">
			<Button variante="secondaria" onclick={persisti}>{m.genitori_persistenza()}</Button>
		</div>
	{/if}
	<input
		bind:this={campoFile}
		type="file"
		accept=".kgz,.json,application/gzip,application/json"
		hidden
		onchange={fileScelto}
	/>

	<Avviso tono={esito?.tono ?? 'successo'} testo={esito?.testo ?? ''} />

	<div class="sync" role="group" aria-labelledby="{id}-sync">
		<h3 id="{id}-sync">{m.genitori_sync()}</h3>
		{#if supporta}
			<p>{m.genitori_sync_intro()}</p>
			<p class={['stato', progressi.sync]} role="status">{SYNC[progressi.sync]()}</p>
			<div class="azioni">
				{#if progressi.sync === 'nessuna'}
					<Button variante="secondaria" icona="lucchetto" onclick={collegaNuovo}>
						{m.genitori_collega_nuovo()}
					</Button>
					<Button variante="secondaria" icona="lucchetto" onclick={collegaEsistente}>
						{m.genitori_collega_esistente()}
					</Button>
				{:else}
					{#if progressi.sync === 'in-pausa' || progressi.sync === 'errore'}
						<Button icona="ricomincia" onclick={riprendi}>{m.genitori_sync_riprendi()}</Button>
					{/if}
					<Button variante="quieta" icona="lucchetto" onclick={scollega}>
						{m.genitori_scollega()}
					</Button>
				{/if}
			</div>
		{:else}
			<p class="tenue">{m.genitori_sync_assente()}</p>
		{/if}
	</div>
{/if}

<style>
	.lead {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
	}
	.tenue {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.ultimo {
		font-weight: var(--peso-medio);
	}
	.azioni {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spazio-3);
	}
	.sync {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		margin-block-start: var(--spazio-2);
		padding: var(--spazio-5);
		border-radius: var(--raggio-l);
		background: var(--colore-superficie-tenue);
	}
	.sync h3 {
		font-size: var(--testo-l);
	}
	.sync p {
		max-width: var(--larghezza-testo);
	}
	.stato {
		font-weight: var(--peso-medio);
	}
	.stato.attiva {
		color: var(--colore-successo);
	}
	.stato.in-pausa,
	.stato.errore {
		color: var(--colore-attenzione);
	}
</style>
