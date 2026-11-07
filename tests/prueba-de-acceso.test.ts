import { describe, expect, it, vi } from 'vitest';
import { RUIDO_DE_LA_PRUEBA, cuposPorGrupo, valorDeLaPrueba, type NpcDirectory } from '@ds/contracts';
import { PUESTOS_DE_FUTBOL, futbol } from '@ds/mod-futbol';
import { MODULOS, nuevaPartida } from '@ds/game';
import { advanceToWeek } from '@ds/core';
import { ofertaDePuesto, type JugadorConPuesto } from '../modules/npcs/src/puestos';
import { hacer, posible } from './ayudas';

// Estos tests crean partidas con fútbol (la ciudad de verdad cuesta varios segundos cada una): un plazo para todo el fichero, no test a test.
vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * La prueba de acceso a un club que no es el del colegio (`CIUDAD_Y_LIGAS.md` §5): lo que vale en la prueba es lo que cuenta para la regla de plaza; con hueco, se enfrenta al suplente que mejor cubriría el puesto; el personaje elige puesto y el entrenador le puede proponer otro; el profesor de Educación Física aconseja varios.
 */

const P = PUESTOS_DE_FUTBOL;
const cupos = cuposPorGrupo(P, 18);
const todosA = (v: number, extra: Record<string, number> = {}): Record<string, number> => ({ ...Object.fromEntries(P.puestos.map((p) => [p.id, v])), ...extra });
describe('lo que vale una prueba', () => {
  it('es lo que vale de verdad por cómo rinde ese día y un poco de azar: la misma cuenta para el personaje y para un niño', () => {
    expect(valorDeLaPrueba(50, 1, 0)).toBeCloseTo(50, 6);
    expect(valorDeLaPrueba(50, 0, 0)).toBeCloseTo(42.5, 6); // sin eficiencia, ×0,85
    expect(valorDeLaPrueba(50, 1, 1)).toBeCloseTo(50 * (1 + RUIDO_DE_LA_PRUEBA), 6);
    expect(valorDeLaPrueba(50, 1, -1)).toBeLessThan(50);
  });
});

describe('plaza con hueco: el candidato se enfrenta al suplente que mejor juega en el puesto, sin umbral de parecido', () => {
  const j = (id: string, puesto: string, valor: number, valores: Record<string, number> = {}): JugadorConPuesto => ({ id, nombre: id, puesto, valor, valores: { [puesto]: valor, ...valores } });
  /**
   * Un equipo con `centrales` centrales: porteros 2, laterales 3, mediocentros 4, bandas 3 y delanteros 3 (todos de 40). Con la formación (1-2-2-3-2-1) sobran un portero, un lateral, un mediocentro,
   * una banda y dos delanteros. Lo que valen de central: el lateral suplente 25, el mediocentro 20, la banda 15 y los delanteros 10 y 8 (el portero suplente, 5).
   */
  const equipo = (centrales: number, extra: JugadorConPuesto[] = []): JugadorConPuesto[] => [
    ...Array.from({ length: centrales }, (_, i) => j(`cb${i}`, 'CB', 40)),
    j('gk0', 'GK', 40), j('gkS', 'GK', 30, { CB: 5 }),
    j('lb0', 'LB', 40), j('lb1', 'LB', 39), j('lbS', 'LB', 30, { CB: 25 }),
    j('cdm0', 'CDM', 40), j('cdm1', 'CDM', 39), j('cdm2', 'CDM', 38), j('cdmS', 'CDM', 30, { CB: 20 }),
    j('lm0', 'LM', 40), j('lm1', 'LM', 39), j('lmS', 'LM', 30, { CB: 15 }),
    j('st0', 'ST', 40), j('st1', 'ST', 30, { CB: 10 }), j('st2', 'ST', 29, { CB: 8 }),
    ...extra,
  ];
  const prueba = { puesto: undefined as string | undefined };
  const oferta = (equipoDe: JugadorConPuesto[], puesto: string, valor: number, cond: { yaPasada?: boolean } | null = {}) =>
    ofertaDePuesto(equipoDe, cupos, P, todosA(1, { [puesto]: valor }), undefined, undefined, cond ? { puesto, ...cond } : undefined);
  void prueba;

  it('un hueco: se enfrenta al mejor suplente en el puesto (el lateral, 25 de central); hay que superarlo, empatar no basta', () => {
    expect(oferta(equipo(2), 'CB', 24)).toBeUndefined();
    expect(oferta(equipo(2), 'CB', 25)).toBeUndefined();
    expect(oferta(equipo(2), 'CB', 26)).toMatchObject({ puesto: 'CB', estado: 'libre' });
  });

  it('dos huecos: se enfrenta al segundo mejor suplente (el mediocentro, 20)', () => {
    expect(oferta(equipo(1), 'CB', 20)).toBeUndefined();
    expect(oferta(equipo(1), 'CB', 21)).toMatchObject({ puesto: 'CB', estado: 'libre' });
  });

  it('tres huecos: se enfrenta al tercero (la banda, 15)', () => {
    expect(oferta(equipo(0), 'CB', 15)).toBeUndefined();
    expect(oferta(equipo(0), 'CB', 16)).toMatchObject({ puesto: 'CB', estado: 'libre' });
  });

  it('más huecos que suplentes: entra', () => {
    // Un equipo pequeño con solo dos suplentes (un lateral y un mediocentro) y tres huecos de central.
    const pequeno = [j('gk0', 'GK', 40), j('lb0', 'LB', 40), j('lb1', 'LB', 39), j('lbS', 'LB', 30, { CB: 25 }), j('cdm0', 'CDM', 40), j('cdm1', 'CDM', 39), j('cdm2', 'CDM', 38), j('cdmS', 'CDM', 30, { CB: 20 }), j('lm0', 'LM', 40), j('lm1', 'LM', 39), j('st0', 'ST', 40)];
    expect(oferta(pequeno, 'CB', 1)).toMatchObject({ puesto: 'CB', estado: 'libre' });
  });

  it('portero: se enfrenta al suplente que mejor para, por poco que se parezca (sin umbral de parecido)', () => {
    const sinSegundoPortero = equipo(3).filter((x) => x.id !== 'gkS');
    // Los suplentes valen de portero: el lateral 12, el mediocentro 5, la banda 3...
    const conValoresDePortero = sinSegundoPortero.map((x) => (x.id === 'lbS' ? { ...x, valores: { ...x.valores, GK: 12 } } : x.id === 'cdmS' ? { ...x, valores: { ...x.valores, GK: 5 } } : x));
    expect(oferta(conValoresDePortero, 'GK', 12)).toBeUndefined();
    expect(oferta(conValoresDePortero, 'GK', 13)).toMatchObject({ puesto: 'GK', estado: 'libre' });
  });

  it('el máximo es un tope: con el equipo completo no se entra por hueco, hay que superar al peor del puesto', () => {
    // 18 jugadores (el equipo completo) pero con un hueco de central (2 de 3): no hay hueco que valga, hay que superar al peor central (40).
    const completo = equipo(2, [j('st3', 'ST', 20, { CB: 1 })]);
    expect(completo).toHaveLength(18);
    expect(oferta(completo, 'CB', 30)).toBeUndefined();
    expect(oferta(completo, 'CB', 41)).toMatchObject({ puesto: 'CB', estado: 'por_merito' });
  });

  it('el club del colegio (sin prueba) y quien ya pasó la prueba entran con hueco sin enfrentarse a nadie', () => {
    expect(oferta(equipo(2), 'CB', 1, null)).toMatchObject({ puesto: 'CB', estado: 'libre' });
    expect(oferta(equipo(2), 'CB', 1, { yaPasada: true })).toMatchObject({ puesto: 'CB', estado: 'libre' });
  });
});

