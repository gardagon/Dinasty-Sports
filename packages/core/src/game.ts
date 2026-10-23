import {
  CORE_EVENTS,
  MINUTES_PER_DAY,
  SHARED_EVENTS,
  START_MINUTE,
  timeView,
  type ActionContext,
  type ActionDef,
  type ActionDoneData,
  type AppliedModifier,
  type GameEvent,
  type GameModule,
  type InitContext,
  type LogEntry,
  type LogTable,
  CALIDAD_DE_PADRES_DEL_JUGADOR,
  HERENCIA,
  heredarTope,
  nivelInicialHeredado,
  nombreSesgo,
  perfilDePadre,
  repartirHerencia,
  type ReadContext,
  type Rng,
  mezclarZ,
  type StatId,
  type TimeView,
} from '@ds/contracts';
import { computeCap, computeDecay, computeGain, computeSpeed, potentialSpeed } from './progression';
import { buildRegistry, compileAction, modifiersFor, type CompiledAction, type Registry } from './registry';
import { createRng, seededRng, type RngHolder } from './rng';
import { LOG_LIMIT, SAVE_VERSION, type GameState, type Lineage, type ParentGenes } from './state';

/** Lo que la interfaz (o un bot) ve de cada acción antes de elegirla. */
export interface ActionOption {
  id: string;
  name: string;
  description?: string;
  module: string;
  group: string;
  tags: readonly string[];
  available: boolean;
  reason?: string;
  /** Minutos de juego que consumirá. */
  duration: number;
  /** Multiplicador final sobre lo que se entrena. */
  efficiency: number;
  /** Desglose: por qué rinde más o menos. */
  modifiers: AppliedModifier[];
  /** Cambios directos ya escalados por los modificadores de coste. */
  delta: Record<StatId, number>;
  train: readonly { stat: StatId; amount: number }[];
}

export interface ActionResult {
  ok: boolean;
  actionId: string;
  reason?: string;
  duration: number;
  efficiency: number;
  /** Diferencia de cada stat que ha cambiado (incluye caídas del cambio de día). */
  changes: Record<StatId, number>;
  /** Entradas nuevas del registro. */
  log: LogEntry[];
}

export interface CreateOptions {
  seed?: number;
  playerName?: string;
}

const MAX_EVENTS_PER_ACTION = 5000;
const SHARED_EVENT_TYPES: ReadonlySet<string> = new Set(Object.values(SHARED_EVENTS));
const EPS = 1e-9;

/**
 * UNIFICADOR 2 — El motor y su pipeline único de acciones.
 *
 * Toda acción pasa por `perform`: requisitos → modificadores → coste → entrenamiento
 * → lógica propia → avance del tiempo → eventos. Un solo sitio que depurar y medir.
 */
export class Game {
  private readonly rngHolder: RngHolder;
  private readonly rng;
  private readonly queue: GameEvent[] = [];
  private pendingLog: LogEntry[] = [];

  private constructor(
    readonly registry: Registry,
    private readonly s: GameState,
  ) {
    this.rngHolder = {
      get state() {
        return s.rng;
      },
      set state(v: number) {
        s.rng = v;
      },
    };
    this.rng = createRng(this.rngHolder);
  }

  // ------------------------------------------------------------------ creación

  static create(modules: readonly GameModule<any>[], opts: CreateOptions = {}): Game {
    const registry = buildRegistry(modules);
    const seed = (opts.seed ?? Math.floor(Math.random() * 2 ** 31)) | 0;
    const playerName = opts.playerName ?? 'Alex';
    const state: GameState = {
      version: SAVE_VERSION,
      seed,
      rng: seed,
      playerName,
      minute: START_MINUTE,
      stats: {},
      peaks: {},
      baseline: {},
      talent: {},
      lastTrained: {},
      modules: {},
      flags: {},
      log: [],
      actionCount: 0,
    };
    Game.fillMissing(registry, state);
    return new Game(registry, state);
  }

