import type { Rng } from './rng';

/**
 * Hermanos del personaje: reglas puras compartidas por el módulo que los crea (`npcs`) y el que enseña a la familia (`familia`).
 * Los hermanos se generan con el mismo proceso de herencia que el personaje, a partir de los mismos padres.
 */

const APELLIDOS = ['García', 'Martín', 'López', 'Sánchez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano'];

/**
 * Los apellidos de los padres, siempre los mismos para una semilla (así los pueden usar varios módulos sin depender uno del otro): cada uno
 * tiene dos, distintos entre sí y de los del otro. Los hijos llevan el primero del padre y el primero de la madre.
 */
export function apellidosDePadres(seed: number): { padre: [string, string]; madre: [string, string] } {
  // Mezcla barata de la semilla: cuatro índices distintos y estables.
  let h = (seed ^ 0x9e3779b1) >>> 0;
  const elegidos: number[] = [];
  while (elegidos.length < 4) {
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    const i = h % APELLIDOS.length;
    if (!elegidos.includes(i)) elegidos.push(i);
  }
  const [a, b, c, d] = elegidos.map((i) => APELLIDOS[i]);
  return { padre: [a, b], madre: [c, d] };
}

/** Los dos apellidos de los hijos: el primero del padre y el primero de la madre. */
export function apellidosDeFamilia(seed: number): string {
  const { padre, madre } = apellidosDePadres(seed);
  return `${padre[0]} ${madre[0]}`;
}

const NOMBRES_DE_PROGENITOR = {
  f: ['Carmen', 'María', 'Laura', 'Cristina', 'Patricia', 'Isabel', 'Raquel', 'Silvia', 'Beatriz', 'Marta', 'Eva', 'Pilar'],
  m: ['Antonio', 'José', 'Manuel', 'Javier', 'David', 'Miguel', 'Rafael', 'Alberto', 'Jesús', 'Fernando', 'Raúl', 'Andrés'],
} as const;

/** El nombre de pila del padre o la madre, fijo para una semilla: lo usan `familia` (su ficha) y `npcs` (la persona con la que te relacionas). */
export function nombreDeProgenitor(seed: number, id: 'padre' | 'madre'): string {
  let h = (seed ^ (id === 'padre' ? 0x51ed270b : 0x2545f491)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  const lista = NOMBRES_DE_PROGENITOR[id === 'padre' ? 'm' : 'f'];
  return lista[h % lista.length];
}

const NOMBRES_DE_JUGADOR = [
  'Álvaro', 'Adrián', 'Pablo', 'Daniel', 'Hugo', 'Mario', 'Diego', 'Sergio', 'Iván', 'Marcos', 'Lucas', 'Carlos',
  'Rubén', 'Óscar', 'Gonzalo', 'Nicolás', 'Samuel', 'Víctor', 'Jorge', 'Enrique', 'Ángel', 'Guillermo', 'Alejandro', 'Martín',
] as const;

/** País elegible al crear la partida. De momento solo hay España (el calendario escolar y los apellidos son los suyos). */
export const PAISES_DE_PARTIDA: readonly { id: string; nombre: string }[] = [{ id: 'espana', nombre: 'España' }];

/** Quién da el apellido principal (el primero) al personaje: el padre o la madre. */
export type ApellidoPrincipal = 'padre' | 'madre';

/**
 * El nombre del personaje al crear la partida, todo a partir de la semilla (así «volver a sortear» es otra semilla): nombre de pila (solo
 * masculino de momento) y los dos apellidos, que son el primero del padre y el primero de la madre; el principal va primero.
 * Los padres de esa semilla (`apellidosDePadres`) llevan esos mismos apellidos.
 */
export function identidadDeJugador(seed: number, principal: ApellidoPrincipal = 'padre'): { nombre: string; delPadre: string; delMadre: string; apellidos: string; completo: string } {
  let h = (seed ^ 0x6a09e667) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  const nombre = NOMBRES_DE_JUGADOR[((h ^ (h >>> 16)) >>> 0) % NOMBRES_DE_JUGADOR.length];
  const { padre, madre } = apellidosDePadres(seed);
  const apellidos = principal === 'padre' ? `${padre[0]} ${madre[0]}` : `${madre[0]} ${padre[0]}`;
  return { nombre, delPadre: padre[0], delMadre: madre[0], apellidos, completo: `${nombre} ${apellidos}` };
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
