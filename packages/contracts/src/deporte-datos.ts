import { CIUDAD_ACTUAL, clubesDeLaZona, colegiosConClubDe, idsDeColegiosDeFuera, type CiudadDef } from './ciudad';
import { factorDeCompeticion } from './estado-de-jugador';
import { tramoDeSemana, type CalendarioPais } from './calendar';
import type { CategoriaDef } from './categories';
import type { ReadContext } from './context';
import type { LugarId } from './lugares';
import type { StatDef } from './stats';

/**
 * FICHA Y DATOS DE UN DEPORTE. Cada módulo de deporte los aporta con `GameModule.aportes` (claves en `APORTES`), así que el juego puede
 * preguntar «qué deportes hay» (el catálogo de la nueva partida) y «qué cambia este deporte de un país a otro» sin importar ningún deporte.
 *
 * Los datos van **por deporte y, dentro del deporte, por país** (lo decide el deporte, no el país): las categorías de una federación, su
 * temporada y sus competiciones. Si el deporte no trae el país de la partida se usan los de España, con el nombre del país donde el texto lo
 * pide (`{pais}`), hasta que una actualización traiga los reales. Plan: `docs/PLAN_DEPORTES_MODULARES.md` §4.
 */

/** Los puntos de extensión que usan los deportes. */
export const APORTES = {
  /** Un `FichaDeDeporte` por deporte. */
  fichaDeDeporte: 'deportes.ficha',
  /** Un `DatosDeDeporte` por deporte. */
  datosDeDeporte: 'deportes.datos',
  /** Un `AporteDeLugares` por deporte: lo que pone en el mapa de la ciudad (su estadio, sus pistas, las salas de sus clubes). */
  lugaresDeDeporte: 'lugares.mapa',
  /** Un `RendimientoDeDeporte` por deporte: cómo vale a una persona (el personaje o cualquier PNJ) en ese deporte. */
  rendimientoDeDeporte: 'deportes.rendimiento',
} as const;

/** Lo que el juego sabe de un deporte sin cargar su partida: para listarlo al crear la partida. */
export interface FichaDeDeporte {
  /** Id del módulo del deporte (p. ej. `atletismo`). */
  id: string;
  nombre: string;
  /** La prueba o disciplina que se juega (p. ej. «400 m»). */
  disciplina: string;
  descripcion: string;
  tipo: 'individual' | 'equipo';
}

/**
 * Cuándo es la temporada, **relativa al calendario escolar del país** (no en semanas fijas): así los datos de España encajan en cualquier
 * calendario. Las semanas se cuentan en semanas de clase; no hay competición en vacaciones.
 */
export interface TemporadaDeDeporte {
  /** Semanas de clase al empezar el curso en que se entrena pero aún no se compite (la primera competición es la siguiente). */
  semanasDePretemporada: number;
  /**
   * Cuántas semanas antes de la última semana de clase del curso se juegan las semifinales y la final del campeonato (la final, después). **Obligatorios
   * salvo que el deporte tenga `liga`** (una liga se juega a jornadas y no tiene fases finales): o vienen los dos o ninguno.
   */
  semifinalAntesDelFinal?: number;
  finalAntesDelFinal?: number;
  /**
   * Un campeonato al final de **cada trimestre** (en vez de uno al final del curso): cuántas semanas de clase antes de la última del trimestre se juegan las semifinales y la
   * final (0 = la última semana de clase; 1 = la penúltima). Es una alternativa a `semifinalAntesDelFinal`/`finalAntesDelFinal`. Las demás semanas de competición son jornadas normales.
   */
  campeonatoPorTrimestre?: { semifinalAntesDelFinalDeTrimestre: number; finalAntesDelFinalDeTrimestre: number };
  /** Cómo se corren las pruebas de los deportes de carreras (series, plazas de las semifinales y de la final). */
  formatoDeCarrera?: FormatoDeCarrera;
  /** Si el deporte se juega en liga (equipos que se enfrentan todos contra todos), cómo es. Sin él, no hay liga (atletismo). */
  liga?: FormatoDeLiga;
}

/**
 * Cómo se corren las pruebas: corre todo el que se presenta, en series de `maxPorSerie` como mucho, equilibradas (el mismo número de corredores en cada una o uno de diferencia)
 * y con una clasificación conjunta por tiempos. En el campeonato de cada trimestre, a la semifinal van los mejores de la clasificación del trimestre en su categoría y a la final,
 * los mejores de cada serie de la semifinal.
 */
export interface FormatoDeCarrera {
  maxPorSerie: number;
  /** Plazas de la semifinal (los mejores de la clasificación del trimestre) y cuántos más hacen de reserva por si hay bajas o ausencias. */
  semifinal: { plazas: number; reservas: number };
  /** Plazas de la final: los `porSerie` primeros de cada serie de la semifinal y, si falta alguno, sus reservas (los siguientes de su serie). */
  final: { plazas: number; porSerie: number; reservasPorSerie: number };
}

/** Cómo es una liga: cuántos equipos la juegan en cada categoría y si hay ida y vuelta. */
export interface FormatoDeLiga {
  /** 1 = una vuelta; 2 = ida y vuelta. */
  vueltas: 1 | 2;
  /** Cuántos equipos tiene la liga de cada categoría (se sortea entre `min` y `max`). */
  equiposPorCategoria: { min: number; max: number };
}

/** Cuántas jornadas tiene una liga de `equipos` equipos: cada uno juega con todos los demás `vueltas` veces (con un número impar, uno descansa cada jornada). */
export const jornadasDeLiga = (equipos: number, vueltas: 1 | 2): number => (equipos < 2 ? 0 : (equipos % 2 === 0 ? equipos - 1 : equipos) * vueltas);

