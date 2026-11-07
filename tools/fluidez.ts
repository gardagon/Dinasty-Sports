/**
 * Fluidez (P2c, decisión del usuario 05/11/2026): crear la partida puede pesar (hasta unos 30 s, con una pantalla de «creando el mundo»); lo que importa es que el juego fluya: lo que
 * tarda cada acción, avanzar una semana con todos los partidos (objetivo: menos de ~1 s) y guardar sin que se note. Se mide con la población de ahora, el doble y por cinco.
 * `npm run fluidez` (o `npx tsx tools/fluidez.ts [semanas] [factores...]`, p. ej. `1 2 5`).
 */
import { CIUDAD_ACTUAL, PAIS_CIUDAD_GRANDE, PAIS_ESPANA, registrarPais, type CiudadDef, type PaisDef } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { deportistaDe, type BotMemory } from '../sim/src/bots';
import { hacer, opcionesDelBot } from '../sim/src/pasos';
import { hacer as hacerAccion } from '../tests/ayudas';
import { seededRng } from '@ds/core';

const SEMANAS = Number(process.argv[2] ?? 12);
/** `grande` es la ciudad grande del diseño; un número, la ciudad de ahora multiplicada. */
const FACTORES: (number | 'grande')[] = process.argv.length > 3 ? process.argv.slice(3).map((x) => (x === 'grande' ? 'grande' : Number(x))) : [1, 2, 5];
const f = (x: number): string => (x >= 100 ? x.toFixed(0) : x.toFixed(1));
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const p95 = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(0.95 * (xs.length - 1))] ?? 0;
const t = <T>(fn: () => T): [T, number] => {
  const t0 = performance.now();
  const r = fn();
  return [r, performance.now() - t0];
};

/** La ciudad de ahora con `k` veces la gente: k veces los colegios de fuera, las clases del colegio del personaje y los vecinos (los clubes y sus equipos no cambian: los abre la demanda). */
const ciudadPor = (k: number): CiudadDef => ({
  ...CIUDAD_ACTUAL,
  colegiosDeFuera: CIUDAD_ACTUAL.colegiosDeFuera * k,
  aulasPorCurso: CIUDAD_ACTUAL.aulasPorCurso * k,
  vecinos: CIUDAD_ACTUAL.vecinos * k,
});
const paisPor = (k: number | 'grande'): PaisDef => {
  if (k === 'grande') return PAIS_CIUDAD_GRANDE;
  const id = `espana_x${k}`;
  const copia = structuredClone(PAIS_ESPANA) as PaisDef;
  return { ...copia, id, calendario: { ...copia.calendario, id }, ciudad: ciudadPor(k) };
};

console.log(`Fluidez: ${SEMANAS} semanas de curso, fútbol y atletismo, factores de población ${FACTORES.join(', ')}\n`);
console.log('| Población | Personas | Futbolistas | Crear (s) | Estado (KB) | Guardar (ms) | Cargar (s) | Acción media / p95 / máx (ms) | Apuntarse (ms) | Semana media / máx (ms) |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const k of FACTORES) {
  const pais = paisPor(k);
  registrarPais(pais);
  const [g, crear] = t(() => nuevaPartida({ seed: 31, pais: k === 1 ? undefined : pais.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]));
  const npcs = (g.moduleState('npcs') as { npcs: { deporte?: string }[] }).npcs;
  const [json] = t(() => JSON.stringify(g.serialize()));
  // Las acciones y las semanas del bot del montón (entrena, va a clase, juega): el coste de cada acción y de avanzar una semana entera (con todos los partidos del mundo).
  const bot = deportistaDe('futbol');
  const rng = seededRng(7);
  const mem: BotMemory = { day: -1, hoy: {}, total: {} };
  const acciones: number[] = [];
  const semanas: number[] = [];
  const guardados: number[] = [];
  advanceToWeek(g, 'gen.descansar', 1, 2, 17);
  // Apuntarse al club del colegio (la acción que mide al desplazado y le busca club): lo que tarda, con lo que cuesta ir hasta allí.
  const [, apuntarse] = t(() => hacerAccion(g, 'futbol.apuntarse_colegio'));
  let semana = g.time.week;
  let enLaSemana = 0; // lo que tarda el juego en la semana (sus acciones), sin lo que tarda el bot en mirar qué hacer
  while (g.time.week < SEMANAS + 1) {
    if (mem.day !== g.time.day) {
      mem.day = g.time.day;
      mem.hoy = {};
    }
    const opts = opcionesDelBot(g);
    if (!opts.length) break;
    const [, ms] = t(() => hacer(g, opts, bot.choose(g, opts, rng, mem)));
    acciones.push(ms);
    enLaSemana += ms;
    if (g.time.week !== semana) {
      semanas.push(enLaSemana);
      enLaSemana = 0;
      semana = g.time.week;
      guardados.push(t(() => g.serializarJSON()).at(-1) as number);
    }
  }
  console.log(`  (×${k}, cada semana en ms: ${semanas.map((x) => x.toFixed(0)).join(' ')})`);
  const texto = JSON.stringify(g.serialize());
  const [, cargar] = t(() => cargarPartida(JSON.parse(texto), [...MODULOS, futbol], { copiar: false }));
  console.log(
    `| ×${k} | ${npcs.length} | ${npcs.filter((n) => n.deporte === 'futbol').length} | ${f(crear / 1000)} | ${f(json.length / 1024)} | ${f(media(guardados))} | ${f(cargar / 1000)} | ${f(media(acciones))} / ${f(p95(acciones))} / ${f(Math.max(...acciones))} | ${f(apuntarse)} | ${f(media(semanas))} / ${f(Math.max(...semanas))} |`,
  );
}
