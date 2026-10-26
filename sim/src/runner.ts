import { SERVICES, type NpcDirectory, type StatDef, type StudiesService } from '@ds/contracts';
import { checkInvariants, seededRng, type Game } from '@ds/core';
import { nuevaPartida } from '@ds/game';
import type { Bot, BotMemory } from './bots';
import { hacer, opcionesDelBot } from './pasos';

/**
 * Ejecuta un bot durante N días y recoge todo lo necesario para analizar
 * el balance (subida/caída de habilidades) y el rendimiento del motor.
 */

export interface Area {
  key: string;
  label: string;
  stats: string[];
}

export interface Snapshot {
  week: number;
  areas: Record<string, number>;
  stats: Record<string, number>;
}

export interface RunResult {
  bot: string;
  seed: number;
  days: number;
  actions: number;
  ms: number;
  problems: string[];
  snapshots: Snapshot[];
  final: Snapshot;
  /** Datos de módulos interesantes para el informe (notas, carreras...). */
  extras: Record<string, number | null>;
  minutesByTag: Record<string, number>;
}

/** Áreas automáticas: una por módulo con habilidades + grupos de genéricas + cada stat de estado. */
export function areasFor(game: Game): Area[] {
  const areas: Area[] = [];
  const byModule = new Map<string, StatDef[]>();
  const byGroup = new Map<string, StatDef[]>();
  for (const s of game.registry.statList) {
    if (s.def.category === 'habilidad') byModule.set(s.module, [...(byModule.get(s.module) ?? []), s.def]);
    else if (s.def.category === 'generica') byGroup.set(s.def.group ?? 'Genéricas', [...(byGroup.get(s.def.group ?? 'Genéricas') ?? []), s.def]);
    else areas.push({ key: s.def.id, label: s.def.name, stats: [s.def.id] });
  }
  const mods = game.registry.modules;
  const hab = [...byModule].map(([m, defs]) => ({
    key: m,
    label: mods.find((x) => x.id === m)?.name ?? m,
    stats: defs.map((d) => d.id),
  }));
  const gen = [...byGroup].map(([g, defs]) => ({ key: `grupo:${g}`, label: g, stats: defs.map((d) => d.id) }));
  return [...hab, ...gen, ...areas];
}

function snapshot(game: Game, areas: Area[]): Snapshot {
  const stats: Record<string, number> = {};
  for (const s of game.registry.statList) stats[s.def.id] = game.stat(s.def.id);
  const a: Record<string, number> = {};
  // Las asignaturas que no se cursan este curso no puntúan en el área de estudios.
  const activas = game.service<StudiesService>(SERVICES.estudios)?.activeSubjects();
  for (const area of areas) {
    const ids = area.key === 'estudios' && activas ? area.stats.filter((id) => activas.includes(id)) : area.stats;
    a[area.key] = ids.reduce((x, id) => x + stats[id], 0) / ids.length;
  }
  return { week: game.time.week, areas: a, stats };
}

function extras(game: Game): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const est = game.service<StudiesService>(SERVICES.estudios);
  if (est) {
    out.notaMedia = est.average();
    out.faltas = est.absences();
  }
  const jovenes = game.service<NpcDirectory>(SERVICES.npcs)?.list({ tag: 'atleta', maxAge: 11 });
  if (jovenes?.length) out.rivalNivelMaxJoven = Math.max(...jovenes.map((n) => n.levels.atletismo ?? 0));
  const atl = game.moduleState<{ mejorMarca: number | null; carreras: { position: number; superior?: boolean }[] } | undefined>('atletismo');
  if (atl) {
    out.mejorMarca = atl.mejorMarca;
    out.carreras = atl.carreras.length;
    out.podios = atl.carreras.filter((c) => c.position <= 3).length;
    out.victorias = atl.carreras.filter((c) => c.position === 1).length;
    out.carrerasSuperior = atl.carreras.filter((c) => c.superior).length;
  }
  return out;
}

export function runBot(bot: Bot, seed: number, days: number): RunResult {
  const game = nuevaPartida({ seed, playerName: bot.name });
  const rng = seededRng(seed * 31 + 7);
  const areas = areasFor(game);
  const mem: BotMemory = { day: -1, hoy: {}, total: {} };
  const problems: string[] = [];
  const snapshots: Snapshot[] = [snapshot(game, areas)];
  const minutesByTag: Record<string, number> = {};
  let week = game.time.week;

  const t0 = performance.now();
  while (game.time.day < days) {
    if (mem.day !== game.time.day) {
      mem.day = game.time.day;
      mem.hoy = {};
    }
    const opts = opcionesDelBot(game);
    if (!opts.length) {
      problems.push(`Día ${game.time.day} ${game.time.hour}h: ninguna acción disponible (bloqueo)`);
      break;
    }
    const choice = bot.choose(game, opts, rng, mem);
    const paso = hacer(game, opts, choice);
    const r = paso.result;
    if (paso.viaje) minutesByTag.desplazamiento = (minutesByTag.desplazamiento ?? 0) + paso.viaje;
    if (paso.traslado) continue;
    if (!r.ok) {
      problems.push(`Día ${game.time.day}: el bot eligió "${choice}" y falló: ${r.reason}`);
      if (problems.length > 20) break;
      continue;
    }
    mem.total[choice] = (mem.total[choice] ?? 0) + 1;
    const opt = opts.find((o) => o.id === choice)!;
    for (const t of opt.tags) minutesByTag[t] = (minutesByTag[t] ?? 0) + r.duration;

    const inv = checkInvariants(game);
    if (inv.length) {
      problems.push(...inv.map((p) => `Día ${game.time.day}: ${p}`));
      if (problems.length > 20) break;
    }
    if (game.time.week !== week) {
      week = game.time.week;
      snapshots.push(snapshot(game, areas));
    }
  }
  const ms = performance.now() - t0;

  return {
    bot: bot.id,
    seed,
    days,
    actions: game.actionCount,
    ms,
    problems,
    snapshots,
    final: snapshot(game, areas),
    extras: extras(game),
    minutesByTag,
  };
}