/** Cuándo y dónde se compite cada semana (la jornada): lo que usan las agendas de rivales y entrenadores y los textos de los clubes. */
export interface JornadaDeCompeticion {
  /** Días de la semana (0 = lunes). */
  dias: readonly number[];
  /** Horas del día. */
  desde: number;
  hasta: number;
  /** Dónde es. */
  lugar: LugarId;
  /** En palabras, para contarlo antes de apuntarse a un club (p. ej. «Carreras: los sábados de 9 a 13 en el estadio.»). */
  texto: string;
}

/** Lo que organiza la federación (se puede usar `{pais}` para el nombre del país de la partida). */
export interface CompeticionesDeDeporte {
  federacion: string;
  /** El campeonato nacional (la final), p. ej. «campeonato de {pais}». */
  campeonato: string;
  /** La competición de cada semana. */
  jornada: JornadaDeCompeticion;
}

/**
 * Una sección de club en un deporte: el club (que puede tener secciones en varios deportes; el primero que lo define pone su nombre y su calidad) y lo
 * que tiene para este deporte: sus sesiones, su acceso y sus sitios. El módulo `clubes` junta las secciones de todos los deportes cargados.
 */
export interface ClubDeDeporte {
  id: string;
  nombre: string;
  /** El club del colegio: entrenamientos de menor nivel que un club de fuera. */
  esColegio?: boolean;
  /** 1 = colegio, 2 = club de la ciudad, 3 = alto rendimiento. */
  calidad: 1 | 2 | 3;
  /** Días de la semana (0 = lunes) y horas de las sesiones de esta sección. */
  sesiones: { weekdays: readonly number[]; desde: number; hasta: number };
  /** Nivel y edad mínimos para entrar (sin él, abierto). */
  acceso?: { nivel: number; edadMin: number };
  /** Dónde entrena esta sección. */
  sede: LugarId;
  /** Dónde se hacen los trámites (apuntarse, pruebas de acceso): la administración del colegio o la sala del club. */
  tramites: LugarId;
}

/** El tamaño de un club de la zona: decide el orden en que recluta (grande, mediano, pequeño). */
export type TamanoDeClub = 'grande' | 'mediano' | 'pequeno';
/** La calidad (3, 2, 1) que corresponde a cada tamaño: el orden en que se escoge. */
export const CALIDAD_DE_TAMANO: Readonly<Record<TamanoDeClub, 1 | 2 | 3>> = { grande: 3, mediano: 2, pequeno: 1 };

/**
 * La **prueba de acceso** a un club que no es el del colegio (`CIUDAD_Y_LIGAS.md` §5): quien quiere entrar (el personaje o un niño) la hace, y **lo que vale en la prueba es lo que cuenta para la regla
 * de plaza**: con el equipo lleno en su puesto, hay que superar al peor; con hueco, al suplente que mejor cubriría ese puesto (y si nadie puede, entra). Igual en todos los clubes de fuera.
 */
/** Cuánto se desvía una prueba de lo que vale quien la hace (±6 % de desviación): el azar de un día. */
export const RUIDO_DE_LA_PRUEBA = 0.06;
/**
 * Lo que vale una prueba: lo que vale de verdad quien la hace, por cómo rinde ese día (`factorDeCompeticion` de su eficiencia: estado, forma del día) y un poco de azar (`z`, normal estándar).
 * La misma para el personaje y para cualquier niño.
 */
export const valorDeLaPrueba = (valor: number, eficiencia: number, z: number): number => valor * factorDeCompeticion(eficiencia) * (1 + RUIDO_DE_LA_PRUEBA * z);

/** Qué parte de la bolsa de interesados de una categoría va a probar con un club en la primera ronda del «draft» (`CIUDAD_Y_LIGAS.md` §5): los grandes atraen más. Los colegios no la usan (ven a todos sus alumnos). */
export const ATRACTIVO_DE_TAMANO: Readonly<Record<TamanoDeClub, number>> = { grande: 0.6, mediano: 0.5, pequeno: 0.4 };

/**
 * Un club o el equipo de un colegio que recluta niños para el deporte. La plantilla es un número más o menos definido (se sortea entre `min` y `max`
 * al crear la partida y se mantiene): así un club no tiene veinte niños. Los equipos de un colegio solo reclutan a sus alumnos; los clubes, a cualquiera
 * (por ahora, los de más calidad escogen primero; más adelante, el prestigio).
 */
