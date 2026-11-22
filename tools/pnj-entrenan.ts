/**
 * ¿Cuánto entrena un PNJ frente al personaje? (solo lectura; informe `docs/relevo/pnj-entrenan-y-abandono.md`). Ciudad grande con fútbol.
 *
 *   npx tsx tools/pnj-entrenan.ts pnj <salida.json> <semilla> [semanas=52]
 *       Sesiones de club por semana de los PNJ que juegan, puntos netos que suben sus habilidades por semana (por edad) y fracción de su tope.
 *   npx tsx tools/pnj-entrenan.ts personaje <salida.json> <bot: futbol|perfecto> <semilla> [años=10]
 *       Un bot lleva al personaje: cada año, sus habilidades (puntos y fracción del tope), su nivel (`rendimiento` del fútbol) y las horas semanales por tipo de actividad.
 */
import { writeFileSync } from 'node:fs';
import { CAPACIDADES_GENETICAS, NIVEL_TIPICO_DE_REFERENCIA, PAIS_CIUDAD_GRANDE, TAGS, nivelTipicoPorEdad, registrarPais, type LectorDePersona } from '@ds/contracts';
import { advanceToWeek, seededRng } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { DATOS_FUTBOL, PNJ_POR_LIBRE, futbol, rendimiento } from '@ds/mod-futbol';
import { fijosDeNino } from '../modules/npcs/src/rutina';
import { sesionesQueHace, semanaQueAcaba } from '../modules/npcs/src/semana';
import { PERFECTO } from '../sim/src/vida';
import { deportistaDe, entrenoDeporte } from '../sim/src/bots';
import { decidirSucesos } from '../sim/src/runner';
import { hacer, opcionesDelBot } from '../sim/src/pasos';

registrarPais(PAIS_CIUDAD_GRANDE);
// PNJ_LIBRE=1 activa la propuesta de que los PNJ entrenen por su cuenta; PNJ_LIBRE='{"propension":{...}}' cambia sus cifras (solo para medir: sin ella el juego va como siempre).
if (process.env.PNJ_LIBRE) {
  const extra = process.env.PNJ_LIBRE.startsWith('{') ? JSON.parse(process.env.PNJ_LIBRE) : {};
  const l = { ...PNJ_POR_LIBRE, ...extra, propension: { ...PNJ_POR_LIBRE.propension, ...(extra.propension ?? {}) } };
  (DATOS_FUTBOL as any).paises.espana.poblacion.rutina.porLibre = l;
}
const [modo, salida] = [process.argv[2], process.argv[3]];
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const suma = (a: number[]) => a.reduce((x, y) => x + y, 0);

