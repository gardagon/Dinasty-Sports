import {
  APORTE_DE_CONFIG_DE_SUCESOS,
  APORTE_DE_SUCESOS,
  CORE_EVENTS,
  CUALQUIER_EVENTO,
  MINUTES_PER_DAY,
  SERVICES,
  SHARED_EVENTS,
  SUCESOS_DE_PRUEBA,
  TIRADA,
  alturaDe,
  compilarCatalogo,
  componerTexto,
  configDeSucesos,
  cumplenTodas,
  defineModule,
  evaluarOpcion,
  fechaDelDia,
  ordenarCondiciones,
  probabilidadDeExito,
  dificultadDeTirada,
  rngEstable,
  servicioDeHechos,
  type ActionContext,
  type ActionDef,
  type ActionDoneData,
  type AporteDeSucesos,
  type AvisoDeSuceso,
  type CambioDeCaracterData,
  type CambioDeFamiliaData,
  type CambioDeRelacionData,
  type CambiosDeConfigDeSucesos,
  type CatalogoDeSucesos,
  type CategoriaDeCupo,
  type ClubDirectory,
  type Condicion,
  type ConfigDeSucesos,
  type ContadorDef,
  type ContextoDeCondicion,
  type Cuando,
  type DatosDeTexto,
  type DecisionDef,
  type Efecto,
  type EstadoDePersonaData,
  elegirPorCaracter,
  type FamilyService,
  type GameEvent,
  type HechosService,
  type IdentityService,
  type LectorDeHechos,
  type LugaresService,
  type NpcDirectory,
  type NpcView,
  type OpcionDef,
  type TiradaDef,
  type OpcionPendiente,
  type PapelDef,
  type PerkReveladoData,
  type PerksService,
  type PersonaDeTexto,
  type PresenciaService,
  type PresentacionData,
  type ProfileService,
  type RamaDef,
  type ReadContext,
  type RecuerdoDeSuceso,
  type RelationsService,
  type StudiesService,
  type SucesoCompilado,
  type SucesoPendiente,
  type SucesosDePruebaService,
  type SucesosService,
} from '@ds/contracts';

/**
 * MÓDULO SUCESOS (id `sucesos`): el director. Guarda la memoria (marcas, contadores, hilos, programados, pendientes, historia), escucha todas las
 * señales, decide qué suceso sale, ofrece sus opciones como acciones y aplica los efectos. NO trae contenido: los sucesos los aportan los módulos
 * como datos (`aportes['sucesos.catalogo']`). Sin catálogo no hace nada y la partida es la misma. Diseño: `docs/PLAN_EVENTOS.md`.
 *
 * Regla de oro: solo importa @ds/contracts. Lee a los demás por servicios y cambia lo ajeno con señales compartidas que recoge su dueño.
 */

interface Marca {
  /** Día (excluido) hasta el que vale; sin él, para siempre. */
  hasta?: number;
  valor?: number;
}

interface HiloAbierto {
  id: number;
  def: string;
  reparto: Record<string, string>;
  recuerdos: Record<string, number | string>;
  desde: number;
  /** Si el hilo es de un PNJ (un suceso que puede pasarle a cualquiera): quién lo vive. */
  sujeto?: string;
}

interface Programado {
  /** Día a partir del cual puede salir y último día en que aún se intenta (después se pierde). */
  dia: number;
  hasta: number;
  suceso: string;
  hilo?: number;
  señal?: Record<string, unknown>;
}

interface Pendiente {
  id: number;
  suceso: string;
  variante?: string;
  hilo?: number;
  reparto: Record<string, string>;
  /** Minuto absoluto en que vence. */
  vence: number;
  señal?: Record<string, unknown>;
}

interface Temporal {
  tags: string[];
  eficiencia?: number;
  coste?: number;
  duracion?: number;
  bloquea?: boolean;
  motivo: string;
  /** Día (excluido) hasta el que vale. */
  hasta: number;
}

export interface SucesosState {
  semilla: number;
  nombre: string;
  /** Clave: `marca` o `marca@persona`. */
  marcas: Record<string, Marca>;
  contadores: Record<string, number>;
  hilos: HiloAbierto[];
  programados: Programado[];
  pendientes: Pendiente[];
  temporales: Temporal[];
  /** Día en que salió por última vez cada suceso (clave: id, o `id@reparto` si la espera es por reparto). */
  ultimaVez: Record<string, number>;
  /** Umbrales que ahora mismo se cumplen (para dispararse solo al pasar de falso a verdadero). */
  umbrales: Record<string, true>;
  /** Sucesos espontáneos que han salido hoy y esta semana, por categoría. */
  cupo: { dia: number; semana: number; hoy: Record<string, number>; estaSemana: Record<string, number> };
  /** `[día, suceso, opción (−1 si no tenía), ...personas]`, con los ids de suceso (`id` o `id~variante`) y de opción (`id#opción`) como posición en `indice`. */
  /** Sucesos sin opciones de hoy y de ayer que se enseñan en una ventana (con su texto ya compuesto): se borran solos. */
  avisos: AvisoDeSuceso[];
  historia: (number | string)[][];
  indice: string[];
  siguiente: number;
}

const estadoInicial = (semilla: number, nombre: string): SucesosState => ({
  semilla,
  nombre,
  marcas: {},
  contadores: {},
  hilos: [],
  programados: [],
  pendientes: [],
  temporales: [],
  ultimaVez: {},
  umbrales: {},
  cupo: { dia: -1, semana: -1, hoy: {}, estaSemana: {} },
  avisos: [],
  historia: [],
  indice: [],
  siguiente: 1,
});

// ------------------------------------------------------------------ catálogo indexado (una vez por partida cargada)

interface Indice {
  cat: CatalogoDeSucesos;
  /** Por señal. Los que exigen un valor concreto en un dato de la señal (`{ señal: 'tags', incluye: 'cardio' }`) van aparte, por ese valor: solo se miran cuando la señal lo trae. */
  porSeñal: Map<string, { siempre: SucesoCompilado[]; campos: Map<string, Map<string | number | boolean, SucesoCompilado[]>> }>;
  cadaDia: SucesoCompilado[];
  cadaSemana: SucesoCompilado[];
  umbrales: SucesoCompilado[];
  contadoresPorSeñal: Map<string, ContadorDef[]>;
  contadoresDeAccion: ContadorDef[];
  config: ConfigDeSucesos;
  /** `cuando` de cada suceso con las condiciones baratas delante. */
  cuando: Map<string, Condicion[]>;
  /** De `cuando`, solo las que se miran sin crear nada (marcas del personaje, contadores y datos de la señal): si una falla, el suceso no sale y no hace falta preparar su contexto. */
  ligeras: Map<string, Condicion[]>;
}

const esMarcaSola = (c: Condicion): boolean => 'marca' in c && c.de === undefined;
const esLigera = (c: Condicion): boolean => esMarcaSola(c) || 'contador' in c || 'señal' in c || ('no' in c && esMarcaSola(c.no));

const VACIO: readonly AporteDeSucesos[] = [];
const indices = new WeakMap<object, Indice>();

function indiceDe(ctx: ReadContext): Indice {
  const aportes = ctx.aportes<AporteDeSucesos>(APORTE_DE_SUCESOS);
  const clave = aportes.length ? aportes : VACIO;
  let i = indices.get(clave);
  if (i) return i;
  const cat = compilarCatalogo(aportes, (m) => ctx.hasModule(m));
  i = { cat, porSeñal: new Map(), cadaDia: [], cadaSemana: [], umbrales: [], contadoresPorSeñal: new Map(), contadoresDeAccion: [], config: configDeSucesos(ctx.aportes<CambiosDeConfigDeSucesos>(APORTE_DE_CONFIG_DE_SUCESOS)), cuando: new Map(), ligeras: new Map() };
  for (const s of cat.sucesos.values()) {
    const d = s.def.disparo;
    if ('al' in d) {
      const grupo = i.porSeñal.get(d.al) ?? { siempre: [] as SucesoCompilado[], campos: new Map<string, Map<string | number | boolean, SucesoCompilado[]>>() };
      i.porSeñal.set(d.al, grupo);
      const llave = (s.def.cuando ?? []).find((c): c is Extract<Condicion, { señal: string }> => 'señal' in c && (c.incluye !== undefined || c.es !== undefined));
      if (!llave) grupo.siempre.push(s);
      else {
        const porValor = grupo.campos.get(llave.señal) ?? new Map<string | number | boolean, SucesoCompilado[]>();
        grupo.campos.set(llave.señal, porValor);
        const valor = (llave.incluye ?? llave.es)!;
        porValor.set(valor, [...(porValor.get(valor) ?? []), s]);
      }
    }
    else if ('cada' in d) (d.cada === 'dia' ? i.cadaDia : i.cadaSemana).push(s);
    else if ('umbral' in d) i.umbrales.push(s);
    const ordenadas = ordenarCondiciones(s.def.cuando ?? []);
    i.cuando.set(s.def.id, ordenadas);
    const ligeras = ordenadas.filter(esLigera);
    if (ligeras.length) i.ligeras.set(s.def.id, ligeras);
  }
  for (const c of cat.contadores) {
    if ('señal' in c.cuenta) i.contadoresPorSeñal.set(c.cuenta.señal, [...(i.contadoresPorSeñal.get(c.cuenta.señal) ?? []), c]);
    else i.contadoresDeAccion.push(c);
  }
  indices.set(clave, i);
  return i;
}

