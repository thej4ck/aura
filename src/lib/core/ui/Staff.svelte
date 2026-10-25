<script lang="ts">
	// Pentagramma SVG con i glifi di Bravura, dietro il modello `Rigo` dei contenuti. Occupa la larghezza
	// del contenitore.
	// Senza durata le note sono teste piene senza gambo (semibreve con durata '1'), equidistanti: è il
	// disegno di Pentagramma e Canto. Con le durate (ADR 0008) ci sono gambi, codette, crome unite a coppie
	// dentro il battito, punti e pause; la colonna di ogni nota cresce con la durata. Con il tempo ci sono le
	// cifre in chiave, le stanghette e la doppia finale; il rigo ritmico ha una linea sola, senza chiave.
	// Sotto le note, a richiesta: i nomi, le sillabe ritmiche e i battiti del bambino.
	// Interattivo: un pulsante trasparente per ogni linea e spazio (tagli compresi), frecce su/giù per
	// muoversi, Invio o Spazio per scegliere. Il disegno è aria-hidden; i lettori di schermo leggono
	// l'elenco delle note e i pulsanti, di default con la sola posizione per non svelare le risposte.
	import type { Nota, Rigo } from '#lib/core/contenuti/schema.ts';
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
		TESTI_SILLABE,
		altezzaDaPasso,
		direzioneGambo,
		glifoPausa,
		glifoTesta,
		nomeFigura,
		nomePosizione,
		passiSelezionabili,
		passo as passoDi,
		segniArmatura,
		segniDaMostrare,
		spaziature,
		tagli,
		travature,
		xDaBattito,
		type Segno
	} from '#lib/core/musica/notazione.ts';
	import { battute, inizi, lunghezza, sillaba, type SegnoBattito } from '#lib/core/musica/ritmo.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { inVista, scorrevole } from './scorrimento.ts';

	type Props = {
		rigo: Rigo;
		/** nome accessibile del pentagramma, es. "La scala di Do" */
		etichetta: string;
		interattivo?: boolean;
		onpick?: (scelta: { passo: number; altezza: string }) => void;
		/** note evidenziate: indici in `rigo.note` (anche le pause) o altezze esatte ('G4') */
		evidenzia?: readonly (number | string)[];
		/**
		 * note di riferimento (indici in `rigo.note`), es. la nota di partenza da cui si legge una melodia:
		 * più piccole e in grigio, come le note guida, e dette ai lettori di schermo
		 */
		riferimento?: readonly number[];
		/** teste colorate con i colori delle note (non le pause né il rigo ritmico) */
		colori?: boolean;
		/** nomi visibili sotto le note (non sotto le pause; nel rigo ritmico niente) */
		etichette?: boolean;
		nomiNote?: NomiNote;
		/** nomi delle note anche ai lettori di schermo (con `etichette` sono già visibili, quindi sempre) */
		rivelaNomi?: boolean;
		compatto?: boolean;
		/** passi selezionabili [min, max]; default C4–A5 in chiave di violino */
		selezionabili?: readonly [number, number];
		/**
		 * sillabe ritmiche sotto le note (TA, TI, TA-A, SST: TESTI_SILLABE in notazione.ts), anche sotto le
		 * pause; con `etichette` stanno sotto i nomi
		 */
		sillabe?: boolean;
		/**
		 * i battiti del bambino dopo la valutazione (segniBattiti in musica/ritmo.ts), sotto le note, alla
		 * x del loro `battito`: giusto, presto, tardi, mancato, in più, ognuno con una forma oltre al
		 * colore, e detti ai lettori di schermo
		 */
		battiti?: readonly SegnoBattito[];
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
		selezionabili = SELEZIONABILI,
		sillabe = false,
		battiti = []
	}: Props = $props();

	const S = 10; // uno spazio del rigo in unità del viewBox (i glifi sono in spazi)
	const MEZZO = S / 2; // un passo
	const MARGINE = 0.25 * S;
	const X_CHIAVE = MARGINE + 0.4 * S;
	const LINEE = [0, 2, 4, 6, 8];
	const CENTRALE = 4; // la terza linea: il rigo ritmico, le pause, il verso dei gambi
	const ANELLO_RY = 1.05; // semiasse verticale minimo dell'anello di evidenziazione, in spazi
	const RIFERIMENTO = 0.7; // le teste delle note di riferimento, come quelle delle note guida
	// ritmo, da Bravura (engravingDefaults e ancore delle teste): spessori e misure in spazi
	const GAMBO = 7; // 3,5 spazi, in passi
	const SPESSORE_GAMBO = 0.12;
	const ATTACCO_GAMBO = 0.168; // il gambo parte un po' sopra (su) o sotto (giù) il centro della testa
	const TRAVATURA = 0.5;
	const SOTTILE = 0.16; // stanghetta
	const SPESSA = 0.5; // la seconda della doppia finale
	const DOPPIA = SOTTILE + 0.4 + SPESSA;
	const BARRA = 1.2 * S; // il posto di una stanghetta tra due battute
	const FINALE = 0.6 * S; // dall'ultima colonna alla doppia stanghetta
	const CHIAVI = {
		violino: { glifo: GLIFI.chiaveViolino, passo: 2 },
		basso: { glifo: GLIFI.chiaveBasso, passo: 6 }
	};
	const SEGNI: Record<Segno, Glifo> = {
		diesis: GLIFI.diesis,
		bemolle: GLIFI.bemolle,
		bequadro: GLIFI.bequadro
	};
	// `dy`: y (spazi, in giù) del punto della codetta che tocca la fine del gambo (stemUpNW / stemDownSW)
	const CODETTE = {
		'8': { su: { g: GLIFI.codettaSu, dy: 0.04 }, giu: { g: GLIFI.codettaGiu, dy: -0.132 } },
		'16': { su: { g: GLIFI.codetta16Su, dy: 0.088 }, giu: { g: GLIFI.codetta16Giu, dy: -0.128 } }
	};
	const CIFRE: Record<string, Glifo> = { 2: GLIFI.tempo2, 3: GLIFI.tempo3, 4: GLIFI.tempo4 };
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
	// ponytail: larghezza stimata di una sillaba (testo di uno spazio), il testo non si misura
	const larghezzaSillaba = (n: Nota) => (TESTI_SILLABE[sillaba(n)]().length * 0.65 + 0.5) * S;

	const ritmico = $derived(rigo.ritmico === true);
	const conEtichette = $derived(etichette && !ritmico); // nel rigo ritmico non ci sono nomi
	const armatura = $derived(ritmico ? 0 : (rigo.armatura ?? 0));
	const chiave = $derived(CHIAVI[rigo.chiave]);
	const linee = $derived(ritmico ? [CENTRALE] : LINEE);
	const segni = $derived(segniArmatura(armatura, rigo.chiave));
	const tempo = $derived(
		rigo.tempo && { sopra: CIFRE[rigo.tempo.split('/')[0]], sotto: GLIFI.tempo4 }
	);
	const coppie = $derived(travature(rigo.note));
	// dopo queste note va una stanghetta (non dopo l'ultima: lì c'è la doppia finale)
	const stanghette = $derived(
		new Set(
			rigo.tempo ? (battute(rigo.note, rigo.tempo) ?? []).slice(0, -1).map((b) => b.at(-1)) : []
		)
	);

	const note = $derived.by(() => {
		// le pause e il rigo ritmico hanno un'altezza segnaposto: niente passo, segni, tagli, nomi, colori
		const vere = rigo.note.map((n) => !n.pausa && !ritmico);
		const segniVere = segniDaMostrare(
			rigo.note.filter((_, i) => vere[i]).map((n) => n.altezza),
			armatura
		);
		let k = 0;
		const base = rigo.note.map((nota, i) => {
			const vera = vere[i];
			// la pausa di semibreve pende dalla quarta linea (nel rigo ritmico dall'unica)
			const passo = vera
				? passoDi(nota.altezza, rigo.chiave)
				: nota.pausa && nota.durata === '1' && !ritmico
					? CENTRALE + 2
					: CENTRALE;
			const glifo = GLIFI[nota.pausa ? glifoPausa(nota.durata ?? '4') : glifoTesta(nota)];
			const verso = direzioneGambo(passo, ritmico);
			const gambo =
				!nota.pausa && nota.durata && nota.durata !== '1'
					? { verso, fine: passo + (verso === 'su' ? GAMBO : -GAMBO) }
					: undefined;
			const anelloPasso = passo - (glifo.box[1] + glifo.box[3]); // il centro del glifo
			return {
				i,
				nota,
				vera,
				pausa: nota.pausa === true,
				passo,
				glifo,
				gambo,
				segno: vera ? segniVere[k++] : undefined,
				colore: vera ? COLORI[scomponi(nota.altezza).lettera] : undefined,
				evidenziata: evidenzia.some((e) => e === i || (vera && e === nota.altezza)),
				riferimento: riferimento.includes(i),
				anello: {
					passo: anelloPasso,
					ry: Math.max(ANELLO_RY, (glifo.box[3] - glifo.box[1]) / 2 + 0.4)
				},
				// il punto va nello spazio: se la nota è su una linea, in quello sopra
				punto: nota.punto ? (passo % 2 === 0 ? passo + 1 : passo) : undefined
			};
		});
		// travature: gambi nel verso della nota più lontana dalla terza linea, fino alla trave orizzontale;
		// obliqua di uno spazio solo se tra le note c'è più di una quinta (un gambo verrebbe troppo lungo)
		for (const [a, b] of coppie) {
			const [pa, pb] = [base[a].passo, base[b].passo];
			const [da, db] = [Math.abs(pa - CENTRALE), Math.abs(pb - CENTRALE)];
			const verso = direzioneGambo(da > db ? pa : db > da ? pb : Math.max(pa, pb), ritmico);
			const s = verso === 'su' ? 1 : -1;
			const estremo = s * Math.max(s * pa, s * pb) + s * GAMBO;
			const obliqua = Math.abs(pa - pb) > 4 ? 2 * s : 0;
			base[a].gambo = { verso, fine: s * pa >= s * pb ? estremo : estremo - obliqua };
			base[b].gambo = { verso, fine: s * pb > s * pa ? estremo : estremo - obliqua };
		}
		const unite = new Set(coppie.flat());
		return base.map((n) => {
			const d = n.nota.durata;
			const codetta =
				n.gambo && (d === '8' || d === '16') && !unite.has(n.i)
					? CODETTE[d][n.gambo.verso]
					: undefined;
			return { ...n, codetta };
		});
	});

	// verticale: tutto ciò che si disegna, più le aree di tocco e le righe sotto il rigo
	const v = $derived.by(() => {
		let su = ritmico ? CENTRALE : Math.max(QUINTA_LINEA, cima(chiave.glifo, chiave.passo));
		let giu = ritmico ? CENTRALE : Math.min(0, fondo(chiave.glifo, chiave.passo));
		for (const s of segni) {
			su = Math.max(su, cima(SEGNI[s.segno], s.passo));
			giu = Math.min(giu, fondo(SEGNI[s.segno], s.passo));
		}
		if (tempo) {
			su = Math.max(su, cima(tempo.sopra, CENTRALE + 2));
			giu = Math.min(giu, fondo(tempo.sotto, CENTRALE - 2));
		}
		for (const n of note) {
			const g = n.segno ? SEGNI[n.segno] : n.glifo;
			const anello = n.evidenziata ? n.anello.ry * 2 + 0.3 : 0;
			su = Math.max(su, cima(n.glifo, n.passo), cima(g, n.passo), n.anello.passo + anello);
			giu = Math.min(giu, fondo(n.glifo, n.passo), fondo(g, n.passo), n.anello.passo - anello);
			if (n.gambo) {
				su = Math.max(su, n.gambo.fine);
				giu = Math.min(giu, n.gambo.fine);
			}
			if (n.gambo && n.codetta) {
				const p = n.gambo.fine + n.codetta.dy * 2;
				su = Math.max(su, cima(n.codetta.g, p));
				giu = Math.min(giu, fondo(n.codetta.g, p));
			}
		}
		// interattivo: c'è già posto per l'anello di una nota scelta, così il rigo non si sposta al tocco
		if (interattivo) {
			su = Math.max(su, selezionabili[1] + ANELLO_RY * 2 + 0.3);
			giu = Math.min(giu, selezionabili[0] - (ANELLO_RY * 2 + 0.3));
		}
		const margine = 0.4 * S;
		const rigoH = 2 * margine + (su - giu) * MEZZO;
		// le righe sotto il rigo, una dopo l'altra: nomi, sillabe, battiti
		let altezza = rigoH;
		const yEtichette = altezza + 1.1 * S;
		if (conEtichette) altezza += 1.6 * S;
		const ySillabe = altezza + 1.1 * S;
		if (sillabe) altezza += 1.6 * S;
		const yBattiti = altezza + 0.8 * S;
		if (battiti.length) altezza += 1.6 * S;
		return { yPrima: margine + su * MEZZO, altezza, yEtichette, ySillabe, yBattiti };
	});
	const y = (p: number) => v.yPrima - p * MEZZO;

	// orizzontale: chiave, armatura, tempo, poi una colonna per nota (almeno una), larga secondo la
	// durata (spaziature), e le stanghette. La nota-fantasma dell'interattivo sta nell'ultima colonna,
	// anche sopra una nota già scelta: così il rigo non si allarga al tocco.
	const h = $derived.by(() => {
		let x = ritmico ? X_CHIAVE : X_CHIAVE + (chiave.glifo.larghezza + 0.6) * S;
		const xSegni = segni.map((s) => {
			const x0 = x;
			x += (SEGNI[s.segno].larghezza + 0.1) * S;
			return x0;
		});
		if (segni.length) x += 0.7 * S;
		let xTempo = 0; // il centro delle cifre
		if (tempo) {
			const largo = Math.max(tempo.sopra.larghezza, tempo.sotto.larghezza);
			xTempo = x + (largo / 2) * S;
			x += (largo + 0.8) * S;
		}
		const conSegni = note.some((n) => n.segno);
		const spostamento = conSegni ? 0.6 * S : 0;
		const pesi = note.length ? spaziature(rigo.note) : [1];
		const peso = pesi.reduce((a, b) => a + b, 0);
		// la colonna più stretta: sui telefoni il rigo resta leggibile. Le figure ritmiche senza nomi sotto
		// stanno più strette, così due battute in 4/4 ci stanno; la colonna di una nota con la codetta o con
		// una sillaba lunga (TA-A-A-A) si allarga quanto serve, e con lei tutte, in proporzione
		const ritmato = rigo.note.some((n) => n.durata) && !conEtichette;
		const posto = (conSegni ? 3.6 : ritmato ? 1.8 : 2.4) * S;
		const unita = Math.max(
			posto,
			...note.map(
				(n, i) =>
					Math.max(n.codetta ? 2.6 * S : 0, sillabe ? larghezzaSillaba(n.nota) : 0) / pesi[i]
			)
		);
		// con la doppia finale le note non si centrano: le linee finiscono lì, anche dopo lo spostamento
		const fissi = stanghette.size * BARRA + (tempo ? FINALE + DOPPIA * S + spostamento : 0);
		return {
			inizio: x,
			xSegni,
			xTempo,
			pesi,
			peso,
			fissi,
			minimo: x + peso * unita + fissi + MARGINE,
			spostamento
		};
	});

	// larghezza misurata: il viewBox segue le proporzioni del riquadro, così le linee lo riempiono
	let largoPx = $state(0);
	let altoPx = $state(0);
	const larghezza = $derived(
		Math.max(h.minimo, largoPx && altoPx ? (v.altezza * largoPx) / altoPx : 0)
	);
	const colonne = $derived.by(() => {
		const libero = larghezza - MARGINE - h.inizio - h.fissi;
		const unita = Math.min(libero / h.peso, 7 * S);
		const x0 = h.inizio + (tempo ? 0 : (libero - unita * h.peso) / 2);
		const centri: number[] = [];
		const barre: number[] = [];
		let prima = 0; // i pesi delle colonne già messe
		let extra = 0; // i posti delle stanghette già messe
		h.pesi.forEach((p, i) => {
			centri.push(x0 + (prima + p / 2) * unita + h.spostamento + extra);
			prima += p;
			if (!stanghette.has(i)) return;
			barre.push(x0 + prima * unita + h.spostamento + extra + BARRA / 2);
			extra += BARRA;
		});
		const fine = x0 + prima * unita + h.spostamento + extra; // dopo l'ultima colonna
		return { centri, barre, fine, finale: fine + FINALE };
	});
	const fineLinee = $derived(tempo ? colonne.finale + DOPPIA * S : larghezza - MARGINE);
	const iniziB = $derived(inizi(rigo.note));
	// un battito molto presto o molto tardi resta comunque dentro il disegno
	const xBattito = (b: number) =>
		Math.min(
			larghezza - MARGINE - S,
			Math.max(
				MARGINE + S,
				xDaBattito(b, iniziB, colonne.centri, [lunghezza(rigo.note), colonne.fine])
			)
		);
	type Disegno = (typeof note)[number];
	const scala = (n: Disegno) => (n.riferimento ? RIFERIMENTO : 1);
	const xTesta = (n: Disegno) => colonne.centri[n.i] - (n.glifo.larghezza * S * scala(n)) / 2;
	// il gambo: a destra della testa se va su, a sinistra se va giù
	const xGambo = (n: Disegno) =>
		n.gambo?.verso === 'giu'
			? xTesta(n) + (SPESSORE_GAMBO / 2) * S
			: xTesta(n) + (n.glifo.larghezza * scala(n) - SPESSORE_GAMBO / 2) * S;

	const conNomi = $derived(rivelaNomi || etichette);
	// con le pause o nel rigo ritmico l'elenco è di figure, non solo di note
	const figure = $derived(ritmico || note.some((n) => n.pausa));
	const inPiu = $derived(battiti.filter((b) => b.giudizio === 'in-piu'));
	const parlato = (altezza: string, p: number) =>
		m.notazione_nome_e_posizione({
			nome: nomeNotaParlato(altezza, nomiNote),
			posizione: nomePosizione(p)
		});
	function descrizione(n: Disegno): string {
		let d: string;
		if (!n.vera) d = nomeFigura(n.nota);
		else {
			const posizione = nomePosizione(n.passo);
			d = conNomi
				? parlato(n.nota.altezza, n.passo)
				: n.segno
					? m.notazione_con_segno({
							descrizione: posizione,
							segno: m.notazione_segno({ segno: n.segno })
						})
					: posizione;
			if (n.nota.durata) d = m.notazione_con_figura({ descrizione: d, figura: nomeFigura(n.nota) });
		}
		if (sillabe) {
			d = m.notazione_con_sillaba({ descrizione: d, sillaba: TESTI_SILLABE[sillaba(n.nota)]() });
		}
		if (n.riferimento) d = m.notazione_riferimento({ descrizione: d });
		if (n.evidenziata) d = m.notazione_evidenziata({ descrizione: d });
		const giudizio = battiti.find((x) => x.nota === n.i && x.giudizio !== 'in-piu')?.giudizio;
		if (giudizio) d = m.notazione_battuta({ descrizione: d, giudizio });
		const voce = { numero: n.i + 1, totale: note.length, descrizione: d };
		return figure ? m.notazione_figura_numero(voce) : m.notazione_nota(voce);
	}
	function descrizioneInPiu(): string {
		const tutti = m.notazione_in_piu({ count: inPiu.length });
		const nellePause = inPiu.filter((b) => b.nota !== undefined).length;
		return nellePause ? m.notazione_in_piu_pause({ descrizione: tutti, count: nellePause }) : tutti;
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

	let contenitore = $state<HTMLElement>();
	// un rigo lungo su un telefono scorre: la nota evidenziata (es. quella che suona) resta in vista
	$effect(() => {
		const i = note.findLast((n) => n.evidenziata)?.i;
		if (contenitore && i !== undefined)
			inVista(contenitore, contenitore.querySelector(`[data-nota="${i}"]`));
	});
</script>

<div
	class={['staff', { interattivo, compatto }]}
	role="group"
	aria-label={etichetta}
	bind:this={contenitore}
	{@attach scorrevole}
>
	<div
		class="tela"
		style:--u={v.altezza / S}
		style:--r={v.altezza / h.minimo}
		style:--m={h.minimo / S}
		bind:clientWidth={largoPx}
		bind:clientHeight={altoPx}
	>
		<svg viewBox="0 0 {larghezza} {v.altezza}" aria-hidden="true" focusable="false">
			{#each linee as p (p)}
				<line class="linea" x1={MARGINE} x2={fineLinee} y1={y(p)} y2={y(p)} />
			{/each}
			{#if !ritmico}
				<path d={chiave.glifo.d} transform="translate({X_CHIAVE} {y(chiave.passo)}) scale({S})" />
			{/if}
			{#each segni as s, k (k)}
				<path d={SEGNI[s.segno].d} transform="translate({h.xSegni[k]} {y(s.passo)}) scale({S})" />
			{/each}
			{#if tempo}
				{#each [[tempo.sopra, CENTRALE + 2], [tempo.sotto, CENTRALE - 2]] as const as [g, p], k (k)}
					<path
						class="tempo"
						d={g.d}
						transform="translate({h.xTempo - ((g.box[0] + g.box[2]) / 2) * S} {y(p)}) scale({S})"
					/>
				{/each}
			{/if}
			{#each colonne.barre as x, k (k)}
				<line
					class="stanghetta"
					x1={x}
					x2={x}
					y1={y(ritmico ? CENTRALE + 2 : QUINTA_LINEA)}
					y2={y(ritmico ? CENTRALE - 2 : 0)}
				/>
			{/each}
			{#if tempo}
				{@const [alto, basso] = ritmico ? [CENTRALE + 2, CENTRALE - 2] : [QUINTA_LINEA, 0]}
				{@const xs = colonne.finale + (SOTTILE / 2) * S}
				{@const xg = colonne.finale + (DOPPIA - SPESSA / 2) * S}
				<line class="stanghetta finale" x1={xs} x2={xs} y1={y(alto)} y2={y(basso)} />
				<line class="stanghetta spessa finale" x1={xg} x2={xg} y1={y(alto)} y2={y(basso)} />
			{/if}

			{#if interattivo}
				{@const x0 = colonne.centri[h.pesi.length - 1] - (GLIFI.testaPiena.larghezza * S) / 2}
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
				{@const cx = colonne.centri[n.i]}
				{@const x0 = xTesta(n)}
				{#if n.vera}
					{#each tagli(n.passo) as t (t)}
						<line
							class="taglio"
							x1={x0 - 0.4 * S}
							x2={x0 + (n.glifo.larghezza * scala(n) + 0.4) * S}
							y1={y(t)}
							y2={y(t)}
						/>
					{/each}
				{/if}
				{#if n.segno}
					{@const g = SEGNI[n.segno]}
					<path
						d={g.d}
						transform="translate({x0 - (g.larghezza + 0.25) * S} {y(n.passo)}) scale({S})"
					/>
				{/if}
				<path
					class={[
						colori && n.colore && `nota-${n.colore}`,
						{ riferimento: n.riferimento, pausa: n.pausa }
					]}
					data-nota={n.i}
					d={n.glifo.d}
					transform="translate({x0} {y(n.passo)}) scale({S * scala(n)})"
				/>
				{#if n.gambo}
					{@const xg = xGambo(n)}
					{@const attacco = (n.gambo.verso === 'su' ? -ATTACCO_GAMBO : ATTACCO_GAMBO) * S}
					<line class="gambo" x1={xg} x2={xg} y1={y(n.passo) + attacco} y2={y(n.gambo.fine)} />
					{#if n.codetta}
						<path
							class="codetta"
							d={n.codetta.g.d}
							transform="translate({xg - (SPESSORE_GAMBO / 2) * S} {y(n.gambo.fine) -
								n.codetta.dy * S}) scale({S})"
						/>
					{/if}
				{/if}
				{#if n.punto !== undefined}
					<path
						class="punto"
						d={GLIFI.punto.d}
						transform="translate({x0 + (n.glifo.larghezza * scala(n) + 0.25) * S} {y(
							n.punto
						)}) scale({S})"
					/>
				{/if}
				{#if n.evidenziata}
					<ellipse
						class="anello"
						{cx}
						cy={y(n.anello.passo)}
						rx={(n.glifo.larghezza / 2 + 0.55) * S}
						ry={n.anello.ry * S}
					/>
				{/if}
				{#if conEtichette && n.vera}
					<text
						x={cx}
						y={v.yEtichette}
						class={[colori && `nota-${n.colore}`, { evidenziata: n.evidenziata }]}
					>
						{nomeNota(n.nota.altezza, nomiNote)}
					</text>
				{/if}
				{#if sillabe}
					<text x={cx} y={v.ySillabe} class={['sillaba', { evidenziata: n.evidenziata }]}>
						{TESTI_SILLABE[sillaba(n.nota)]()}
					</text>
				{/if}
			{/each}

			{#each coppie as [a, b] (a)}
				{@const [na, nb] = [note[a], note[b]]}
				{#if na.gambo && nb.gambo}
					{@const xa = xGambo(na) - (SPESSORE_GAMBO / 2) * S}
					{@const xb = xGambo(nb) + (SPESSORE_GAMBO / 2) * S}
					{@const [ya, yb] = [y(na.gambo.fine), y(nb.gambo.fine)]}
					{@const t = (na.gambo.verso === 'su' ? TRAVATURA : -TRAVATURA) * S}
					<path class="travatura" d="M{xa} {ya}L{xb} {yb}L{xb} {yb + t}L{xa} {ya + t}Z" />
				{/if}
			{/each}

			{#each battiti as b, k (k)}
				{@const bx = xBattito(b.battito)}
				{@const by = v.yBattiti}
				{@const r = 0.45 * S}
				{#if b.giudizio === 'giusto'}
					<circle class="battito giusto" cx={bx} cy={by} {r} />
				{:else if b.giudizio === 'presto'}
					<path
						class="battito presto"
						d="M{bx - 1.2 * r} {by}L{bx + 0.9 * r} {by - 1.1 * r}L{bx + 0.9 * r} {by + 1.1 * r}Z"
					/>
				{:else if b.giudizio === 'tardi'}
					<path
						class="battito tardi"
						d="M{bx + 1.2 * r} {by}L{bx - 0.9 * r} {by - 1.1 * r}L{bx - 0.9 * r} {by + 1.1 * r}Z"
					/>
				{:else if b.giudizio === 'mancato'}
					<circle class="battito mancato" cx={bx} cy={by} r={0.85 * r} />
				{:else}
					<path
						class="battito in-piu"
						d="M{bx - 0.7 * r} {by - 0.7 * r}L{bx + 0.7 * r} {by + 0.7 * r}M{bx + 0.7 * r} {by -
							0.7 * r}L{bx - 0.7 * r} {by + 0.7 * r}"
					/>
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

	{#if rigo.tempo}
		<p class="sr-only">{m.notazione_tempo({ battiti: rigo.tempo.split('/')[0] })}</p>
	{/if}
	{#if note.length}
		<ol class="sr-only">
			{#each note as n (n.i)}
				<li>{descrizione(n)}</li>
			{/each}
		</ol>
	{/if}
	{#if inPiu.length}
		<p class="sr-only">{descrizioneInPiu()}</p>
	{/if}
</div>

<style>
	.staff {
		/* uno spazio del rigo: le aree di tocco dell'interattivo sono mezzo spazio */
		--s: 1.5rem;
		/* lo spazio più piccolo, con i nomi sotto le note ancora leggibili: un rigo più lungo scorre */
		--s-min: 0.7rem;
		container-type: inline-size;
		position: relative;
		width: 100%;
		overflow-x: auto;
	}
	.compatto {
		--s: 1rem;
	}
	.interattivo {
		--s: calc(var(--target) * 1.25);
	}
	.tela {
		position: relative;
		/* altezza naturale, ridotta se il contenuto minimo non ci sta in larghezza, ma non sotto --s-min */
		height: max(
			calc(var(--u) * var(--s-min)),
			min(calc(var(--u) * var(--s)), calc(100cqw * var(--r)))
		);
		min-width: calc(var(--m) * var(--s-min));
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
	.gambo {
		stroke: var(--colore-testo);
		stroke-width: 1.2;
	}
	.stanghetta {
		stroke: var(--colore-testo);
		stroke-width: 1.6;
	}
	.stanghetta.spessa {
		stroke-width: 5;
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
	/* i battiti del bambino: la forma dice com'è andata, il colore la accompagna */
	.battito.giusto {
		fill: var(--colore-successo);
	}
	.battito.presto,
	.battito.tardi {
		fill: var(--colore-attenzione);
	}
	.battito.mancato {
		fill: none;
		stroke: var(--colore-testo-tenue);
		stroke-width: 1.5;
		stroke-dasharray: 2 1.6;
	}
	.battito.in-piu {
		fill: none;
		stroke: var(--colore-attenzione);
		stroke-width: 1.8;
		stroke-linecap: round;
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
