import { tramoDeSemana, type CalendarioPais } from './calendar';
import type { CategoriaDef } from './categories';
import type { ReadContext } from './context';

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

/** Cómo se llama lo que organiza la federación (se pueden usar `{pais}` para el nombre del país de la partida). */
export interface CompeticionesDeDeporte {
  federacion: string;
  /** El campeonato nacional (la final), p. ej. «campeonato de {pais}». */
  campeonato: string;
}

/** Lo que un deporte pone de un país: sus categorías, su temporada y sus competiciones. */
export interface DatosDeDeportePais {
  categorias: readonly CategoriaDef[];
  temporada: TemporadaDeDeporte;
  competiciones: CompeticionesDeDeporte;
}

export interface DatosDeDeporte {
  id: string;
  /** Datos por id de país. **`espana` es obligatorio**: es el de respaldo de los países que el deporte aún no trae. */
  paises: Readonly<Record<string, DatosDeDeportePais>>;
}

/** Las fichas de los deportes cargados en la partida. */
export const fichasDeDeporte = (ctx: ReadContext): readonly FichaDeDeporte[] => ctx.aportes<FichaDeDeporte>(APORTES.fichaDeDeporte);

/**
 * Los datos de un deporte para el país de la partida; si el deporte no trae ese país, los de España (`deRespaldo`). Lanza un error si el deporte
 * no ha aportado sus datos.
 */
export function datosDeDeporte(ctx: ReadContext, deporte: string): DatosDeDeportePais & { deRespaldo: boolean } {
  const d = ctx.aportes<DatosDeDeporte>(APORTES.datosDeDeporte).find((x) => x.id === deporte);
  if (!d) throw new Error(`El deporte «${deporte}» no ha aportado sus datos (aporte «${APORTES.datosDeDeporte}»)`);
  const propios = d.paises[ctx.pais.id];
  return { ...(propios ?? d.paises.espana), deRespaldo: !propios };
}

/** Un texto de los datos de un deporte con el nombre del país de la partida donde pone `{pais}`. */
export const textoConPais = (texto: string, ctx: ReadContext): string => texto.replaceAll('{pais}', ctx.pais.nombre);

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
  }
  return p;
}
