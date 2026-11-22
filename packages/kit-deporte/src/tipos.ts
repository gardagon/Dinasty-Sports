import type { ActionDef, ReadContext, StatId } from '@ds/contracts';

/**
 * Lo que un deporte le dice al kit de sí mismo. Con esto el kit monta las piezas comunes (club, entrenador, categorías,
 * verano, tele, sobrecarga, conocimiento) con los ids, los textos y los sitios de ese deporte.
 */
export interface ConfigDeporte {
  /** Id del módulo y del deporte (prefijo de sus stats y acciones), p. ej. `atletismo`. */
  id: string;
  /** Nombre en minúscula para los textos: «el club de atletismo», «Entrenar atletismo». */
  nombre: string;
  /** Rendimiento 0..100 del personaje en este deporte (para las pruebas de acceso a los clubes). */
  rendimiento: (ctx: ReadContext) => number;
  /** Lo que vale el personaje en cada puesto del deporte (id → 0 a 100), si tiene puestos: con ello se mide su plaza en un equipo por puesto. */
  puestos?: (ctx: ReadContext) => Record<string, number>;
  /** Los puestos del deporte (id y nombre): el personaje elige en cuál quiere jugar al hacer una prueba de acceso. */
  puestosDelDeporte?: readonly { id: string; nombre: string }[];
  /** Pedirle a tu entrenador jugar en otro puesto (desde su ficha): lo que se puede editar. Sin él, los valores de `PEDIR_PUESTO`. */
  pedirPuesto?: ConfigDePedirPuesto;
  /** Acciones de entrenar por libre: rinden menos y no se pueden hacer durante la sesión del club. */
  entrenosLibres: readonly string[];
  /**
   * Los entrenamientos que el entrenador puede recomendar por su nombre (`recomendarEntrenamiento`): cada uno con lo que sube. Se leen de los **datos** de los entrenamientos (las acciones del deporte, no de un
   * desplegable fijo), así que un entrenamiento nuevo entra en la recomendación en cuanto está en la lista. Sin él, el entrenador no recomienda por nombre.
   */
  catalogoDeEntrenos?: (ctx: ReadContext) => readonly EntrenoRecomendable[];
  /** Lo que sube una semana de juego informal («practicar con los amigos»): el primer día se aplica tantas semanas como diga el interés del personaje por el deporte. */
  juegoInformal?: readonly Entreno[number][];
}

/**
 * Cómo se lleva pedir puesto al entrenador. Hay dos formas de no preguntar todo el rato, y se pueden combinar: una **espera** (no se puede volver a pedir hasta pasados `esperaDias`)
 * y un **mal rato** (si se pide pasados menos de `enfadoSiPocoTiempo.dias`, el entrenador se lo toma mal y baja la relación `afinidad` puntos, además de la tirada).
 */
export interface ConfigDePedirPuesto {
  /** Días de espera entre dos peticiones (0 = sin espera). */
  esperaDias?: number;
  /** `false` para no poner mal rato. */
  enfadoSiPocoTiempo?: false | { dias: number; afinidad: number };
}

/** Valores de partida de `ConfigDePedirPuesto` (PROVISIONALES: a revisar con el usuario). */
export const PEDIR_PUESTO = { esperaDias: 0, enfadoSiPocoTiempo: { dias: 28, afinidad: -3 } } as const;

/** Lo que entrena una acción (el mismo formato que `ActionDef.train`). */
export type Entreno = NonNullable<ActionDef['train']>;

/** Un entrenamiento que el entrenador puede recomendar: cómo se llama y lo que sube (el mismo formato que `ActionDef.train`). */
export interface EntrenoRecomendable {
  id: string;
  nombre: string;
  entrena: Entreno;
  /** Solo se hace en la sesión del club (hace falta compañía): el entrenador lo recomienda como cosa de la sesión, no «por tu cuenta». */
  soloClub?: boolean;
}

/** Una habilidad que sube un poco con un consejo del entrenador y cómo se nombra en el texto («tu técnica»). */
export interface HabilidadDeConsejo {
  stat: StatId;
  nombre: string;
}

/**
 * Campos del estado de un deporte que usan las piezas del kit. El estado sigue siendo del módulo del deporte (regla 5):
 * el kit lo lee y lo escribe con el contexto de ese módulo. Un deporte declara su estado extendiendo este.
 */
export interface EstadoBaseDeDeporte {
  /** Sesiones de entrenamiento hechas hoy (para la sobrecarga). */
  sesionesHoy: { day: number; n: number };
  /** Último día que vio el deporte en la tele (una vez al día). */
  ultimaTele?: number;
  /** ¿Ya se ha sumado el conocimiento de partida por lo que practicaron los padres? Se hace el primer día. */
  herenciaAplicada?: boolean;
  /** Último día que pidió consejo a su entrenador (una vez al día). */
  ultimoConsejo?: number;
  /** Último día que le preguntó a su entrenador por un puesto (una vez al día). */
  ultimaPreguntaDePuesto?: number;
  /** ¿Compite en la categoría superior a la que le toca por edad? */
  categoriaSuperior?: boolean;
  /** Categoría que le tocaba por edad la última vez (para saber cuándo cambia). */
  categoriaPropia?: string;
  /** Último día que fue a una sesión de su club (una al día). */
  ultimaSesionClub?: number;
  /** Última semana en que hizo la prueba de acceso de cada club (para no repetirla enseguida). */
  pruebas?: Record<string, number>;
  /** Plazas ofrecidas por clubes de fuera tras pasar su prueba: semana en que se ofreció (valen unas semanas). */
  ofertas?: Record<string, number>;
  /** En los deportes con puestos, el puesto y lo que valió la prueba de cada plaza ofrecida (con ello se entra al aceptarla). Si el entrenador propuso otro puesto, es el propuesto. */
  plazasOfrecidas?: Record<string, { puesto: string; valores: Record<string, number> }>;
  /** Pruebas de acceso pedidas (club → semana en que se pidieron): con ello se puede unir al entrenamiento de prueba. */
  pruebaPedida?: Record<string, number>;
  /** La prueba de acceso en marcha: el club y el puesto en que le prueban (el que eligió entre los huecos; sin él, el que decida el entrenador). */
  pruebaEnCurso?: { club: string; puesto?: string };
  /** El puesto que pidió en la prueba de acceso (para que el entrenador lo recuerde en el primer entrenamiento). Se borra al entrar en un club sin prueba. */
  puestoPedido?: string;
  /** Último día que le pidió a su entrenador jugar en otro puesto (`pedirPuesto`). */
  ultimaPeticionDePuesto?: number;
  /** El puesto que su entrenador le propone al empezar el curso (sobran en el suyo y faltan en otro): decide él (`aceptar_cambio_de_puesto`). */
  propuestaDePuesto?: string;
  /** El puesto del personaje en su equipo (el que le ofreció el club al entrar), en los deportes con puestos. */
  puesto?: string;
  /** Semana (absoluta) hasta la que no puede entrar en otro club de este deporte: la del siguiente plazo de fichajes, si dejó su club fuera de plazo. */
  sinFichajesHasta?: number;
  /** Último día que fue al campamento o practicó con los amigos en verano (uno al día). */
  ultimoVerano?: number;
}