  /** Carga una partida guardada. Las stats y módulos nuevos se inicializan solos. */
  static load(modules: readonly GameModule<any>[], saved: GameState): Game {
    if (saved.version !== SAVE_VERSION) {
      throw new Error(`Versión de guardado ${saved.version} no soportada (actual: ${SAVE_VERSION})`);
    }
    const registry = buildRegistry(modules);
    const state = structuredClone(saved);
    Game.fillMissing(registry, state);
    return new Game(registry, state);
  }

  private static lineage(state: GameState): Lineage {
    return (state.lineage ??= {
      padre: { familias: {}, topes: {} },
      madre: { familias: {}, topes: {} },
      hijo: {},
      origen: {},
    });
  }

  /**
   * Genética de las características nuevas. Las de herencia directa: cada padre recibe un perfil de topes por bandas, el
   * hijo toma la mitad de las capacidades de cada uno (±20 %) y su nivel inicial sale también de los padres. Las derivadas
   * (habilidades, asignaturas) salen de los topes de otras características más una aptitud propia.
   */
  private static genetica(registry: Registry, state: GameState, nuevas: Set<string>): void {
    const rng = seededRng((state.seed ^ 0x9e3779b1) + nuevas.size);
    const conGenetica = registry.statList.filter((s) => nuevas.has(s.def.id) && s.def.genetics);
    const directas = conGenetica.filter((s) => !s.def.genetics!.derivedFrom);
    const lin = Game.lineage(state);
    state.potential ??= {};
    if (directas.length) {
      const ids = directas.map((s) => s.def.id);
      const grupoDe: Record<string, string> = {};
      for (const s of directas) if (s.def.genetics!.grupo) grupoDe[s.def.id] = s.def.genetics!.grupo;
      for (const lado of ['padre', 'madre'] as const) {
        // Los padres del jugador (dificultad normal) quedan en el percentil 50–60 de calidad; el resto del mundo recorre toda la escala.
        const calidad = rng.range(...CALIDAD_DE_PADRES_DEL_JUGADOR.normal);
        const { topes, sesgo } = perfilDePadre(ids, rng, calidad, grupoDe);
        Object.assign(lin[lado].topes, topes);
        lin[lado].sesgo = nombreSesgo(sesgo);
        lin[lado].calidad = calidad;
      }
      const reparto = repartirHerencia(ids, rng);
      const factor = (lin.factor ??= rng.range(HERENCIA.nivelInicial.factorMin, HERENCIA.nivelInicial.factorMax));
      for (const { def, min, max } of directas) {
        const lado = reparto[def.id];
        lin.origen[def.id] = lado;
        const tope = heredarTope(lin[lado].topes[def.id], rng);
        state.potential[def.id] = tope;
        // El nivel inicial también sale del progenitor del que hereda, dentro del rango inicial de la característica.
        if (typeof def.initial !== 'number') {
          const n = nivelInicialHeredado(lin[lado].topes[def.id], factor, rng);
          const v = Math.min(tope, max, Math.max(min, def.initial.min + (def.initial.max - def.initial.min) * n));
          state.stats[def.id] = state.peaks[def.id] = state.baseline[def.id] = v;
        }
      }
    }
    for (const { def } of conGenetica) {
      const g = def.genetics!;
      if (!g.derivedFrom) continue;
      let suma = 0;
      let peso = 0;
      for (const inf of g.derivedFrom) {
        const t = state.potential[inf.stat];
        if (t === undefined) continue;
        suma += inf.weight * t;
        peso += inf.weight;
      }
      if (peso === 0) continue;
      const aptitud = g.aptitude ?? 0.1;
      const v = (suma / peso) * (1 + aptitud * (rng.next() * 2 - 1));
      state.potential[def.id] = Math.min(HERENCIA.max, Math.max(HERENCIA.min, v));
    }
  }

  private static zDeFamilia(p: ParentGenes, familia: string, rng: Rng): number {
    return (p.familias[familia] ??= rng.normal());
  }

