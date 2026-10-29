import { culturaPorId, reservaDeNombres, type Cultura } from './culturas';
import { origen, origenAlAzar, origenHeredado, type OrigenFamiliar } from './rasgos';
import { rngEstable, type Rng } from './rng';

/**
 * Nombres y apellidos según el origen de la persona. Primero se sortea el origen y después, de él, el nombre y los apellidos (antes salían de
 * listas fijas españolas, sin mirar el origen: una madre de Europa del este podía llamarse Patricia Robles Martín).
 *
 * - Un solo origen: nombre y apellidos de ese origen (una cultura de su reserva; el nombre y los apellidos son de la misma).
 * - Una mezcla (padres de orígenes distintos): el nombre sale de uno de los orígenes según su peso y los apellidos, uno de cada. Si la mezcla no
 *   incluye el origen del país de juego, un 12 % de las veces el nombre es del país de juego (`PROBABILIDAD_DE_NOMBRE_LOCAL`).
 * - Los nacidos en el país de juego llevan sus apellidos como allí (en España, dos); los adultos, los de su cultura.
 * - Los hijos llevan el primer apellido del padre y el primero de la madre, con la forma de su sexo (Kowalski / Kowalska).
 * - Nombres compuestos (José Manuel) y nombres por generación (los de los niños no son los de sus padres).
 */

/** País de juego, en lo que importa a los nombres. Un paquete de país (un dato) define el suyo. */
export interface PaisDeNombres {
  id: string;
  nombre: string;
  /** Orígenes que son «de aquí» (los de ese país): el nombre «local» sale de su reserva. */
  origenesLocales: readonly string[];
  /** Apellidos de los nacidos aquí: dos (España, Argentina a veces) o uno. */
  apellidosDeLosNacidosAqui: 1 | 2;
}

export const PAIS_ESPANA: PaisDeNombres = { id: 'espana', nombre: 'España', origenesLocales: ['espana_norte', 'espana_centro', 'espana_sur'], apellidosDeLosNacidosAqui: 2 };

/** Si la mezcla no incluye el origen del país de juego, probabilidad de que el nombre sea del país de juego. */
export const PROBABILIDAD_DE_NOMBRE_LOCAL = 0.12;
/** Edad hasta la que se usan los nombres de «jóvenes». */
export const EDAD_DE_NOMBRES_JOVENES = 25;
/** Años de diferencia de nacimiento que tienen que separar a dos personas con el mismo nombre completo. */
export const AÑOS_ENTRE_HOMONIMOS = 15;
export const MAXIMO_DE_HOMONIMOS = 2;

/** Un apellido en su forma de base (la masculina) y la cultura de la que viene (para ponerlo en femenino cuando toca). */
export interface ApellidoDe {
  base: string;
  cultura: string;
}

export interface Identidad {
  pila: string;
  apellidos: ApellidoDe[];
}

/** El apellido tal como lo lleva una persona de ese sexo. */
export function formaDeApellido(a: ApellidoDe, genero: 'f' | 'm'): string {
  if (genero === 'm') return a.base;
  const regla = culturaPorId(a.cultura)?.femenino?.find(([masculino]) => a.base.endsWith(masculino));
  return regla ? a.base.slice(0, a.base.length - regla[0].length) + regla[1] : a.base;
}

export const apellidosTexto = (apellidos: readonly ApellidoDe[], genero: 'f' | 'm'): string => apellidos.map((a) => formaDeApellido(a, genero)).join(' ');
export const nombreCompleto = (i: Identidad, genero: 'f' | 'm'): string => `${i.pila} ${apellidosTexto(i.apellidos, genero)}`.trim();

/** El nombre de pila de una persona dado su nombre completo (el primer apellido empieza donde acaba la pila, que puede ser compuesta: «José Manuel García»). */
export const nombreCorto = (nombre: string): string => nombre.split(' ')[0];

// ---------------------------------------------------------------------------------------------------- sorteos

/** Elige por su posición en una lista ordenada de más a menos frecuente (el primero pesa 5 veces lo que el último). */
function porFrecuencia<T>(lista: readonly T[], rng: Rng): T {
  const n = lista.length;
  let total = 0;
  for (let i = 0; i < n; i++) total += 1 / (1 + (4 * i) / n);
  let u = rng.next() * total;
  for (let i = 0; i < n; i++) {
    u -= 1 / (1 + (4 * i) / n);
    if (u < 0) return lista[i];
  }
  return lista[n - 1];
}

