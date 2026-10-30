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
}

/** Categoría que corresponde a una edad (la última si se pasa de todas). */
export function categoriaDeEdad(categorias: readonly CategoriaDef[], edad: number): CategoriaDef {
  return categorias.find((c) => edad >= c.edadMin && edad <= c.edadMax) ?? (edad < categorias[0].edadMin ? categorias[0] : categorias[categorias.length - 1]);
}

/** La categoría siguiente, si existe. */
export function categoriaSuperior(categorias: readonly CategoriaDef[], actual: CategoriaDef): CategoriaDef | undefined {
  const i = categorias.findIndex((c) => c.id === actual.id);
  return i >= 0 ? categorias[i + 1] : undefined;
}
