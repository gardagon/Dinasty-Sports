import { tramoDeSemana, type CalendarioPais } from './calendar';
import { semanasDeTemporada, type TemporadaDeDeporte } from './deporte-datos';

/**
 * EL PLAZO DE FICHAJES (decisión del usuario, 03/11/2026; plan `docs/CIUDAD_Y_LIGAS.md` §7): **del verano a la primera competición del curso** (en el fútbol, la primera jornada de
 * liga; en el atletismo, la primera carrera). Es el mismo para el personaje y los PNJ y para todos los deportes; las fechas salen de la temporada de cada deporte en cada país
 * (`semanasDePretemporada`, que dice cuándo es la primera competición) y del calendario del país (cuándo empieza el verano).
 *
 * - **Dentro del plazo**, cualquiera puede entrar en un club o cambiarse: con hueco entra; con el equipo lleno, entra quien vale más que el peor.
 * - **Fuera del plazo**, quien está en un club no puede cambiarse; quien no está en ninguno puede entrar solo si hay hueco (sin sacar a nadie); y quien deja su club no puede entrar en
 *   otro del mismo deporte hasta el siguiente plazo.
 */
export function plazoDeFichajesAbierto(cal: CalendarioPais, temporada: TemporadaDeDeporte, semanaDelCurso: number): boolean {
  const periodo = tramoDeSemana(cal, semanaDelCurso).periodo;
  if (periodo === 'verano') return true;
  return periodo === 'clase' && semanaDelCurso < semanasDeTemporada(cal, temporada).primeraCompeticion;
}

/** La semana (absoluta, de la partida) en que el plazo está abierto: la misma si ya lo está y, si no, la primera semana siguiente que lo esté (el verano). */
export function proximaAperturaDelPlazo(cal: CalendarioPais, temporada: TemporadaDeDeporte, semanaAbsoluta: number): number {
  for (let w = semanaAbsoluta; w < semanaAbsoluta + cal.semanasPorCurso + 1; w++) {
    if (plazoDeFichajesAbierto(cal, temporada, w % cal.semanasPorCurso)) return w;
  }
  return semanaAbsoluta;
}
