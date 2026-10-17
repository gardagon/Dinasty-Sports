import type { Area, RunResult } from './runner';

/** Resultados agregados de un bot (media de todas las semillas). */
export interface BotSummary {
  bot: string;
  runs: number;
  /** Serie semanal media por área. */
  series: Record<string, number[]>;
  start: Record<string, number>;
  final: Record<string, number>;
  extras: Record<string, number | null>;
  problems: string[];
  actions: number;
  ms: number;
  hoursByTag: Record<string, number>;
}

export interface Check {
  level: 'ok' | 'aviso' | 'fallo';
  name: string;
  detail: string;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function summarize(results: RunResult[], areas: Area[]): BotSummary[] {
  const byBot = new Map<string, RunResult[]>();
  for (const r of results) byBot.set(r.bot, [...(byBot.get(r.bot) ?? []), r]);

  return [...byBot].map(([bot, runs]) => {
    const weeks = Math.min(...runs.map((r) => r.snapshots.length));
    const series: Record<string, number[]> = {};
    const start: Record<string, number> = {};
    const final: Record<string, number> = {};
    for (const a of areas) {
      series[a.key] = Array.from({ length: weeks }, (_, w) => mean(runs.map((r) => r.snapshots[w].areas[a.key])));
      start[a.key] = mean(runs.map((r) => r.snapshots[0].areas[a.key]));
      final[a.key] = mean(runs.map((r) => r.final.areas[a.key]));
    }
    const extraKeys = new Set(runs.flatMap((r) => Object.keys(r.extras)));
    const extras: Record<string, number | null> = {};
    for (const k of extraKeys) {
      const vals = runs.map((r) => r.extras[k]).filter((v): v is number => typeof v === 'number');
      extras[k] = vals.length ? mean(vals) : null;
    }
    const tags = new Set(runs.flatMap((r) => Object.keys(r.minutesByTag)));
    const hoursByTag: Record<string, number> = {};
    for (const t of tags) hoursByTag[t] = mean(runs.map((r) => (r.minutesByTag[t] ?? 0) / 60));
    return {
      bot,
      runs: runs.length,
      series,
      start,
      final,
      extras,
      problems: runs.flatMap((r) => r.problems.map((p) => `[semilla ${r.seed}] ${p}`)),
      actions: runs.reduce((a, r) => a + r.actions, 0),
      ms: runs.reduce((a, r) => a + r.ms, 0),
      hoursByTag,
    };
  });
}

/** Puntuación global: media de las áreas de habilidad y genéricas (sin estado). */
export function globalScore(s: BotSummary, areas: Area[]): number {
  const keys = areas.filter((a) => !a.key.includes('.')).map((a) => a.key);
  return mean(keys.map((k) => s.final[k]));
}

/**
 * CHEQUEOS DE SENTIDO DEL JUEGO.
 * "fallo" = algo está roto. "aviso" = el balance probablemente no tiene sentido.
 * Los umbrales están aquí a la vista para ajustarlos según evolucione el diseño.
 */
export function runChecks(sum: BotSummary[], areas: Area[], days: number): Check[] {
  const checks: Check[] = [];
  const get = (id: string) => sum.find((s) => s.bot === id);
  const has = (key: string) => areas.some((a) => a.key === key);
  const add = (ok: boolean, level: 'aviso' | 'fallo', name: string, detail: string) =>
    checks.push({ level: ok ? 'ok' : level, name, detail });
  const f = (n: number | null | undefined, d = 1) => (n === null || n === undefined ? '—' : n.toFixed(d));

  // 1. Integridad
  const problems = sum.flatMap((s) => s.problems.map((p) => `${s.bot}: ${p}`));
  add(problems.length === 0, 'fallo', 'Invariantes y bloqueos', problems.length ? problems.slice(0, 5).join(' | ') : 'Ninguna stat fuera de rango, ningún bloqueo, ninguna acción fallida.');

  // 2. Rendimiento del motor
  const totalActions = sum.reduce((a, s) => a + s.actions, 0);
  const totalMs = sum.reduce((a, s) => a + s.ms, 0);
  const runs = sum.reduce((a, s) => a + s.runs, 0);
  const msPorAnio = (totalMs / runs) * (365 / days);
  add(msPorAnio < 3000, 'fallo', 'Rendimiento', `${Math.round(totalActions / (totalMs / 1000)).toLocaleString('es-ES')} acciones/s · ${Math.round(msPorAnio)} ms por año simulado (límite 3000 ms).`);

  const eq = get('equilibrado');
  const atl = get('atleta');
  const emp = get('empollon');
  const vago = get('vago');
  const sobre = get('sobreentrena');
  const aband = get('abandono');

  // 3. Progreso real
  if (eq && has('atletismo') && has('estudios')) {
    const dA = eq.final.atletismo - eq.start.atletismo;
    const dE = eq.final.estudios - eq.start.estudios;
    add(dA > 10 && dE > 8, 'aviso', 'El esfuerzo hace progresar', `Equilibrado: atletismo +${f(dA)}, estudios +${f(dE)} (esperado > +10 y > +8).`);
  }

  // 4. Especializarse compensa
  if (eq && atl && has('atletismo')) {
    add(atl.final.atletismo > eq.final.atletismo, 'aviso', 'Especialista deportivo supera al equilibrado', `Atleta ${f(atl.final.atletismo)} vs equilibrado ${f(eq.final.atletismo)} en atletismo.`);
  }
  if (eq && emp && has('estudios')) {
    add(emp.final.estudios > eq.final.estudios, 'aviso', 'Especialista en estudios supera al equilibrado', `Empollón ${f(emp.final.estudios)} vs equilibrado ${f(eq.final.estudios)} en estudios.`);
  }

  // 5. No hacer nada no puede ser lo mejor
  if (eq && vago) {
    const gE = globalScore(eq, areas);
    const gV = globalScore(vago, areas);
    add(gE > gV, 'fallo', 'Esforzarse rinde más que no hacer nada', `Puntuación global: equilibrado ${f(gE)} vs vago ${f(gV)}.`);
  }

  // 6. El sobreentrenamiento no debe ser la estrategia ganadora
  if (sobre && atl && has('atletismo')) {
    const ventaja = sobre.final.atletismo / Math.max(1e-9, atl.final.atletismo);
    const salud = sobre.final['gen.salud'];
    add(ventaja < 1.1 || (salud !== undefined && salud < 50), 'aviso', 'Sobreentrenar no compensa', `Sobreentrenar da un ${f(Math.abs(ventaja - 1) * 100, 0)} % ${ventaja >= 1 ? 'más' : 'menos'} de atletismo que entrenar con cabeza, con salud final ${f(salud, 0)}.`);
  }

  // 7. Techo no trivial: nadie al máximo demasiado pronto
  const rapidos: string[] = [];
  for (const s of sum) {
    for (const a of areas.filter((x) => !x.key.includes('.') && !x.key.startsWith('grupo:'))) {
      const w = s.series[a.key].findIndex((v) => v >= 90);
      if (w >= 0 && w < 12) rapidos.push(`${s.bot}/${a.label} en semana ${w}`);
    }
  }
  add(rapidos.length === 0, 'aviso', 'Nadie llega a 90 antes de la semana 12', rapidos.length ? rapidos.join(', ') : 'Correcto.');

  // 8. Caída al abandonar: notable pero no destructiva
  if (aband && has('atletismo')) {
    const serie = aband.series.atletismo;
    const pico = Math.max(...serie.slice(0, 9));
    const fin = serie[serie.length - 1];
    const caida = pico > 0 ? (pico - fin) / pico : 0;
    if (serie.length > 14) {
      add(caida > 0.03 && caida < 0.4, 'aviso', 'Caída al dejar el deporte', `Pico ${f(pico)} → final ${f(fin)} (−${f(caida * 100, 0)}%; esperado entre 3% y 40%).`);
    }
  }

  // 9. Ninguna estrategia gana en todo
  const habAreas = areas.filter((a) => !a.key.includes('.') && !a.key.startsWith('grupo:'));
  if (habAreas.length > 1) {
    const ganadores = habAreas.map((a) => [...sum].sort((x, y) => y.final[a.key] - x.final[a.key])[0].bot);
    const dominante = ganadores.every((g) => g === ganadores[0]);
    add(!dominante, 'aviso', 'No hay estrategia dominante', dominante ? `"${ganadores[0]}" gana en todas las áreas.` : `Mejores por área: ${habAreas.map((a, i) => `${a.label}: ${ganadores[i]}`).join(', ')}.`);
  }

  // 10. Jugar con sentido no destroza la salud
  const sanos = sum.filter((s) => !['sobreentrena', 'aleatorio'].includes(s.bot));
  const enfermos = sanos.filter((s) => (s.final['gen.salud'] ?? 100) < 50).map((s) => `${s.bot} (${f(s.final['gen.salud'])})`);
  add(enfermos.length === 0, 'aviso', 'Las estrategias razonables mantienen la salud', enfermos.length ? `Salud < 50: ${enfermos.join(', ')}` : 'Correcto.');

  return checks;
}
