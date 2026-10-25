/**
 * Vocabulario común de etiquetas de acción. No es obligatorio limitarse a estas,
 * pero usarlas hace que los modificadores de otros módulos se apliquen solos.
 */
export const TAGS = {
  fisico: 'fisico',
  /** Trabajo de fuerza (gimnasio): forma el músculo. */
  fuerza: 'fuerza',
  /** Trabajo aeróbico (rodajes, carreras): gasta grasa. */
  cardio: 'cardio',
  mental: 'mental',
  social: 'social',
  estudio: 'estudio',
  entrenamiento: 'entrenamiento',
  competicion: 'competicion',
  ocio: 'ocio',
  descanso: 'descanso',
  /** Sesión de entrenamiento con un club (con entrenador y grupo). */
  club: 'club',
} as const;

/** Stats genéricas y de estado que aporta el módulo `gen`. Otros módulos las referencian por id. */
export const GEN = {
  // Físicos
  velocidad: 'gen.velocidad',
  fuerza: 'gen.fuerza',
  resistencia: 'gen.resistencia',
  constitucion: 'gen.constitucion',
  agilidad: 'gen.agilidad',
  coordinacion: 'gen.coordinacion',
  // Mentales
  inteligencia: 'gen.inteligencia',
  concentracion: 'gen.concentracion',
  determinacion: 'gen.determinacion',
  resiliencia: 'gen.resiliencia',
  atencion: 'gen.atencion',
  creatividad: 'gen.creatividad',
  // Sociales (`cooperacion` es provisional hasta cerrar el diseño de los deportes de equipo)
  carisma: 'gen.carisma',
  comunicacion: 'gen.comunicacion',
  autoridad: 'gen.autoridad',
  empatia: 'gen.empatia',
  picardia: 'gen.picardia',
  cooperacion: 'gen.cooperacion',
  // Estado
  /** Desarrollo físico por la edad (0..100, oculto): limita el techo de lo físico. */
  madurez: 'gen.madurez',
  /** Fracción del tope genético alcanzable por edad (0..100, oculto), una por categoría. Ver `CURVAS_POR_EDAD`. */
  vigorFisico: 'gen.vigor_fisico',
  vigorTecnico: 'gen.vigor_tecnico',
  vigorMental: 'gen.vigor_mental',
  vigorSocial: 'gen.vigor_social',
  energia: 'gen.energia',
  dinero: 'gen.dinero',
  salud: 'gen.salud',
  estres: 'gen.estres',
  motivacion: 'gen.motivacion',
} as const;
