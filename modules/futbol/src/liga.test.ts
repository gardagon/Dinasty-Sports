import { describe, expect, it } from 'vitest';
import type { FormatoDeDivisiones } from '@ds/kit-deporte';
import { archivarTemporada, categoriaAcabada, cerrarTemporada, jugarSabadoDeUnaCategoria, nuevaLiga, partidosDeLaSemana, tablasDeLaDivision, type JugarPartido, type LigaDeCategoria } from './liga';

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

describe('la tanda de penaltis en el playoff', () => {
  /** Todos los partidos del playoff acaban en empate: los cruces se deciden en la tanda (la gana siempre el segundo equipo del cruce, `b`, para ver que se usa). */
  const empatadora: JugarPartido = Object.assign(
    (cat: string, local: string, visitante: string, id: string) => ({ ...jugar(cat, local, visitante, id), goles: (id.includes('|PO-') ? [1, 1] : jugar(cat, local, visitante, id).goles) as [number, number] }),
    { tanda: (_c: string, _a: string, _b: string, _id: string) => ({ ganador: 1 as const, goles: [3, 4] as [number, number] }) },
  );

  it('un cruce empatado en el global (y la final) se decide por la tanda, no por el mejor sembrado', () => {
    let l = nuevaLiga(1, 7, { juvenil: equipos(34, 12) }, F).categorias.juvenil;
    for (let i = 0; i < 60 && !categoriaAcabada(l); i++) l = jugarSabadoDeUnaCategoria('juvenil', l, 1, F, empatadora, 1).liga;
    const po = l.divisiones[2].playoff!;
    expect(po.campeon).toBeDefined();
    expect(po.rondas.map((r) => r.ronda)).toEqual(['cuartos', 'semifinal', 'final']);
    for (const r of po.rondas) for (const c of r.cruces) {
      expect(c.tanda).toEqual([3, 4]);
      expect(c.pasa).toBe(c.b); // la tanda la ganó b
      expect(c.partidos.every((p) => p[0] === p[1])).toBe(true);
    }
    // El campeón es el que ganó la final en los penaltis.
    expect(po.campeon).toBe(po.rondas[2].cruces[0].b);
  });

  it('sin empate no hay tanda', () => {
    let l = nuevaLiga(1, 7, { juvenil: equipos(34, 12) }, F).categorias.juvenil;
    const sinEmpates: JugarPartido = Object.assign((c: string, a: string, b: string, id: string) => ({ ...jugar(c, a, b, id), goles: (id.includes('|PO-') ? (a < b ? [2, 0] : [0, 2]) : jugar(c, a, b, id).goles) as [number, number] }), { tanda: () => { throw new Error('no debería haber tanda'); } });
    for (let i = 0; i < 60 && !categoriaAcabada(l); i++) l = jugarSabadoDeUnaCategoria('juvenil', l, 1, F, sinEmpates, 1).liga;
    expect(l.divisiones[2].playoff!.rondas.every((r) => r.cruces.every((c) => !c.tanda))).toBe(true);
  });
});