export interface EquipoDeDeporte {
  /** Id del club en `clubes` (`colegio`, `club_ciudad`...) o un nombre libre para los que no están en el catálogo del personaje (`colegio2`, `club3`). */
  club: string;
  /** Cómo se llama, si no está en el catálogo del personaje. */
  nombre?: string;
  /** Equipo de un colegio: `propio` (el del personaje) o uno de los de fuera (`COLEGIOS_DE_FUERA`). Solo recluta alumnos de ese colegio. Sin él, es un club abierto a cualquier colegio. */
  colegio?: string;
  /**
   * El **tamaño** del club en la zona (`CIUDAD_Y_LIGAS.md` §3): decide en qué orden recluta (los grandes escogen primero, por lo que vale cada niño de verdad, en todos los colegios;
   * después los medianos; al final los pequeños). El equipo del colegio del personaje es un club pequeño más. Sin él: el que corresponde a su `calidad`.
   */
  tamano?: TamanoDeClub;
  /** Qué parte de la bolsa va a probar con el club en la primera ronda del «draft» (0 a 1); sin él, la de su tamaño (`ATRACTIVO_DE_TAMANO`). Marca también el orden: los más atractivos escogen primero. */
  atractivo?: number;
  /** 1 colegio, 2 club de la ciudad, 3 alto rendimiento. Es lo mismo que el tamaño (pequeño, mediano, grande): con `tamano`, sale de él. Sin ninguno: la del club en el catálogo del personaje, o 1 si es de un colegio y 2 si no. */
  calidad?: 1 | 2 | 3;
  /** Edades de competición que recluta (por defecto, las del deporte; los equipos de un colegio solo llegan a la edad en que acaba el colegio). */
  edades?: { min?: number; max?: number };
  /** Ids de las categorías (de `categorias`) en las que el club tiene equipo, para los deportes con liga por categoría. Sin él, tiene equipo en todas las que cubren sus edades. */
  categorias?: readonly string[];
  /** Plantilla del club entero, repartida entre las edades que recluta (atletismo). Obligatoria salvo que traiga `plantillaPorCategoria`. */
  plantilla?: { min: number; max: number };
  /**
   * Un equipo **por categoría** (deportes de equipo): cada categoría de `categorias` (por defecto, todas las que recluta el club) tiene su propio equipo con
   * esta plantilla. Se recluta primero a los interesados hasta el máximo y, si no se llega al mínimo, se completa con niños sin interés hasta el mínimo y no
   * más (no se guarda ningún hueco al personaje: entra por la regla de plaza). Un equipo por club, categoría y deporte.
   */
  plantillaPorCategoria?: { min: number; max: number };
}

/**
 * La gente de un deporte: lo que `npcs` necesita para reclutar a los niños que lo practican y para renovarlos cada curso. Todos los niños se crean
 * iguales (con su genética y sus gustos) y cada deporte recluta a los que mejor encajan, primero entre los interesados. La partida **guarda lo que
 * pidió cada deporte** (`npcs` copia esto al empezar), así que su gente sigue viviendo aunque el módulo del deporte ya no esté (plan §5).
 */
/**
 * Un puesto de un deporte de equipo: su línea (de la portería al ataque), cuánto pesa cada habilidad del deporte en él (el nivel de un jugador en el puesto es la media ponderada) y a qué
 * otros puestos se parece (de 0 a 1, para saber cuánto le cuesta a quien tiene un puesto favorito aceptar otro).
 */
export interface PuestoDeDeporte {
  id: string;
  nombre: string;
  linea: number;
  /** Peso de cada stat (habilidad del deporte o capacidad `gen.*`) en este puesto; lo que no esté no cuenta. */
  pesos: Readonly<Record<string, number>>;
  /** Parecido con otros puestos (id → 0 a 1). El parecido de dos puestos es el mayor de los dos sentidos. */
  afinidades: Readonly<Record<string, number>>;
}

/** La pierna buena de una persona. */
export type Pierna = 'izquierda' | 'derecha';

/** La proporción de zurdos (de pierna izquierda): en torno a un 20 %. Un solo dato, en un solo sitio: el personaje (su identidad) y los PNJ la leen de aquí, y ningún deporte la repite ni la cambia. */
export const PROPORCION_DE_ZURDOS = 0.2;

/** Todos tienen pierna buena (diestro o zurdo): el personaje y los PNJ, con la misma regla y la misma proporción. Cuánto cuenta, como dato del deporte (la proporción de zurdos no: es `PROPORCION_DE_ZURDOS`). */
export interface PiernaDeDeporte {
  /** Mientras no tenga una banda clara, cada uno vale esto más de base en los puestos del lado de su pierna buena (y esto menos en los del otro lado): ±0,25 puntos. */
  ventajaDelLado: number;
  /** Cuánto más deprisa gana experiencia en un puesto del lado de su pierna buena (×). Preparado para la experiencia por puesto, que llega con los partidos (F2 y F3). */
  factorDeExperienciaDelLado: number;
}

/** El lado de un puesto (los que empiezan por L o R, como LB o RW) o `undefined` si es central (GK, CB, CM, CAM, ST...). */
export const ladoDePuesto = (id: string): Pierna | undefined => (/^[LR][A-Z]+$/.test(id) ? (id[0] === 'L' ? 'izquierda' : 'derecha') : undefined);

/**
 * La regla de la pierna buena sobre lo que vale alguien en cada puesto: en los puestos del lado de su pierna vale `ventaja` más y en los del otro lado `ventaja` menos. Es la **misma** para el
 * personaje y para cualquier PNJ.
 */
export function conLaPierna(valores: Readonly<Record<string, number>>, pierna: Pierna, ventaja: number): Record<string, number> {
  return Object.fromEntries(Object.entries(valores).map(([p, v]) => [p, ladoDePuesto(p) === undefined ? v : v + (ladoDePuesto(p) === pierna ? ventaja : -ventaja)]));
}

