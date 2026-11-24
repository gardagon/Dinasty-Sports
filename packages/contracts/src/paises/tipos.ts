import type { CalendarioPais } from '../calendar';
import type { CiudadDef } from '../ciudad';
import type { Cultura } from '../culturas/tipos';
import type { HorarioDeLugar } from '../lugares';
import type { OrigenDef, ParejasDef } from '../rasgos';
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
  /**
   * Si el país es una **variante** de otro (el mismo país con otra ciudad: `conCiudad`), el id del país del que sale. Los datos que se resuelven por país
   * (los de cada deporte) se buscan primero por `id` y después por `base`, así que una variante usa los datos de su país sin que salga el aviso de
   * «datos de respaldo». Sin él, el país es él mismo.
   */
  base?: string;

  // ---- escuela y deporte
  /** Calendario escolar (semanas del curso, vacaciones, evaluaciones). */
  calendario: CalendarioPais;
  /** Cursos, del primero que se juega (8 años) al último. */
  cursos: readonly CursoDef[];
  /** Curso en que se elige modalidad (el bachillerato español). */
  cursoDeModalidad: number;
  /** Horarios de apertura de los lugares, por id de lugar (lo que no esté, no cambia). */
  horarios: Readonly<Record<string, HorarioDeLugar>>;

  // ---- quiénes viven allí
  /** La ciudad: cuántos colegios y clases tiene y cuánta gente vive en ella (si no, `CIUDAD_ACTUAL`). */
  ciudad?: CiudadDef;
  /** Peso de cada origen familiar entre la gente del país (id de origen → peso). */
  demografia: Readonly<Record<string, number>>;
  /** Cómo se emparejan los padres (tipos de pareja). Sin él, los dos padres se sortean por separado con la `demografia` (lo que hacen Argentina e Inglaterra). La ciudad puede traer el suyo. */
  parejas?: ParejasDef;
  /** Probabilidad (0 a 1) de que un nacido aquí (menos de 25 años) de padres de fuera lleve un nombre de pila del país: con un solo origen y en las mezclas sin origen local. Sin él, como siempre (ninguno con un solo origen; `PROBABILIDAD_DE_NOMBRE_LOCAL` en las mezclas). La ciudad puede traer el suyo. */
  nombreLocalDeLosNacidosAqui?: number;
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
export type PaisDeNombres = Pick<PaisDef, 'id' | 'nombre' | 'origenesLocales' | 'apellidosDeLosNacidosAqui' | 'demografia' | 'parejas' | 'nombreLocalDeLosNacidosAqui' | 'ciudad'>;
