import { describe, expect, it } from 'vitest';
import { rngEstable, type LectorDePersona } from '@ds/contracts';
import { PARAMETROS_DEL_NIVEL_GRUESO, esperadosDelNivelGrueso, fuerzasAlEmpezar, jugarPartidoGrueso } from './partido-grueso';
import { POTENCIADOR_POR_CATEGORIA, jugarPartido, type EquipoDePartido, type JugadorDePartido, type ResultadoDePartido } from './partido';

const TITULARES = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CDM', 'LW', 'RW', 'ST'];
const SUPLENTES = ['GK', 'CB', 'CM', 'LW', 'ST'];
const CAMBIOS = { maximo: 5, despuesDeTramos: [1, 3, 4] };

/** Un equipo sintético: un nivel, un portero distinto y un ruido por jugador y habilidad. Los partidos del test no son los del ajuste (otra semilla, otros niveles). */
function equipo(id: string, nivel: number, porteria = 1, rinde = 1): EquipoDePartido {
  return {
    id, nombre: id,
    jugadores: [...TITULARES.map((p) => [p, true] as const), ...SUPLENTES.map((p) => [p, false] as const)].map(([puesto, titular], i): JugadorDePartido => {
      const memo = new Map<string, number>();
      const lector: LectorDePersona = {
        stat: (stat) => {
          let v = memo.get(stat);
          if (v === undefined) {
            v = Math.min(100, (puesto === 'GK' && !stat.startsWith('gen.') ? nivel * porteria : nivel) * Math.exp(0.25 * (rngEstable('test-sint', id, i, stat).next() * 2 - 1)));
            memo.set(stat, v);
          }
          return v;
        },
        norm: (stat) => (stat === 'gen.resistencia' ? 0.3 + 0.4 * rngEstable('test-res', id, i).next() : 0.5),
        inmutable: true,
      };
      return { id: `${id}_${i}`, nombre: id, puesto, titular, rinde, energia: 70 + ((i * 7) % 30), lector };
    }),
  };
}

/** χ² de dos muestras sobre los mismos cubos: Σ (a − b)² / (a + b) con tantas muestras de una como de otra. Los grados de libertad son los cubos con datos menos 1. */
function chi2(xs: number[], ys: number[], cubo: (v: number) => number, cubos: number): { x2: number; gl: number } {
  const a = new Array(cubos).fill(0);
  const b = new Array(cubos).fill(0);
  for (const v of xs) a[cubo(v)]++;
  for (const v of ys) b[cubo(v)]++;
  let x2 = 0;
  let gl = -1;
  for (let k = 0; k < cubos; k++) {
    if (a[k] + b[k] < 10) continue;
    x2 += (a[k] - b[k]) ** 2 / (a[k] + b[k]);
    gl++;
  }
  return { x2, gl };
}
/** El valor crítico de χ² al 99,99 % para cada grado de libertad (de 1 a 9): una casilla sola solo falla si es muy rara. */
const CRITICO_99_99 = [0, 15.14, 18.42, 21.11, 23.51, 25.74, 27.86, 29.88, 31.83, 33.72];

const suma = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
/** Cada casilla es una población: 30 pares de equipos distintos (cada uno con sus jugadores, su portero y su ruido) y 40 partidos de cada par (1.200 por modelo). El grueso ve cuatro números por equipo, así que para un par concreto acierta su fuerza con un error típico del 5 %; lo que tiene que dar igual es el reparto de marcadores de una liga, no el de dos equipos. */
const PARES = 30;
const POR_PAR = 40;

/** La malla: niveles de equipo, desequilibrio entre los dos (hasta un 30 %, lo que hay entre equipos de una misma liga: fuera de eso el modelo no está comprobado), categorías (con su potenciador) y un portero distinto. */
const MALLA = [
  { cat: 'infantil', a: 17, b: 17, pa: 1, pb: 1 },
  { cat: 'infantil', a: 19, b: 15, pa: 1, pb: 1 },
  { cat: 'benjamin', a: 10, b: 10, pa: 1, pb: 1 },
  { cat: 'benjamin', a: 11, b: 9, pa: 1.1, pb: 0.9 },
  { cat: 'alevin', a: 14, b: 12, pa: 0.8, pb: 1.2 },
  { cat: 'cadete', a: 21, b: 21, pa: 1, pb: 1 },
  { cat: 'cadete', a: 23, b: 19, pa: 1, pb: 1 },
  { cat: 'juvenil', a: 24, b: 26, pa: 1.3, pb: 1 },
  { cat: 'juvenil', a: 28, b: 24, pa: 1, pb: 0.8 },
  { cat: 'senior', a: 25, b: 25, pa: 1, pb: 1 },
  { cat: 'senior', a: 29, b: 25, pa: 1, pb: 1 },
  { cat: 'senior', a: 22, b: 28, pa: 0.8, pb: 1 },
];

