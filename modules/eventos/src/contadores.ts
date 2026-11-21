import { contador } from '@ds/contracts';

/** Cuentas que el director lleva solo y que usan varios eventos. */
export default [
  /** Sesiones de fondo: acciones de media hora o más con la etiqueta `cardio`. */
  contador({ id: 'eventos.cuenta.fondo', cuenta: { accion: { tags: ['cardio'], minutosMin: 30 } } }),
  /** Entrenamientos de cualquier deporte. */
  contador({ id: 'eventos.cuenta.entrenamientos', cuenta: { accion: { tags: ['entrenamiento'] } } }),
  /** Acciones físicas (entrenar, gimnasio, competir). */
  contador({ id: 'eventos.cuenta.fisico', cuenta: { accion: { tags: ['fisico'] } } }),
  /** Competiciones disputadas (de cualquier deporte). */
  contador({ id: 'eventos.cuenta.competiciones', cuenta: { señal: 'competicion.resultado' } }),
];