// ------------------------------------------------------------------ hechos: lo que miran las condiciones

const deDia = (ctx: ReadContext): number => ctx.time.day;
const prueba = (ctx: ReadContext): SucesosDePruebaService | undefined => ctx.service<SucesosDePruebaService>(SUCESOS_DE_PRUEBA);

function hechoComun(ctx: ReadContext, nombre: string): number | string | boolean | undefined {
  switch (nombre) {
    case 'edad':
      return ctx.service<IdentityService>(SERVICES.identidad)?.view().age;
    case 'altura_cm':
      return ctx.service<IdentityService>(SERVICES.identidad)?.view().heightCm;
    case 'altura_para_su_edad': {
      // Centímetros por encima (o por debajo) de lo típico a su edad.
      const v = ctx.service<IdentityService>(SERVICES.identidad)?.view();
      return v && Math.round((v.heightCm - alturaDe('m', v.age, 0)) * 10) / 10;
    }
    case 'nota_media':
      return ctx.service<StudiesService>(SERVICES.estudios)?.average() ?? undefined;
    case 'faltas':
      return ctx.service<StudiesService>(SERVICES.estudios)?.absences();
    case 'faltas_del_trimestre':
      return ctx.service<StudiesService>(SERVICES.estudios)?.absencesThisTerm();
    case 'trimestre':
      return ctx.time.term;
    case 'curso':
      return ctx.time.schoolYear;
    case 'dia':
      return ctx.time.day;
  }
  const punto = nombre.indexOf('.');
  if (punto < 0) return undefined;
  if (ctx.hasStat(nombre)) return ctx.stat(nombre);
  return ctx.service<HechosService>(servicioDeHechos(nombre.slice(0, punto)))?.valor(nombre.slice(punto + 1));
}

/** El lector de hechos del personaje: los servicios de la partida, con lo que diga el servicio de pruebas por delante. */
const lectores = new WeakMap<ReadContext, LectorDeHechos>();
function lectorDe(ctx: ReadContext): LectorDeHechos {
  // Uno por contexto (una señal, una evaluación): lee la partida en vivo, así que no hay nada que se quede viejo.
  let l = lectores.get(ctx);
  if (!l) lectores.set(ctx, (l = nuevoLector(ctx)));
  return l;
}

function nuevoLector(ctx: ReadContext): LectorDeHechos {
  const p = prueba(ctx)?.hechos ?? {};
  const o = <T>(v: T | undefined, si: () => T): T => (v === undefined ? si() : v);
  return {
    stat: (id) => o(p.stat?.(id), () => (ctx.hasStat(id) ? ctx.stat(id) : undefined) as number),
    hecho: (n) => o(p.hecho?.(n), () => hechoComun(ctx, n) as number),
    periodo: () => o(p.periodo?.(), () => ctx.time.period),
    diaDeLaSemana: () => p.diaDeLaSemana?.() ?? ctx.time.weekday,
    minutoDelDia: () => p.minutoDelDia?.() ?? ctx.time.minuteOfDay,
    lugar: () => o(p.lugar?.(), () => ctx.service<LugaresService>(SERVICES.lugares)?.actual().id as string),
    presente: (persona) => {
      if (p.presente) return p.presente(persona);
      const sitio = ctx.service<LugaresService>(SERVICES.lugares)?.actual().id;
      return !!sitio && !!ctx.service<PresenciaService>(SERVICES.presencia)?.en(sitio).some((n) => n.id === persona);
    },
    relacion: (persona) => o(p.relacion?.(persona), () => ctx.service<RelationsService>(SERVICES.relaciones)?.get(persona)),
    familia: (persona) =>
      o(p.familia?.(persona), () => {
        const f = ctx.service<FamilyService>(SERVICES.familia)?.parents().find((x) => x.id === persona);
        return f && { apoyo: f.apoyo, expectativas: f.expectativas };
      }),
    perk: (id) => {
      if (p.perk) return p.perk(id);
      const mio = ctx.service<PerksService>(SERVICES.perks)?.view().activos.find((x) => x.id === id);
      return !mio ? 'no' : mio.latente && !mio.revelado ? 'latente' : 'revelado';
    },
    caracter: (eje) => o(p.caracter?.(eje), () => ctx.service<ProfileService>(SERVICES.perfil)?.view().caracter[eje]),
    enClub: (deporte) => {
      if (p.enClub) return p.enClub(deporte);
      const clubes = ctx.service<ClubDirectory>(SERVICES.clubes);
      if (!clubes) return false;
      const deportes = deporte ? [deporte] : ctx.aportes<{ id: string }>('deportes.ficha').map((f) => f.id);
      return deportes.some((d) => !!clubes.membership(d));
    },
  };
}

/**
 * El lector de hechos de un PNJ: lo que se sabe de cualquier persona (edad, perks, carácter, club, si está de baja). Lo que solo tiene el
 * personaje (dinero, estrés, sus relaciones) no se sabe y hace falsa la condición: por eso esos sucesos son `para: 'personaje'`.
 */
function lectorDeNpc(ctx: ReadContext, id: string): LectorDeHechos {
  const n = ctx.service<NpcDirectory>(SERVICES.npcs)?.get(id);
  return {
    stat: () => undefined,
    hecho: (nombre) => (nombre === 'edad' ? (n?.edadExacta ?? n?.age) : nombre === 'altura_cm' ? n?.alturaCm : nombre === 'de_baja' ? !!n?.estadoDeJuego?.baja : nombre === 'trimestre' ? ctx.time.term : nombre === 'curso' ? ctx.time.schoolYear : nombre === 'dia' ? ctx.time.day : undefined),
    periodo: () => ctx.time.period,
    diaDeLaSemana: () => ctx.time.weekday,
    minutoDelDia: () => ctx.time.minuteOfDay,
    lugar: () => undefined,
    presente: () => false,
    relacion: () => undefined,
    familia: () => undefined,
    perk: (perk) => (n?.perks?.activos.includes(perk) ? 'latente' : 'no'),
    caracter: (eje) => n?.rasgos?.caracter[eje],
    enClub: () => !!n?.club,
  };
}

const claveDeMarca = (marca: string, persona?: string): string => (persona ? `${marca}@${persona}` : marca);

function contextoDe(ctx: ReadContext, s: SucesosState, reparto: Record<string, string>, hilo?: HiloAbierto, señal?: Record<string, unknown>, sujeto?: string): ContextoDeCondicion {
  const dia = deDia(ctx);
  return {
    hechos: sujeto ? lectorDeNpc(ctx, sujeto) : lectorDe(ctx),
    reparto,
    // Las marcas sin persona de un suceso que vive un PNJ son las suyas.
    marca: (m, persona) => {
      const x = s.marcas[claveDeMarca(m, persona ?? sujeto)];
      return !!x && (x.hasta === undefined || x.hasta > dia);
    },
    contador: (id) => s.contadores[id] ?? 0,
    recuerdo: (k) => hilo?.recuerdos[k],
    señal,
  };
}

// ------------------------------------------------------------------ reparto y textos

const esProgenitor = (n: NpcView): boolean => n.tags.includes('progenitor');

