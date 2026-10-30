import { tramoDeSemana, type CalendarioPais } from './calendar';
import type { CategoriaDef } from './categories';
import type { ReadContext } from './context';
import type { LugarId } from './lugares';

/**
 * FICHA Y DATOS DE UN DEPORTE. Cada módulo de deporte los aporta con `GameModule.aportes` (claves en `APORTES`), así que el juego puede
 * preguntar «qué deportes hay» (el catálogo de la nueva partida) y «qué cambia este deporte de un país a otro» sin importar ningún deporte.
 *
 * Los datos van **por deporte y, dentro del deporte, por país** (lo decide el deporte, no el país): las categorías de una federación, su
 * temporada y sus competiciones. Si el deporte no trae el país de la partida se usan los de España, con el nombre del país donde el texto lo
 * pide (`{pais}`), hasta que una actualización traiga los reales. Plan: `docs/PLAN_DEPORTES_MODULARES.md` §4.
 */

/** Los puntos de extensión que usan los deportes. */
export const APORTES = {
  /** Un `FichaDeDeporte` por deporte. */
  fichaDeDeporte: 'deportes.ficha',
  /** Un `DatosDeDeporte` por deporte. */
  datosDeDeporte: 'deportes.datos',
  /** Un `AporteDeLugares` por deporte: lo que pone en el mapa de la ciudad (su estadio, sus pistas, las salas de sus clubes). */
  lugaresDeDeporte: 'lugares.mapa',
} as const;

/** Lo que el juego sabe de un deporte sin cargar su partida: para listarlo al crear la partida. */
export interface FichaDeDeporte {
  /** Id del módulo del deporte (p. ej. `atletismo`). */
  id: string;
  nombre: string;
  /** La prueba o disciplina que se juega (p. ej. «400 m»). */
  disciplina: string;
  descripcion: string;
  tipo: 'individual' | 'equipo';
}

/**
 * Cuándo es la temporada, **relativa al calendario escolar del país** (no en semanas fijas): así los datos de España encajan en cualquier
 * calendario. Las semanas se cuentan en semanas de clase; no hay competición en vacaciones.
 */
export interface TemporadaDeDeporte {
  /** Semanas de clase al empezar el curso en que se entrena pero aún no se compite (la primera competición es la siguiente). */
  semanasDePretemporada: number;
  /** Cuántas semanas antes de la última semana de clase del curso se juegan las semifinales y la final del campeonato (la final, después). */
  semifinalAntesDelFinal: number;
  finalAntesDelFinal: number;
}

/** Cuándo y dónde se compite cada semana (la jornada): lo que usan las agendas de rivales y entrenadores y los textos de los clubes. */
export interface JornadaDeCompeticion {
  /** Días de la semana (0 = lunes). */
  dias: readonly number[];
  /** Horas del día. */
  desde: number;
  hasta: number;
  /** Dónde es. */
  lugar: LugarId;
  /** En palabras, para contarlo antes de apuntarse a un club (p. ej. «Carreras: los sábados de 9 a 13 en el estadio.»). */
  texto: string;
}

/** Lo que organiza la federación (se puede usar `{pais}` para el nombre del país de la partida). */
export interface CompeticionesDeDeporte {
  federacion: string;
  /** El campeonato nacional (la final), p. ej. «campeonato de {pais}». */
  campeonato: string;
  /** La competición de cada semana. */
  jornada: JornadaDeCompeticion;
}

/**
 * Una sección de club en un deporte: el club (que puede tener secciones en varios deportes; el primero que lo define pone su nombre y su calidad) y lo
 * que tiene para este deporte: sus sesiones, su acceso y sus sitios. El módulo `clubes` junta las secciones de todos los deportes cargados.
 */
export interface ClubDeDeporte {
  id: string;
  nombre: string;
  /** El club del colegio: entrenamientos de menor nivel que un club de fuera. */
  esColegio?: boolean;
  /** 1 = colegio, 2 = club de la ciudad, 3 = alto rendimiento. */
  calidad: 1 | 2 | 3;
  /** Días de la semana (0 = lunes) y horas de las sesiones de esta sección. */
  sesiones: { weekdays: readonly number[]; desde: number; hasta: number };
  /** Nivel y edad mínimos para entrar (sin él, abierto). */
  acceso?: { nivel: number; edadMin: number };
  /** Dónde entrena esta sección. */
  sede: LugarId;
  /** Dónde se hacen los trámites (apuntarse, pruebas de acceso): la administración del colegio o la sala del club. */
  tramites: LugarId;
}