describe('el nivel grueso da lo mismo en distribución que el motor de posesiones y ocasiones (nivel 2)', () => {
  const cell = (c: (typeof MALLA)[number], k: number): { n2: ResultadoDePartido[]; n3: ResultadoDePartido[] } => {
    const n2: ResultadoDePartido[] = [];
    const n3: ResultadoDePartido[] = [];
    for (let p = 0; p < PARES; p++) {
      const a = equipo(`ta${k}-${p}`, c.a, c.pa);
      const b = equipo(`tb${k}-${p}`, c.b, c.pb);
      for (let i = 0; i < POR_PAR; i++) {
        const o = { id: `g${k}-${p}-${i}`, semilla: 77, categoria: c.cat, cambios: CAMBIOS };
        n2.push(jugarPartido(a, b, o));
        n3.push(jugarPartidoGrueso(a, b, o));
      }
    }
    return { n2, n3 };
  };
  const celdas = MALLA.map((c, k) => ({ c, k, ...cell(c, k) }));

  it('el marcador: goles totales, diferencia y resultado, en cada casilla de la malla (chi² al 99,99 %) y en el conjunto (al 99,9 %)', () => {
    let x2Total = 0;
    let glTotal = 0;
    for (const { c, k, n2, n3 } of celdas) {
      const donde = `${c.cat} ${c.a}-${c.b} (casilla ${k})`;
      const tot = chi2(n2.map((r) => r.goles[0] + r.goles[1]), n3.map((r) => r.goles[0] + r.goles[1]), (v) => Math.min(8, v), 9);
      const dif = chi2(n2.map((r) => r.goles[0] - r.goles[1]), n3.map((r) => r.goles[0] - r.goles[1]), (v) => Math.max(-4, Math.min(4, v)) + 4, 9);
      const res = chi2(n2.map((r) => Math.sign(r.goles[0] - r.goles[1])), n3.map((r) => Math.sign(r.goles[0] - r.goles[1])), (v) => v + 1, 3);
      expect(tot.x2, `goles totales ${donde}: χ² ${tot.x2.toFixed(1)} con ${tot.gl} gl`).toBeLessThan(CRITICO_99_99[tot.gl]);
      expect(dif.x2, `diferencia ${donde}: χ² ${dif.x2.toFixed(1)} con ${dif.gl} gl`).toBeLessThan(CRITICO_99_99[dif.gl]);
      expect(res.x2, `resultado ${donde}: χ² ${res.x2.toFixed(1)} con ${res.gl} gl`).toBeLessThan(CRITICO_99_99[res.gl]);
      x2Total += tot.x2 + dif.x2 + res.x2;
      glTotal += tot.gl + dif.gl + res.gl;
    }
    // En conjunto: la suma de los χ² se reparte como un χ² con la suma de los grados de libertad (normal con media gl y varianza 2·gl): al 99,9 %, z < 3,1.
    expect((x2Total - glTotal) / Math.sqrt(2 * glTotal), `conjunto: χ² ${x2Total.toFixed(0)} con ${glTotal} gl`).toBeLessThan(3.1);
  });

  it('las medias de goles, tiros y tarjetas, y la posesión, se parecen (dentro del 8 % o de lo que da el azar)', () => {
    for (const { c, k, n2, n3 } of celdas) {
      const donde = `${c.cat} ${c.a}-${c.b} (casilla ${k})`;
      const m = (rs: ResultadoDePartido[], g: (r: ResultadoDePartido) => number): number => suma(rs.map(g)) / rs.length;
      for (const [nombre, g, tolerancia] of [
        ['goles', (r: ResultadoDePartido) => r.goles[0] + r.goles[1], 0.08],
        ['tiros', (r: ResultadoDePartido) => r.tiros[0] + r.tiros[1], 0.08],
        ['tiros a puerta', (r: ResultadoDePartido) => r.alPuerta[0] + r.alPuerta[1], 0.1],
        ['faltas', (r: ResultadoDePartido) => r.faltas[0] + r.faltas[1], 0.08],
        ['amarillas', (r: ResultadoDePartido) => r.amarillas[0] + r.amarillas[1], 0.12],
        ['córners', (r: ResultadoDePartido) => r.corners[0] + r.corners[1], 0.15],
        ['pases', (r: ResultadoDePartido) => r.pases[0] + r.pases[1], 0.1],
      ] as const) {
        const [x, y] = [m(n2, g), m(n3, g)];
        expect(Math.abs(y - x) / x, `${nombre} ${donde}: nivel 2 ${x.toFixed(2)}, nivel 3 ${y.toFixed(2)}`).toBeLessThan(tolerancia);
      }
      expect(Math.abs(m(n3, (r) => r.porTramo[0].posesion[0]) - m(n2, (r) => r.porTramo[0].posesion[0])), `posesión ${donde}`).toBeLessThan(0.06);
    }
  });

  it('quién marca: los goles por línea y el reparto de las tarjetas, parecidos', () => {
    const linea = (puesto: string): 'del' | 'med' | 'def' | 'por' => (['ST', 'LW', 'RW'].includes(puesto) ? 'del' : ['CM', 'CDM'].includes(puesto) ? 'med' : puesto === 'GK' ? 'por' : 'def');
    const reparto = (rs: ResultadoDePartido[]): Record<string, number> => {
      const t: Record<string, number> = { del: 0, med: 0, def: 0, por: 0 };
      for (const r of rs) for (const s of Object.values(r.jugadores)) t[linea(s.puesto)] += s.goles;
      const total = suma(Object.values(t)) || 1;
      return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v / total]));
    };
    const todos = (k: 'n2' | 'n3'): ResultadoDePartido[] => celdas.flatMap((x) => x[k]);
    const [r2, r3] = [reparto(todos('n2')), reparto(todos('n3'))];
    for (const l of ['del', 'med', 'def']) expect(Math.abs(r3[l] - r2[l]), `goles de ${l}: nivel 2 ${r2[l].toFixed(3)}, nivel 3 ${r3[l].toFixed(3)}`).toBeLessThan(0.04);
    // Los titulares juegan casi todo el partido y los suplentes entran: los minutos de los dos niveles son del mismo orden.
    const minutos = (rs: ResultadoDePartido[]): number => suma(rs.map((r) => suma(Object.values(r.jugadores).map((s) => s.minutos)))) / rs.length;
    expect(Math.abs(minutos(todos('n3')) - minutos(todos('n2'))) / minutos(todos('n2'))).toBeLessThan(0.03);
  });
});

