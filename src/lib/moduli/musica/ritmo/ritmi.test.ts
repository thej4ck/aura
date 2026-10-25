import { describe, expect, it } from 'vitest';
import { creaCasuale } from '#lib/core/casuale.ts';
import { TESTI_SILLABE, spaziature } from '#lib/core/musica/notazione.ts';
import { battute, rigoRitmico, sillaba, type NotaRitmica } from '#lib/core/musica/ritmo.ts';
import {
	GIRI_ASCOLTO,
	GIRI_ECO,
	LIVELLI,
	MAX_BATTITI_ECO,
	RIUSCITI_PER_SALIRE,
	battitiDi,
	domandeAscolto,
	dopoRitmo,
	itemDi,
	leggiLettura,
	prossimoRitmo,
	rigoDi,
	serieEco,
	suonanoUguali,
	type Ritmo
} from './ritmi';

/**
 * La larghezza minima di un rigo ritmico, in spazi del rigo, come la calcola ui/Staff.svelte: una colonna
 * per figura, larga secondo la durata (spaziature), almeno 1,8 spazi e quanto la sua sillaba, più
 * chiave, tempo, stanghette e margini (6,4 spazi, misurati). Al minimo uno spazio è 0,7rem, 11,2 px: oltre
 * il rigo scorre, e un bambino che legge e batte non può scorrerlo. A 360 px il rigo di un turno ritmico ha
 * 278 px, quello di un'opzione di `scegli-ritmo` 250 (misurati). Se cambia il layout dello Staff la stima
 * va rifatta; la prova vera è l'e2e a 360 px (tests/ritmo.modulo.dev.spec.ts).
 */
function spazi(rigo: { note: readonly NotaRitmica[] }, sillabe: boolean): number {
	const pesi = spaziature(rigo.note);
	const unita = Math.max(
		1.8,
		...rigo.note.map((n, i) =>
			sillabe ? (TESTI_SILLABE[sillaba(n)]().length * 0.65 + 0.5) / pesi[i] : 0
		)
	);
	return pesi.reduce((a, b) => a + b, 0) * unita + 6.4;
}
const SPAZI_TURNO = 278 / 11.2;
const SPAZI_OPZIONE = 250 / 11.2;

const SEMI = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);
const livelloDi = (x: Ritmo) => LIVELLI.findIndex((l) => l.includes(x));

describe('i ritmi dei giochi', () => {
	it('sono righi validi, diversi tra loro, e nessuno comincia con la pausa', () => {
		const tutti = LIVELLI.flat();
		expect(new Set(tutti.map((x) => `${x.sillabe} ${x.tempo}`)).size).toBe(tutti.length);
		for (const x of tutti) {
			const rigo = rigoDi(x);
			expect(rigo.ritmico).toBe(true);
			expect(rigo.note[0].pausa, x.sillabe).toBeFalsy();
		}
	});

	it('fino al livello 2 durano quattro battiti, senza tempo; al 3 sono due battute piene', () => {
		for (const x of LIVELLI.slice(0, 3).flat()) {
			expect(battitiDi(x), x.sillabe).toBe(4);
			expect(x.tempo).toBeUndefined();
		}
		for (const x of LIVELLI[3]) {
			expect(x.tempo, x.sillabe).toBeDefined();
			expect(battute(rigoRitmico(x.sillabe).note, x.tempo!), x.sillabe).toHaveLength(2);
		}
		expect(new Set(LIVELLI[3].map((x) => x.tempo))).toEqual(new Set(['2/4', '3/4', '4/4']));
	});

	it('ogni livello porta la sua figura: TA-A al livello 1, SST al 2, e niente prima', () => {
		const ha = (x: Ritmo, s: string) => x.sillabe.split(' ').includes(s);
		for (const x of LIVELLI[0]) expect(ha(x, 'ta-a') || ha(x, 'sst'), x.sillabe).toBe(false);
		for (const x of LIVELLI[1]) {
			expect(ha(x, 'ta-a'), x.sillabe).toBe(true);
			expect(ha(x, 'sst'), x.sillabe).toBe(false);
		}
		for (const x of LIVELLI[2]) expect(ha(x, 'sst'), x.sillabe).toBe(true);
	});

	it('TA-A e TA SST suonano uguali all’orecchio; un suono in più o in meno no', () => {
		const rigo = (s: string) => rigoRitmico(s);
		expect(suonanoUguali(rigo('ta ta ta-a'), rigo('ta ta ta sst'))).toBe(true);
		expect(suonanoUguali(rigo('ta-a ta ta'), rigo('ta sst ta ta'))).toBe(true);
		expect(suonanoUguali(rigo('ta ta ta-a'), rigo('ta ta ta ta'))).toBe(false);
		expect(suonanoUguali(rigo('ta ti-ti ta ta'), rigo('ta ta ti-ti ta'))).toBe(false);
	});

	it('stanno interi su un telefono di 360 px: nel turno con le sillabe, tra le opzioni senza', () => {
		for (const x of LIVELLI.flat())
			expect(spazi(rigoDi(x), true), x.sillabe).toBeLessThan(SPAZI_TURNO);
		for (const g of GIRI_ASCOLTO)
			for (const x of LIVELLI[g.livello])
				expect(spazi(rigoDi(x), false), x.sillabe).toBeLessThan(SPAZI_OPZIONE);
		// la stima rifà le misure: due battute di 4/4 con le crome non ci stavano (354 px)
		expect(spazi(rigoRitmico('ta ta ti-ti ta ta-a ta-a', '4/4'), false) * 11.2).toBeCloseTo(
			354,
			-1
		);
	});

	it('l’item ha una sillaba per nota, come batti-ritmo', () => {
		expect(itemDi(rigoDi({ sillabe: 'ta ti-ti ta-a sst' }))).toBe('ta ti ti ta-a sst');
	});
});