  /** Inicializa lo que falte: permite añadir módulos a partidas ya empezadas. */
  private static fillMissing(registry: Registry, state: GameState): void {
    const init = seededRng((state.seed ^ 0x5bd1e995) + Object.keys(state.stats).length);
    const nuevas = new Set(registry.statList.filter((s) => !(s.def.id in state.stats)).map((s) => s.def.id));
    for (const { def, min, max } of registry.statList) {
      if (def.id in state.stats) continue;
      const v =
        typeof def.initial === 'number' ? def.initial : init.range(def.initial.min, def.initial.max);
      const value = Math.min(max, Math.max(min, v));
      state.stats[def.id] = value;
      state.peaks[def.id] = value;
      state.baseline[def.id] = value;
      const spread = def.category === 'estado' ? 0 : (def.talentSpread ?? 0.15);
      state.talent[def.id] = 1 + (init.next() * 2 - 1) * spread;
      state.lastTrained[def.id] = state.minute;
    }
    Game.genetica(registry, state, nuevas);
    const ictx: InitContext = {
      rng: init,
      seed: state.seed,
      playerName: state.playerName,
      topesDePadres: { padre: Game.lineage(state).padre.topes, madre: Game.lineage(state).madre.topes },
      herencia: (familia) => {
        const lin = Game.lineage(state);
        const padre = Game.zDeFamilia(lin.padre, familia, init);
        const madre = Game.zDeFamilia(lin.madre, familia, init);
        lin.hijo[familia] ??= mezclarZ(padre, madre, init);
        return { padre, madre, hijo: lin.hijo[familia] };
      },
    };
    for (const m of registry.modules) {
      if (m.initState && !(m.id in state.modules)) state.modules[m.id] = m.initState(ictx);
    }
  }

  // ------------------------------------------------------------------ lectura

  get time(): TimeView {
    return timeView(this.s.minute);
  }

  get playerName(): string {
    return this.s.playerName;
  }

  get log(): readonly LogEntry[] {
    return this.s.log;
  }

  get actionCount(): number {
    return this.s.actionCount;
  }

  stat(id: StatId): number {
    const v = this.s.stats[id];
    if (v === undefined) throw new Error(`Stat desconocida: ${id}`);
    return v;
  }

  peak(id: StatId): number {
    return this.s.peaks[id] ?? this.stat(id);
  }

  /** Tope genético oculto de una característica (solo para pruebas y simulación; la interfaz no lo enseña). */
  hiddenPotential(id: StatId): number | undefined {
    return this.s.potential?.[id];
  }

  /** Tope genético oculto de un progenitor (solo para pruebas y simulación). */
  parentPotential(lado: 'padre' | 'madre', id: StatId): number | undefined {
    return this.s.lineage?.[lado].topes[id];
  }

  /** Calidad global de un progenitor (0 a 1; los del jugador en normal, 0,5–0,6). Solo para pruebas y la interfaz de pruebas. */
  parentQuality(lado: 'padre' | 'madre'): number | undefined {
    return this.s.lineage?.[lado].calidad;
  }

  /** Sesgo de un progenitor (p. ej. "Dominante físico"), solo para pruebas y la interfaz de pruebas. */
  parentBias(lado: 'padre' | 'madre'): string | undefined {
    return this.s.lineage?.[lado].sesgo;
  }

  /** De qué progenitor hereda una característica de herencia directa (solo para pruebas y la interfaz de pruebas). */
  geneticOrigin(id: StatId): 'padre' | 'madre' | undefined {
    return this.s.lineage?.origen[id];
  }

  cap(id: StatId): number {
    return this.readCtx('core').cap(id);
  }

  talent(id: StatId): number {
    return this.s.talent[id] ?? 1;
  }

  moduleState<S>(moduleId: string): Readonly<S> {
    return this.s.modules[moduleId] as S;
  }

  service<T>(key: string): T | undefined {
    return this.readCtx('core').service<T>(key);
  }

  /** Copia serializable del estado (para guardar). */
  serialize(): GameState {
    return structuredClone(this.s);
  }

