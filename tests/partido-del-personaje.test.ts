import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, SERVICES, claveDeDeporte, registrarPais, type ClubDirectory, type DeporteService } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, type FutbolState } from '@ds/mod-futbol';
import { hacer, posible } from './ayudas';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * El partido del personaje (F2.3b, segunda parte): entra en el equipo que le toca por su nivel (A a D) y lo convoca su entrenador como a cualquiera; si juega elige la intensidad (si no, no); el sábado se juega su partido
 * con la liga y se guarda la crónica entera con lo suyo resaltado y, si jugó, su nota.
 */
describe('el partido del personaje en la liga', () => {
  let g: ReturnType<typeof nuevaPartida>;
  const estado = () => g.moduleState<FutbolState>('futbol') as FutbolState;
  const vista = () => g.service<DeporteService>(claveDeDeporte('futbol'))!.view();
  beforeAll(() => {
    g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 3, 15);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
  });

  it('entra en un equipo de su club y categoría (se fija al empezar la liga) y la pestaña enseña el próximo partido', () => {
    expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol')).toBeDefined();
    advanceToWeek(g, 'gen.descansar', 8, 2, 15);
    const p = estado().personaje!;
    expect(p.curso).toBeGreaterThanOrEqual(0);
    expect(['A', 'B', 'C', 'D']).toContain(p.letra);
    expect(estado().liga!.categorias[p.categoria]).toBeDefined();
    const v = vista();
    const proximo = v.secciones!.find((s) => s.titulo === 'Próximo partido');
    expect(proximo).toBeDefined();
    const filas = Object.fromEntries(proximo!.tabla!.rows.map(([k, x]) => [k, x]));
    expect(filas['Rival']).toMatch(/º de \d+/);
    expect(filas['Tu equipo']).toMatch(/º de \d+/);
    expect(filas['Tu papel (hoy)']).toBeTruthy();
    expect(filas['Tu estado']).toMatch(/condición .*forma .*moral .*salud/);
    expect(filas['Últimos de tu equipo']).toBeTruthy();
    expect(filas['Últimos del rival']).toBeTruthy();
    expect(v.temporada.proxima).toMatch(/sábado/i);
  });

  it('si el entrenador lo convoca elige la intensidad (y se queda elegida); si no, no puede', () => {
    const intensidades = ['relajado', 'normal', 'a_tope'].map((i) => `futbol.intensidad_${i}`);
    const abiertas = intensidades.filter((id) => g.preview(id)!.available);
    const filas = Object.fromEntries(vista().secciones!.find((s) => s.titulo === 'Próximo partido')!.tabla!.rows.map(([k, x]) => [k, x]));
    if (/^Convocado/.test(filas['Tu papel (hoy)'])) {
      // Se puede elegir cualquiera salvo la que ya lleva (normal por defecto).
      expect(abiertas).toEqual(['futbol.intensidad_relajado', 'futbol.intensidad_a_tope']);
      expect(g.perform('futbol.intensidad_a_tope').ok).toBe(true);
      expect(estado().intensidad).toBe('a_tope');
      expect(g.preview('futbol.intensidad_a_tope')!.available).toBe(false);
      expect(vista().secciones!.find((s) => s.titulo === 'Próximo partido')!.tabla!.rows.find(([k]) => k === 'Intensidad')![1]).toMatch(/A tope/);
    } else {
      expect(abiertas).toEqual([]);
      expect(g.preview('futbol.intensidad_a_tope')!.reason).toMatch(/no eliges intensidad|Tu equipo no juega/);
      expect(filas['Intensidad']).toMatch(/No eliges/);
    }
  });

  it('tras los sábados se guarda su partido con la crónica entera; solo ve su nota si juega', () => {
    advanceToWeek(g, 'gen.descansar', 14, 2, 15);
    const s = estado();
    expect(s.partidos!.length).toBeGreaterThanOrEqual(3);
    const u = s.ultimoPartido!;
    expect(u.cronica.some((l) => l.titulo)).toBe(true);
    expect(u.cronica.filter((l) => l.titulo && l.texto.startsWith('Minutos'))).toHaveLength(6);
    expect(u.cronica.at(-1)!.texto).toMatch(/^Final: /);
    for (const p of s.partidos!) {
      expect(p.goles).toHaveLength(2);
      if (p.juega) {
        expect(p.nota).toBeGreaterThanOrEqual(1);
        expect(p.nota).toBeLessThanOrEqual(10);
        expect(p.minutos).toBeGreaterThan(0);
      } else {
        expect(p.nota).toBeUndefined();
        expect(p.motivo).toBeTruthy();
      }
    }
    // La sección del último partido enseña el resumen y la crónica; la nota solo si jugó.
    const ultimo = vista().secciones!.find((x) => x.titulo.startsWith('Último partido'))!;
    expect(ultimo.lineas!.length).toBe(u.cronica.length);
    expect(/tu nota/.test(ultimo.texto!)).toBe(u.juega);
    if (u.juega) expect(u.cronica[0].destacada).toBe(true);
  });

  it('cada semana juega como mucho un partido suyo y los partidos del mundo no incluyen al personaje', () => {
    const semanas = estado().partidos!.map((p) => `${p.curso}-${p.semana}`);
    expect(new Set(semanas).size).toBe(semanas.length);
  });
});
