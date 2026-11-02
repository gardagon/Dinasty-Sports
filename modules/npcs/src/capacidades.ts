import {
  CAPACIDADES_GENETICAS,
  GRUPO_DE_CAPACIDAD,
  NIVEL_PRACTICA,
  DESARROLLO_NATURAL,
  INICIAL_DE_CAPACIDAD,
  caidaDeCapacidad,
  evolucionSemanal,
  nivelInicialHeredado,
  rngEstable,
  vigoresPorEdad,
  type Practica,
  type ReglaDeEvolucion,
} from '@ds/contracts';
import type { Genetica } from './deportistas';

/**
 * LAS CAPACIDADES REALES DE UN PNJ (plan `docs/MISMAS_REGLAS.md`, fase P1). Un niño con genética no es solo unos topes: tiene las 18 capacidades de `gen` con su
 * valor, igual que el personaje, y siguen **las mismas reglas** (`desarrollo-de-persona.ts`, en contracts): empiezan como las del personaje a los 8 años
 * (su rango inicial según su tope y su crianza) y, sin entrenar, crecen solas hasta el 45 % de lo que permite su edad y caen si bajan de lo que fueron.
 * El estado de ánimo del día (energía, estrés...) no se simula en un PNJ.
 *
 * Se guardan dos listas en el orden de `CAPACIDADES_GENETICAS`: el valor y el máximo alcanzado (para la caída). El valor inicial (la caída no baja de él) no se
 * guarda: sale de su genética (`capacidadesIniciales`).
 */

export interface CapacidadesDe {
  cap: number[];
  pico: number[];
  base: number[];
}

/** La edad a la que empieza el personaje, y desde la que se cuenta la historia de un niño: las capacidades de un niño de 8 años salen del rango inicial. */
export const EDAD_DE_PARTIDA = 8;
const DIAS_POR_ANIO = 365;
/** Semanas que se calculan de golpe al hacer la historia de un niño. */
export const SEMANAS_POR_BLOQUE = 4;
const redondea = (x: number) => Math.round(x * 100) / 100;

/** Las reglas de cada capacidad, en el orden de `CAPACIDADES_GENETICAS`. */
const GRUPOS = CAPACIDADES_GENETICAS.map((c) => GRUPO_DE_CAPACIDAD[c] as 'fisico' | 'mental' | 'social');
const REGLAS: readonly ReglaDeEvolucion[] = CAPACIDADES_GENETICAS.map((c) => ({ decay: caidaDeCapacidad(c), natural: DESARROLLO_NATURAL }));

/** Edad decimal de una persona en un día (los días se cuentan desde el comienzo de la partida; `nacimiento` es el día de su nacimiento). */
export const edadDecimalDe = (nacimiento: number, dia: number): number => (dia - nacimiento) / DIAS_POR_ANIO;

/** Los valores iniciales de cada niño, por su genética: salen siempre igual y se necesitan cada semana (la caída no baja de ellos), así que se calculan una vez. */
const INICIALES = new WeakMap<Genetica, number[]>();
export function valoresIniciales(id: string, g: Genetica): readonly number[] {
  let v = INICIALES.get(g);
  if (!v) INICIALES.set(g, (v = capacidadesIniciales(id, g).cap));
  return v;
}

/** Las capacidades de un niño a los 8 años, como las del personaje: dentro del rango inicial según su tope y la ventaja de su crianza. */
export function capacidadesIniciales(id: string, g: Genetica): CapacidadesDe {
  const cap = CAPACIDADES_GENETICAS.map((c) => {
    const tope = g.topes[c];
    const n = nivelInicialHeredado(tope, g.ventaja, rngEstable('capacidad-inicial', id, c));
    return redondea(Math.min(tope, Math.max(0, INICIAL_DE_CAPACIDAD.min + (INICIAL_DE_CAPACIDAD.max - INICIAL_DE_CAPACIDAD.min) * n)));
  });
  return { cap, pico: [...cap], base: [...cap] };
}

/**
 * Una semana de una persona: sus capacidades se desarrollan y caen siete días. `dia` es el día en que acaba la semana; la edad (con su adelanto o retraso,
 * `desfase`) decide cuánto de su tope permite el cuerpo. Muta las listas que se le pasan (los PNJ las copian antes).
 */
