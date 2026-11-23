/**
 * El reparto de los eventos que salen: por franja horaria, lugar, día de la semana y persona, y las cifras del ritmo objetivo
 * (media por semana, días de clase sin evento, fuera del aula y del patio, en casa y en fin de semana). Lo usa `npm run sim:eventos`.
 * Las cifras salen de lo que registra el medidor del simulador (`runBot(..., { medirRitmo: true })`): la hora y el lugar son los del reloj
 * en el momento en que le sale el evento al personaje (al acabar la acción que lo provocó).
 */
import { JORNADA_ESCOLAR } from '@ds/contracts';
import type { Ocurrencia, RunResult } from '../../sim/src/index';

/** El ritmo objetivo decidido para el lote 2 (docs/relevo/sucesos-lote-2.md §2, C6). */
export const RITMO_OBJETIVO = {
  mediaPorSemana: 6,
  minPorSemana: 4,
  maxPorSemana: 9,
  maxDiasLectivosSinEvento: 0.35,
  minFueraDeAulaYPatioPorSemana: 1,
  minEnCasaOFinDeSemanaPorSemana: 1,
} as const;

const hhmm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const [recreoDesde, recreoHasta] = JORNADA_ESCOLAR.recreo;

/** Las franjas del día, de madrugada a noche (con los límites del colegio de `JORNADA_ESCOLAR`). */
export const FRANJAS: { id: string; desde: number; hasta: number }[] = [
  { id: `madrugada (0:00–7:00)`, desde: 0, hasta: 7 * 60 },
  { id: `antes de clase (7:00–${hhmm(JORNADA_ESCOLAR.clases[0][0] + 10)})`, desde: 7 * 60, hasta: JORNADA_ESCOLAR.clases[0][0] + 10 },
  { id: `clases de la mañana (${hhmm(JORNADA_ESCOLAR.clases[0][0] + 10)}–${hhmm(recreoDesde)})`, desde: JORNADA_ESCOLAR.clases[0][0] + 10, hasta: recreoDesde },
  { id: `recreo (${hhmm(recreoDesde)}–${hhmm(recreoHasta)})`, desde: recreoDesde, hasta: recreoHasta },
  { id: `clases tras el recreo (${hhmm(recreoHasta)}–14:00)`, desde: recreoHasta, hasta: 14 * 60 },
  { id: 'mediodía (14:00–17:00)', desde: 14 * 60, hasta: 17 * 60 },
  { id: 'tarde (17:00–20:00)', desde: 17 * 60, hasta: 20 * 60 },
  { id: 'noche (20:00–24:00)', desde: 20 * 60, hasta: 24 * 60 },
];
export const franjaDe = (minuto: number): string => FRANJAS.find((f) => minuto >= f.desde && minuto < f.hasta)!.id;
export const DIAS_DE_LA_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export interface Medida {
  bot: string;
  /** Eventos por semana, en cada reparto. */
  semanas: number;
  total: number;
  porFranja: Record<string, number>;
  porLugar: Record<string, number>;
  porDia: Record<string, number>;
  porPersona: Record<string, number>;
  personasDistintas: number;
  ritmo: {
    porSemana: number;
    /** % de semanas completas con menos de `minPorSemana` y con más de `maxPorSemana`. */
    semanasPorDebajo: number;
    semanasPorEncima: number;
    /** % de los días de clase sin ningún evento. */
    diasLectivosSinEvento: number;
    fueraDeAulaYPatioPorSemana: number;
    enCasaOFinDeSemanaPorSemana: number;
    /** Los dos por separado, para ver de dónde sale. */
    enCasaPorSemana: number;
    enFinDeSemanaPorSemana: number;
    /** % de semanas sin ningún evento en el que hay que decidir. */
    semanasSinDecision: number;
  };
}

const suma = (m: Record<string, number>, k: string, n = 1) => void (m[k] = (m[k] ?? 0) + n);

