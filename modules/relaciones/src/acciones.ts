import { INTERESES, type InteresesJugador, type NpcRole, type RasgosDe } from '@ds/contracts';

/**
 * Reglas puras de las acciones de relación (sin motor): cuánto duele una discusión, qué probabilidad hay de hacer las
 * paces y qué intereses tienen en común dos personas. Se prueban y se ajustan sin tocar el módulo.
 */

/** Días que hay que esperar para repetir una acción con la misma persona. */
export const ESPERA = { detalle: 7, paces: 5 } as const;

/** Afinidad mínima para pedirle ayuda a alguien o ayudarle: hace falta algo de confianza previa. */
export const AFINIDAD_PARA_AYUDAR = 5;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const eje = (r: RasgosDe | undefined, id: string) => r?.caracter[id] ?? 0;

/**
 * Afinidad que se pierde al discutir (valor positivo). Un carácter calmado lo encaja mejor (6) y uno agresivo peor (14);
 * discutir con quien manda (entrenador, tutor) duele un 50 % más.
 */
export function perdidaPorDiscusion(rasgos: RasgosDe | undefined, rol: NpcRole): number {
  const base = 10 + (4 * eje(rasgos, 'agresividad')) / 50;
  return base * (rol === 'entrenador' || rol === 'profesor' ? 1.5 : 1);
}

/**
 * Probabilidad (0,08 a 0,85) de que la otra persona acepte las paces. Ayudan su sociabilidad, optimismo y honestidad y que se
 * lleven bien por carácter e intereses (`compat`, de 0 a 1); lo dificulta lo enconado que esté el vínculo (`nivel`: −1 antipatía,
 * −2 enemigo, −3 antagonista).
 */
export function probabilidadDePaces(rasgos: RasgosDe | undefined, nivel: number, compat: number): number {
  const p =
    0.35 +
    (0.2 * eje(rasgos, 'sociabilidad')) / 50 +
    (0.15 * eje(rasgos, 'optimismo')) / 50 +
    (0.1 * eje(rasgos, 'honestidad')) / 50 -
    0.15 * (Math.abs(nivel) - 1) +
    0.2 * (compat - 0.4);
  return clamp(p, 0.08, 0.85);
}

/** El interés que más disfrutaría la otra persona de los que ya tiene el personaje (nivel ≥ 15), o nada si no coinciden. */
export function mejorInteresEnComun(
  rasgos: RasgosDe | undefined,
  jugador: InteresesJugador,
): { id: string; nombre: string; intensidad: number; tags: readonly string[] } | undefined {
  let mejor: { id: string; nombre: string; intensidad: number; tags: readonly string[]; puntos: number } | undefined;
  for (const [id, intensidad] of Object.entries(rasgos?.intereses ?? {})) {
    const mio = jugador[id] ?? 0;
    const def = INTERESES.find((i) => i.id === id);
    if (!def || mio < 15) continue;
    const puntos = intensidad * (0.5 + mio / 100);
    if (!mejor || puntos > mejor.puntos) mejor = { id, nombre: def.nombre, intensidad, tags: def.tags, puntos };
  }
  return mejor && { id: mejor.id, nombre: mejor.nombre, intensidad: mejor.intensidad, tags: mejor.tags };
}

/** Su interés favorito (el de mayor intensidad), para elegir un detalle que le guste. */
export function interesFavorito(rasgos: RasgosDe | undefined): { id: string; nombre: string; intensidad: number } | undefined {
  const orden = Object.entries(rasgos?.intereses ?? {}).sort((a, b) => b[1] - a[1]);
  const [id, intensidad] = orden[0] ?? [];
  const def = INTERESES.find((i) => i.id === id);
  return id && def ? { id, nombre: def.nombre, intensidad } : undefined;
}
