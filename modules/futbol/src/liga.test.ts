import { describe, expect, it } from 'vitest';
import type { FormatoDeDivisiones } from '@ds/kit-deporte';
import { categoriaAcabada, cerrarTemporada, jugarSabadoDeUnaCategoria, nuevaLiga, tablasDeLaDivision, type JugarPartido, type LigaDeCategoria } from './liga';

const F: FormatoDeDivisiones = { tamano: 10, fijas: 2, grupo: { max: 12 }, suben: 2, bajan: 2, playoff: { jornadasObjetivo: 18 } };
/** `n` equipos de `clubes` clubes (el id `c3|B`: club 3, letra B), el primero el más fuerte. */
const equipos = (n: number, clubes: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i % clubes}|${'ABCD'[Math.floor(i / clubes)]}`, club: `c${i % clubes}`, fuerza: 1000 - i }));
/** Un partido sin motor: gana el de menor número de club (los primeros son los más fuertes); hay un jugador por equipo para ver quién juega. */
const jugar: JugarPartido = (_cat, local, visitante) => {
  const n = (id: string): number => Number(id.split('|')[0].slice(1)) + 'ABCD'.indexOf(id.split('|')[1]) * 0.1;
  const goles: [number, number] = n(local) < n(visitante) ? [2, 1] : n(local) > n(visitante) ? [1, 2] : [1, 1];
  return { goles, jugadores: [{ npcId: `${local}#1`, minutos: 90, valoracion: 0.5 }, { npcId: `${visitante}#1`, minutos: 90, valoracion: -0.5 }] };
};
const jugarTemporada = (l: LigaDeCategoria, curso = 1): { liga: LigaDeCategoria; semanas: number; jugadores: number } => {
  let semanas = 0;
  let jugadores = 0;
  while (!categoriaAcabada(l) && semanas < 80) {
    const r = jugarSabadoDeUnaCategoria('juvenil', l, curso, F, jugar, 1);
    l = r.liga;
    jugadores += r.jugadores.length;
    semanas++;
  }
  return { liga: l, semanas, jugadores };
};

describe('la liga de una categoría semana a semana', () => {
  it('juvenil con 34 equipos (10 + 10 + 7 + 7): la liga a doble vuelta y el playoff de la última, y acaba en el número de sábados previsto', () => {
    const liga = nuevaLiga(1, 7, { juvenil: equipos(34, 12) }, F);
    const l0 = liga.categorias.juvenil;
    expect(l0.divisiones.map((d) => d.grupos.map((g) => g.equipos.length))).toEqual([[10], [10], [7, 7]]);
    const { liga: acabada, semanas } = jugarTemporada(l0);
    // 18 jornadas (Primera y Segunda), 14 de la última (7 equipos, a doble vuelta) y después, con 14 jornadas, 4 por grupo: cuartos (2), semifinales (2) y final (1) = 19 sábados.
    expect(semanas).toBe(19);
    expect(acabada.jornada).toBe(18);
    const ultima = acabada.divisiones[2];
    expect(ultima.playoff!.plazas).toBe(4);
    expect(ultima.playoff!.campeon).toBeDefined();
    expect(ultima.playoff!.subcampeon).toBeDefined();
    expect(ultima.playoff!.clasificados).toHaveLength(8);
    // Cada equipo de la liga juega 2 × (n − 1) partidos.
    for (const g of [...acabada.divisiones[0].grupos, ...acabada.divisiones[2].grupos]) {
      const pj = new Map<number, number>();
      for (const [l, v] of g.resultados) { pj.set(l, (pj.get(l) ?? 0) + 1); pj.set(v, (pj.get(v) ?? 0) + 1); }
      for (let i = 0; i < g.equipos.length; i++) expect(pj.get(i)).toBe(2 * (g.equipos.length - 1));
    }
  });

  it('con tres grupos en la última (9, 8 y 8: 18 jornadas) el playoff es de 2 por grupo, con seis equipos: los dos mejores pasan sin jugar los cuartos', () => {
    const liga = nuevaLiga(1, 7, { juvenil: equipos(45, 15) }, F); // 10 + 10 + 25 en 3 grupos de 9, 8 y 8
    const l0 = liga.categorias.juvenil;
    expect(l0.divisiones[2].grupos).toHaveLength(3);
    const { liga: acabada } = jugarTemporada(l0);
    const po = acabada.divisiones[2].playoff!;
    expect(po.plazas).toBe(2); // el grupo de 9 tiene 18 jornadas
    expect(po.clasificados).toHaveLength(6);
    expect(po.campeon).toBeDefined();
    expect(po.eliminados.map((e) => e.ronda)).toEqual(['cuartos', 'semifinal']);
    expect(po.eliminados[0].ids).toHaveLength(2);
  });

  it('el playoff lo juegan los clasificados aunque no puedan subir, y el campeón es el ganador de la final', () => {
    const l0 = nuevaLiga(1, 7, { juvenil: equipos(34, 12) }, F).categorias.juvenil;
    const { liga: acabada } = jugarTemporada(l0);
    const po = acabada.divisiones[2].playoff!;
    expect(po.eliminados.map((e) => e.ronda)).toEqual(['cuartos', 'semifinal']);
    expect(po.eliminados[0].ids).toHaveLength(4);
    expect(po.eliminados[1].ids).toHaveLength(2);
    expect(po.clasificados.map((c) => c.id)).toContain(po.campeon!);
    expect(po.campeon).not.toBe(po.subcampeon);
  });
});

