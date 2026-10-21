// Registry dei widget: quelli core (qui) più quelli che ogni modulo dichiara in `modulo.ts` (`export const widget`).
import type { Component } from 'svelte';
import type { CaricaWidget } from '../contenuti/registry';
import type { Fase, Scheda } from '../contenuti/schema';
import type { Preferenze } from '../store/schema-progressi';

/** Un componente caricato per nome: le props le decide lui (widget, disegno SVG del modulo…). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- vedi sopra
export type ComponenteCaricato = Component<any>;

/** Lo stesso esito per tutti i widget: il motore ne conta solo quelli della fase "prova". */
export type EsitoWidget = {
	corretto: boolean;
	/** cosa si è allenato (es. "G4"), per la ripetizione per item dei moduli */
	item?: string;
	dettagli?: unknown;
};

export type ContestoWidget = {
	preferenze: Preferenze;
	/** seed per `creaCasuale`: stesso seed, stesso esercizio */
	seed: number;
	fase: Fase;
	/** carica per nome un widget o un componente (es. un disegno SVG) del modulo, o un widget core */
	carica: (nome: string) => Promise<ComponenteCaricato>;
};

/** Props di ogni widget. `props` arriva da `scheda.props` (dati non tipizzati: il widget li valida). */
export type WidgetProps<P = Record<string, unknown>> = {
	scheda: Scheda;
	props: P;
	contesto: ContestoWidget;
	/** un esito per ogni risposta valutata (anche più di uno per scheda) */
	onesito: (e: EsitoWidget) => void;
	/** il bambino ha finito la scheda: il motore passa alla successiva */
	onfine: () => void;
};

/** Widget core, caricati in lazy. I nomi sono riservati: un modulo non può riusarli. */
export const WIDGET_CORE: Readonly<Record<string, CaricaWidget>> = {
	spiegazione: () => import('../widget/Spiegazione.svelte'),
	scelta: () => import('../widget/Scelta.svelte'),
	animazione: () => import('../widget/Animazione.svelte')
	// TODO(fase 2, audio): ascolta: () => import('../widget/Ascolta.svelte'),
	// TODO(fase 2, notazione): 'staff-tocca': () => import('../widget/StaffTocca.svelte'),
	// TODO(fase 2, audio): 'canta-nota': () => import('../widget/CantaNota.svelte'),
	// TODO(fase 2, audio): 'canta-sequenza': () => import('../widget/CantaSequenza.svelte'),
};

/** Il caricatore di un widget: prima i core, poi quelli del modulo. */
export function trovaWidget(
	nome: string,
	widgetModulo: Readonly<Record<string, CaricaWidget>> = {}
): CaricaWidget | undefined {
	if (Object.hasOwn(WIDGET_CORE, nome)) return WIDGET_CORE[nome];
	if (Object.hasOwn(widgetModulo, nome)) return widgetModulo[nome];
}

export class ErroreWidget extends Error {
	constructor(nome: string, widgetModulo: Readonly<Record<string, CaricaWidget>>) {
		const noti = [...Object.keys(WIDGET_CORE), ...Object.keys(widgetModulo)].join(', ');
		super(
			`Widget "${nome}" non registrato. Widget disponibili: ${noti}. ` +
				'Un widget proprio va dichiarato in modulo.ts con `export const widget = { nome: () => import(...) }`.'
		);
		this.name = 'ErroreWidget';
	}
}

export async function caricaWidget(
	nome: string,
	widgetModulo: Readonly<Record<string, CaricaWidget>> = {}
): Promise<ComponenteCaricato> {
	const carica = trovaWidget(nome, widgetModulo);
	if (!carica) throw new ErroreWidget(nome, widgetModulo);
	return (await carica()).default;
}
