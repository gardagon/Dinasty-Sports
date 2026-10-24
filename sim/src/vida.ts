import { GEN, TAGS } from '@ds/contracts';
import { seededRng, checkInvariants, type Game } from '@ds/core';
import { nuevaPartida } from '@ds/game';
import {
  apuntarseAlClub, basicas, campamento, conAmigos, descansarOEsperar, entrenoDeporte, estudio, flojoEnLaSuperior, id as esId,
  relacion, seguirPlan, sesionDeClub, subirDeCategoria, tag, volverACategoria, type Bot,
} from './bots';

/**
 * Vida entera: lleva a un bot muchos años y mira cómo evoluciona su personaje (niveles frente a topes por categoría).
 * Sirve para ver a qué edad llega al máximo, cuántas capacidades llegan a su tope y qué pasa de adulto.
 *
 *   npm run sim:vida                          (bot "perfecto", 70 años, semilla 1)
 *   npm run sim:vida -- --anios 25 --bot equilibrado --semilla 3
 */

/** Bot que intenta entrenarlo todo a la vez (deporte, estudios, relaciones, gimnasio, lectura, ocio) cuidando el descanso. */
export const PERFECTO: Bot = {
  id: 'perfecto',
  name: 'Perfecto',
  description: 'Entrena todo lo que puede (deporte, estudios, gimnasio, lectura, relaciones) cuidando el sueño y el estrés.',
  choose(game, opts, _rng, mem) {
    return (
      basicas(game, opts, { horaDormir: 22, clase: true, competir: true, energiaMin: 25 }) ??
      seguirPlan(opts, mem, [
        ['unirse', 1, apuntarseAlClub],
        ['subir', 1, subirDeCategoria],
        ['volver', 1, (o) => volverACategoria(o) && flojoEnLaSuperior(game)],
        ['campamento', 1, campamento],
        ['club', 1, sesionDeClub],
        ['deporte', 2, entrenoDeporte],
        ['estudio', 2, estudio],
        ['gym', 1, esId('gen.gimnasio')],
        ['leer', 1, esId('gen.leer')],
        ['relacion', 1, relacion],
        ['tele', 1, esId('atletismo.ver_tele')],
        ['amigos', 1, conAmigos],
        ['ocio', 1, (o) => game.stat(GEN.estres) > 35 && tag(TAGS.ocio)(o)],
      ]) ??
      descansarOEsperar(opts)
    );
  },
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const media = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const f = (n: number, d = 0) => (Number.isNaN(n) ? '—' : n.toFixed(d));

interface Fila {
  edad: number;
  /** Media del nivel y del tope por categoría de capacidades. */
  cat: Record<string, { nivel: number; tope: number }>;
  habilidades: { nivel: number; tope: number };
  conocimiento: number;
  alTope: number;
  total: number;
  notaMedia: number | null;
  salud: number;
}

function fotografia(g: Game, edad: number): Fila {
  const cat: Record<string, { n: number[]; t: number[] }> = {};
  const hab = { n: [] as number[], t: [] as number[] };
  let alTope = 0;
  let total = 0;
  for (const s of g.registry.statList) {
    const tope = g.hiddenPotential(s.def.id);
    if (tope === undefined || s.def.category === 'estado') continue;
    if (s.module === 'estudios' && !(g.service<{ activeSubjects(): string[] }>('estudios')?.activeSubjects() ?? []).includes(s.def.id)) continue;
    const grupo = s.def.genetics?.grupo;
    const v = g.stat(s.def.id);
    if (grupo) {
      (cat[grupo] ??= { n: [], t: [] }).n.push(v);
      cat[grupo].t.push(tope);
    } else if (s.def.category === 'habilidad') {
      hab.n.push(v);
      hab.t.push(tope);
    }
    total++;
    if (v >= 0.95 * tope) alTope++;
  }
  const est = g.service<{ average(): number | null }>('estudios');
  return {
    edad,
    cat: Object.fromEntries(Object.entries(cat).map(([k, v]) => [k, { nivel: media(v.n), tope: media(v.t) }])),
    habilidades: { nivel: media(hab.n), tope: media(hab.t) },
    conocimiento: g.stat('atletismo.conocimiento'),
    alTope,
    total,
    notaMedia: est?.average() ?? null,
    salud: g.stat(GEN.salud),
  };
}

function simular(bot: Bot, seed: number, anios: number) {
  const game = nuevaPartida({ seed, playerName: bot.name });
  const rng = seededRng(seed * 31 + 7);
  const mem = { day: -1, hoy: {} as Record<string, number>, total: {} as Record<string, number> };
  const filas: Fila[] = [fotografia(game, 8)];
  const problemas: string[] = [];
  let edad = 8;
  const t0 = performance.now();
  const dias = anios * 365;
  while (game.time.day < dias) {
    if (mem.day !== game.time.day) {
      mem.day = game.time.day;
      mem.hoy = {};
    }
    const opts = game.availableActions();
    if (!opts.length) {
      problemas.push(`Día ${game.time.day}: ninguna acción disponible`);
      break;
    }
    const r = game.perform(bot.choose(game, opts, rng, mem));
    if (!r.ok) {
      problemas.push(`Día ${game.time.day}: acción fallida (${r.reason})`);
      if (problemas.length > 10) break;
    }
    const inv = checkInvariants(game);
    if (inv.length) {
      problemas.push(...inv.slice(0, 2).map((p) => `Día ${game.time.day}: ${p}`));
      if (problemas.length > 10) break;
    }
    const edadAhora = 8 + Math.floor(game.time.day / 365);
    if (edadAhora !== edad) {
      edad = edadAhora;
      filas.push(fotografia(game, edad));
    }
  }
  return { filas, problemas, ms: performance.now() - t0, game };
}

const anios = Number(arg('anios') ?? 70);
const seed = Number(arg('semilla') ?? 1);
const bot = arg('bot') === 'perfecto' || !arg('bot') ? PERFECTO : undefined;
if (!bot) throw new Error('Solo el bot "perfecto" está disponible en sim:vida (usa npm run sim para los demás).');

console.log(`\nVida de "${bot.name}": ${anios} años, semilla ${seed}...\n`);
const { filas, problemas, ms } = simular(bot, seed, anios);
const mostrar = filas.filter((x) => [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 35, 40, 50, 60, 70, 78].includes(x.edad) || x === filas[filas.length - 1]);
const cols = (c: { nivel: number; tope: number }) => `${f(c.nivel)}/${f(c.tope)}`;
console.log('| Edad | Física (nivel/tope) | Mental | Social | Habilidades | Conocimiento | Capacidades al 95 % del tope | Nota media | Salud |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const x of mostrar) {
  console.log(`| ${x.edad} | ${cols(x.cat.fisico)} | ${cols(x.cat.mental)} | ${cols(x.cat.social)} | ${cols(x.habilidades)} | ${f(x.conocimiento)} | ${x.alTope}/${x.total} | ${f(x.notaMedia ?? NaN, 1)} | ${f(x.salud)} |`);
}
console.log(`\n${filas.length - 1} años simulados en ${(ms / 1000).toFixed(1)} s. Problemas: ${problemas.length ? '\n  - ' + problemas.join('\n  - ') : 'ninguno'}\n`);
