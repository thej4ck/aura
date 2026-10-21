<script lang="ts" module>
	/** secondi di scia visibili */
	export const SCIA_S = 4;
	/** semitoni mostrati sopra e sotto la nota */
	export const SEMITONI = 6;
</script>

<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { centsTra, distanzaCents } from '#lib/core/audio/frequenze.ts';
	import type { FrameMic } from '#lib/core/audio/mic.ts';
	import { progressi } from '#lib/core/store/progressi.svelte.ts';
	import { m } from '#lib/paraglide/messages.js';

	type Props = {
		/** nota da cantare (MIDI) */
		target: number;
		tolleranzaCents: number;
		/** l'ultimo frame del microfono; null o assente = in attesa */
		frame?: FrameMic | null;
		/** la stessa nota in un'altra ottava va bene */
		equivalenzaOttava?: boolean;
		/** nome della nota già scritto dal chiamante (es. "La") */
		nomeTarget?: string;
		/** di default: preferenza del profilo o del sistema */
		riduciMovimento?: boolean;
	};

	let {
		target,
		tolleranzaCents,
		frame,
		equivalenzaOttava = false,
		nomeTarget,
		riduciMovimento
	}: Props = $props();

	type Stato = 'su' | 'giu' | 'giusto' | 'attesa' | 'ascolta';
	const TESTI: Record<Stato, () => string> = {
		su: m.audio_pitch_su,
		giu: m.audio_pitch_giu,
		giusto: m.audio_pitch_giusto,
		attesa: m.audio_pitch_attesa,
		ascolta: m.audio_pitch_ascolta
	};
	const FRECCE: Partial<Record<Stato, string>> = { su: '↑', giu: '↓' };
	/** una pausa breve nella voce (respiro, consonante) non cancella l'indicazione */
	const TIENI_S = 0.4;
	/** spazio a destra per il marcatore, e sopra e sotto per non tagliarlo */
	const MARGINE = 24;
	/** l'annuncio per i lettori di schermo: testo stabile per STABILE_MS, al massimo uno ogni PAUSA_MS */
	const STABILE_MS = 700;
	const PAUSA_MS = 2500;

	const ridotto = $derived(
		riduciMovimento ??
			(prefersReducedMotion.current || !!progressi.doc?.preferenze.accessibilita.riduciMovimento)
	);

	let tela = $state<HTMLCanvasElement>();
	let larghezza = $state(0);
	let altezza = $state(0);
	let stato = $state<Stato>('attesa');
	let annuncio = $state('');

	// la scia non è reattiva: la legge solo il disegno
	let scia: { t: number; freq: number | null }[] = [];
	let ultimoFrame: FrameMic | null | undefined;
	let ultimoAnnuncio = -Infinity;

	const cents = (freq: number) =>
		equivalenzaOttava ? distanzaCents(freq, target, { equivalenzaOttava }) : centsTra(freq, target);

	/** cent della voce più recente, se è di meno di TIENI_S fa */
	function attuale(): number | null {
		if (!ultimoFrame) return null;
		for (let i = scia.length - 1; i >= 0 && scia[i].t >= ultimoFrame.t - TIENI_S; i--) {
			const f = scia[i].freq;
			if (f !== null) return cents(f);
		}
		return null;
	}

	$effect(() => {
		const f = frame;
		if (!f) {
			// microfono chiuso: si riparte da capo
			scia = [];
			ultimoFrame = undefined;
		} else if (f !== ultimoFrame) {
			if (ultimoFrame && f.t < ultimoFrame.t) scia = []; // microfono riaperto
			ultimoFrame = f;
			scia.push({ t: f.t, freq: f.silenziato ? null : f.freq });
			while (scia[0].t < f.t - SCIA_S) scia.shift();
		}
		const c = attuale();
		stato = f?.silenziato
			? 'ascolta'
			: c === null
				? 'attesa'
				: c < -tolleranzaCents
					? 'su'
					: c > tolleranzaCents
						? 'giu'
						: 'giusto';
		disegna(c);
	});

	$effect(() => {
		const testo = TESTI[stato]();
		const id = setTimeout(
			() => {
				if (annuncio === testo) return;
				annuncio = testo;
				ultimoAnnuncio = performance.now();
			},
			Math.max(STABILE_MS, ultimoAnnuncio + PAUSA_MS - performance.now())
		);
		return () => clearTimeout(id);
	});

	function disegna(corrente: number | null) {
		const g = tela?.getContext('2d');
		if (!tela || !g || !larghezza || !altezza) return;
		const [w, h] = [larghezza, altezza];
		const dpr = devicePixelRatio || 1;
		if (tela.width !== Math.round(w * dpr) || tela.height !== Math.round(h * dpr)) {
			tela.width = Math.round(w * dpr);
			tela.height = Math.round(h * dpr);
		}
		g.setTransform(dpr, 0, 0, dpr, 0, 0);
		g.clearRect(0, 0, w, h);
		// i colori vengono dai token, letti a ogni disegno: seguono tema chiaro/scuro e contrasto alto
		const stile = getComputedStyle(tela);
		const colore = (nome: string) => stile.getPropertyValue(`--colore-${nome}`).trim();
		const max = SEMITONI * 100;
		const y = (c: number) => h / 2 - (Math.max(-max, Math.min(max, c)) / max) * (h / 2 - MARGINE);
		const tol = Math.min(tolleranzaCents, max);
		const linea = (yy: number) => {
			g.beginPath();
			g.moveTo(0, yy);
			g.lineTo(w, yy);
			g.stroke();
		};

		// un semitono per riga
		g.strokeStyle = colore('bordo');
		g.lineWidth = 1;
		for (let s = -SEMITONI; s <= SEMITONI; s++) if (s) linea(Math.round(y(s * 100)) + 0.5);

		// la fascia giusta, con i bordi tratteggiati
		g.fillStyle = colore('successo-tenue');
		g.fillRect(0, y(tol), w, y(-tol) - y(tol));
		g.strokeStyle = colore('successo');
		g.setLineDash([6, 4]);
		linea(y(tol));
		linea(y(-tol));
		g.setLineDash([]);

		// la nota
		g.strokeStyle = colore('accento');
		g.lineWidth = 2;
		linea(y(0));

		const xOra = w - MARGINE;
		// la scia degli ultimi secondi: spessa e piena dentro la fascia, sottile e tratteggiata fuori
		if (!ridotto && ultimoFrame) {
			const tOra = ultimoFrame.t;
			const x = (t: number) => xOra - ((tOra - t) / SCIA_S) * xOra;
			let tratto: boolean | null = null;
			const chiudiTratto = () => {
				if (tratto === null) return;
				g.strokeStyle = colore(tratto ? 'successo' : 'testo-tenue');
				g.lineWidth = tratto ? 5 : 2.5;
				g.setLineDash(tratto ? [] : [5, 5]);
				g.stroke();
				tratto = null;
			};
			g.lineCap = 'round';
			g.lineJoin = 'round';
			let prima: { x: number; y: number; c: number } | null = null;
			for (const p of scia) {
				if (p.freq === null) {
					chiudiTratto();
					prima = null;
					continue;
				}
				const c = cents(p.freq);
				const punto = { x: x(p.t), y: y(c), c };
				const dentro = Math.abs(c) <= tol;
				// un salto grande (es. d'ottava) interrompe la linea invece di tracciare una verticale
				const unito = prima && Math.abs(c - prima.c) <= 300;
				if (unito && tratto === dentro) g.lineTo(punto.x, punto.y);
				else {
					chiudiTratto();
					g.beginPath();
					g.moveTo(unito ? prima!.x : punto.x, unito ? prima!.y : punto.y);
					g.lineTo(punto.x, punto.y);
					tratto = dentro;
				}
				prima = punto;
			}
			chiudiTratto();
			g.setLineDash([]);
		}

		// dove si è adesso: un cerchio con l'anello dentro la fascia, con la freccia fuori
		if (corrente === null) return;
		const yy = y(corrente);
		const dentro = Math.abs(corrente) <= tol;
		g.fillStyle = colore(dentro ? 'successo' : 'accento');
		g.beginPath();
		g.arc(xOra, yy, 9, 0, 2 * Math.PI);
		g.fill();
		if (dentro) {
			g.strokeStyle = colore('successo');
			g.lineWidth = 2;
			g.beginPath();
			g.arc(xOra, yy, 15, 0, 2 * Math.PI);
			g.stroke();
		} else {
			const verso = corrente < 0 ? -1 : 1; // -1: la freccia punta in su
			g.beginPath();
			g.moveTo(xOra, yy + verso * 32);
			g.lineTo(xOra - 8, yy + verso * 16);
			g.lineTo(xOra + 8, yy + verso * 16);
			g.closePath();
			g.fill();
		}
	}