function personaDeTexto(ctx: ReadContext, id: string): PersonaDeTexto {
  const deprueba = prueba(ctx)?.persona?.(id);
  if (deprueba) return deprueba;
  const n = ctx.service<NpcDirectory>(SERVICES.npcs)?.get(id);
  if (!n) return { nombre: id, gender: 'm' };
  const campos: Record<string, string> = {};
  if (n.nacimiento !== undefined) campos.diaDelCumple = fechaDelDia(n.nacimiento).texto;
  return { nombre: esProgenitor(n) ? (n.gender === 'f' ? 'tu madre' : 'tu padre') : n.nombreCorto, nombreCompleto: n.name, gender: n.gender, campos };
}

function datosDeTexto(ctx: ReadContext, s: SucesosState, reparto: Record<string, string>, hilo?: HiloAbierto, señal?: Record<string, unknown>): DatosDeTexto {
  const papeles: Record<string, PersonaDeTexto> = {};
  for (const [papel, id] of Object.entries(reparto)) papeles[papel] = personaDeTexto(ctx, id);
  // Quien vive el suceso: el personaje o, si le pasa a un PNJ, ese PNJ (el papel `sujeto`).
  return { yo: reparto.sujeto ? papeles.sujeto : { nombre: s.nombre, gender: 'm' }, papeles, señal, recuerdo: hilo?.recuerdos, hecho: (n) => (reparto.sujeto ? lectorDeNpc(ctx, reparto.sujeto) : lectorDe(ctx)).hecho(n), pais: ctx.pais.nombre };
}

const enRango = (v: number | undefined, r?: { min?: number; max?: number }): boolean => !r || (v !== undefined && (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max));

/** Días que faltan para el próximo cumpleaños de quien nació el día `nacimiento` (0 = hoy). */
function diasHastaElCumple(nacimiento: number, hoy: number): number {
  const fecha = fechaDelDia(nacimiento).corto;
  for (let d = 0; d < 366; d++) if (fechaDelDia(hoy + d).corto === fecha) return d;
  return 366;
}

/** A quién le toca un papel, o `undefined` si a nadie. El azar es estable: mismo suceso, mismo día, misma persona. */
function repartir(ctx: ReadContext, s: SucesosState, suceso: string, papel: string, def: PapelDef, señal?: Record<string, unknown>): string | undefined {
  const forzado = prueba(ctx)?.papel?.(papel);
  if (forzado !== undefined) return forzado ?? undefined;
  const npcs = ctx.service<NpcDirectory>(SERVICES.npcs);
  if (!npcs) return undefined;
  const h = lectorDe(ctx);
  let candidatos: NpcView[];
  if (def.deLaSeñal) {
    const lista = (señal?.[def.deLaSeñal] ?? []) as Record<string, unknown>[];
    candidatos = lista.filter((x) => typeof x.npcId === 'string' && Object.entries(def.donde ?? {}).every(([k, v]) => x[k] === v)).map((x) => npcs.get(x.npcId as string)).filter((n): n is NpcView => !!n);
  } else {
    candidatos = npcs.list(def.conocido === false ? undefined : { known: true });
  }
  const principal = def.delDeportePrincipal ? ctx.aportes<{ id: string }>('deportes.ficha').map((f) => ctx.service<ClubDirectory>(SERVICES.clubes)?.membership(f.id)?.id).filter(Boolean) : undefined;
  const hoy = deDia(ctx);
  candidatos = candidatos.filter((n) => {
    if (def.tipo && !n.tags.includes(def.tipo) && n.role !== def.tipo) return false;
    if (def.rol && n.role !== def.rol) return false;
    if (def.edad && !enRango(n.edadExacta ?? n.age, def.edad)) return false;
    if (principal && !(n.club && principal.includes(n.club))) return false;
    if (def.asignatura && !n.asignaturas?.includes(def.asignatura)) return false;
    if (def.asignaturaDeLaSeñal && !n.asignaturas?.includes(String(señal?.[def.asignaturaDeLaSeñal]))) return false;
    if (def.cumpleEn && !(n.nacimiento !== undefined && diasHastaElCumple(n.nacimiento, hoy) === def.cumpleEn.dias)) return false;
    if (def.relacion) {
      const r = h.relacion(n.id);
      if (!r || !enRango(r.afinidad, def.relacion.afinidad) || !enRango(r.confianza, def.relacion.confianza)) return false;
      if (def.relacion.estado && !(Array.isArray(def.relacion.estado) ? def.relacion.estado : [def.relacion.estado]).includes(r.estado)) return false;
    }
    return !def.presente || h.presente(n.id);
  });
  if (!candidatos.length) return undefined;
  if (def.prefiere) {
    const valor = (n: NpcView): number => (def.prefiere === 'mas_afinidad' ? (h.relacion(n.id)?.afinidad ?? 0) : def.prefiere === 'mas_apoyo' ? (h.familia(n.id)?.apoyo ?? 0) : (h.familia(n.id)?.expectativas ?? 0));
    return candidatos.reduce((a, b) => (valor(b) > valor(a) ? b : a)).id;
  }
  return rngEstable(s.semilla, 'reparto', suceso, papel, hoy).pick(candidatos).id;
}

// ------------------------------------------------------------------ memoria

const mut = (ctx: ReadContext): SucesosState => ctx.state<SucesosState>() as SucesosState;

function posicion(s: SucesosState, id: string): number {
  let i = s.indice.indexOf(id);
  if (i < 0) i = s.indice.push(id) - 1;
  return i;
}

function apuntar(s: SucesosState, dia: number, suceso: string, opcion: string | undefined, reparto: Record<string, string>, variante?: string): void {
  s.historia.push([dia, posicion(s, variante ? `${suceso}~${variante}` : suceso), opcion === undefined ? -1 : posicion(s, `${suceso}#${opcion}`), ...new Set(Object.values(reparto))]);
}

/** Un hilo sin nada programado ni pendiente ya no tiene por dónde seguir: se cierra. */
function cerrarSiAcabo(s: SucesosState, hilo: number | undefined): void {
  if (hilo === undefined) return;
  if (s.programados.some((p) => p.hilo === hilo) || s.pendientes.some((p) => p.hilo === hilo)) return;
  s.hilos = s.hilos.filter((h) => h.id !== hilo);
}

function cerrarHilo(s: SucesosState, hilo: number | undefined): void {
  if (hilo === undefined) return;
  s.hilos = s.hilos.filter((h) => h.id !== hilo);
  s.programados = s.programados.filter((p) => p.hilo !== hilo);
}

/** Primer día, a partir de mañana, en que empieza ese periodo del calendario. */
function proximoPeriodo(ctx: ReadContext, periodo: string): number {
  const hoy = deDia(ctx);
  let antes = ctx.time.period;
  for (let d = hoy + 1; d < hoy + 800; d++) {
    const p = ctx.timeAt(d * MINUTES_PER_DAY).period;
    if (p === periodo && antes !== periodo) return d;
    antes = p;
  }
  return hoy + 365;
}

function diaDe(ctx: ReadContext, s: SucesosState, suceso: string, en: Cuando, reparto: Record<string, string>): number {
  const hoy = deDia(ctx);
  if ('dias' in en) return hoy + (typeof en.dias === 'number' ? en.dias : rngEstable(s.semilla, 'programa', suceso, hoy).int(en.dias[0], en.dias[1]));
  if ('proximo' in en) return proximoPeriodo(ctx, en.proximo);
  const n = ctx.service<NpcDirectory>(SERVICES.npcs)?.get(reparto[en.elCumpleDe]);
  return hoy + (n?.nacimiento === undefined ? 0 : diasHastaElCumple(n.nacimiento, hoy));
}

// ------------------------------------------------------------------ efectos

interface Situacion {
  s: SucesosState;
  i: Indice;
  suceso: SucesoCompilado;
  reparto: Record<string, string>;
  hilo?: HiloAbierto;
  señal?: Record<string, unknown>;
  /** El PNJ que vive el suceso, si no es el personaje. */
  sujeto?: string;
}

/** Qué stat del personaje hace el papel de cada campo del estado de juego de una persona (`estado-de-jugador.ts`). */
const ESTADO_DEL_PERSONAJE = { moral: 'gen.motivacion', forma: 'gen.forma', fisica: 'gen.energia', salud: 'gen.salud', baja: 'gen.baja' } as const;

