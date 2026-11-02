import {
  CAPACIDADES_GENETICAS,
  DESARROLLO_NATURAL,
  INICIAL_DE_CAPACIDAD,
  caidaDeCapacidad,
  evolucionSemanal,
  nivelInicialHeredado,
  rngEstable,
  vigoresPorEdad,
  vigorDeCapacidad,
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
const redondea = (x: number) => Math.round(x * 100) / 100;

/** Las reglas de cada capacidad, en el orden de `CAPACIDADES_GENETICAS`. */
const REGLAS: readonly ReglaDeEvolucion[] = CAPACIDADES_GENETICAS.map((c) => ({ decay: caidaDeCapacidad(c), natural: DESARROLLO_NATURAL }));

/** Edad decimal de una persona en un día (los días se cuentan desde el comienzo de la partida; `nacimiento` es el día de su nacimiento). */
export const edadDecimalDe = (nacimiento: number, dia: number): number => (dia - nacimiento) / DIAS_POR_ANIO;

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
export function avanzarSemana(c: CapacidadesDe, g: Genetica, nacimiento: number, dia: number): void {
  const v = vigoresPorEdad(edadDecimalDe(nacimiento, dia), g.desfase);
  for (let i = 0; i < CAPACIDADES_GENETICAS.length; i++) {
    const id = CAPACIDADES_GENETICAS[i];
    const techo = (g.topes[id] * vigorDeCapacidad(id, v)) / 100;
    // Un PNJ sin rutina no entrena sus capacidades: lleva mucho sin hacerlo. Los jóvenes que se desarrollan no envejecen (el envejecimiento llega después de los 24).
    const siguiente = evolucionSemanal(REGLAS[i], { valor: c.cap[i], pico: c.pico[i], base: c.base[i], diasSinEntrenar: 1e6, techo, envejece: false });
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
  for (let d = desde + 7; d <= dia; d += 7) avanzarSemana(c, g, nacimiento, d);
  return aGuardar(c);
}
