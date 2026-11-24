import { describe, expect, it } from 'vitest';
import {
  ATENCION_POR_TAMANO,
  CUOTA_POR_ACTIVIDAD,
  DIAS_DE_VUELTA,
  RECAIDA_EN_8_SEMANAS,
  TIPOS_DE_LESION,
  VENTANA_DE_RECAIDA,
  aniosDesdeElPico,
  atencionDelClub,
  diasBaseDeLesion,
  duracionDeLesion,
  factorDeEdad,
  factorPorCiclo,
  factorPorEstiron,
  factorPorHistorial,
  factorPorSexo,
  faseDeLesion,
  faseTrasElAlta,
  migrarBaja,
  pasarDiasDeBaja,
  perfilDeRiesgo,
  probabilidadDeSecuela,
  recaida,
  resistenciaALesiones,
  riesgoDiarioDeRecaida,
  riesgoPorExposicion,
  secuelaDeLesion,
  semanasDeBaja,
  sortearLesion,
  type Lesion,
  type PersonaDeRiesgo,
} from './salud';

const TIPICA = (edad: number, resto: Partial<PersonaDeRiesgo> = {}): PersonaDeRiesgo => ({ edad, constitucion: 50, salud: 100, ...resto });
const suma = (o: Readonly<Record<string, number>>): number => Object.values(o).reduce((s, v) => s + v, 0);
/** Un generador estable de azares para las pruebas de distribución. */
const azares = (semilla: number) => {
  let s = semilla;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
};

describe('la tasa base y el reparto por tipo', () => {
  it('el reparto por tipo suma 1 en cada actividad', () => {
    for (const a of ['partido', 'sesion', 'otra'] as const) expect(suma(CUOTA_POR_ACTIVIDAD[a])).toBeCloseTo(1, 9);
  });
  it('un jugador típico de 16–19 años tiene 14 lesiones por 1.000 h de partido y 2,8 de entrenamiento', () => {
    expect(suma(perfilDeRiesgo(TIPICA(17), 'partido'))).toBeCloseTo(0.014, 6);
    expect(suma(perfilDeRiesgo(TIPICA(17), 'sesion'))).toBeCloseTo(0.0028, 6);
  });
  it('de pequeño se lesiona menos que de mayor, sin saltos grandes', () => {
    expect(factorDeEdad(9)).toBe(0.5);
    expect(factorDeEdad(11)).toBe(0.65);
    expect(factorDeEdad(14)).toBe(0.9);
    expect(factorDeEdad(17)).toBe(1);
    expect(factorDeEdad(30)).toBe(0.9);
  });
  it('un jugador de club se lesiona unas 0,3 veces al año a los 9, 0,6–0,8 a los 14 y unas 0,8 de los 16 a los 19 (±40 %)', () => {
    const alAnio = (edad: number, sesiones: number) => {
      const s = riesgoPorExposicion(perfilDeRiesgo(TIPICA(edad), 'sesion'), { horas: 1.5 * sesiones * 36 }).p;
      const p = riesgoPorExposicion(perfilDeRiesgo(TIPICA(edad), 'partido'), { horas: 1.25 * 22 }).p;
      return -Math.log(1 - s) - Math.log(1 - p);
    };
    const objetivo = [[9, 2, 0.3], [14, 3, 0.6], [17, 3, 0.8]] as const;
    for (const [edad, sesiones, esperado] of objetivo) {
      const v = alAnio(edad, sesiones);
      expect(v, `edad ${edad}`).toBeGreaterThan(esperado * 0.6);
      expect(v, `edad ${edad}`).toBeLessThan(esperado * 1.4);
    }
  });
});

