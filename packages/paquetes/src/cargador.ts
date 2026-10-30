import type { GameModule } from '@ds/contracts';
import { ErrorDePaquete } from './tipos';

/**
 * Lo que el juego presta al código de un deporte: las piezas comunes por el nombre con que las importa (`@ds/contracts`, `@ds/kit-deporte`). El deporte no
 * lleva copia de ellas: usa estas, así todos los deportes hablan el mismo idioma y pesan poco.
 */
export type Anfitrion = Readonly<Record<string, object>>;

/**
 * Ejecuta el código de un paquete ya verificado y devuelve su módulo. El código es un trozo de JavaScript que recibe el anfitrión (`__ds`) y devuelve el
 * módulo del deporte (ver `tools/empaquetar-deportes.ts`).
 */
export function cargarModulo(codigo: string, anfitrion: Anfitrion, idEsperado: string): GameModule<any> {
  let modulo: unknown;
  try {
    modulo = new Function('__ds', codigo)(anfitrion);
  } catch (e) {
    throw new ErrorDePaquete(`El código del deporte «${idEsperado}» no se pudo ejecutar: ${e instanceof Error ? e.message : String(e)}`);
  }
  const m = modulo as Partial<GameModule<any>> | undefined;
  if (!m || typeof m !== 'object' || m.id !== idEsperado) throw new ErrorDePaquete(`El paquete no trae el módulo «${idEsperado}».`);
  return m as GameModule<any>;
}
