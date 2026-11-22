import { describe, expect, it, vi } from 'vitest';
import { CONFIG_DE_SUCESOS, PAIS_CIUDAD_DE_PRUEBA, SERVICES, dificultadDeTirada, sucesoEsAplazable, sucesoEsDurante, registrarPais, type RelationsService, type SucesoPendiente, type SucesosService } from '@ds/contracts';
import type { Game } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, type FutbolState } from '@ds/mod-futbol';
import primerEntrenamiento from '../modules/futbol/src/eventos/primer_entrenamiento';
import { Banco } from '../tools/eventos/banco';
import { hacer, posible } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * Los primeros eventos que ve el jugador, jugados en una partida de verdad (sin forzar nada): salen cuando toca y se apoyan en las mecánicas que ya
 * existían (el consejo del profesor de Educación Física, el puesto en el equipo, llegar tarde).
 */
const pendiente = (g: Game, suceso: string): SucesoPendiente | undefined => g.service<SucesosService>(SERVICES.sucesos)!.pendientes().find((p) => p.suceso === suceso);
const CLASES = [1, 2, 3, 4].map((k) => `estudios.clase_${k}`);
const esperar = (g: Game): void => {
  if (!g.perform('gen.esperar').ok) throw new Error('No se puede esperar');
};
/** Decide lo que haya pendiente con la opción por defecto del test (la primera elegible), para que no se acumule. */
const despejar = (g: Game): void => {
  for (const p of g.service<SucesosService>(SERVICES.sucesos)!.pendientes()) g.perform(p.opciones.find((o) => o.elegible)!.accion);
};