/** Mide un bot a partir de sus partidas (todas las semillas juntas). */
export function medir(bot: string, resultados: readonly RunResult[]): Medida {
  const m: Medida = { bot, semanas: 0, total: 0, porFranja: {}, porLugar: {}, porDia: {}, porPersona: {}, personasDistintas: 0, ritmo: {} as Medida['ritmo'] };
  const personas = new Set<string>();
  let diasLectivos = 0;
  let diasLectivosConEvento = 0;
  let semanasCompletas = 0;
  let debajo = 0;
  let encima = 0;
  let sinDecision = 0;
  let fuera = 0;
  let casa = 0;
  let finde = 0;
  let casaOFinde = 0;
  let dias = 0;
  resultados.forEach((r, n) => {
    const ritmo = r.ritmo;
    if (!ritmo) return;
    dias += r.days;
    const os: readonly Ocurrencia[] = ritmo.ocurrencias.filter((o) => o.dia < r.days);
    for (const o of os) {
      m.total++;
      suma(m.porFranja, franjaDe(o.minuto));
      suma(m.porLugar, o.lugar);
      suma(m.porDia, DIAS_DE_LA_SEMANA[o.diaDeLaSemana]);
      for (const p of o.personas) (suma(m.porPersona, p.tipo), personas.add(`${n}:${p.id}`));
      if (o.lugar !== 'aula' && o.lugar !== 'patio') fuera++;
      if (o.lugar === 'casa') casa++;
      if (o.diaDeLaSemana >= 5) finde++;
      if (o.lugar === 'casa' || o.diaDeLaSemana >= 5) casaOFinde++;
    }
    const conEvento = new Set(os.map((o) => o.dia));
    diasLectivos += ritmo.diasLectivos.length;
    diasLectivosConEvento += ritmo.diasLectivos.filter((d) => conEvento.has(d)).length;
    // Semanas completas (de lunes a domingo, que es como empieza la semana del juego).
    const porSemana = new Map<number, Ocurrencia[]>();
    for (const o of os) porSemana.set(Math.floor(o.dia / 7), [...(porSemana.get(Math.floor(o.dia / 7)) ?? []), o]);
    for (let w = 0; w < Math.floor(r.days / 7); w++) {
      const delaSemana = porSemana.get(w) ?? [];
      semanasCompletas++;
      if (delaSemana.length < RITMO_OBJETIVO.minPorSemana) debajo++;
      if (delaSemana.length > RITMO_OBJETIVO.maxPorSemana) encima++;
      if (!delaSemana.some((o) => o.decision)) sinDecision++;
    }
  });
  m.semanas = dias / 7;
  m.personasDistintas = resultados.length ? personas.size / resultados.length : 0;
  const x = (n: number) => (m.semanas ? n / m.semanas : 0);
  m.ritmo = {
    porSemana: x(m.total),
    semanasPorDebajo: semanasCompletas ? (100 * debajo) / semanasCompletas : 0,
    semanasPorEncima: semanasCompletas ? (100 * encima) / semanasCompletas : 0,
    diasLectivosSinEvento: diasLectivos ? (100 * (diasLectivos - diasLectivosConEvento)) / diasLectivos : 0,
    fueraDeAulaYPatioPorSemana: x(fuera),
    enCasaOFinDeSemanaPorSemana: x(casaOFinde),
    enCasaPorSemana: x(casa),
    enFinDeSemanaPorSemana: x(finde),
    semanasSinDecision: semanasCompletas ? (100 * sinDecision) / semanasCompletas : 0,
  };
  return m;
}

/** Junta las medidas de varios bots en una sola (la media de todos). */
export function juntar(medidas: readonly Medida[]): Medida {
  const t: Medida = { bot: 'todos', semanas: 0, total: 0, porFranja: {}, porLugar: {}, porDia: {}, porPersona: {}, personasDistintas: 0, ritmo: {} as Medida['ritmo'] };
  for (const m of medidas) {
    t.semanas += m.semanas;
    t.total += m.total;
    for (const k of ['porFranja', 'porLugar', 'porDia', 'porPersona'] as const) for (const [a, n] of Object.entries(m[k])) suma(t[k], a, n);
  }
  const media = (f: (m: Medida) => number) => medidas.reduce((a, m) => a + f(m), 0) / (medidas.length || 1);
  t.personasDistintas = media((m) => m.personasDistintas);
  for (const clave of Object.keys(medidas[0]?.ritmo ?? {}) as (keyof Medida['ritmo'])[]) t.ritmo[clave] = media((m) => m.ritmo[clave]);
  return t;
}

const f1 = (n: number) => n.toFixed(1);
const marca = (ok: boolean) => (ok ? '✅' : '⚠️');

