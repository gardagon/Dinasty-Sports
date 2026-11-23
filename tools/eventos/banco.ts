/**
 * Banco de pruebas de los sucesos: lo usan los tests (`tests/eventos.test.ts`) y la herramienta (`npm run eventos:*`).
 * Juega con la partida de verdad (todos los módulos), con un módulo de prueba que fija los hechos que diga cada escenario (`dado`),
 * lanza señales y deja forzar un suceso. Así un hilo de semanas se prueba en milisegundos y sin jugar hasta llegar a él.
 */
import {
  APORTE_DE_CONFIG_DE_SUCESOS,
  APORTE_DE_SUCESOS,
  duroSinFiltro,
  TODO_EL_CONTENIDO_DURO,
  sinContenidoDuro,
  type ConfigDeContenidoDuro,
  PAIS_CIUDAD_DE_PRUEBA,
  registrarPais,
  SERVICES,
  SHARED_EVENTS,
  SUCESOS_DE_PRUEBA,
  compilarCatalogo,
  defineModule,
  efectosDeSuceso,
  validarCatalogo,
  type AporteDeSucesos,
  type CatalogoDeSucesos,
  type EscenarioDef,
  type EsperadoDePrueba,
  type GameModule,
  type HechosDePrueba,
  type OpcionDef,
  type PersonaDeTexto,
  type ResultadoDeValidacion,
  type SucesoCompilado,
  type SucesoPendiente,
  type SucesosDePruebaService,
  type SucesosService,
} from '@ds/contracts';
import { Game, type GameState } from '@ds/core';
import { MODULOS } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { idDeForzar, type SucesosState } from '@ds/mod-sucesos';

/** Lo que el módulo de prueba le dice al director. Es un objeto vivo: se cambia entre acciones. */
interface Mando {
  dado: HechosDePrueba;
  señal?: { tipo: string; datos?: unknown };
  tirada?: 'exito' | 'fallo';
  todoVale: boolean;
  variante?: string;
  /** Cuál de los `textos` de entrada / de los `resultados` sale (para ver todas las versiones). */
  texto?: number;
  resultado?: number;
}

const SHARED: ReadonlySet<string> = new Set(Object.values(SHARED_EVENTS));
/** Id de la persona de mentira que hace un papel en las pruebas. */
export const personaDePrueba = (papel: string): string => `prueba_${papel}`;
const NOMBRES: readonly PersonaDeTexto[] = [
  { nombre: 'Lucía', nombreCompleto: 'Lucía Romero Vidal', gender: 'f', campos: { diaDelCumple: '12 de marzo' } },
  { nombre: 'Marcos', nombreCompleto: 'Marcos Gil Soto', gender: 'm', campos: { diaDelCumple: '3 de mayo' } },
];

