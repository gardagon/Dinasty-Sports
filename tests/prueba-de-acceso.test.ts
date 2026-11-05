import { describe, expect, it } from 'vitest';
import { PRUEBA_DE_TAMANO, RUIDO_DE_LA_PRUEBA, cuposPorGrupo, valorDeLaPrueba, type NpcDirectory } from '@ds/contracts';
import { PUESTOS_DE_FUTBOL, futbol } from '@ds/mod-futbol';
import { MODULOS, nuevaPartida } from '@ds/game';
import { advanceToWeek } from '@ds/core';
import { minimoDePrueba } from '@ds/mod-npcs';
import { ofertaDePuesto, ofertasDePuesto, pasaLaPrueba, type JugadorConPuesto } from '../modules/npcs/src/puestos';
import { hacer, posible } from './ayudas';

/**
 * La prueba de acceso a un club que no es el del colegio (`CIUDAD_Y_LIGAS.md` §5): lo que vale en la prueba es lo que cuenta para la regla de plaza; los grandes piden superar al peor de
 * su puesto aunque haya hueco; los medianos y pequeños, un mínimo; el personaje elige puesto y el entrenador le puede proponer otro; el profesor de Educación Física aconseja varios.
 */

const P = PUESTOS_DE_FUTBOL;
const cupos = cuposPorGrupo(P, 18);
const jugador = (id: string, puesto: string, valor: number): JugadorConPuesto => ({ id, nombre: id, puesto, valor });
const todosA = (v: number, extra: Record<string, number> = {}): Record<string, number> => ({ ...Object.fromEntries(P.puestos.map((p) => [p.id, v])), ...extra });
/** Un equipo al que le falta un portero (hay hueco de portero) y con el resto completo, todos de valor 40. */
const conHuecoDePortero = (): JugadorConPuesto[] =>
  P.reparto.flatMap((r) => Array.from({ length: cupos[r.grupo] - (r.grupo === 'portero' ? 1 : 0) }, (_, i) => jugador(`${r.grupo}${i}`, r.puestos[0], 40)));

describe('lo que vale una prueba', () => {
  it('es lo que vale de verdad por cómo rinde ese día y un poco de azar: la misma cuenta para el personaje y para un niño', () => {
    expect(valorDeLaPrueba(50, 1, 0)).toBeCloseTo(50, 6);
    expect(valorDeLaPrueba(50, 0, 0)).toBeCloseTo(42.5, 6); // sin eficiencia, ×0,85
    expect(valorDeLaPrueba(50, 1, 1)).toBeCloseTo(50 * (1 + RUIDO_DE_LA_PRUEBA), 6);
    expect(valorDeLaPrueba(50, 1, -1)).toBeLessThan(50);
  });
});

describe('la prueba pide un mínimo frente al peor de su puesto, aunque haya hueco', () => {
  it('en un grande (mínimo 1) hay que superar al peor del puesto aunque haya hueco; en uno mediano o pequeño basta con llegar a una fracción', () => {
    const equipo = conHuecoDePortero();
    const delGrupo = equipo.filter((j) => j.puesto === 'GK');
    expect(PRUEBA_DE_TAMANO.grande.minimo).toBeGreaterThanOrEqual(1);
    expect(PRUEBA_DE_TAMANO.mediano.minimo).toBeLessThan(1);
    expect(PRUEBA_DE_TAMANO.pequeno.minimo).toBeLessThan(PRUEBA_DE_TAMANO.mediano.minimo);
    // Hay hueco de portero, el peor portero vale 40.
    expect(ofertaDePuesto(equipo, cupos, P, todosA(10, { GK: 39 }), undefined, undefined, { minimo: 1 })).toBeUndefined();
    expect(ofertaDePuesto(equipo, cupos, P, todosA(10, { GK: 40 }), undefined, undefined, { minimo: 1 })).toBeUndefined(); // empatar no basta
    expect(ofertaDePuesto(equipo, cupos, P, todosA(10, { GK: 41 }), undefined, undefined, { minimo: 1 })).toMatchObject({ puesto: 'GK', estado: 'libre' });
    // En un mediano (0,9) entra con 37 (≥ 36) y no con 35.
    expect(ofertaDePuesto(equipo, cupos, P, todosA(10, { GK: 37 }), undefined, undefined, { minimo: PRUEBA_DE_TAMANO.mediano.minimo })).toMatchObject({ puesto: 'GK', estado: 'libre' });
    expect(ofertaDePuesto(equipo, cupos, P, todosA(10, { GK: 35 }), undefined, undefined, { minimo: PRUEBA_DE_TAMANO.mediano.minimo })).toBeUndefined();
    // Sin prueba (el club del colegio), con hueco entra siempre.
    expect(ofertaDePuesto(equipo, cupos, P, todosA(10, { GK: 1 }))).toMatchObject({ puesto: 'GK', estado: 'libre' });
    expect(pasaLaPrueba(1, [], 1)).toBe(true); // sin nadie en el puesto, basta con la prueba que sea
    expect(pasaLaPrueba(10, delGrupo, 0)).toBe(true); // ya pasada
  });

  it('el minimo de un club sale de su tamaño (o del suyo propio) y el del colegio no tiene prueba', () => {
    expect(minimoDePrueba({ tamano: 'grande', calidad: 3 })).toBe(PRUEBA_DE_TAMANO.grande.minimo);
    expect(minimoDePrueba({ tamano: 'pequeno', calidad: 1 })).toBe(PRUEBA_DE_TAMANO.pequeno.minimo);
    expect(minimoDePrueba({ calidad: 2 })).toBe(PRUEBA_DE_TAMANO.mediano.minimo); // sin tamaño, el de su calidad
    expect(minimoDePrueba({ tamano: 'grande', calidad: 3, pruebaDeAcceso: { minimo: 1.2 } })).toBe(1.2);
  });

  it('al pedir un puesto, la plaza se mide solo en ese puesto, aunque en otro entrase', () => {
    const equipo = conHuecoDePortero();
    const v = todosA(10, { GK: 80, CB: 5 });
    // Pidiendo central (hay equipo completo y vale menos), no entra; sin pedir, entra de portero.
    expect(ofertaDePuesto(equipo, cupos, P, v, 'CB', undefined, { minimo: 0.9, puesto: 'CB' })).toBeUndefined();
    expect(ofertasDePuesto(equipo, cupos, P, v, undefined, undefined, { minimo: 0.9 }).map((o) => o.puesto)).toEqual(['GK']);
    expect(ofertaDePuesto(equipo, cupos, P, v, undefined, undefined, { minimo: 0.9, puesto: 'GK' })).toMatchObject({ puesto: 'GK' });
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