describe('los factores de la persona', () => {
  it('la constitución, de 20 a 80, cambia el riesgo en un ×1,5 a ×2', () => {
    const r = (c: number) => riesgoPorExposicion(perfilDeRiesgo(TIPICA(17, { constitucion: c }), 'partido'), { horas: 1 }).p;
    expect(r(20) / r(80)).toBeGreaterThan(1.5);
    expect(r(20) / r(80)).toBeLessThan(2);
  });
  it('la resistencia a lesiones: Endeble facilita lesionarse y Constitución de toro lo dificulta, además de la constitución', () => {
    const normal = resistenciaALesiones(50);
    expect(normal).toBeCloseTo(1, 9);
    expect(resistenciaALesiones(50, ['endeble'])).toBeCloseTo(1.25, 9);
    expect(resistenciaALesiones(50, ['constitucion_de_toro'])).toBeCloseTo(0.8, 9);
    // Con el tope que mueven los perks (±8 de constitución) el efecto total es ~×1,33 y ~×0,75.
    expect(resistenciaALesiones(42, ['endeble'])).toBeCloseTo(1.33, 2);
    expect(resistenciaALesiones(58, ['constitucion_de_toro'])).toBeCloseTo(0.75, 2);
  });
  it('los perks de recuperación acortan o alargan la baja, y juntos se anulan', () => {
    const p = { constitucion: 50, salud: 100 };
    const base = duracionDeLesion('muscular', 0.5, p);
    expect(duracionDeLesion('muscular', 0.5, { ...p, perks: ['recuperacion_rapida'] })).toBeLessThan(base);
    expect(duracionDeLesion('muscular', 0.5, { ...p, perks: ['recuperacion_lenta'] })).toBeGreaterThan(base);
    expect(duracionDeLesion('muscular', 0.5, { ...p, perks: ['recuperacion_rapida', 'recuperacion_lenta'] })).toBe(duracionDeLesion('muscular', 0.5, { ...p, perks: [] }));
  });
  it('el sueño atrasado sube el riesgo: con 6 h de deuda, de ×1,5 a ×1,8 (Milewski ×1,7); no baja nunca', () => {
    const r = (deuda: number) => riesgoPorExposicion(perfilDeRiesgo(TIPICA(16, { deuda }), 'partido'), { horas: 1 }).p;
    expect(r(6) / r(0)).toBeGreaterThan(1.5);
    expect(r(6) / r(0)).toBeLessThan(1.8);
    expect(r(1)).toBeCloseTo(r(0) * (1 + (4 * 1) / 40 / (1 + 48 / 40)), 1);
    for (let d = 0; d < 10; d += 0.5) expect(r(d + 0.5)).toBeGreaterThanOrEqual(r(d));
  });
  it('la salud baja, el desgaste y la superficie suben el riesgo; la prevención del club lo baja', () => {
    const r = (p: Partial<PersonaDeRiesgo>) => riesgoPorExposicion(perfilDeRiesgo(TIPICA(16, p), 'partido'), { horas: 1 }).p;
    expect(r({ salud: 20 })).toBeGreaterThan(r({}));
    expect(r({ desgaste: 60 })).toBeGreaterThan(r({}));
    expect(r({ superficie: 'tierra' })).toBeGreaterThan(r({ superficie: 'artificial' }));
    expect(r({ superficie: 'artificial' })).toBeGreaterThan(r({ superficie: 'natural' }));
    expect(r({ clubDe: 'grande' })).toBeLessThan(r({ clubDe: 'pequeno' }));
  });
  it('el historial: una lesión en la zona sube el riesgo hasta ×1,5 y se va olvidando en un año; en otra zona no cuenta', () => {
    const curadas = [{ t: 'esguince' as const, z: 'tobillo' as const, alta: 100 }];
    expect(factorPorHistorial('tobillo', curadas, 100)).toBeCloseTo(1.5, 9);
    expect(factorPorHistorial('tobillo', curadas, 282)).toBeCloseTo(1.25, 2);
    expect(factorPorHistorial('tobillo', curadas, 465)).toBe(1);
    expect(factorPorHistorial('muslo', curadas, 100)).toBe(1);
    const sin = riesgoPorExposicion(perfilDeRiesgo(TIPICA(16, { dia: 100 }), 'partido'), { horas: 1 }).porTipo.esguince;
    const con = riesgoPorExposicion(perfilDeRiesgo(TIPICA(16, { dia: 100, curadas }), 'partido'), { horas: 1 }).porTipo.esguince;
    expect(con).toBeGreaterThan(sin);
  });
  it('el estirón: traumáticas ×1,25 en la ventana del pico y sobrecarga ×1,6 el año siguiente; el sexo, ligamento y sobrecarga ×2 en las chicas tras el pico', () => {
    expect(aniosDesdeElPico(12, 0, 'f')).toBe(0);
    expect(aniosDesdeElPico(12, 1, 'm')).toBe(-1);
    expect(factorPorEstiron('golpe', 0)).toBe(1.25);
    expect(factorPorEstiron('muscular', 0)).toBe(1);
    expect(factorPorEstiron('sobrecarga', 1)).toBe(1.6);
    expect(factorPorEstiron('sobrecarga', 3)).toBe(1);
    expect(factorPorEstiron('golpe', undefined)).toBe(1);
    expect(factorPorSexo('ligamento', 'f', 1)).toBe(2);
    expect(factorPorSexo('sobrecarga', 'f', 1)).toBe(2);
    expect(factorPorSexo('muscular', 'f', 1)).toBe(1);
    expect(factorPorSexo('ligamento', 'f', 0)).toBe(1);
    expect(factorPorSexo('ligamento', 'm', 3)).toBe(1);
    const chica = riesgoPorExposicion(perfilDeRiesgo(TIPICA(15, { sexo: 'f' }), 'partido'), { horas: 1 }).porTipo.ligamento;
    const chico = riesgoPorExposicion(perfilDeRiesgo(TIPICA(15, { sexo: 'm', madurez: 0 }), 'partido'), { horas: 1 }).porTipo.ligamento;
    expect(chica / chico).toBeCloseTo(2, 5);
  });
  it('el hueco del ciclo está reservado y no cambia nada todavía', () => {
    expect(factorPorCiclo(undefined)).toBe(1);
    expect(factorPorCiclo({ dia: 10 })).toBe(1);
    expect(perfilDeRiesgo(TIPICA(15, { sexo: 'f', ciclo: { dia: 3 } }), 'partido')).toEqual(perfilDeRiesgo(TIPICA(15, { sexo: 'f' }), 'partido'));
  });
  it('el club: solo los grandes tienen fisio incluido; sin club, nada', () => {
    expect(ATENCION_POR_TAMANO.grande.fisioIncluido).toBe(true);
    expect(ATENCION_POR_TAMANO.mediano.fisioIncluido).toBe(false);
    expect(ATENCION_POR_TAMANO.pequeno.fisioIncluido).toBe(false);
    expect(atencionDelClub(undefined)).toEqual({ fisioIncluido: false, prevencion: 1 });
  });
});