describe('Eco ritmica', () => {
	it('i ritmi crescono piano, una figura alla volta, tutti diversi e mai troppo lunghi', () => {
		for (const seme of SEMI) {
			const serie = serieEco(seme);
			expect(serie.map(livelloDi)).toEqual([...GIRI_ECO]);
			expect(new Set(serie).size).toBe(serie.length);
			for (const x of serie) expect(battitiDi(x)).toBeLessThanOrEqual(MAX_BATTITI_ECO);
		}
	});

	it('stesso seed, stessa serie', () => {
		expect(serieEco(42)).toEqual(serieEco(42));
		expect(SEMI.map((s) => serieEco(s)[0].sillabe)).not.toEqual(
			SEMI.map(() => serieEco(SEMI[0])[0].sillabe)
		);
	});
});

describe('Che ritmo è?', () => {
	it('il ritmo giusto è del livello del giro, gli altri suonano diversi da lui e tra loro', () => {
		for (const seme of SEMI) {
			const domande = domandeAscolto(seme);
			expect(domande).toHaveLength(GIRI_ASCOLTO.length);
			domande.forEach((d, k) => {
				const { livello, opzioni } = GIRI_ASCOLTO[k];
				expect(d.ritmi).toHaveLength(opzioni);
				expect(livelloDi(d.ritmi[d.corretta])).toBe(livello);
				for (const x of d.ritmi) expect(livelloDi(x)).toBeLessThanOrEqual(livello);
				for (const [i, a] of d.ritmi.entries())
					for (const b of d.ritmi.slice(i + 1))
						expect(suonanoUguali(rigoDi(a), rigoDi(b)), `${a.sillabe} / ${b.sillabe}`).toBe(false);
				// mai lo stesso ritmo da riconoscere due giri di fila
				if (k) expect(d.ritmi[d.corretta]).not.toBe(domande[k - 1].ritmi[domande[k - 1].corretta]);
			});
		}
	});

	it('la risposta giusta non sta sempre nello stesso posto; stesso seed, stesse domande', () => {
		const posti = new Set(SEMI.map((s) => domandeAscolto(s)[3].corretta));
		expect(posti).toEqual(new Set([0, 1, 2]));
		expect(domandeAscolto(7)).toEqual(domandeAscolto(7));
	});
});

describe('Leggi e batti', () => {
	it('si comincia dal livello 0; quello che non si legge si scarta', () => {
		expect(leggiLettura(undefined)).toEqual({ livello: 0, serie: 0 });
		expect(leggiLettura({ fonte: 'mani' })).toEqual({ livello: 0, serie: 0 });
		expect(leggiLettura({ lettura: { livello: 2, serie: 1 } })).toEqual({ livello: 2, serie: 1 });
		expect(leggiLettura({ lettura: { livello: 9, serie: 0 } })).toEqual({ livello: 0, serie: 0 });
		expect(leggiLettura({ lettura: { livello: 1.5, serie: 0 } })).toEqual({ livello: 0, serie: 0 });
		expect(leggiLettura('rotto')).toEqual({ livello: 0, serie: 0 });
	});

	it(`${RIUSCITI_PER_SALIRE} ritmi riusciti di fila fanno salire; uno non riuscito non fa mai scendere`, () => {
		let s = { livello: 0, serie: 0 };
		s = dopoRitmo(s, true);
		s = dopoRitmo(s, true);
		expect(s).toEqual({ livello: 0, serie: 2 });
		expect(dopoRitmo(s, false)).toEqual({ livello: 0, serie: 0 });
		expect(dopoRitmo(s, true)).toEqual({ livello: 1, serie: 0, nuovo: true });
		expect(dopoRitmo({ livello: 2, serie: 0 }, false)).toEqual({ livello: 2, serie: 0 });
		// in cima si resta in cima
		expect(dopoRitmo({ livello: 3, serie: 2 }, true)).toEqual({ livello: 3, serie: 0 });
	});

	it('dopo un ritmo non riuscito, un ripasso del livello prima con le sillabe; mai lo stesso di fila', () => {
		const c = creaCasuale(3);
		for (let k = 0; k < 50; k++) {
			const prima = LIVELLI[2][k % LIVELLI[2].length];
			const solito = prossimoRitmo({ livello: 2, serie: 0 }, c, { prima });
			expect(livelloDi(solito.ritmo)).toBe(2);
			expect(solito.ritmo).not.toBe(prima);
			expect(solito.sillabe).toBe(false);
			const ripasso = prossimoRitmo({ livello: 2, serie: 0 }, c, { ripasso: true });
			expect(livelloDi(ripasso.ritmo)).toBe(1);
			expect(ripasso.sillabe).toBe(true);
			expect(prossimoRitmo({ livello: 0, serie: 0 }, c, { ripasso: true }).ritmo).toSatisfy(
				(x: Ritmo) => livelloDi(x) === 0
			);
			expect(prossimoRitmo({ livello: 1, serie: 0 }, c, { nuovo: true }).sillabe).toBe(true);
		}
	});
});
