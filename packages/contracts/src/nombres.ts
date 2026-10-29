import { apodosDe, culturaPorId, reservaDeNombres, type Cultura } from './culturas';
import { PAIS_ESPANA, type PaisDeNombres } from './paises';
import { origen, origenAlAzar, origenHeredado, type OrigenFamiliar } from './rasgos';
import { rngEstable, type Rng } from './rng';

/**
 * Nombres y apellidos según el origen de la persona. Primero se sortea el origen y después, de él, el nombre y los apellidos (antes salían de
 * listas fijas españolas, sin mirar el origen: una madre de Europa del este podía llamarse Patricia Robles Martín).
 *
 * - Un solo origen: nombre y apellidos de ese origen (una cultura de su reserva; el nombre y los apellidos son de la misma).
 * - Una mezcla (padres de orígenes distintos): el nombre sale de uno de los orígenes según su peso y los apellidos, uno de cada. Si la mezcla no
 *   incluye el origen del país de juego, un 12 % de las veces el nombre es del país de juego (`PROBABILIDAD_DE_NOMBRE_LOCAL`).
 * - Los apellidos que lleva cada persona son los de su cultura: **dos** (España, Latinoamérica: el del padre y el de la madre) o **uno** (el resto del
 *   mundo, también los niños); una mezcla con un origen hispano lleva dos. El personaje y sus hermanos llevan siempre el primero de cada uno de sus padres.
 * - Los hijos llevan el primer apellido del padre y el primero de la madre, con la forma de su sexo (Kowalski / Kowalska).
 * - Nombres compuestos (José Manuel), que se muestran enteros, y apodos (José Manuel → Chema) que pueden salir al azar o poner el jugador.
 * - Nombres por generación: los adultos usan su lista y los niños, la unión (sin repetir) de las dos, con los de su generación primero.
 */

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

/** La lista de los niños: los nombres de su generación y, detrás, los de los adultos que no estén ya (sin repetir). */
const UNIDAS = new WeakMap<object, readonly string[]>();
function unidos(listas: Cultura['nombres']['f']): readonly string[] {
  let u = UNIDAS.get(listas);
  if (!u) UNIDAS.set(listas, (u = [...new Set([...listas.jovenes, ...listas.adultos])]));
  return u;
}

function pilaDe(rng: Rng, cultura: Cultura, genero: 'f' | 'm', edad: number): string {
  const joven = edad < EDAD_DE_NOMBRES_JOVENES;
  if (cultura.compuestos && rng.chance(joven ? cultura.probabilidadDeCompuesto?.jovenes ?? 0 : cultura.probabilidadDeCompuesto?.adultos ?? 0)) return porFrecuencia(cultura.compuestos[genero], rng);
  const listas = cultura.nombres[genero];
  // Los niños (y las futuras generaciones) usan los nombres de todos; los adultos, los suyos (y algún nombre «joven»).
  if (joven) return porFrecuencia(unidos(listas), rng);
  return porFrecuencia(rng.chance(0.85) ? listas.adultos : listas.jovenes, rng);
}

/** Probabilidad de que alguien con un nombre que tiene apodos habituales lo lleve. */
export const PROBABILIDAD_DE_APODO = 0.35;

/**
 * Un apodo al azar de los habituales de ese nombre (José Manuel → Chema), o `undefined`. Sale solo de la clave que se dé (el nombre completo o el id):
 * siempre el mismo para la misma persona, sin gastar azar de la partida.
 */
export function apodoAlAzar(clave: string, pila: string): string | undefined {
  const posibles = apodosDe(pila);
  if (!posibles.length) return undefined;
  const rng = rngEstable('apodo', clave);
  return rng.chance(PROBABILIDAD_DE_APODO) ? rng.pick(posibles) : undefined;
}

/** Longitud máxima de un apodo. */
export const LONGITUD_MAXIMA_DE_APODO = 20;

/** El id de la acción de ponerle (o quitarle, con texto vacío) un apodo a alguien: `npcs.apodo.<persona>.<apodo>`. */
export const idDePonerApodo = (npcId: string, apodo: string): string => `npcs.apodo.${npcId}.${encodeURIComponent(apodo.trim()).replace(/\./g, '%2E')}`;

/** El apodo de un id de acción, o `undefined` si no vale (solo letras, espacios, guiones y apóstrofos, hasta `LONGITUD_MAXIMA_DE_APODO`). Vacío = quitarlo. */
export function apodoDeId(texto: string): string | undefined {
  let apodo: string;
  try {
    apodo = decodeURIComponent(texto).trim();
  } catch {
    return undefined;
  }
  return apodo.length <= LONGITUD_MAXIMA_DE_APODO && /^[\p{L}][\p{L} '’-]*$|^$/u.test(apodo) ? apodo : undefined;
}

/** Cómo se le llama en los textos: el apodo si lo tiene y, si no, el nombre de pila entero («José Manuel»). */
export const nombreCortoDe = (p: { name: string; nombrePila?: string; apodo?: string }): string => p.apodo || p.nombrePila || p.name.split(' ')[0];

/** De qué origen sale el nombre de pila: el único, el de la mezcla según su peso o, a veces, el del país de juego. */
function origenDelNombre(rng: Rng, o: OrigenFamiliar, pais: PaisDeNombres): string {
  if (o.length === 1) return o[0].id;
  const local = o.some((x) => pais.origenesLocales.includes(x.id));
  if (!local && rng.chance(PROBABILIDAD_DE_NOMBRE_LOCAL)) return pais.origenesLocales[0];
  return porPeso(o, (x) => x.peso, rng).id;
}

export interface OpcionesDeNombre {
  /** Edad de la persona: decide los nombres de su generación. */
  edad: number;
  pais?: PaisDeNombres;
}

/**
 * La identidad de una persona del mundo (un adulto o un niño) según su origen. El nombre sale del origen (o, en una mezcla sin el del país de
 * juego, a veces del país de juego) y los apellidos, uno de cada origen de la mezcla (o los de su cultura: uno o dos).
 */
export function identidadAlAzar(rng: Rng, genero: 'f' | 'm', o: OrigenFamiliar, { edad, pais = PAIS_ESPANA }: OpcionesDeNombre): Identidad {
  const culturas = new Map<string, Cultura>();
  const de = (id: string) => culturas.get(id) ?? culturas.set(id, culturaDeOrigen(rng, id)).get(id)!;
  const origenNombre = origenDelNombre(rng, o, pais);
  const cultNombre = de(origenNombre);
  const pila = pilaDe(rng, cultNombre, genero, edad);
  // De qué origen sale cada apellido: el único, o uno de cada origen de la mezcla (el primero, el del nombre).
  const primero = o.some((x) => x.id === origenNombre) ? origenNombre : o[0].id;
  const origenes = [primero, ...o.map((x) => x.id).filter((id) => id !== primero)];
  // Dos apellidos si algún origen es hispano (el del padre y el de la madre); uno si no (también los niños de origen extranjero).
  const numero = origenes.some((id) => de(id).numeroDeApellidos === 2) ? 2 : 1;
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
export const origenDePadre = (seed: number, lado: 'padre' | 'madre', pais: PaisDeNombres = PAIS_ESPANA): OrigenFamiliar =>
  origenAlAzar(rngEstable('origen', seed, lado), pais.demografia);

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
    const o = origenDePadre(seed, lado, pais);
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
export const origenDeJugador = (seed: number, pais: PaisDeNombres = PAIS_ESPANA): OrigenFamiliar => origenHeredado(origenDePadre(seed, 'padre', pais), origenDePadre(seed, 'madre', pais));

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

