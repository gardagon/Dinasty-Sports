import { describe, expect, it, vi } from 'vitest';
import { FRACCION_EN_MOVIMIENTO_DE_EDUCACION_FISICA, JORNADA_ESCOLAR, SERVICES, type StudiesService } from '@ds/contracts';
import { advanceToWeek, type Game } from '@ds/core';
import { nuevaPartida } from '@ds/game';
import { conocer, hacer, llegarA } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/** La actividad del cuerpo del personaje: lo que cuenta para sus minutos de la semana (recreo, Educación física, quedar con alguien). */
const activo = (g: Game) => g.moduleState<{ semana: { activo: number } }>('gen').semana.activo;

describe('la actividad física del personaje cuenta para el cuerpo', () => {
  it('jugar en el recreo (con otros niños o con un compañero) suma los minutos que dura', () => {
    const g = conocer(nuevaPartida({ seed: 31 }));
    llegarA(g, 'patio', 10, 45);
    const antes = activo(g);
    expect(hacer(g, 'relaciones.jugar_con_otros').ok).toBe(true);
    expect(activo(g) - antes).toBe(5);
    expect(hacer(g, 'relaciones.jugar.companero_social').ok).toBe(true);
    expect(activo(g) - antes).toBe(10);
  });

  it('la Educación física cuenta solo si va a la clase (y la mitad de los minutos que asiste); las demás clases, no', () => {
    const g = conocer(nuevaPartida({ seed: 31 }));
    const estudios = g.service<StudiesService>(SERVICES.estudios)!;
    const horario = [0, 1, 2, 3, 4].map((d) => estudios.timetable(d));
    const dia = horario.findIndex((h) => h.includes('estudios.educacion_fisica'));
    expect(dia).toBeGreaterThanOrEqual(0);
    const clase = horario[dia].indexOf('estudios.educacion_fisica');
    const otra = horario[dia].findIndex((s) => s !== 'estudios.educacion_fisica');
    const [inicio, fin] = JORNADA_ESCOLAR.clases[clase];
    advanceToWeek(g, 'gen.descansar', 1, dia, 6);
    const ir = (slot: number) => {
      const [i] = JORNADA_ESCOLAR.clases[slot];
      llegarA(g, 'aula', Math.floor(i / 60), i % 60);
      return g.time.minuteOfDay;
    };
    // Las dos clases del día en su orden: la de Educación física cuenta sus minutos reales; la otra, nada.
    const orden = [clase, otra].sort((a, b) => a - b);
    for (const slot of orden) {
      const antes = activo(g);
      const minuto = ir(slot);
      expect(hacer(g, `estudios.clase_${slot + 1}`).ok).toBe(true);
      expect(activo(g) - antes).toBe(slot === clase ? (fin - Math.max(minuto, inicio)) * FRACCION_EN_MOVIMIENTO_DE_EDUCACION_FISICA : 0);
    }
  });

  it('los minutos de Educación física de cada curso salen del currículo y los horarios del país', () => {
    const g = nuevaPartida({ seed: 31 });
    const ef = g.service<{ minutosPorSemana(curso: number): number }>(SERVICES.educacionFisica)!;
    const [inicio, fin] = JORNADA_ESCOLAR.clases[0];
    expect(ef.minutosPorSemana(0)).toBeGreaterThan(0);
    expect(ef.minutosPorSemana(0) % (fin - inicio)).toBe(0);
    expect(ef.minutosPorSemana(-1)).toBe(0);
    expect(ef.minutosPorSemana(99)).toBe(0);
  });
});

describe('quedar con alguien', () => {
  it('de menor de 12 años cuenta la mitad de la duración como actividad; a partir de los 12, nada', () => {
    const hechos = (edadExtra: number) => {
      const g = conocer(nuevaPartida({ seed: 31 }));
      advanceToWeek(g, 'gen.descansar', 1, 2, 12);
      const s = g.moduleState<{ edadInicial: number }>('gen') as { edadInicial: number };
      s.edadInicial += edadExtra;
      llegarA(g, 'casa', 19, 0);
      const quedar = ['padre', 'madre', 'hermano_1'].map((id) => `relaciones.quedar.${id}`).find((id) => g.preview(id)?.available);
      expect(quedar, 'alguien con quien poder quedar').toBeDefined();
      const antes = activo(g);
      const duracion = g.preview(quedar!)!.duration;
      expect(g.perform(quedar!).ok).toBe(true);
      return { suma: activo(g) - antes, duracion };
    };
    const nino = hechos(0);
    expect(nino.suma).toBe(nino.duracion / 2);
    expect(hechos(5).suma).toBe(0);
  });
});
