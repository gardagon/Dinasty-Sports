import type { LogEntry } from '../context';
import type { CambioDeEstadoDeJugador } from '../events';
import type { EstadoVinculo } from '../relaciones';

/**
 * SUCESOS: lo que le pasa a una persona y lo que decide (el «evento» que ve el jugador; en el código se llama suceso porque «evento» ya es
 * el aviso entre módulos). Un suceso es un DATO: cuándo puede salir, quién participa, qué se lee, qué se puede elegir y qué deja.
 * Aquí no hay funciones: lo que se escribe en un archivo de sucesos es JSON puro. Diseño y decisiones: `docs/PLAN_EVENTOS.md`.
 */

export interface Rango {
  min?: number;
  max?: number;
}

export type PeriodoDelCurso = 'clase' | 'navidad' | 'semana_santa' | 'verano';

/** Comparación de un valor: entre `min` y `max`, igual a `es` o, si es una lista, que incluya `incluye`. Con `sobreRecuerdo` se compara lo que ha cambiado desde lo que se guardó en ese recuerdo. */
export interface Comparacion extends Rango {
  es?: string | number | boolean;
  incluye?: string | number;
  sobreRecuerdo?: string;
}

/**
 * Una condición mira un HECHO. En una lista deben cumplirse todas. Los nombres de persona (`presente`, `relacion`, `familia`, `de`) son papeles del reparto.
 * `hecho` lee un número o un texto por su nombre: los del propio juego (`HECHOS_COMUNES`) o los de un módulo (`<módulo>.<nombre>`, servicio `hechos.<módulo>`).
 */
export type Condicion =
  | ({ stat: string } & Rango)
  | ({ hecho: string } & Comparacion)
  | { periodo: PeriodoDelCurso | readonly PeriodoDelCurso[] }
  | { diaDeLaSemana: readonly number[] }
  | { hora: { desde?: number; hasta?: number } }
  | { lugar: string | readonly string[] }
  | { presente: string }
  | { papel: string }
  | { relacion: string; afinidad?: Rango; confianza?: Rango; estado?: EstadoVinculo | readonly EstadoVinculo[] }
  | { familia: string; apoyo?: Rango; expectativas?: Rango }
  | { perk: string; revelado?: boolean }
  | ({ caracter: string } & Rango)
  | { enClub: boolean; deporte?: string }
  | { marca: string; de?: string }
  | ({ contador: string } & Rango)
  | ({ recuerdo: string } & Comparacion)
  | ({ señal: string } & Comparacion)
  | { no: Condicion }
  | { alguna: readonly Condicion[] }
  | { todas: readonly Condicion[] };

/** Hechos con nombre que el juego ofrece sin que nadie los publique (el director los lee de los servicios de contracts). */
export const HECHOS_COMUNES = ['edad', 'altura_cm', 'altura_para_su_edad', 'nota_media', 'faltas', 'faltas_del_trimestre', 'trimestre', 'curso', 'dia'] as const;

export type Dias = number | readonly [number, number];

/** Para cuándo se programa un suceso: dentro de unos días (fijos o entre dos, con azar estable), al empezar el próximo periodo o el día del cumpleaños de alguien del reparto. */
export type Cuando = { dias: Dias } | { proximo: PeriodoDelCurso } | { elCumpleDe: string };

/** Lo que deja un suceso. Unos efectos los aplica el director (memoria, estado, entrenar) y otros los pide al módulo dueño con una señal compartida. */
export type Efecto =
  | { estado: string; mas: number }
  /** El estado de juego (moral, forma, condición, salud, baja) de quien vive el suceso o, con `de`, de alguien del reparto. Vale para el personaje y para cualquier persona. */
  | { estadoDeJugador: CambioDeEstadoDeJugador; de?: string }
  | { entrena: string; cantidad: number }
  | { relacion: string; afinidad?: number; confianza?: number }
  | { familia: string; apoyo?: number; expectativas?: number }
  | { caracter: Readonly<Record<string, number>> }
  | { revelaPerk: string }
  | { presenta: string }
  | { emite: string; datos?: unknown }
  | { diario: string; tipo?: LogEntry['kind'] }
  | { marca: string; de?: string; dura?: { dias: number }; valor?: number }
  | { quitaMarca: string; de?: string }
  | { recuerda: Readonly<Record<string, string | number>> }
  | { programa: string; en: Cuando }
  | { modificador: { tags: readonly string[]; eficiencia?: number; coste?: number; duracion?: number; dias: number; motivo: string } }
  | { restriccion: { tags: readonly string[]; dias: number; motivo: string } }
  | { si: readonly Condicion[]; entonces: readonly Efecto[]; sino?: readonly Efecto[] }
  | { fin: true };