describe('la exposición del momento', () => {
  const perfil = perfilDeRiesgo(TIPICA(17), 'partido');
  it('más horas, más intensidad, más contacto y más cansancio suben la probabilidad; sin nada, un partido entero da lo normal', () => {
    const p = (e: Parameters<typeof riesgoPorExposicion>[1]) => riesgoPorExposicion(perfil, e).p;
    expect(p({ horas: 0 })).toBe(0);
    expect(p({ horas: 2 })).toBeGreaterThan(p({ horas: 1 }));
    expect(p({ horas: 1, intensidad: 'a_tope' })).toBeGreaterThan(p({ horas: 1 }));
    expect(p({ horas: 1, intensidad: 'relajado' })).toBeLessThan(p({ horas: 1 }));
    expect(p({ horas: 1, contacto: 0.9 })).toBeGreaterThan(p({ horas: 1, contacto: 0.1 }));
    expect(p({ horas: 1, cansancio: 80 })).toBeGreaterThan(p({ horas: 1, cansancio: 5 }));
    expect(-Math.log(1 - p({ horas: 1.5 }))).toBeCloseTo(0.014 * 1.5, 4);
  });
  it('el contacto mueve los golpes y el cansancio, los músculos', () => {
    const mucho = riesgoPorExposicion(perfil, { horas: 1, contacto: 1, cansancio: 0 }).porTipo;
    const poco = riesgoPorExposicion(perfil, { horas: 1, contacto: 0, cansancio: 90 }).porTipo;
    expect(mucho.golpe).toBeGreaterThan(poco.golpe);
    expect(poco.muscular).toBeGreaterThan(mucho.muscular);
  });
});