/** Los puestos de un deporte y cómo se reparte una plantilla entre ellos. */
export interface PuestosDeDeporte {
  puestos: readonly PuestoDeDeporte[];
  /**
   * Cómo se forman los equipos de un club (`CIUDAD_Y_LIGAS.md` §5): los **titulares** de cada equipo por grupo de puestos (un equipo de 18 tiene 11 titulares y 7 suplentes: en el fútbol, 1 portero, 2
   * centrales, 2 laterales, 3 mediocentros, 2 de banda y 1 delantero) y el **listón** que un jugador de primer año necesita sobre uno de segundo para ser titular en el A de un club grande.
   */
  equipos?: { titulares: Readonly<Record<string, number>>; listonDePrimerAno: number };
  /** La pierna buena: proporción de zurdos, lo que vale de base el lado de su pierna y lo que acelera la experiencia en él. Sin él, los valores por defecto. */
  pierna?: PiernaDeDeporte;
  /**
   * El reparto de una plantilla del máximo de jugadores (18 en el fútbol) por grupos de puestos: «2 porteros, 3 centrales, 3 laterales, 4 mediocentros, 3 de banda o extremos y 3
   * delanteros». Un equipo de otro tamaño reparte lo mismo en proporción (`cuposPorGrupo`).
   */
  reparto: readonly { grupo: string; nombre: string; puestos: readonly string[]; jugadores: number }[];
  /**
   * El puesto favorito de los niños (decisión del usuario, 08/11/2026): **se forma con los años**. A la edad de inicio, la mayoría no tiene puesto definido (acepta cualquiera), unos tienen un puesto
   * concreto y otros una **zona** (en el fútbol: portería, defensa, medio o ataque; las bandas, en el medio, y los extremos, en el ataque). Después, según las temporadas que ha jugado y lo que vale en su
   * puesto, quien no tenía preferencia pasa a preferir una zona y después un puesto. Los de zona aceptan cualquier puesto de su zona. Sin él, nadie tiene preferencia (todos aceptan cualquier puesto).
   */
  favoritos?: {
    grupos: readonly { id: string; nombre: string; puestos: readonly string[] }[];
    /** A la edad de inicio: la parte sin puesto definido, con puesto concreto y con zona (suman 1). */
    alEmpezar: { sinPuesto: number; concreto: number; zona: number };
    /** El ritmo con que se forma: la edad de inicio, la probabilidad por temporada de pasar de sin puesto a zona y de zona a puesto concreto (a un valor de referencia en su puesto; más si vale más, menos si vale menos). */
    formacion: { edadDeInicio: number; aZonaPorTemporada: number; aPuestoPorTemporada: number; valorDeReferencia: number };
  };
}

/** Cuántos jugadores de cada grupo caben en una plantilla de `total` jugadores: el reparto del máximo, en proporción (los que sobran, a los restos mayores). */
export function cuposPorGrupo(p: PuestosDeDeporte, total: number): Record<string, number> {
  const base = p.reparto.reduce((t, g) => t + g.jugadores, 0) || 1;
  const exactos = p.reparto.map((g) => ({ g: g.grupo, v: (g.jugadores * total) / base }));
  const cupos: Record<string, number> = Object.fromEntries(exactos.map((e) => [e.g, Math.floor(e.v)]));
  let faltan = total - Object.values(cupos).reduce((a, b) => a + b, 0);
  for (const e of [...exactos].sort((a, b) => b.v - Math.floor(b.v) - (a.v - Math.floor(a.v)) || (a.g < b.g ? -1 : 1))) {
    if (faltan <= 0) break;
    cupos[e.g]++;
    faltan--;
  }
  return cupos;
}

/** El grupo de un puesto en el reparto de una plantilla, o `undefined` si no está. */
export const grupoDePuesto = (p: PuestosDeDeporte, puesto: string): string | undefined => p.reparto.find((g) => g.puestos.includes(puesto))?.grupo;

/** Cuánto se parecen dos puestos (de 0 a 1; 1 si son el mismo): el mayor de los dos sentidos de la afinidad del deporte. */
export const parecidoDePuestos = (p: PuestosDeDeporte, a: string, b: string): number =>
  a === b ? 1 : Math.max(p.puestos.find((x) => x.id === a)?.afinidades[b] ?? 0, p.puestos.find((x) => x.id === b)?.afinidades[a] ?? 0);

/** Lo que sube una práctica: una stat y cuánto (el mismo formato que `ActionDef.train`). */
export interface Entrenamiento {
  stat: string;
  amount: number;
}

/** Un ejercicio de las sesiones del club (fútbol): unas pocas habilidades. El entrenador elige varios por sesión. */
export interface EjercicioDeClub {
  id: string;
  /** Cómo se dice en «Hoy: rondos y finalización». */
  nombre: string;
  /** Tipo de ejercicio: en una sesión no se repite, y el carácter del entrenador inclina hacia unos u otros. */
  foco: string;
  entrena: readonly Entrenamiento[];
  /** Solo para quien juega en este puesto (p. ej. `portero`). */
  soloPuesto?: string;
}

/**
 * La rutina de un deporte, como dato: lo que hace falta para que **cualquier PNJ que lo juegue tenga las mismas habilidades que el personaje y las entrene con las
 * mismas reglas** (`MISMAS_REGLAS.md`). La partida lo guarda con la población, así que sus jugadores siguen viviendo aunque el módulo del deporte ya no esté.
 */
export interface RutinaDeDeporte {
  /** Las stats propias del deporte (habilidades y conocimiento), tal como las define el módulo: los PNJ las llevan con las mismas reglas de subida, techo y caída. */
  stats: readonly StatDef[];
  /** Id del conocimiento del deporte (uno de `stats`). */
  conocimiento: string;
  /** Lo que sube una sesión del club cuando es siempre la misma (atletismo). */
  sesionFija?: readonly Entrenamiento[];
  /** Los ejercicios que elige el entrenador en cada sesión (fútbol) y lo que sube siempre además. Todos los de un equipo entrenan lo mismo. */
  ejercicios?: readonly EjercicioDeClub[];
  siempre?: readonly Entrenamiento[];
  ejerciciosPorSesion?: number;
  /** Lo que sube una semana de juego informal («practicar con los amigos»): lo que hace todo niño, y el personaje, antes de entrar en un club. */
  informal: readonly Entrenamiento[];
  /** Sesiones de club por semana: las de cada club y, para los que no están en la lista, las de por defecto. */
  sesionesPorSemana: Readonly<Record<string, number>>;
  sesionesPorDefecto: number;
}

