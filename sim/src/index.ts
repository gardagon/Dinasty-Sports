import { nuevaPartida } from '@ds/game';
import { runChecks, summarize, type BotSummary, type Check } from './analysis';
import { BOTS, type Bot } from './bots';
import { areasFor, runBot, type Area, type RunResult } from './runner';

export { BOTS, type Bot } from './bots';
export { runBot, areasFor } from './runner';
export { summarize, runChecks, globalScore } from './analysis';
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
  const results: RunResult[] = [];
  for (const bot of bots) {
    for (let s = 1; s <= opts.seeds; s++) {
      const r = runBot(bot, s * 1000 + 17, opts.days);
      results.push(r);
      opts.onProgress?.(`${bot.name.padEnd(20)} semilla ${s}: ${r.actions} acciones en ${r.ms.toFixed(0)} ms${r.problems.length ? ` · ${r.problems.length} problemas` : ''}`);
    }
  }
  const summary = summarize(results, areas);
  return { results, summary, checks: runChecks(summary, areas, opts.days), areas };
}