if (modo === 'pnj') {
  const seed = Number(process.argv[4] ?? 31);
  const semanas = Number(process.argv[5] ?? 52);
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['futbol'] }, [...MODULOS, futbol]);
  const st0 = g.moduleState('npcs') as any;
  const pob = st0.poblaciones.find((p: any) => p.deporte === 'futbol');
  const dia0 = g.time.day;
  const edadDe = (n: any, dia: number) => Math.floor((dia - n.nacimiento) / 365);
  // Por niño: sesiones por semana, puntos de habilidad antes.
  const puntos = (n: any): number => suma(n.hab.futbol.v.filter((_: number, i: number) => true));
  const previos = new Map<string, number>();
  const filas: any[] = [];
  const clubDe = (n: any) => pob.equipos.find((e: any) => e.club === n.equipo);
  const ids = new Set<string>(st0.npcs.filter((n: any) => n.deporte === 'futbol' && n.hab?.futbol && n.nacimiento !== undefined).map((n: any) => n.id));
  const sesiones = new Map<string, number>();
  for (const n of st0.npcs) if (ids.has(n.id)) previos.set(n.id, puntos(n));
  for (let w = 1; w <= semanas; w++) {
    advanceToWeek(g, 'gen.descansar', w, 2, 15);
    const st = g.moduleState('npcs') as any;
    const semAbs = semanaQueAcaba(g.time.day);
    for (const n of st.npcs) {
      if (!ids.has(n.id) || n.deporte !== 'futbol' || !n.hab?.futbol) continue;
      sesiones.set(n.id, (sesiones.get(n.id) ?? 0) + sesionesQueHace(n, 'futbol', pob.rutina, semAbs));
    }
  }
  const st = g.moduleState('npcs') as any;
  for (const n of st.npcs) {
    if (!ids.has(n.id) || n.deporte !== 'futbol' || !n.hab?.futbol) continue;
    const fijos = fijosDeNino(n.id, n.genetica, 'futbol', pob.rutina);
    const frac = n.hab.futbol.v.map((v: number, i: number) => (fijos.tope[i] ? v / fijos.tope[i]! : -1)).filter((x: number) => x >= 0);
    filas.push({ edad: edadDe(n, dia0), tamano: clubDe(n)?.tamano, sesionesSem: r3((sesiones.get(n.id) ?? 0) / semanas), puntosSem: r3((puntos(n) - previos.get(n.id)!) / semanas), fraccion: r3(suma(frac) / frac.length), valor: r3(n.vp?.futbol?.valor ?? n.levels.futbol) });
  }
  writeFileSync(salida, JSON.stringify(filas));
  console.log(`${filas.length} jugadores, ${semanas} semanas`);
} else if (modo === 'personaje') {
  // `razonable`: el club y, por su cuenta, como mucho `cuota` sesiones a la semana (por defecto 2); `futbol`: el deportista de los bots (hasta 2 sesiones al día todos los días); `perfecto`: el bot que lo entrena todo.
  const cuota = Number(process.argv[7] ?? 2);
  const bot = process.argv[4] === 'perfecto' ? PERFECTO : deportistaDe('futbol');
  const propias = { semana: -1, n: 0 };
  const seed = Number(process.argv[5] ?? 31);
  const anios = Number(process.argv[6] ?? 10);
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['futbol'] }, [...MODULOS, futbol]);
  const rng = seededRng(seed * 31 + 7);
  const mem = { day: -1, hoy: {} as Record<string, number>, total: {} as Record<string, number> };
  const habs = Object.keys(g.registry.statList.reduce((o: any, s: any) => ((s.def.id.startsWith('futbol.') && s.def.id !== 'futbol.conocimiento' && g.hiddenPotential(s.def.id) !== undefined) ? { ...o, [s.def.id]: 1 } : o), {}));
  const lector = (): LectorDePersona => {
    const edad = Math.floor(g.time.day / 365) + 8;
    return { stat: (id) => g.stat(id), norm: (id) => (id.startsWith('gen.') ? Math.min(1, ((g.stat(id) / 100) * NIVEL_TIPICO_DE_REFERENCIA) / nivelTipicoPorEdad(edad)) : g.stat(id) / 100) };
  };
  const foto = (k: number, min: Record<string, number>, semanas: number) => ({
    k,
    puntos: r3(suma(habs.map((h) => g.stat(h)))),
    fraccion: r3(suma(habs.map((h) => g.stat(h) / g.hiddenPotential(h)!)) / habs.length),
    capFraccion: r3(suma(CAPACIDADES_GENETICAS.map((c) => g.stat(c) / g.hiddenPotential(c)!)) / CAPACIDADES_GENETICAS.length),
    valor: r3(rendimiento(lector())),
    horasSem: Object.fromEntries(Object.entries(min).map(([t, m]) => [t, r3(m / 60 / semanas)])),
  });
  const filas: any[] = [foto(0, {}, 1)];
  let min: Record<string, number> = {};
  let ultimo = 0;
  while (g.time.day < anios * 365) {
    if (mem.day !== g.time.day) { mem.day = g.time.day; mem.hoy = {}; }
    if (decidirSucesos(g, seed)) continue;
    const opts = opcionesDelBot(g);
    if (!opts.length) break;
    let ofrecidas = opts;
    if (process.argv[4] === 'razonable') {
      if (propias.semana !== g.time.week) Object.assign(propias, { semana: g.time.week, n: 0 });
      if (propias.n >= cuota) ofrecidas = Object.assign(opts.filter((o) => !(entrenoDeporte(o) && !o.tags.includes('club'))), { relaciones: opts.relaciones });
    }
    const eleccion = bot.choose(g, ofrecidas, rng, mem);
    const elegida = opts.find((x) => x.id === eleccion);
    if (process.argv[4] === 'razonable' && elegida && entrenoDeporte(elegida) && !elegida.tags.includes('club')) propias.n++;
    const paso = hacer(g, opts, eleccion);
    if (paso.traslado) continue;
    if (paso.result.ok) {
      mem.total[eleccion] = (mem.total[eleccion] ?? 0) + 1;
      const o = opts.find((x) => x.id === eleccion);
      for (const t of o?.tags ?? []) if (['club', TAGS.entrenamiento, 'social', 'campamento'].includes(t) || t === 'futbol') min[t] = (min[t] ?? 0) + paso.result.duration;
      if (o && /quedar|amigos|partidillo|reducidos|tiros/.test(o.id + o.name)) min.quedada = (min.quedada ?? 0) + paso.result.duration;
    }
    const k = Math.floor(g.time.day / 365);
    if (k > ultimo) {
      filas.push(foto(k, min, 52));
      console.log(`año ${k}: valor ${filas[filas.length - 1].valor}, hab ${filas[filas.length - 1].fraccion}`);
      min = {};
      ultimo = k;
    }
  }
  writeFileSync(salida, JSON.stringify(filas));
}
