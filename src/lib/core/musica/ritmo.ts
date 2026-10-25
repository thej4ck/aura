// Ritmo (ADR 0008), tutto puro: durate, battute, sillabe, eventi da suonare e valutazione dei battiti.
// Un battito è una semiminima (tempi 2/4, 3/4, 4/4). I tempi in secondi sono sul clock audio, nel
// riferimento del suono sentito (tempoSentito in audio/contesto.ts); nei test sono numeri.
// Le durate sono frazioni diadiche (¼, ½, ¾, 1, 1½…): somme e confronti sono esatti, niente epsilon.
import {
	ABBINAMENTO_MAX_MS,
	CALO_A_MS,
	SCARTO_MAX_MS,
	VOLUME_CLIC_PIANO
} from '#lib/core/audio/costanti.ts';
import type { Colpo } from '#lib/core/audio/percussioni.ts';
import type { Durata, Tempo } from '#lib/core/contenuti/schema.ts';

/**
 * Quello che serve di una Nota per il ritmo. Scritto a mano e non come Pick<Nota>: lo usa anche lo
 * schema, prima della validazione, e i tipi non devono girare in tondo.
 */
export type NotaRitmica = { durata?: Durata; punto?: boolean; pausa?: boolean };

const BATTITI: Record<Durata, number> = { '1': 4, '2': 2, '4': 1, '8': 0.5, '16': 0.25 };

/** Durata in battiti: '4' → 1, '8' → ½, '2' puntata → 3. Senza durata vale un battito. */
export const durataBattiti = (n: NotaRitmica): number =>
	BATTITI[n.durata ?? '4'] * (n.punto ? 1.5 : 1);

/** Battiti di una battuta: '3/4' → 3. */
export const battitiPerBattuta = (tempo: Tempo): number => Number(tempo.split('/')[0]);

/** Dove comincia ogni nota, in battiti dall'inizio del rigo. */
export function inizi(note: readonly NotaRitmica[]): number[] {
	let t = 0;
	return note.map((n) => {
		const inizio = t;
		t += durataBattiti(n);
		return inizio;
	});
}

/** Battiti di tutto il rigo. */
export const lunghezza = (note: readonly NotaRitmica[]): number =>
	note.reduce((somma, n) => somma + durataBattiti(n), 0);

/**
 * Le battute: gli indici delle note di ognuna, in ordine (dopo l'ultima nota di ognuna va una stanghetta;
 * dopo l'ultima battuta, quella finale). null se una battuta non è piena: una nota a cavallo della
 * stanghetta (le legature non ci sono) o l'ultima battuta incompleta.
 */
export function battute(note: readonly NotaRitmica[], tempo: Tempo): number[][] | null {
	const piena = battitiPerBattuta(tempo);
	const tutte: number[][] = [];
	let corrente: number[] = [];
	let pos = 0;
	for (const [i, n] of note.entries()) {
		corrente.push(i);
		pos += durataBattiti(n);
		if (pos > piena) return null;
		if (pos === piena) {
			tutte.push(corrente);
			corrente = [];
			pos = 0;
		}
	}
	return corrente.length ? null : tutte;
}

/**
 * Sillabe ritmiche (metodo Kodály): TA semiminima, TI croma (TI-TI la coppia), TA-A minima, TA-A-A
 * minima puntata, TA-A-A-A semibreve, SST pausa. I testi visibili sono in Paraglide (notazione.ts).
 */
export type Sillaba = 'ta' | 'ti' | 'ta-a' | 'ta-a-a' | 'ta-a-a-a' | 'sst';

export function sillaba(n: NotaRitmica): Sillaba {
	if (n.pausa) return 'sst';
	const b = durataBattiti(n);
	return b < 1 ? 'ti' : b >= 4 ? 'ta-a-a-a' : b >= 3 ? 'ta-a-a' : b >= 2 ? 'ta-a' : 'ta';
}

const DA_SILLABA: Record<string, NotaRitmica[]> = {
	ta: [{ durata: '4' }],
	ti: [{ durata: '8' }],
	'ti-ti': [{ durata: '8' }, { durata: '8' }],
	'ta-a': [{ durata: '2' }],
	'ta-a-a': [{ durata: '2', punto: true }],
	'ta-a-a-a': [{ durata: '1' }],
	sst: [{ durata: '4', pausa: true }]
};

