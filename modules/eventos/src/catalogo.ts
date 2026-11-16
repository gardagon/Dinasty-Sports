// GENERADO por `npm run eventos:indice` (y por `eventos:nuevo`): no lo edites a mano. Junta los archivos de cada área.
import type { AporteDeSucesos } from '@ds/contracts';
import contadores from './contadores';
import cuerpo_altura from './cuerpo/altura';
import familia_faltas from './familia/faltas';
import perks_pulmones from './perks/pulmones';
import perks_revelaciones from './perks/revelaciones';
import relaciones_cumple from './relaciones/cumple';
import salud_lesion from './salud/lesion';

export const CATALOGO: readonly AporteDeSucesos[] = [contadores, cuerpo_altura, familia_faltas, perks_pulmones, perks_revelaciones, relaciones_cumple, salud_lesion].flat();
