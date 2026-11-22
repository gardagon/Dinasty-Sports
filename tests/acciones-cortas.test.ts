import { describe, expect, it } from 'vitest';
import { SERVICES, rutaA, tiempoEntre, type ClubDirectory, type LugaresService } from '@ds/contracts';
import { advanceTo, advanceToWeek } from '@ds/core';
import { nuevaPartida } from '@ds/game';
import { hacer, viajarA } from './ayudas';

/** Lo que cuesta llegar a un sitio por el camino que se recorre de verdad (parada a parada, como hace el viaje de la interfaz). */
function viajeA(g: ReturnType<typeof nuevaPartida>, lugar: string): number {
  const l = g.service<LugaresService>(SERVICES.lugares)!;
  let previo = l.actual().id;
  let m = 0;
  for (const parada of rutaA(l.mapa(), previo, lugar)) {
    m += tiempoEntre(l.mapa(), previo, parada) ?? 0;
    previo = parada;
  }
  return m;
}

/** Una acción que pisa una obligación consume solo los minutos que faltan: con la partida entera (lugares, estudios, relaciones), restando el viaje al aula. */
describe('acciones cortas con la partida entera', () => {
  it('en casa, antes de clase, estudiar se corta para llegar a tiempo al aula (resta el viaje) y el texto lo dice', () => {
    const g = nuevaPartida({ seed: 11 });
    advanceTo(g, 'gen.descansar', 0, 7);
    const viaje = viajeA(g, 'aula');
    expect(viaje).toBeGreaterThan(0);
    // Hasta que falten exactamente 10 minutos + el viaje para las 8:00.
    while (g.time.minuteOfDay < 8 * 60 - viaje - 10) g.perform('gen.esperar');
    const p = g.preview('estudios.estudiar_lengua') ?? g.preview(g.listActions().find((o) => o.id.startsWith('estudios.estudiar_') && o.available)!.id)!;
    expect(p.corte).toBeDefined();
    expect(p.corte!.texto).toBe('para llegar a clase a las 8:00');
    expect(g.time.minuteOfDay + p.duration).toBe(8 * 60 - viaje);
    // Y hacer deberes, que dura 30 y se corta igual; un viaje no.
    const d = g.listActions().find((o) => o.id.startsWith('estudios.deberes_') && o.available)!;
    expect(d.duration).toBe(p.duration);
    expect(g.preview('lugares.ir_aula')!.corte).toBeUndefined();
  });

  it('«Hacer deberes» se puede hacer en casa, la biblioteca, el colegio, el parque y los campos de fútbol que haya', () => {
    const g = nuevaPartida({ seed: 11 });
    const d = g.listActions().find((o) => o.id.startsWith('estudios.deberes_'))!;
    expect(d.lugar![0]).toBe('casa');
    expect(d.lugar).toEqual(expect.arrayContaining(['biblioteca', 'colegio', 'parque', 'estadio']));
    expect(d.lugar).not.toContain('campo_municipal'); // sin fútbol, ese campo no existe
  });

  it('la sesión del club es una obligación: leer justo antes se corta y se llega a tiempo', () => {
    const g = nuevaPartida({ seed: 31 });
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'atletismo.apuntarse_colegio').ok).toBe(true);
    const sesiones = g.service<ClubDirectory>(SERVICES.clubes)!.membership('atletismo')!.sesiones;
    advanceToWeek(g, 'gen.descansar', 2, sesiones.weekdays[0], sesiones.desde - 1);
    const sede = g.service<ClubDirectory>(SERVICES.clubes)!.membership('atletismo')!.sede;
    viajarA(g, 'casa');
    // Falta menos de una hora (lo que dura leer) para la sesión y hay que ir hasta la sede: se lee solo hasta la hora de salir.
    const viaje = viajeA(g, sede);
    const faltan = sesiones.desde * 60 - g.time.minuteOfDay;
    expect(faltan - viaje).toBeGreaterThan(0);
    expect(faltan).toBeLessThan(60);
    const p = g.preview('gen.leer')!; // 60 minutos, cortable
    expect(p.duration).toBe(faltan - viaje);
    expect(p.corte!.texto).toBe(`para llegar al entrenamiento de las ${sesiones.desde}:00`);
    expect(g.perform('gen.leer').ok).toBe(true);
    viajarA(g, sede);
    expect(g.time.minuteOfDay).toBe(sesiones.desde * 60); // se llega justo cuando empieza la sesión
    expect(g.preview('atletismo.club_sesion')!.modifiers.some((m) => m.id === 'atletismo.llegada_tarde')).toBe(false); // sin llegar tarde
  });
});