/**
 * Un club o el equipo de un colegio que recluta niños para el deporte. La plantilla es un número más o menos definido (se sortea entre `min` y `max`
 * al crear la partida y se mantiene): así un club no tiene veinte niños. Los equipos de un colegio solo reclutan a sus alumnos; los clubes, a cualquiera
 * (por ahora, los de más calidad escogen primero; más adelante, el prestigio).
 */
export interface EquipoDeDeporte {
  /** Id del club en `clubes` (`colegio`, `club_ciudad`...) o un nombre libre para los que no están en el catálogo del personaje (`colegio2`, `club3`). */
  club: string;
  /** Cómo se llama, si no está en el catálogo del personaje. */
  nombre?: string;
  /** Equipo de un colegio: `propio` (el del personaje) o uno de los de fuera (`COLEGIOS_DE_FUERA`). Solo recluta alumnos de ese colegio. Sin él, es un club abierto a cualquier colegio. */
  colegio?: string;
  /** 1 colegio, 2 club de la ciudad, 3 alto rendimiento. Sin él: la del club en el catálogo del personaje, o 1 si es de un colegio y 2 si no. */
  calidad?: 1 | 2 | 3;
  /** Edades de competición que recluta (por defecto, las del deporte; los equipos de un colegio solo llegan a la edad en que acaba el colegio). */
  edades?: { min?: number; max?: number };
  plantilla: { min: number; max: number };
}

/**
 * La gente de un deporte: lo que `npcs` necesita para reclutar a los niños que lo practican y para renovarlos cada curso. Todos los niños se crean
 * iguales (con su genética y sus gustos) y cada deporte recluta a los que mejor encajan, primero entre los interesados. La partida **guarda lo que
 * pidió cada deporte** (`npcs` copia esto al empezar), así que su gente sigue viviendo aunque el módulo del deporte ya no esté (plan §5).
 */
export interface PoblacionDeDeporte {
  /** Etiqueta de los deportistas (p. ej. `atleta`): así los buscan los módulos del deporte (`NpcDirectory.list({ tag })`). */
  etiqueta: string;
  /** Descripción de un deportista que no es del colegio del personaje («Compite en atletismo.»). */
  descripcionDeRival: string;
  /** Capacidades (ids de stats genéricas) de las que sale su potencial: la media de lo que heredan, por la aptitud propia de cada uno. */
  capacidades: readonly string[];
  /** Cuánto varía su aptitud propia respecto a lo heredado (0,15 = ±15 %). */
  aptitud: number;
  reclutamiento: {
    /** Edades de competición que cubre (ambas incluidas). A la siguiente a la última se retiran. */
    edades: { min: number; max: number };
    /** Hasta esta edad algún niño puede dejar el deporte cada curso (con esta probabilidad) y otro ocupa su plaza. */
    edadMaxBaja: number;
    probabilidadBaja: number;
  };
  /** Los clubes y equipos de colegio que reclutan, con su plantilla. */
  equipos: readonly EquipoDeDeporte[];
  /** Frase que se añade a la descripción de un alumno del colegio del personaje que entra en el equipo del colegio («Del equipo de atletismo del colegio.»). */
  descripcionDelEquipo: string;
  entrenadores: {
    sesgoCaracter: Readonly<Record<string, number>>;
    interesesPreferidos: readonly string[];
    /** Descripción del entrenador del club del colegio («Entrena al grupo de atletismo del colegio.»). */
    descripcionDelColegio: string;
    /** A qué se dedican, para «Entrenador de atletismo» (`de atletismo`). */
    dedicacion: string;
    /** Los entrenadores de los clubes de fuera: de cada club, las edades que lleva cada uno. */
    deFuera: readonly { club: string; edades: readonly (readonly [number, number])[] }[];
  };
}

/** Lo que un deporte pone de un país: sus categorías, su temporada y sus competiciones. */
export interface DatosDeDeportePais {
  categorias: readonly CategoriaDef[];
  temporada: TemporadaDeDeporte;
  competiciones: CompeticionesDeDeporte;
  /** Los clubes con sección en este deporte. */
  clubes: readonly ClubDeDeporte[];
  /** Dónde entrena quien aún no tiene club (`colegio`) y dónde, por defecto, los clubes de fuera que no están en el catálogo (`fuera`). */
  sedes: { colegio: LugarId; fuera: LugarId };
  /** La gente del deporte (rivales, entrenadores y equipo del colegio). */
  poblacion: PoblacionDeDeporte;
}

export interface DatosDeDeporte {
  id: string;
  /** Datos por id de país. **`espana` es obligatorio**: es el de respaldo de los países que el deporte aún no trae. */
  paises: Readonly<Record<string, DatosDeDeportePais>>;
}

/** Las fichas de los deportes cargados en la partida. */
export const fichasDeDeporte = (ctx: Pick<ReadContext, 'aportes'>): readonly FichaDeDeporte[] => ctx.aportes<FichaDeDeporte>(APORTES.fichaDeDeporte);

