import { MODULOS } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { deportistaDe } from './bots';
import { runBot, type RunResult } from './runner';

/**
 * Cuánto se aprende en un curso con el club: un deportista de fútbol frente a uno de atletismo (el mismo plan), en partidas de un solo deporte.
 * Se suman los puntos que suben las habilidades del deporte en el curso (la suma de lo que cambia cada una) y se cuentan las sesiones con el club.
 * La sesión de fútbol elige dos ejercicios: lo que se aprende por sesión tiene que quedar parecido al del atletismo.
 *
 *   npm run sim:futbol -- [días] [semillas]
 */

const dias = Number(process.argv[2] ?? 365);
const semillas = Number(process.argv[3] ?? 5);

/** Habilidades del deporte (sin el conocimiento) y su conocimiento. */
const habilidades = (r: RunResult, deporte: string) => Object.keys(r.final.stats).filter((id) => id.startsWith(`${deporte}.`) && id !== `${deporte}.conocimiento`);
const sube = (r: RunResult, ids: string[]) => ids.reduce((t, id) => t + (r.final.stats[id] - r.snapshots[0].stats[id]), 0);

const filas: string[][] = [];
for (const [deporte, juego] of [
  ['atletismo', {}],
  ['futbol', { modulos: [...MODULOS, futbol], deportes: ['futbol'] }],
] as const) {
  const bot = deportistaDe(deporte);
  const resultados = Array.from({ length: semillas }, (_, i) => runBot(bot, i + 1, dias, juego));
  const media = (f: (r: RunResult) => number) => resultados.reduce((t, r) => t + f(r), 0) / resultados.length;
  const ids = habilidades(resultados[0], deporte);
  // Una sesión del club dura unas dos horas (de 15 a 17): los minutos de club dan una idea de cuántas hizo (el fútbol empieza con el equipo completo y el bot tarda en ganarse la plaza).
  const sesiones = media((r) => (r.minutesByTag.club ?? 0) / 120);
  filas.push([
    deporte,
    String(ids.length),
    media((r) => r.actions).toFixed(0),
    media((r) => sube(r, ids)).toFixed(0),
    (media((r) => sube(r, ids)) / ids.length).toFixed(1),
    media((r) => r.final.stats[`${deporte}.conocimiento`]).toFixed(0),
    sesiones.toFixed(0),
    String(resultados.reduce((t, r) => t + r.problems.length, 0)),
  ]);
}
const cab = ['deporte', 'habilidades', 'acciones', 'puntos que suben (suma)', 'por habilidad', 'conocimiento', 'sesiones de club (aprox.)', 'problemas'];
console.log(`Curso de ${dias} días, ${semillas} semillas, un solo deporte, el mismo plan de deportista\n`);
console.log([cab, ...filas].map((f) => f.map((c, i) => c.padEnd(i === 0 ? 10 : 24)).join('')).join('\n'));