/**
 * Un rigo ritmico scritto con le sillabe, per i contenuti e i test: rigoRitmico('ta ti-ti ta-a sst',
 * '4/4'). TI-TI sono due crome. Lancia con una sillaba sconosciuta; le battute le controlla lo schema.
 */
export function rigoRitmico(sillabe: string, tempo?: Tempo) {
	const note = sillabe
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.flatMap((s) => {
			if (!Object.hasOwn(DA_SILLABA, s)) {
				throw new Error(`sillaba ritmica sconosciuta: "${s}" (${Object.keys(DA_SILLABA)})`);
			}
			return DA_SILLABA[s].map((x) => ({ ...x }));
		});
	return { ritmico: true as const, ...(tempo ? { tempo } : {}), note };
}

// --- Eventi da suonare --------------------------------------------------------------------------

export type EventoRitmo = {
	/** indice in rigo.note */
	nota: number;
	/** secondi dall'inizio della riproduzione, attacco compreso */
	inizio: number;
	/** secondi */
	durata: number;
	pausa: boolean;
	/** la nota apre una battuta (solo con il tempo in chiave): si suona con l'accento */
	accento: boolean;
};

export type ClicRitmo = {
	inizio: number;
	/** primo battito di una battuta (solo con il tempo in chiave) */
	accento: boolean;
	/** fa parte dell'attacco, le battute di soli clic prima delle note */
	attacco: boolean;
};

export type EventiRitmo = {
	note: EventoRitmo[];
	/** un clic per battito, dall'inizio dell'attacco fino alla fine del rigo */
	clic: ClicRitmo[];
	/** secondi di un battito */
	battitoS: number;
	/** secondi dell'attacco: la prima nota parte qui */
	attaccoS: number;
	/** secondi dall'inizio alla fine dell'ultima nota */
	fineS: number;
};

/**
 * Gli eventi di un rigo a `bpm` battiti al minuto, preceduti da `attacco` battute di soli clic (il
 * conteggio "1, 2, 3, 4" prima di battere). Senza tempo in chiave si conta in 4 e non ci sono accenti.
 */
export function eventiRitmo(
	rigo: { note: readonly NotaRitmica[]; tempo?: Tempo },
	bpm: number,
	attacco = 0
): EventiRitmo {
	const battitoS = 60 / bpm;
	const perBattuta = rigo.tempo ? battitiPerBattuta(rigo.tempo) : 4;
	const accento = (b: number) => rigo.tempo !== undefined && b % perBattuta === 0;
	const attaccoB = attacco * perBattuta;
	const iniziB = inizi(rigo.note);
	const totaleB = attaccoB + lunghezza(rigo.note);
	return {
		note: rigo.note.map((n, i) => ({
			nota: i,
			inizio: (attaccoB + iniziB[i]) * battitoS,
			durata: durataBattiti(n) * battitoS,
			pausa: n.pausa === true,
			accento: accento(iniziB[i])
		})),
		clic: Array.from({ length: Math.ceil(totaleB) }, (_, b) => ({
			inizio: b * battitoS,
			accento: accento(b),
			attacco: b < attaccoB
		})),
		battitoS,
		attaccoS: attaccoB * battitoS,
		fineS: totaleB * battitoS
	};
}

/**
 * Cosa suona il metronomo: niente, solo l'attacco (il turno col microfono: poi l'altoparlante tace),
 * tutti i battiti, oppure tutti con quelli dopo l'attacco piano (il turno col tocco).
 */
export type Metronomo = 'no' | 'attacco' | 'tutti' | 'piano';

/** I colpi da suonare (audio/percussioni.ts): le note col legnetto, le pause tacciono, più i clic scelti. */
export function colpi(
	e: EventiRitmo,
	{ note = true, metronomo = 'no' }: { note?: boolean; metronomo?: Metronomo } = {}
): Colpo[] {
	const legnetto = note
		? e.note
				.filter((n) => !n.pausa)
				.map((n): Colpo => ({
					timbro: 'legnetto',
					inizio: n.inizio,
					durata: n.durata,
					accento: n.accento
				}))
		: [];
	const clic = e.clic
		.filter((c) => metronomo !== 'no' && (metronomo !== 'attacco' || c.attacco))
		.map((c): Colpo => ({
			timbro: 'clic',
			inizio: c.inizio,
			accento: c.accento,
			volume: metronomo === 'piano' && !c.attacco ? VOLUME_CLIC_PIANO : 1
		}));
	return [...legnetto, ...clic];
}

