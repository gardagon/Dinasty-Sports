import type {
  ActionDef,
  ActionView,
  EventHandler,
  GameModule,
  ModifierDef,
  ReadContext,
  StatDef,
} from '@ds/contracts';

/**
 * UNIFICADOR 1 — Registro de módulos.
 *
 * Al arrancar, lee todos los módulos, los valida y los "compila" en tablas planas
 * indexadas (por id, por etiqueta, por tipo de evento). Durante la partida nadie
 * recorre módulos: se consulta directamente la tabla. Así añadir módulos no hace
 * el juego más lento ni más enredado.
 */

export interface CompiledStat {
  def: StatDef;
  module: string;
  min: number;
  max: number;
}

export interface CompiledAction {
  def: ActionDef;
  module: string;
  view: ActionView;
}

export interface CompiledModifier {
  def: ModifierDef;
  module: string;
}

export interface CompiledHandler {
  module: string;
  fn: EventHandler;
}

export interface Registry {
  modules: readonly GameModule<any>[];
  moduleIds: ReadonlySet<string>;
  moduleNames: ReadonlyMap<string, string>;
  stats: ReadonlyMap<string, CompiledStat>;
  statList: readonly CompiledStat[];
  actions: ReadonlyMap<string, CompiledAction>;
  actionList: readonly CompiledAction[];
  dynamicActions: readonly { module: string; fn: (ctx: ReadContext) => ActionDef[] }[];
  resolvers: readonly { module: string; fn: (ctx: ReadContext, id: string) => ActionDef | undefined }[];
  modifiersByTag: ReadonlyMap<string, readonly CompiledModifier[]>;
  wildcardModifiers: readonly CompiledModifier[];
  handlers: ReadonlyMap<string, readonly CompiledHandler[]>;
  services: ReadonlyMap<string, { module: string; fn: (ctx: ReadContext) => unknown }>;
  decayStats: readonly CompiledStat[];
  /** Lo que aporta cada módulo a cada punto de extensión (clave → aportes, en el orden de los módulos). */
  aportes: ReadonlyMap<string, readonly unknown[]>;
}

