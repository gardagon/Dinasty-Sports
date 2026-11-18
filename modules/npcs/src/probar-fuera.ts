/**
 * **Quién va a probar a un club de fuera** (decisión del usuario, 17/11/2026): de los alumnos de un colegio con club, solo un porcentaje según la edad (`CategoriaDef.probarFuera`) va a probar
 * con los clubes de fuera; los demás se quedan para el equipo de su colegio. El porcentaje sube con la ambición y el nivel y baja con los amigos (`PESOS_DE_PROBAR_FUERA`). Cada niño sortea
 * cada temporada con un azar estable suyo (`rngEstable`): no gasta el azar de la partida y sale lo mismo si se repite.
 *
 * **Amigos:** las personas del mundo aún no tienen amistades entre sí, así que se toma como sustituto la parte de los compañeros de su colegio y de su año que se quedan en el equipo del colegio
 * (los que están en su misma situación): cuantos más se quedan, más pesa quedarse. Cuando haya amistades de verdad, es `amigosEnElEquipo` lo que hay que cambiar.
 */
import { PESOS_DE_PROBAR_FUERA, PROBAR_FUERA_POR_DEFECTO, rngEstable, type CategoriaDef } from '@ds/contracts';
import { edadNpc } from './index';
import { type Aspirante } from './plantillas';

/** La probabilidad de probar fuera de un niño, antes de contar a los amigos (de 0 a `techo`). `ambicion` y `nivel`, de −1 a 1. */
export const probabilidadBase = (base: number, ambicion: number, nivel: number): number =>
  Math.min(PESOS_DE_PROBAR_FUERA.techo, base * Math.min(PESOS_DE_PROBAR_FUERA.maximo, Math.max(PESOS_DE_PROBAR_FUERA.minimo, 1 + ambicion * PESOS_DE_PROBAR_FUERA.ambicion + nivel * PESOS_DE_PROBAR_FUERA.nivel)));

/** Con los amigos: `amigos` es la parte de los compañeros que se quedan; con el reparto esperado (`1 − base`) no cambia nada. */
export const probabilidadConAmigos = (p: number, base: number, amigos: number): number =>
  Math.min(PESOS_DE_PROBAR_FUERA.techo, Math.max(0, p * Math.min(PESOS_DE_PROBAR_FUERA.maximo, Math.max(PESOS_DE_PROBAR_FUERA.minimo, 1 - (amigos - (1 - base)) * PESOS_DE_PROBAR_FUERA.amigos))));

/**
 * De los aspirantes de una categoría, los ids de los que **se quedan en el club de su colegio** (los que no van a probar fuera), solo entre los de colegios que tienen club (`colegiosConClub`).
 * `bolsa` son todos los aspirantes de la categoría (el nivel de cada uno se mide entre ellos); `catId` y `dia` hacen el sorteo estable por categoría y temporada.
 */
export function losQueSeQuedan(bolsa: readonly Aspirante[], colegiosConClub: ReadonlySet<string>, cat: CategoriaDef, dia: number): Set<string> {
  const base = cat.probarFuera ?? PROBAR_FUERA_POR_DEFECTO;
  const candidatos = bolsa.filter((a) => colegiosConClub.has(a.colegio));
  const quedan = new Set<string>();
  if (!candidatos.length) return quedan;
  // El nivel de cada uno entre los de su categoría (de −1, el que menos vale, a 1, el que más).
  const porValor = [...bolsa].sort((x, y) => x.valor - y.valor || (x.npc.id < y.npc.id ? -1 : 1));
  const puesto = new Map(porValor.map((a, i) => [a.npc.id, porValor.length > 1 ? (2 * i) / (porValor.length - 1) - 1 : 0]));
  const sorteo = (a: Aspirante): number => rngEstable('probar-fuera', a.npc.genetica?.semilla ?? 0, a.npc.id, cat.id, dia).next();
  const p0 = new Map(candidatos.map((a) => [a.npc.id, probabilidadBase(base, (a.npc.rasgos?.caracter.ambicion ?? 0) / 50, puesto.get(a.npc.id) ?? 0)]));
  // Primera pasada, sin los amigos: quién se queda.
  const sinAmigos = new Set(candidatos.filter((a) => sorteo(a) >= (p0.get(a.npc.id) ?? 0)).map((a) => a.npc.id));
  // Segunda, con los amigos: la parte de sus compañeros de colegio y año que se quedan (sin contarlo a él).
  const grupo = new Map<string, Aspirante[]>();
  for (const a of candidatos) {
    const k = `${a.colegio}|${edadNpc(a.npc, dia) ?? -1}`;
    (grupo.get(k) ?? grupo.set(k, []).get(k)!).push(a);
  }
  for (const a of candidatos) {
    const g = grupo.get(`${a.colegio}|${edadNpc(a.npc, dia) ?? -1}`)!;
    const otros = g.length - 1;
    const amigos = otros > 0 ? g.filter((x) => x !== a && sinAmigos.has(x.npc.id)).length / otros : 1 - base;
    if (sorteo(a) >= probabilidadConAmigos(p0.get(a.npc.id) ?? 0, base, amigos)) quedan.add(a.npc.id);
  }
  return quedan;
}
