/**
 * COMPARARSE CON ALGUIEN: lo que el personaje cree de sí mismo frente a otra persona, con lo que ha visto (no con el dato exacto del motor). Un módulo de deporte
 * publica un servicio `comparacion.<id>` (`ComparacionService`) y la ficha de Gente dibuja lo que diga de la persona sin saber de qué deporte es.
 */
export const PREFIJO_DE_COMPARACION = 'comparacion.';
export const servicioDeComparacion = (modulo: string): string => `${PREFIJO_DE_COMPARACION}${modulo}`;

export interface ComparacionView {
  /** Título del bloque («Comparado contigo»). */
  titulo: string;
  /** Lo que crees, con tus palabras («Crees que eres mejor que él.»), sin números. */
  texto: string;
}

export interface ComparacionService {
  /** Lo que el personaje cree de sí mismo frente a esta persona, o `undefined` si aún no la ha visto jugar. */
  sobre(npcId: string): ComparacionView | undefined;
}
