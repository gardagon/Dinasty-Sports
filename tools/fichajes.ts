import { SERVICES, defineModule, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek, seededRng } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, rendimiento as rendimientoDeFutbol } from '@ds/mod-futbol';
import { edadNpc, type NpcsState } from '@ds/mod-npcs';
import { deportistaDe, type BotMemory } from '../sim/src/bots';
import { hacer, opcionesDelBot } from '../sim/src/pasos';

/**
 * Medidas de los fichajes (P2b-2, `docs/CIUDAD_Y_LIGAS.md` §7), con varias semillas. El nivel del personaje es el real: se calcula con el lector del motor, como lo calcula la regla de plaza
 * para él (`rend(ctx)` en `npcs`), no con una aproximación.
 *  1. Cuándo entra un personaje del montón en cada club de fútbol al empezar (benjamín): el nivel del peor jugador de cada equipo frente al del personaje de partida, en cuántas semillas
 *     entra en cada club y en cuántas **no entra en ninguno**.
 *  2. Un bot del montón (el deportista de fútbol de `sim/src/bots.ts`, que juega con el plan de siempre) que **intenta entrar en cada plazo de fichajes durante varios cursos**, en el club
 *     del colegio (con la acción de verdad) y en los demás (con la regla de plaza: `plaza(...)` del servicio de personas, que es lo que decidiría el club): en qué curso entra en cada uno.
 *  3. Cuántos niños dejan el deporte para siempre cada año por no encontrar club y cuántos futbolistas hay (para ver que los equipos no se vacían).
 * Uso: `npm run fichajes -- <semillas> <cursos> [sinBot]` (por defecto 12 semillas y 3 cursos).
 */
const SEMILLAS = Number(process.argv[2] ?? 12);
const CURSOS = Number(process.argv[3] ?? 3);
const CON_BOT = process.argv[4] !== 'sinBot';
const CLUBES = ['club_grande', 'club_mediano', 'club_pequeno', 'colegio'];

/** Un módulo de medida: da el rendimiento de fútbol del personaje con el lector real del motor. */
const medida = defineModule<Record<string, never>>({
  id: 'medida',
  name: 'Medida',
  dependsOn: ['gen'],
  initState: () => ({}),
  services: { 'medida.nivel': (ctx) => ({ nivel: () => rendimientoDeFutbol(ctx) }) },
});

const mediana = (xs: number[]): number => {
  const o = [...xs].sort((a, b) => a - b);
  return o.length ? o[Math.floor((o.length - 1) / 2)] : NaN;
};
const f = (x: number): string => (Number.isNaN(x) ? '—' : x.toFixed(1));
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

const medianosDelEquipo: Record<string, number[]> = {};
const umbral: Record<string, number[]> = {};
const entraAlEmpezar: Record<string, number> = {};
const personaje: number[] = [];
let sinNingunClub = 0;
const dejadosPorCurso: number[][] = Array.from({ length: CURSOS }, () => []);
const futbolistasPorCurso: number[][] = Array.from({ length: CURSOS + 1 }, () => []);
// Del bot: el primer curso (1, 2, ...) en que entraría en cada club; 0 = no entra en ninguno de los cursos medidos.
const primerCurso: Record<string, number[]> = Object.fromEntries(CLUBES.map((c) => [c, []]));
const nivelDelBot: number[][] = Array.from({ length: CURSOS }, () => []);

