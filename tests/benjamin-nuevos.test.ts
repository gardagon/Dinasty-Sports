import { describe, expect, it, vi } from 'vitest';
import { SERVICES, claveDeDeporte, type DeporteService, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, paraConvocar, convocarYAlinear, type FutbolState } from '@ds/mod-futbol';
import { asistenciaDeLasDosUltimasSemanas, entrenadorDelEquipo, plantillaDeUnEquipo, type NpcsState } from '@ds/mod-npcs';
import { hacer, posible } from './ayudas';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });

/**
 * En benjamín todos los niños son nuevos en el club (decisión del usuario, 12/11/2026): se asignan a su equipo al crear la partida, pero su asistencia y su relación con el entrenador empiezan a contar en el primer entrenamiento
 * de la temporada, para todos (PNJ y personaje). Antes no hay asistencia «heredada» de lo que hacían antes de la temporada ni relación. En el resto de categorías el club ya conoce a sus jugadores y traen su asistencia.
 */
describe('benjamín: todos nuevos en el club', () => {
  const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const cat = (id: string) => pob.categorias!.find((c) => c.id === id)!;
  const plantilla = (categoria: string, semana: number, npcs = s.npcs) => plantillaDeUnEquipo(npcs, [pob], 'futbol', 'club_grande', categoria, 'A', 0, semana);

  it('el dato está en la categoría: solo benjamín llega nueva al club', () => {
    expect(pob.categorias!.filter((c) => c.nuevosEnElClub).map((c) => c.id)).toEqual(['benjamin']);
  });

  it('antes del primer entrenamiento nadie tiene asistencia (sin penalización) ni relación; el resto de categorías traen la suya', () => {
    const antes = plantilla('benjamin', -1);
    expect(antes.length).toBeGreaterThanOrEqual(14);
    expect(antes.every((j) => j.asistencia === 1 && j.relacionConElEntrenador === undefined)).toBe(true);
    // Un alevín en la misma fecha trae las faltas de las dos semanas anteriores.
    expect(plantilla('alevin', -1).some((j) => j.asistencia < 1)).toBe(true);
  });

  it('la primera semana solo cuenta lo de esta temporada, y desde la segunda las dos últimas semanas, como siempre', () => {
    const rutina = pob.rutina!;
    const primera = plantilla('benjamin', 0);
    // La asistencia de una sola semana (la primera cuenta desde ella misma): la de las dos primeras semanas es su media.
    const una = (id: string, w: number) => asistenciaDeLasDosUltimasSemanas(s.npcs.find((x) => x.id === id)! as never, 'futbol', rutina, w, w);
    for (const j of primera) expect(j.asistencia).toBeCloseTo(una(j.id, 0), 10);
    expect(primera.some((j) => j.asistencia < 1)).toBe(true);
    for (const j of plantilla('benjamin', 1)) expect(j.asistencia).toBeCloseTo((una(j.id, 0) + una(j.id, 1)) / 2, 10);
    for (const j of plantilla('benjamin', 3)) {
      const n = s.npcs.find((x) => x.id === j.id)!;
      expect(j.asistencia).toBeCloseTo(asistenciaDeLasDosUltimasSemanas(n as never, 'futbol', rutina, 3), 10);
    }
  });

  it('la relación con el entrenador no cuenta hasta el primer entrenamiento y después sí; en las demás categorías cuenta siempre', () => {
    for (const [categoria, antesCuenta] of [['benjamin', false], ['infantil', true]] as const) {
      const entrenador = entrenadorDelEquipo(s.npcs, pob, 'club_grande', cat(categoria), 'A')!;
      const base = plantilla(categoria, 4);
      const elegido = base[0].id;
      const npcs = s.npcs.map((n) => (n.id === elegido ? { ...n, afin: { [entrenador.id]: [40, 20] as [number, number] } } : n));
      const con = (semana: number) => plantilla(categoria, semana, npcs).find((j) => j.id === elegido)!.relacionConElEntrenador;
      expect(con(-1) !== undefined, `${categoria} antes del primer entrenamiento`).toBe(antesCuenta);
      expect(con(4), `${categoria} con la temporada en marcha`).toBeCloseTo((40 + 100) / 2, 10);
    }
  });

  it('el primer partido de benjamín es 4 semanas después del primer entrenamiento y la primera convocatoria sale de lo mismo para todos: valor y asistencia de esta temporada, sin relación', () => {
    advanceToWeek(g, 'gen.descansar', 0, 2, 9);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    // Sin partidos en las 4 primeras semanas (pretemporada de entrenamientos) y con ellos desde la quinta.
    const e = dir.equipoDelPersonaje!('futbol')!;
    expect(e.categoria).toBe('benjamin');
    advanceToWeek(g, 'gen.descansar', 4, 5, 8);
    const jugadores = dir.plantillaDelEquipo!('futbol', e.club, e.categoria, e.letra);
    // Todos en igualdad: ninguno trae relación y las asistencias son las de las semanas 2 y 3.
    expect(jugadores.every((j) => j.relacionConElEntrenador === undefined)).toBe(true);
    const c = convocarYAlinear(jugadores.map((j) => paraConvocar(j)));
    const citados = new Set([...c.titulares, ...c.suplentes].map((x) => x.id));
    expect(citados.size).toBe(Math.min(16, jugadores.length));
    // Con la misma asistencia, el que vale más es el que sale: el entrenador no tiene aún a nadie «de su cuerda».
    const mediaValor = (ids: Iterable<string>) => [...ids].reduce((t, id) => t + jugadores.find((j) => j.id === id)!.valor, 0) / [...ids].length;
    const fuera = jugadores.filter((j) => !citados.has(j.id)).map((j) => j.id);
    if (fuera.length) expect(mediaValor(citados)).toBeGreaterThanOrEqual(mediaValor(fuera));
    // El personaje que ha ido a los entrenamientos de la temporada (todos los de las 4 semanas) entra en igualdad con los demás: su asistencia es 1 y su relación no pesa aún, así que es convocado.
    const f = g.moduleState<FutbolState>('futbol') as FutbolState;
    f.sesiones = Object.fromEntries([0, 1, 2, 3, 4].map((w) => [w, 2]));
    const papel = String(g.service<DeporteService>(claveDeDeporte('futbol'))!.view().secciones!.find((x) => x.titulo === 'Próximo partido')?.tabla?.rows.find(([k]) => k === 'Tu papel (hoy)')?.[1]);
    expect(papel).toMatch(/^Convocado/);
  });
});
