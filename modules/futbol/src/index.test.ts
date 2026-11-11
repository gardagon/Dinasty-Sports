import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GEN, validarDatosDeDeporte, type DeporteService } from '@ds/contracts';
import { Game, advanceTo } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { DATOS_FUTBOL, HABILIDADES_DE_FUTBOL, STATS_DE_FUTBOL, futbol } from './index';

const nueva = () => Game.create([personaje, futbol], { seed: 5 });

/** Las 28 habilidades entrenables del addon 2.1 y su id en el juego (en español). */
const DEL_ADDON: Record<string, string> = {
  passing: 'pase', first_touch: 'control', dribbling: 'regate', finishing: 'definicion', technique: 'tecnica', crossing: 'centros', heading: 'cabeza',
  marking: 'marcaje', tackling: 'entrada', long_shots: 'disparo_lejano', free_kick_taking: 'faltas', penalty_taking: 'penaltis', corners: 'corners',
  long_throws: 'saque_banda', game_vision: 'vision', positioning: 'posicionamiento', off_the_ball: 'desmarque', anticipation: 'anticipacion',
  decisions: 'decisiones', composure: 'sangre_fria', acceleration: 'arrancada', jumping: 'salto', reflexes: 'reflejos', one_on_ones: 'mano_a_mano',
  handling: 'blocaje', kicking: 'despeje', aerial_reach: 'alcance_aereo', command_of_area: 'dominio_area',
};

describe('módulo fútbol, solo con gen', () => {
  it('carga con el módulo base y nada más', () => {
    const g = nueva();
    expect(g.registry.moduleIds.has('futbol')).toBe(true);
    expect(g.registry.moduleIds.has('npcs')).toBe(false);
  });

  it('tiene las 29 habilidades entrenables más el conocimiento, todas con prefijo del módulo', () => {
    expect(HABILIDADES_DE_FUTBOL).toHaveLength(29);
    expect(new Set(HABILIDADES_DE_FUTBOL).size).toBe(29);
    expect(STATS_DE_FUTBOL).toHaveLength(30);
    for (const s of STATS_DE_FUTBOL) expect(s.id.startsWith('futbol.')).toBe(true);
    const g = nueva();
    for (const id of HABILIDADES_DE_FUTBOL) expect(g.registry.stats.has(id)).toBe(true);
    expect(g.registry.stats.has('futbol.conocimiento')).toBe(true);
  });

  it('cubre las 28 habilidades entrenables del addon (docs/diseno) con ids en español, y añade juego colectivo', () => {
    const addon = JSON.parse(readFileSync(join(__dirname, '../../../docs/diseno/addon_futbol_v2.1.json'), 'utf8'));
    const ids = ['field_trainable', 'mental_trainable', 'physical_trainable', 'goalkeeper_trainable'].flatMap((k) => addon.technical_stats[k].map((x: { id: string }) => x.id));
    expect(ids).toHaveLength(28);
    expect(ids.filter((i) => !DEL_ADDON[i])).toEqual([]);
    for (const i of ids) expect(HABILIDADES_DE_FUTBOL).toContain(`futbol.${DEL_ADDON[i]}`);
    expect(HABILIDADES_DE_FUTBOL).toContain('futbol.juego_colectivo');
  });

  it('cada habilidad se apoya en sus secundarias del addon; el juego colectivo, en la cooperación', () => {
    const apoyos = (id: string) => (STATS_DE_FUTBOL.find((s) => s.id === id)!.growth!.speedFrom ?? []).map((a) => a.stat);
    expect(apoyos('futbol.control')).toEqual(expect.arrayContaining([GEN.coordinacion, GEN.atencion, GEN.agilidad]));
    expect(apoyos('futbol.pase')).toEqual(expect.arrayContaining([GEN.atencion, 'futbol.vision', GEN.inteligencia]));
    expect(apoyos('futbol.juego_colectivo')).toEqual(expect.arrayContaining([GEN.cooperacion, GEN.comunicacion, GEN.autoridad]));
    expect(apoyos('futbol.penaltis')).toEqual(expect.arrayContaining(['futbol.sangre_fria', 'futbol.tecnica']));
  });

  it('el tope de cada habilidad sale solo de genéricas', () => {
    for (const s of STATS_DE_FUTBOL.filter((x) => x.category === 'habilidad')) {
      for (const d of s.genetics!.derivedFrom!) expect(d.stat.startsWith('gen.')).toBe(true);
    }
  });

  it('el conocimiento arranca en 0, es un bonus/malus (no una habilidad) y sube viendo fútbol', () => {
    const g = nueva();
    expect(g.stat('futbol.conocimiento')).toBe(0);
    advanceTo(g, 'gen.descansar', 5, 15);
    expect(g.preview('futbol.balon')!.modifiers.some((m) => m.id === 'futbol.conocimiento')).toBe(true);
    expect(g.perform('futbol.ver_tele').ok).toBe(true);
    expect(g.stat('futbol.conocimiento')).toBeGreaterThan(0);
    expect(g.preview('futbol.ver_tele')!.available).toBe(false);
  });

  it('entrenar por libre sube las habilidades de cada entreno, rinde menos que el club y solo en horario', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 0, 10);
    expect(g.preview('futbol.balon')!.available).toBe(false); // lunes en clase
    advanceTo(g, 'gen.descansar', 5, 10);
    const antes = { control: g.stat('futbol.control'), tiro: g.stat('futbol.definicion'), arrancada: g.stat('futbol.arrancada'), reflejos: g.stat('futbol.reflejos') };
    expect(g.preview('futbol.balon')!.modifiers.some((m) => m.id === 'futbol.por_tu_cuenta')).toBe(true);
    expect(g.perform('futbol.balon').ok).toBe(true);
    expect(g.perform('futbol.tiro').ok).toBe(true);
    expect(g.perform('futbol.fisico').ok).toBe(true);
    expect(g.perform('futbol.porteria').ok).toBe(true);
    expect(g.stat('futbol.control')).toBeGreaterThan(antes.control);
    expect(g.stat('futbol.definicion')).toBeGreaterThan(antes.tiro);
    expect(g.stat('futbol.arrancada')).toBeGreaterThan(antes.arrancada);
    expect(g.stat('futbol.reflejos')).toBeGreaterThan(antes.reflejos);
  });

  it('la tercera sesión del día sufre sobrecarga', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 8);
    g.perform('futbol.balon');
    g.perform('futbol.balon');
    expect(g.preview('futbol.balon')!.modifiers.some((m) => m.id === 'futbol.sobrecarga')).toBe(true);
  });

  it('sin club no hay sesión del club ni dejarlo; la pestaña está desactivada', () => {
    const g = nueva();
    expect(g.preview('futbol.club_sesion')!.available).toBe(false);
    expect(g.preview('futbol.dejar_club')!.available).toBe(false);
    const v = g.service<DeporteService>('deporte.futbol')!.view();
    expect(v.inactivo).toBeTruthy();
    expect(v.temporada.nombreDePruebas).toBe('Partidos');
    expect(v.habilidades).toHaveLength(30);
  });
});