</script>

<div class="misuratore">
	{#if nomeTarget}<p class="nota">{m.audio_pitch_nota({ nome: nomeTarget })}</p>{/if}
	<div
		class="area"
		bind:clientWidth={larghezza}
		bind:clientHeight={altezza}
		role="img"
		aria-label={nomeTarget
			? m.audio_pitch_etichetta({ nome: nomeTarget })
			: m.audio_pitch_etichetta_generica()}
	>
		<canvas bind:this={tela}></canvas>
	</div>
	<!-- visibile subito; ai lettori di schermo arriva l'annuncio, più calmo -->
	<p class={['indicazione', stato]} aria-hidden="true">
		{TESTI[stato]()}
		{#if FRECCE[stato]}<span class="freccia">{FRECCE[stato]}</span>{/if}
	</p>
	<p class="annuncio" aria-live="polite">{annuncio}</p>
</div>

<style>
	.misuratore {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-3);
		position: relative;
	}
	.nota {
		font-weight: var(--peso-medio);
	}
	.area {
		position: relative;
		height: 14rem;
		border: 1px solid var(--colore-bordo-forte);
		border-radius: var(--raggio-m);
		background: var(--colore-superficie);
		overflow: hidden;
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.indicazione {
		min-height: calc(var(--testo-xl) * var(--interlinea-testo));
		font-size: var(--testo-xl);
		font-weight: var(--peso-forte);
		color: var(--colore-testo);
	}
	.indicazione.giusto {
		color: var(--colore-successo);
	}
	.attesa,
	.ascolta {
		font-weight: var(--peso-normale);
		color: var(--colore-testo-tenue);
	}
	.freccia {
		display: inline-block;
		margin-inline-start: var(--spazio-1);
	}
	.annuncio {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
