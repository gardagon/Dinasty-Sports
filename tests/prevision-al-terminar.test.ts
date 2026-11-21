import { describe, expect, it, vi } from 'vitest';
import { PAIS_ESPANA, claveDeDeporte, situacionDeTemporada, temporadaTerminada, type DeporteService, type Periodo } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { DATOS_FUTBOL, futbol, type FutbolState } from '@ds/mod-futbol';
import { hacer, posible } from './ayudas';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });

/**
 * «El curso que viene» en la página del equipo solo sale cuando termina la temporada (decisión del usuario, 21/11/2026): desde que acaba la liga (la copa, cuando la haya) hasta el reparto del verano, que llega con el curso
 * nuevo. «Termina la temporada» sale del calendario del deporte (`situacionDeTemporada`): los tramos `terminada` (la liga cerrada con clase todavía) y `verano` (las vacaciones del calendario del país).
 */
describe('cuándo termina la temporada (el calendario del deporte)', () => {
  const cal = PAIS_ESPANA.calendario;
  const temporada = DATOS_FUTBOL.paises.espana.temporada;
  const sit = (week: number, schoolWeek: number, period: Periodo, terminada = false) => situacionDeTemporada(cal, temporada, { week, schoolWeek, period }, { competicion: { nombre: 'liga', articulo: 'la' }, diaDeJornada: 5, ...(terminada ? { terminada } : {}) });

  it('no ha terminado en pretemporada, en la liga ni en una parada por vacaciones; sí con la liga cerrada y en verano', () => {
    expect(temporadaTerminada(sit(2, 2, 'clase'))).toBe(false); // pretemporada
    expect(temporadaTerminada(sit(10, 10, 'clase'))).toBe(false); // liga
    expect(temporadaTerminada(sit(16, 16, 'navidad'))).toBe(false); // parada de Navidad, con la liga a medias
    expect(temporadaTerminada(sit(30, 30, 'clase', true))).toBe(true); // la liga ha cerrado y quedan clases
    expect(temporadaTerminada(sit(30, 30, 'semana_santa', true))).toBe(true); // cerrada, aunque caiga en las vacaciones de Semana Santa
    expect(temporadaTerminada(sit(45, 45, 'verano'))).toBe(true); // verano: hasta el curso que viene
  });
});

describe('la página del equipo durante el curso', () => {
  it('«El curso que viene» no sale en pretemporada ni durante la liga; sale cuando acaba la liga y en verano; y desaparece con el curso nuevo (el reparto del verano)', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
    const hay = (): { prevision: boolean; plantilla: boolean } => {
      const titulos = g.service<DeporteService>(claveDeDeporte('futbol'))!.view().secciones!.map((s) => s.titulo);
      return { prevision: titulos.some((t) => t.startsWith('El curso que viene')), plantilla: titulos.some((t) => t.startsWith('Plantilla')) };
    };
    const estado = () => g.moduleState<FutbolState>('futbol') as FutbolState;
    const visto: { semana: number; cerrada: boolean; verano: boolean; prevision: boolean; plantilla: boolean }[] = [];
    for (let w = 2; w <= 62; w += 2) {
      advanceToWeek(g, 'gen.descansar', w, 2, 15);
      const v = hay();
      visto.push({ semana: w, cerrada: !!estado().liga?.cerrada && estado().liga?.curso === g.time.schoolYear, verano: g.time.period === 'verano', ...v });
    }
    // Durante la liga (con plantilla a la vista) no sale; cuando está cerrada o es verano y hay plantilla, sí; con el curso nuevo y la pretemporada, no.
    const durante = visto.filter((x) => x.plantilla && !x.cerrada && !x.verano);
    const alFinal = visto.filter((x) => x.plantilla && (x.cerrada || x.verano));
    expect(durante.length, JSON.stringify(visto)).toBeGreaterThan(3);
    expect(alFinal.length, JSON.stringify(visto)).toBeGreaterThan(1);
    for (const x of durante) expect(x.prevision, `semana ${x.semana}: durante la temporada no sale`).toBe(false);
    for (const x of alFinal) expect(x.prevision, `semana ${x.semana}: terminada la temporada sí sale`).toBe(true);
    for (const x of visto.filter((y) => !y.plantilla)) expect(x.prevision).toBe(false);
  });
});
