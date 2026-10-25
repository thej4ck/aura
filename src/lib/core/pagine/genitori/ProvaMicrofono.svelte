<script lang="ts">
	// «Prova il microfono», per gli adulti: solo numeri, aggiornati cinque volte al secondo. Niente
	// registrazioni né salvataggi: in memoria restano i frame degli ultimi FINESTRA_S secondi, finché il
	// microfono è aperto, e spariscono quando si chiude.
	import { m } from '#lib/paraglide/messages.js';
	import { sblocca } from '../../audio/contesto.ts';
	import { riepiloga, type Riepilogo } from '../../audio/diagnosi.ts';
	import { midiDaFreq } from '../../audio/frequenze.ts';
	import {
		ErroreMic,
		apriMicrofono,
		type CodiceErroreMic,
		type FrameMic,
		type Microfono
	} from '../../audio/mic.ts';
	import { altezza, nomeNota } from '../../musica/note.ts';
	import { progressi } from '../../store/progressi.svelte';
	import Avviso from '../../ui/Avviso.svelte';
	import Button from '../../ui/Button.svelte';
	import ProblemaNoto from '../../ui/ProblemaNoto.svelte';
	import { ERRORI_MIC } from '../../widget/musica.ts';

	const FINESTRA_S = 5;
	/** i numeri si leggono meglio se non cambiano a ogni frame */
	const AGGIORNA_S = 0.2;

	const formato = (cifre: number) =>
		new Intl.NumberFormat('it', { minimumFractionDigits: cifre, maximumFractionDigits: cifre });
	const [n0, n1, n2, n4] = [0, 1, 2, 4].map(formato);
	const percento = new Intl.NumberFormat('it', { style: 'percent' });
	const conSegno = new Intl.NumberFormat('it', { signDisplay: 'exceptZero' });

	type Filtro = 'echoCancellation' | 'noiseSuppression' | 'autoGainControl';
	const FILTRI: [Filtro, () => string][] = [
		['echoCancellation', m.mic_eco],
		['noiseSuppression', m.mic_riduzione],
		['autoGainControl', m.mic_volume_auto]
	];
	// microfono negato senza nessuna richiesta: lo bloccano il sito o il browser, oppure il sistema
	const PASSI: Partial<Record<CodiceErroreMic, (() => string)[]>> = {
		'permesso-negato': [
			m.mic_permesso_sito,
			m.mic_permesso_browser,
			m.mic_permesso_bambini,
			m.mic_permesso_app
		],
		'permesso-sistema': [m.mic_permesso_android, m.mic_permesso_computer]
	};

	let microfono = $state.raw<Microfono>();
	let apertura = false;
	let vivo = true;
	let frame: FrameMic[] = [];
	let ultimo = $state.raw<FrameMic>();
	let riepilogo = $state.raw<Riepilogo>();
	let errore = $state('');
	let codice = $state<CodiceErroreMic>();
	let dettaglio = $state('');

	/** per chi aiuta a distanza: l'errore così come l'ha dato il browser, e il permesso che ricorda per il sito */
	async function rispostaBrowser(e: unknown): Promise<string> {
		const causa = e instanceof ErroreMic ? e.cause : e;
		const testo = causa instanceof Error ? `${causa.name}: ${causa.message}` : String(causa);
		const stato = await navigator.permissions?.query({ name: 'microphone' }).then(
			(s) => s.state,
			() => undefined
		);
		return stato ? `${testo} · permissions: ${stato}` : testo;
	}

	function ascolta(f: FrameMic) {
		frame.push(f);
		while (frame[0].t < f.t - FINESTRA_S) frame.shift();
		if (ultimo && f.t - ultimo.t < AGGIORNA_S) return;
		ultimo = f;
		riepilogo = riepiloga(frame);
	}

	function chiuso() {
		microfono = undefined;
		ultimo = undefined;
		riepilogo = undefined;
		frame = [];
	}

	async function apriOChiudi() {
		if (microfono) {
			microfono.chiudi();
			return chiuso();
		}
		if (apertura) return;
		apertura = true;
		errore = '';
		codice = undefined;
		dettaglio = '';
		void sblocca(); // nel gesto, prima di ogni await (iOS)
		try {
			const aperto = await apriMicrofono({ onframe: ascolta, onchiuso: chiuso });
			// pagina lasciata mentre si aspettava il permesso: si chiude subito
			if (vivo) microfono = aperto;
			else aperto.chiudi();
		} catch (e) {
			codice = e instanceof ErroreMic ? e.codice : 'non-supportato';
			// qui siamo già dove il messaggio dei giochi rimanda: al posto del rimando, i passi
			errore = PASSI[codice] ? m.mic_permesso_intro() : ERRORI_MIC[codice]();
			dettaglio = await rispostaBrowser(e);
		} finally {
			apertura = false;
		}
	}

	$effect(() => () => {
		vivo = false;
		microfono?.chiudi();
	});

	const dbfs = (rms: number) =>
		m.mic_dbfs({ valore: n1.format(Math.max(-120, 20 * Math.log10(rms))) });
	const quota = (n: number) => percento.format(riepilogo?.frame ? n / riepilogo.frame : 0);
	// la cancellazione dell'eco può anche dire quale ('all', 'remote-only'): tutto tranne false è acceso
	const acceso = (k: Filtro) => {
		const v = microfono?.impostazioni[k];
		return v !== undefined && v !== false;
	};
	const siNo = (k: Filtro) =>
		microfono?.impostazioni[k] === undefined
			? m.mic_non_indicato()
			: acceso(k)
				? m.mic_si()
				: m.mic_no();

	const nota = $derived.by(() => {
		const f = ultimo?.freq;
		if (!f) return m.mic_nessuna();
		const x = midiDaFreq(f);
		const vicina = Math.round(x);
		return m.mic_frequenza_nota({
			hz: n1.format(f),
			nota:
				nomeNota(altezza(vicina), progressi.doc?.preferenze.nomiNote) +
				(Math.floor(vicina / 12) - 1),
			cents: conSegno.format(Math.round(100 * (x - vicina)))
		});
	});
	const accesi = $derived(FILTRI.filter(([k]) => acceso(k)).map(([, nome]) => nome()));
