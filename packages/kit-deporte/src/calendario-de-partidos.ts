/**
 * **EL DÍA DE PARTIDO: FRANJAS Y CAMPOS** (`MOTOR_PARTIDOS.md` §15): reparte los partidos de una jornada en días, horas en punto y campos. Es lógica de cualquier deporte de equipo con liga por categorías, sin ninguna referencia al
 * fútbol: funciones puras sobre ids.
 *
 * - Cada partido empieza en una **franja** (en un mismo campo, una cada 2 horas) y se juega en el campo del local: los clubes grandes y medianos juegan en casa en **sus instalaciones** (un campo cada uno; si les faltan franjas, el resto de
 *   sus partidos en casa, en el complejo) y los pequeños y los colegios, en el **complejo municipal**, con varios campos (dato de la ciudad).
 * - Cada **día** juegan unas categorías (`CalendarioDeJornada.dias`); las que «caben si caben» juegan el primer día si todos los partidos de ese día entran en las franjas y, si no, el otro (la primera en pasar es cadete).
 * - Las categorías van por orden (las más pequeñas, en las primeras franjas, por la mañana) y los campos del complejo se llenan franja a franja.
 */
import type { CalendarioDeJornada } from '@ds/contracts';

/** Un partido por colocar: de qué categoría es, qué club juega en casa y si lo hace en sus instalaciones. */
export interface PartidoPorColocar {
  /** Un id único del partido (el que lo identifica en la liga). */
  id: string;
  categoria: string;
  /** El club local. */
  club: string;
  /** ¿Juega en casa en las instalaciones de su club (y no en el complejo)? */
  campoPropio: boolean;
}

/** Dónde y cuándo se juega un partido. */
export interface HoraYCampo {
  /** Día de la semana (0 = lunes). */
  dia: number;
  /** Hora en punto. */
  hora: number;
  /** `propio:<club>` (las instalaciones del club local) o `complejo:<n>` (el campo n, desde 1, del complejo municipal). */
  campo: string;
}

export interface CalendarioDeLaJornada {
  /** Dónde y cuándo se juega cada partido, por id. */
  partidos: Map<string, HoraYCampo>;
  /** Los partidos que no caben en ninguna franja (con los campos que hay): vacío si todo cabe. */
  sinSitio: string[];
  /** Los días en que juega cada categoría (las de `siCabe` pueden haber pasado al otro día). */
  diaDeCategoria: Record<string, number>;
}

/** Coloca los partidos de un día (en el orden en que vienen): los de campo propio, en el campo de su club (uno por franja); los del complejo, franja a franja en todos los campos. */
function colocarElDia(dia: number, partidos: readonly PartidoPorColocar[], franjas: readonly number[], campos: number): { puestos: Map<string, HoraYCampo>; sinSitio: string[] } {
  const puestos = new Map<string, HoraYCampo>();
  const sinSitio: string[] = [];
  const porClub = new Map<string, number>();
  let delComplejo = 0;
  for (const p of partidos) {
    // Un club con campo propio juega en casa en él, uno por franja; si tiene más partidos en casa ese día que franjas, el resto se juegan en el complejo municipal.
    const k = p.campoPropio ? porClub.get(p.club) ?? 0 : Infinity;
    if (p.campoPropio) porClub.set(p.club, k + 1);
    if (p.campoPropio && k < franjas.length) {
      puestos.set(p.id, { dia, hora: franjas[k], campo: `propio:${p.club}` });
    } else {
      const franja = Math.floor(delComplejo / Math.max(1, campos));
      if (campos > 0 && franja < franjas.length) puestos.set(p.id, { dia, hora: franjas[franja], campo: `complejo:${(delComplejo % campos) + 1}` });
      else sinSitio.push(p.id);
      delComplejo++;
    }
  }
  return { puestos, sinSitio };
}

/**
 * Reparte los partidos de la jornada: cada categoría juega en su día; las de `siCabe` el primero si caben y, si no, el otro. Con `camposDelComplejo` campos en el complejo municipal. Los que no caben salen en `sinSitio` (una
 * jornada bien dimensionada no los tiene: `camposNecesarios` dice cuántos campos hacen falta).
 */
export function repartirLosPartidos(partidos: readonly PartidoPorColocar[], cal: CalendarioDeJornada, camposDelComplejo: number): CalendarioDeLaJornada {
  const orden = new Map<string, number>();
  for (const d of cal.dias) for (const c of d.categorias) if (!orden.has(c)) orden.set(c, orden.size);
  for (const s of cal.siCabe ?? []) if (!orden.has(s.categoria)) orden.set(s.categoria, orden.size);
  // El día base de cada categoría; las que dependen de que quepan, provisionalmente en su primer día.
  const diaDe: Record<string, number> = {};
  for (const d of cal.dias) for (const c of d.categorias) diaDe[c] = d.dia;
  for (const s of cal.siCabe ?? []) diaDe[s.categoria] = s.dia;
  const dias = [...new Set([...cal.dias.map((d) => d.dia), ...(cal.siCabe ?? []).flatMap((s) => [s.dia, s.siNoCabe])])].sort((a, b) => a - b);
  const delDia = (dia: number): PartidoPorColocar[] => partidos.filter((p) => diaDe[p.categoria] === dia).sort((a, b) => (orden.get(a.categoria) ?? 99) - (orden.get(b.categoria) ?? 99) || (a.id < b.id ? -1 : 1));
  // Las categorías que «caben si caben», una a una por orden: si con ella el día no tiene sitio para todos, pasa a su otro día.
  for (const s of [...(cal.siCabe ?? [])].sort((a, b) => (orden.get(a.categoria) ?? 99) - (orden.get(b.categoria) ?? 99))) {
    if (colocarElDia(s.dia, delDia(s.dia), cal.franjas, camposDelComplejo).sinSitio.length) diaDe[s.categoria] = s.siNoCabe;
  }
  const res: CalendarioDeLaJornada = { partidos: new Map(), sinSitio: [], diaDeCategoria: diaDe };
  for (const dia of dias) {
    const r = colocarElDia(dia, delDia(dia), cal.franjas, camposDelComplejo);
    for (const [id, v] of r.puestos) res.partidos.set(id, v);
    res.sinSitio.push(...r.sinSitio);
  }
  return res;
}

/** Cuántos campos necesita el complejo para que todos los partidos quepan (los que no caben por ser de los campos propios de los clubes no se arreglan con campos: hay `tope`). */
export function camposNecesarios(partidos: readonly PartidoPorColocar[], cal: CalendarioDeJornada, tope = 40): number {
  for (let n = 0; n <= tope; n++) if (!repartirLosPartidos(partidos, cal, n).sinSitio.length) return n;
  return tope;
}
