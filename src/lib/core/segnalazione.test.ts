import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { indirizzoSegnalazione, TIPI } from './segnalazione';

describe('indirizzoSegnalazione', () => {
	it('ogni tipo ha la sua issue form, con i campi che il sito precompila', () => {
		const contesto = ['pagina', 'attivita', 'scheda', 'versione', 'ambiente'];
		for (const tipo of TIPI) {
			const form = readFileSync(`.github/ISSUE_TEMPLATE/${tipo}.yml`, 'utf8');
			// l'idea non riguarda una scheda: bastano pagina e versione
			for (const campo of tipo === 'idea' ? ['pagina', 'versione'] : contesto)
				expect(form).toMatch(new RegExp(`id: ${campo}\\s`));
		}
	});

	it('sceglie la issue form e precompila solo i campi presenti', () => {
		const url = new URL(
			indirizzoSegnalazione('contenuti', {
				pagina: '/musica/pentagramma/le-note',
				attivita: 'musica.pentagramma.le-note',
				scheda: '3/12',
				versione: 'abc1234',
				ambiente: 'Firefox 140, Windows'
			})
		);
		expect(url.origin + url.pathname).toBe('https://github.com/thej4ck/aura/issues/new');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			template: 'contenuti.yml',
			pagina: '/musica/pentagramma/le-note',
			attivita: 'musica.pentagramma.le-note',
			scheda: '3/12',
			versione: 'abc1234',
			ambiente: 'Firefox 140, Windows'
		});

		const senza = new URL(
			indirizzoSegnalazione('idea', { pagina: '/', versione: 'v', ambiente: '?, ?' })
		);
		expect([...senza.searchParams.keys()]).toEqual(['template', 'pagina', 'versione', 'ambiente']);
	});
});