export interface PoblacionDeDeporte {
  /** Los puestos del deporte, si es de equipo con puestos (el fútbol): con ellos los clubes reparten la plantilla y la regla de plaza va por puesto. */
  puestos?: PuestosDeDeporte;
  /** La rutina del deporte, si trae las habilidades de sus jugadores: sin ella, los PNJ solo llevan un nivel por deporte (los deportes de prueba). */
  rutina?: RutinaDeDeporte;
  /** Etiqueta de los deportistas (p. ej. `atleta`): así los buscan los módulos del deporte (`NpcDirectory.list({ tag })`). */
  etiqueta: string;
  /** Descripción de un deportista que no es del colegio del personaje («Compite en atletismo.»). */
  descripcionDeRival: string;
  /** Capacidades (ids de stats genéricas) de las que sale su potencial: la media de lo que heredan, por la aptitud propia de cada uno. */
  capacidades: readonly string[];
  /** Cuánto varía su aptitud propia respecto a lo heredado (0,15 = ±15 %). */
  aptitud: number;
  reclutamiento: {
    /** Edades de competición que cubre (ambas incluidas). A la siguiente a la última se retiran. */
    edades: { min: number; max: number };
    /** Hasta esta edad algún niño puede dejar el deporte cada curso (con esta probabilidad) y otro ocupa su plaza. */
    edadMaxBaja: number;
    probabilidadBaja: number;
    /**
     * **El abandono por edad** (decisión del usuario, 07/11/2026; `CIUDAD_Y_LIGAS.md` §11): cada verano cada deportista decide si sigue. La probabilidad de dejarlo sube con la edad (sobre todo desde cadete) y
     * pesan su interés por el deporte, su ambición, los minutos que tuvo (si fue titular), sus estudios (más en 4.º de la ESO y en bachillerato) y lo que hacen sus padres. Con él, sustituye a
     * `edadMaxBaja` y `probabilidadBaja`. El personaje ve los mismos motivos, pero lo de seguir lo decide el jugador.
     */
    abandono?: {
      /** Probabilidad base de dejarlo cada verano a cada edad; para las edades que no están se usa la de la mayor edad menor que ellas (la primera, para las menores). */
      baseDeLaEdad: Readonly<Record<number, number>>;
      /** Cuánto cambia la base cada motivo, de 0 a 1 (con peso 0,5, el motivo más fuerte la sube o la baja un 50 %). */
      pesos: { interes: number; ambicion: number; minutos: number; estudios: number; padres: number };
      /** La presión de los estudios a cada edad, de 0 a 1 (4.º de la ESO y bachillerato, las más altas); lo que no está, 0. */
      estudiosPorEdad: Readonly<Record<number, number>>;
    };
  };
  /** Los clubes y equipos de colegio que reclutan, con su plantilla. */
  equipos: readonly EquipoDeDeporte[];
  /** Frase que se añade a la descripción de un alumno del colegio del personaje que entra en el equipo del colegio («Del equipo de atletismo del colegio.»). */
  descripcionDelEquipo: string;
  entrenadores: {
    sesgoCaracter: Readonly<Record<string, number>>;
    interesesPreferidos: readonly string[];
    /** Descripción del entrenador del club del colegio («Entrena al grupo de atletismo del colegio.»). */
    descripcionDelColegio: string;
    /** A qué se dedican, para «Entrenador de atletismo» (`de atletismo`). */
    dedicacion: string;
    /** Los entrenadores de los clubes de fuera: de cada club, las edades que lleva cada uno. */
    deFuera: readonly { club: string; edades: readonly (readonly [number, number])[] }[];
  };
}

/** Lo que un deporte pone de un país: sus categorías, su temporada y sus competiciones. */
export interface DatosDeDeportePais {
  categorias: readonly CategoriaDef[];
  temporada: TemporadaDeDeporte;
  competiciones: CompeticionesDeDeporte;
  /** Los clubes con sección en este deporte. */
  clubes: readonly ClubDeDeporte[];
  /** Dónde entrena quien aún no tiene club (`colegio`) y dónde, por defecto, los clubes de fuera que no están en el catálogo (`fuera`). */
  sedes: { colegio: LugarId; fuera: LugarId };
  /** La gente del deporte (rivales, entrenadores y equipo del colegio). */
  poblacion: PoblacionDeDeporte;
  /** Nombres para los clubes de la zona que la ciudad pide además de los del catálogo (por tamaño); sin ellos, el del modelo con un número. */
  nombresDeClubes?: Readonly<Partial<Record<TamanoDeClub, readonly string[]>>>;
}

/**
 * Los clubes de la zona **en proporción a la población** (`CiudadDef.personasPorClub`): los del catálogo (grande, mediano, pequeño) son los modelos y la ciudad pide tantos como le correspondan
 * (`clubesDeLaZona`): un grande por cada diez, tres medianos de cada diez y el resto, pequeños (siempre un grande como mínimo). Los extra copian al modelo de su tamaño (sesiones, sedes,
 * plantilla) con otro id (`club_mediano2`) y otro nombre. El club del colegio no cuenta. Lo usan a la vez el catálogo de clubes del personaje y la gente del mundo.
 */
