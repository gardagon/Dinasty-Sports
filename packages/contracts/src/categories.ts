/**
 * Categorías por edad de una competición. Son DATO por país y deporte (cada federación tiene las suyas):
 * el atletismo español usa sub-10, sub-12... y el fútbol tendrá las suyas.
 */
export interface CategoriaDef {
  id: string;
  nombre: string;
  /** Edades (en años cumplidos) que compiten en ella, ambas incluidas. */
  edadMin: number;
  edadMax: number;
  /** Todos sus jugadores llegan nuevos al club (decisión del usuario, 12/11/2026: benjamín): su asistencia y su relación con el entrenador empiezan a contar en el primer entrenamiento de la temporada, no antes. */
  nuevosEnElClub?: boolean;
  /**
   * Probabilidad base (0 a 1) de que un niño con club en su colegio vaya a probar a un club de fuera en lugar de quedarse en el de su colegio (decisión del usuario, 17/11/2026: cuanto más mayor, más prueba fuera).
   * Sube con la ambición y el nivel y baja con los amigos (`PESOS_DE_PROBAR_FUERA`). Sin él, `PROBAR_FUERA_POR_DEFECTO`.
   */
  probarFuera?: number;
}

/** Probabilidad base de probar fuera si la categoría no trae la suya. */
export const PROBAR_FUERA_POR_DEFECTO = 0.3;

/**
 * Cuánto pesa cada cosa en la probabilidad de probar fuera (cifras de partida, por revisar con el usuario): la probabilidad base se multiplica por
 * `1 + ambicion·A + nivel·N − (amigos − neutro)·F`, con la ambición y el nivel entre −1 y 1 (el nivel, dentro de los de su categoría) y `amigos` la parte de los compañeros de colegio
 * y año que se quedan en el equipo de su colegio. El factor se acota entre `minimo` y `maximo` y la probabilidad final, a `techo`.
 */
export const PESOS_DE_PROBAR_FUERA = { ambicion: 0.5, nivel: 0.5, amigos: 0.6, minimo: 0.2, maximo: 2.5, techo: 0.9 } as const;

/** Categoría que corresponde a una edad (la última si se pasa de todas). */
export function categoriaDeEdad(categorias: readonly CategoriaDef[], edad: number): CategoriaDef {
  return categorias.find((c) => edad >= c.edadMin && edad <= c.edadMax) ?? (edad < categorias[0].edadMin ? categorias[0] : categorias[categorias.length - 1]);
}

/** La categoría siguiente, si existe. */
export function categoriaSuperior(categorias: readonly CategoriaDef[], actual: CategoriaDef): CategoriaDef | undefined {
  const i = categorias.findIndex((c) => c.id === actual.id);
  return i >= 0 ? categorias[i + 1] : undefined;
}
