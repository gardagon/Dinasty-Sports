import { APORTE_DE_SUCESOS, SERVICES, type LugaresService, elegirPorCaracter, rngEstable, type AporteDeSucesos, type GameModule, type NpcDirectory, type OpcionDef, type ProfileService, type StatDef, type StudiesService, type SucesoDef, type SucesosService } from '@ds/contracts';
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

/** Un evento que ha salido, con cuándo, dónde y con quién (solo si se pide medir el ritmo: `runBot(..., { medirRitmo: true })`). */
export interface Ocurrencia {
  suceso: string;
  /** Día de la partida, minuto del día y día de la semana (0 = lunes) en que le salió al personaje. */
  dia: number;
  minuto: number;
  diaDeLaSemana: number;
  /** ¿Día de clase? */
  lectivo: boolean;
  lugar: string;
  /** ¿Es un evento en el que hay que decidir (con opciones)? */
  decision: boolean;
  /** Tipo de cada persona que participa (su papel en el mundo: `progenitor`, `profesor`, `companero`…). */
  personas: { id: string; tipo: string }[];
}

/** Lo que hace falta para medir el ritmo de los eventos: cada ocurrencia y qué días fueron de clase. */
export interface Ritmo {
  ocurrencias: Ocurrencia[];
  diasLectivos: number[];
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
  /** Cuántas veces ha salido cada suceso (evento) en la partida. */
  sucesos: Record<string, number>;
  /** Cuándo, dónde y con quién ha salido cada evento (solo con `medirRitmo`; sin pedirlo no existe y la huella de la partida no cambia). */
  ritmo?: Ritmo;
}

/**
 * Apunta los eventos que van saliendo: cada evento con decisión se apunta al aparecer (antes de que el bot decida, cuando el reloj aún marca
 * la hora en que le salió) y cada evento sin decisión, al verlo en lo vivido. Solo lee servicios: no toca la partida ni su azar.
 */
