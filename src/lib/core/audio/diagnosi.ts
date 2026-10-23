// Riepilogo dei frame del microfono per la diagnostica degli adulti: quanti hanno la voce e perché gli
// altri sono vuoti. Puro: i frame arrivano dal chiamante, che ne tiene solo gli ultimi secondi in memoria.
import type { FrameMic } from './mic.ts';

export type Riepilogo = {
	frame: number;
	validi: number;
	/** vuoti sotto la soglia del volume */
	gate: number;
	/** vuoti perché il suono non è abbastanza periodico (o è fuori dall'intervallo delle voci) */
	aperiodici: number;
	/** vuoti perché suonava il sito */
	silenziati: number;
	/** frame arrivati in ritardo (thread principale occupato) e il tempo in più, in ms */
	ritardi: number;
	ritardoMs: number;
};

/** frame attesi al secondo; un frame arrivato dopo più del doppio dell'intervallo è un ritardo */
const FPS = 30;

export function riepiloga(frame: readonly FrameMic[]): Riepilogo {
	const r: Riepilogo = {
		frame: frame.length,
		validi: 0,
		gate: 0,
		aperiodici: 0,
		silenziati: 0,
		ritardi: 0,
		ritardoMs: 0
	};
	frame.forEach((f, i) => {
		if (f.silenziato) r.silenziati++;
		else if (f.freq !== null) r.validi++;
		else if (f.motivo === 'gate') r.gate++;
		else r.aperiodici++;
		const dt = i ? f.t - frame[i - 1].t : 0;
		if (dt > 2 / FPS) {
			r.ritardi++;
			r.ritardoMs += (dt - 1 / FPS) * 1000;
		}
	});
	return r;
}
