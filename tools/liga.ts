/**
 * Cuánto cuesta la liga del mundo (F2.3b): con todos los partidos de todas las categorías cada sábado, cuánto tarda el sábado, cuántos sábados hacen falta para acabar la temporada (liga y playoff) frente a los de clase que hay,
 * y cuánto crece el guardado por temporada. `npm run liga -- [temporadas] [prueba|grande]`.
 */
import { PAIS_CIUDAD_GRANDE, PAIS_CIUDAD_DE_PRUEBA, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { DIAGNOSTICO_DE_LIGA, futbol, type FutbolState } from '@ds/mod-futbol';

const TEMPORADAS = Number(process.argv[2] ?? 2);
const GRANDE = (process.argv[3] ?? 'prueba') === 'grande';
registrarPais(GRANDE ? PAIS_CIUDAD_GRANDE : PAIS_CIUDAD_DE_PRUEBA);
const f = (x: number, d = 1): string => x.toFixed(d);
const kb = (x: number): string => `${f(x / 1024, 0)} KB`;

const empezo = performance.now();
const g = nuevaPartida({ seed: 31, ...(GRANDE ? { pais: PAIS_CIUDAD_GRANDE.id } : {}), deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
console.log(`Liga del mundo (${GRANDE ? 'ciudad grande' : 'ciudad de prueba'}, ${TEMPORADAS} temporadas); crear la partida: ${f((performance.now() - empezo) / 1000)} s\n`);
const sabados: { ms: number; partidos: number; semana: number }[] = [];
DIAGNOSTICO_DE_LIGA.alSabado = (d) => sabados.push(d);
const tamano = (): { juego: number; futbol: number; liga: number } => ({ juego: JSON.stringify(g.serialize()).length, futbol: JSON.stringify(g.moduleState('futbol')).length, liga: JSON.stringify((g.moduleState<FutbolState>('futbol') as FutbolState).liga ?? null).length });
const antes = tamano();
const semanaDeCierre: number[] = [];
let picoDeLiga = 0;
let cerradas = 0;
for (let w = 1; w <= 52 * TEMPORADAS + 8; w++) {
  advanceToWeek(g, 'gen.descansar', w, 2, 15);
  const l = (g.moduleState<FutbolState>('futbol') as FutbolState).liga;
  if (l) picoDeLiga = Math.max(picoDeLiga, JSON.stringify(l).length);
  if (l?.cerrada && cerradas < l.campeones.length / 5) {
    cerradas = Math.round(l.campeones.length / 5);
    semanaDeCierre.push(w);
  }
}
const ms = sabados.map((s) => s.ms).sort((a, b) => a - b);
const grandes = sabados.filter((s) => s.partidos > 0);
console.log(`Sábados de liga jugados: ${sabados.length} (partidos por sábado: ${f(Math.min(...grandes.map((s) => s.partidos)), 0)} a ${f(Math.max(...grandes.map((s) => s.partidos)), 0)}, media ${f(grandes.reduce((t, s) => t + s.partidos, 0) / grandes.length, 0)})`);
console.log(`Lo que tarda el sábado con todos los partidos: media ${f(ms.reduce((a, b) => a + b, 0) / ms.length)} ms, mediana ${f(ms[Math.floor(ms.length / 2)])} ms, máximo ${f(ms[ms.length - 1])} ms (${f((ms.reduce((a, b) => a + b, 0) / Math.max(1, grandes.reduce((t, s) => t + s.partidos, 0)) * 1))} ms por partido)`);
console.log(`Temporadas cerradas en las semanas (de la partida): ${semanaDeCierre.join(', ') || 'ninguna'}`);
const despues = tamano();
const l = (g.moduleState<FutbolState>('futbol') as FutbolState).liga!;
console.log(`\nGuardado (JSON): partida entera ${kb(antes.juego)} → ${kb(despues.juego)}; estado del fútbol ${kb(antes.futbol)} → ${kb(despues.futbol)} (la liga: ${kb(despues.liga)}; ${l.campeones.length} campeones guardados)`);
console.log(`Lo que pesa la liga en su momento más lleno (una temporada entera: todos los resultados de todas las categorías y los campeones): ${kb(picoDeLiga)}; al empezar la temporada siguiente se tira lo jugado y solo quedan los campeones (unos ${f(l.campeones.length ? JSON.stringify(l.campeones).length / l.campeones.length : 0, 0)} bytes por categoría y temporada).`);
const h = l.historial ?? [];
console.log(`El historial de cada temporada (clasificaciones, playoff, ascensos y descensos y cada partido): ${h.length} temporadas guardadas, ${kb(JSON.stringify(h).length)} en total, ${kb(JSON.stringify(h).length / Math.max(1, h.length))} por temporada`);
const t0 = h[0];
if (t0) {
  const partes = { partidos: 0, tablas: 0, equipos: 0, playoff: 0, cambios: 0 };
  for (const c of Object.values(t0.categorias)) {
    partes.cambios += JSON.stringify(c.cambios).length;
    for (const d of c.divisiones) {
      partes.playoff += JSON.stringify(d.playoff ?? null).length;
      for (const g of d.grupos) { partes.partidos += JSON.stringify(g.partidos).length; partes.tablas += JSON.stringify(g.tabla).length; partes.equipos += JSON.stringify(g.equipos).length; }
    }
  }
  console.log(`  Por temporada: partidos ${kb(partes.partidos)}, clasificaciones ${kb(partes.tablas)}, nombres de equipo ${kb(partes.equipos)}, playoff ${kb(partes.playoff)}, ascensos y descensos ${kb(partes.cambios)}`);
  console.log(`  Con el historial, la partida entera crece ${kb(JSON.stringify(h).length / Math.max(1, h.length))} por temporada: en 70 años serían ${f((70 * JSON.stringify(h).length) / Math.max(1, h.length) / 1024 / 1024)} MB`);
}

// Lo que pesan las estadísticas y la experiencia de cada jugador (F2.4): la temporada en curso, el historial de temporadas cerradas y la experiencia por puesto, de todos los jugadores de fútbol.
{
  const npcs = ((g.moduleState('npcs') as { npcs: { deporte?: string; est?: Record<string, unknown>; estHist?: Record<string, unknown[]>; exp?: Record<string, unknown>; afin?: Record<string, unknown>; faltas?: Record<string, unknown> }[] }).npcs).filter((n) => n.deporte === 'futbol');
  const peso = (k: 'est' | 'estHist' | 'exp' | 'afin' | 'faltas'): number => npcs.reduce((t, n) => t + (n[k] ? JSON.stringify(n[k]).length : 0), 0);
  const conEst = npcs.filter((n) => n.est).length;
  const cerradas = npcs.reduce((t, n) => t + (n.estHist?.futbol?.length ?? 0), 0);
  console.log(`\nEstadísticas por jugador (${npcs.length} jugadores de fútbol, ${conEst} con estadísticas): temporada en curso ${kb(peso('est'))}, historial ${kb(peso('estHist'))} (${cerradas} temporadas cerradas en total), experiencia por puesto ${kb(peso('exp'))}`);
  const porTemporada = (peso('estHist') / Math.max(1, cerradas)) * (cerradas / Math.max(1, TEMPORADAS - 1)) || 0;
  console.log(`  Crece unos ${kb(peso('est') + peso('exp'))} la temporada en curso y ${kb(porTemporada)} de historial por temporada cerrada: en 70 años, unos ${f((70 * (porTemporada + peso('exp') / 70)) / 1024 / 1024)} MB`);
}

// El día de partido de los PNJ: quién ha llegado tarde a alguna convocatoria (relación con su entrenador) o ha faltado (asistencia) y lo que pesa guardarlo: solo lo llevan los PNJ que tienen algo anotado.
{
  const npcs = ((g.moduleState('npcs') as { npcs: { deporte?: string; afin?: Record<string, unknown>; faltas?: Record<string, unknown> }[] }).npcs).filter((n) => n.deporte === 'futbol');
  const conAfin = npcs.filter((n) => n.afin).length;
  const conFaltas = npcs.filter((n) => n.faltas).length;
  const peso = (k: 'afin' | 'faltas'): number => npcs.reduce((t, n) => t + (n[k] ? JSON.stringify(n[k]).length : 0), 0);
  console.log(`\nDía de partido de los PNJ tras ${TEMPORADAS} temporadas: ${conAfin} de ${npcs.length} jugadores con relación con su entrenador anotada por llegar tarde (${kb(peso('afin'))}); ${conFaltas} con faltas a partidos anotadas (${kb(peso('faltas'))})`);
}
