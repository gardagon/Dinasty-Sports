/**
 * Desglose del coste de jugar con la ciudad grande: cuánto cuesta crear, cuánto la pasada semanal de los PNJ (la que hace el motor al cruzar de semana), el paso de un día normal, y listar las acciones (lo que pide la
 * pantalla tras cada acción). `npx tsx tools/rendimiento-semana.ts [--ciudad]`; con `node --import tsx --cpu-prof` se ve el perfil por función de cada parte (usa `--solo crear|semanas|dias|listar`).
 */
import { PAIS_CIUDAD_GRANDE, PAIS_CIUDAD_GRANDE_SIN_HOGARES, registrarPais } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { aplicarPropuestas } from './propuestas-pnj';

const args = process.argv.slice(2);
const ciudad = args.includes('--ciudad');
/** Con `--sin-futbol`, la ciudad grande solo con el atletismo (para ver cuánto pone el fútbol). */
const conFutbol = !args.includes('--sin-futbol');
const solo = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : undefined;
const t = <T>(f: () => T): [T, number] => { const t0 = performance.now(); const r = f(); return [r, performance.now() - t0]; };
/** La ciudad grande; con `DS_SIN_HOGARES=1`, sin hogares (el mundo de antes del 24/11: `docs/relevo/hogares.md`). */
const PAIS = process.env.DS_SIN_HOGARES ? PAIS_CIUDAD_GRANDE_SIN_HOGARES : PAIS_CIUDAD_GRANDE;
if (ciudad) registrarPais(PAIS);
aplicarPropuestas();
const [g, crear] = t(() => nuevaPartida({ seed: 31, ...(ciudad ? { pais: PAIS.id, deportes: conFutbol ? ['atletismo', 'futbol'] : ['atletismo'] } : {}) }, ciudad && conFutbol ? [...MODULOS, futbol] : MODULOS));
console.log(`crear: ${crear.toFixed(0)} ms`);
if (solo === 'crear') process.exit(0);
// Avanza minuto a minuto con «descansar» (5 min) y mide cada paso; los pasos que cruzan de semana son los caros.
const normal: number[] = [];
const semana: number[] = [];
const dia: number[] = [];
let w = g.time.week;
let d = g.time.day;
const limite = (g.time.week + 6) * 7 * 1440;
if (solo !== 'listar') {
  while (g.time.minute < limite) {
    const [, ms] = t(() => g.perform('gen.descansar'));
    if (g.time.week !== w) { semana.push(ms); w = g.time.week; d = g.time.day; }
    else if (g.time.day !== d) { dia.push(ms); d = g.time.day; }
    else normal.push(ms);
  }
  const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
  const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  console.log(`6 semanas con «descansar» (5 min): ${normal.length} pasos normales, mediana ${med(normal).toFixed(3)} ms, total ${suma(normal).toFixed(0)} ms`);
  console.log(`  cruces de día: ${dia.length}, mediana ${med(dia).toFixed(2)} ms, total ${suma(dia).toFixed(0)} ms`);
  console.log(`  cruces de semana: ${semana.length}, ${semana.map((x) => x.toFixed(0)).join(' / ')} ms (pasada semanal de los PNJ)`);
}
if (!solo || solo === 'listar') {
  const veces: number[] = [];
  for (let i = 0; i < 20; i++) { g.perform('gen.descansar'); veces.push(t(() => g.listActions())[1]); }
  console.log(`listActions() (todas las acciones, tras avanzar): mediana ${[...veces].sort((a, b) => a - b)[10].toFixed(1)} ms (mín ${Math.min(...veces).toFixed(1)}, máx ${Math.max(...veces).toFixed(1)})`);
}
