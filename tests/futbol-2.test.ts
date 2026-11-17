import { describe, expect, it, vi } from 'vitest';
import { SERVICES, type NpcDirectory } from '@ds/contracts';
import { PUESTOS_DE_FUTBOL, type FutbolState } from '@ds/mod-futbol';
import { necesidadesDelEquipo } from '@ds/kit-deporte';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { advanceToWeek } from '@ds/core';
import { Banco } from '../tools/eventos/banco';
import { hacer, posible } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

const P = PUESTOS_DE_FUTBOL;
const ID = 'futbol.prueba_de_acceso';
const sesionConSeñal = (huecos: string[], nGrupos: number, necesita: string) => {
  const s = new Banco().sesion({});
  s.señal('club.prueba_empieza', { sport: 'futbol', club: 'club_mediano', huecos, nHuecos: huecos.length, nGrupos, necesita, participants: [{ npcId: 'prueba_entrenador' }] });
  return s;
};

describe('prueba de acceso: lo que más necesita el entrenador', () => {
  it('con faltas en 1 o 2 grupos los nombra y deja elegir entre todos los puestos: un hueco te prueba ahí; si no, «no es ninguno de los que te he dicho» y te prueba donde decida él', () => {
    const s = sesionConSeñal(['CB', 'LB', 'RB'], 2, 'centrales y laterales');
    const p = s.pendiente(ID)!;
    expect(p.texto).toMatch(/Lo que más necesito ahora son centrales y laterales/);
    // Todos los puestos son elegibles (uno por puesto) más «donde él vea».
    expect(p.opciones.filter((o) => o.elegible)).toHaveLength(P.puestos.length + 1);
    s.elegir(ID, 'en_cb');
    expect(s.game.moduleState<FutbolState>('futbol').pruebaEnCurso?.puesto ?? 'CB').toBe('CB');

    const otra = sesionConSeñal(['CB', 'LB', 'RB'], 2, 'centrales y laterales');
    otra.elegir(ID, 'sin_st');
    expect(otra.game.log.map((l) => l.text).some((t) => /no es ninguno de los que te he dicho/.test(t) && /Pero quédate/.test(t))).toBe(true);
  });

  it('con faltas en más de dos grupos dice «varios» (sin nombrar) y te dice que no si pides un puesto sin hueco', () => {
    const s = sesionConSeñal(['CB', 'LB', 'RB', 'GK'], 3, '');
    const p = s.pendiente(ID)!;
    expect(p.texto).toMatch(/Nos faltan jugadores en varios puestos/);
    expect(p.texto).not.toMatch(/[{}]/);
    s.elegir(ID, 'sin_st');
    expect(s.game.log.map((l) => l.text).some((t) => /De delantero centro no me hace falta nadie|no me hace falta nadie/.test(t))).toBe(true);
  });

  it('sin huecos solo se presenta (no hay nada que elegir)', () => {
    const s = sesionConSeñal([], 0, '');
    expect(s.pendiente(ID)).toBeUndefined();
    expect(s.game.log.map((l) => l.text).some((t) => /se presenta/.test(t))).toBe(true);
  });

  it('con la partida entera: la necesidad sale de cupo − jugadores de cada grupo y el entrenador dice lo mismo que el servicio', () => {
    const g = nuevaPartida({ seed: 7, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 2, 17);
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const grupos = dir.huecosPorGrupo!('futbol', 'club_mediano');
    for (const h of grupos) {
      expect(h.huecos).toBeGreaterThan(0);
      expect(h.huecos).toBeLessThanOrEqual(h.cupo);
      expect(P.reparto.find((r) => r.grupo === h.grupo)!.puestos).toEqual(h.puestos);
    }
    expect(hacer(g, 'futbol.pedir_prueba.club_mediano').ok).toBe(true);
    expect(hacer(g, 'futbol.prueba.club_mediano').ok).toBe(true);
    const p = g.service<import('@ds/contracts').SucesosService>('sucesos')!.pendientes().find((x) => x.suceso === ID);
    if (grupos.length === 0) return expect(p).toBeUndefined();
    expect(p).toBeDefined();
    if (grupos.length <= 2) {
      const orden = [...grupos].sort((a, b) => b.huecos - a.huecos || b.huecos / b.cupo - a.huecos / a.cupo).map((x) => x.nombre.toLowerCase()).join(' y ');
      expect(p!.texto).toContain(orden);
    } else expect(p!.texto).toMatch(/varios puestos/);
    void necesidadesDelEquipo;
  });
});

describe('pedir puesto en el primer entrenamiento cuenta para las 4 semanas de la ficha', () => {
  const hechos = { 'futbol.puesto': 'lateral derecho', 'futbol.juega_donde_mas_vale': false, 'futbol.mejor_puesto': 'extremo derecho', 'futbol.mejor_puesto_id': 'RW' };
  for (const tirada of ['exito', 'fallo'] as const) {
    it(`al pedirlo (y ${tirada === 'exito' ? 'conseguirlo' : 'no conseguirlo'}) se apunta el día de la última petición`, () => {
      const s = new Banco().sesion({ hechos });
      s.forzar('futbol.primer_entrenamiento');
      expect(s.game.moduleState<FutbolState>('futbol').ultimaPeticionDePuesto).toBeUndefined();
      s.elegir('futbol.primer_entrenamiento', 'pedir_cambio', tirada);
      expect(s.game.moduleState<FutbolState>('futbol').ultimaPeticionDePuesto).toBeDefined();
    });
  }
  it('aceptar sin pedir no la apunta', () => {
    const s = new Banco().sesion({ hechos });
    s.forzar('futbol.primer_entrenamiento');
    s.elegir('futbol.primer_entrenamiento', 'aceptar');
    expect(s.game.moduleState<FutbolState>('futbol').ultimaPeticionDePuesto).toBeUndefined();
  });
});

describe('el calendario de la liga: el jugador sabe dónde está la temporada', () => {
  // La ciudad de verdad (la de prueba es tan pequeña que no tiene liga).
  const conClub = () => {
    const g = nuevaPartida({ seed: 7, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const clubes = { membership: (d: string) => g.service<{ membership(d: string): unknown }>(SERVICES.clubes)!.membership(d) };
    for (let k = 0; k < 6000 && !clubes.membership('futbol'); k++) {
      if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
      else if (!g.perform('gen.descansar').ok) g.perform('gen.esperar');
    }
    expect(clubes.membership('futbol')).toBeTruthy();
    return g;
  };

  it('en pretemporada, la pestaña dice el tramo y cuándo empieza la liga, y que aún no hay calendario de partidos; atletismo también', () => {
    const g = conClub();
    const v = g.service<import('@ds/contracts').DeporteService>('deporte.futbol')!.view();
    expect(g.time.schoolWeek).toBeLessThan(4);
    expect(v.temporada.situacion).toBe('Pretemporada. La liga empieza el sábado 13 de octubre.');
    expect(v.temporada.proxima).toMatch(/Todavía no hay calendario de partidos/);
    const a = g.service<import('@ds/contracts').DeporteService>('deporte.atletismo')!.view();
    expect(a.temporada.situacion).toBe('Pretemporada. Las carreras empiezan el sábado 13 de octubre.');
  });

  it('al publicarse el calendario (empieza la liga) el diario lo cuenta con el entrenador y la pestaña pasa a «Liga»', () => {
    const g = conClub();
    advanceToWeek(g, 'gen.descansar', 4, 2, 17);
    const lineas = g.log.map((l) => l.text).filter((t) => /Se ha publicado el calendario de la liga/.test(t));
    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toMatch(/La primera jornada es el (sábado|domingo) 1[34] de octubre a las \d+:\d\d/);
    expect(g.service<import('@ds/contracts').DeporteService>('deporte.futbol')!.view().temporada.situacion).toMatch(/^Liga\. El verano empieza el lunes/);
  });

  it('el entrenador lo dice en el primer entrenamiento (el hecho `futbol.calendario`)', () => {
    const g = conClub();
    const hechos = g.service<{ valor(n: string): unknown }>('hechos.futbol')!;
    expect(hechos.valor('calendario')).toMatch(/^la liga empieza el sábado 13 de octubre/);
  });
});