function moduloDePrueba(mando: Mando, genero: 'f' | 'm', duro?: ConfigDeContenidoDuro): GameModule {
  return defineModule({
    id: 'banco',
    name: 'Banco de pruebas',
    // La preferencia del jugador sobre el contenido duro (como la lleva la web: un aporte `sucesos.config`).
    ...(duro ? { aportes: { [APORTE_DE_CONFIG_DE_SUCESOS]: [{ presentacion: { duro } }] } } : {}),
    actions: [
      {
        id: 'banco.senal',
        name: 'Lanzar una señal',
        tags: ['prueba'],
        duration: 1,
        available: () => (mando.señal && SHARED.has(mando.señal.tipo) ? true : 'El banco solo lanza señales compartidas (las demás, forzando el suceso)'),
        run: (ctx) => ctx.emit({ type: mando.señal!.tipo, data: mando.señal!.datos }),
      },
    ],
    services: {
      [SUCESOS_DE_PRUEBA]: (): SucesosDePruebaService => {
        const d = mando.dado;
        const papelDe = (id: string): string | undefined => (id.startsWith('prueba_') ? id.slice('prueba_'.length) : undefined);
        return {
          todoVale: mando.todoVale,
          variante: () => mando.variante,
          texto: () => mando.texto,
          resultado: () => mando.resultado,
          tirada: () => mando.tirada,
          señal: () => mando.señal?.datos as Record<string, unknown> | undefined,
          papel: (n) => (d.sinPapel?.includes(n) ? null : personaDePrueba(n)),
          persona: (id) => {
            const papel = papelDe(id);
            if (!papel) return undefined;
            // Padres y madres se nombran como en el juego; los demás, con un nombre de prueba del género que toque.
            if (['tutor', 'padre', 'madre', 'progenitor'].includes(papel)) return { nombre: genero === 'f' ? 'tu madre' : 'tu padre', gender: genero };
            return NOMBRES[genero === 'f' ? 0 : 1];
          },
          hechos: {
            ...(d.stats ? { stat: (id: string) => d.stats![id] } : {}),
            ...(d.hechos ? { hecho: (n: string) => d.hechos![n] } : {}),
            ...(d.lugar ? { lugar: () => d.lugar } : {}),
            ...(d.periodo ? { periodo: () => d.periodo } : {}),
            ...(d.hora !== undefined ? { minutoDelDia: () => d.hora! } : {}),
            // Sin decir quién está, están todos los del reparto.
            presente: (id: string) => (d.presente ? d.presente.some((p) => personaDePrueba(p) === id) : papelDe(id) !== undefined),
            relacion: (id: string) => {
              const papel = papelDe(id);
              if (!papel) return undefined;
              const r = d.relacion?.[papel];
              return { afinidad: r?.afinidad ?? 30, confianza: r?.confianza ?? 30, estado: r?.estado ?? 'amigo' };
            },
            familia: (id: string) => (papelDe(id) ? { apoyo: 60, expectativas: 60 } : undefined),
            ...(d.perks ? { perk: (id: string) => d.perks![id] ?? 'no' } : {}),
            ...(d.caracter ? { caracter: (eje: string) => d.caracter![eje] ?? 0 } : {}),
          },
        };
      },
    },
  });
}

/** Los sucesos que aporta cada módulo, por separado (la validación exige el prefijo de quien aporta). */
export const aportesPorModulo = (modulos: readonly GameModule<any>[]): { modulo: string; aportes: readonly AporteDeSucesos[] }[] =>
  modulos.map((m) => ({ modulo: m.id, aportes: (m.aportes?.[APORTE_DE_SUCESOS] ?? []) as readonly AporteDeSucesos[] })).filter((x) => x.aportes.length);

export class Banco {
  readonly modulos: readonly GameModule<any>[];
  readonly catalogo: CatalogoDeSucesos;
  private base?: GameState;

  /** Por defecto, el juego con todos sus deportes (también los que se instalan aparte, como el fútbol), en la ciudad de prueba (pequeña y rápida de crear). */
  constructor(modulos: readonly GameModule<any>[] = [...MODULOS, futbol], readonly opciones: { duro?: ConfigDeContenidoDuro } = { duro: TODO_EL_CONTENIDO_DURO }) {
    this.modulos = modulos;
    this.catalogo = compilarCatalogo(aportesPorModulo(modulos).flatMap((x) => x.aportes), (id) => modulos.some((m) => m.id === id));
  }

  /** El estado de una partida recién creada (se crea una vez; cada sesión parte de una copia). */
  private estadoBase(): GameState {
    registrarPais(PAIS_CIUDAD_DE_PRUEBA);
    return (this.base ??= Game.create([...this.modulos, moduloDePrueba({ dado: {}, todoVale: false }, 'f')], { seed: 11, pais: PAIS_CIUDAD_DE_PRUEBA.id }).serialize());
  }

  /** Validación sin jugar: forma, ids, referencias, textos, memoria e hilos, con las stats y los módulos de verdad. */
  validar(): ResultadoDeValidacion {
    const g = Game.load([...this.modulos, moduloDePrueba({ dado: {}, todoVale: false }, 'f')], this.estadoBase());
    const stats = new Map([...g.registry.stats].map(([id, s]) => [id, { category: s.def.category as string }]));
    const deportes = new Set(g.aportes<{ id: string }>('deportes.ficha').map((f) => f.id));
    return validarCatalogo(aportesPorModulo(this.modulos), { stats, modulos: g.registry.moduleIds, deportes });
  }