/** Lo que pasa al elegir una opción (o en cada rama de su tirada). */
export interface RamaDef {
  efectos?: readonly Efecto[];
  /** Lo que se lee después de elegir. */
  resultado?: string;
}

export interface TiradaDef {
  /** Stat con la que se tira (se mide «para su edad», como `norm`). */
  con: string;
  /** 0 a 100: con la stat a ese nivel hay un 50 % de éxito (`probabilidadDeExito`). */
  dificultad: number;
}

export interface OpcionDef extends RamaDef {
  id: string;
  texto: string;
  /** Si no se cumplen, la opción sale en gris con el motivo (o no sale, con `oculta`). */
  requiere?: readonly Condicion[];
  oculta?: boolean;
  /** Hacia qué ejes de carácter tira esta opción: mueve los del personaje al elegirla, y es con lo que deciden un PNJ o un bot. */
  caracter?: Readonly<Record<string, number>>;
  /** Minutos de juego que gasta elegirla (por defecto, 1). */
  minutos?: number;
  /** Pista a mano de lo que puede pasar (si falta, se compone sola con los efectos). */
  pista?: string;
  tirada?: TiradaDef;
  exito?: RamaDef;
  fallo?: RamaDef;
}

/**
 * Una decisión: un texto y sus opciones. Es una pieza suelta a propósito: un suceso la lleva dentro, y un deporte puede presentar una
 * en mitad de una competición con las mismas opciones, requisitos, tiradas y presentación (`evaluarOpcion`, `probabilidadDeExito`).
 */
export interface DecisionDef {
  titulo?: string;
  texto?: string;
  opciones?: readonly OpcionDef[];
}

export type Disparo =
  | { al: string }
  | { cada: 'dia' | 'semana'; prob: number }
  | { umbral: readonly Condicion[] }
  | { programado: true };

export type Repite = 'nunca' | 'una_vez_por_curso' | 'siempre' | { espera: { dias: number }; porReparto?: boolean };

/** A quién le toca un papel. Los filtros se suman; si hay varios candidatos se elige con el azar estable del suceso (o con `prefiere`). */
export interface PapelDef {
  /** `progenitor`, `hermano`… (etiqueta de la persona) o un rol (`entrenador`, `profesor`, `amigo`…). */
  tipo?: string;
  rol?: string;
  relacion?: { afinidad?: Rango; confianza?: Rango; estado?: EstadoVinculo | readonly EstadoVinculo[] };
  presente?: boolean;
  conocido?: boolean;
  edad?: Rango;
  delDeportePrincipal?: boolean;
  /** Cumple años dentro de estos días exactos. */
  cumpleEn?: { dias: number };
  /** Alguien de la lista `participants` (o la que se diga) de la señal que disparó el suceso. */
  deLaSeñal?: string;
  donde?: Readonly<Record<string, string | number | boolean>>;
  prefiere?: 'mas_afinidad' | 'mas_expectativas' | 'mas_apoyo';
  /** Si no hay nadie, el suceso sale igual (sus textos necesitan una variante sin este papel). */
  opcional?: boolean;
}

export interface VarianteDef extends DecisionDef {
  id: string;
  /** Gana la primera variante cuyas condiciones se cumplen (una lista vacía se cumple siempre). */
  si: readonly Condicion[];
  efectos?: readonly Efecto[];
}

export interface PlazoDef {
  dias?: number;
  /** Hasta esta hora del mismo día (minuto del día). */
  hasta?: { hora: number };
  /** Opción que se aplica si vence sin que nadie elija. */
  porDefecto: string;
}