describe('sortear una lesión', () => {
  it('es estable: los mismos azares dan la misma lesión', () => {
    const r = riesgoPorExposicion(perfilDeRiesgo(TIPICA(16), 'partido'), { horas: 1 });
    expect(sortearLesion(r, 0.37, 0.61, TIPICA(16))).toEqual(sortearLesion(r, 0.37, 0.61, TIPICA(16)));
  });
  it('el reparto por tipo y la gravedad son los del plan (100.000 lesiones, partido y entrenamiento a partes iguales)', () => {
    const az = azares(7);
    const cuenta: Record<string, number> = {};
    let hasta7 = 0, graves = 0;
    const N = 100000;
    for (let i = 0; i < N; i++) {
      const r = riesgoPorExposicion(perfilDeRiesgo(TIPICA(16), i % 2 ? 'partido' : 'sesion'), { horas: 1 });
      const l = sortearLesion(r, az(), az(), TIPICA(16));
      cuenta[l.t] = (cuenta[l.t] ?? 0) + 1;
      if (l.d <= 7) hasta7++;
      if (l.d > 28) graves++;
      expect(l.d).toBeGreaterThanOrEqual(1);
      expect(l.n).toBe(l.d);
    }
    const objetivo = { golpe: 22, esguince: 20, muscular: 25, sobrecarga: 15, fractura: 3, conmocion: 3, ligamento: 1, otras: 11 };
    for (const t of TIPOS_DE_LESION) expect(Math.abs((100 * (cuenta[t] ?? 0)) / N - objetivo[t]), t).toBeLessThan(3);
    expect(hasta7 / N).toBeGreaterThan(0.5);
    expect(hasta7 / N).toBeLessThan(0.65);
    expect(graves / N).toBeGreaterThan(0.08);
    expect(graves / N).toBeLessThan(0.16);
  });
  it('las duraciones de cada tipo caen en su rango y suben con el azar', () => {
    expect(diasBaseDeLesion('golpe', 0)).toBe(1);
    expect(diasBaseDeLesion('ligamento', 0)).toBe(180);
    expect(diasBaseDeLesion('ligamento', 0.999999)).toBe(270);
    for (const t of TIPOS_DE_LESION) {
      let previa = 0;
      for (let a = 0; a < 1; a += 0.05) {
        const d = diasBaseDeLesion(t, a);
        expect(d).toBeGreaterThanOrEqual(previa);
        previa = d;
      }
    }
  });
  it('el fisio acorta las moderadas y graves pero no las leves; forzar la vuelta quita un cuarto; la constitución y la salud baja cuentan', () => {
    const p = { constitucion: 50, salud: 100 };
    expect(duracionDeLesion('golpe', 0.1, p, { fisio: true })).toBe(duracionDeLesion('golpe', 0.1, p));
    expect(duracionDeLesion('esguince', 0.6, p, { fisio: true })).toBeLessThan(duracionDeLesion('esguince', 0.6, p));
    expect(duracionDeLesion('esguince', 0.6, p, { forzado: true })).toBeLessThan(duracionDeLesion('esguince', 0.6, p));
    expect(duracionDeLesion('esguince', 0.6, { constitucion: 10, salud: 100 })).toBeGreaterThan(duracionDeLesion('esguince', 0.6, { constitucion: 90, salud: 100 }));
    expect(duracionDeLesion('esguince', 0.6, { constitucion: 50, salud: 20 })).toBeGreaterThan(duracionDeLesion('esguince', 0.6, p));
  });
});

