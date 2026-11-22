import { describe, expect, it } from 'vitest';
import { DATOS_FUTBOL, ABANDONO_PROPUESTO, INTERES_AL_JUGAR, PNJ_POR_LIBRE } from '@ds/mod-futbol';
import { conInteresTrasJugar, interesPor } from '../modules/npcs/src/deportistas';
import { probabilidadDeAbandonar, motivosDeAbandono, type DatosDelDeportista } from '../modules/npcs/src/abandono';
import { HUECO_LIBRE, huecosPorLibre, listaPorLibre, sesionesQueHace } from '../modules/npcs/src/semana';

/**
 * Las propuestas de `docs/relevo/pnj-entrenan-y-abandono.md`, **activadas el 22/11** (`docs/relevo/pnj-entrenan-2.md`): que una parte de los PNJ entrene por su cuenta y quede a jugar, que los mejores de su edad (y los que más
 * interés tienen) abandonen menos, pero no cero, y que jugar suba el interés. Aquí se comprueba que el juego las trae, que sin el dato no cambian nada y que con él hacen lo que dicen.
 */
const POB = DATOS_FUTBOL.paises.espana.poblacion;
const R0 = POB.rutina!;
/** La rutina sin el dato (como antes de activarlo). */
const R = { ...R0, porLibre: undefined, interesAlJugar: undefined };
const RL = { ...R, porLibre: PNJ_POR_LIBRE };
const genetica = { semilla: 7 } as never;
const rasgos = (interes: number, ambicion: number) => ({ caracter: { ambicion, sacrificio: ambicion }, intereses: { futbol: interes } });
const nino = (id: string, interes: number, ambicion: number) => ({ id, genetica, nacimiento: -365 * 12, rasgos: rasgos(interes, ambicion), equipo: 'club_grande', deporte: 'futbol' as const, ritmo: { futbol: 1 } });
const semanas = Array.from({ length: 120 }, (_, i) => 700 + i);

describe('PNJ que entrenan por su cuenta', () => {
  it('el fútbol lo trae activado (intensidad «fuerte») y con el interés que sube al jugar', () => {
    expect(R0.porLibre).toBe(PNJ_POR_LIBRE);
    expect(PNJ_POR_LIBRE.maximoPorSemana).toBe(4);
    expect(R0.interesAlJugar).toBe(INTERES_AL_JUGAR);
    expect(POB.reclutamiento.abandono!.pesos.nivel).toBe(ABANDONO_PROPUESTO.pesos.nivel);
    expect(POB.reclutamiento.abandono!.suelo).toBe(ABANDONO_PROPUESTO.suelo);
  });
  it('sin el dato no hay sesiones por su cuenta ni cambia lo que hacía el PNJ', () => {
    const n = nino('a', 3, 50);
        expect(semanas.every((w) => huecosPorLibre(n as never, 'futbol', R, w).length === 0)).toBe(true);
    expect(semanas.map((w) => sesionesQueHace(n as never, 'futbol', R, w))).toEqual(semanas.map((w) => sesionesQueHace(n as never, 'futbol', { ...R }, w)));
  });
  it('con el dato, el interesado y ambicioso hace más que el desganado, nunca más del máximo y siempre igual', () => {
    const total = (id: string, interes: number, ambicion: number) => semanas.reduce((t, w) => t + huecosPorLibre(nino(id, interes, ambicion) as never, 'futbol', RL, w).length, 0);
    expect(total('b', 3, 50)).toBeGreaterThan(2 * total('b', 0.5, -50));
    expect(semanas.every((w) => huecosPorLibre(nino('b', 3, 50) as never, 'futbol', RL, w).length <= PNJ_POR_LIBRE.maximoPorSemana)).toBe(true);
    expect(semanas.map((w) => huecosPorLibre(nino('b', 3, 50) as never, 'futbol', RL, w))).toEqual(semanas.map((w) => huecosPorLibre(nino('b', 3, 50) as never, 'futbol', RL, w)));
    expect(huecosPorLibre(nino('b', 3, 50) as never, 'futbol', RL, 700).every((h) => h >= HUECO_LIBRE)).toBe(true);
  });
  it('no cuentan para quien no juega a ese deporte', () => {
    expect(semanas.every((w) => huecosPorLibre({ ...nino('c', 3, 50), deporte: undefined } as never, 'futbol', RL, w).length === 0)).toBe(true);
  });
  it('entrena lo suyo según su puesto (el portero, lo de portería; el de campo, nada de portería) y a la escala del personaje', () => {
    const suma = (l: readonly { amount: number }[]) => l.reduce((t, x) => t + x.amount, 0);
    const nombres = (puesto: string) => new Set(Array.from({ length: 300 }, (_, i) => listaPorLibre(nino(`d${i % 7}`, 3, 50) as never, 'futbol', RL, () => 20, 700 + i, HUECO_LIBRE, puesto)).flatMap((l) => l.map((x) => x.stat)));
    expect([...nombres('GK')].some((s) => /reflejos|blocaje|despeje/.test(s))).toBe(true);
    // (la quedada de tiros y paradas sí sube algo de portería a cualquiera, como la del personaje; lo que no hace el de campo es entrenar de portero)
    expect([...nombres('CM')].some((s) => /alcance_aereo|dominio_area|despeje/.test(s))).toBe(false);
    const un = listaPorLibre(nino('e', 3, 50) as never, 'futbol', RL, () => 20, 700, HUECO_LIBRE, 'CM');
    expect(suma(un)).toBeGreaterThan(1);
    expect(suma(un)).toBeLessThan(15); // menos que una sesión del club (~13 puntos)
  });
});

