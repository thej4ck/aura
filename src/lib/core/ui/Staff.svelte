<script lang="ts">
	// Pentagramma SVG con i glifi di Bravura, dietro il modello `Rigo` dei contenuti.
	// Senza durata le note sono teste piene senza gambo (semibreve con durata '1'): gambi, codette
	// e pause arriveranno con il modulo Ritmo. Occupa la larghezza del contenitore.
	// Interattivo: un pulsante trasparente per ogni linea e spazio (tagli compresi), frecce su/giù per
	// muoversi, Invio o Spazio per scegliere. Il disegno è aria-hidden; i lettori di schermo leggono
	// l'elenco delle note e i pulsanti, di default con la sola posizione per non svelare le risposte.
	import type { Rigo } from '#lib/core/contenuti/schema.ts';
	import { GLIFI, type Glifo } from '#lib/core/musica/glifi.ts';
	import {
		nomeNota,
		nomeNotaParlato,
		scomponi,
		type Lettera,
		type NomiNote
	} from '#lib/core/musica/note.ts';
	import {
		QUINTA_LINEA,
		SELEZIONABILI,
		altezzaDaPasso,
		nomePosizione,
		passiSelezionabili,
		passo as passoDi,
		segniArmatura,
		segniDaMostrare,
		tagli,
		type Segno
	} from '#lib/core/musica/notazione.ts';
	import { m } from '#lib/paraglide/messages.js';

	type Props = {
		rigo: Rigo;
		/** nome accessibile del pentagramma, es. "La scala di Do" */
		etichetta: string;
		interattivo?: boolean;
		onpick?: (scelta: { passo: number; altezza: string }) => void;
		/** note evidenziate: indici in `rigo.note` o altezze esatte ('G4') */
		evidenzia?: readonly (number | string)[];
		/**
		 * note di riferimento (indici in `rigo.note`), es. la nota di partenza da cui si legge una melodia:
		 * più piccole e in grigio, come le note guida, e dette ai lettori di schermo
		 */
		riferimento?: readonly number[];
		/** teste colorate con i colori delle note */
		colori?: boolean;
		/** nomi visibili sotto le note */
		etichette?: boolean;
		nomiNote?: NomiNote;
		/** nomi delle note anche ai lettori di schermo (con `etichette` sono già visibili, quindi sempre) */
		rivelaNomi?: boolean;
		compatto?: boolean;
		/** passi selezionabili [min, max]; default C4–A5 in chiave di violino */
		selezionabili?: readonly [number, number];
	};

	let {
		rigo,
		etichetta,
		interattivo = false,
		onpick,
		evidenzia = [],
		riferimento = [],
		colori = false,
		etichette = false,
		nomiNote = 'solfeggio',
		rivelaNomi = false,
		compatto = false,
		selezionabili = SELEZIONABILI
	}: Props = $props();

	const S = 10; // uno spazio del rigo in unità del viewBox (i glifi sono in spazi)
	const MEZZO = S / 2; // un passo
	const MARGINE = 0.25 * S;
	const X_CHIAVE = MARGINE + 0.4 * S;
	const LINEE = [0, 2, 4, 6, 8];
	const ANELLO_RY = 1.05; // semiasse verticale dell'anello di evidenziazione, in spazi
	const ANELLO = ANELLO_RY * 2 + 0.3; // quanto sporge l'anello dal centro della nota, in passi
	const RIFERIMENTO = 0.7; // le teste delle note di riferimento, come quelle delle note guida
	const CHIAVI = {
		violino: { glifo: GLIFI.chiaveViolino, passo: 2 },
		basso: { glifo: GLIFI.chiaveBasso, passo: 6 }
	};
	const SEGNI: Record<Segno, Glifo> = {
		diesis: GLIFI.diesis,
		bemolle: GLIFI.bemolle,
		bequadro: GLIFI.bequadro
	};
	const COLORI: Record<Lettera, string> = {
		C: 'do',
		D: 're',
		E: 'mi',
		F: 'fa',
		G: 'sol',
		A: 'la',
		B: 'si'
	};
	// estremi verticali di un glifo posato su un passo, in passi
	const cima = (g: Glifo, p: number) => p - g.box[1] * 2;
	const fondo = (g: Glifo, p: number) => p - g.box[3] * 2;

	const armatura = $derived(rigo.armatura ?? 0);
	const chiave = $derived(CHIAVI[rigo.chiave]);
	const segni = $derived(segniArmatura(armatura, rigo.chiave));
	const note = $derived.by(() => {
		const segniNote = segniDaMostrare(
			rigo.note.map((n) => n.altezza),
			armatura
		);
		return rigo.note.map((nota, i) => ({
			i,
			altezza: nota.altezza,
			passo: passoDi(nota.altezza, rigo.chiave),
			testa: nota.durata === '1' ? GLIFI.testaSemibreve : GLIFI.testaPiena,
			segno: segniNote[i],
			colore: COLORI[scomponi(nota.altezza).lettera],
			evidenziata: evidenzia.some((e) => e === i || e === nota.altezza),
			riferimento: riferimento.includes(i)
		}));
	});

	// verticale: tutto ciò che si disegna, più le aree di tocco
	const v = $derived.by(() => {
		let su = Math.max(QUINTA_LINEA, cima(chiave.glifo, chiave.passo));
		let giu = Math.min(0, fondo(chiave.glifo, chiave.passo));
		for (const s of segni) {
			su = Math.max(su, cima(SEGNI[s.segno], s.passo));
			giu = Math.min(giu, fondo(SEGNI[s.segno], s.passo));
		}
		for (const n of note) {
			const g = n.segno ? SEGNI[n.segno] : n.testa;
			const anello = n.evidenziata ? ANELLO : 0;
			su = Math.max(su, cima(n.testa, n.passo), cima(g, n.passo), n.passo + anello);
			giu = Math.min(giu, fondo(n.testa, n.passo), fondo(g, n.passo), n.passo - anello);
		}
		// interattivo: c'è già posto per l'anello di una nota scelta, così il rigo non si sposta al tocco
		if (interattivo) {
			su = Math.max(su, selezionabili[1] + ANELLO);
			giu = Math.min(giu, selezionabili[0] - ANELLO);
		}
		const margine = 0.4 * S;
		const rigoH = 2 * margine + (su - giu) * MEZZO;
		return {
			yPrima: margine + su * MEZZO,
			altezza: rigoH + (etichette ? 1.6 * S : 0),
			yEtichette: rigoH + 1.1 * S
		};
	});
	const y = (p: number) => v.yPrima - p * MEZZO;

	// orizzontale: chiave, armatura, poi un posto per nota (almeno uno). La nota-fantasma dell'interattivo
	// sta nell'ultimo posto, anche sopra una nota già scelta: così il rigo non si allarga al tocco.
	const h = $derived.by(() => {
		let x = X_CHIAVE + (chiave.glifo.larghezza + 0.6) * S;
		const xSegni = segni.map((s) => {
			const x0 = x;
			x += (SEGNI[s.segno].larghezza + 0.1) * S;
			return x0;
		});
		if (segni.length) x += 0.7 * S;
		const conSegni = note.some((n) => n.segno);
		const posto = (conSegni ? 3.6 : 2.4) * S; // posto minimo: sui telefoni il rigo resta leggibile
		const posti = Math.max(1, note.length);
		return {
			inizio: x,
			xSegni,
			posti,
			minimo: x + posti * posto + MARGINE,
			spostamento: conSegni ? 0.6 * S : 0
		};
	});

	// larghezza misurata: il viewBox segue le proporzioni del riquadro, così le linee lo riempiono
	let largoPx = $state(0);
	let altoPx = $state(0);
	const larghezza = $derived(
		Math.max(h.minimo, largoPx && altoPx ? (v.altezza * largoPx) / altoPx : 0)
	);
	const centro = (i: number) => {
		const libero = larghezza - MARGINE - h.inizio;
		const passoX = Math.min(libero / h.posti, 7 * S); // ponytail: note equidistanti, niente spaziatura ritmica
		return h.inizio + (libero - passoX * h.posti) / 2 + (i + 0.5) * passoX + h.spostamento;
	};

	const conNomi = $derived(rivelaNomi || etichette);
	const parlato = (altezza: string, p: number) =>
		m.notazione_nome_e_posizione({
			nome: nomeNotaParlato(altezza, nomiNote),
			posizione: nomePosizione(p)
		});
	function descrizione(n: (typeof note)[number]): string {
		const posizione = nomePosizione(n.passo);
		let d = conNomi
			? parlato(n.altezza, n.passo)
			: n.segno
				? m.notazione_con_segno({
						descrizione: posizione,
						segno: m.notazione_segno({ segno: n.segno })
					})
				: posizione;
		if (n.riferimento) d = m.notazione_riferimento({ descrizione: d });
		if (n.evidenziata) d = m.notazione_evidenziata({ descrizione: d });
		return m.notazione_nota({ numero: n.i + 1, totale: note.length, descrizione: d });
	}

	// interazione
	const passi = $derived(passiSelezionabili(selezionabili));
	let corrente = $state(4); // roving tabindex: si parte dalla terza linea
	const tabulabile = $derived(
		passi.includes(corrente) ? corrente : passi[Math.floor(passi.length / 2)]
	);
	let sopra = $state<number>();
	let fuoco = $state(false);
	const fantasma = $derived(sopra ?? (fuoco ? tabulabile : undefined));
	const guide = $derived(passi.filter((p) => tagli(p).at(-1) === p));
	const altezzaSu = (p: number) => altezzaDaPasso(p, rigo.chiave, armatura);
	// area di tocco di un passo, in % del riquadro: mezzo spazio; le due estreme arrivano ai bordi
	const banda = (p: number) => {
		const inizio = p === selezionabili[1] ? 0 : y(p) - MEZZO / 2;
		const fine = p === selezionabili[0] ? v.altezza : y(p) + MEZZO / 2;
		return { top: (inizio / v.altezza) * 100, height: ((fine - inizio) / v.altezza) * 100 };
	};

	function scegli(p: number) {
		corrente = p;
		onpick?.({ passo: p, altezza: altezzaSu(p) });
	}

	function tasto(e: KeyboardEvent) {
		const [min, max] = selezionabili;
		const dove: Record<string, number> = {
			ArrowUp: tabulabile + 1,
			ArrowDown: tabulabile - 1,
			Home: max,
			End: min
		};
		if (!(e.key in dove)) return;
		e.preventDefault();
		corrente = Math.min(max, Math.max(min, dove[e.key]));
		const gruppo = (e.currentTarget as HTMLElement).parentElement;
		gruppo?.querySelector<HTMLElement>(`[data-passo="${corrente}"]`)?.focus();
	}