</script>

<div class="prova">
	<p class="lead">{m.mic_intro()}</p>
	<ProblemaNoto id="ios-permesso-microfono" />
	<div>
		<Button variante="secondaria" icona="microfono" onclick={apriOChiudi}>
			{microfono ? m.mic_chiudi() : m.mic_apri()}
		</Button>
	</div>
	<Avviso tono="attenzione" testo={errore} />
	{#if codice && PASSI[codice]}
		<ol class="passi">
			{#each PASSI[codice] as passo (passo)}
				<li>{passo()}</li>
			{/each}
		</ol>
	{/if}
	{#if dettaglio}
		<p class="tenue">{m.mic_risposta_browser({ testo: dettaglio })}</p>
	{/if}

	{#if microfono}
		<dl class="numeri">
			<div>
				<dt>{m.mic_livello()}</dt>
				<dd>
					{ultimo
						? m.mic_livello_valore({ rms: n4.format(ultimo.rms), dbfs: dbfs(ultimo.rms) })
						: '–'}
				</dd>
			</div>
			<div>
				<dt>{m.mic_rumore()}</dt>
				<dd>{ultimo ? dbfs(ultimo.rumore) : '–'}</dd>
			</div>
			<div>
				<dt>{m.mic_soglia()}</dt>
				<dd>{ultimo ? dbfs(ultimo.gate) : '–'}</dd>
			</div>
			<div>
				<dt>{m.mic_chiarezza()}</dt>
				<dd>{ultimo ? n2.format(ultimo.chiarezza) : '–'}</dd>
			</div>
			<div>
				<dt>{m.mic_nota()}</dt>
				<dd>{nota}</dd>
			</div>
			<div>
				<dt>{m.mic_validi({ secondi: FINESTRA_S })}</dt>
				<dd data-testid="mic-validi">{riepilogo ? quota(riepilogo.validi) : '–'}</dd>
			</div>
			<div>
				<dt>{m.mic_vuoti()}</dt>
				<dd>
					{#if riepilogo}
						<ul>
							<li>{m.mic_vuoto_gate({ valore: quota(riepilogo.gate) })}</li>
							<li>{m.mic_vuoto_aperiodico({ valore: quota(riepilogo.aperiodici) })}</li>
							<li>{m.mic_vuoto_silenziato({ valore: quota(riepilogo.silenziati) })}</li>
							<li>
								{m.mic_vuoto_ritardi({
									count: riepilogo.ritardi,
									ms: n0.format(riepilogo.ritardoMs)
								})}
							</li>
						</ul>
					{:else}–{/if}
				</dd>
			</div>
			<div>
				<dt>{m.mic_campionamento()}</dt>
				<dd>{m.mic_hz({ valore: n0.format(microfono.sampleRate) })}</dd>
			</div>
			<div>
				<dt>{m.mic_cattura()}</dt>
				<dd>{m.mic_cattura_raf()}</dd>
			</div>
			{#each FILTRI as [k, nome] (k)}
				<div>
					<dt>{nome()}</dt>
					<dd>{siNo(k)}</dd>
				</div>
			{/each}
		</dl>
	{/if}
	<Avviso
		tono="attenzione"
		testo={accesi.length ? m.mic_filtri_accesi({ filtri: accesi.join(', ') }) : ''}
	/>
	<p class="tenue">{m.mic_consiglio_windows()}</p>
</div>

<style>
	.prova {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
	}
	.lead {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
	}
	.tenue {
		max-width: var(--larghezza-testo);
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	.passi {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-2);
		max-width: var(--larghezza-testo);
		padding-inline-start: 1.25em;
	}
	.numeri {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: var(--spazio-3) var(--spazio-5);
		margin: 0;
	}
	.numeri div {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-1);
		padding-block-end: var(--spazio-2);
		border-bottom: 1px solid var(--colore-bordo);
	}
	dt {
		color: var(--colore-testo-tenue);
		font-size: var(--testo-s);
	}
	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
		font-weight: var(--peso-medio);
	}
	dd ul {
		margin: 0;
		padding: 0;
		list-style: none;
		font-weight: var(--peso-normale);
	}
</style>