describe('el historial de la temporada', () => {
  const cerrar = () => {
    const liga = nuevaLiga(3, 7, { juvenil: equipos(34, 12), alevin: equipos(30, 15) }, F);
    const cats = Object.fromEntries(Object.entries(liga.categorias).map(([c, l]) => [c, jugarTemporada(l).liga]));
    return { liga: { ...liga, categorias: cats }, cerrada: cerrarTemporada({ ...liga, categorias: cats }, F, 7) };
  };

  it('al cerrar se guarda la temporada entera: la clasificación de cada grupo, el playoff, los ascensos y descensos y cada partido', () => {
    const { liga, cerrada } = cerrar();
    expect(cerrada.historial).toHaveLength(1);
    const h = cerrada.historial![0];
    expect(h.curso).toBe(3);
    expect(Object.keys(h.categorias).sort()).toEqual(['alevin', 'juvenil']);
    const j = h.categorias.juvenil;
    expect(j.divisiones.map((d) => d.grupos.map((g) => g.equipos.length))).toEqual([[10], [10], [7, 7]]);
    // La clasificación: ordenada por puntos, con partidos, goles a favor y en contra que cuadran con los resultados.
    for (const d of j.divisiones) for (const g of d.grupos) {
      const puntos = g.tabla.map((f) => 3 * f[2] + f[3]);
      expect(puntos).toEqual([...puntos].sort((a, b) => b - a));
      for (const [i, pj, ga, e, pe, gf, gc] of g.tabla) {
        expect(pj).toBe(ga + e + pe);
        expect(pj).toBe(2 * (g.equipos.length - 1));
        const suyos = g.partidos.filter((p) => p[0] === i || p[1] === i);
        expect(suyos).toHaveLength(pj);
        expect(suyos.reduce((t, p) => t + (p[0] === i ? p[2] : p[3]), 0)).toBe(gf);
        expect(suyos.reduce((t, p) => t + (p[0] === i ? p[3] : p[2]), 0)).toBe(gc);
      }
      expect(g.partidos).toHaveLength(g.equipos.length * (g.equipos.length - 1));
    }
    // El playoff de la última división: sus rondas, el campeón y el subcampeón.
    const po = j.divisiones[2].playoff!;
    expect(po.rondas.map((r) => r.ronda)).toEqual(['cuartos', 'semifinal', 'final']);
    expect(po.campeon).toBe(liga.categorias.juvenil.divisiones[2].playoff!.campeon);
    expect(po.clasificados).toHaveLength(8);
    expect(j.divisiones[0].playoff).toBeUndefined();
    // Los ascensos y descensos: los que cambian de división, que cuadran con las divisiones de la temporada siguiente.
    const sig = cerrada.siguiente!.juvenil;
    for (const [id, de, a] of j.cambios) {
      expect(de).not.toBe(a);
      expect(sig[a - 1].grupos.flat()).toContain(id);
    }
    expect(j.cambios.length).toBeGreaterThanOrEqual(4);
    // Con estos equipos los candidatos de la última (los C de los clubes que tienen su B en Segunda) ceden el ascenso a los B que bajarían: solo cambian los de Primera y Segunda.
    expect(j.cambios.every(([, de, a]) => de !== 3 && a !== 3)).toBe(true);
    expect(j.cambios.some(([, de, a]) => de === 1 && a === 2)).toBe(true); // bajan de Primera
  });

  it('las temporadas se acumulan: el historial crece una temporada cada vez y no se tira', () => {
    const { cerrada } = cerrar();
    const siguiente = nuevaLiga(4, cerrada.semilla, { juvenil: equipos(34, 12), alevin: equipos(30, 15) }, F, cerrada.siguiente, cerrada.campeones);
    expect(siguiente.historial).toBeUndefined(); // nuevaLiga parte del historial que le dé quien la llama
    const otra = cerrarTemporada({ ...siguiente, historial: cerrada.historial, categorias: Object.fromEntries(Object.entries(siguiente.categorias).map(([c, l]) => [c, jugarTemporada(l, 4).liga])) }, F, 7);
    expect(otra.historial!.map((t) => t.curso)).toEqual([3, 4]);
    expect(archivarTemporada(otra, otra.siguiente!).curso).toBe(4);
  });

  it('es compacto: una temporada de dos categorías pesa pocos KB', () => {
    const { cerrada } = cerrar();
    const kb = JSON.stringify(cerrada.historial![0]).length / 1024;
    expect(kb).toBeLessThan(40);
    expect(kb).toBeGreaterThan(5);
  });
});

describe('los partidos de la semana, antes de jugarlos', () => {
  it('son los mismos (con los mismos ids) que juega el sábado: en toda la temporada, liga y playoff', () => {
    let l = nuevaLiga(1, 7, { juvenil: equipos(34, 12) }, F).categorias.juvenil;
    let sabados = 0;
    while (!categoriaAcabada(l) && sabados < 80) {
      const previstos = partidosDeLaSemana(l, F).map((p) => `1|juvenil|${p.ref}`).sort();
      const jugados: string[] = [];
      const registra: JugarPartido = Object.assign((c: string, a: string, b: string, id: string) => { jugados.push(id); return jugar(c, a, b, id); }, { tanda: (_c: string, _a: string, _b: string, _id: string) => ({ ganador: 0 as const, goles: [1, 0] as [number, number] }) });
      l = jugarSabadoDeUnaCategoria('juvenil', l, 1, F, registra, 1).liga;
      expect(jugados.sort()).toEqual(previstos);
      sabados++;
    }
    expect(categoriaAcabada(l)).toBe(true);
    // Acabada la temporada no queda nada por jugar.
    expect(partidosDeLaSemana(l, F)).toEqual([]);
  });

  it('no cambia la liga que recibe', () => {
    const l = nuevaLiga(1, 7, { juvenil: equipos(34, 12) }, F).categorias.juvenil;
    const copia = structuredClone(l);
    partidosDeLaSemana(l, F);
    expect(l).toEqual(copia);
  });
});
