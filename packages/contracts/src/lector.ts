/**
 * EL LECTOR DE PERSONA (plan `docs/MISMAS_REGLAS.md` §6): lo único que necesita una fórmula de rendimiento para valer a alguien. El rendimiento de cada deporte (la
 * prueba de acceso a un club, una carrera, un partido) se escribe sobre este lector y no sobre el contexto del personaje, así que **se aplica igual al personaje y a
 * cualquier PNJ**. El contexto de lectura del motor (`ReadContext`) ya lo cumple; `npcs` da uno para cada niño.
 */
export interface LectorDePersona {
  /** El valor (0 a 100) de una stat de la persona: una capacidad (`gen.velocidad`), una habilidad de un deporte (`atletismo.tecnica`) o su conocimiento. */
  stat(id: string): number;
  /** El valor normalizado (0 a 1) de una stat: las capacidades, frente a lo típico de su edad. */
  norm(id: string): number;
}

/** Un deporte que sabe valer a una persona: el rendimiento (0 a 100) de quien se le pase. Lo aporta cada módulo de deporte (`APORTES.rendimiento`). */
export interface RendimientoDeDeporte {
  id: string;
  rendimiento: (persona: LectorDePersona) => number;
  /**
   * Lo que vale la persona **en cada puesto** del deporte (id del puesto → 0 a 100), con sus habilidades y lo que pesa cada una en cada puesto: lo dan los deportes de equipo con
   * puestos (el fútbol) y es lo que usan los clubes para la regla de plaza por puesto. Es el servicio con que los módulos se hablan sin importarse entre sí.
   */
  puestos?: (persona: LectorDePersona) => Record<string, number>;
}
