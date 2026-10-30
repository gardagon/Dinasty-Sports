import { CALENDARIO_ESPANA } from '../calendar';
import { HORARIOS_DE_ESPANA } from '../lugares';
import { ORIGENES } from '../rasgos';
import { CURSOS_ESPANA, CURSO_DE_MODALIDAD_ESPANA } from './curriculo';
import type { PaisDef } from './tipos';

/** España: el paquete de partida. Es la copia de la que nacen los demás (`copiaDeEspana`). */
export const PAIS_ESPANA: PaisDef = {
  id: 'espana',
  nombre: 'España',
  calendario: CALENDARIO_ESPANA,
  cursos: CURSOS_ESPANA,
  cursoDeModalidad: CURSO_DE_MODALIDAD_ESPANA,
  horarios: HORARIOS_DE_ESPANA,
  demografia: Object.fromEntries(ORIGENES.map((o) => [o.id, o.frecuencia])),
  origenesLocales: ['espana_norte', 'espana_centro', 'espana_sur'],
  apellidosDeLosNacidosAqui: 2,
};

/**
 * Un paquete nuevo como copia de España con otro nombre: para que, al tener los datos de un país, solo haya que cambiarlos aquí. Lo que se cambie
 * (`cambios`) sustituye a lo de España; el calendario lleva el id y el nombre del país.
 */
export function copiaDeEspana(id: string, nombre: string, cambios: Partial<Omit<PaisDef, 'id' | 'nombre'>> = {}): PaisDef {
  const copia = structuredClone({ ...PAIS_ESPANA, id, nombre }) as PaisDef;
  return { ...copia, calendario: { ...copia.calendario, id, nombre }, ...cambios };
}