describe('con el juego entero: la prueba del personaje, su puesto y el consejo del profesor', () => {
  const partida = () => {
    const g = nuevaPartida({ seed: 7, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 2, 17); // un miércoles de la semana 2, en pleno plazo, cuando el club mediano hace pruebas
    return g;
  };

  it('a los clubes de la zona se entra con una prueba de acceso (ya no con «Apuntarte a…»), y el del colegio sigue sin prueba', () => {
    const g = partida();
    const ids = g.preview('futbol.prueba.club_mediano');
    expect(ids).toBeDefined();
    expect(g.preview('futbol.apuntarse.club_grande')).toBeUndefined();
    expect(g.preview('futbol.prueba.colegio')).toBeUndefined();
    expect(g.preview('futbol.apuntarse_colegio')).toBeDefined();
  });

  it('elige el puesto en que quiere probar; al hacer la prueba, o entra en un puesto de la prueba o se queda sin plaza con el motivo', () => {
    const g = partida();
    expect(hacer(g, 'futbol.elegir_puesto.CB').ok).toBe(true);
    expect(g.preview('futbol.elegir_puesto.CB')!.reason).toMatch(/Ya está elegido/);
    expect(posible(g, 'futbol.prueba.club_mediano')).toBe(true);
    const r = hacer(g, 'futbol.prueba.club_mediano');
    expect(r.ok).toBe(true);
    const estado = g.moduleState<{ puesto?: string; puestoElegido?: string; pruebas?: Record<string, number>; plazasOfrecidas?: Record<string, { puesto: string }> }>('futbol');
    expect(estado.pruebas?.club_mediano).toBeDefined();
    expect(estado.puestoElegido).toBe('CB');
    const miembro = g.service<{ membership(d: string): { id: string } | undefined }>('clubes')!.membership('futbol');
    // Entra (y entonces tiene puesto, el pedido o el que le propone el entrenador) o no entra y no tiene puesto.
    if (miembro) expect(estado.puesto).toBeDefined();
    else expect(estado.puesto).toBeUndefined();
  });

  it('el profesor de Educación Física nombra varios puestos (sin cifras) y el deporte; el consejo es el mismo para el mismo día', () => {
    const g = partida();
    const dir = g.service<NpcDirectory>('npcs')!;
    const consejo = dir.consejoDeportivo?.() ?? [];
    const futbolista = consejo.find((c) => c.deporte === 'futbol');
    if (futbolista) {
      expect(futbolista.puestos.length).toBe(3);
      for (const p of futbolista.puestos) expect(P.puestos.map((x) => x.id)).toContain(p.id);
      expect(dir.consejoDeportivo!().find((c) => c.deporte === 'futbol')).toEqual(futbolista);
    }
    expect(consejo.every((c) => c.nombre.length > 0)).toBe(true);
  });
});
