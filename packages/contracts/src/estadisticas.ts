/**
 * LAS ESTADÍSTICAS DE CADA JUGADOR Y SU EXPERIENCIA POR PUESTO (F2.4): lo que se guarda de cada jugador de un deporte de equipo, **igual para el personaje y para cualquier PNJ** (`VISION.md`, principio 4: si pesa, se
 * guarda mejor, no menos): por temporada, partidos, titularidades, minutos, goles, asistencias y nota media; y, partido a partido, su experiencia en cada puesto. Son funciones puras con los números de los datos del deporte.
 */
import type { PuestosDeDeporte } from './deporte-datos';
import { ladoDePuesto } from './deporte-datos';
import type { Pierna } from './deporte-datos';

/** Las estadísticas de un jugador en una temporada. `nota` es la **suma** de las notas de los partidos que jugó (la media es `nota / pj`). */
export interface EstadisticasDeTemporada {
  curso: number;
  /** Partidos jugados (con minutos). */
  pj: number;
  /** Partidos de titular. */
  ti: number;
  min: number;
  g: number;
  a: number;
  nota: number;
  /** Lo que añade el motor de posesiones y ocasiones (solo se guarda si no es 0): tiros, tiros a puerta, faltas cometidas, amarillas, rojas, pases y pases completados. */
  t?: number;
  ap?: number;
  f?: number;
  am?: number;
  ro?: number;
  pa?: number;
  pk?: number;
}

/** Una temporada ya cerrada en el historial, compacta: [curso, partidos, titularidades, minutos, goles, asistencias, nota media × 10] y, si las tuvo, [tiros, a puerta, faltas, amarillas, rojas, pases, pases completados]. */
export type TemporadaCerrada = [number, number, number, number, number, number, number, number?, number?, number?, number?, number?, number?, number?];

/**
 * Las sanciones (decisión 6 de `MOTOR_PARTIDOS.md`, dato del deporte): la roja suspende el partido siguiente; la acumulación de amarillas, uno cada 5 de la temporada. Las mismas reglas para el personaje y los PNJ.
 * Quien cumple (su equipo juega sin él) resta uno.
 */
export const SANCIONES = { partidosPorRoja: 1, amarillasPorPartido: 5 } as const;

/** Los partidos de sanción que deja un partido: la roja y las amarillas que completan otra tanda de cinco en la temporada (`amarillasAntes`: las que llevaba antes de este partido). */
export function sancionTrasElPartido(amarillasAntes: number, p: { amarillas?: number; roja?: boolean }): number {
  const ahora = amarillasAntes + (p.amarillas ?? 0);
  return (p.roja ? SANCIONES.partidosPorRoja : 0) + Math.floor(ahora / SANCIONES.amarillasPorPartido) - Math.floor(amarillasAntes / SANCIONES.amarillasPorPartido);
}

export const estadisticasVacias = (curso: number): EstadisticasDeTemporada => ({ curso, pj: 0, ti: 0, min: 0, g: 0, a: 0, nota: 0 });

/** Un partido de un jugador sumado a las estadísticas de su temporada (las de otra temporada empiezan de nuevo). */
export function sumarPartido(e: EstadisticasDeTemporada | undefined, curso: number, p: { minutos: number; titular?: boolean; goles?: number; asistencias?: number; nota?: number; tiros?: number; alPuerta?: number; faltas?: number; amarillas?: number; roja?: boolean; pases?: number; pasesOk?: number }): EstadisticasDeTemporada {
  const base = e && e.curso === curso ? e : estadisticasVacias(curso);
  if (p.minutos <= 0) return base;
  const suma = (antes: number | undefined, mas: number | undefined): number | undefined => ((antes ?? 0) + (mas ?? 0) > 0 ? (antes ?? 0) + (mas ?? 0) : undefined);
  const nuevas = { t: suma(base.t, p.tiros), ap: suma(base.ap, p.alPuerta), f: suma(base.f, p.faltas), am: suma(base.am, p.amarillas), ro: suma(base.ro, p.roja ? 1 : 0), pa: suma(base.pa, p.pases), pk: suma(base.pk, p.pasesOk) };
  return {
    curso, pj: base.pj + 1, ti: base.ti + (p.titular ? 1 : 0), min: base.min + p.minutos, g: base.g + (p.goles ?? 0), a: base.a + (p.asistencias ?? 0), nota: Math.round((base.nota + (p.nota ?? 0)) * 10) / 10,
    ...Object.fromEntries(Object.entries(nuevas).filter(([, v]) => v !== undefined)),
  };
}

/** La temporada en su forma compacta para el historial. */
export const cerrarTemporadaDeJugador = (e: EstadisticasDeTemporada): TemporadaCerrada => {
  const nota = e.pj ? Math.round((e.nota / e.pj) * 10) : 0;
  return e.t || e.ap || e.f || e.am || e.ro || e.pa || e.pk ? [e.curso, e.pj, e.ti, e.min, e.g, e.a, nota, e.t ?? 0, e.ap ?? 0, e.f ?? 0, e.am ?? 0, e.ro ?? 0, e.pa ?? 0, e.pk ?? 0] : [e.curso, e.pj, e.ti, e.min, e.g, e.a, nota];
};

/** La nota media de una temporada (0 si no ha jugado). */
export const notaMedia = (e: Pick<EstadisticasDeTemporada, 'pj' | 'nota'>): number => (e.pj ? e.nota / e.pj : 0);

/** Los números de la experiencia en un puesto, como datos del deporte (`PuestosDeDeporte.experiencia`). */
export const EXPERIENCIA_POR_DEFECTO = { ritmo: 0.09, duracionDelPartido: 90 } as const;

/**
 * Cuánto aprende un jugador jugando (de ×0,7 a ×1,3): `0,7 + 0,6 × media(inteligencia, atención, conocimiento del deporte)`, cada uno frente a lo típico de su edad (lo típico cuenta 0,5). Un niño normal aprende ×1, uno
 * muy listo y atento hasta ×1,3 y uno flojo ×0,7 (`MOTOR_PARTIDOS.md` §3).
 */
export const aprendizajeDe = (normalizados: readonly number[]): number => 0.7 + 0.6 * (normalizados.reduce((t, x) => t + Math.min(1, Math.max(0, x)), 0) / Math.max(1, normalizados.length));

/** Lo que gana en experiencia un partido: `(100 − experiencia) × ritmo × minutos / 90 × aprendizaje × (factor del lado, si el puesto es del lado de su pierna buena)`. Rendimientos decrecientes: los primeros partidos dan mucho. */
export function experienciaTrasElPartido(experiencia: number, o: { minutos: number; aprendizaje: number; factorDelLado?: number; ritmo?: number }): number {
  const ritmo = o.ritmo ?? EXPERIENCIA_POR_DEFECTO.ritmo;
  const gana = (100 - experiencia) * ritmo * (o.minutos / EXPERIENCIA_POR_DEFECTO.duracionDelPartido) * o.aprendizaje * (o.factorDelLado ?? 1);
  return Math.round(Math.min(100, experiencia + Math.max(0, gana)) * 10) / 10;
}

/** El factor de experiencia de un puesto para alguien con esa pierna buena: `factorDeExperienciaDelLado` (×1,25) si el puesto es de su lado; 1 si no. */
export function factorDeExperienciaDelPuesto(puestos: PuestosDeDeporte | undefined, puesto: string, pierna: Pierna): number {
  return ladoDePuesto(puesto) === pierna ? puestos?.pierna?.factorDeExperienciaDelLado ?? 1 : 1;
}