function porPeso<T>(items: readonly T[], peso: (t: T) => number, rng: Rng): T {
  const total = items.reduce((a, t) => a + peso(t), 0);
  let u = rng.next() * total;
  for (const t of items) {
    u -= peso(t);
    if (u < 0) return t;
  }
  return items[items.length - 1];
}

/** La cultura de un origen para esta persona: se sortea una vez por origen y se usa para el nombre y los apellidos de ese origen. */
const culturaDeOrigen = (rng: Rng, origenId: string): Cultura => {
  const culturas = reservaDeNombres(origen(origenId)?.reserva ?? 'espana');
  return culturas.length === 1 ? culturas[0] : porPeso(culturas, (c) => c.peso, rng);
};

function pilaDe(rng: Rng, cultura: Cultura, genero: 'f' | 'm', edad: number): string {
  const joven = edad < EDAD_DE_NOMBRES_JOVENES;
  if (cultura.compuestos && rng.chance(joven ? cultura.probabilidadDeCompuesto?.jovenes ?? 0 : cultura.probabilidadDeCompuesto?.adultos ?? 0)) return porFrecuencia(cultura.compuestos[genero], rng);
  const listas = cultura.nombres[genero];
  // Casi siempre los de su generación; algún adulto lleva un nombre «joven» y al revés.
  const propia = joven ? listas.jovenes : listas.adultos;
  const otra = joven ? listas.adultos : listas.jovenes;
  return porFrecuencia(rng.chance(0.85) ? propia : otra, rng);
}

/** De qué origen sale el nombre de pila: el único, el de la mezcla según su peso o, a veces, el del país de juego. */
function origenDelNombre(rng: Rng, o: OrigenFamiliar, pais: PaisDeNombres): string {
  if (o.length === 1) return o[0].id;
  const local = o.some((x) => pais.origenesLocales.includes(x.id));
  if (!local && rng.chance(PROBABILIDAD_DE_NOMBRE_LOCAL)) return pais.origenesLocales[0];
  return porPeso(o, (x) => x.peso, rng).id;
}

export interface OpcionesDeNombre {
  /** Edad de la persona: decide los nombres de su generación y si lleva los apellidos de su cultura o los del país de juego. */
  edad: number;
  pais?: PaisDeNombres;
}

/** Edad desde la que se considera que alguien no ha nacido «aquí» y lleva los apellidos de su cultura. */
const EDAD_DE_ADULTO = 18;

/**
 * La identidad de una persona del mundo (un adulto o un niño) según su origen. El nombre sale del origen (o, en una mezcla sin el del país de
 * juego, a veces del país de juego) y los apellidos, uno de cada origen de la mezcla.
 */
export function identidadAlAzar(rng: Rng, genero: 'f' | 'm', o: OrigenFamiliar, { edad, pais = PAIS_ESPANA }: OpcionesDeNombre): Identidad {
  const culturas = new Map<string, Cultura>();
  const de = (id: string) => culturas.get(id) ?? culturas.set(id, culturaDeOrigen(rng, id)).get(id)!;
  const origenNombre = origenDelNombre(rng, o, pais);
  const cultNombre = de(origenNombre);
  const pila = pilaDe(rng, cultNombre, genero, edad);
  // Los adultos llevan los apellidos de su cultura (uno o dos); los nacidos aquí, los del país de juego.
  const numero = edad >= EDAD_DE_ADULTO ? cultNombre.numeroDeApellidos : pais.apellidosDeLosNacidosAqui;
  // De qué origen sale cada apellido: el único, o uno de cada origen de la mezcla (el primero, el del nombre).
  const primero = o.some((x) => x.id === origenNombre) ? origenNombre : o[0].id;
  const origenes = [primero, ...o.map((x) => x.id).filter((id) => id !== primero)];
  const apellidos: ApellidoDe[] = [];
  for (let i = 0; i < numero; i++) {
    const c = de(origenes[i % origenes.length]);
    let base = '';
    for (let intento = 0; intento < 20; intento++) {
      base = porFrecuencia(c.apellidos, rng);
      if (!apellidos.some((a) => a.base === base)) break;
    }
    apellidos.push({ base, cultura: c.id });
  }
  return { pila, apellidos };
}