// --- Valutazione dei battiti --------------------------------------------------------------------

export type Giudizio = 'giusto' | 'presto' | 'tardi' | 'mancato';

export type NotaBattuta = {
	/** indice in rigo.note (le pause non si battono e non ci sono) */
	nota: number;
	/** quando andava battuta (s, clock audio) */
	atteso: number;
	/** il battito abbinato, così come è arrivato; null se mancata */
	battito: number | null;
	/** battito − atteso − scarto (s): negativo = presto; null se mancata */
	errore: number | null;
	giudizio: Giudizio;
};

export type BattitoInPiu = {
	t: number;
	/** la pausa in cui cade (indice in rigo.note): "nella pausa le mani riposano" */
	pausa?: number;
};

/** Il primo problema in ordine di tempo, per un feedback che dice cosa fare. */
export type Consiglio =
	{ tipo: 'presto' | 'tardi' | 'mancato'; nota: number } | { tipo: 'in-piu'; pausa?: number };

export type ValutazioneRitmo = {
	/** una per nota da battere, in ordine */
	note: NotaBattuta[];
	inPiu: BattitoInPiu[];
	/** scarto costante tolto (s, positivo = in ritardo), entro SCARTO_MAX_MS */
	scarto: number;
	giuste: number;
	/** tutte le note giuste e nessun battito in più */
	riuscita: boolean;
	/** null se riuscita */
	consiglio: Consiglio | null;
};

const margineS = () => (ABBINAMENTO_MAX_MS + SCARTO_MAX_MS) / 1000;

/**
 * Da quando a quando (clock audio) i battiti contano: dall'inizio delle note, meno il margine di
 * abbinamento e scarto, fino alla fine del rigo o all'ultima nota più il margine. I battiti fuori (sopra
 * l'attacco, dopo la fine) non contano; il turno del bambino finisce alla fine della finestra.
 */
export function finestraAscolto(e: EventiRitmo, t0: number): [number, number] {
	const ultima = e.note.findLast((n) => !n.pausa);
	const fine = Math.max(e.fineS, ultima ? ultima.inizio + margineS() : 0);
	return [t0 + e.attaccoS - margineS(), t0 + fine];
}

/** Indice del tempo più vicino a `t` in `tempi` (ordinati, non vuoto). */
function vicino(tempi: readonly number[], t: number): number {
	let k = 0;
	while (k + 1 < tempi.length && Math.abs(tempi[k + 1] - t) < Math.abs(tempi[k] - t)) k++;
	return k;
}

function mediana(valori: readonly number[]): number {
	const v = valori.toSorted((a, b) => a - b);
	const meta = v.length >> 1;
	return v.length % 2 ? v[meta] : (v[meta - 1] + v[meta]) / 2;
}

/**
 * Lo scarto costante. Si prova ogni spostamento possibile (0 e ogni battito − nota, portato entro ±max) e
 * si tiene quello che abbina più note entro ABBINAMENTO_MAX_MS (a pari merito il più piccolo): con le note
 * fitte "la nota più vicina" senza spostamento può essere quella dopo. Lo scarto è la mediana delle
 * differenze di quell'abbinamento, entro ±max: un battito fuori dal gruppo non lo sposta.
 */
function stimaScarto(attesi: readonly number[], battiti: readonly number[], max: number): number {
	if (!attesi.length || !battiti.length) return 0;
	const abbina = ABBINAMENTO_MAX_MS / 1000;
	const entro = (x: number) => Math.min(max, Math.max(-max, x));
	const prova = (s: number) => {
		const note = new Set<number>();
		const differenze: number[] = [];
		for (const b of battiti) {
			const k = vicino(attesi, b - s);
			if (Math.abs(b - s - attesi[k]) > abbina) continue;
			note.add(k);
			differenze.push(b - attesi[k]);
		}
		return { s, abbinate: note.size, differenze };
	};
	let migliore = prova(0);
	for (const b of battiti) {
		for (const a of attesi) {
			const p = prova(entro(b - a));
			const meglio =
				p.abbinate > migliore.abbinate ||
				(p.abbinate === migliore.abbinate && Math.abs(p.s) < Math.abs(migliore.s));
			if (meglio) migliore = p;
		}
	}
	return migliore.differenze.length ? entro(mediana(migliore.differenze)) : 0;
}

