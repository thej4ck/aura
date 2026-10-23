import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ambienteBreve, indirizzoSegnalazione, TIPI } from './segnalazione';

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

describe('ambienteBreve', () => {
	it.each([
		[
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
			'Edge 140, Windows'
		],
		[
			'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
			'Chrome 140, Android'
		],
		[
			'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
			'Safari 18, iOS'
		],
		[
			'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
			'Chrome 140, iOS'
		],
		[
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0',
			'Firefox 140, macOS'
		],
		[
			'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
			'Chrome 140, ChromeOS'
		],
		['qualcosa di strano', '?, ?']
	])('%s', (ua, atteso) => {
		expect(ambienteBreve(ua)).toBe(atteso);
	});
});
