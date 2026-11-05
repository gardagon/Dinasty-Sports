import { describe, expect, it } from 'vitest';
import { RUIDO_DE_LA_PRUEBA, cuposPorGrupo, valorDeLaPrueba, type NpcDirectory } from '@ds/contracts';
import { PUESTOS_DE_FUTBOL, futbol } from '@ds/mod-futbol';
import { MODULOS, nuevaPartida } from '@ds/game';
import { advanceToWeek } from '@ds/core';
import { ofertaDePuesto, type JugadorConPuesto } from '../modules/npcs/src/puestos';
import { hacer, posible } from './ayudas';

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

describe('plaza con hueco: el candidato se enfrenta al suplente que mejor cubriría el puesto', () => {
  const j = (id: string, puesto: string, valor: number, valores: Record<string, number> = {}): JugadorConPuesto => ({ id, nombre: id, puesto, valor, valores: { [puesto]: valor, ...valores } });
  /**
   * Un equipo de 18 con `centrales` centrales: porteros 2, laterales 3, mediocentros 4, bandas 3 y delanteros 3 (todos de 40). Con la formación (1-2-2-3-2-1) sobran un lateral, un mediocentro, una
   * banda, dos delanteros y un portero. El lateral suplente cubriría de central con 25 y el mediocentro suplente con 20; los demás no pueden (parecido bajo).
   */
  const equipo = (centrales: number): JugadorConPuesto[] => [
    ...Array.from({ length: centrales }, (_, i) => j(`cb${i}`, 'CB', 40)),
    ...[0, 1].map((i) => j(`gk${i}`, 'GK', 40 - i)),
    j('lb0', 'LB', 40), j('lb1', 'LB', 39), j('lbS', 'LB', 30, { CB: 25 }),
    j('cdm0', 'CDM', 40), j('cdm1', 'CDM', 39), j('cdm2', 'CDM', 38), j('cdmS', 'CDM', 30, { CB: 20 }),
    j('lm0', 'LM', 40), j('lm1', 'LM', 39), j('lmS', 'LM', 30),
    j('st0', 'ST', 40), j('st1', 'ST', 39), j('st2', 'ST', 38),
  ];
  const prueba = (orden = 0) => ({ orden: { central: orden } });
  const oferta = (equipoDe: JugadorConPuesto[], puesto: string, valor: number, orden = 0, p: { orden?: Record<string, number>; yaPasada?: boolean } = prueba(orden)) => ofertaDePuesto(equipoDe, cupos, P, todosA(1, { [puesto]: valor }), undefined, undefined, { puesto, ...p });

  it('un hueco: si falta un central, se enfrenta al lateral suplente (lo que vale de central): hay que superarlo', () => {
    expect(oferta(equipo(2), 'CB', 24)).toBeUndefined();
    expect(oferta(equipo(2), 'CB', 25)).toBeUndefined(); // empatar no basta
    expect(oferta(equipo(2), 'CB', 26)).toMatchObject({ puesto: 'CB', estado: 'libre' });
  });

  it('dos huecos: el primero se enfrenta al que mejor cubriría el puesto y el segundo, al siguiente (el mediocentro suplente)', () => {
    expect(oferta(equipo(1), 'CB', 22)).toBeUndefined(); // el primero no supera al lateral (25)
    expect(oferta(equipo(1), 'CB', 22, 1)).toMatchObject({ puesto: 'CB', estado: 'libre' }); // el segundo sí supera al mediocentro (20)
    expect(oferta(equipo(1), 'CB', 19, 1)).toBeUndefined();
    // Con más entradas que suplentes que cubran, entra.
    expect(oferta(equipo(1), 'CB', 1, 2)).toMatchObject({ puesto: 'CB', estado: 'libre' });
  });

  it('sin nadie que pueda cubrir el puesto, entra: nadie suple a un portero', () => {
    const sinPortero = equipo(3).filter((x) => x.id !== 'gk1');
    expect(oferta(sinPortero, 'GK', 1, 0, {})).toMatchObject({ puesto: 'GK', estado: 'libre' });
  });

  it('con el equipo lleno, como siempre: superar al peor del puesto, que sale', () => {
    expect(oferta(equipo(3), 'CB', 40)).toBeUndefined();
    expect(oferta(equipo(3), 'CB', 41)).toMatchObject({ puesto: 'CB', estado: 'por_merito', peor: { id: 'cb2' } });
  });

  it('el club del colegio (sin prueba) y quien ya pasó la prueba entran con hueco sin enfrentarse a nadie', () => {
    expect(ofertaDePuesto(equipo(2), cupos, P, todosA(1, { CB: 1 }), undefined, undefined, undefined)).toMatchObject({ puesto: 'CB', estado: 'libre' });
    expect(oferta(equipo(2), 'CB', 1, 0, { yaPasada: true })).toMatchObject({ puesto: 'CB', estado: 'libre' });
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
  }, 120000);

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
  }, 120000);

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
  }, 120000);
});
