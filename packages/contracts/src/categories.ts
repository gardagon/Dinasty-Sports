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

/**
 * Categorías de la federación española de atletismo (por edad). Es un DATO por país: otro país o deporte
 * tendrá las suyas. Los de 23 años o más compiten en absoluta.
 */
export const CATEGORIAS_ESPANA: readonly CategoriaDef[] = [
  { id: 'sub10', nombre: 'Sub-10', edadMin: 0, edadMax: 9 },
  { id: 'sub12', nombre: 'Sub-12', edadMin: 10, edadMax: 11 },
  { id: 'sub14', nombre: 'Sub-14', edadMin: 12, edadMax: 13 },
  { id: 'sub16', nombre: 'Sub-16', edadMin: 14, edadMax: 15 },
  { id: 'sub18', nombre: 'Sub-18', edadMin: 16, edadMax: 17 },
  { id: 'sub20', nombre: 'Sub-20', edadMin: 18, edadMax: 19 },
  { id: 'sub23', nombre: 'Sub-23', edadMin: 20, edadMax: 22 },
  { id: 'absoluta', nombre: 'Absoluta', edadMin: 23, edadMax: 200 },
];
