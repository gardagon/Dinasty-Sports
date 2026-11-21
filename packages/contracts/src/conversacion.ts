/**
 * LA CONVERSACIÓN: lo que se puede pedir o proponer a alguien desde su ficha con un desplegable («Pedir jugar…» a tu entrenador). Cada módulo que tenga algo así publica un
 * servicio `conversacion.<id>` (`ConversacionService`) y la interfaz dibuja todos los de la persona sin saber de qué trata cada uno (igual que «Proponer quedar para…»).
 * La acción que lanza cada opción es `prefijoDeAccion` + el valor elegido; la resuelve el módulo (`resolverAccion`).
 */
export const PREFIJO_DE_CONVERSACION = 'conversacion.';
export const servicioDeConversacion = (modulo: string): string => `${PREFIJO_DE_CONVERSACION}${modulo}`;

export interface PeticionDeConversacion {
  /** Único dentro de su servicio. */
  id: string;
  /** El texto del botón que la abre: «Pedir jugar…». */
  nombre: string;
  /** Lo que se explica bajo el desplegable. */
  descripcion?: string;
  /** Lo que se elige en el desplegable («Puesto»). */
  etiqueta: string;
  /** El desplegable: `valor` va al final del id de la acción. */
  opciones: readonly { valor: string; texto: string }[];
  /** La opción preseleccionada (por ejemplo, la mejor), si hay una. */
  sugerida?: string;
  /** El texto del botón que la lanza (con el nombre de lo elegido: `{opcion}`). */
  boton: string;
  minutos: number;
  prefijoDeAccion: string;
  /** Si ahora no se puede, por qué (se enseña en gris). */
  motivo?: string;
}

export interface ConversacionService {
  /** Lo que se le puede pedir a esta persona ahora (vacío si no aplica). */
  peticiones(npcId: string): PeticionDeConversacion[];
}