/**
 * Los datos de un deporte para el país de la partida; si el deporte no trae ese país, los de España (`deRespaldo`). Lanza un error si el deporte
 * no ha aportado sus datos.
 */
export function datosDeDeporte(ctx: Pick<ReadContext, 'aportes' | 'pais'>, deporte: string): DatosDeDeportePais & { deRespaldo: boolean } {
  const d = ctx.aportes<DatosDeDeporte>(APORTES.datosDeDeporte).find((x) => x.id === deporte);
  if (!d) throw new Error(`El deporte «${deporte}» no ha aportado sus datos (aporte «${APORTES.datosDeDeporte}»)`);
  const propios = d.paises[ctx.pais.id];
  return { ...(propios ?? d.paises.espana), deRespaldo: !propios };
}

/** Un texto de los datos de un deporte con el nombre del país de la partida donde pone `{pais}`. */
export const textoConPais = (texto: string, ctx: Pick<ReadContext, 'pais'>): string => texto.replaceAll('{pais}', ctx.pais.nombre);

/** Las semanas del curso (0 = la primera) en que empieza la competición y se juegan las semifinales y la final. */
export interface SemanasDeTemporada {
  primeraCompeticion: number;
  semifinal: number;
  final: number;
}

const CACHE_DE_SEMANAS = new WeakMap<TemporadaDeDeporte, WeakMap<CalendarioPais, SemanasDeTemporada>>();