</script>

<div class={['staff', { interattivo, compatto }]} role="group" aria-label={etichetta}>
	<div
		class="tela"
		style:--u={v.altezza / S}
		style:--r={v.altezza / h.minimo}
		bind:clientWidth={largoPx}
		bind:clientHeight={altoPx}
	>
		<svg viewBox="0 0 {larghezza} {v.altezza}" aria-hidden="true" focusable="false">
			{#each LINEE as p (p)}
				<line class="linea" x1={MARGINE} x2={larghezza - MARGINE} y1={y(p)} y2={y(p)} />
			{/each}
			<path d={chiave.glifo.d} transform="translate({X_CHIAVE} {y(chiave.passo)}) scale({S})" />
			{#each segni as s, k (k)}
				<path d={SEGNI[s.segno].d} transform="translate({h.xSegni[k]} {y(s.passo)}) scale({S})" />
			{/each}

			{#if interattivo}
				{@const x0 = centro(h.posti - 1) - (GLIFI.testaPiena.larghezza * S) / 2}
				{@const x1 = x0 + GLIFI.testaPiena.larghezza * S}
				{#each guide as t (t)}
					<line class="guida" x1={x0 - 0.4 * S} x2={x1 + 0.4 * S} y1={y(t)} y2={y(t)} />
				{/each}
				{#if fantasma !== undefined}
					{#each tagli(fantasma) as t (t)}
						<line class="taglio" x1={x0 - 0.4 * S} x2={x1 + 0.4 * S} y1={y(t)} y2={y(t)} />
					{/each}
					<path
						class="fantasma"
						d={GLIFI.testaPiena.d}
						transform="translate({x0} {y(fantasma)}) scale({S})"
					/>
				{/if}
			{/if}

			{#each note as n (n.i)}
				{@const cx = centro(n.i)}
				{@const scala = n.riferimento ? RIFERIMENTO : 1}
				{@const x0 = cx - (n.testa.larghezza * S * scala) / 2}
				{#each tagli(n.passo) as t (t)}
					<line
						class="taglio"
						x1={x0 - 0.4 * S}
						x2={x0 + (n.testa.larghezza * scala + 0.4) * S}
						y1={y(t)}
						y2={y(t)}
					/>
				{/each}
				{#if n.segno}
					{@const g = SEGNI[n.segno]}
					<path
						d={g.d}
						transform="translate({x0 - (g.larghezza + 0.25) * S} {y(n.passo)}) scale({S})"
					/>
				{/if}
				<path
					class={[colori && `nota-${n.colore}`, { riferimento: n.riferimento }]}
					data-nota={n.i}
					d={n.testa.d}
					transform="translate({x0} {y(n.passo)}) scale({S * scala})"
				/>
				{#if n.evidenziata}
					<ellipse
						class="anello"
						{cx}
						cy={y(n.passo)}
						rx={(n.testa.larghezza / 2 + 0.55) * S}
						ry={ANELLO_RY * S}
					/>
				{/if}
				{#if etichette}
					<text
						x={cx}
						y={v.yEtichette}
						class={[colori && `nota-${n.colore}`, { evidenziata: n.evidenziata }]}
					>
						{nomeNota(n.altezza, nomiNote)}
					</text>
				{/if}
			{/each}
		</svg>

		{#if interattivo}
			<div class="tocchi" role="group" aria-label={m.notazione_scegli()}>
				{#each passi as p (p)}
					<button
						type="button"
						class="tocco"
						data-passo={p}
						style:top="{banda(p).top}%"
						style:height="{banda(p).height}%"
						tabindex={p === tabulabile ? 0 : -1}
						aria-label={rivelaNomi ? parlato(altezzaSu(p), p) : nomePosizione(p)}
						onclick={() => scegli(p)}
						onkeydown={tasto}
						onfocus={() => {
							corrente = p;
							fuoco = true;
						}}
						onblur={() => (fuoco = false)}
						onpointerenter={() => (sopra = p)}
						onpointerleave={() => (sopra = undefined)}
					></button>
				{/each}
			</div>
		{/if}
	</div>

	{#if note.length}
		<ol class="sr-only">
			{#each note as n (n.i)}
				<li>{descrizione(n)}</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.staff {
		/* uno spazio del rigo: le aree di tocco dell'interattivo sono mezzo spazio */
		--s: 1.5rem;
		container-type: inline-size;
		position: relative;
		width: 100%;
	}
	.compatto {
		--s: 1rem;
	}
	.interattivo {
		--s: calc(var(--target) * 1.25);
	}
	.tela {
		position: relative;
		/* altezza naturale, ridotta se il contenuto minimo non ci sta in larghezza */
		height: min(calc(var(--u) * var(--s)), calc(100cqw * var(--r)));
	}
	svg {
		display: block;
		width: 100%;
		height: 100%;
	}
	/* spessori di Bravura (engravingDefaults), in decimi di spazio */
	.linea {
		stroke: var(--colore-testo);
		stroke-width: 1.3;
	}
	.taglio {
		stroke: var(--colore-testo);
		stroke-width: 1.6;
	}
	.guida {
		stroke: var(--colore-bordo-forte);
		stroke-width: 1.2;
		stroke-dasharray: 2 2;
	}
	path {
		fill: var(--colore-testo);
	}
	.fantasma {
		fill: var(--colore-accento);
		opacity: 0.55;
	}
	.anello {
		fill: none;
		stroke: var(--colore-accento);
		stroke-width: 3;
	}
	text {
		fill: var(--colore-testo);
		font-family: var(--font);
		font-size: 10px; /* uno spazio: nel viewBox i px sono unità */
		font-weight: var(--peso-medio);
		text-anchor: middle;
	}
	text.evidenziata {
		font-weight: var(--peso-forte);
		text-decoration: underline;
	}
	.nota-do {
		fill: var(--nota-do);
	}
	.nota-re {
		fill: var(--nota-re);
	}
	.nota-mi {
		fill: var(--nota-mi);
	}
	.nota-fa {
		fill: var(--nota-fa);
	}
	.nota-sol {
		fill: var(--nota-sol);
	}
	.nota-la {
		fill: var(--nota-la);
	}
	.nota-si {
		fill: var(--nota-si);
	}
	/* dopo i colori delle note: la nota di riferimento resta grigia anche con `colori` */
	path.riferimento {
		fill: var(--colore-testo-tenue);
	}
	.tocchi {
		position: absolute;
		inset: 0;
	}
	.tocco {
		position: absolute;
		left: 0;
		width: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: var(--raggio-s);
		background: transparent;
		cursor: pointer;
		touch-action: manipulation;
		transition: background-color var(--durata-breve) var(--easing);
	}
	.tocco:hover {
		background: color-mix(in srgb, var(--colore-accento) 14%, transparent);
	}
	.tocco:focus-visible {
		outline: var(--bordo-focus) solid var(--colore-focus);
		outline-offset: calc(-1 * var(--bordo-focus));
		background: color-mix(in srgb, var(--colore-focus) 10%, transparent);
	}
</style>