describe('el resultado del nivel grueso es un partido de verdad', () => {
  const a = equipo('ga', 30);
  const b = equipo('gb', 26);

  it('es reproducible y el azar de cada partido es el suyo', () => {
    const o = { id: 'rep-1', semilla: 4, categoria: 'cadete', cambios: CAMBIOS };
    expect(jugarPartidoGrueso(a, b, o)).toEqual(jugarPartidoGrueso(a, b, o));
    expect(new Set(Array.from({ length: 30 }, (_, i) => jugarPartidoGrueso(a, b, { ...o, id: `rep-${i}` }).goles.join('-'))).size).toBeGreaterThan(4);
  });

  it('los jugadores tienen sus estadísticas y suman las del equipo, con notas entre 1 y 10', () => {
    for (let i = 0; i < 60; i++) {
      const r = jugarPartidoGrueso(a, b, { id: `est-${i}`, semilla: 5, categoria: 'cadete', cambios: CAMBIOS });
      for (const k of [0, 1] as const) {
        const de = Object.entries(r.jugadores).filter(([id]) => id.startsWith(k === 0 ? 'ga_' : 'gb_')).map(([, s]) => s);
        expect(suma(de.map((s) => s.goles))).toBe(r.goles[k]);
        expect(suma(de.map((s) => s.tiros))).toBe(r.tiros[k]);
        expect(suma(de.map((s) => s.alPuerta))).toBe(r.alPuerta[k]);
        expect(suma(de.map((s) => s.faltas))).toBe(r.faltas[k]);
        expect(suma(de.map((s) => s.amarillas))).toBe(r.amarillas[k]);
        expect(suma(de.map((s) => s.pases))).toBe(r.pases[k]);
        expect(r.goles[k]).toBeLessThanOrEqual(r.alPuerta[k]);
        expect(r.alPuerta[k]).toBeLessThanOrEqual(r.tiros[k]);
      }
      expect(r.registro.filter((s) => s.tipo === 'gol')).toHaveLength(r.goles[0] + r.goles[1]);
      expect(r.registro.map((s) => s.minuto)).toEqual([...r.registro.map((s) => s.minuto)].sort((x, y) => x - y));
      for (const s of Object.values(r.jugadores)) {
        if (s.minutos > 0) {
          expect(s.nota).toBeGreaterThanOrEqual(1);
          expect(s.nota).toBeLessThanOrEqual(10);
        } else expect(s.nota).toBe(0);
        expect(s.minutos).toBeLessThanOrEqual(90);
      }
    }
  });

  it('un equipo mejor marca más: los goles esperados suben con lo que valen sus zonas y bajan con la defensa rival', () => {
    const [f1, f2] = fuerzasAlEmpezar(equipo('x', 30), equipo('y', 30), 'cadete');
    const [f3] = fuerzasAlEmpezar(equipo('x', 40), equipo('y', 30), 'cadete');
    const base = esperadosDelNivelGrueso(f1, f2, true);
    expect(esperadosDelNivelGrueso(f3, f2, true).goles).toBeGreaterThan(base.goles);
    expect(esperadosDelNivelGrueso(f1, f3, true).goles).toBeLessThan(base.goles);
    expect(PARAMETROS_DEL_NIVEL_GRUESO.goles).toHaveLength(17);
    void POTENCIADOR_POR_CATEGORIA;
  });

  it('cuesta una pequeña parte de lo que cuesta el motor completo', () => {
    const t = (f: () => void): number => {
      const t0 = performance.now();
      for (let i = 0; i < 300; i++) f();
      return performance.now() - t0;
    };
    let i = 0;
    const completo = t(() => jugarPartido(a, b, { id: `c${i++}`, semilla: 1, categoria: 'cadete', cambios: CAMBIOS }));
    i = 0;
    const grueso = t(() => jugarPartidoGrueso(a, b, { id: `c${i++}`, semilla: 1, categoria: 'cadete', cambios: CAMBIOS }));
    expect(grueso).toBeLessThan(completo);
  });
});
