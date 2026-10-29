import type { ActionDef, CategoriaDef, ReadContext, StatId } from '@ds/contracts';

/**
 * Lo que un deporte le dice al kit de sí mismo. Con esto el kit monta las piezas comunes (club, entrenador, categorías,
 * verano, tele, sobrecarga, conocimiento) con los ids, los textos y los sitios de ese deporte.
 */
export interface ConfigDeporte {
  /** Id del módulo y del deporte (prefijo de sus stats y acciones), p. ej. `atletismo`. */
  id: string;
  /** Nombre en minúscula para los textos: «el club de atletismo», «Entrenar atletismo». */
  nombre: string;
  /** Categorías por edad de España: valen si el país de la partida no trae las suyas para este deporte. */
  categoriasEspana: readonly CategoriaDef[];
  /** Dónde entrena el club del personaje: la sede del club del colegio y la de los clubes de fuera. */
  sedes: { colegio: string; fuera: string };
  /** Cuándo y dónde se compite, para contarlo antes de apuntarse a un club (p. ej. «Carreras: los sábados de 9 a 13 en el estadio.»). */
  textoDeCompeticion: string;
  /** Rendimiento 0..100 del personaje en este deporte (para las pruebas de acceso a los clubes). */
  rendimiento: (ctx: ReadContext) => number;
  /** Acciones de entrenar por libre: rinden menos y no se pueden hacer durante la sesión del club. */
  entrenosLibres: readonly string[];
}

/** Lo que entrena una acción (el mismo formato que `ActionDef.train`). */
export type Entreno = NonNullable<ActionDef['train']>;

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
  /** Último día que fue al campamento o practicó con los amigos en verano (uno al día). */
  ultimoVerano?: number;
}
