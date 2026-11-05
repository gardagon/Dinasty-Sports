import { SERVICES, defineModule, faltaViajar, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek, seededRng } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PUESTOS_DE_FUTBOL, futbol, rendimientoPorPuestos, rendimiento as rendimientoDeFutbol } from '@ds/mod-futbol';
import { cuposPorGrupo, grupoDePuesto } from '@ds/contracts';
import { valorDeLaPrueba } from '@ds/contracts';
import { edadNpc, equiposDelClub, valoracionDe, type NpcsState } from '@ds/mod-npcs';
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
/** La acción con que el personaje se apunta al club del colegio (a los demás entra con una prueba de acceso). */
const ACCION: Record<string, string> = { colegio: 'futbol.apuntarse_colegio' };

/** Un módulo de medida: da el rendimiento de fútbol del personaje con el lector real del motor. */
const medida = defineModule<Record<string, never>>({
  id: 'medida',
  name: 'Medida',
  dependsOn: ['gen'],
  initState: () => ({}),
  services: { 'medida.nivel': (ctx) => ({ nivel: () => rendimientoDeFutbol(ctx), puestos: () => rendimientoPorPuestos(ctx) }) },
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
const equiposPorCat: Record<string, number[]> = {};
const costeDeCrear: number[] = [];
const ofertasPorClub: Record<string, Record<string, number>> = {};
const primerSitio: string[] = [];
const equiposAD: Record<string, number[]> = {};
const primerosEnElA: number[] = [];
const sinZurdoEnLaBanda: { faltan: number; de: number } = { faltan: 0, de: 0 };
let zurdosTotal = 0;
let jugadoresTotal = 0;
let equiposDescompensados = 0;
let equiposRevisados = 0;
const dejadosPorCurso: number[][] = Array.from({ length: CURSOS }, () => []);
const futbolistasPorCurso: number[][] = Array.from({ length: CURSOS + 1 }, () => []);
// Del bot: el primer curso (1, 2, ...) en que entraría en cada club; 0 = no entra en ninguno de los cursos medidos.
const primerCurso: Record<string, number[]> = Object.fromEntries(CLUBES.map((c) => [c, []]));
const primerCursoEnElA: Record<string, number[]> = Object.fromEntries(CLUBES.map((c) => [c, []]));
const nivelDelBot: number[][] = Array.from({ length: CURSOS }, () => []);

for (let seed = 1; seed <= SEMILLAS; seed++) {
  const t0 = performance.now();
  const g = nuevaPartida({ seed, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol, medida]);
  costeDeCrear.push(performance.now() - t0);
  const nivel = (): number => g.service<{ nivel(): number }>('medida.nivel')!.nivel();
  const puestosDelPersonaje = (): Record<string, number> => g.service<{ puestos(): Record<string, number> }>('medida.nivel')!.puestos();
  const s0 = g.moduleState<NpcsState>('npcs') as NpcsState;
  // El primer plazo: la semana 2 del curso, un martes a las 17:00 (la secretaría de los clubes está abierta). Antes los equipos se miden recién creados.
  advanceToWeek(g, 'gen.descansar', 1, 2, 17);
  const n0 = nivel();
  personaje.push(n0);
  let entraEnAlguno = false;
  for (const club of CLUBES) {
    const equipo = s0.npcs.filter((n) => n.deporte === 'futbol' && n.equipo === club && (edadNpc(n, 0) ?? 99) <= 9);
    (medianosDelEquipo[club] ??= []).push(mediana(equipo.map((n) => n.levels.futbol)));
    if (equipo.length >= 18) (umbral[club] ??= []).push(Math.min(...equipo.map((n) => n.levels.futbol)));
    // La prueba de acceso (en un día normal, sin azar): entra si en algún puesto hay hueco y llega al mínimo del club, o vale más que el peor. El club del colegio no tiene prueba: la acción de apuntarse.
    const oferta = (g.service<NpcDirectory>(SERVICES.npcs) as NpcDirectory).plaza('futbol', club, n0, puestosDelPersonaje(), {});
    const entra = oferta.estado === 'libre' || oferta.estado === 'por_merito';
    if (entra && oferta.puesto) {
      (ofertasPorClub[club] ??= {})[oferta.puesto] = (ofertasPorClub[club][oferta.puesto] ?? 0) + 1;
      if (!primerSitio[seed - 1]) primerSitio[seed - 1] = `${club}:${oferta.puesto}`;
    }
    const colegioAbierto = club === 'colegio' ? g.preview(ACCION[club]) : undefined;
    if (club === 'colegio' ? colegioAbierto && (colegioAbierto.available || faltaViajar(colegioAbierto)) : entra) {
      entraAlEmpezar[club] = (entraAlEmpezar[club] ?? 0) + 1;
      entraEnAlguno = true;
    }
  }
  if (!entraEnAlguno) sinNingunClub++;
  futbolistasPorCurso[0].push(s0.npcs.filter((n) => n.deporte === 'futbol').length);
  {
    const pobAD = s0.poblaciones!.find((p) => p.deporte === 'futbol')!;
    const listaAD = new Map(s0.npcs.map((n) => [n.id, n]));
    const valAD = valoracionDe(new Map([['futbol', Object.assign((p: Parameters<typeof rendimientoDeFutbol>[0]) => rendimientoDeFutbol(p), { puestos: rendimientoPorPuestos })]]));
    for (const e of pobAD.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const c of pobAD.categorias!.filter((x) => ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'].includes(x.id))) {
        const cat = { id: c.id, edades: Array.from({ length: c.edadMax - c.edadMin + 1 }, (_, i) => c.edadMin + i).filter((x) => x <= 19) };
        const r = equiposDelClub(listaAD, pobAD, e, cat, 0, valAD);
        for (const l of ['A', 'B', 'C', 'D'] as const) (equiposAD[`${e.club}|${l}`] ??= []).push(r.equipos[l].length >= 14 * 0 + 1 ? r.equipos[l].length : 0);
        if (e.calidad >= 3) {
          // Solo cuentan los de primer año que le quitan el sitio a uno de segundo de su mismo grupo de puestos (que se queda fuera del A). Cubrir un puesto en que no hay nadie de segundo año es normal.
          const enElA = new Set(r.equipos.A);
          const segundosFuera = new Set(r.miembros.filter((x) => x.m.anio === 2 && !enElA.has(x.m.id)).map((x) => grupoDePuesto(pobAD.puestos!, x.m.puesto)));
          primerosEnElA.push(r.miembros.filter((x) => x.m.anio === 1 && enElA.has(x.m.id) && segundosFuera.has(grupoDePuesto(pobAD.puestos!, x.m.puesto))).length);
        }
        // ¿Falta un zurdo para la banda izquierda? (extremo o interior izquierdo, LW o LM: nadie de pierna izquierda entre los que juegan ahí).
        const izq = r.miembros.filter((x) => x.m.puesto === 'LW' || x.m.puesto === 'LM');
        if (izq.length) {
          sinZurdoEnLaBanda.de++;
          if (!izq.some((x) => x.n.pierna === 'izquierda')) sinZurdoEnLaBanda.faltan++;
        }
        for (const x of r.miembros) {
          jugadoresTotal++;
          if (x.n.pierna === 'izquierda') zurdosTotal++;
        }
      }
    }
  }
  for (const e of s0.poblaciones!.find((p) => p.deporte === 'futbol')!.equipos.filter((x) => x.plantillaPorCategoria)) {
    for (const c of s0.poblaciones!.find((p) => p.deporte === 'futbol')!.categorias!.filter((x) => ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'].includes(x.id))) {
      const del = s0.npcs.filter((n) => n.deporte === 'futbol' && n.equipo === e.club && n.puesto?.futbol && edadNpc(n, 0)! >= c.edadMin && edadNpc(n, 0)! <= c.edadMax);
      const cupos = cuposPorGrupo(PUESTOS_DE_FUTBOL, e.plantillaPorCategoria!.max * (e.equiposPorCategoria?.[c.id] ?? 1));
      const cuenta: Record<string, number> = {};
      for (const n of del) cuenta[grupoDePuesto(PUESTOS_DE_FUTBOL, n.puesto!.futbol)!] = (cuenta[grupoDePuesto(PUESTOS_DE_FUTBOL, n.puesto!.futbol)!] ?? 0) + 1;
      equiposRevisados++;
      if (PUESTOS_DE_FUTBOL.reparto.some((r) => (cuenta[r.grupo] ?? 0) === 0 || (cuenta[r.grupo] ?? 0) > cupos[r.grupo])) equiposDescompensados++;
    }
  }
  const pob0 = s0.poblaciones!.find((p) => p.deporte === 'futbol')!;
  for (const c of ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil']) (equiposPorCat[c] ??= []).push(pob0.equipos.filter((e) => e.plantillaPorCategoria).reduce((t, e) => t + (e.equiposPorCategoria?.[c] ?? 1), 0));

  // El bot del montón: juega con su plan y, al empezar cada curso (en pleno plazo), mira en qué clubes entraría.
  const primero = new Map<string, number>();
  const llegaAlA = new Map<string, number>();
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
      const sN = g.moduleState<NpcsState>('npcs') as NpcsState;
      const pobB = sN.poblaciones!.find((p) => p.deporte === 'futbol')!;
      const edadB = g.service<{ view(): { seasonAge: number } }>('identidad')!.view().seasonAge;
      const catB = pobB.categorias!.find((c) => edadB >= c.edadMin && edadB <= c.edadMax);
      const listaB = new Map(sN.npcs.map((x) => [x.id, x]));
      const valB = valoracionDe(new Map([['futbol', Object.assign((p: Parameters<typeof rendimientoDeFutbol>[0]) => rendimientoDeFutbol(p), { puestos: rendimientoPorPuestos })]]));
      const reales = puestosDelPersonaje();
      // Una prueba por club en el plazo, un día normal y con su azar (la misma que hace la acción).
      for (const club of CLUBES) {
        const z = rng.normal();
        const prueba = Object.fromEntries(Object.entries(reales).map(([p, v]) => [p, valorDeLaPrueba(v, 1, z)]));
        const oferta = dirAhora.plaza('futbol', club, valorDeLaPrueba(n, 1, z), prueba, {});
        if (!(oferta.estado === 'libre' || oferta.estado === 'por_merito') || !oferta.puesto) continue;
        if (!primero.has(club)) primero.set(club, curso + 1);
        // ¿Llega al A? Con lo que vale de verdad en ese puesto, mezclado con los de su equipo por la regla de cada club (por año en los grandes, por nivel en el resto).
        const e = pobB.equipos.find((x) => x.club === club);
        if (e?.plantillaPorCategoria && catB && !llegaAlA.has(club)) {
          const edades = Array.from({ length: catB.edadMax - catB.edadMin + 1 }, (_, i) => catB.edadMin + i);
          const yo = { id: 'personaje', puesto: oferta.puesto, valor: reales[oferta.puesto], anio: (edadB === catB.edadMin ? 1 : 2) as 1 | 2 };
          if (equiposDelClub(listaB, pobB, e, { id: catB.id, edades }, 0, valB, [yo]).equipos.A.includes('personaje')) llegaAlA.set(club, curso + 1);
        }
      }
    }
    for (const club of CLUBES) {
      primerCurso[club].push(primero.get(club) ?? 0);
      primerCursoEnElA[club].push(llegaAlA.get(club) ?? 0);
    }
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
console.log('\nPuestos que los clubes le ofrecen al personaje al empezar (suma de las 12 semillas, por club):');
for (const club of CLUBES) console.log(`- ${club}: ${Object.entries(ofertasPorClub[club] ?? {}).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(', ') || '—'}`);
console.log(`\nPrimer sitio (club:puesto) por semilla, en el orden de las ofertas: ${primerSitio.map((x, i) => `${i + 1}:${x ?? '—'}`).join('  ')}`);
console.log('\nEquipos A, B, C y D por club (jugadores de cada uno, media de las 5 categorías y las 12 semillas; 0 = no hay ese equipo):');
console.log('| Club | A | B | C | D |');
console.log('|---|---|---|---|---|');
for (const club of CLUBES) console.log(`| ${club} | ${(['A', 'B', 'C', 'D'] as const).map((l) => f(media(equiposAD[`${club}|${l}`] ?? [0]))).join(' | ')} |`);
console.log(`\nPrimeros años que le quitan el sitio a uno de segundo año de su mismo puesto en el A de un club grande (0 a 2 es lo esperado): media ${f(media(primerosEnElA))}, máximo ${Math.max(...primerosEnElA)}, ${primerosEnElA.filter((x) => x <= 2).length} de ${primerosEnElA.length} club-categorías con 2 o menos`);
console.log(`Zurdos entre los futbolistas: ${f((100 * zurdosTotal) / Math.max(1, jugadoresTotal))} %`);
console.log(`Equipos en que falta un zurdo para la banda izquierda (hay extremo o interior izquierdo y ninguno es zurdo): ${sinZurdoEnLaBanda.faltan} de ${sinZurdoEnLaBanda.de} club-categorías con banda izquierda`);
console.log(`\nEquipos descompensados por puestos (algún grupo sin jugadores o pasado de su cupo): ${equiposDescompensados} de ${equiposRevisados}`);
console.log('\nEquipos por categoría (media entre semillas; los 4 clubes de la zona, con los equipos que abren según la demanda):');
console.log('| Categoría | Equipos (media) | Mín | Máx |');
console.log('|---|---|---|---|');
for (const [c, xs] of Object.entries(equiposPorCat)) console.log(`| ${c} | ${f(media(xs))} | ${Math.min(...xs)} | ${Math.max(...xs)} |`);
console.log(`\nCoste de crear una partida con fútbol: ${f(media(costeDeCrear) / 1000)} s de media (mín ${f(Math.min(...costeDeCrear) / 1000)}, máx ${f(Math.max(...costeDeCrear) / 1000)}); futbolistas al empezar: ${f(media(futbolistasPorCurso[0]))}`);
console.log(`\nSemillas en las que el personaje de partida **no entra en ningún club de fútbol**: ${sinNingunClub} de ${SEMILLAS}`);
if (CON_BOT) {
  console.log('\nBot del montón (deportista de fútbol con el plan de siempre) que mira en cada plazo si entraría: curso en que entra por primera vez en cada club (0 = en ninguno de los cursos medidos)');
  console.log('| Club | Curso 1 | Curso 2 | Curso 3 | Nunca |');
  console.log('|---|---|---|---|---|');
  for (const club of CLUBES) {
    const cuenta = (c: number) => primerCurso[club].filter((x) => x === c).length;
    console.log(`| ${club} | ${cuenta(1)} | ${cuenta(2)} | ${cuenta(3)} | ${cuenta(0)} |`);
  }
  console.log('\nBot del montón: curso en que llega por primera vez al **equipo A** de cada club por la prueba de acceso (entra y, con lo que vale de verdad en su puesto, queda en el A; 0 = no llega en los cursos medidos)');
  console.log('| Club | Curso 1 | Curso 2 | Curso 3 | Nunca |');
  console.log('|---|---|---|---|---|');
  for (const club of CLUBES) {
    const cuenta = (c: number) => primerCursoEnElA[club].filter((x) => x === c).length;
    console.log(`| ${club} | ${cuenta(1)} | ${cuenta(2)} | ${cuenta(3)} | ${cuenta(0)} |`);
  }
  console.log(`\nNivel real del bot al empezar cada curso (mediana): ${nivelDelBot.map((n, i) => `curso ${i + 1}: ${f(mediana(n))}`).join(' · ')}`);
}
console.log('\nNiños que dejan el deporte para siempre al empezar cada curso por no encontrar club (ningún club los quiso), y futbolistas en total:');
console.log('| Curso | Dejan el deporte (media por partida) | Máx | Futbolistas (media) |');
console.log('|---|---|---|---|');
console.log(`| 0 (inicio) | — | — | ${f(media(futbolistasPorCurso[0]))} |`);
for (let c = 0; c < CURSOS; c++) console.log(`| ${c + 1} | ${f(media(dejadosPorCurso[c]))} | ${Math.max(...dejadosPorCurso[c])} | ${f(media(futbolistasPorCurso[c + 1]))} |`);