describe('los mejores de su edad abandonan menos, pero no cero', () => {
  const D0 = POB.reclutamiento.abandono!;
  /** El abandono sin el nivel ni el suelo (como antes de activarlo). */
  const D = { ...D0, suelo: undefined, pesos: { ...D0.pesos, nivel: undefined } };
  const DP = { ...D, ...ABANDONO_PROPUESTO, pesos: { ...D.pesos, ...ABANDONO_PROPUESTO.pesos } };
  const p = (nivel: number | undefined, edad = 16) => probabilidadDeAbandonar(DP, { edad, rasgos: rasgos(2, 0) as never, titular: true, padres: { padre: 'aficionado', madre: 'aficionado' }, nivel }, 'futbol');
  it('sin el dato, el nivel no cuenta', () => {
    const d: DatosDelDeportista = { edad: 16, rasgos: rasgos(2, 0) as never, titular: true, padres: { padre: 'aficionado', madre: 'aficionado' } };
    expect(probabilidadDeAbandonar(D, { ...d, nivel: 3 }, 'futbol')).toBe(probabilidadDeAbandonar(D, d, 'futbol'));
    expect(motivosDeAbandono(D, { ...d, nivel: 3 }, 'futbol').some((m) => m.id === 'nivel')).toBe(false);
  });
  it('con él, cuanto mejor, menos abandona; el peor, más; y el mejor nunca baja del suelo', () => {
    expect(p(2.5)).toBeLessThan(p(0));
    expect(p(0)).toBeLessThan(p(-2));
    for (const edad of [14, 15, 16, 17, 18]) expect(p(3, edad)).toBeGreaterThanOrEqual(ABANDONO_PROPUESTO.suelo);
    expect(p(3)).toBeGreaterThan(0);
    expect(p(undefined)).toBe(probabilidadDeAbandonar({ ...DP, pesos: { ...DP.pesos, nivel: 0 } }, { edad: 16, rasgos: rasgos(2, 0) as never, titular: true, padres: { padre: 'aficionado', madre: 'aficionado' } }, 'futbol'));
  });
});

describe('quien más interés tiene lo deja menos, y jugar sube el interés', () => {
  const D = POB.reclutamiento.abandono!;
  const p = (interes: number, edad = 16) => probabilidadDeAbandonar(D, { edad, rasgos: rasgos(interes, 0) as never, titular: true, padres: { padre: 'aficionado', madre: 'aficionado' } }, 'futbol');
  it('cuanto más interés por el fútbol, menos probabilidad de dejarlo', () => {
    expect(p(3)).toBeLessThan(p(2));
    expect(p(2)).toBeLessThan(p(1));
    expect(p(1)).toBeLessThan(p(0));
  });
  it('sin el dato, jugar no cambia el interés; con él sube, con rendimientos decrecientes y sin pasar de 3', () => {
    const r = { intereses: { futbol: 1.5 }, caracter: {} };
    expect(interesPor(r as never, 'futbol')).toBe(1.5);
    const una = conInteresTrasJugar(r, 'futbol', 2, INTERES_AL_JUGAR);
    expect(una.intereses.futbol).toBeGreaterThan(1.5);
    expect(conInteresTrasJugar(r, 'futbol', 0, INTERES_AL_JUGAR)).toBe(r);
    let x = r;
    const pasos: number[] = [];
    for (let s = 0; s < 1500; s++) { const y = conInteresTrasJugar(x, 'futbol', 3, INTERES_AL_JUGAR); pasos.push(y.intereses.futbol - x.intereses.futbol); x = y; }
    expect(x.intereses.futbol).toBeLessThanOrEqual(3);
    expect(x.intereses.futbol).toBeGreaterThan(2.9);
    expect(pasos[0]).toBeGreaterThan(pasos[300]);
    // quien más juega sube más
    expect(conInteresTrasJugar(r, 'futbol', 4, INTERES_AL_JUGAR).intereses.futbol).toBeGreaterThan(conInteresTrasJugar(r, 'futbol', 1, INTERES_AL_JUGAR).intereses.futbol);
    // si el interés le viene del deporte en general, el del fútbol parte de ese
    expect((conInteresTrasJugar({ intereses: { deporte: 2 } as Record<string, number> }, 'futbol', 1, INTERES_AL_JUGAR) as any).intereses.futbol).toBeGreaterThan(2);
  });
});