/** Pasa la temporada relativa de un deporte a semanas del curso con el calendario del país. */
export function semanasDeTemporada(cal: CalendarioPais, t: TemporadaDeDeporte): SemanasDeTemporada {
  const porCalendario = CACHE_DE_SEMANAS.get(t) ?? new WeakMap<CalendarioPais, SemanasDeTemporada>();
  CACHE_DE_SEMANAS.set(t, porCalendario);
  const guardado = porCalendario.get(cal);
  if (guardado) return guardado;
  const clase: number[] = [];
  for (let w = 0; w < cal.semanasPorCurso; w++) if (tramoDeSemana(cal, w).periodo === 'clase') clase.push(w);
  const ultima = clase[clase.length - 1];
  const semanas = {
    primeraCompeticion: clase[Math.min(t.semanasDePretemporada, clase.length - 1)],
    semifinal: ultima - t.semifinalAntesDelFinal,
    final: ultima - t.finalAntesDelFinal,
  };
  porCalendario.set(cal, semanas);
  return semanas;
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const esEntero = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;

/** Comprueba los datos de un deporte (la forma, no el contenido de juego): devuelve los problemas, en español; vacío si valen. */
export function validarDatosDeDeporte(x: unknown): string[] {
  const p: string[] = [];
  if (!esObjeto(x)) return ['Los datos del deporte no son un objeto'];
  if (typeof x.id !== 'string' || !x.id) p.push('Falta el «id» del deporte');
  if (!esObjeto(x.paises) || !Object.keys(x.paises).length) return [...p, 'Faltan los «paises» del deporte'];
  if (!('espana' in x.paises)) p.push('Faltan los datos de «espana» (son los de respaldo de los países que el deporte aún no trae)');
  for (const [pais, d] of Object.entries(x.paises)) {
    const en = `«paises.${pais}»`;
    if (!esObjeto(d)) {
      p.push(`${en} no es un objeto`);
      continue;
    }
    const cats = d.categorias;
    if (!Array.isArray(cats) || !cats.length) p.push(`${en}: faltan las «categorias»`);
    else {
      let esperada = -1;
      for (const c of cats as Partial<CategoriaDef>[]) {
        if (typeof c.id !== 'string' || typeof c.nombre !== 'string' || typeof c.edadMin !== 'number' || typeof c.edadMax !== 'number' || c.edadMax < c.edadMin) p.push(`${en}: categoría mal formada`);
        else if (esperada >= 0 && c.edadMin !== esperada) p.push(`${en}: las categorías no tienen edades seguidas (tras la ${esperada - 1} viene la ${c.edadMin})`);
        esperada = (c.edadMax ?? 0) + 1;
      }
    }
    const t = d.temporada;
    if (!esObjeto(t) || !esEntero(t.semanasDePretemporada) || !esEntero(t.semifinalAntesDelFinal) || !esEntero(t.finalAntesDelFinal)) p.push(`${en}: la «temporada» tiene que traer semanasDePretemporada, semifinalAntesDelFinal y finalAntesDelFinal (enteros)`);
    else if (t.finalAntesDelFinal >= t.semifinalAntesDelFinal) p.push(`${en}: la final tiene que ser después de las semifinales (finalAntesDelFinal menor que semifinalAntesDelFinal)`);
    const c = d.competiciones;
    if (!esObjeto(c) || ['federacion', 'campeonato'].some((k) => typeof c[k] !== 'string' || !c[k])) p.push(`${en}: las «competiciones» tienen que traer federacion y campeonato`);
    else {
      const j = c.jornada;
      if (!esObjeto(j) || !Array.isArray(j.dias) || !j.dias.length || j.dias.some((x) => !Number.isInteger(x) || (x as number) < 0 || (x as number) > 6) || typeof j.desde !== 'number' || typeof j.hasta !== 'number' || j.hasta <= j.desde || typeof j.lugar !== 'string' || typeof j.texto !== 'string') {
        p.push(`${en}: la «jornada» de las competiciones tiene que traer dias (0 a 6), desde, hasta (horas), lugar y texto`);
      }
    }
    const pob = d.poblacion;
    if (!esObjeto(pob)) p.push(`${en}: falta la «poblacion»`);
    else {
      const r = pob.reclutamiento;
      const e = pob.entrenadores;
      if (typeof pob.etiqueta !== 'string' || !pob.etiqueta || typeof pob.descripcionDeRival !== 'string' || typeof pob.descripcionDelEquipo !== 'string') p.push(`${en}: la «poblacion» necesita etiqueta, descripcionDeRival y descripcionDelEquipo`);
      if (!Array.isArray(pob.capacidades) || !pob.capacidades.length || pob.capacidades.some((c) => typeof c !== 'string')) p.push(`${en}: la «poblacion» necesita sus capacidades (ids de stats)`);
      if (typeof pob.aptitud !== 'number' || pob.aptitud < 0 || pob.aptitud >= 1) p.push(`${en}: la «poblacion.aptitud» tiene que estar entre 0 y 1`);
      if (!esObjeto(r) || !esObjeto(r.edades) || !esEntero(r.edades.min) || !esEntero(r.edades.max) || r.edades.max < r.edades.min || !esEntero(r.edadMaxBaja) || typeof r.probabilidadBaja !== 'number') {
        p.push(`${en}: el «reclutamiento» de la población necesita edades (min y max), edadMaxBaja y probabilidadBaja`);
      }
      if (!Array.isArray(pob.equipos) || !pob.equipos.length) p.push(`${en}: la «poblacion» necesita sus equipos`);
      else {
        const ids = new Set<string>();
        for (const q of pob.equipos as Partial<EquipoDeDeporte>[]) {
          if (typeof q.club !== 'string' || !q.club || !esObjeto(q.plantilla) || !esEntero(q.plantilla.min) || !esEntero(q.plantilla.max) || q.plantilla.max < q.plantilla.min || q.plantilla.max < 1) p.push(`${en}: equipo mal formado (${JSON.stringify(q)?.slice(0, 60)}): necesita club y plantilla (min y max)`);
          else if (ids.has(q.club)) p.push(`${en}: el equipo «${q.club}» está repetido`);
          else ids.add(q.club);
        }
      }
      if (!esObjeto(e) || !Array.isArray(e.deFuera) || typeof e.dedicacion !== 'string' || typeof e.descripcionDelColegio !== 'string') p.push(`${en}: los «entrenadores» de la población necesitan descripcionDelColegio, dedicacion y deFuera`);
    }
    const s = d.sedes;
    if (!esObjeto(s) || typeof s.colegio !== 'string' || typeof s.fuera !== 'string') p.push(`${en}: las «sedes» tienen que traer colegio y fuera`);
    const clubes = d.clubes;
    if (!Array.isArray(clubes) || !clubes.length) p.push(`${en}: faltan los «clubes»`);
    else {
      const ids = new Set<string>();
      for (const k of clubes as Partial<ClubDeDeporte>[]) {
        const mal = typeof k.id !== 'string' || typeof k.nombre !== 'string' || ![1, 2, 3].includes(k.calidad as number) || typeof k.sede !== 'string' || typeof k.tramites !== 'string' || !esObjeto(k.sesiones) || !Array.isArray(k.sesiones.weekdays) || typeof k.sesiones.desde !== 'number' || typeof k.sesiones.hasta !== 'number' || k.sesiones.hasta <= k.sesiones.desde || (k.acceso !== undefined && (typeof k.acceso.nivel !== 'number' || typeof k.acceso.edadMin !== 'number'));
        if (mal) p.push(`${en}: club mal formado (${JSON.stringify(k)?.slice(0, 60)})`);
        else if (ids.has(k.id!)) p.push(`${en}: el club «${k.id}» está repetido`);
        else ids.add(k.id!);
      }
    }
  }
  return p;
}
