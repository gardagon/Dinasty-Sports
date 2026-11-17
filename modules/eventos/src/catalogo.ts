// GENERADO por `npm run eventos:indice` (y por `eventos:nuevo`): no lo edites a mano. Junta los archivos de cada área.
import type { AporteDeSucesos } from '@ds/contracts';
import colegio_aula from './colegio/aula';
import colegio_patio from './colegio/patio';
import contadores from './contadores';
import cuerpo_altura from './cuerpo/altura';
import estudios_educacion_fisica from './estudios/educacion_fisica';
import estudios_llegar_tarde from './estudios/llegar_tarde';
import familia_faltas from './familia/faltas';
import perks_pulmones from './perks/pulmones';
import perks_revelaciones from './perks/revelaciones';
import relaciones_cumple from './relaciones/cumple';
import salud_lesion from './salud/lesion';

export const CATALOGO: readonly AporteDeSucesos[] = [colegio_aula, colegio_patio, contadores, cuerpo_altura, estudios_educacion_fisica, estudios_llegar_tarde, familia_faltas, perks_pulmones, perks_revelaciones, relaciones_cumple, salud_lesion].flat();
