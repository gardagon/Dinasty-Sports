/**
 * Perfil de CPU de un tramo de la partida con la ciudad grande (para repartir el coste entre sus partes con `tools/perfil-resumen.ts`). Usa el inspector de Node: solo se perfila el tramo pedido, no el resto.
 *
 *   npx tsx tools/perfil-segmento.ts <crear|semanas-sin-liga|semanas-con-liga> [--ciudad] [--salida carpeta] [--semanas-con-liga 7]
 *
 * - `crear`: `nuevaPartida` (con la ciudad grande y el fútbol con `--ciudad`).
 * - `semanas-sin-liga`: las 3 primeras semanas tras crear (pretemporada: la pasada semanal de los PNJ sin jornada de liga).
 * - `semanas-con-liga`: se crea, se avanzan 3 semanas sin perfilar y se perfilan las siguientes (7 por defecto: pasada semanal + jornada de liga de ~75 partidos).
 * Escribe `<salida>/<tramo>.cpuprofile` (por defecto, el directorio actual) y el tiempo del tramo por consola. No cambia el juego.
 */
import { writeFileSync } from 'node:fs';
import { Session } from 'node:inspector/promises';
import { join } from 'node:path';
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';

const args = process.argv.slice(2);
const tramo = args[0];
const ciudad = args.includes('--ciudad');
const salida = args.includes('--salida') ? args[args.indexOf('--salida') + 1] : '.';
const nSemanas = args.includes('--semanas-con-liga') ? Number(args[args.indexOf('--semanas-con-liga') + 1]) : 7;
if (!tramo || !['crear', 'semanas-sin-liga', 'semanas-con-liga'].includes(tramo)) throw new Error('Uso: perfil-segmento.ts <crear|semanas-sin-liga|semanas-con-liga> [--ciudad]');
if (ciudad) registrarPais(PAIS_CIUDAD_GRANDE);
const crear = () => nuevaPartida({ seed: 31, ...(ciudad ? { pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] } : {}) }, ciudad ? [...MODULOS, futbol] : MODULOS);

const sesion = new Session();
sesion.connect();
await sesion.post('Profiler.enable');
// Muestreo cada 100 µs (el de Node por defecto, 1 ms, deja pocas muestras en tramos de menos de un segundo).
await sesion.post('Profiler.setSamplingInterval', { interval: 100 });
const medir = async <T>(f: () => T): Promise<[T, number]> => {
  await sesion.post('Profiler.start');
  const t0 = performance.now();
  const r = f();
  const ms = performance.now() - t0;
  const { profile } = (await sesion.post('Profiler.stop')) as { profile: unknown };
  writeFileSync(join(salida, `${tramo}.cpuprofile`), JSON.stringify(profile));
  return [r, ms];
};
const semanas = (g: ReturnType<typeof crear>, n: number): void => {
  const limite = g.time.week + n;
  while (g.time.week < limite) if (!g.perform('gen.descansar').ok) g.perform('gen.esperar');
};
if (tramo === 'crear') {
  const [, ms] = await medir(crear);
  console.log(`crear: ${ms.toFixed(0)} ms`);
} else if (tramo === 'semanas-sin-liga') {
  const g = crear();
  const [, ms] = await medir(() => semanas(g, 3));
  console.log(`3 semanas sin liga: ${ms.toFixed(0)} ms`);
} else {
  const g = crear();
  semanas(g, 3);
  const [, ms] = await medir(() => semanas(g, nSemanas));
  console.log(`${nSemanas} semanas con liga: ${ms.toFixed(0)} ms (${(ms / nSemanas).toFixed(0)} ms por semana, con el paso normal y los cruces de día)`);
}
sesion.disconnect();
