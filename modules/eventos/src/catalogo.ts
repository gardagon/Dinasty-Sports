// GENERADO por `npm run eventos:indice` (y por `eventos:nuevo`): no lo edites a mano. Junta los archivos de cada área.
import type { AporteDeSucesos } from '@ds/contracts';
import barrio_detalles from './barrio/detalles';
import camino_detalles from './camino/detalles';
import casa_detalles from './casa/detalles';
import colegio_aula from './colegio/aula';
import colegio_mas_aula from './colegio/mas_aula';
import colegio_mas_patio from './colegio/mas_patio';
import colegio_patio from './colegio/patio';
import contadores from './contadores';
import cuerpo_altura from './cuerpo/altura';
import estudios_educacion_fisica from './estudios/educacion_fisica';
import estudios_llegar_tarde from './estudios/llegar_tarde';
import familia_faltas from './familia/faltas';
import grupo_se_van from './grupo/se_van';
import perks_pulmones from './perks/pulmones';
import perks_revelaciones from './perks/revelaciones';
import relaciones_cumple from './relaciones/cumple';
import salud_lesion from './salud/lesion';

export const CATALOGO: readonly AporteDeSucesos[] = [barrio_detalles, camino_detalles, casa_detalles, colegio_aula, colegio_mas_aula, colegio_mas_patio, colegio_patio, contadores, cuerpo_altura, estudios_educacion_fisica, estudios_llegar_tarde, familia_faltas, grupo_se_van, perks_pulmones, perks_revelaciones, relaciones_cumple, salud_lesion].flat();