describe('datos del fútbol', () => {
  it('son válidos, de equipo y con fútbol 11 y liga a doble vuelta', () => {
    expect(validarDatosDeDeporte(DATOS_FUTBOL)).toEqual([]);
    const es = DATOS_FUTBOL.paises.espana;
    expect(es.temporada.liga).toEqual({ vueltas: 2, equiposPorCategoria: { min: 6, max: 7 }, divisiones: { tamano: 10, fijas: 2, grupo: { max: 12 }, suben: 2, bajan: 2, playoff: { jornadasObjetivo: 18 } } });
    expect(es.categorias.map((c) => c.id)).toEqual(['prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil', 'senior']);
    expect(es.competiciones.jornada.dias).toEqual([5, 6]); // sábados y domingos
    expect(es.competiciones.jornada.calendario).toEqual({ franjas: [9, 11, 13, 16, 18], dias: [{ dia: 5, categorias: ['benjamin', 'alevin', 'infantil'] }, { dia: 6, categorias: ['juvenil'] }], siCabe: [{ categoria: 'cadete', dia: 5, siNoCabe: 6 }] });
    // El validador rechaza un calendario mal hecho.
    const mal = structuredClone(DATOS_FUTBOL);
    mal.paises.espana.competiciones.jornada.calendario = { franjas: [9, 30], dias: [] } as never;
    expect(validarDatosDeDeporte(mal).join(' ')).toMatch(/calendario/);
  });
});