function aplicar(ctx: ActionContext, x: Situacion, efectos: readonly Efecto[] | undefined): void {
  const { s, reparto } = x;
  const hoy = deDia(ctx);
  const texto = (t: string) => componerTexto(t, datosDeTexto(ctx, s, reparto, x.hilo, x.señal));
  for (const e of efectos ?? []) {
    if ('estadoDeJugador' in e) {
      // El estado de juego de quien vive el suceso (o de alguien del reparto): si es un PNJ lo aplica quien lo guarda; si es el personaje, sus stats.
      const quien = e.de ? reparto[e.de] : x.sujeto;
      if (quien) ctx.emit<EstadoDePersonaData>({ type: SHARED_EVENTS.ESTADO_DE_PERSONA, data: { npcId: quien, ...e.estadoDeJugador } });
      else if (!e.de) for (const [campo, d] of Object.entries(e.estadoDeJugador)) {
        const stat = ESTADO_DEL_PERSONAJE[campo as keyof typeof ESTADO_DEL_PERSONAJE];
        if (d && ctx.hasStat(stat)) ctx.addStat(stat, d);
      }
    } else if (x.sujeto && ('estado' in e || 'entrena' in e || 'caracter' in e || 'revelaPerk' in e || 'modificador' in e || 'restriccion' in e || 'familia' in e || 'presenta' in e)) {
      // Lo que solo tiene el personaje no se le aplica a un PNJ (la validación ya lo impide en los sucesos «para cualquiera»).
    } else if ('estado' in e) ctx.addStat(e.estado, e.mas);
    else if ('entrena' in e) ctx.train(e.entrena, e.cantidad);
    else if ('relacion' in e) {
      if (reparto[e.relacion]) ctx.emit<CambioDeRelacionData>({ type: SHARED_EVENTS.CAMBIO_DE_RELACION, data: { npcId: reparto[e.relacion], afinidad: e.afinidad, confianza: e.confianza, motivo: x.suceso.def.id } });
    } else if ('familia' in e) {
      if (reparto[e.familia]) ctx.emit<CambioDeFamiliaData>({ type: SHARED_EVENTS.CAMBIO_DE_FAMILIA, data: { npcId: reparto[e.familia], apoyo: e.apoyo, expectativas: e.expectativas } });
    } else if ('caracter' in e) ctx.emit<CambioDeCaracterData>({ type: SHARED_EVENTS.CAMBIO_DE_CARACTER, data: { ejes: e.caracter } });
    else if ('revelaPerk' in e) ctx.emit<PerkReveladoData>({ type: SHARED_EVENTS.PERK_REVELADO, data: { perk: e.revelaPerk } });
    else if ('presenta' in e) {
      if (reparto[e.presenta]) ctx.emit<PresentacionData>({ type: SHARED_EVENTS.PRESENTACION, data: { npcId: reparto[e.presenta] } });
    } else if ('emite' in e) {
      // Los textos de los datos pueden llevar llaves (`'{hecho.futbol.mejor_puesto_id}'`): se componen como cualquier texto.
      const datos = e.datos && typeof e.datos === 'object' ? Object.fromEntries(Object.entries(e.datos as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'string' && v.includes('{') ? texto(v) : v])) : e.datos;
      ctx.emit({ type: e.emite, data: datos });
    }
    else if ('diario' in e) ctx.log(texto(e.diario), e.tipo ?? 'info');
    else if ('marca' in e) {
      if (!e.de || reparto[e.de]) s.marcas[claveDeMarca(e.marca, e.de ? reparto[e.de] : x.sujeto)] = { ...(e.dura ? { hasta: hoy + e.dura.dias } : {}), ...(e.valor === undefined ? {} : { valor: e.valor }) };
    } else if ('quitaMarca' in e) delete s.marcas[claveDeMarca(e.quitaMarca, e.de ? reparto[e.de] : x.sujeto)];
    else if ('recuerda' in e) {
      if (x.hilo) for (const [k, v] of Object.entries(e.recuerda)) {
        const valor = typeof v === 'number' ? v : (x.sujeto ? lectorDeNpc(ctx, x.sujeto) : lectorDe(ctx)).hecho(v);
        if (typeof valor === 'number' || typeof valor === 'string') x.hilo.recuerdos[k] = valor;
      }
    } else if ('programa' in e) {
      const destino = x.i.cat.sucesos.get(e.programa);
      if (destino) {
        const dia = diaDe(ctx, s, e.programa, e.en, reparto);
        s.programados.push({ dia, hasta: dia + (destino.def.aguanta?.dias ?? 0), suceso: e.programa, ...(x.hilo ? { hilo: x.hilo.id } : {}), ...(x.señal ? { señal: x.señal } : {}) });
        s.programados.sort((a, b) => a.dia - b.dia);
      }
    } else if ('modificador' in e) {
      const m = e.modificador;
      s.temporales.push({ tags: [...m.tags], eficiencia: m.eficiencia, coste: m.coste, duracion: m.duracion, motivo: texto(m.motivo), hasta: hoy + m.dias });
    } else if ('restriccion' in e) s.temporales.push({ tags: [...e.restriccion.tags], bloquea: true, motivo: texto(e.restriccion.motivo), hasta: hoy + e.restriccion.dias });
    else if ('si' in e) aplicar(ctx, x, cumplenTodas(e.si, contextoDe(ctx, s, reparto, x.hilo, x.señal, x.sujeto)) ? e.entonces : e.sino);
    else if ('tirada' in e) aplicar(ctx, x, tirarCon(ctx, s, x.suceso.def.id, 'aviso', e.tirada, contextoDe(ctx, s, reparto, x.hilo, x.señal, x.sujeto)) ? e.exito : e.fallo);
    else if ('fin' in e) cerrarHilo(s, x.hilo?.id);
  }
}

// ------------------------------------------------------------------ disparar un suceso

/** La decisión que toca: el suceso con lo que redefina la primera variante que se cumple. */
function decisionDe(def: SucesoCompilado['def'], c: ContextoDeCondicion, forzada?: string): { d: DecisionDef & { efectos?: readonly Efecto[] }; variante?: string } | undefined {
  if (!def.variantes?.length) return { d: def };
  const v = def.variantes.find((x) => (forzada ? x.id === forzada : cumplenTodas(x.si, c)));
  if (!v) return undefined;
  return { d: { titulo: v.titulo ?? def.titulo, texto: v.texto ?? def.texto, opciones: v.opciones ?? def.opciones, efectos: [...(def.efectos ?? []), ...(v.efectos ?? [])] }, variante: v.id };
}

const claveDeReparto = (r: Record<string, string>): string => Object.keys(r).sort().map((k) => `${k}=${r[k]}`).join(',');

function puedeRepetir(ctx: ReadContext, s: SucesosState, x: SucesoCompilado, reparto: Record<string, string>): boolean {
  const r = x.def.repite ?? (x.hilo || 'programado' in x.def.disparo ? 'siempre' : { espera: { dias: 1 } });
  if (r === 'siempre') return true;
  const porReparto = typeof r === 'object' && r.porReparto;
  const ultima = s.ultimaVez[porReparto ? `${x.def.id}@${claveDeReparto(reparto)}` : x.def.id];
  if (ultima === undefined) return true;
  if (r === 'nunca') return false;
  if (r === 'una_vez_por_curso') return ctx.timeAt(ultima * MINUTES_PER_DAY).schoolYear !== ctx.time.schoolYear;
  return deDia(ctx) - ultima >= r.espera.dias;
}

/**
 * Intenta que salga un suceso ahora. Devuelve si ha salido. Si es de un hilo y no viene de uno abierto (`hilo`), lo abre.
 */
/** ¿Pueden los PNJ vivir este suceso? Solo los que valen para cualquiera y son de una clase activada (`ConfigDeSucesos.pnj.clases`). */
const activoParaPnj = (i: Indice, x: SucesoCompilado): boolean => x.def.para === 'cualquiera' && !!x.def.clase && i.config.pnj.clases.includes(x.def.clase);