export interface SucesoDef extends DecisionDef {
  /** `<módulo que lo aporta>.<nombre>` */
  id: string;
  titulo: string;
  /** Los `menor` son detalles ligeros que hacen distinto un día de otro: tienen su propio cupo y no compiten con los importantes. */
  categoria?: 'importante' | 'menor';
  /**
   * Deporte que lo trae (el id de su módulo): lo hace un «evento deportivo», que llega al instalar el deporte y se va al quitarlo. Sin él es un
   * «evento base» del juego. En un hilo se dice una vez, en el hilo.
   */
  deporte?: string;
  /**
   * A quién puede pasarle: solo al personaje (depende de lo que solo él tiene) o a cualquier persona. Los de `cualquiera` solo usan efectos que valen
   * para todos (estado de juego, marcas, programar…) y, cuando le pasan a un PNJ, este decide solo, por su carácter. Su protagonista es el papel `sujeto`.
   */
  para?: 'personaje' | 'cualquiera';
  /** Quién lo vive cuando lo dispara una señal: el id de persona que viene en ese dato de la señal (`{ deLaSeñal: 'npcId' }`). Sin él, el personaje. */
  sujeto?: { deLaSeñal: string };
  /** Lo que se entera el personaje cuando le pasa a alguien con quien tiene relación (una línea del diario; `{sujeto.nombre}` es a quien le pasa). */
  textoDeCercano?: string;
  /** Clase de suceso (`lesion`…): con ella se activan o no los sucesos de los PNJ (`ConfigDeSucesos.pnj.clases`). */
  clase?: string;
  disparo: Disparo;
  /** El momento adecuado: todas deben cumplirse. */
  cuando?: readonly Condicion[];
  /** Si salta (por una señal o programado) y no es el momento, cuántos días espera antes de perderse. */
  aguanta?: { dias: number };
  /** Opción que se aplica si se pierde sin haber salido. */
  siSePierde?: string;
  repite?: Repite;
  /** Peso frente a otros sucesos que compiten por el cupo (1 por defecto). */
  peso?: number;
  reparto?: Readonly<Record<string, PapelDef>>;
  /** Módulos sin los que este suceso no existe. */
  requiere?: readonly string[];
  variantes?: readonly VarianteDef[];
  /** Lo que deja un suceso sin opciones (o antes de elegir). */
  efectos?: readonly Efecto[];
  /** `ahora`: sale en una ventana tras la acción. `pendiente`: va a la lista, con su plazo. */
  urgencia?: 'ahora' | 'pendiente';
  plazo?: PlazoDef;
  /** Un suceso sin opciones puede salir como ventana o como una línea del resultado y del diario. */
  presentacion?: 'ventana' | 'linea';
  /** Si se dispara con una señal: unos datos de ejemplo de esa señal, para probarlo y enseñarlo sin esperar a que pase (obligatorio si sus textos usan `{señal.…}`). */
  ejemploDeSeñal?: Readonly<Record<string, unknown>>;
  /** Pruebas escritas como datos por quien lo diseña. */
  pruebas?: readonly PruebaDef[];
}

/** Una cuenta que el director lleva sola: cada vez que pasa una señal o se hace una acción con ciertas etiquetas. */
export interface ContadorDef {
  id: string;
  cuenta: { accion: { tags: readonly string[]; minutosMin?: number } } | { señal: string };
}

export interface HiloDef {
  id: string;
  nombre: string;
  /** Deporte que trae el hilo entero (ver `SucesoDef.deporte`). */
  deporte?: string;
  requiere?: readonly string[];
  /** Reparto común a todos sus sucesos: se elige al abrirse el hilo y se guarda. */
  reparto?: Readonly<Record<string, PapelDef>>;
  /** Cuántas veces puede estar abierto a la vez. */
  instancias?: 'una' | 'una_por_reparto';
  sucesos: readonly SucesoDef[];
  contadores?: readonly ContadorDef[];
  escenarios?: readonly EscenarioDef[];
}

/** Lo que se fija en una prueba sin tener que jugar hasta llegar ahí. */
export interface HechosDePrueba {
  stats?: Readonly<Record<string, number>>;
  hechos?: Readonly<Record<string, number | string | boolean>>;
  lugar?: string;
  presente?: readonly string[];
  periodo?: PeriodoDelCurso;
  hora?: number;
  perks?: Readonly<Record<string, 'latente' | 'revelado'>>;
  caracter?: Readonly<Record<string, number>>;
  relacion?: Readonly<Record<string, { afinidad?: number; confianza?: number; estado?: EstadoVinculo }>>;
  marcas?: readonly string[];
  contadores?: Readonly<Record<string, number>>;
  /** Papeles que se quedan sin nadie. */
  sinPapel?: readonly string[];
}

export interface EsperadoDePrueba {
  sale?: boolean;
  variante?: string;
  opcionDisponible?: string;
  opcionNoDisponible?: string;
  marca?: string;
  sinMarca?: string;
  programado?: string;
  hiloCerrado?: boolean;
}

export interface PruebaDef {
  nombre: string;
  dado?: HechosDePrueba;
  señal?: unknown;
  elige?: string;
  /** Con una tirada: qué rama se fuerza. */
  tirada?: 'exito' | 'fallo';
  espero: EsperadoDePrueba;
}

export type PasoDeEscenario =
  | { señal: string; datos?: unknown; dado?: HechosDePrueba }
  | { sale: string; variante?: string; elige?: string; tirada?: 'exito' | 'fallo' }
  | { pasan: { dias: number }; dado?: HechosDePrueba }
  | { espero: EsperadoDePrueba };

export interface EscenarioDef {
  nombre: string;
  dado?: HechosDePrueba;
  pasos: readonly PasoDeEscenario[];
}