/**
 * La identidad de un hijo: el nombre de pila sale del origen del hijo (la mezcla de los de sus padres) y los apellidos son el primero del padre y el
 * primero de la madre (en el país de juego; con un solo apellido por persona, el del padre).
 */
export function identidadDeHijo(rng: Rng, genero: 'f' | 'm', padre: Identidad, madre: Identidad, origenDelHijo: OrigenFamiliar, { edad, pais = PAIS_ESPANA }: OpcionesDeNombre): Identidad {
  const culturas = new Map<string, Cultura>();
  const de = (id: string) => culturas.get(id) ?? culturas.set(id, culturaDeOrigen(rng, id)).get(id)!;
  const pila = pilaDe(rng, de(origenDelNombre(rng, origenDelHijo, pais)), genero, edad);
  const apellidos = pais.apellidosDeLosNacidosAqui === 1 ? [padre.apellidos[0]] : [padre.apellidos[0], madre.apellidos[0]];
  return { pila, apellidos };
}

// ---------------------------------------------------------------------------------------------------- los padres (desde la semilla)

export interface PadreDeSemilla {
  origen: OrigenFamiliar;
  identidad: Identidad;
}

/** El origen del padre o de la madre de una semilla: siempre el mismo (así lo usan el motor y el módulo de personas sin depender uno del otro). */
export const origenDePadre = (seed: number, lado: 'padre' | 'madre'): OrigenFamiliar => origenAlAzar(rngEstable('origen', seed, lado));

const EDAD_DE_REFERENCIA_DE_PADRES = 45;
let ULTIMOS: { clave: string; padres: { padre: PadreDeSemilla; madre: PadreDeSemilla } } | undefined;

/**
 * El padre y la madre de una semilla (origen y nombre con sus apellidos), siempre los mismos: los hijos llevan el primer apellido de cada uno, así que
 * no pueden ser el mismo. El origen de cada uno sale solo de la semilla; el motor lo usa para sus rasgos y aspecto.
 */
export function padresDeSemilla(seed: number, pais: PaisDeNombres = PAIS_ESPANA): { padre: PadreDeSemilla; madre: PadreDeSemilla } {
  const clave = `${seed}|${pais.id}`;
  if (ULTIMOS?.clave === clave) return ULTIMOS.padres;
  const hacer = (lado: 'padre' | 'madre', evitar?: string): PadreDeSemilla => {
    const o = origenDePadre(seed, lado);
    const rng = rngEstable('nombre', seed, lado);
    let identidad = identidadAlAzar(rng, lado === 'padre' ? 'm' : 'f', o, { edad: EDAD_DE_REFERENCIA_DE_PADRES, pais });
    for (let i = 0; i < 20 && evitar !== undefined && identidad.apellidos[0].base === evitar; i++) identidad = identidadAlAzar(rng, lado === 'padre' ? 'm' : 'f', o, { edad: EDAD_DE_REFERENCIA_DE_PADRES, pais });
    return { origen: o, identidad };
  };
  const padre = hacer('padre');
  const madre = hacer('madre', padre.identidad.apellidos[0].base);
  const padres = { padre, madre };
  ULTIMOS = { clave, padres };
  return padres;
}

/** Los orígenes de una semilla: la mezcla de los de sus padres es el del personaje. */
export const origenDeJugador = (seed: number): OrigenFamiliar => origenHeredado(origenDePadre(seed, 'padre'), origenDePadre(seed, 'madre'));

// ---------------------------------------------------------------------------------------------------- homónimos

/** Quién lleva ya cada nombre completo (los días de nacimiento de cada uno): dos como mucho y con 15 años o más de diferencia. */
export type RegistroDeNombres = Map<string, number[]>;

export function nombrePermitido(registro: RegistroDeNombres, completo: string, nacimiento: number): boolean {
  const otros = registro.get(completo) ?? [];
  return otros.length < MAXIMO_DE_HOMONIMOS && otros.every((n) => Math.abs(n - nacimiento) >= AÑOS_ENTRE_HOMONIMOS * 365);
}

export function registrarNombre(registro: RegistroDeNombres, completo: string, nacimiento: number): void {
  registro.set(completo, [...(registro.get(completo) ?? []), nacimiento]);
}