export function conClubesDeLaCiudad(datos: DatosDeDeportePais, ciudad: CiudadDef): DatosDeDeportePais {
  const modelo = (t: TamanoDeClub) => datos.poblacion.equipos.find((e) => e.tamano === t && e.colegio === undefined);
  if (!modelo('grande') && !modelo('mediano') && !modelo('pequeno')) return datos;
  const n = clubesDeLaZona(ciudad);
  const grandes = Math.max(1, Math.round(n / 10));
  const medianos = Math.min(n - grandes, Math.round(0.3 * n));
  const cuantos: Record<TamanoDeClub, number> = { grande: grandes, mediano: Math.max(0, medianos), pequeno: Math.max(0, n - grandes - Math.max(0, medianos)) };
  const equipos: EquipoDeDeporte[] = datos.poblacion.equipos.filter((e) => e.tamano === undefined || e.colegio !== undefined);
  const clubes: ClubDeDeporte[] = datos.clubes.filter((c) => !datos.poblacion.equipos.some((e) => e.club === c.id && e.tamano !== undefined && e.colegio === undefined));
  for (const t of ['grande', 'mediano', 'pequeno'] as const) {
    const m = modelo(t);
    const mc = m && datos.clubes.find((c) => c.id === m.club);
    if (!m || !mc) continue;
    for (let i = 0; i < cuantos[t]; i++) {
      const id = i === 0 ? m.club : `${m.club}${i + 1}`;
      const nombre = i === 0 ? (m.nombre ?? mc.nombre) : (datos.nombresDeClubes?.[t]?.[i - 1] ?? `${m.nombre ?? mc.nombre} ${i + 1}`);
      equipos.push({ ...m, club: id, nombre });
      clubes.push({ ...mc, id, nombre });
    }
  }
  // Los colegios de fuera con club (los primeros `colegiosConClub`): el mismo equipo que el del colegio del personaje, solo para sus alumnos. No están en el catálogo del personaje.
  const propio = datos.poblacion.equipos.find((e) => e.colegio === 'propio');
  if (propio) {
    for (const [i, colegio] of idsDeColegiosDeFuera(ciudad).slice(0, colegiosConClubDe(ciudad)).entries()) equipos.push({ ...propio, club: colegio, nombre: `Club deportivo del colegio ${i + 1}`, colegio });
  }
  return { ...datos, clubes, poblacion: { ...datos.poblacion, equipos } };
}

const CON_CLUBES = new WeakMap<DatosDeDeportePais, Map<CiudadDef, DatosDeDeportePais>>();

export interface DatosDeDeporte {
  id: string;
  /** Datos por id de país. **`espana` es obligatorio**: es el de respaldo de los países que el deporte aún no trae. */
  paises: Readonly<Record<string, DatosDeDeportePais>>;
}

/** Las fichas de los deportes cargados en la partida. */
export const fichasDeDeporte = (ctx: Pick<ReadContext, 'aportes'>): readonly FichaDeDeporte[] => ctx.aportes<FichaDeDeporte>(APORTES.fichaDeDeporte);

/**
 * Los datos de un deporte para el país de la partida; si el deporte no trae ese país, los de España (`deRespaldo`). Lanza un error si el deporte
 * no ha aportado sus datos.
 */
export function datosDeDeporte(ctx: Pick<ReadContext, 'aportes' | 'pais'>, deporte: string): DatosDeDeportePais & { deRespaldo: boolean } {
  const d = ctx.aportes<DatosDeDeporte>(APORTES.datosDeDeporte).find((x) => x.id === deporte);
  if (!d) throw new Error(`El deporte «${deporte}» no ha aportado sus datos (aporte «${APORTES.datosDeDeporte}»)`);
  const propios = d.paises[ctx.pais.id];
  const base = propios ?? d.paises.espana;
  // Los clubes de la zona, en proporción a la población de la ciudad (con memoria: se pide en cada consulta).
  const ciudad = ctx.pais.ciudad ?? CIUDAD_ACTUAL;
  const porCiudad = CON_CLUBES.get(base) ?? new Map<CiudadDef, DatosDeDeportePais>();
  CON_CLUBES.set(base, porCiudad);
  let datos = porCiudad.get(ciudad);
  if (!datos) {
    datos = conClubesDeLaCiudad(base, ciudad);
    porCiudad.set(ciudad, datos);
  }
  return { ...datos, deRespaldo: !propios };
}

/** Un texto de los datos de un deporte con el nombre del país de la partida donde pone `{pais}`. */
export const textoConPais = (texto: string, ctx: Pick<ReadContext, 'pais'>): string => texto.replaceAll('{pais}', ctx.pais.nombre);

/** Las semanas del curso (0 = la primera) en que empieza la competición y se juegan las semifinales y la final. */
export interface SemanasDeTemporada {
  primeraCompeticion: number;
  /** Solo si la temporada tiene fases finales al final del curso (ver `TemporadaDeDeporte`). */
  semifinal?: number;
  final?: number;
  /** Solo si el campeonato es por trimestres: la semana de la semifinal y de la final de cada trimestre (1, 2 y 3). */
  campeonatos?: { trimestre: number; semifinal: number; final: number }[];
}

const CACHE_DE_SEMANAS = new WeakMap<TemporadaDeDeporte, WeakMap<CalendarioPais, SemanasDeTemporada>>();

