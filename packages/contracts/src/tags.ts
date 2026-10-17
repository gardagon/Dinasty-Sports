/**
 * Vocabulario común de etiquetas de acción. No es obligatorio limitarse a estas,
 * pero usarlas hace que los modificadores de otros módulos se apliquen solos.
 */
export const TAGS = {
  fisico: 'fisico',
  mental: 'mental',
  social: 'social',
  estudio: 'estudio',
  entrenamiento: 'entrenamiento',
  competicion: 'competicion',
  ocio: 'ocio',
  descanso: 'descanso',
} as const;

/** Stats genéricas y de estado que aporta el módulo `gen`. Otros módulos las referencian por id. */
export const GEN = {
  fuerza: 'gen.fuerza',
  resistencia: 'gen.resistencia',
  velocidad: 'gen.velocidad',
  coordinacion: 'gen.coordinacion',
  concentracion: 'gen.concentracion',
  memoria: 'gen.memoria',
  disciplina: 'gen.disciplina',
  carisma: 'gen.carisma',
  trabajoEquipo: 'gen.trabajo_equipo',
  energia: 'gen.energia',
  salud: 'gen.salud',
  estres: 'gen.estres',
  motivacion: 'gen.motivacion',
} as const;