describe('la baja en días, las fases y la recaída', () => {
  const l: Lesion = { t: 'muscular', z: 'muslo', d: 20, n: 20 };
  it('las semanas se derivan de los días hacia arriba', () => {
    expect(semanasDeBaja(0)).toBe(0);
    expect(semanasDeBaja(1)).toBe(1);
    expect(semanasDeBaja(7)).toBe(1);
    expect(semanasDeBaja(8)).toBe(2);
    expect(semanasDeBaja(20)).toBe(3);
  });
  it('pasan los días hasta el alta, y quien no tiene lesión no la gana', () => {
    expect(pasarDiasDeBaja(l, 7)).toEqual({ ...l, d: 13 });
    expect(pasarDiasDeBaja(l, 20)).toBeUndefined();
    expect(pasarDiasDeBaja(l, 99)).toBeUndefined();
    expect(pasarDiasDeBaja(undefined, 7)).toBeUndefined();
    expect(pasarDiasDeBaja(l, -5)).toEqual(l);
  });
  it('aguda el primer 40 %, rehabilitación después y vuelta con riesgo tras el alta', () => {
    expect(faseDeLesion(l)).toBe('aguda');
    expect(faseDeLesion({ ...l, d: 13 })).toBe('aguda');
    expect(faseDeLesion({ ...l, d: 12 })).toBe('rehabilitacion');
    expect(faseDeLesion({ ...l, d: 1 })).toBe('rehabilitacion');
    expect(faseTrasElAlta('muscular', 0)).toBe('vuelta');
    expect(faseTrasElAlta('muscular', DIAS_DE_VUELTA.muscular - 1)).toBe('vuelta');
    expect(faseTrasElAlta('muscular', DIAS_DE_VUELTA.muscular)).toBeUndefined();
  });
  it('el riesgo diario de recaída baja hasta cero y su suma es la probabilidad de la tabla (el triple, forzando)', () => {
    for (const t of [...TIPOS_DE_LESION, 'antigua' as const]) {
      let total = 0, previo = Infinity;
      for (let d = 0; d < VENTANA_DE_RECAIDA + 5; d++) {
        const r = riesgoDiarioDeRecaida(t, d);
        expect(r).toBeLessThanOrEqual(previo + 1e-12);
        previo = r;
        total += r;
      }
      expect(total, t).toBeCloseTo(RECAIDA_EN_8_SEMANAS[t], 2);
    }
    expect(riesgoDiarioDeRecaida('muscular', 3, true)).toBeCloseTo(3 * riesgoDiarioDeRecaida('muscular', 3), 9);
    expect(riesgoDiarioDeRecaida('muscular', -1)).toBe(0);
    expect(RECAIDA_EN_8_SEMANAS.muscular).toBe(0.12);
  });
  it('una recaída es del mismo tipo y zona y dura un 30 % más', () => {
    const p = { constitucion: 50, salud: 100 };
    const r = recaida({ t: 'muscular', z: 'muslo', alta: 10 }, 0.5, p);
    expect(r.t).toBe('muscular');
    expect(r.z).toBe('muslo');
    expect(r.d).toBe(Math.round(duracionDeLesion('muscular', 0.5, p) * 1.3));
    expect(recaida({ t: 'antigua', z: 'cuerpo', alta: 10 }, 0.5, p).t).toBe('muscular');
  });
});

describe('las secuelas', () => {
  it('solo las lesiones graves (más de 28 días) y no siempre: por probabilidad', () => {
    expect(probabilidadDeSecuela(28)).toBe(0);
    expect(probabilidadDeSecuela(5)).toBe(0);
    expect(probabilidadDeSecuela(29)).toBeGreaterThan(0.08);
    expect(probabilidadDeSecuela(270)).toBeGreaterThan(0.4);
    expect(probabilidadDeSecuela(10000)).toBe(0.5);
    expect(secuelaDeLesion({ z: 'tobillo', n: 20 }, 0, 0)).toBeUndefined();
    expect(secuelaDeLesion({ z: 'rodilla', n: 270 }, 0.99, 0)).toBeUndefined();
  });
  it('cuando la hay, quita de 1 a 3 de constitución según lo larga que fue, y a veces deja un perk latente de la zona', () => {
    expect(secuelaDeLesion({ z: 'muslo', n: 40 }, 0, 0)).toEqual({ constitucion: -1 });
    expect(secuelaDeLesion({ z: 'muslo', n: 70 }, 0, 0)).toEqual({ constitucion: -2 });
    expect(secuelaDeLesion({ z: 'rodilla', n: 270 }, 0, 0.1)).toEqual({ constitucion: -3, perkLatente: 'rodilla_delicada' });
    expect(secuelaDeLesion({ z: 'rodilla', n: 270 }, 0, 0.9)).toEqual({ constitucion: -3 });
  });
  it('una secuela de un cruzado ocurre en torno al 44 % de las veces', () => {
    const az = azares(11);
    let n = 0;
    for (let i = 0; i < 20000; i++) if (secuelaDeLesion({ z: 'rodilla', n: 270 }, az(), az())) n++;
    expect(n / 20000).toBeGreaterThan(0.4);
    expect(n / 20000).toBeLessThan(0.48);
  });
});

describe('la migración de las partidas guardadas con la baja en semanas', () => {
  it('pasa a días, de tipo antigua, y las semanas derivadas vuelven a ser las de antes', () => {
    expect(migrarBaja(undefined)).toBeUndefined();
    expect(migrarBaja(0)).toBeUndefined();
    for (let semanas = 1; semanas <= 12; semanas++) {
      const l = migrarBaja(semanas)!;
      expect(l).toEqual({ t: 'antigua', z: 'cuerpo', d: 7 * semanas, n: 7 * semanas });
      expect(semanasDeBaja(l.d)).toBe(semanas);
    }
  });
});