function intentar(ctx: ActionContext, i: Indice, x: SucesoCompilado, origen: { hilo?: number; señal?: Record<string, unknown>; forzado?: boolean; sujeto?: string } = {}): boolean {
  const s = mut(ctx);
  const def = x.def;
  let hilo = origen.hilo === undefined ? undefined : s.hilos.find((h) => h.id === origen.hilo);
  if (origen.hilo !== undefined && !hilo) return false;
  // Quién lo vive: el personaje o un PNJ (el de su hilo abierto o el que diga quien lo dispara).
  const sujeto = hilo?.sujeto ?? origen.sujeto;
  if (sujeto && !activoParaPnj(i, x)) return false;

  // Lo más barato primero: si ya salió hace poco y no tiene papeles que repartir, no hay nada más que mirar.
  if (!origen.forzado && !x.tienePapeles && !puedeRepetir(ctx, s, x, hilo?.reparto ?? {})) return false;
  // Reparto: el del hilo abierto vale; lo que falte se busca ahora.
  const reparto: Record<string, string> = { ...(hilo?.reparto ?? {}), ...(sujeto ? { sujeto } : {}) };
  for (const [papel, p] of Object.entries(x.reparto)) {
    if (reparto[papel]) continue;
    const quien = repartir(ctx, s, def.id, papel, p, origen.señal);
    if (quien) reparto[papel] = quien;
    else if (!p.opcional) return false;
  }
  if (x.hilo && !hilo) {
    const abiertos = s.hilos.filter((h) => h.def === x.hilo!.id);
    if ((x.hilo.instancias ?? 'una') === 'una' && !sujeto ? abiertos.length : abiertos.some((h) => claveDeReparto(h.reparto) === claveDeReparto(reparto))) return false;
  }
  // Solo un suceso forzado a mano puede saltarse sus condiciones (para recorrer todos los caminos); los demás siguen sus reglas.
  const todoVale = !!origen.forzado && !!prueba(ctx)?.todoVale;
  if (!todoVale && !puedeRepetir(ctx, s, x, reparto)) return false;
  const c = contextoDe(ctx, s, reparto, hilo, origen.señal, sujeto);
  if (!todoVale && !cumplenTodas(i.cuando.get(def.id), c)) return false;
  const dec = decisionDe(def, c, todoVale ? prueba(ctx)?.variante?.(def.id) : undefined);
  if (!dec) return false;

  const hoy = deDia(ctx);
  if (x.hilo && !hilo) {
    hilo = { id: s.siguiente++, def: x.hilo.id, reparto: { ...reparto }, recuerdos: {}, desde: hoy, ...(sujeto ? { sujeto } : {}) };
    s.hilos.push(hilo);
  }
  s.ultimaVez[def.id] = hoy;
  if (typeof def.repite === 'object' && def.repite.porReparto) s.ultimaVez[`${def.id}@${claveDeReparto(reparto)}`] = hoy;
  const sit: Situacion = { s, i, suceso: x, reparto, hilo, señal: origen.señal, sujeto };
  if (sujeto) {
    // Le pasa a un PNJ: no hay nada que enseñar ni que esperar. Se aplica lo que deja y, si hay que decidir, decide él por su carácter.
    aplicar(ctx, sit, dec.d.efectos);
    const lector = lectorDeNpc(ctx, sujeto);
    const elegibles = (dec.d.opciones ?? []).filter((o) => cumplenTodas(o.requiere, c)).map((o) => o.id);
    const elegida = elegirPorCaracter(dec.d.opciones ?? [], elegibles, (eje) => lector.caracter(eje), rngEstable(s.semilla, 'pnj', def.id, sujeto, hoy).next());
    const o = dec.d.opciones?.find((y) => y.id === elegida);
    if (o) {
      const exito = !o.tirada || rngEstable(s.semilla, 'tirada', def.id, o.id, sujeto, hoy).chance(probabilidadDeExito(lector.stat(o.tirada.con) ?? 50, dificultadDeTirada(o.tirada, c)));
      if (o.tirada) aplicar(ctx, sit, o.efectos);
      aplicar(ctx, sit, (o.tirada ? (exito ? o.exito : o.fallo) : o)?.efectos);
    }
    // Si el personaje tiene relación con esa persona, se entera (y queda entre lo vivido con ella), si está activado.
    if (def.textoDeCercano && i.config.pnj.diarioDeCercanos && ctx.service<RelationsService>(SERVICES.relaciones)?.get(sujeto)) {
      ctx.log(componerTexto(def.textoDeCercano, datosDeTexto(ctx, s, reparto, hilo, origen.señal)), 'info');
      apuntar(s, hoy, def.id, o?.id, reparto, dec.variante);
    }
    cerrarSiAcabo(s, hilo?.id);
    return true;
  }
  const datos = datosDeTexto(ctx, s, reparto, hilo, origen.señal);

  if (!dec.d.opciones?.length) {
    // Sin opciones: un aviso con sus efectos.
    const titulo = componerTexto(dec.d.titulo ?? def.titulo, datos);
    const texto = dec.d.texto ? componerTexto(dec.d.texto, datos) : '';
    ctx.log(texto ? `${titulo}. ${texto}` : titulo, 'aviso');
    // Los importantes se enseñan además en una ventana; los detalles ligeros, solo como una línea (salvo que el suceso diga otra cosa).
    if ((def.presentacion ?? (def.categoria === 'menor' ? 'linea' : 'ventana')) === 'ventana') s.avisos = [...s.avisos.slice(-9), { id: s.siguiente++, suceso: def.id, titulo, texto, dia: hoy, reparto }];
    aplicar(ctx, sit, dec.d.efectos);
    apuntar(s, hoy, def.id, undefined, reparto, dec.variante);
    cerrarSiAcabo(s, hilo?.id);
    return true;
  }
  aplicar(ctx, sit, dec.d.efectos);
  const plazo = def.plazo!;
  const vence = plazo.hasta ? hoy * MINUTES_PER_DAY + plazo.hasta.hora : ctx.time.minute + (plazo.dias ?? 1) * MINUTES_PER_DAY;
  s.pendientes.push({ id: s.siguiente++, suceso: def.id, ...(dec.variante ? { variante: dec.variante } : {}), ...(hilo ? { hilo: hilo.id } : {}), reparto, vence, ...(origen.señal ? { señal: origen.señal } : {}) });
  ctx.log(`${componerTexto(dec.d.titulo ?? def.titulo, datos)}: tienes algo que decidir.`, 'aviso');
  return true;
}

// ------------------------------------------------------------------ decidir

interface PendienteResuelto {
  p: Pendiente;
  x: SucesoCompilado;
  d: DecisionDef;
  hilo?: HiloAbierto;
}

function resolver(ctx: ReadContext, i: Indice, id: number): PendienteResuelto | undefined {
  const s = ctx.state<SucesosState>();
  const p = s.pendientes.find((q) => q.id === id);
  const x = p && i.cat.sucesos.get(p.suceso);
  if (!p || !x) return undefined;
  const v = x.def.variantes?.find((y) => y.id === p.variante);
  return { p, x, d: v ? { titulo: v.titulo ?? x.def.titulo, texto: v.texto ?? x.def.texto, opciones: v.opciones ?? x.def.opciones } : x.def, hilo: s.hilos.find((h) => h.id === p.hilo) };
}

/** Lo que cuesta de un recurso (dinero, energía) elegir una opción: si no alcanza, no se puede. */
function faltaRecurso(ctx: ReadContext, o: OpcionDef): string | undefined {
  for (const e of o.efectos ?? []) {
    if (!('estado' in e) || e.mas >= 0) continue;
    const def = ctx.statDef(e.estado);
    if (def?.resource && ctx.stat(e.estado) + e.mas < (def.min ?? 0) - 1e-9) return `Te falta ${def.name.toLowerCase()}`;
  }
  return undefined;
}

function tirar(ctx: ActionContext, s: SucesosState, suceso: string, o: OpcionDef, c: ContextoDeCondicion): boolean {
  return tirarCon(ctx, s, suceso, o.id, o.tirada!, c);
}