/**
 * Valuta i battiti del bambino (s, clock audio, riferimento del suono sentito) contro gli eventi suonati
 * da `t0`. Toglie lo scarto costante, abbina ogni battito alla nota più vicina entro ABBINAMENTO_MAX_MS
 * (per nota vince il più vicino, gli altri sono in più) e giudica: entro `tolleranzaS` giusto, altrimenti
 * presto o tardi; senza battito mancata. I battiti fuori da finestraAscolto() non contano.
 */
export function valutaBattiti(
	e: EventiRitmo,
	t0: number,
	battiti: readonly number[],
	tolleranzaS: number
): ValutazioneRitmo {
	const attese = e.note.filter((n) => !n.pausa);
	const attesi = attese.map((n) => t0 + n.inizio);
	const [da, a] = finestraAscolto(e, t0);
	const dentro = battiti.filter((b) => b >= da && b <= a).toSorted((x, y) => x - y);
	// lo scarto non deve far saltare un battito sulla nota vicina
	const distanza = Math.min(...attesi.slice(1).map((t, i) => t - attesi[i]));
	const scarto = stimaScarto(attesi, dentro, Math.min(SCARTO_MAX_MS / 1000, distanza / 2));

	const abbinati = new Map<number, number>(); // nota da battere → battito
	const inPiu: number[] = [];
	for (const b of dentro) {
		const k = attesi.length ? vicino(attesi, b - scarto) : -1;
		const d = k < 0 ? Infinity : Math.abs(b - scarto - attesi[k]);
		const prima = abbinati.get(k);
		if (d > ABBINAMENTO_MAX_MS / 1000) inPiu.push(b);
		else if (prima === undefined) abbinati.set(k, b);
		else if (d < Math.abs(prima - scarto - attesi[k])) {
			inPiu.push(prima);
			abbinati.set(k, b);
		} else inPiu.push(b);
	}

	const note = attese.map((n, k): NotaBattuta => {
		const battito = abbinati.get(k) ?? null;
		const errore = battito === null ? null : battito - scarto - attesi[k];
		const giudizio: Giudizio =
			errore === null
				? 'mancato'
				: Math.abs(errore) <= tolleranzaS
					? 'giusto'
					: errore < 0
						? 'presto'
						: 'tardi';
		return { nota: n.nota, atteso: attesi[k], battito, errore, giudizio };
	});
	const pause = e.note.filter((n) => n.pausa);
	const extra = inPiu
		.toSorted((x, y) => x - y)
		.map((t): BattitoInPiu => {
			const r = t - scarto - t0;
			const p = pause.find((n) => r >= n.inizio && r < n.inizio + n.durata);
			return p ? { t, pausa: p.nota } : { t };
		});
	const giuste = note.filter((n) => n.giudizio === 'giusto').length;
	const riuscita = giuste === note.length && extra.length === 0;

	// il primo problema in ordine di tempo
	const problemi: { t: number; c: Consiglio }[] = [
		...note
			.filter((n) => n.giudizio !== 'giusto')
			.map((n) => ({
				t: n.battito ?? n.atteso,
				c: { tipo: n.giudizio as 'presto' | 'tardi' | 'mancato', nota: n.nota }
			})),
		...extra.map((x) => ({ t: x.t, c: { tipo: 'in-piu' as const, pausa: x.pausa } }))
	];
	const consiglio = problemi.length
		? problemi.reduce((primo, p) => (p.t < primo.t ? p : primo)).c
		: null;

	return { note, inPiu: extra, scarto, giuste, riuscita, consiglio };
}

/** Un battito del bambino da disegnare sotto le note, dopo la valutazione (prop `battiti` di Staff). */
export type SegnoBattito = {
	/** dove cade, in battiti dall'inizio del rigo (attacco escluso, scarto costante tolto) */
	battito: number;
	giudizio: Giudizio | 'in-piu';
	/** la nota del battito (indice in rigo.note); per un battito in più, la pausa in cui cade */
	nota?: number;
};

/** I segni dei battiti da disegnare sotto il rigo, in ordine; una nota mancata ha il segno al suo inizio. */
export function segniBattiti(v: ValutazioneRitmo, e: EventiRitmo, t0: number): SegnoBattito[] {
	const inBattiti = (t: number) => (t - v.scarto - t0 - e.attaccoS) / e.battitoS;
	return [
		...v.note.map((n): SegnoBattito => ({
			battito: inBattiti(n.battito ?? n.atteso + v.scarto),
			giudizio: n.giudizio,
			nota: n.nota
		})),
		...v.inPiu.map((x): SegnoBattito => ({
			battito: inBattiti(x.t),
			giudizio: 'in-piu',
			nota: x.pausa
		}))
	].toSorted((x, y) => x.battito - y.battito);
}