  // ------------------------------------------------------------------ acciones

  /** Todas las acciones (estáticas + dinámicas) con su disponibilidad y previsión. */
  listActions(): ActionOption[] {
    return this.allActions().map((a) => this.evaluate(a));
  }

  /** Solo las disponibles (lo que usan los bots). */
  availableActions(): ActionOption[] {
    return this.listActions().filter((o) => o.available);
  }

  preview(actionId: string): ActionOption | undefined {
    const a = this.findAction(actionId);
    return a ? this.evaluate(a) : undefined;
  }

  perform(actionId: string): ActionResult {
    const action = this.findAction(actionId);
    if (!action) return this.fail(actionId, 'Acción desconocida');
    const option = this.evaluate(action);
    if (!option.available) return this.fail(actionId, option.reason ?? 'No disponible');

    const before = { ...this.s.stats };
    this.pendingLog = [];

    // 1. Coste / cambios directos
    for (const [stat, d] of Object.entries(option.delta)) this.rawAdd(stat, d);

    // 2. Entrenamiento y lógica propia, con la eficiencia calculada
    const ctx = this.actionCtx(action.module, option.efficiency);
    for (const t of action.def.train ?? []) ctx.train(t.stat, t.amount);
    action.def.run?.(ctx);
    this.s.actionCount++;

    // 3. Tiempo y eventos
    this.advance(option.duration);
    const done: ActionDoneData = {
      actionId: action.def.id,
      module: action.module,
      tags: action.view.tags,
      duration: option.duration,
      efficiency: option.efficiency,
    };
    this.queue.push({ type: CORE_EVENTS.ACTION_DONE, data: done });
    this.drain();

    const changes: Record<StatId, number> = {};
    for (const [id, v] of Object.entries(this.s.stats)) {
      const d = v - (before[id] ?? v);
      if (Math.abs(d) > 1e-6) changes[id] = d;
    }
    const log = this.pendingLog;
    this.pendingLog = [];
    return { ok: true, actionId, duration: option.duration, efficiency: option.efficiency, changes, log };
  }

  // ------------------------------------------------------------------ internos

  private fail(actionId: string, reason: string): ActionResult {
    return { ok: false, actionId, reason, duration: 0, efficiency: 0, changes: {}, log: [] };
  }

  private allActions(): CompiledAction[] {
    const list = [...this.registry.actionList];
    for (const d of this.registry.dynamicActions) {
      for (const def of d.fn(this.readCtx(d.module))) list.push(compileAction(def, d.module));
    }
    return list;
  }

  private findAction(id: string): CompiledAction | undefined {
    const stat = this.registry.actions.get(id);
    if (stat) return stat;
    for (const d of this.registry.dynamicActions) {
      const def = d.fn(this.readCtx(d.module)).find((a: ActionDef) => a.id === id);
      if (def) return compileAction(def, d.module);
    }
    return undefined;
  }