export class RegistryError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Registro de módulos inválido:\n - ${problems.join('\n - ')}`);
    this.name = 'RegistryError';
  }
}

const ID_RE = /^[a-z][a-z0-9_]*$/;

export function compileAction(def: ActionDef, module: string): CompiledAction {
  return { def, module, view: { id: def.id, module, tags: def.tags } };
}

export function buildRegistry(modules: readonly GameModule<any>[]): Registry {
  const problems: string[] = [];
  const moduleIds = new Set<string>();
  const stats = new Map<string, CompiledStat>();
  const actions = new Map<string, CompiledAction>();
  const modifiersByTag = new Map<string, CompiledModifier[]>();
  const wildcardModifiers: CompiledModifier[] = [];
  const modifierIds = new Set<string>();
  const handlers = new Map<string, CompiledHandler[]>();
  const services = new Map<string, { module: string; fn: (ctx: ReadContext) => unknown }>();
  const dynamicActions: { module: string; fn: (ctx: ReadContext) => ActionDef[] }[] = [];
  const aportes = new Map<string, unknown[]>();
  const resolvers: { module: string; fn: (ctx: ReadContext, id: string) => ActionDef | undefined }[] = [];

  const prefixed = (id: string, module: string) => id.startsWith(`${module}.`);

  for (const m of modules) {
    if (!ID_RE.test(m.id)) problems.push(`Id de módulo inválido: "${m.id}" (solo minúsculas, números y _)`);
    if (moduleIds.has(m.id)) problems.push(`Módulo duplicado: "${m.id}"`);
    moduleIds.add(m.id);
  }

  // Los aportes de todos los módulos se juntan antes de nada: `accionesSegunAportes` los necesita.
  for (const m of modules) {
    for (const [clave, lista] of Object.entries(m.aportes ?? {})) {
      if (!clave || !Array.isArray(lista)) problems.push(`Aporte "${clave}" de "${m.id}": tiene que ser una lista`);
      else aportes.set(clave, [...(aportes.get(clave) ?? []), ...lista]);
    }
  }
  const aportado = (clave: string): readonly unknown[] => aportes.get(clave) ?? [];

  for (const m of modules) {
    for (const dep of m.dependsOn ?? []) {
      if (!moduleIds.has(dep)) problems.push(`"${m.id}" necesita el módulo "${dep}", que no está cargado`);
    }

    for (const def of m.stats ?? []) {
      if (!prefixed(def.id, m.id)) problems.push(`Stat "${def.id}" debe empezar por "${m.id}."`);
      if (stats.has(def.id)) problems.push(`Stat duplicada: "${def.id}"`);
      const min = def.min ?? 0;
      const max = def.max ?? 100;
      if (!(max > min)) problems.push(`Stat "${def.id}": max debe ser mayor que min`);
      stats.set(def.id, { def, module: m.id, min, max });
    }

    for (const def of [...(m.actions ?? []), ...(m.accionesSegunAportes?.(aportado) ?? [])]) {
      if (!prefixed(def.id, m.id)) problems.push(`Acción "${def.id}" debe empezar por "${m.id}."`);
      if (actions.has(def.id)) problems.push(`Acción duplicada: "${def.id}"`);
      actions.set(def.id, compileAction(def, m.id));
    }

    if (m.dynamicActions) dynamicActions.push({ module: m.id, fn: m.dynamicActions });
    if (m.resolverAccion) resolvers.push({ module: m.id, fn: m.resolverAccion });

    for (const def of m.modifiers ?? []) {
      if (!prefixed(def.id, m.id)) problems.push(`Modificador "${def.id}" debe empezar por "${m.id}."`);
      if (modifierIds.has(def.id)) problems.push(`Modificador duplicado: "${def.id}"`);
      modifierIds.add(def.id);
      const compiled = { def, module: m.id };
      for (const tag of def.tags) {
        if (tag === '*') wildcardModifiers.push(compiled);
        else {
          const list = modifiersByTag.get(tag) ?? [];
          list.push(compiled);
          modifiersByTag.set(tag, list);
        }
      }
    }

    for (const [type, fn] of Object.entries(m.on ?? {})) {
      const list = handlers.get(type) ?? [];
      list.push({ module: m.id, fn });
      handlers.set(type, list);
    }

    for (const [key, fn] of Object.entries(m.services ?? {})) {
      if (services.has(key)) problems.push(`Servicio "${key}" publicado por dos módulos`);
      services.set(key, { module: m.id, fn });
    }
  }

  // Referencias cruzadas (cuando ya se conocen todas las stats).
  for (const { def } of stats.values()) {
    const refs = [...(def.growth?.speedFrom ?? []), ...(def.growth?.cap?.from ?? [])];
    for (const r of refs) {
      if (!stats.has(r.stat)) problems.push(`Stat "${def.id}" depende de "${r.stat}", que no existe`);
    }
  }
  for (const { def } of actions.values()) {
    problems.push(...validateActionRefs(def, stats));
  }

  if (problems.length) throw new RegistryError(problems);

  const statList = [...stats.values()];
  return {
    modules,
    moduleIds,
    moduleNames: new Map(modules.map((m) => [m.id, m.name])),
    stats,
    statList,
    actions,
    actionList: [...actions.values()],
    dynamicActions,
    resolvers,
    modifiersByTag,
    wildcardModifiers,
    handlers,
    services,
    decayStats: statList.filter((s) => s.def.decay && s.def.category !== 'estado'),
    aportes,
  };
}

export function validateActionRefs(def: ActionDef, stats: ReadonlyMap<string, CompiledStat>): string[] {
  const problems: string[] = [];
  const refs = [
    ...Object.keys(def.delta ?? {}),
    ...(def.train ?? []).map((t) => t.stat),
    ...(def.requires ?? []).map((r) => r.stat),
  ];
  for (const r of refs) {
    if (!stats.has(r)) problems.push(`Acción "${def.id}" usa la stat "${r}", que no existe`);
  }
  return problems;
}

/** Modificadores aplicables a una acción (sin duplicados). */
export function modifiersFor(registry: Registry, view: ActionView): CompiledModifier[] {
  const seen = new Set<CompiledModifier>(registry.wildcardModifiers);
  for (const tag of view.tags) {
    for (const m of registry.modifiersByTag.get(tag) ?? []) seen.add(m);
  }
  return [...seen];
}