  /** Una partida de prueba con los hechos que se digan. `genero` es el de las personas de mentira (para ver los textos de las dos formas). */
  sesion(dado: HechosDePrueba = {}, opciones: { genero?: 'f' | 'm'; todoVale?: boolean; desde?: GameState } = {}): Sesion {
    const mando: Mando = { dado: { ...dado }, todoVale: !!opciones.todoVale };
    const estado = structuredClone(opciones.desde ?? this.estadoBase());
    // Las stats de `dado` se ponen de verdad (los costes se miran en la partida) y la memoria, en la del director.
    for (const [id, v] of Object.entries(dado.stats ?? {})) estado.stats[id] = v;
    const s = estado.modules.sucesos as SucesosState;
    for (const m of dado.marcas ?? []) s.marcas[m] = {};
    Object.assign(s.contadores, dado.contadores ?? {});
    return new Sesion(Game.load([...this.modulos, moduloDePrueba(mando, opciones.genero ?? 'f', this.opciones.duro)], estado, { copiar: false }), mando, this);
  }
}

export class Sesion {
  constructor(
    readonly game: Game,
    private readonly mando: Mando,
    readonly banco: Banco,
  ) {}

  get servicio(): SucesosService {
    return this.game.service<SucesosService>(SERVICES.sucesos)!;
  }
  get estado(): SucesosState {
    return this.game.moduleState<SucesosState>('sucesos') as SucesosState;
  }
  copia(): GameState {
    return this.game.serialize();
  }
  cambiar(dado: HechosDePrueba | undefined): void {
    if (!dado) return;
    Object.assign(this.mando.dado, dado, { hechos: { ...this.mando.dado.hechos, ...dado.hechos }, stats: { ...this.mando.dado.stats, ...dado.stats } });
  }

  /** Lanza una señal compartida, como si la emitiera su módulo. */
  señal(tipo: string, datos?: unknown): void {
    this.mando.señal = { tipo, datos };
    const r = this.game.perform('banco.senal');
    this.mando.señal = undefined;
    if (!r.ok) throw new Error(r.reason);
  }

  /** Hace salir un suceso ahora (sus condiciones cuentan, salvo en una sesión `todoVale`). Devuelve si ha salido. */
  forzar(suceso: string, variante?: string, texto?: number): boolean {
    const antes = this.estado.historia.length + this.estado.pendientes.length;
    this.mando.variante = variante;
    this.mando.texto = texto;
    const r = this.game.perform(idDeForzar(suceso));
    this.mando.variante = undefined;
    this.mando.texto = undefined;
    if (!r.ok) throw new Error(`No se puede forzar «${suceso}»: ${r.reason}`);
    return this.estado.historia.length + this.estado.pendientes.length > antes;
  }

  pendiente(suceso?: string): SucesoPendiente | undefined {
    return this.servicio.pendientes().find((p) => !suceso || p.suceso === suceso);
  }

  elegir(suceso: string, opcion: string, tirada?: 'exito' | 'fallo', resultado?: number): void {
    const p = this.pendiente(suceso);
    const o = p?.opciones.find((x) => x.id === opcion);
    if (!p || !o) throw new Error(`«${suceso}» no está pendiente o no tiene la opción «${opcion}»`);
    this.mando.tirada = tirada;
    this.mando.resultado = resultado;
    const r = this.game.perform(o.accion);
    this.mando.tirada = undefined;
    this.mando.resultado = undefined;
    if (!r.ok) throw new Error(`No se puede elegir «${opcion}» en «${suceso}»: ${r.reason}`);
  }

  /** Deja pasar días enteros (a siestas; si no se puede, esperando). */
  pasar(dias: number): void {
    const hasta = this.game.time.day + dias;
    for (let i = 0; this.game.time.day < hasta; i++) {
      if (i > 400 * dias) throw new Error('El banco no consigue que pase el tiempo');
      if (!this.game.perform('gen.descansar').ok && !this.game.perform('gen.esperar').ok) throw new Error('El banco no puede esperar');
    }
  }

