import type { GameModule } from '@ds/contracts';
import { personaje } from '@ds/mod-personaje';
import { estudios } from '@ds/mod-estudios';
import { atletismo } from '@ds/mod-atletismo';
import { npcs } from '@ds/mod-npcs';
import { clubes } from '@ds/mod-clubes';
import { familia } from '@ds/mod-familia';
import { relaciones } from '@ds/mod-relaciones';
import { lugares } from '@ds/mod-lugares';
// <nuevo-modulo:import>

/**
 * Lista de módulos del juego. Añadir un módulo = una línea aquí
 * (el script `npm run nuevo-modulo` lo hace por ti).
 * El orden solo afecta al orden en que se muestran en la interfaz.
 */
export const MODULOS: readonly GameModule<any>[] = [
  personaje,
  estudios,
  atletismo,
  npcs,
  clubes,
  familia,
  relaciones,
  lugares,
  // <nuevo-modulo:lista>
];