/** Pasa la temporada relativa de un deporte a semanas del curso con el calendario del país. */
export function semanasDeTemporada(cal: CalendarioPais, t: TemporadaDeDeporte): SemanasDeTemporada {
  const porCalendario = CACHE_DE_SEMANAS.get(t) ?? new WeakMap<CalendarioPais, SemanasDeTemporada>();
  CACHE_DE_SEMANAS.set(t, porCalendario);
  const guardado = porCalendario.get(cal);
  if (guardado) return guardado;
  const clase: number[] = [];
  for (let w = 0; w < cal.semanasPorCurso; w++) if (tramoDeSemana(cal, w).periodo === 'clase') clase.push(w);
  const ultima = clase[clase.length - 1];
  const porTrimestre: { trimestre: number; semifinal: number; final: number }[] = [];
  if (t.campeonatoPorTrimestre) {
    const { semifinalAntesDelFinalDeTrimestre: sf, finalAntesDelFinalDeTrimestre: fi } = t.campeonatoPorTrimestre;
    const tri = [...new Set(clase.map((w) => tramoDeSemana(cal, w).trimestre))];
    for (const n of tri) {
      const ws = clase.filter((w) => tramoDeSemana(cal, w).trimestre === n);
      porTrimestre.push({ trimestre: n, semifinal: ws[Math.max(0, ws.length - 1 - sf)], final: ws[Math.max(0, ws.length - 1 - fi)] });
    }
  }
  const semanas: SemanasDeTemporada = {
    primeraCompeticion: clase[Math.min(t.semanasDePretemporada, clase.length - 1)],
    ...(porTrimestre.length ? { campeonatos: porTrimestre } : {}),
    ...(t.semifinalAntesDelFinal !== undefined && t.finalAntesDelFinal !== undefined ? { semifinal: ultima - t.semifinalAntesDelFinal, final: ultima - t.finalAntesDelFinal } : {}),
  };
  porCalendario.set(cal, semanas);
  return semanas;
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const esEntero = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;

/** Comprueba los datos de un deporte (la forma, no el contenido de juego): devuelve los problemas, en español; vacío si valen. */
export function validarDatosDeDeporte(x: unknown): string[] {
  const p: string[] = [];
  if (!esObjeto(x)) return ['Los datos del deporte no son un objeto'];
  if (typeof x.id !== 'string' || !x.id) p.push('Falta el «id» del deporte');
  if (!esObjeto(x.paises) || !Object.keys(x.paises).length) return [...p, 'Faltan los «paises» del deporte'];
  if (!('espana' in x.paises)) p.push('Faltan los datos de «espana» (son los de respaldo de los países que el deporte aún no trae)');
  for (const [pais, d] of Object.entries(x.paises)) {
    const en = `«paises.${pais}»`;
    if (!esObjeto(d)) {
      p.push(`${en} no es un objeto`);
      continue;
    }
    const cats = d.categorias;
    if (!Array.isArray(cats) || !cats.length) p.push(`${en}: faltan las «categorias»`);
    else {
      let esperada = -1;
      for (const c of cats as Partial<CategoriaDef>[]) {
        if (typeof c.id !== 'string' || typeof c.nombre !== 'string' || typeof c.edadMin !== 'number' || typeof c.edadMax !== 'number' || c.edadMax < c.edadMin) p.push(`${en}: categoría mal formada`);
        else if (esperada >= 0 && c.edadMin !== esperada) p.push(`${en}: las categorías no tienen edades seguidas (tras la ${esperada - 1} viene la ${c.edadMin})`);
        esperada = (c.edadMax ?? 0) + 1;
      }
    }
    const t = d.temporada;
    if (!esObjeto(t) || !esEntero(t.semanasDePretemporada)) p.push(`${en}: la «temporada» tiene que traer semanasDePretemporada (entero)`);
    else {
      const fases = [t.semifinalAntesDelFinal, t.finalAntesDelFinal];
      const porTri = t.campeonatoPorTrimestre;
      if (porTri !== undefined) {
        if (!esObjeto(porTri) || !esEntero(porTri.semifinalAntesDelFinalDeTrimestre) || !esEntero(porTri.finalAntesDelFinalDeTrimestre)) p.push(`${en}: el «campeonatoPorTrimestre» tiene que traer semifinalAntesDelFinalDeTrimestre y finalAntesDelFinalDeTrimestre como enteros`);
        else if ((porTri.finalAntesDelFinalDeTrimestre as number) >= (porTri.semifinalAntesDelFinalDeTrimestre as number)) p.push(`${en}: la final del trimestre tiene que ser después de las semifinales (finalAntesDelFinalDeTrimestre menor que semifinalAntesDelFinalDeTrimestre)`);
      }
      const f = t.formatoDeCarrera;
      if (f !== undefined) {
        const ok = esObjeto(f) && esEntero(f.maxPorSerie) && (f.maxPorSerie as number) >= 2 && esObjeto(f.semifinal) && esEntero(f.semifinal.plazas) && esEntero(f.semifinal.reservas) && esObjeto(f.final) && esEntero(f.final.plazas) && esEntero(f.final.porSerie) && esEntero(f.final.reservasPorSerie);
        if (!ok) p.push(`${en}: el «formatoDeCarrera» tiene que traer maxPorSerie (2 o más), semifinal {plazas, reservas} y final {plazas, porSerie, reservasPorSerie}`);
      }
      if (porTri !== undefined) {
        // El campeonato por trimestres sustituye al del final del curso.
      } else if (fases.some((x) => x !== undefined && !esEntero(x))) p.push(`${en}: la «temporada» tiene que traer semifinalAntesDelFinal y finalAntesDelFinal como enteros`);
      else if (fases.every((x) => x === undefined)) {
        if (t.liga === undefined) p.push(`${en}: la «temporada» tiene que traer semifinalAntesDelFinal y finalAntesDelFinal (solo una liga puede no tener fases finales)`);
      } else if (fases.some((x) => x === undefined)) p.push(`${en}: la «temporada» tiene que traer semifinalAntesDelFinal y finalAntesDelFinal los dos o ninguno`);
      else if ((t.finalAntesDelFinal as number) >= (t.semifinalAntesDelFinal as number)) p.push(`${en}: la final tiene que ser después de las semifinales (finalAntesDelFinal menor que semifinalAntesDelFinal)`);
      if (t.liga !== undefined) {
        const l = t.liga;
        const e = esObjeto(l) ? l.equiposPorCategoria : undefined;
        if (!esObjeto(l) || ![1, 2].includes(l.vueltas as number) || !esObjeto(e) || !esEntero(e.min) || !esEntero(e.max) || e.min < 2 || e.max < e.min) p.push(`${en}: la «liga» de la temporada tiene que traer vueltas (1 o 2) y equiposPorCategoria (min y max, de al menos 2 equipos)`);
      }
    }
    const c = d.competiciones;
    if (!esObjeto(c) || ['federacion', 'campeonato'].some((k) => typeof c[k] !== 'string' || !c[k])) p.push(`${en}: las «competiciones» tienen que traer federacion y campeonato`);
    else {
      const j = c.jornada;
      if (!esObjeto(j) || !Array.isArray(j.dias) || !j.dias.length || j.dias.some((x) => !Number.isInteger(x) || (x as number) < 0 || (x as number) > 6) || typeof j.desde !== 'number' || typeof j.hasta !== 'number' || j.hasta <= j.desde || typeof j.lugar !== 'string' || typeof j.texto !== 'string') {
        p.push(`${en}: la «jornada» de las competiciones tiene que traer dias (0 a 6), desde, hasta (horas), lugar y texto`);
      }
    }
    const pob = d.poblacion;
    if (!esObjeto(pob)) p.push(`${en}: falta la «poblacion»`);
    else {
      const r = pob.reclutamiento;
      const e = pob.entrenadores;
      if (typeof pob.etiqueta !== 'string' || !pob.etiqueta || typeof pob.descripcionDeRival !== 'string' || typeof pob.descripcionDelEquipo !== 'string') p.push(`${en}: la «poblacion» necesita etiqueta, descripcionDeRival y descripcionDelEquipo`);
      if (!Array.isArray(pob.capacidades) || !pob.capacidades.length || pob.capacidades.some((c) => typeof c !== 'string')) p.push(`${en}: la «poblacion» necesita sus capacidades (ids de stats)`);
      if (typeof pob.aptitud !== 'number' || pob.aptitud < 0 || pob.aptitud >= 1) p.push(`${en}: la «poblacion.aptitud» tiene que estar entre 0 y 1`);
      if (!esObjeto(r) || !esObjeto(r.edades) || !esEntero(r.edades.min) || !esEntero(r.edades.max) || r.edades.max < r.edades.min || !esEntero(r.edadMaxBaja) || typeof r.probabilidadBaja !== 'number') {
        p.push(`${en}: el «reclutamiento» de la población necesita edades (min y max), edadMaxBaja y probabilidadBaja`);
      }
      if (!Array.isArray(pob.equipos) || !pob.equipos.length) p.push(`${en}: la «poblacion» necesita sus equipos`);
      else {
        const ids = new Set<string>();
        for (const q of pob.equipos as Partial<EquipoDeDeporte>[]) {
          const plantillaMal = (x: unknown): boolean => !esObjeto(x) || !esEntero(x.min) || !esEntero(x.max) || (x.max as number) < (x.min as number) || (x.max as number) < 1;
          if (typeof q.club !== 'string' || !q.club || plantillaMal(q.plantillaPorCategoria ?? q.plantilla) || (q.plantilla !== undefined && plantillaMal(q.plantilla))) p.push(`${en}: equipo mal formado (${JSON.stringify(q)?.slice(0, 60)}): necesita club y plantilla o plantillaPorCategoria (min y max)`);
          else if (ids.has(q.club)) p.push(`${en}: el equipo «${q.club}» está repetido`);
          else {
            ids.add(q.club);
            const conocidas = new Set(Array.isArray(cats) ? (cats as Partial<CategoriaDef>[]).map((c) => c.id) : []);
            const mal = q.categorias?.filter((c) => !conocidas.has(c));
            if (mal?.length) p.push(`${en}: el equipo «${q.club}» tiene equipo en categorías que no existen (${mal.join(', ')})`);
          }
        }
      }
      if (!esObjeto(e) || !Array.isArray(e.deFuera) || typeof e.dedicacion !== 'string' || typeof e.descripcionDelColegio !== 'string') p.push(`${en}: los «entrenadores» de la población necesitan descripcionDelColegio, dedicacion y deFuera`);
    }
    const s = d.sedes;
    if (!esObjeto(s) || typeof s.colegio !== 'string' || typeof s.fuera !== 'string') p.push(`${en}: las «sedes» tienen que traer colegio y fuera`);
    const clubes = d.clubes;
    if (!Array.isArray(clubes) || !clubes.length) p.push(`${en}: faltan los «clubes»`);
    else {
      const ids = new Set<string>();
      for (const k of clubes as Partial<ClubDeDeporte>[]) {
        const mal = typeof k.id !== 'string' || typeof k.nombre !== 'string' || ![1, 2, 3].includes(k.calidad as number) || typeof k.sede !== 'string' || typeof k.tramites !== 'string' || !esObjeto(k.sesiones) || !Array.isArray(k.sesiones.weekdays) || typeof k.sesiones.desde !== 'number' || typeof k.sesiones.hasta !== 'number' || k.sesiones.hasta <= k.sesiones.desde || (k.acceso !== undefined && (typeof k.acceso.nivel !== 'number' || typeof k.acceso.edadMin !== 'number'));
        if (mal) p.push(`${en}: club mal formado (${JSON.stringify(k)?.slice(0, 60)})`);
        else if (ids.has(k.id!)) p.push(`${en}: el club «${k.id}» está repetido`);
        else ids.add(k.id!);
      }
    }
  }
  return p;
}