describe('el final de la temporada y la siguiente', () => {
  it('se cierra con los ascensos y descensos: los tamaños se mantienen y los finalistas del playoff suben', () => {
    const liga = nuevaLiga(1, 7, { juvenil: equipos(34, 12) }, F);
    const { liga: acabada } = jugarTemporada(liga.categorias.juvenil);
    const cerrada = cerrarTemporada({ ...liga, categorias: { juvenil: acabada } }, F, 7);
    expect(cerrada.cerrada).toBe(true);
    const sig = cerrada.siguiente!.juvenil;
    expect(sig.map((d) => d.grupos.flat().length)).toEqual([10, 10, 14]);
    expect(sig.flatMap((d) => d.grupos.flat()).sort()).toEqual(equipos(34, 12).map((e) => e.id).sort());
    const po = acabada.divisiones[2].playoff!;
    // Los dos finalistas suben a Segunda salvo que su club tenga ya otro equipo en ella: nunca quedan dos de un club en una división que no sea la última.
    for (const d of sig.slice(0, -1)) {
      const clubes = d.grupos.flat().map((id) => id.split('|')[0]);
      expect(new Set(clubes).size).toBe(clubes.length);
    }
    expect(cerrada.campeones).toHaveLength(1);
    expect(cerrada.campeones[0].divisiones[2]).toBe(po.campeon);
    expect(cerrada.campeones[0].divisiones[0]).toBe(tablasDeLaDivision(acabada.divisiones[0])[0][0].id);
  });

  it('la temporada siguiente parte de las divisiones nuevas, con los equipos que han aparecido y desaparecido', () => {
    const liga = nuevaLiga(1, 7, { juvenil: equipos(34, 12) }, F);
    const { liga: acabada } = jugarTemporada(liga.categorias.juvenil);
    const cerrada = cerrarTemporada({ ...liga, categorias: { juvenil: acabada } }, F, 7);
    const actuales = equipos(34, 12).filter((e) => e.id !== 'c0|A').concat([{ id: 'c40|A', club: 'c40', fuerza: 1 }]);
    const otra = nuevaLiga(2, cerrada.semilla, { juvenil: actuales }, F, cerrada.siguiente, cerrada.campeones);
    const ids = otra.categorias.juvenil.divisiones.flatMap((d) => d.grupos.flatMap((g) => g.equipos));
    expect(ids.sort()).toEqual(actuales.map((e) => e.id).sort());
    expect(otra.categorias.juvenil.jornada).toBe(0);
    expect(otra.categorias.juvenil.divisiones.every((d) => d.grupos.every((g) => g.resultados.length === 0))).toBe(true);
    expect(otra.campeones).toHaveLength(1);
    // Se puede jugar otra temporada entera.
    expect(jugarTemporada(otra.categorias.juvenil, 2).semanas).toBeGreaterThan(15);
  });

  it('una temporada cortada se cierra con la clasificación (sin playoff)', () => {
    const liga = nuevaLiga(1, 7, { juvenil: equipos(34, 12) }, F);
    let l = liga.categorias.juvenil;
    for (let i = 0; i < 10; i++) l = jugarSabadoDeUnaCategoria('juvenil', l, 1, F, jugar, 1).liga;
    const cerrada = cerrarTemporada({ ...liga, categorias: { juvenil: l } }, F, 7);
    expect(cerrada.siguiente!.juvenil.map((d) => d.grupos.flat().length)).toEqual([10, 10, 14]);
  });

  it('el estado es JSON serializable y pequeño', () => {
    const liga = nuevaLiga(1, 7, { juvenil: equipos(34, 12) }, F);
    const { liga: acabada } = jugarTemporada(liga.categorias.juvenil);
    const texto = JSON.stringify({ ...liga, categorias: { juvenil: acabada } });
    expect(JSON.parse(texto).categorias.juvenil.jornada).toBe(18);
    expect(texto.length).toBeLessThan(40000);
  });
});
