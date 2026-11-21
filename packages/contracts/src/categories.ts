/**
 * Categorías por edad de una competición. Son DATO por país y deporte (cada federación tiene las suyas):
 * el atletismo español usa sub-10, sub-12... y el fútbol tendrá las suyas.
 */
/** El tipo de un club a efectos de las reglas de la categoría: el de un colegio o uno de fuera. */
export type TipoDeClub = 'colegio' | 'club';

export interface CategoriaDef {
  id: string;
  nombre: string;
  /** Edades (en años cumplidos) que compiten en ella, ambas incluidas. */
  edadMin: number;
  edadMax: number;
  /** Todos sus jugadores llegan nuevos al club (decisión del usuario, 12/11/2026: benjamín): su asistencia y su relación con el entrenador empiezan a contar en el primer entrenamiento de la temporada, no antes. */
  nuevosEnElClub?: boolean;
  /**
   * En qué tipos de club el entrenador **rota** a la plantilla en esta categoría para que todos jueguen algo a lo largo de la liga (decisión del usuario, 21/11/2026: los colegios, en benjamín y alevín): el que menos ha
   * jugado o más lleva sin jugar entra antes en la convocatoria y en el once (`PARAMETROS_DE_CONVOCATORIA.rotacion`). Es lo mismo para el personaje y los PNJ. Sin él, el entrenador no rota.
   */
  rotacionEn?: readonly TipoDeClub[];
  /**
   * Probabilidad base (0 a 1) de que un niño con club en su colegio vaya a probar a un club de fuera en lugar de quedarse en el de su colegio (decisión del usuario, 17/11/2026: cuanto más mayor, más prueba fuera).
   * Sube con la ambición y baja con los amigos (`PESOS_DE_PROBAR_FUERA`; el nivel no pesa). Sin él, `PROBAR_FUERA_POR_DEFECTO`.
   */
  probarFuera?: number;
}

/** Probabilidad base de probar fuera si la categoría no trae la suya. */
export const PROBAR_FUERA_POR_DEFECTO = 0.3;

/**
 * Cuánto pesa cada cosa en la probabilidad de probar fuera (cifras de partida, por revisar con el usuario): la probabilidad base se multiplica por
 * `1 + ambicion·A + nivel·N − (amigos − neutro)·F`, con la ambición y el nivel entre −1 y 1 (el nivel, dentro de los de su categoría) y `amigos` la parte de los compañeros de colegio
 * y año que se quedan en el equipo de su colegio. El factor se acota entre `minimo` y `maximo` y la probabilidad final, a `techo`.
 * **Pesa sobre todo la ambición** (decisión del usuario, 20/11/2026): **el nivel no hace que un niño quiera irse** (no tiene por qué querer crecer), así que `nivel` es 0. Se deja el peso y el cálculo
 * del nivel entre los de su categoría porque servirá para los **ojeadores** (que un niño bueno lo vea alguien y lo llamen, más adelante), no para que él decida irse.
 */
export const PESOS_DE_PROBAR_FUERA = { ambicion: 1, nivel: 0, amigos: 0.6, minimo: 0.2, maximo: 2.5, techo: 0.9 } as const;

/** Categoría que corresponde a una edad (la última si se pasa de todas). */
export function categoriaDeEdad(categorias: readonly CategoriaDef[], edad: number): CategoriaDef {
  return categorias.find((c) => edad >= c.edadMin && edad <= c.edadMax) ?? (edad < categorias[0].edadMin ? categorias[0] : categorias[categorias.length - 1]);
}

/** La categoría siguiente, si existe. */
export function categoriaSuperior(categorias: readonly CategoriaDef[], actual: CategoriaDef): CategoriaDef | undefined {
  const i = categorias.findIndex((c) => c.id === actual.id);
  return i >= 0 ? categorias[i + 1] : undefined;
}