export function avanzarSemana(c: CapacidadesDe, g: Genetica, nacimiento: number, dia: number, semanas = 1): void {
  // Con varias semanas de golpe, lo que permite la edad se mide a mitad del periodo.
  const v = vigoresPorEdad(edadDecimalDe(nacimiento, dia - 3.5 * (semanas - 1)), g.desfase);
  for (let i = 0; i < CAPACIDADES_GENETICAS.length; i++) {
    const id = CAPACIDADES_GENETICAS[i];
    const techo = (g.topes[id] * v[GRUPOS[i]]) / 100;
    // Un PNJ sin rutina no entrena sus capacidades: lleva mucho sin hacerlo. Los jóvenes que se desarrollan no envejecen (el envejecimiento llega después de los 24).
    const siguiente = evolucionSemanal(REGLAS[i], { valor: c.cap[i], pico: c.pico[i], base: c.base[i], diasSinEntrenar: 1e6, techo, envejece: false }, semanas);
    c.cap[i] = siguiente;
    if (siguiente > c.pico[i]) c.pico[i] = siguiente;
  }
}

/** Redondea para guardar (dos decimales bastan: el motor no distingue más). */
export function aGuardar(c: CapacidadesDe): { cap: number[]; pico: number[] } {
  return { cap: c.cap.map(redondea), pico: c.pico.map(redondea) };
}

/**
 * La historia de un niño: sus capacidades a los 8 años y siete días de desarrollo y caída por cada semana desde entonces hasta hoy. Los de menos de 8 años
 * (hermanos pequeños, vecinos) parten del rango inicial y empiezan a desarrollarse desde ahora.
 */
export function historiaDe(id: string, g: Genetica, nacimiento: number, dia: number): { cap: number[]; pico: number[] } {
  const c = capacidadesIniciales(id, g);
  const desde = nacimiento + EDAD_DE_PARTIDA * DIAS_POR_ANIO;
  // La historia se calcula de a `SEMANAS_POR_BLOQUE` semanas (con las fórmulas cerradas): lo mismo que semana a semana, dentro de un margen pequeño que prueba un test, en una cuarta parte del tiempo.
  let d = desde;
  while (d < dia) {
    const semanas = Math.min(SEMANAS_POR_BLOQUE, Math.floor((dia - d) / 7));
    if (semanas < 1) break;
    d += 7 * semanas;
    avanzarSemana(c, g, nacimiento, d, semanas);
  }
  return aGuardar(c);
}

// ---------------------------------------------------------------------------------------------------- edad de empezar

/** Edad (en años) a la que un niño empezó a practicar un deporte en un club. Desde `EDAD_MINIMA_DE_EMPEZAR` (prebenjamín). */
export const EDAD_MINIMA_DE_EMPEZAR = 6;

/**
 * La edad a la que un niño empezó en un deporte, con un azar estable (solo depende de él y del deporte): **desde los 6** los muy interesados o con padres
 * deportistas, **entre los 8 y los 10 la mayoría**, y algunos más tarde (de 11 a 13). Decidido el 02/11 (`MISMAS_REGLAS.md` §5). Es la historia que se simula al
 * crear la partida: se llega a los valores de haber seguido su rutina desde esa edad (el llamador no la pasa de la edad actual del niño).
 */
export function edadDeEmpezar(id: string, deporte: string, interes: number, padres: { padre: Practica; madre: Practica }): number {
  const r = rngEstable('edad-de-empezar', id, deporte);
  // Cuánto empuja a empezar pronto: el interés (de 0 a 3) y lo que practicaron sus padres (de 0 a 3 cada uno, el mayor cuenta más).
  const deportistas = Math.max(NIVEL_PRACTICA[padres.padre], NIVEL_PRACTICA[padres.madre]);
  const empuje = interes / 3 + deportistas / 3;
  if (r.chance(Math.min(0.75, Math.max(0, empuje - 0.45)))) return EDAD_MINIMA_DE_EMPEZAR + (r.chance(0.35) ? 1 : 0);
  // Algunos empiezan más tarde, sobre todo los poco interesados.
  if (r.chance(0.08 + 0.12 * (1 - interes / 3))) return r.int(11, 13);
  const u = r.next();
  return u < 0.4 ? 8 : u < 0.75 ? 9 : 10;
}
