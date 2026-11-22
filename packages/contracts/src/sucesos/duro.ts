import type { OpcionDef, SucesoDef, VarianteDef } from './tipos';

/**
 * CONTENIDO DURO: temas que no a todo el mundo le apetece leer en un juego («familia» = la casa que se rompe, «burlas» = el acoso del colegio,
 * «peleas» = la violencia). Un suceso, una variante o una opción pueden llevar `duro: ['burlas']`. Es una preferencia de PRESENTACIÓN DEL
 * JUGADOR (Opciones, junto a la presentación de los sucesos): con ella desactivada el director no elige lo marcado. Los PNJ no se ven afectados.
 */
export type CategoriaDura = 'familia' | 'burlas' | 'peleas';

export const CATEGORIAS_DURAS: readonly { id: CategoriaDura; nombre: string; descripcion: string }[] = [
  { id: 'familia', nombre: 'Problemas en la familia', descripcion: 'Discusiones graves, separaciones, dinero que falta en casa.' },
  { id: 'burlas', nombre: 'Burlas y acoso', descripcion: 'Motes crueles, rumores, que te dejen de lado.' },
  { id: 'peleas', nombre: 'Peleas', descripcion: 'Empujones, golpes y violencia entre compañeros.' },
];

export interface ConfigDeContenidoDuro {
  /** Interruptor general: apagado, nada marcado como duro sale, sea de la categoría que sea. */
  activado: boolean;
  /** Con el interruptor general encendido, cuáles de las categorías se admiten. */
  categorias: Readonly<Record<CategoriaDura, boolean>>;
}

/**
 * Valor de partida del contenido duro. **PROVISIONAL**: activado y por categorías; la arquitectura confirma con el usuario si por defecto
 * va activado y si hacen falta las categorías. Para cambiarlo basta tocar esta constante (la web la usa como valor por defecto de la opción).
 */
export const CONTENIDO_DURO_POR_DEFECTO: ConfigDeContenidoDuro = { activado: true, categorias: { familia: true, burlas: true, peleas: true } };

/** ¿Algo marcado con estas categorías se puede enseñar con esta preferencia? Sin marca, siempre. Con varias, hacen falta todas. */
export const duroPermitido = (duro: readonly CategoriaDura[] | undefined, c: ConfigDeContenidoDuro): boolean => !duro?.length || (c.activado && duro.every((k) => c.categorias[k] !== false));

/** ¿Esta preferencia deja pasar todo (no hay nada que filtrar)? Es el caso normal y no cuesta nada. */
export const duroSinFiltro = (c: ConfigDeContenidoDuro): boolean => c.activado && CATEGORIAS_DURAS.every((k) => c.categorias[k.id] !== false);

/** La preferencia más estricta: con el interruptor general apagado (para comprobar que nada se queda sin camino). */
export const SIN_CONTENIDO_DURO: ConfigDeContenidoDuro = { activado: false, categorias: { familia: false, burlas: false, peleas: false } };

/**
 * El suceso tal como queda con la preferencia del jugador: sin lo duro que no admite. Devuelve `undefined` si el suceso entero no puede salir
 * (él mismo es duro, o no le queda ninguna variante, o se queda sin opciones teniéndolas). Una variante que se quedaría sin opciones se quita.
 * Si no hay nada que quitar devuelve el mismo objeto. Es pura: la usan el director, la validación y la herramienta de pruebas.
 */
export function sinContenidoDuro<T extends SucesoDef>(def: T, c: ConfigDeContenidoDuro): T | undefined {
  if (!duroPermitido(def.duro, c)) return undefined;
  const opciones = (lista: readonly OpcionDef[] | undefined): readonly OpcionDef[] | undefined => (lista?.some((o) => !duroPermitido(o.duro, c)) ? lista.filter((o) => duroPermitido(o.duro, c)) : lista);
  const propias = opciones(def.opciones);
  if (def.opciones?.length && !propias?.length && !def.variantes?.some((v) => v.opciones?.length)) return undefined;
  let variantes: readonly VarianteDef[] | undefined = def.variantes;
  if (variantes?.length) {
    variantes = variantes
      .filter((v) => duroPermitido(v.duro, c))
      .map((v) => (v.opciones ? { ...v, opciones: opciones(v.opciones) } : v))
      .filter((v) => (v.opciones ?? propias ?? []).length > 0 || !((def.variantes!.find((w) => w.id === v.id)?.opciones ?? def.opciones)?.length));
    if (!variantes.length) return undefined;
  }
  return propias === def.opciones && variantes === def.variantes ? def : { ...def, opciones: propias, variantes };
}