/** Las tablas en Markdown (se pegan tal cual en un relevo). */
export function tablas(porBot: readonly Medida[]): string {
  const todos = juntar(porBot);
  const cols = [...porBot, todos];
  const cabecera = (primera: string) => `| ${primera} | ${cols.map((c) => c.bot).join(' | ')} |\n|---|${cols.map(() => '---:').join('|')}|`;
  const porSemana = (c: Medida, n: number) => f1(c.semanas ? n / c.semanas : 0);
  const reparto = (titulo: string, clave: 'porFranja' | 'porLugar' | 'porDia' | 'porPersona', orden?: readonly string[]): string => {
    const claves = orden ? [...orden] : [...new Set(cols.flatMap((c) => Object.keys(c[clave])))].sort((a, b) => (todos[clave][b] ?? 0) - (todos[clave][a] ?? 0));
    return `### ${titulo} (eventos por semana)\n\n${cabecera(titulo.split(' ')[1] ?? titulo)}\n${claves.map((k) => `| ${k} | ${cols.map((c) => porSemana(c, c[clave][k] ?? 0)).join(' | ')} |`).join('\n')}\n`;
  };
  const r = todos.ritmo;
  const filas: [string, string, (m: Medida) => number, string, (n: number) => boolean][] = [
    ['Eventos por semana (media)', `${RITMO_OBJETIVO.mediaPorSemana} (entre ${RITMO_OBJETIVO.minPorSemana} y ${RITMO_OBJETIVO.maxPorSemana})`, (m) => m.ritmo.porSemana, '', (n) => n >= RITMO_OBJETIVO.mediaPorSemana - 1 && n <= RITMO_OBJETIVO.maxPorSemana],
    ['% de semanas con menos de 4', '—', (m) => m.ritmo.semanasPorDebajo, ' %', () => true],
    ['% de semanas con más de 9', '0', (m) => m.ritmo.semanasPorEncima, ' %', (n) => n === 0],
    ['% de días de clase sin ningún evento', `≤ ${RITMO_OBJETIVO.maxDiasLectivosSinEvento * 100} %`, (m) => m.ritmo.diasLectivosSinEvento, ' %', (n) => n <= RITMO_OBJETIVO.maxDiasLectivosSinEvento * 100],
    ['Fuera del aula y del patio, por semana', `≥ ${RITMO_OBJETIVO.minFueraDeAulaYPatioPorSemana}`, (m) => m.ritmo.fueraDeAulaYPatioPorSemana, '', (n) => n >= RITMO_OBJETIVO.minFueraDeAulaYPatioPorSemana],
    ['En casa o en fin de semana, por semana', `≥ ${RITMO_OBJETIVO.minEnCasaOFinDeSemanaPorSemana}`, (m) => m.ritmo.enCasaOFinDeSemanaPorSemana, '', (n) => n >= RITMO_OBJETIVO.minEnCasaOFinDeSemanaPorSemana],
    ['   de ellos, en casa', '—', (m) => m.ritmo.enCasaPorSemana, '', () => true],
    ['   de ellos, en fin de semana', '—', (m) => m.ritmo.enFinDeSemanaPorSemana, '', () => true],
    ['% de semanas sin ningún evento que se decide', '0', (m) => m.ritmo.semanasSinDecision, ' %', (n) => n === 0],
  ];
  const ritmo = `### Ritmo objetivo\n\n| Cifra | Objetivo | ${cols.map((c) => c.bot).join(' | ')} | |\n|---|---|${cols.map(() => '---:').join('|')}|---|\n${filas.map(([nombre, objetivo, f, u, ok]) => `| ${nombre} | ${objetivo} | ${cols.map((c) => `${f1(f(c))}${u}`).join(' | ')} | ${marca(ok(f(todos)))} |`).join('\n')}\n\n_La última columna es el veredicto sobre la media de todos los bots._\n`;
  const personas = `\nPersonas distintas con las que le pasa algo en la partida (media por bot): ${cols.map((c) => `${c.bot} ${f1(c.personasDistintas)}`).join(' · ')}.\n`;
  return [
    ritmo,
    reparto('Por franja horaria', 'porFranja', FRANJAS.map((f) => f.id)),
    reparto('Por lugar', 'porLugar'),
    reparto('Por día de la semana', 'porDia', DIAS_DE_LA_SEMANA),
    `### Lectivo o fin de semana (eventos por semana)\n\n${cabecera('Día')}\n| día de clase (lunes a viernes) | ${cols.map((c) => porSemana(c, DIAS_DE_LA_SEMANA.slice(0, 5).reduce((a, d) => a + (c.porDia[d] ?? 0), 0))).join(' | ')} |\n| fin de semana | ${cols.map((c) => porSemana(c, DIAS_DE_LA_SEMANA.slice(5).reduce((a, d) => a + (c.porDia[d] ?? 0), 0))).join(' | ')} |\n`,
    reparto('Por persona (tipo)', 'porPersona'),
    personas,
    `_Eventos totales de todos los bots: ${r.porSemana === 0 ? 0 : todos.total} en ${f1(todos.semanas)} semanas de juego._`,
  ].join('\n');
}