/** Una tirada del personaje (la de una opción, o la de un efecto `tirada` de un aviso, con la clave `aviso`). */
function tirarCon(ctx: ActionContext, s: SucesosState, suceso: string, clave: string, t: TiradaDef, c: ContextoDeCondicion): boolean {
  const forzada = prueba(ctx)?.tirada?.(suceso, clave);
  if (forzada) return forzada === 'exito';
  const rng = rngEstable(s.semilla, 'tirada', suceso, clave, ctx.time.minute);
  const p = probabilidadDeExito(ctx.hasStat(t.con) ? ctx.norm(t.con) * 100 : 0, dificultadDeTirada(t, c));
  let exito = rng.chance(p);
  const h = lectorDe(ctx);
  // Suertudo repite a veces una tirada fallada; Gafe estropea a veces una acertada (E5.6).
  if (!exito && h.perk('suertudo') !== 'no' && rng.chance(TIRADA.suertudo)) exito = rng.chance(p);
  else if (exito && h.perk('gafe') !== 'no' && rng.chance(TIRADA.gafe)) exito = false;
  return exito;
}

function elegir(ctx: ActionContext, i: Indice, r: PendienteResuelto, o: OpcionDef): void {
  const s = mut(ctx);
  s.pendientes = s.pendientes.filter((q) => q.id !== r.p.id);
  const sit: Situacion = { s, i, suceso: r.x, reparto: r.p.reparto, hilo: r.hilo, señal: r.p.señal };
  const rama: RamaDef = o.tirada ? ((tirar(ctx, s, r.x.def.id, o, contextoDe(ctx, s, r.p.reparto, r.hilo, r.p.señal)) ? o.exito : o.fallo) ?? o) : o;
  if (o.tirada) aplicar(ctx, sit, o.efectos);
  aplicar(ctx, sit, rama.efectos);
  // Las decisiones mueven el carácter poco a poco (E4.3).
  if (o.caracter && i.config.caracterPorDecision) {
    const ejes: Record<string, number> = {};
    for (const [eje, v] of Object.entries(o.caracter)) ejes[eje] = v * i.config.caracterPorDecision;
    ctx.emit<CambioDeCaracterData>({ type: SHARED_EVENTS.CAMBIO_DE_CARACTER, data: { ejes } });
  }
  const datos = datosDeTexto(ctx, s, r.p.reparto, r.hilo, r.p.señal);
  const titulo = componerTexto(r.d.titulo ?? r.x.def.titulo, datos);
  ctx.log(rama.resultado ? `${titulo}. ${componerTexto(rama.resultado, datos)}` : `${titulo}: ${componerTexto(o.texto, datos)}.`, 'info');
  apuntar(s, deDia(ctx), r.x.def.id, o.id, r.p.reparto, r.p.variante);
  cerrarSiAcabo(s, r.p.hilo);
}

const ID_DE_ELEGIR = /^sucesos\.elegir\.(\d+)\.([a-zñ][a-zñ0-9_]*)$/;
export const idDeElegir = (pendiente: number, opcion: string): string => `sucesos.elegir.${pendiente}.${opcion}`;

const NOMBRE_DE_EJE: Record<string, string> = { disciplina: 'disciplina', honestidad: 'honestidad', ambicion: 'ambición', sacrificio: 'sacrificio', sociabilidad: 'sociabilidad', agresividad: 'agresividad', prudencia: 'prudencia', optimismo: 'optimismo' };

function motivoDe(ctx: ReadContext, i: Indice, r: PendienteResuelto, o: OpcionDef): { visible: boolean; elegible: boolean; motivo?: string } {
  if (prueba(ctx)?.todoVale) return { visible: true, elegible: true };
  const c = contextoDe(ctx, ctx.state<SucesosState>(), r.p.reparto, r.hilo, r.p.señal);
  const e = evaluarOpcion(o, c, i.config.presentacion);
  if (!e.elegible) return { visible: e.visible, elegible: false, motivo: e.motivo === 'caracter' ? `No va contigo (${NOMBRE_DE_EJE[e.ejeEnContra!] ?? e.ejeEnContra})` : 'No cumples lo que hace falta' };
  const falta = faltaRecurso(ctx, o);
  return falta ? { visible: true, elegible: false, motivo: falta } : { visible: true, elegible: true };
}

/** Hace salir un suceso ahora, sin esperar a su disparo (sus condiciones y su reparto sí cuentan). Para probar: la herramienta y la interfaz de pruebas. */
export const idDeForzar = (suceso: string): string => `sucesos.forzar.${suceso}`;

function accionDeForzar(ctx: ReadContext, id: string): ActionDef | undefined {
  if (!id.startsWith('sucesos.forzar.')) return undefined;
  const i = indiceDe(ctx);
  const x = i.cat.sucesos.get(id.slice('sucesos.forzar.'.length));
  if (!x) return undefined;
  return {
    id,
    name: `Forzar: ${x.def.titulo}`,
    tags: ['prueba'],
    duration: 1,
    group: 'Pruebas',
    run: (c) => {
      const s = mut(c);
      // Si es de un hilo que ya está abierto y este suceso es de los programados, sigue ese hilo.
      const abierto = 'programado' in x.def.disparo ? s.hilos.find((h) => h.def === x.hilo?.id) : undefined;
      const señal = prueba(c)?.señal?.() ?? ('al' in x.def.disparo ? (x.def.ejemploDeSeñal as Record<string, unknown> | undefined) : undefined);
      if (abierto) s.programados = s.programados.filter((p) => !(p.suceso === x.def.id && p.hilo === abierto.id));
      if (!intentar(c, i, x, { hilo: abierto?.id, señal, forzado: true })) c.log(`«${x.def.titulo}» no ha salido: no se cumplen sus condiciones o falta alguien en el reparto.`, 'aviso');
      else if (abierto) cerrarSiAcabo(s, abierto.id);
    },
  };
}

function accionDeElegir(ctx: ReadContext, id: string): ActionDef | undefined {
  const m = ID_DE_ELEGIR.exec(id);
  if (!m) return accionDeForzar(ctx, id);
  const i = indiceDe(ctx);
  const r = resolver(ctx, i, Number(m[1]));
  const o = r?.d.opciones?.find((x) => x.id === m[2]);
  if (!r || !o) return undefined;
  const pendiente = r.p.id;
  return {
    id,
    name: (c) => componerTexto(o.texto, datosDeTexto(c, c.state<SucesosState>(), r.p.reparto, r.hilo, r.p.señal)),
    tags: ['decision'],
    duration: o.minutos ?? 1,
    group: 'Decisiones',
    available: (c) => {
      const ahora = resolver(c, i, pendiente);
      if (!ahora) return 'Ya no hay nada que decidir';
      const e = motivoDe(c, i, ahora, o);
      return e.elegible ? true : (e.motivo ?? 'No disponible');
    },
    run: (c) => {
      const ahora = resolver(c, i, pendiente);
      if (ahora) elegir(c, i, ahora, o);
    },
  };
}

/** Pista en palabras de lo que puede pasar al elegir, compuesta con los efectos (si la opción no trae una a mano). */
function pistaDe(o: OpcionDef, modo: ConfigDeSucesos['presentacion']['consecuencias'], prob?: number): string | undefined {
  if (modo === 'nada') return undefined;
  if (o.pista && modo === 'pistas') return o.pista;
  const efectos = [...(o.efectos ?? []), ...(o.exito?.efectos ?? [])];
  const partes: string[] = [];
  if (modo === 'numeros') {
    for (const e of efectos) {
      if ('estado' in e) partes.push(`${e.estado} ${e.mas > 0 ? '+' : ''}${e.mas}`);
      else if ('relacion' in e) partes.push(`relación con ${e.relacion}: ${[e.afinidad && `afinidad ${e.afinidad > 0 ? '+' : ''}${e.afinidad}`, e.confianza && `confianza ${e.confianza > 0 ? '+' : ''}${e.confianza}`].filter(Boolean).join(', ')}`);
      else if ('entrena' in e) partes.push(`entrena ${e.entrena}`);
      else if ('restriccion' in e) partes.push(`castigo de ${e.restriccion.dias} días`);
    }
    if (prob !== undefined) partes.unshift(`${Math.round(prob * 100)} % de que salga bien`);
    return partes.join(' · ') || undefined;
  }
  if (o.tirada) partes.push('Arriesgado: puede salir mal');
  let relacion = 0;
  for (const e of efectos) if ('relacion' in e) relacion += (e.afinidad ?? 0) + (e.confianza ?? 0);
  if (relacion > 0) partes.push('Le va a gustar');
  if (relacion < 0) partes.push('Le va a sentar mal');
  if (efectos.some((e) => 'estado' in e && e.estado.endsWith('.dinero') && e.mas < 0)) partes.push('Cuesta dinero');
  if (efectos.some((e) => 'restriccion' in e)) partes.push('Puede acabar en castigo');
  return partes.join(' · ') || undefined;
}

