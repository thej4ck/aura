import { costruisciCatalogo } from '../../registry';
import * as area from './area';
import * as linee from './linee/modulo';
import * as suoni from './suoni/modulo';

/** Catalogo di esempio (usato da /dev, dal test e2e del motore e dalla validazione dei contenuti). */
export const catalogoEsempio = costruisciCatalogo(
	{ 'esempio/area.ts': area },
	{ 'esempio/linee/modulo.ts': linee, 'esempio/suoni/modulo.ts': suoni },
	{ includiBozze: true }
);