describe('los primeros eventos, en una partida de verdad', () => {
  it('la primera clase de Educación física trae el consejo del profesor, y no se repite', () => {
    const g = nuevaPartida({ seed: 11 });
    const id = 'eventos.estudios.primer_dia_de_educacion_fisica';
    for (let k = 0; k < 6000 && !pendiente(g, id); k++) {
      const clase = CLASES.find((c) => posible(g, c));
      if (clase) hacer(g, clase);
      else esperar(g);
      if (!pendiente(g, id)) despejar(g);
    }
    const p = pendiente(g, id)!;
    expect(p).toBeDefined();
    expect(p.texto).toMatch(/^Al acabar la clase, .+ te para/);
    expect(p.texto).not.toMatch(/[{}]/);
    // Pasa dentro de la clase: no gasta minutos y se responde en el momento (no se puede dejar para luego).
    expect(p.opciones.every((o) => o.minutos === 0)).toBe(true);
    expect(p).toMatchObject({ urgencia: 'ahora', aplazable: false });
    const profesor = p.reparto.profesor;
    const antes = g.service<RelationsService>(SERVICES.relaciones)!.get(profesor)?.afinidad ?? 0;
    expect(g.perform(p.opciones[0].accion).ok).toBe(true);
    expect(g.service<RelationsService>(SERVICES.relaciones)!.get(profesor)!.afinidad).toBeGreaterThan(antes);
    // Una vez en la vida.
    for (let k = 0; k < 3000; k++) {
      const clase = CLASES.find((c) => posible(g, c));
      if (clase) hacer(g, clase);
      else esperar(g);
      expect(pendiente(g, id)).toBeUndefined();
      despejar(g);
      if (g.time.day > 9) break;
    }
  });

  it('entrar con la clase empezada tiene su momento, con los minutos de retraso', () => {
    const g = nuevaPartida({ seed: 12 });
    const id = 'eventos.estudios.tarde_a_clase';
    for (let k = 0; k < 4000 && !pendiente(g, id); k++) {
      const clase = CLASES.find((c) => posible(g, c));
      if (!clase) {
        esperar(g);
        continue;
      }
      // Se espera a que la clase lleve un rato empezada (la acción dura menos cuando ya ha empezado).
      const entera = g.preview(clase)!.duration;
      for (let m = 0; m < 12 && posible(g, clase) && g.preview(clase)!.duration > entera - 20; m++) esperar(g);
      if (posible(g, clase)) hacer(g, clase);
      if (!pendiente(g, id)) despejar(g);
    }
    const p = pendiente(g, id)!;
    expect(p).toBeDefined();
    expect(p.texto).toMatch(/\d+ minutos tarde/);
    expect(p.opciones.map((o) => o.id)).toEqual(['disculparse', 'excusa', 'gracia', 'nada']);
  });

  it('el primer entrenamiento de fútbol: el entrenador dice dónde va a jugar, con su puesto de verdad', () => {
    registrarPais(PAIS_CIUDAD_DE_PRUEBA);
    const g = nuevaPartida({ seed: 31, pais: PAIS_CIUDAD_DE_PRUEBA.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const id = 'futbol.primer_entrenamiento';
    for (let k = 0; k < 6000 && !pendiente(g, id); k++) {
      if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
      else if (posible(g, 'futbol.club_sesion')) hacer(g, 'futbol.club_sesion');
      else if (!g.perform('gen.descansar').ok) esperar(g);
      if (!pendiente(g, id)) despejar(g);
    }
    const p = pendiente(g, id)!;
    expect(p).toBeDefined();
    expect(p).toMatchObject({ origen: 'deporte', deporte: 'futbol' });
    expect(g.moduleState<FutbolState>('futbol').puesto).toBeDefined();
    expect(p.texto).toMatch(/De inicio vas a jugar de [a-záéíóúñ ]+/);
    expect(p.texto).not.toMatch(/[{}]/);
    expect(p.opciones.map((o) => o.id)).toContain('preguntar');
  });

  it('si el entrenador concede el cambio de puesto, el fútbol y el equipo lo apuntan (la misma señal de siempre)', () => {
    const s = new Banco().sesion({ hechos: { 'futbol.puesto': 'lateral derecho', 'futbol.juega_donde_mas_vale': false, 'futbol.mejor_puesto': 'extremo derecho', 'futbol.mejor_puesto_id': 'RW' } });
    expect(s.forzar('futbol.primer_entrenamiento')).toBe(true);
    expect(s.pendiente('futbol.primer_entrenamiento')!.opciones.find((o) => o.id === 'pedir_cambio')!.texto).toBe('Pedirle jugar de extremo derecho');
    s.elegir('futbol.primer_entrenamiento', 'pedir_cambio', 'exito');
    expect(s.game.moduleState<FutbolState>('futbol').puesto).toBe('RW');
    expect(s.game.moduleState<{ puestoDelPersonaje?: Record<string, string> }>('npcs').puestoDelPersonaje?.futbol).toBe('RW');

    const no = new Banco().sesion({ hechos: { 'futbol.puesto': 'lateral derecho', 'futbol.juega_donde_mas_vale': false, 'futbol.mejor_puesto': 'extremo derecho', 'futbol.mejor_puesto_id': 'RW' } });
    no.forzar('futbol.primer_entrenamiento');
    no.elegir('futbol.primer_entrenamiento', 'pedir_cambio', 'fallo');
    expect(no.game.moduleState<FutbolState>('futbol').puesto).toBeUndefined();
  });
});

describe('la dificultad de pedirle al entrenador otro puesto (cifras provisionales: docs/relevo/futbol-pedir-puesto.md)', () => {
  const tirada = (primerEntrenamiento as unknown as { variantes: { id: string; opciones: { id: string; tirada?: Parameters<typeof dificultadDeTirada>[0] }[] }[] }).variantes.find((v) => v.id === 'en_otro_sitio')!.opciones.find((o) => o.id === 'pedir_cambio')!.tirada!;
  const dificultad = (afinidad: number | undefined, estado: 'antipatia' | 'conocido' | 'amigo', ventaja: number): number =>
    dificultadDeTirada(tirada, {
      hechos: {
        relacion: () => (afinidad === undefined ? undefined : { afinidad, confianza: 30, estado }),
        hecho: (n: string) => (n === 'futbol.ventaja_del_mejor_puesto' ? ventaja : undefined),
      } as never,
      reparto: { entrenador: 'e1' },
      marca: () => false,
      contador: () => 0,
      recuerdo: () => undefined,
    });

  it('tabla de ejemplos: relación (baja, media, alta) × lo que vale en el puesto que pide (más, igual, menos)', () => {
    const MAS = 15, IGUAL = 0, MENOS = -6;
    expect([MAS, IGUAL, MENOS].map((v) => dificultad(-20, 'antipatia', v))).toEqual([55, 65, 73]);
    expect([MAS, IGUAL, MENOS].map((v) => dificultad(25, 'conocido', v))).toEqual([40, 50, 58]);
    expect([MAS, IGUAL, MENOS].map((v) => dificultad(50, 'amigo', v))).toEqual([35, 45, 53]);
  });

  it('mejor relación, más fácil; valer más en el puesto pedido, más fácil; los extremos no se salen de la escala', () => {
    expect(dificultad(50, 'amigo', 6)).toBeLessThan(dificultad(10, 'conocido', 6));
    expect(dificultad(10, 'conocido', 25)).toBeLessThan(dificultad(10, 'conocido', 6));
    expect(dificultad(10, 'conocido', -12)).toBeGreaterThan(dificultad(10, 'conocido', 0));
    expect(dificultad(90, 'amigo', 30)).toBe(55 - 15 - 15);
    expect(dificultad(-60, 'antipatia', -15)).toBe(55 + 10 + 15);
    expect(dificultad(undefined, 'conocido', 0)).toBe(55); // sin vínculo, solo cuenta lo que vale
  });
});

describe('qué sucesos pasan durante una actividad y cuáles se pueden aplazar (todo el catálogo)', () => {
  const defs = [...new Banco().catalogo.sucesos.values()].map((x) => x.def).filter((d) => d.opciones?.length || d.variantes?.some((v) => v.opciones?.length));

  it('lo que pasa en clase, en un entrenamiento o en una prueba de acceso no gasta minutos propios ni se puede aplazar', () => {
    const durante = defs.filter((d) => sucesoEsDurante(d));
    // Preguntas en clase, llegar tarde (a clase, al entrenamiento, a la convocatoria), el profesor de Educación física, el primer entrenamiento y la prueba de acceso.
    expect(durante.map((d) => d.id)).toEqual(expect.arrayContaining(['eventos.colegio.pregunta_del_profesor', 'eventos.estudios.primer_dia_de_educacion_fisica', 'eventos.estudios.tarde_a_clase', 'futbol.primer_entrenamiento', 'futbol.tarde_al_entrenamiento', 'futbol.tarde_a_la_convocatoria', 'futbol.prueba_de_acceso']));
    for (const d of durante) {
      const opciones = [...(d.opciones ?? []), ...(d.variantes ?? []).flatMap((v) => v.opciones ?? [])];
      expect(opciones.filter((o) => o.minutos !== undefined).map((o) => `${d.id}.${o.id}`), `${d.id} gasta minutos`).toEqual([]);
      expect(sucesoEsAplazable(d), `${d.id} se puede aplazar`).toBe(false);
    }
  });

  it('solo se pueden aplazar los avisos que de verdad pueden esperar (hoy, los del club al cambiar de temporada y la fiesta de un cumpleaños)', () => {
    expect(defs.filter((d) => sucesoEsAplazable(d, CONFIG_DE_SUCESOS.durante)).map((d) => d.id).sort()).toEqual(['eventos.relaciones.cumple.fiesta', 'futbol.equipo_sin_ninos', 'futbol.plaza_extra', 'futbol.plaza_perdida']);
  });
});
