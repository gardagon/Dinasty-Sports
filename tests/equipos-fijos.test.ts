import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, rendimiento as rendimientoDeFutbol, rendimientoPorPuestos } from '@ds/mod-futbol';
import { equiposDelClub, valoracionDe, type NpcsState } from '@ds/mod-npcs';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * Los equipos se fijan para toda la temporada (decisión del usuario, 08/11/2026): el A, el B, el C y el D se forman en verano y se mantienen el curso entero; con la liga y las convocatorias de la F2
 * un jugador no puede cambiar de equipo cada semana. Se reorganizan en verano y, en el curso, solo con los ascensos decididos.
 */
const REND = new Map([['futbol', Object.assign((p: Parameters<typeof rendimientoDeFutbol>[0]) => rendimientoDeFutbol(p), { puestos: rendimientoPorPuestos })]]);

describe('los equipos A, B, C y D se mantienen durante el curso', () => {
  let g: ReturnType<typeof nuevaPartida>;
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 52 + 2, 2, 15); // el primer verano ya ha reorganizado los equipos
  });
  const estado = () => g.moduleState<NpcsState>('npcs') as NpcsState;
  const dia = () => (g.time.week - g.time.schoolWeek) * 7;
  /** A qué equipo (club, categoría y letra) pertenece cada futbolista, como lo devuelve `equiposDelClub` (la letra guardada si la hay). */
  const equipos = (recalcular = false): Map<string, string> => {
    const s = estado();
    const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
    const lista = new Map(s.npcs.map((n) => [n.id, n]));
    const val = valoracionDe(REND);
    const r = new Map<string, string>();
    for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const c of pob.categorias!.filter((x) => ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'].includes(x.id))) {
        const edades = Array.from({ length: c.edadMax - c.edadMin + 1 }, (_, i) => c.edadMin + i);
        const { equipos: eq } = equiposDelClub(lista, pob, e, { id: c.id, edades }, dia(), val, [], recalcular);
        for (const l of ['A', 'B', 'C', 'D'] as const) for (const id of eq[l]) r.set(id, `${e.club}|${c.id}|${l}`);
      }
    }
    return r;
  };

  it('en verano cada jugador guarda la letra de su equipo', () => {
    const jugadores = estado().npcs.filter((n) => n.deporte === 'futbol' && n.equipo && n.genetica);
    const conLetra = jugadores.filter((n) => n.letra?.futbol);
    expect(conLetra.length / jugadores.length).toBeGreaterThan(0.9); // los que no caben en ningún equipo por los cupos de puestos no llevan letra
  });

  it('entre dos semanas de un mismo curso, sin ascensos, nadie cambia de equipo (aunque cambie lo que vale cada uno)', () => {
    const antes = equipos();
    const valoresAntes = new Map(estado().npcs.filter((n) => n.deporte === 'futbol' && n.vp?.futbol).map((n) => [n.id, n.vp!.futbol.valor]));
    advanceToWeek(g, 'gen.descansar', 52 + 12, 2, 15); // diez semanas de entrenamiento más, del mismo curso
    const despues = equipos();
    // Lo que vale cada uno ha cambiado...
    const cambiaron = estado().npcs.filter((n) => n.deporte === 'futbol' && n.vp?.futbol && valoresAntes.has(n.id) && n.vp.futbol.valor !== valoresAntes.get(n.id)).length;
    expect(cambiaron).toBeGreaterThan(100);
    // ...pero ningún jugador cambia de equipo.
    const cambios = [...antes].filter(([id, eq]) => despues.get(id) !== undefined && despues.get(id) !== eq);
    expect(cambios).toEqual([]);
    // Y repartir de nuevo con lo que vale hoy sí movería a alguien (sin la letra guardada, los equipos cambiarían cada semana).
    const recalculado = equipos(true);
    expect([...antes].filter(([id, eq]) => recalculado.get(id) !== undefined && recalculado.get(id) !== eq).length).toBeGreaterThan(0);
  });

  it('al llegar el verano se reorganizan: los equipos se vuelven a repartir con lo que vale cada uno', () => {
    const antes = new Map(estado().npcs.filter((n) => n.deporte === 'futbol' && n.letra?.futbol).map((n) => [n.id, n.letra!.futbol]));
    advanceToWeek(g, 'gen.descansar', 2 * 52 + 2, 2, 15);
    const jugadores = estado().npcs.filter((n) => n.deporte === 'futbol' && n.equipo && n.genetica);
    expect(jugadores.filter((n) => n.letra?.futbol).length / jugadores.length).toBeGreaterThan(0.9);
    expect([...antes].filter(([id, l]) => estado().npcs.find((n) => n.id === id)?.letra?.futbol !== l).length).toBeGreaterThan(0);
  });
});
