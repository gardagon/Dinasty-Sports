import { beforeAll, describe, expect, it } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, SERVICES, registrarPais, type NpcDirectory } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import type { Npc, NpcsState } from '@ds/mod-npcs';
import { SEMANAS_DE_LOS_LEJANOS, historiaDeportiva, huecosDelBloque, listaDeSesion, semanaDeNino, type NinoDeportista } from '../modules/npcs/src/semana';

/**
 * Fútbol más barato (21/11/2026): la historia lejana y la pasada de los niños lejanos se calculan de una vez (fórmulas cerradas) y los niños se apuntan a su equipo en los primeros días del curso. Aquí se comprueba que lo calculado de una
 * vez se parece a lo calculado semana a semana, y que lo de apuntarse es estable y no deja a nadie fuera.
 */
describe('el fútbol más barato', () => {
  let g: ReturnType<typeof nuevaPartida>;
  let s: NpcsState;
  beforeAll(() => {
    registrarPais(PAIS_CIUDAD_DE_PRUEBA);
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    s = g.moduleState<NpcsState>('npcs');
  }, 120000);

  const pob = () => s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const jugadores = (): Npc[] => s.npcs.filter((n) => n.deporte === 'futbol' && n.hab?.futbol && n.genetica && n.nacimiento !== undefined && n.equipo);

  it('la historia de una sola vez se parece a la de bloques de 4 semanas con la caída semana a semana', () => {
    const r = pob().rutina!;
    // Sin el rendimiento de fútbol a mano se compara con la media de las habilidades.
    const f = (p: { stat(id: string): number }) => r.stats.reduce((t, d) => t + p.stat(d.id), 0) / r.stats.length;
    const lista = (semana: number, hueco: number, lector: { stat(id: string): number }) => listaDeSesion(r, (id) => lector.stat(id), ['futbol', 'club', 'sin-categoria', semana, hueco]);
    let dif = 0;
    let sesgo = 0;
    let n = 0;
    for (const j of jugadores().filter((x) => (0 - x.nacimiento!) / 365 >= 12).slice(0, 40)) {
      const nino = { ...j, cap: undefined, pico: undefined } as unknown as NinoDeportista;
      const de1 = historiaDeportiva(nino, 'futbol', r, f as never, 0, lista as never);
      const semanal = historiaDeportiva(nino, 'futbol', r, f as never, 0, lista as never, 4, false);
      dif += Math.abs(de1.nivel - semanal.nivel);
      sesgo += de1.nivel - semanal.nivel;
      n++;
    }
    expect(n).toBeGreaterThan(10);
    expect(dif / n).toBeLessThan(1); // sobre niveles de 10 a 25
    expect(Math.abs(sesgo / n)).toBeLessThan(0.7);
  });

  it(`un bloque de ${SEMANAS_DE_LOS_LEJANOS} semanas se parece a ${SEMANAS_DE_LOS_LEJANOS} semanas sueltas`, () => {
    const r = pob().rutina!;
    const f = (p: { stat(id: string): number }) => r.stats.reduce((t, d) => t + p.stat(d.id), 0) / r.stats.length;
    const lista = (semana: number, hueco: number, lector: { stat(id: string): number }) => listaDeSesion(r, (id) => lector.stat(id), ['futbol', 'club', 'sin-categoria', semana, hueco]);
    const fin = 7 * 30;
    let sesgo = 0;
    let dif = 0;
    let n = 0;
    for (const j of jugadores().slice(0, 40)) {
      const copia = (): NinoDeportista => ({ ...j, cap: [...j.cap!], pico: [...j.pico!], hab: { futbol: { v: [...j.hab!.futbol.v], pico: [...j.hab!.futbol.pico], ult: [...j.hab!.futbol.ult] } }, capUlt: j.capUlt ? [...j.capUlt] : undefined }) as unknown as NinoDeportista;
      let w = copia();
      let ultimo!: ReturnType<typeof semanaDeNino>;
      for (let k = SEMANAS_DE_LOS_LEJANOS - 1; k >= 0; k--) {
        ultimo = semanaDeNino(w, 'futbol', r, f as never, fin - 7 * k, lista as never, { baja: false, eficiencia: 1 });
        w = { ...w, cap: ultimo.cap, pico: ultimo.pico, capUlt: ultimo.capUlt, hab: { futbol: ultimo.hab } } as NinoDeportista;
      }
      const b = copia();
      const bloque = semanaDeNino(b, 'futbol', r, f as never, fin, lista as never, { baja: false, eficiencia: 1 }, huecosDelBloque(b, 'futbol', r, fin, SEMANAS_DE_LOS_LEJANOS));
      dif += Math.abs(bloque.nivel - ultimo.nivel);
      sesgo += bloque.nivel - ultimo.nivel;
      n++;
    }
    expect(dif / n).toBeLessThan(0.5);
    expect(Math.abs(sesgo / n)).toBeLessThan(0.3);
  });

  it('cada niño con equipo tiene su día para apuntarse, entre el segundo y el séptimo del curso, y ninguno falta cuando acaba la primera semana', () => {
    const dias = jugadores().map((n) => n.apuntado);
    expect(dias.every((d) => d !== undefined && d >= 1 && d <= 6)).toBe(true);
    for (let d = 1; d <= 6; d++) expect(dias.filter((x) => x === d).length).toBeGreaterThan(0);
  });

  it('la plantilla de un equipo solo enseña a los ya apuntados y el primer día no hay nadie', () => {
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const equipos = dir.equiposDeLaCategoria!('futbol', 'benjamin');
    // El primer día de clase (día 0) los equipos aún no tienen jugadores apuntados.
    expect(g.time.day).toBe(0);
    const nombres = new Set(jugadores().filter((n) => n.apuntado === 0).map((n) => n.id));
    expect(nombres.size).toBe(0);
    expect(equipos.length).toBe(0);
  });
});
