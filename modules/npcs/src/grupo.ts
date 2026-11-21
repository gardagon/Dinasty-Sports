import { MOVERSE_CON_EL_GRUPO, type Ubicacion } from '@ds/contracts';

/**
 * MOVERSE CON EL GRUPO (21/11/2026): al acabar una acción, ¿se ha ido a la vez a un mismo sitio la mayoría de la gente que tenías cerca, mientras tú sigues donde estabas?
 *
 * Es lo que decide si hay que avisar (`SHARED_EVENTS.GRUPO_SE_VA`); qué se pregunta y qué pasa después lo decide un suceso (`eventos.grupo.se_van`). Aquí solo se cuenta, con las agendas:
 * no hay listas de sitios ni de horas. Las cifras (mínimo de personas y proporción) están en `MOVERSE_CON_EL_GRUPO`.
 *
 * - Los que están **ocupados pero a la vista** en otro sitio (el equipo que entrena en la pista) cuentan como que van allí. Quien sigue contigo, aunque ahora esté ocupado
 *   (los de tu clase al empezar la clase), no se ha ido.
 * - Los que salen **del mapa** (a casa, a su aula de otra clase) no cuentan como destino: no se sabe a dónde van ni se les puede seguir. Cuentan en el total, así que
 *   si la mayoría de los que tienes cerca desaparece del mapa no hay grupo al que acompañar.
 */
export interface GrupoQueSeVa {
  hacia: string;
  /** Cuántos de los cercanos van a `hacia`, de cuántos eran. */
  cuantos: number;
  total: number;
  /** Quiénes van (los conocidos primero, como salen en la lista de gente cercana): `cercanos` ya viene ordenado. */
  muestra: string[];
}

/** `cercanos`: la gente que tenías cerca al empezar, en el orden en que se ve (los primeros, los más cercanos). `despues`: dónde está cada uno al acabar. */
export function grupoQueSeVa<T extends { id: string }>(cercanos: readonly T[], aqui: string, despues: (n: T) => Ubicacion, reglas = MOVERSE_CON_EL_GRUPO): GrupoQueSeVa | undefined {
  const total = cercanos.length;
  if (total < reglas.minimo) return undefined;
  const destinos = new Map<string, T[]>();
  for (const n of cercanos) {
    const u = despues(n);
    const sitio = u.atendiendo?.sitio ?? u.sitio;
    // Sigue contigo (aunque esté ocupado a la vista) o se ha ido del mapa: no es un destino.
    if (sitio === null || sitio === aqui) continue;
    const l = destinos.get(sitio);
    if (l) l.push(n);
    else destinos.set(sitio, [n]);
  }
  let mejor: [string, T[]] | undefined;
  for (const par of destinos) if (!mejor || par[1].length > mejor[1].length) mejor = par;
  if (!mejor || mejor[1].length < reglas.minimo || mejor[1].length < reglas.proporcion * total) return undefined;
  return { hacia: mejor[0], cuantos: mejor[1].length, total, muestra: mejor[1].slice(0, reglas.muestra).map((n) => n.id) };
}