  private evaluate(action: CompiledAction): ActionOption {
    const { def, module, view } = action;
    const ctx = this.readCtx(module);
    let reason: string | undefined;

    for (const r of def.requires ?? []) {
      const v = ctx.stat(r.stat);
      const name = r.label ?? ctx.statDef(r.stat)?.name ?? r.stat;
      if (r.min !== undefined && v < r.min) reason ??= `Necesitas ${name} ≥ ${r.min}`;
      if (r.max !== undefined && v > r.max) reason ??= `${name} demasiado alto (máx. ${r.max})`;
    }
    if (!reason && def.available) {
      const ok = def.available(ctx);
      if (ok !== true) reason = ok;
    }

    // UNIFICADOR 3 — modificadores por etiquetas
    let efficiency = 1;
    let costMult = 1;
    let durationMult = 1;
    const applied: AppliedModifier[] = [];
    for (const m of modifiersFor(this.registry, view)) {
      const res = m.def.apply(this.readCtx(m.module), view);
      if (!res) continue;
      efficiency *= res.efficiency ?? 1;
      costMult *= res.cost ?? 1;
      durationMult *= res.duration ?? 1;
      applied.push({ id: m.def.id, module: m.module, result: res });
    }

    const base = typeof def.duration === 'function' ? def.duration(ctx) : def.duration;
    const duration = Math.max(1, Math.round(base * durationMult));

    const delta: Record<StatId, number> = {};
    for (const [stat, d] of Object.entries(def.delta ?? {})) {
      const info = this.registry.stats.get(stat)!;
      const isCost = d < 0 && info.def.resource === true;
      const scaled = isCost ? d * costMult : d;
      delta[stat] = scaled;
      if (!reason && isCost && this.s.stats[stat] + scaled < info.min - EPS) {
        reason = `Te falta ${info.def.name.toLowerCase()}`;
      }
    }

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      module,
      group: def.group ?? this.moduleName(module),
      tags: view.tags,
      available: !reason,
      reason,
      duration,
      efficiency,
      modifiers: applied,
      delta,
      train: def.train ?? [],
    };
  }

  private moduleName(id: string): string {
    return this.registry.moduleNames.get(id) ?? id;
  }

  private rawAdd(id: StatId, delta: number): number {
    const info = this.registry.stats.get(id);
    if (!info) throw new Error(`Stat desconocida: ${id}`);
    const before = this.s.stats[id];
    const after = Math.min(info.max, Math.max(info.min, before + delta));
    this.s.stats[id] = after;
    if (after > (this.s.peaks[id] ?? -Infinity)) this.s.peaks[id] = after;
    return after - before;
  }

  private trainStat(id: StatId, amount: number, efficiency: number): number {
    const info = this.registry.stats.get(id);
    if (!info) throw new Error(`Stat desconocida: ${id}`);
    if (info.def.category === 'estado') throw new Error(`"${id}" es de estado: usa addStat, no train`);
    const ctx = this.readCtx('core');
    const norm = (s: string) => ctx.norm(s);
    const pot = this.s.potential?.[id];
    const gain = computeGain(info.def, {
      value: this.s.stats[id],
      min: info.min,
      max: info.max,
      // El tope genético limita lo que se puede llegar a ser; las influencias visibles (edad, capacidades) lo limitan antes.
      cap: pot === undefined ? computeCap(info.def, info.min, info.max, norm) : Math.min(pot, computeCap(info.def, info.min, info.max, norm)),
      talent: this.s.talent[id] ?? 1,
      speed: computeSpeed(info.def, norm) * (pot === undefined ? 1 : potentialSpeed(pot)),
      efficiency,
      amount,
    });
    if (amount > 0) this.s.lastTrained[id] = this.s.minute;
    if (gain > 0) this.rawAdd(id, gain);
    return gain;
  }

  private advance(minutes: number): void {
    const from = this.s.minute;
    const to = from + minutes;
    this.s.minute = to;
    const firstDay = Math.floor(from / MINUTES_PER_DAY) + 1;
    const lastDay = Math.floor(to / MINUTES_PER_DAY);
    for (let d = firstDay; d <= lastDay; d++) {
      this.queue.push({ type: CORE_EVENTS.DAY_END, data: { day: d - 1 } });
      if (d % 7 === 0) this.queue.push({ type: CORE_EVENTS.WEEK_END, data: { week: d / 7 - 1 } });
      this.queue.push({ type: CORE_EVENTS.DAY_START, data: { day: d } });
    }
  }

  private drain(): void {
    let processed = 0;
    while (this.queue.length) {
      const ev = this.queue.shift()!;
      if (++processed > MAX_EVENTS_PER_ACTION) {
        throw new Error(`Bucle de eventos: más de ${MAX_EVENTS_PER_ACTION} en una acción (último: ${ev.type})`);
      }
      if (ev.type === CORE_EVENTS.DAY_END) this.applyDecay();
      for (const h of this.registry.handlers.get(ev.type) ?? []) {
        h.fn(this.actionCtx(h.module, 1), ev);
      }
    }
  }

  private applyDecay(): void {
    for (const { def } of this.registry.decayStats) {
      const id = def.id;
      const days = (this.s.minute - (this.s.lastTrained[id] ?? this.s.minute)) / MINUTES_PER_DAY;
      const next = computeDecay(def, this.s.stats[id], days, this.s.peaks[id], this.s.baseline[id]);
      this.s.stats[id] = next;
    }
  }

  private pushLog(entry: LogEntry): void {
    this.s.log.push(entry);
    if (this.s.log.length > LOG_LIMIT) this.s.log.splice(0, this.s.log.length - LOG_LIMIT);
    this.pendingLog.push(entry);
  }

  // ------------------------------------------------------------------ contextos

  /** Los contextos de lectura no tienen estado propio (leen `s` en vivo): se crean una vez por módulo. */
  private readonly readCache = new Map<string, ReadContext>();

  private readCtx(moduleId: string): ReadContext {
    let ctx = this.readCache.get(moduleId);
    if (!ctx) {
      ctx = this.makeReadCtx(moduleId);
      this.readCache.set(moduleId, ctx);
    }
    return ctx;
  }

  private makeReadCtx(moduleId: string): ReadContext {
    const game = this;
    const s = this.s;
    const reg = this.registry;
    const norm = (id: StatId) => {
      const info = reg.stats.get(id);
      if (!info) throw new Error(`Stat desconocida: ${id}`);
      return (s.stats[id] - info.min) / (info.max - info.min);
    };
    return {
      get time() {
        return timeView(s.minute);
      },
      moduleId,
      stat: (id) => game.stat(id),
      norm,
      cap: (id) => {
        const info = reg.stats.get(id);
        if (!info) throw new Error(`Stat desconocida: ${id}`);
        return computeCap(info.def, info.min, info.max, norm);
      },
      hasStat: (id) => reg.stats.has(id),
      statDef: (id) => reg.stats.get(id)?.def,
      state: <S>() => s.modules[moduleId] as S,
      flag: <T>(key: string) => s.flags[key] as T | undefined,
      service: <T>(key: string) => {
        const svc = reg.services.get(key);
        return svc ? (svc.fn(game.readCtx(svc.module)) as T) : undefined;
      },
      hasModule: (id) => reg.moduleIds.has(id),
    };
  }

  private actionCtx(moduleId: string, efficiency: number): ActionContext {
    const read = this.readCtx(moduleId);
    const s = this.s;
    const reg = this.registry;
    // Hereda de `read` por prototipo para que `time` siga siendo un getter vivo.
    return Object.assign(Object.create(read) as ReadContext, {
      rng: this.rng,
      efficiency,
      addStat: (id: StatId, delta: number) => {
        const info = reg.stats.get(id);
        if (!info) throw new Error(`Stat desconocida: ${id}`);
        if (info.module !== moduleId && info.def.category !== 'estado') {
          throw new Error(
            `"${moduleId}" no puede cambiar directamente "${id}" (es de "${info.module}"). Usa train().`,
          );
        }
        return this.rawAdd(id, delta);
      },
      train: (id: StatId, amount: number) => this.trainStat(id, amount, efficiency),
      setState: <S>(next: S) => {
        s.modules[moduleId] = next;
      },
      updateState: <S>(fn: (current: S) => S) => {
        s.modules[moduleId] = fn(s.modules[moduleId] as S);
      },
      setFlag: (key: string, value: unknown) => {
        s.flags[key] = value;
      },
      log: (text: string, kind?: LogEntry['kind'], table?: LogTable) =>
        this.pushLog({ minute: s.minute, module: moduleId, text, kind, ...(table ? { table } : {}) }),
      emit: <T>(event: GameEvent<T>) => {
        if (!event.type.startsWith(`${moduleId}.`) && !SHARED_EVENT_TYPES.has(event.type)) {
          throw new Error(
            `"${moduleId}" solo puede emitir eventos "${moduleId}.*" o compartidos (intentó "${event.type}")`,
          );
        }
        this.queue.push(event);
      },
    }) as ActionContext;
  }
}