// ------------------------------------------------------------------ el paso del tiempo

function vencer(ctx: ActionContext, i: Indice): void {
  const s = mut(ctx);
  const ahora = ctx.time.minute;
  for (const p of s.pendientes.filter((q) => q.vence <= ahora)) {
    const r = resolver(ctx, i, p.id);
    const o = r?.d.opciones?.find((x) => x.id === r.x.def.plazo?.porDefecto);
    if (r && o) elegir(ctx, i, r, o);
    else s.pendientes = s.pendientes.filter((q) => q.id !== p.id);
  }
}

/** Los programados a los que les ha llegado el día: salen si es el momento; si no, esperan lo que aguanten y luego se pierden. */
function programados(ctx: ActionContext, i: Indice): void {
  const s = mut(ctx);
  const hoy = deDia(ctx);
  if (!s.programados.length || s.programados[0].dia > hoy) return;
  for (const p of s.programados.filter((q) => q.dia <= hoy)) {
    const x = i.cat.sucesos.get(p.suceso);
    const quitar = () => (s.programados = s.programados.filter((q) => q !== p));
    if (!x) quitar();
    else if (intentar(ctx, i, x, { hilo: p.hilo, señal: p.señal })) quitar();
    else if (hoy > p.hasta) {
      quitar();
      // Se pierde: si el suceso lo dice, se aplica una de sus opciones como si se hubiera elegido.
      const hilo = s.hilos.find((h) => h.id === p.hilo);
      const o = x.def.opciones?.find((y) => y.id === x.def.siSePierde);
      if (o && (p.hilo === undefined || hilo)) elegir(ctx, i, { p: { id: -1, suceso: x.def.id, hilo: p.hilo, reparto: hilo?.reparto ?? {}, vence: 0, señal: p.señal }, x, d: x.def, hilo }, o);
      else cerrarSiAcabo(s, p.hilo);
    }
  }
}

function hayCupo(ctx: ReadContext, s: SucesosState, i: Indice, categoria: CategoriaDeCupo): boolean {
  const t = ctx.time;
  if (s.cupo.dia !== t.day) (s.cupo.dia = t.day), (s.cupo.hoy = {});
  if (s.cupo.semana !== t.week) (s.cupo.semana = t.week), (s.cupo.estaSemana = {});
  const c = i.config.cupo[categoria];
  return (s.cupo.hoy[categoria] ?? 0) < c.alDia && (s.cupo.estaSemana[categoria] ?? 0) < c.aLaSemana;
}

/** Los sucesos de probabilidad: se tira cada uno con su azar estable y los que salen compiten por el cupo de su categoría, por peso. */
function espontaneos(ctx: ActionContext, i: Indice, lista: readonly SucesoCompilado[], cada: string): void {
  if (!lista.length) return;
  const s = mut(ctx);
  const hoy = deDia(ctx);
  const salen = lista.filter((x) => {
    const azar = prueba(ctx)?.azar?.(x.def.id) ?? rngEstable(s.semilla, 'suceso', x.def.id, cada, hoy).next();
    return azar < (x.def.disparo as { prob: number }).prob;
  });
  // El orden entre los que salen también es estable: más peso, antes.
  const orden = salen.map((x) => ({ x, r: rngEstable(s.semilla, 'orden', x.def.id, hoy).next() ** (1 / (x.def.peso ?? 1)) })).sort((a, b) => b.r - a.r);
  for (const { x } of orden) {
    const categoria = x.cupo;
    if (!hayCupo(ctx, s, i, categoria)) continue;
    if (intentar(ctx, i, x)) {
      s.cupo.hoy[categoria] = (s.cupo.hoy[categoria] ?? 0) + 1;
      s.cupo.estaSemana[categoria] = (s.cupo.estaSemana[categoria] ?? 0) + 1;
    }
  }
}