  /** ¿Ha salido ya este suceso (está pendiente o en la historia desde la posición `desde`)? */
  haSalido(suceso: string, desde = 0): boolean {
    return !!this.pendiente(suceso) || this.servicio.recuerdos().slice(desde).some((r) => r.suceso === suceso);
  }

  ultimoTexto(): string {
    return this.game.log.at(-1)?.text ?? '';
  }
}

// ------------------------------------------------------------------ escenarios escritos como datos

function comprobar(s: Sesion, de: SucesoCompilado | undefined, hilo: string | undefined, e: EsperadoDePrueba, salio: boolean): string[] {
  const mal: string[] = [];
  const st = s.estado;
  const tieneMarca = (m: string) => Object.keys(st.marcas).some((k) => k === m || k.startsWith(`${m}@`));
  if (e.sale !== undefined && e.sale !== salio) mal.push(e.sale ? 'se esperaba que saliera y no ha salido' : 'se esperaba que no saliera y ha salido');
  if (e.marca && !tieneMarca(e.marca)) mal.push(`falta la marca «${e.marca}»`);
  if (e.sinMarca && tieneMarca(e.sinMarca)) mal.push(`no debería estar la marca «${e.sinMarca}»`);
  if (e.programado && !st.programados.some((p) => p.suceso === e.programado)) mal.push(`no está programado «${e.programado}»`);
  if (e.hiloCerrado !== undefined && hilo && st.hilos.some((h) => h.def === hilo) === e.hiloCerrado) mal.push(e.hiloCerrado ? 'el hilo sigue abierto' : 'el hilo se ha cerrado');
  const p = s.pendiente(de?.def.id);
  if (e.opcionDisponible && !p?.opciones.find((o) => o.id === e.opcionDisponible)?.elegible) mal.push(`la opción «${e.opcionDisponible}» no se puede elegir`);
  if (e.opcionNoDisponible && p?.opciones.find((o) => o.id === e.opcionNoDisponible)?.elegible !== false) mal.push(`la opción «${e.opcionNoDisponible}» se puede elegir (o el suceso no está pendiente)`);
  return mal;
}

/** Corre un escenario de un hilo (o de un suceso suelto) y devuelve lo que no ha salido como se esperaba (vacío = bien). */
export function correrEscenario(banco: Banco, e: EscenarioDef, hilo?: string, sueltoDe?: string): string[] {
  const s = banco.sesion(e.dado);
  const mal: string[] = [];
  let ultimo: SucesoCompilado | undefined = sueltoDe ? banco.catalogo.sucesos.get(sueltoDe) : undefined;
  let salio = false;
  e.pasos.forEach((paso, n) => {
    const en = `paso ${n + 1}`;
    try {
      if ('señal' in paso) {
        s.cambiar(paso.dado);
        s.señal(paso.señal, paso.datos);
      } else if ('pasan' in paso) {
        s.cambiar(paso.dado);
        s.pasar(paso.pasan.dias);
      } else if ('sale' in paso) {
        ultimo = banco.catalogo.sucesos.get(paso.sale);
        if (!ultimo) return void mal.push(`${en}: «${paso.sale}» no está en el catálogo`);
        // Si no ha salido solo (por la señal o porque le tocaba), se le hace salir ahora: sus condiciones cuentan.
        const yaEsta = !!s.pendiente(paso.sale) || s.servicio.recuerdos().some((r) => r.suceso === paso.sale);
        salio = yaEsta || s.forzar(paso.sale);
        if (!salio) return void mal.push(`${en}: «${paso.sale}» no sale (no se cumplen sus condiciones o falta alguien)`);
        if (paso.variante) {
          const cual = s.estado.pendientes.find((x) => x.suceso === paso.sale)?.variante ?? [...s.servicio.recuerdos()].reverse().find((r) => r.suceso === paso.sale)?.variante;
          if (cual !== paso.variante) mal.push(`${en}: ha salido la variante «${cual ?? '?'}» y se esperaba «${paso.variante}»`);
        }
        if (paso.elige) s.elegir(paso.sale, paso.elige, paso.tirada);
      } else {
        mal.push(...comprobar(s, ultimo, hilo, paso.espero, 'sale' in paso.espero ? (ultimo ? s.haSalido(ultimo.def.id) : s.estado.historia.length + s.estado.pendientes.length > 0) : salio).map((m) => `${en}: ${m}`));
      }
    } catch (err) {
      mal.push(`${en}: ${(err as Error).message}`);
    }
  });
  return mal;
}

