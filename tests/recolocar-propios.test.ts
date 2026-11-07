import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cuposPorGrupo, grupoDePuesto } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PUESTOS_DE_FUTBOL, futbol, rendimientoPorPuestos, rendimiento as rendimientoDeFutbol } from '@ds/mod-futbol';
import { capacidadDe, edadNpc, recolocarPropios, valoracionDe, type MercadoDeFichajes, type NpcsState } from '@ds/mod-npcs';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * Al empezar el curso el entrenador recoloca primero a sus propios jugadores (`CIUDAD_Y_LIGAS.md` §5): los que suben de categoría descompensan los grupos (seis delanteros y un central) y el equipo
 * puede pasarse de su máximo. Los que sobran pasan a los puestos que faltan si lo aceptan por su carácter; lo que siga sobrando busca club. El máximo es un tope.
 */
const REND = new Map([['futbol', Object.assign((p: Parameters<typeof rendimientoDeFutbol>[0]) => rendimientoDeFutbol(p), { puestos: rendimientoPorPuestos })]]);
const P = PUESTOS_DE_FUTBOL;

describe('el entrenador recoloca a los suyos al empezar el curso', () => {
  let g: ReturnType<typeof nuevaPartida>;
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  });
  const estado = () => g.moduleState<NpcsState>('npcs') as NpcsState;

  it('un equipo descompensado y pasado de su máximo queda dentro de él: algunos cambian de puesto y los que sobran salen a buscar club', () => {
    const pob = estado().poblaciones!.find((p) => p.deporte === 'futbol')!;
    const e = pob.equipos.find((x) => x.club === 'club_mediano')!;
    const cat = pob.categorias!.find((c) => c.id === 'infantil')!;
    const max = capacidadDe(e, cat.id);
    const cupos = cuposPorGrupo(P, max);
    const delEquipo = estado().npcs.filter((n) => n.deporte === 'futbol' && n.equipo === 'club_mediano' && (edadNpc(n, 0) ?? -1) >= cat.edadMin && (edadNpc(n, 0) ?? -1) <= cat.edadMax);
    expect(delEquipo.length).toBeGreaterThan(8);
    // Todos delanteros (y cuatro más de fuera de la categoría, que no cuentan): seis veces el cupo de delanteros.
    const lista = new Map(estado().npcs.map((n) => [n.id, delEquipo.some((d) => d.id === n.id) ? { ...n, puesto: { futbol: 'ST' } } : n]));
    // Se llena por encima del máximo con niños de la categoría de otros clubes llevados a este.
    const otros = estado().npcs.filter((n) => n.deporte === 'futbol' && n.equipo !== 'club_mediano' && n.genetica && (edadNpc(n, 0) ?? -1) >= cat.edadMin && (edadNpc(n, 0) ?? -1) <= cat.edadMax).slice(0, Math.max(0, max + 4 - delEquipo.length));
    for (const n of otros) lista.set(n.id, { ...n, equipo: 'club_mediano', puesto: { futbol: 'ST' } });
    const m: MercadoDeFichajes = { lista, pobs: [pob], dia: 0, val: valoracionDe(REND), reservas: new Map() };
    const enEquipo = () => [...m.lista.values()].filter((n) => n.deporte === 'futbol' && n.equipo === 'club_mediano' && (edadNpc(n, 0) ?? -1) >= cat.edadMin && (edadNpc(n, 0) ?? -1) <= cat.edadMax);
    const antes = enEquipo().length;
    expect(antes).toBeGreaterThan(max);
    expect(enEquipo().filter((n) => grupoDePuesto(P, n.puesto!.futbol) === 'delantero').length).toBe(antes);

    const desplazados = recolocarPropios(m);

    const despues = enEquipo();
    expect(despues.length).toBeLessThanOrEqual(max); // el máximo es un tope
    expect(antes - despues.length).toBe(desplazados.length); // lo que sobraba sale a buscar club
    for (const d of desplazados) expect(m.lista.get(d.id)!.deporte).toBeUndefined();
    // Algunos delanteros se recolocaron en puestos que faltaban (según lo que valen y su carácter).
    const delanteros = despues.filter((n) => grupoDePuesto(P, n.puesto!.futbol) === 'delantero').length;
    expect(delanteros).toBeLessThan(despues.length);
    // Y lo que sobra de un grupo nunca supera su cupo más de lo que ya sobraba: nadie se añade a un grupo lleno.
    for (const grupo of P.reparto.map((r) => r.grupo).filter((x) => x !== 'delantero')) expect(despues.filter((n) => grupoDePuesto(P, n.puesto!.futbol) === grupo).length).toBeLessThanOrEqual(cupos[grupo]);
  });
});