class Medidor {
  readonly ocurrencias: Ocurrencia[] = [];
  /** Los días de clase que ha vivido (se apunta cada vez que se mira). */
  readonly lectivos = new Set<number>();
  private vistos = new Set<number>();
  private recuerdos = 0;
  private fuera: Set<string>;
  constructor(private game: Game) {
    this.fuera = new Set([...sucesosDeLaPartida(game)].filter((d) => d.fueraDelRitmo).map((d) => d.id));
  }
  private apuntar(suceso: string, personas: readonly string[], decision: boolean): void {
    if (this.fuera.has(suceso)) return;
    const g = this.game;
    const npcs = g.service<NpcDirectory>(SERVICES.npcs);
    const t = g.time;
    this.ocurrencias.push({
      suceso,
      dia: t.day,
      minuto: t.minuteOfDay,
      diaDeLaSemana: t.weekday,
      lectivo: t.isSchoolDay,
      lugar: g.service<LugaresService>(SERVICES.lugares)?.actual().id ?? '?',
      decision,
      personas: personas.map((id) => ({ id, tipo: npcs?.get(id)?.role ?? 'persona' })),
    });
  }
  /** Se llama antes de que decida el bot (los pendientes acaban de salir) y después de cada acción (lo que ha salido sin decisión). */
  mirar(): void {
    if (this.game.time.isSchoolDay) this.lectivos.add(this.game.time.day);
    const svc = this.game.service<SucesosService>(SERVICES.sucesos);
    if (!svc) return;
    for (const p of svc.pendientes()) {
      if (this.vistos.has(p.id)) continue;
      this.vistos.add(p.id);
      this.apuntar(p.suceso, Object.values(p.reparto), true);
    }
    const todos = svc.recuerdos();
    // Los que tenían decisión ya se apuntaron al aparecer; aquí solo lo que salió sin ella.
    for (const r of todos.slice(this.recuerdos)) if (r.opcion === undefined) this.apuntar(r.suceso, r.personas, false);
    this.recuerdos = todos.length;
  }
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

/** Con qué se juega: por defecto, los módulos del juego (con su atletismo); un deporte instalable (el fútbol) se pasa aquí. */
export interface Juego {
  modulos?: readonly GameModule<any>[];
  deportes?: readonly string[];
  /** Id del país (y ciudad) de la partida; por defecto el de `nuevaPartida`. Hay que registrarlo antes (`registrarPais`). */
  pais?: string;
}

/**
 * Decide el primer suceso pendiente: entre las opciones que se pueden elegir, la que más va con el carácter del personaje (con un azar estable).
 * Devuelve si ha decidido algo. Es la misma regla con la que decidirá un PNJ (`elegirPorCaracter`).
 */
export function decidirSucesos(game: Game, seed: number): boolean {
  const svc = game.service<SucesosService>(SERVICES.sucesos);
  const p = svc?.pendientes()[0];
  if (!p) return false;
  const caracter = game.service<ProfileService>(SERVICES.perfil)?.view().caracter ?? {};
  const def = [...sucesosDeLaPartida(game)].find((x) => x.id === p.suceso);
  const elegibles = p.opciones.filter((o) => o.elegible).map((o) => o.id);
  const opciones = (def?.opciones ?? p.opciones.map((o) => ({ id: o.id, texto: o.texto }))) as OpcionDef[];
  const elegida = elegirPorCaracter(opciones.filter((o) => elegibles.includes(o.id)), elegibles, (eje) => caracter[eje], rngEstable(seed, 'bot', p.suceso, p.id).next());
  const accion = p.opciones.find((o) => o.id === elegida)?.accion;
  return !!accion && game.perform(accion).ok;
}

/** Las definiciones de los sucesos de la partida (con las opciones de la variante que toque no hace falta: la inclinación de carácter va en las del suceso). */
function* sucesosDeLaPartida(game: Game): Generator<SucesoDef> {
  for (const a of game.aportes<AporteDeSucesos>(APORTE_DE_SUCESOS)) {
    if (a.tipo === 'suceso') yield a;
    else if (a.tipo === 'hilo') yield* a.sucesos;
  }
}

function cuentaDeSucesos(game: Game): Record<string, number> {
  const out: Record<string, number> = {};
  // Los avisos del mundo (`fueraDelRitmo`, p. ej. el grupo que se va) no son parte del ritmo de los eventos.
  const fuera = new Set([...sucesosDeLaPartida(game)].filter((d) => d.fueraDelRitmo).map((d) => d.id));
  for (const r of game.service<SucesosService>(SERVICES.sucesos)?.recuerdos() ?? []) if (!fuera.has(r.suceso)) out[r.suceso] = (out[r.suceso] ?? 0) + 1;
  return out;
}

export function runBot(bot: Bot, seed: number, days: number, juego: Juego = {}, opciones: { medirRitmo?: boolean } = {}): RunResult {
  const game = nuevaPartida({ seed, playerName: bot.name, ...(juego.deportes ? { deportes: juego.deportes } : {}), ...(juego.pais ? { pais: juego.pais } : {}) }, juego.modulos);
  const rng = seededRng(seed * 31 + 7);
  const areas = areasFor(game);
  const mem: BotMemory = { day: -1, hoy: {}, total: {} };
  const problems: string[] = [];
  const snapshots: Snapshot[] = [snapshot(game, areas)];
  const minutesByTag: Record<string, number> = {};
  let week = game.time.week;
  const medidor = opciones.medirRitmo ? new Medidor(game) : undefined;

  const t0 = performance.now();
  while (game.time.day < days) {
    if (mem.day !== game.time.day) {
      mem.day = game.time.day;
      mem.hoy = {};
    }
    // Si hay algo que decidir, el bot decide antes de seguir, como lo haría alguien con el carácter de su personaje.
    medidor?.mirar();
    if (decidirSucesos(game, seed)) continue;
    const opts = opcionesDelBot(game, bot.todasLasAcciones);
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
    medidor?.mirar();
    mem.total[choice] = (mem.total[choice] ?? 0) + 1;
    // Un bot puede elegir ir a un sitio (`lugares.ir_*`, que no se les ofrece): no tiene etiquetas.
    const opt = opts.find((o) => o.id === choice);
    for (const t of opt?.tags ?? []) minutesByTag[t] = (minutesByTag[t] ?? 0) + r.duration;

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
    sucesos: cuentaDeSucesos(game),
    minutesByTag,
    ...(medidor ? { ritmo: { ocurrencias: medidor.ocurrencias, diasLectivos: [...medidor.lectivos].filter((d) => d < days).sort((a, b) => a - b) } } : {}),
  };
}