/** Todos los escenarios y pruebas del catálogo: `{ nombre, problemas }` por cada uno. */
export function correrTodo(banco: Banco): { de: string; nombre: string; problemas: string[] }[] {
  const out: { de: string; nombre: string; problemas: string[] }[] = [];
  for (const h of banco.catalogo.hilos.values()) for (const e of h.escenarios ?? []) out.push({ de: h.id, nombre: e.nombre, problemas: correrEscenario(banco, e, h.id) });
  for (const { def, hilo } of banco.catalogo.sucesos.values()) {
    for (const p of def.pruebas ?? []) {
      const pasos: EscenarioDef['pasos'] = [p.espero.sale === false ? { espero: p.espero } : { sale: def.id, elige: p.elige, tirada: p.tirada }, ...(p.espero.sale === false ? [] : [{ espero: p.espero }])];
      out.push({ de: def.id, nombre: p.nombre, problemas: correrEscenario(banco, { nombre: p.nombre, dado: p.dado, pasos }, hilo?.id, def.id) });
    }
  }
  return out;
}

// ------------------------------------------------------------------ recorrer todos los caminos

export interface Camino {
  /** `suceso[variante] → opción (éxito|fallo)` de cada paso, con `[versión 2/3]` si el texto o el resultado tienen varias versiones. */
  pasos: string[];
  /** Textos tal como los vería el jugador. */
  textos: string[];
  /** Cómo acaba: marcas que quedan, lo que queda programado y si el hilo se cierra. */
  marcas: string[];
  programados: string[];
  hiloCerrado: boolean;
}

/**
 * Recorre todos los caminos de un hilo (o un suceso suelto): cada variante, cada opción y cada rama de cada tirada, saltándose las
 * condiciones y sin esperar los días. Si hay varias versiones de un texto de entrada (`textos`) o de un resultado (`resultados`), se enseña
 * cada una (no el producto de todas: cada versión sale al menos una vez en cada camino, y se sigue el hilo solo con la primera, para no multiplicar).
 * Con un banco que tenga una preferencia de contenido duro (`new Banco(modulos, { duro })`) se recorre lo que quedaría con ella.
 * Si algún camino lanza un error (un texto al que le falta un dato, un efecto imposible), lo dice.
 * Con `genero` se eligen las personas de mentira, para leer los textos concordados de las dos formas.
 */
