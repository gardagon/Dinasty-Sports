import type { PaisDeNombres } from './paises';
import { formaDeApellido, identidadDeHijo, nombreCompleto, origenDeJugador, padresDeSemilla } from './nombres';
import { rngEstable, type Rng } from './rng';

/**
 * Hermanos del personaje: reglas puras compartidas por el módulo que los crea (`npcs`) y el que enseña a la familia (`familia`).
 * Los hermanos se generan con el mismo proceso de herencia que el personaje, a partir de los mismos padres.
 */

/**
 * Los nombres y apellidos de los padres y del personaje salen de la semilla y del origen de cada uno (ver `nombres.ts`): el motor y los módulos
 * los piden por separado sin depender unos de otros, y «volver a sortear» en la pantalla de nueva partida es otra semilla.
 */

/** Los apellidos de los padres (en su forma de base), siempre los mismos para una semilla: cada uno lleva uno o dos según su origen. */
export function apellidosDePadres(seed: number, pais?: PaisDeNombres): { padre: string[]; madre: string[] } {
  const { padre, madre } = padresDeSemilla(seed, pais);
  return { padre: padre.identidad.apellidos.map((a) => a.base), madre: madre.identidad.apellidos.map((a) => formaDeApellido(a, 'f')) };
}

/** Los apellidos de un hijo: el primero del padre y el primero de la madre, con la forma de su sexo (por defecto, la masculina). */
export function apellidosDeFamilia(seed: number, genero: 'f' | 'm' = 'm', pais?: PaisDeNombres): string {
  const { padre, madre } = padresDeSemilla(seed, pais);
  // Donde los nacidos llevan un solo apellido (Argentina, Inglaterra), el del padre.
  if (pais?.apellidosDeLosNacidosAqui === 1) return formaDeApellido(padre.identidad.apellidos[0], genero);
  return [formaDeApellido(padre.identidad.apellidos[0], genero), formaDeApellido(madre.identidad.apellidos[0], genero)].join(' ');
}

/** El nombre de pila del padre o la madre, fijo para una semilla: lo usan `familia` (su ficha) y `npcs` (la persona con la que te relacionas). */
export function nombreDeProgenitor(seed: number, id: 'padre' | 'madre', pais?: PaisDeNombres): string {
  return padresDeSemilla(seed, pais)[id].identidad.pila;
}

/** El nombre completo del padre o la madre (con sus apellidos). */
export function nombreCompletoDeProgenitor(seed: number, id: 'padre' | 'madre', pais?: PaisDeNombres): string {
  return nombreCompleto(padresDeSemilla(seed, pais)[id].identidad, id === 'padre' ? 'm' : 'f');
}

/** País elegible al crear la partida. De momento solo hay España (el calendario escolar y los apellidos son los suyos). */
export const PAISES_DE_PARTIDA: readonly { id: string; nombre: string }[] = [{ id: 'espana', nombre: 'España' }];

/** Quién da el apellido principal (el primero) al personaje: el padre o la madre. */
export type ApellidoPrincipal = 'padre' | 'madre';

/**
 * El nombre del personaje al crear la partida, todo a partir de la semilla: nombre de pila (solo masculino de momento), del origen de sus padres, y los
 * dos apellidos, que son el primero del padre y el primero de la madre; el principal va primero. Los padres de esa semilla (`padresDeSemilla`) llevan esos apellidos.
 */
export function identidadDeJugador(seed: number, principal: ApellidoPrincipal = 'padre', pais?: PaisDeNombres): { nombre: string; delPadre: string; delMadre: string; apellidos: string; completo: string } {
  const { padre, madre } = padresDeSemilla(seed, pais);
  const hijo = identidadDeHijo(rngEstable('nombre', seed, 'jugador'), 'm', padre.identidad, madre.identidad, origenDeJugador(seed, pais), { edad: 8, pais });
  const delPadre = formaDeApellido(padre.identidad.apellidos[0], 'm');
  const delMadre = formaDeApellido(madre.identidad.apellidos[0], 'm');
  // Con un solo apellido por persona (Argentina, Inglaterra) el personaje lleva el de su padre; con dos, el principal va primero.
  const unico = pais?.apellidosDeLosNacidosAqui === 1;
  const apellidos = unico ? delPadre : principal === 'padre' ? `${delPadre} ${delMadre}` : `${delMadre} ${delPadre}`;
  return { nombre: hijo.pila, delPadre, delMadre, apellidos, completo: `${hijo.pila} ${apellidos}` };
}

/** Probabilidad de tener 0, 1, 2 o 3 hermanos. */
export const PESOS_DE_HERMANOS: readonly number[] = [0.2, 0.45, 0.25, 0.1];

/** Diferencia máxima de edad con el personaje (años), por arriba y por abajo. */
export const DIFERENCIA_MAXIMA_DE_EDAD = 6;

/** Probabilidad de que un hermano sea mellizo (misma edad) del personaje; solo puede haber uno. */
export const PROBABILIDAD_DE_MELLIZO = 0.04;

export function numeroDeHermanos(rng: Rng): number {
  let x = rng.next();
  for (let n = 0; n < PESOS_DE_HERMANOS.length; n++) {
    x -= PESOS_DE_HERMANOS[n];
    if (x < 0) return n;
  }
  return PESOS_DE_HERMANOS.length - 1;
}

/** Lo que es un hermano para el personaje según cuánto más años tiene (positivo: mayor; negativo: menor; 0: mellizo). */
export function relacionDeHermano(gender: 'f' | 'm', diferencia: number): string {
  const f = gender === 'f';
  if (diferencia === 0) return f ? 'Tu melliza' : 'Tu mellizo';
  if (diferencia > 0) return f ? 'Tu hermana mayor' : 'Tu hermano mayor';
  return f ? 'Tu hermana pequeña' : 'Tu hermano pequeño';
}

/**
 * Diferencias de edad con el personaje de `n` hermanos (positivo: el hermano es mayor; negativo: menor). Sin repetir, salvo un mellizo
 * (diferencia 0) con poca probabilidad.
 */
export function diferenciasDeEdad(n: number, rng: Rng): number[] {
  const usadas = new Set<number>();
  const lista: number[] = [];
  for (let i = 0; i < n; i++) {
    let d = 0;
    if (!usadas.has(0) && rng.chance(PROBABILIDAD_DE_MELLIZO)) d = 0;
    else {
      do d = rng.int(-DIFERENCIA_MAXIMA_DE_EDAD, DIFERENCIA_MAXIMA_DE_EDAD);
      while (d === 0 || usadas.has(d));
    }
    usadas.add(d);
    lista.push(d);
  }
  return lista;
}
