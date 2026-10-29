import type { CalendarioPais } from '../calendar';
import type { CategoriaDef } from '../categories';
import type { Cultura } from '../culturas/tipos';
import type { HorarioDeLugar } from '../lugares';
import type { OrigenDef } from '../rasgos';
import type { CursoDef } from './curriculo';

/**
 * PAQUETE DE PAÍS: todo lo que cambia al cambiar de país, como DATO (JSON serializable, así se puede importar de un archivo). Un país se elige al
 * crear la partida y se guarda con ella; lo que un paquete no trae lo pone el de España. Los paquetes nuevos nacen como copia del de España con el
 * nombre del país (`copiaDeEspana`) y se van cambiando: calendario, currículo, categorías deportivas, horarios, y quiénes viven allí (demografía,
 * nombres y apellidos).
 */
export interface PaisDef {
  id: string;
  nombre: string;

  // ---- escuela y deporte
  /** Calendario escolar (semanas del curso, vacaciones, evaluaciones). */
  calendario: CalendarioPais;
  /** Cursos, del primero que se juega (8 años) al último. */
  cursos: readonly CursoDef[];
  /** Curso en que se elige modalidad (el bachillerato español). */
  cursoDeModalidad: number;
  /** Categorías por edad de cada deporte (clave: id del deporte, p. ej. `atletismo`). */
  categorias: Readonly<Record<string, readonly CategoriaDef[]>>;
  /** Horarios de apertura de los lugares, por id de lugar (lo que no esté, no cambia). */
  horarios: Readonly<Record<string, HorarioDeLugar>>;

  // ---- quiénes viven allí
  /** Peso de cada origen familiar entre la gente del país (id de origen → peso). */
  demografia: Readonly<Record<string, number>>;
  /** Orígenes que son «de aquí»: de ellos sale el nombre «local» de las mezclas sin origen local. */
  origenesLocales: readonly string[];
  /** Apellidos de los nacidos aquí: dos (el del padre y el de la madre) o uno. */
  apellidosDeLosNacidosAqui: 1 | 2;
  /** Orígenes que el paquete añade al catálogo (con su aspecto y su reserva de nombres). */
  origenes?: readonly OrigenDef[];
  /** Reservas de nombres que el paquete añade o sustituye (id de reserva → culturas). */
  reservasDeNombres?: Readonly<Record<string, readonly Cultura[]>>;
}

/** Lo que las reglas de nombres necesitan de un país. */
export type PaisDeNombres = Pick<PaisDef, 'id' | 'nombre' | 'origenesLocales' | 'apellidosDeLosNacidosAqui' | 'demografia'>;