/** Mezcla de enteros (murmur3) a un número en [0, 1): el azar de «este suceso, esta persona, esta semana» sin crear un generador por cada uno. */
function azarDe(a: number, b: number, c: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(c + 0x165667b1, 0x27d4eb2f);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const huella = (t: string): number => {
  let h = 0x811c9dc5;
  for (let k = 0; k < t.length; k++) h = Math.imul(h ^ t.charCodeAt(k), 0x01000193);
  return h | 0;
};

/**
 * La pasada semanal de los PNJ: los sucesos espontáneos que pueden pasarle a cualquiera y son de una clase activada se tiran una vez por
 * semana y persona (calcular por semanas no es recortar). Cada tirada es propia del suceso, la persona y la semana. Sin clases activadas con
 * sucesos espontáneos no cuesta nada. Lo que cuesta activarlas se mide con `npm run eventos:rendimiento`.
 */
function pasadaDePnj(ctx: ActionContext, i: Indice): void {
  const lista = [...i.cadaSemana, ...i.cadaDia].filter((x) => activoParaPnj(i, x));
  if (!lista.length) return;
  const npcs = ctx.service<NpcDirectory>(SERVICES.npcs)?.list() ?? [];
  const s = mut(ctx);
  const semana = ctx.time.week;
  const sales = lista.map((x) => ({ x, sal: huella(x.def.id) ^ s.semilla, prob: (x.def.disparo as { prob: number }).prob }));
  for (const n of npcs) {
    const h = huella(n.id);
    for (const { x, sal, prob } of sales) if (azarDe(sal, h, semana) < prob) intentar(ctx, i, x, { sujeto: n.id });
  }
}

function umbrales(ctx: ActionContext, i: Indice): void {
  const s = mut(ctx);
  for (const x of i.umbrales) {
    const se = cumplenTodas((x.def.disparo as { umbral: readonly Condicion[] }).umbral, contextoDe(ctx, s, {}));
    if (se && !s.umbrales[x.def.id]) intentar(ctx, i, x);
    if (se) s.umbrales[x.def.id] = true;
    else delete s.umbrales[x.def.id];
  }
}

function caducar(ctx: ReadContext, s: SucesosState): void {
  const hoy = deDia(ctx);
  if (s.temporales.length) s.temporales = s.temporales.filter((t) => t.hasta > hoy);
  if (s.avisos.length) s.avisos = s.avisos.filter((a) => a.dia >= hoy - 1);
  for (const [k, m] of Object.entries(s.marcas)) if (m.hasta !== undefined && m.hasta <= hoy) delete s.marcas[k];
}

function alEvento(ctx: ActionContext, ev: GameEvent): void {
  const i = indiceDe(ctx);
  if (!i.cat.sucesos.size && !i.cat.contadores.length) return;
  const s = mut(ctx);

  for (const c of i.contadoresPorSeñal.get(ev.type) ?? []) s.contadores[c.id] = (s.contadores[c.id] ?? 0) + 1;
  if (ev.type === CORE_EVENTS.ACTION_DONE) {
    const a = ev.data as ActionDoneData;
    for (const c of i.contadoresDeAccion) {
      const q = (c.cuenta as { accion: { tags: readonly string[]; minutosMin?: number } }).accion;
      if (a.duration >= (q.minutosMin ?? 0) && q.tags.every((t) => a.tags.includes(t))) s.contadores[c.id] = (s.contadores[c.id] ?? 0) + 1;
    }
    // Tras cada acción: lo que vence y lo programado que esperaba su momento (has llegado a casa, ya está tu madre).
    if (s.pendientes.length) vencer(ctx, i);
    programados(ctx, i);
  } else if (ev.type === CORE_EVENTS.DAY_START) {
    caducar(ctx, s);
    vencer(ctx, i);
    programados(ctx, i);
    umbrales(ctx, i);
    espontaneos(ctx, i, i.cadaDia, 'dia');
  } else if (ev.type === CORE_EVENTS.WEEK_END) {
    espontaneos(ctx, i, i.cadaSemana, 'semana');
    pasadaDePnj(ctx, i);
  }

  const grupo = i.porSeñal.get(ev.type);
  if (grupo) {
    const señal = (ev.data ?? {}) as Record<string, unknown>;
    const hoy = deDia(ctx);
    // Los que piden un valor concreto en un dato de la señal solo se miran si la señal lo trae.
    let candidatos: readonly SucesoCompilado[] = grupo.siempre;
    for (const [campo, porValor] of grupo.campos) {
      const v = señal[campo];
      for (const valor of Array.isArray(v) ? v : [v]) {
        const lista = porValor.get(valor as string);
        if (lista) candidatos = candidatos === grupo.siempre ? [...candidatos, ...lista] : (candidatos as SucesoCompilado[]).concat(lista);
      }
    }
    // Un contexto mínimo, el mismo para todos los candidatos: solo sirve para las condiciones ligeras (no lee hechos ni reparto).
    let ligero: ContextoDeCondicion | undefined;
    const noPasa = (x: SucesoCompilado): boolean => {
      const l = i.ligeras.get(x.def.id);
      if (!l) return false;
      ligero ??= { ...contextoDe(ctx, s, {}, undefined, señal), hechos: undefined as unknown as LectorDeHechos };
      return !cumplenTodas(l, ligero);
    };
    for (const x of candidatos) {
      if (x.def.sujeto) {
        // Lo vive la persona que dice la señal (un PNJ): solo si esa clase de suceso está activada para ellos.
        const sujeto = señal[x.def.sujeto.deLaSeñal];
        if (typeof sujeto === 'string' && activoParaPnj(i, x)) intentar(ctx, i, x, { señal, sujeto });
        continue;
      }
      const prob = (x.def.disparo as { prob?: number }).prob;
      const noSale = noPasa(x);
      if (prob !== undefined) {
        if (noSale) continue;
        // Espontáneo ligado a un momento (entrar en clase, llegar al patio): sale algunas veces y gasta el cupo de su categoría.
        const azar = prueba(ctx)?.azar?.(x.def.id) ?? rngEstable(s.semilla, 'suceso', x.def.id, 'al', ctx.time.minute).next();
        if (azar >= prob || !hayCupo(ctx, s, i, x.cupo)) continue;
        if (intentar(ctx, i, x, { señal })) {
          s.cupo.hoy[x.cupo] = (s.cupo.hoy[x.cupo] ?? 0) + 1;
          s.cupo.estaSemana[x.cupo] = (s.cupo.estaSemana[x.cupo] ?? 0) + 1;
        }
        continue;
      }
      if (!noSale && intentar(ctx, i, x, { señal })) continue;
      // No era el momento: si aguanta, se queda esperando como un programado más (sin hilo todavía).
      if (x.def.aguanta && !x.hilo && !s.programados.some((p) => p.suceso === x.def.id)) s.programados.push({ dia: hoy, hasta: hoy + x.def.aguanta.dias, suceso: x.def.id, señal });
      else if (x.def.aguanta && x.hilo && !s.programados.some((p) => p.suceso === x.def.id && p.hilo === undefined)) s.programados.push({ dia: hoy, hasta: hoy + x.def.aguanta.dias, suceso: x.def.id, señal });
    }
    s.programados.sort((a, b) => a.dia - b.dia);
  }
}

// ------------------------------------------------------------------ el módulo

function pendientesDe(ctx: ReadContext): SucesoPendiente[] {
  const i = indiceDe(ctx);
  const s = ctx.state<SucesosState>();
  const out: SucesoPendiente[] = [];
  for (const p of s.pendientes) {
    const r = resolver(ctx, i, p.id);
    if (!r) continue;
    const datos = datosDeTexto(ctx, s, p.reparto, r.hilo, p.señal);
    const modo = i.config.presentacion.consecuencias;
    const cond = contextoDe(ctx, s, p.reparto, r.hilo, p.señal);
    const opciones: OpcionPendiente[] = (r.d.opciones ?? []).map((o) => {
      const prob = o.tirada && modo === 'numeros' ? probabilidadDeExito(ctx.hasStat(o.tirada.con) ? ctx.norm(o.tirada.con) * 100 : 0, dificultadDeTirada(o.tirada, cond)) : undefined;
      const pista = pistaDe(o, modo, prob);
      return { id: o.id, accion: idDeElegir(p.id, o.id), texto: componerTexto(o.texto, datos), ...motivoDe(ctx, i, r, o), ...(pista ? { pista: componerTexto(pista, datos) } : {}), minutos: o.minutos ?? 1, ...(prob === undefined ? {} : { probabilidad: prob }) };
    });
    out.push({ id: p.id, suceso: p.suceso, titulo: componerTexto(r.d.titulo ?? r.x.def.titulo, datos), texto: r.d.texto ? componerTexto(r.d.texto, datos) : '', urgencia: r.x.def.urgencia ?? 'ahora', categoria: r.x.def.categoria ?? 'importante', origen: r.x.origen, ...(r.x.deporte ? { deporte: r.x.deporte } : {}), vence: p.vence, reparto: p.reparto, opciones });
  }
  return out;
}

function recuerdosDe(ctx: ReadContext, persona?: string): RecuerdoDeSuceso[] {
  const i = indiceDe(ctx);
  const s = ctx.state<SucesosState>();
  const out: RecuerdoDeSuceso[] = [];
  for (const [dia, suceso, opcion, ...personas] of s.historia) {
    if (persona && !personas.includes(persona)) continue;
    const [id, variante] = s.indice[suceso as number].split('~');
    const o = (opcion as number) < 0 ? undefined : s.indice[opcion as number].split('#')[1];
    const def = i.cat.sucesos.get(id)?.def;
    const opcionDef = o ? [...(def?.opciones ?? []), ...(def?.variantes ?? []).flatMap((v) => v.opciones ?? [])].find((x) => x.id === o) : undefined;
    out.push({ dia: dia as number, suceso: id, titulo: (def?.titulo ?? 'Un recuerdo de hace tiempo').replace(/\{[^}]*\}/g, '…'), ...(variante ? { variante } : {}), ...(o ? { opcion: o, opcionTexto: (opcionDef?.texto ?? o).replace(/\{[^}]*\}/g, '…') } : {}), personas: personas as string[] });
  }
  return out;
}

export const sucesos = defineModule<SucesosState>({
  id: 'sucesos',
  name: 'Sucesos',
  description: 'El director de los sucesos y las decisiones. No trae contenido: lo aportan los módulos como datos.',
  initState: (ctx) => estadoInicial(ctx.seed, ctx.playerName),
  on: { [CUALQUIER_EVENTO]: alEvento },
  resolverAccion: accionDeElegir,
  modifiers: [
    {
      // Modificadores y restricciones temporales que dejan los sucesos (un plan del entrenador, un castigo): por etiquetas, sin conocer las acciones.
      id: 'sucesos.temporales',
      tags: ['*'],
      apply: (ctx, accion) => {
        const s = ctx.state<SucesosState>();
        if (!s.temporales.length) return null;
        const dia = ctx.time.day;
        let eficiencia = 1;
        let coste = 1;
        let duracion = 1;
        let bloquea: string | undefined;
        const motivos: string[] = [];
        for (const t of s.temporales) {
          if (t.hasta <= dia || !t.tags.some((tag) => accion.tags.includes(tag))) continue;
          eficiencia *= t.eficiencia ?? 1;
          coste *= t.coste ?? 1;
          duracion *= t.duracion ?? 1;
          if (t.bloquea) bloquea ??= t.motivo;
          motivos.push(t.motivo);
        }
        return motivos.length ? { efficiency: eficiencia, cost: coste, duration: duracion, reason: motivos.join('; '), ...(bloquea ? { bloquea } : {}) } : null;
      },
    },
  ],
  services: {
    [SERVICES.sucesos]: (ctx): SucesosService => ({
      pendientes: () => pendientesDe(ctx),
      avisos: () => ctx.state<SucesosState>().avisos,
      tiene: (marca, persona) => contextoDe(ctx, ctx.state<SucesosState>(), {}).marca(marca, persona),
      contador: (id) => ctx.state<SucesosState>().contadores[id] ?? 0,
      recuerdos: (persona) => recuerdosDe(ctx, persona),
      config: () => indiceDe(ctx).config,
      catalogo: () => [...indiceDe(ctx).cat.sucesos.values()].map((x) => ({ id: x.def.id, titulo: x.def.titulo.replace(/\{[^}]*\}/g, '…'), origen: x.origen, ...(x.deporte ? { deporte: x.deporte } : {}), ...(x.hilo ? { hilo: x.hilo.id } : {}) })),
    }),
  },
});
