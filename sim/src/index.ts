import { nuevaPartida } from '@ds/game';
import { calibrar, chequeoDeSucesos, mediana, runChecks, summarize, type BotSummary, type Check } from './analysis';
import { BOTS, type Bot } from './bots';
import { areasFor, runBot, type Area, type RunResult } from './runner';

export { BOTS, type Bot } from './bots';
export type { Ocurrencia, Ritmo, RunResult } from './runner';
export { runBot, areasFor } from './runner';
export { summarize, runChecks, globalScore, frecuenciaDeSucesos, chequeoDeSucesos } from './analysis';
export { decidirSucesos } from './runner';
export { markdownReport, htmlReport } from './report';

export interface SimulationOptions {
  days: number;
  seeds: number;
  bots?: string[];
  onProgress?: (msg: string) => void;
}

export interface SimulationOutput {
  results: RunResult[];
  summary: BotSummary[];
  checks: Check[];
  areas: Area[];
}

/** Ejecuta todas las estrategias × semillas y analiza el resultado. */
export function simulate(opts: SimulationOptions): SimulationOutput {
  const bots: Bot[] = opts.bots?.length ? BOTS.filter((b) => opts.bots!.includes(b.id)) : BOTS;
  const areas = areasFor(nuevaPartida({ seed: 1 }));
  // La máquina va más o menos rápida durante la simulación: se calibra al principio, a la mitad y al final y se usa la mediana.
  const calibraciones = [calibrar()];
  const mitad = Math.floor((bots.length * opts.seeds) / 2);
  const results: RunResult[] = [];
  for (const bot of bots) {
    for (let s = 1; s <= opts.seeds; s++) {
      const r = runBot(bot, s * 1000 + 17, opts.days);
      results.push(r);
      if (results.length === mitad) calibraciones.push(calibrar());
      opts.onProgress?.(`${bot.name.padEnd(20)} semilla ${s}: ${r.actions} acciones en ${r.ms.toFixed(0)} ms${r.problems.length ? ` · ${r.problems.length} problemas` : ''}`);
    }
  }
  const summary = summarize(results, areas);
  calibraciones.push(calibrar());
  const calibracion = mediana(calibraciones);
  return { results, summary, checks: [...runChecks(summary, areas, opts.days, calibracion), chequeoDeSucesos(results)], areas };
}