/** Lo que un módulo aporta a `sucesos.catalogo`: sucesos sueltos, hilos y contadores. */
export type AporteDeSucesos = ({ tipo: 'suceso' } & SucesoDef) | ({ tipo: 'hilo' } & HiloDef) | ({ tipo: 'contador' } & ContadorDef);

export const APORTE_DE_SUCESOS = 'sucesos.catalogo';
/** Cambios a la configuración por defecto (`ConfigDeSucesos` parcial): quien quiera editar el cupo o la presentación los aporta aquí. */
export const APORTE_DE_CONFIG_DE_SUCESOS = 'sucesos.config';

/** Ayudas de tipado para escribir sucesos: no hacen nada más que marcar qué es cada cosa. */
export const suceso = (d: SucesoDef): AporteDeSucesos => ({ tipo: 'suceso', ...d });
export const hilo = (d: HiloDef): AporteDeSucesos => ({ tipo: 'hilo', ...d });
export const contador = (d: ContadorDef): AporteDeSucesos => ({ tipo: 'contador', ...d });

/** `base`: eventos del juego base. `deporte`: los que trae un deporte. `menor`: detalles ligeros, de cualquiera de los dos. */
export type CategoriaDeCupo = 'base' | 'deporte' | 'menor';
export type OrigenDeSuceso = 'base' | 'deporte';

export interface CupoDeSucesos {
  alDia: number;
  aLaSemana: number;
}

/**
 * Lo que se puede ajustar sin tocar código: cuántos sucesos espontáneos salen, cómo se presentan las opciones y qué sucesos viven los PNJ.
 * Es un dato (decisión del usuario del 16/11): los valores de partida están en `CONFIG_DE_SUCESOS` y se cambian con el aporte `sucesos.config`.
 */
export interface ConfigDeSucesos {
  /**
   * Sucesos que salen por probabilidad (`cada`); los que son consecuencia de algo (una señal, uno programado) no gastan cupo. Hay un cupo por
   * categoría y no compiten entre sí: los eventos base importantes, los deportivos importantes y los detalles ligeros (`menor`, sean de donde sean).
   */
  cupo: Record<CategoriaDeCupo, CupoDeSucesos>;
  presentacion: {
    /** Qué se ve de las consecuencias antes de elegir. */
    consecuencias: 'pistas' | 'numeros' | 'nada';
    /** Cómo salen las opciones que no encajan con el carácter del personaje: como las demás, sombreadas (se ven, no se pueden elegir y se dice por qué) u ocultas. */
    fueraDeCaracter: 'normales' | 'sombreadas' | 'ocultas';
    /** Una opción no encaja si tira al menos `inclinacionMinima` en contra de un eje que el personaje tiene marcado al menos `ejeMarcado` (de −50 a 50). */
    ejeMarcado: number;
    inclinacionMinima: number;
  };
  pnj: {
    /** Clases de suceso que viven también los PNJ. El resto, solo el personaje hasta medir lo que cuesta. */
    clases: readonly string[];
    /** Si lo que le pasa a alguien cercano sale en el diario del personaje. */
    diarioDeCercanos: boolean;
  };
  /** Puntos que se mueve un eje de carácter por cada punto de inclinación de la opción elegida. */
  caracterPorDecision: number;
}

export const CONFIG_DE_SUCESOS: ConfigDeSucesos = {
  cupo: { base: { alDia: 1, aLaSemana: 4 }, deporte: { alDia: 1, aLaSemana: 2 }, menor: { alDia: 2, aLaSemana: 8 } },
  presentacion: { consecuencias: 'pistas', fueraDeCaracter: 'normales', ejeMarcado: 25, inclinacionMinima: 2 },
  pnj: { clases: ['lesion'], diarioDeCercanos: false },
  caracterPorDecision: 1,
};

type Parcial<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? Parcial<T[K]> : T[K] };
export type CambiosDeConfigDeSucesos = Parcial<ConfigDeSucesos>;

/** La configuración con los cambios aportados encima, en orden (el último manda). */
export function configDeSucesos(cambios: readonly CambiosDeConfigDeSucesos[] = []): ConfigDeSucesos {
  const mezclar = (base: any, extra: any): any => {
    if (extra === undefined) return base;
    if (Array.isArray(extra) || typeof extra !== 'object' || extra === null) return extra;
    const out: any = { ...base };
    for (const k of Object.keys(extra)) out[k] = mezclar(base?.[k], extra[k]);
    return out;
  };
  return cambios.reduce<ConfigDeSucesos>((c, x) => mezclar(c, x), CONFIG_DE_SUCESOS);
}