// --- Il turno ritmico (widget/TurnoRitmo.svelte) ------------------------------------------------

/** Da dove vengono i battiti del bambino: il tocco (dito, Spazio, Invio) o le mani dal microfono. */
export type FonteBattiti = 'tocco' | 'mani';

/**
 * Col microfono un battito arriva CALO_A_MS dopo il suo attacco (audio/battimani.ts), più il viaggio dei
 * blocchi del worklet: il turno aspetta tanto dopo la fine della finestra, per non perdere l'ultimo.
 */
export const ATTESA_MANI_S = (CALO_A_MS + 50) / 1000;

export type PianoTurno = {
	/** quello che suona il sito prima del bambino (solo a eco) */
	sito?: EventiRitmo;
	/** gli eventi del turno del bambino, attacco compreso, da `da` */
	bimbo: EventiRitmo;
	/** secondi dall'inizio della riproduzione a quello del turno del bambino (il suo t0) */
	da: number;
	/** secondi dall'inizio della riproduzione alla fine del turno: dopo, si valuta */
	fine: number;
	/** battiti di una battuta, per il battito visivo (senza tempo in chiave si conta in 4) */
	perBattuta: number;
	/** una sola riproduzione per tutto il turno: il battito non salta tra il sito e il bambino */
	colpi: Colpo[];
};

/**
 * Il piano di un turno ritmico (ADR 0008), tutto in una riproduzione e sempre a tempo. A eco prima il
 * sito: una battuta d'attacco e il ritmo col legnetto, con tutti i clic. Poi il bambino: una battuta
 * d'attacco e i suoi battiti. Col tocco il metronomo continua piano; col microfono tace dopo l'attacco, così
 * la riproduzione finisce (riproduzioneAttiva() falsa) prima della prima nota e il microfono sente. In
 * lettura c'è solo il turno del bambino.
 */
export function pianoTurno(
	rigo: { note: readonly NotaRitmica[]; tempo?: Tempo },
	bpm: number,
	{ eco, fonte }: { eco: boolean; fonte: FonteBattiti }
): PianoTurno {
	const sito = eco ? eventiRitmo(rigo, bpm, 1) : undefined;
	const bimbo = eventiRitmo(rigo, bpm, 1);
	const da = sito?.fineS ?? 0;
	const metronomo = fonte === 'mani' ? 'attacco' : 'piano';
	return {
		sito,
		bimbo,
		da,
		fine: finestraAscolto(bimbo, da)[1] + (fonte === 'mani' ? ATTESA_MANI_S : 0),
		perBattuta: rigo.tempo ? battitiPerBattuta(rigo.tempo) : 4,
		colpi: [
			...(sito ? colpi(sito, { metronomo: 'tutti' }) : []),
			...colpi(bimbo, { note: false, metronomo }).map((k) => ({ ...k, inizio: k.inizio + da }))
		]
	};
}

export type MomentoTurno = {
	/** il battito della battuta che si sente (0 = il primo), dall'attacco alla fine del ritmo; null fuori */
	battito: number | null;
	/** la nota del sito che suona (indice in rigo.note, pause comprese); null se non suona il sito */
	suona: number | null;
	/** a chi tocca: «batti» da mezzo battito prima della prima nota del bambino */
	turno: 'ascolta' | 'batti';
	finito: boolean;
};

/** Cosa mostra il turno a `t` secondi dall'inizio della riproduzione (nel riferimento del suono sentito). */
export function momentoTurno(p: PianoTurno, t: number): MomentoTurno {
	const parte = t < p.da ? p.sito : p.bimbo;
	const r = t < p.da ? t : t - p.da;
	const battito =
		parte && r >= 0 && r < parte.fineS ? Math.floor(r / parte.battitoS) % p.perBattuta : null;
	const suona =
		parte === p.sito && p.sito && r >= p.sito.attaccoS
			? p.sito.note.findLast((n) => n.inizio <= r)!.nota
			: null;
	return {
		battito,
		suona,
		turno: t >= p.da + p.bimbo.attaccoS - p.bimbo.battitoS / 2 ? 'batti' : 'ascolta',
		finito: t >= p.fine
	};
}
