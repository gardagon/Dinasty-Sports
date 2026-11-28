/**
 * AJUSTE DEL NIVEL GRUESO DE LOS PARTIDOS (`modules/futbol/src/partido-grueso.ts`): juega partidos con el motor de posesiones y ocasiones entre equipos sintéticos de todos los niveles, categorías y desequilibrios, y ajusta con
 * una regresión de Poisson (mínimos cuadrados reponderados) los goles y los tiros de cada equipo frente a lo que valen los dos. Imprime los coeficientes para `PARAMETROS_DEL_NIVEL_GRUESO`.
 * `npx tsx tools/partidos-grueso-ajuste.ts [partidos = 8000] [semilla = 1]`. Si se toca el motor, se vuelve a pasar y se pegan los coeficientes nuevos.
 */
import { rngEstable, type LectorDePersona } from '@ds/contracts';
import { caracteristicas, fuerzasAlEmpezar, jugarPartido, POTENCIADOR_POR_CATEGORIA, type EquipoDePartido, type JugadorDePartido } from '@ds/mod-futbol';

const N = Number(process.argv[2] ?? 8000);
const SEMILLA = Number(process.argv[3] ?? 1);
const TITULARES = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CDM', 'LW', 'RW', 'ST'];
const SUPLENTES = ['GK', 'CB', 'CM', 'LW', 'ST'];

/** Un equipo sintético: un nivel de equipo, un desfase propio del portero y un ruido por jugador y habilidad (cada uno es distinto). */
export function equipoSintetico(id: string, nivel: number, porteria: number, rinde: number): EquipoDePartido {
  return {
    id, nombre: id,
    jugadores: [...TITULARES.map((p) => [p, true] as const), ...SUPLENTES.map((p) => [p, false] as const)].map(([puesto, titular], i): JugadorDePartido => {
      const memo = new Map<string, number>();
      const lector: LectorDePersona = {
        stat: (stat) => {
          let v = memo.get(stat);
          if (v === undefined) {
            const base = puesto === 'GK' && !stat.startsWith('gen.') ? nivel * porteria : nivel;
            v = Math.min(100, base * Math.exp(0.25 * (rngEstable('sint', id, i, stat).next() * 2 - 1)));
            memo.set(stat, v);
          }
          return v;
        },
        norm: (stat) => (stat === 'gen.resistencia' ? 0.3 + 0.4 * rngEstable('res', id, i).next() : 0.5),
        inmutable: true,
      };
      return { id: `${id}_${i}`, nombre: id, puesto, titular, rinde, energia: 70 + ((i * 7) % 30), lector };
    }),
  };
}

const CATEGORIAS = Object.keys(POTENCIADOR_POR_CATEGORIA).filter((c) => c !== 'prebenjamin');

/** Mínimos cuadrados reponderados de una regresión de Poisson: devuelve los coeficientes. */
function poissonGLM(X: number[][], y: number[]): { beta: number[]; pearson: number } {
  const k = X[0].length;
  let beta = new Array<number>(k).fill(0);
  beta[0] = Math.log(Math.max(1e-3, y.reduce((a, b) => a + b, 0) / y.length));
  for (let it = 0; it < 25; it++) {
    const A = Array.from({ length: k }, () => new Array<number>(k).fill(0));
    const b = new Array<number>(k).fill(0);
    for (let n = 0; n < X.length; n++) {
      const eta = X[n].reduce((t, x, j) => t + x * beta[j], 0);
      const mu = Math.exp(Math.max(-8, Math.min(5, eta)));
      const z = eta + (y[n] - mu) / mu;
      for (let i = 0; i < k; i++) {
        b[i] += mu * z * X[n][i];
        for (let j = 0; j < k; j++) A[i][j] += mu * X[n][i] * X[n][j];
      }
    }
    // Resolver A·beta = b (eliminación de Gauss con pivote).
    const M = A.map((fila, i) => [...fila, b[i]]);
    for (let c = 0; c < k; c++) {
      let p = c;
      for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < k; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j];
      }
    }
    beta = M.map((fila, i) => fila[k] / fila[i]);
  }
  let chi = 0;
  for (let n = 0; n < X.length; n++) {
    const mu = Math.exp(X[n].reduce((t, x, j) => t + x * beta[j], 0));
    chi += (y[n] - mu) ** 2 / mu;
  }
  return { beta, pearson: chi / (X.length - k) };
}

const rng = rngEstable('ajuste-grueso', SEMILLA);
const X: number[][] = [];
const goles: number[] = [];
const tiros: number[] = [];
for (let i = 0; i < N; i++) {
  const cat = CATEGORIAS[Math.floor(rng.next() * CATEGORIAS.length)];
  // El nivel del partido (en escala de adulto: el de una liga de verdad, de 3 a 4 goles por partido) se reparte entre las categorías con su potenciador; cada equipo se desvía un 15 % de él, el portero un 30 % y cada jugador, cada habilidad, un 25 %.
  const nivel = (28 * Math.exp(0.3 * rng.normal())) / POTENCIADOR_POR_CATEGORIA[cat];
  const a = equipoSintetico(`a${i}`, nivel * Math.exp(0.15 * rng.normal()), Math.exp(0.3 * rng.normal()), 0.9 + 0.15 * rng.next());
  const b = equipoSintetico(`b${i}`, nivel * Math.exp(0.15 * rng.normal()), Math.exp(0.3 * rng.normal()), 0.9 + 0.15 * rng.next());
  const [fa, fb] = fuerzasAlEmpezar(a, b, cat);
  const r = jugarPartido(a, b, { id: `aj${i}`, semilla: SEMILLA, categoria: cat, cambios: { maximo: 5, despuesDeTramos: [1, 3, 4] } });
  X.push(caracteristicas(fa, fb, true), caracteristicas(fb, fa, false));
  goles.push(r.goles[0], r.goles[1]);
  tiros.push(r.tiros[0], r.tiros[1]);
}
const g = poissonGLM(X, goles);
const t = poissonGLM(X, tiros);
const f = (xs: number[]): string => `[${xs.map((x) => x.toFixed(4)).join(', ')}]`;
console.log(`Ajuste con ${N} partidos del motor (${2 * N} equipos-partido): goles medios ${(goles.reduce((a, b) => a + b, 0) / goles.length).toFixed(2)}, tiros medios ${(tiros.reduce((a, b) => a + b, 0) / tiros.length).toFixed(1)}`);
console.log(`goles: ${f(g.beta)}   (χ² de Pearson / gl = ${g.pearson.toFixed(3)}; 1 = Poisson puro)`);
console.log(`tiros: ${f(t.beta)}   (χ² de Pearson / gl = ${t.pearson.toFixed(3)})`);