export function recorrer(banco: Banco, raiz: string, genero: 'f' | 'm' = 'f', maximo = 1500): { caminos: Camino[]; errores: string[] } {
  const caminos: Camino[] = [];
  const errores: string[] = [];
  const hilo = banco.catalogo.hilos.get(raiz);
  const duro = banco.opciones.duro && !duroSinFiltro(banco.opciones.duro) ? banco.opciones.duro : undefined;
  const entradas = hilo ? hilo.sucesos.filter((x) => !('programado' in x.disparo)).map((x) => x.id) : [raiz];
  // Los hechos de ejemplo de sus sucesos (lo que dirían los módulos en esa situación), para que los textos que los usan se puedan componer.
  const sucesosDeLaRaiz = hilo ? hilo.sucesos : [banco.catalogo.sucesos.get(raiz)?.def].filter((x) => !!x);
  const dado: HechosDePrueba = { stats: { 'gen.dinero': 1000 }, hechos: Object.assign({}, ...sucesosDeLaRaiz.map((x) => x!.ejemploDeHechos ?? {})) };

  const seguir = (desde: GameState, suceso: string, pasos: string[], textos: string[]): void => {
    if (caminos.length >= maximo) return;
    const x = banco.catalogo.sucesos.get(suceso);
    if (!x) return void errores.push(`«${suceso}» no está en el catálogo`);
    // Con una preferencia de contenido duro, el suceso tal como lo vería el jugador (si no puede salir, no hay camino que recorrer).
    const def = duro ? sinContenidoDuro(x.def, duro) : x.def;
    if (!def) return;
    const variantes: (string | undefined)[] = def.variantes?.length ? def.variantes.map((v) => v.id) : [undefined];
    for (const variante of variantes) {
      const nombre = variante ? `${suceso}[${variante}]` : suceso;
      type Rama = [string | undefined, 'exito' | 'fallo' | undefined, number];
      const v = def.variantes?.find((y) => y.id === variante);
      const d = v?.opciones ? v : def;
      // Cuántas versiones tiene el texto de entrada y cada rama de resultado.
      const origen = v && (v.texto !== undefined || v.textos !== undefined) ? v : def;
      const nTextos = origen.textos?.length ?? 1;
      const n = (r?: { resultados?: readonly string[] }) => r?.resultados?.length ?? 1;
      const ramas: Rama[] = d.opciones?.length
        ? d.opciones.flatMap((o): Rama[] => (o.tirada ? [[o.id, 'exito', n(o.exito)], [o.id, 'fallo', n(o.fallo)]] : [[o.id, undefined, n(o)]]))
        : [[undefined, undefined, 1]];
      for (const [opcion, tirada, nResultados] of ramas) {
        const versiones = Math.max(nTextos, nResultados);
        for (let k = 0; k < versiones; k++) {
          const etiqueta = versiones > 1 ? ` [versión ${k + 1}/${versiones}]` : '';
          const paso = (opcion ? `${nombre} → ${opcion}${tirada ? ` (${tirada === 'exito' ? 'sale bien' : 'sale mal'})` : ''}` : nombre) + etiqueta;
          try {
            const s = banco.sesion(dado, { genero, todoVale: true, desde });
            const log0 = s.game.log.length;
            if (!s.forzar(suceso, variante, nTextos > 1 ? k % nTextos : undefined)) throw new Error('no sale ni saltándose las condiciones (¿falta alguien en el reparto?)');
            const p = s.pendiente(suceso);
            const leido = p ? [`${p.titulo}. ${p.texto}`] : [];
            if (opcion) s.elegir(suceso, opcion, tirada, nResultados > 1 ? k % nResultados : undefined);
            const nuevos = [...textos, ...leido, ...s.game.log.slice(log0 - s.game.log.length || undefined).map((l) => l.text).filter((t) => !t.endsWith('tienes algo que decidir.'))];
            const siguientes = s.estado.programados.map((q) => q.suceso);
            // Cada versión acaba su camino; el hilo solo sigue con la primera (las demás solo cambian el texto).
            if (!siguientes.length || k > 0) {
              const st = s.estado;
              caminos.push({ pasos: [...pasos, paso], textos: nuevos, marcas: Object.keys(st.marcas), programados: [...new Set(siguientes)], hiloCerrado: !hilo || !st.hilos.some((h) => h.def === hilo.id) });
            } else for (const sig of [...new Set(siguientes)]) seguir(s.copia(), sig, [...pasos, paso], nuevos);
          } catch (err) {
            errores.push(`${[...pasos, paso].join(' ⇒ ')}: ${(err as Error).message}`);
          }
        }
      }
    }
  };
  const base = banco.sesion(dado).copia();
  for (const e of entradas) seguir(base, e, [], []);
  return { caminos, errores };
}

/** Los sucesos y los hilos del catálogo con lo que programan y las marcas que ponen y leen (para el mapa y los listados). */
export function resumen(banco: Banco): { id: string; hilo?: string; origen: string; programa: string[]; pone: string[] }[] {
  return [...banco.catalogo.sucesos.values()].map((x) => {
    const programa: string[] = [];
    const pone: string[] = [];
    for (const e of efectosDeSuceso(x.def)) {
      if ('programa' in e) programa.push(e.programa);
      if ('marca' in e) pone.push(e.marca);
    }
    return { id: x.def.id, hilo: x.hilo?.id, origen: x.deporte ? `deporte:${x.deporte}` : 'base', programa: [...new Set(programa)], pone: [...new Set(pone)] };
  });
}