for (let seed = 1; seed <= SEMILLAS; seed++) {
  const g = nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol, medida]);
  const nivel = (): number => g.service<{ nivel(): number }>('medida.nivel')!.nivel();
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  const s0 = g.moduleState<NpcsState>('npcs') as NpcsState;
  const n0 = nivel();
  personaje.push(n0);
  let entraEnAlguno = false;
  for (const club of CLUBES) {
    const equipo = s0.npcs.filter((n) => n.deporte === 'futbol' && n.equipo === club && (edadNpc(n, 0) ?? 99) <= 9);
    (medianosDelEquipo[club] ??= []).push(mediana(equipo.map((n) => n.levels.futbol)));
    if (equipo.length >= 18) (umbral[club] ??= []).push(Math.min(...equipo.map((n) => n.levels.futbol)));
    // Lo mismo que decide la regla de plaza: `plaza` del servicio de personas con su nivel real.
    if (dir.plaza('futbol', club, n0).estado !== 'completo') {
      entraAlEmpezar[club] = (entraAlEmpezar[club] ?? 0) + 1;
      entraEnAlguno = true;
    }
  }
  if (!entraEnAlguno) sinNingunClub++;
  futbolistasPorCurso[0].push(s0.npcs.filter((n) => n.deporte === 'futbol').length);

  // El bot del montón: juega con su plan y, al empezar cada curso (en pleno plazo), mira en qué clubes entraría.
  const primero = new Map<string, number>();
  if (CON_BOT) {
    const bot = deportistaDe('futbol');
    const rng = seededRng(seed * 31 + 7);
    const mem: BotMemory = { day: -1, hoy: {}, total: {} };
    for (let curso = 0; curso < CURSOS; curso++) {
      // Los clubes ya han hecho sus fichajes de verano a la semana 2 del curso: se mide cuando el bot llega a ella (con el plazo aún abierto).
      while (g.time.week < 52 * curso + 2) {
        if (mem.day !== g.time.day) {
          mem.day = g.time.day;
          mem.hoy = {};
        }
        const opts = opcionesDelBot(g);
        if (!opts.length) break;
        hacer(g, opts, bot.choose(g, opts, rng, mem));
      }
      const n = nivel();
      nivelDelBot[curso].push(n);
      const dirAhora = g.service<NpcDirectory>(SERVICES.npcs)!;
      for (const club of CLUBES) if (!primero.has(club) && dirAhora.plaza('futbol', club, n).estado !== 'completo') primero.set(club, curso + 1);
    }
    for (const club of CLUBES) primerCurso[club].push(primero.get(club) ?? 0);
  } else {
    for (let c = 1; c <= CURSOS; c++) advanceToWeek(g, 'gen.descansar', 52 * c + 1, 2, 15);
  }
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  for (let c = 1; c <= CURSOS; c++) dejadosPorCurso[c - 1].push(s.dejanSinClub?.[c] ?? 0);
  for (let c = 1; c <= CURSOS; c++) futbolistasPorCurso[c].push(s.npcs.filter((n) => n.deporte === 'futbol').length);
}

console.log(`\nMedidas de fichajes: ${SEMILLAS} semillas, ${CURSOS} cursos (nivel real del personaje)\n`);
console.log(`Nivel del personaje de partida en fútbol: mediana ${f(mediana(personaje))} (mín ${f(Math.min(...personaje))}, máx ${f(Math.max(...personaje))})\n`);
console.log('Equipo de benjamín (8-9 años) de cada club, al empezar:');
console.log('| Club | Nivel mediano del equipo | Nivel del peor (equipo completo) | Semillas en que entra el personaje de partida |');
console.log('|---|---|---|---|');
for (const club of CLUBES) console.log(`| ${club} | ${f(mediana(medianosDelEquipo[club]))} | ${umbral[club]?.length ? f(mediana(umbral[club])) : '—'} | ${entraAlEmpezar[club] ?? 0} de ${SEMILLAS} |`);
console.log(`\nSemillas en las que el personaje de partida **no entra en ningún club de fútbol**: ${sinNingunClub} de ${SEMILLAS}`);
if (CON_BOT) {
  console.log('\nBot del montón (deportista de fútbol con el plan de siempre) que mira en cada plazo si entraría: curso en que entra por primera vez en cada club (0 = en ninguno de los cursos medidos)');
  console.log('| Club | Curso 1 | Curso 2 | Curso 3 | Nunca |');
  console.log('|---|---|---|---|---|');
  for (const club of CLUBES) {
    const cuenta = (c: number) => primerCurso[club].filter((x) => x === c).length;
    console.log(`| ${club} | ${cuenta(1)} | ${cuenta(2)} | ${cuenta(3)} | ${cuenta(0)} |`);
  }
  console.log(`\nNivel real del bot al empezar cada curso (mediana): ${nivelDelBot.map((n, i) => `curso ${i + 1}: ${f(mediana(n))}`).join(' · ')}`);
}
console.log('\nNiños que dejan el deporte para siempre al empezar cada curso por no encontrar club (ningún club los quiso), y futbolistas en total:');
console.log('| Curso | Dejan el deporte (media por partida) | Máx | Futbolistas (media) |');
console.log('|---|---|---|---|');
console.log(`| 0 (inicio) | — | — | ${f(media(futbolistasPorCurso[0]))} |`);
for (let c = 0; c < CURSOS; c++) console.log(`| ${c + 1} | ${f(media(dejadosPorCurso[c]))} | ${Math.max(...dejadosPorCurso[c])} | ${f(media(futbolistasPorCurso[c + 1]))} |`);
