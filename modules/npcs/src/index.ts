import { APORTES, CORE_EVENTS, cerrarTemporadaDeJugador, experienciaTrasElPartido, factorDeExperienciaDelPuesto, sumarPartido, trasElBanquillo, type EstadisticasDeTemporada, type TemporadaCerrada, type RendimientoDeDeporte, type LectorDePersona, type CategoriaDef, MINUTES_PER_DAY, SERVICES, anioNatural, edadDeCompeticion, primerDiaDelAnio, COLEGIO_DEL_PERSONAJE, EDAD_DE_COLEGIO, colegioDeFuera, alturaDe, estaturaZ, edadCumplida, LETRA_DE_TU_CLASE, letraDeClaseDe, nombreDeClase, cumpleaños, nacimientoDeProgenitor, nacimientoParaEdad, edadAdultaDe, oficioDeVecino, oficioDeProgenitor, oficioDeProgenitorAlAzar, type DatoPersonal, type DatoPersonalData, nombreCompletoDeProgenitor, nombreDeProgenitor, padresDeSemilla, identidadAlAzar, identidadDeHijo, apodoAlAzar, apodoDeId, nombreCompleto, nombreCortoDe, nombrePermitido, registrarNombre, type Identidad, type OrigenFamiliar, paisPorId, type PaisDef, type RegistroDeNombres, diferenciasDeEdad, relacionDeHermano, numeroDeHermanos, rasgosHeredadosNpc, rngEstable, ESTADO_INICIAL, CAPACIDADES_GENETICAS, eficienciaDeEstado, pasoDeSemanaDelEstado, trasUnaCompeticion, valoracionDelPuesto, type EstadoDeJugador, type CompeticionDelMundoData, type PartidoDelMundoData, type PerksDe, type RasgosDe, rasgosAlAzar, gustosDe, SHARED_EVENTS, type DeporteAnadidoData, type PlazaPerdidaData, type PuestoPropuestoData, type Pierna, defineModule, type CompetitionResultData, type PresentacionData, type Rng, type Gender, type InitContext, type NpcDirectory, type NpcRole, type NpcView, type ClubDirectory, type ClassAttendedData, type ClubJoinData, type IdentityService, type DatosDeAgenda, CALIDAD_DE_TAMANO, CIUDAD_ACTUAL, idsDeColegiosDeFuera, type CiudadDef, aptitudDe, datosDeDeporte, fichasDeDeporte, type EquipoDeDeporte, type FichaDeDeporte, type PoblacionDeDeporte, type ReadContext, type PresenciaService, type SesionDeClub, type TipoAsignado, azarDe, construirAgenda, ubicacionEn, type TramoDeAgenda } from '@ds/contracts';
import { aficionadoPorLosPadres, desarrolloRival, geneticaDeHermano, geneticaDeNino, formaEn, type Genetica } from './deportistas';
import { aGuardar, avanzarSemana, historiaDe, valoresIniciales } from './capacidades';
import { semillaDeSesionDeEquipo } from '@ds/kit-deporte';
import { type HabilidadesDe } from './rutina';
import { historiaDeportiva, listaDeSesion, semanaDeNino, semanaQueAcaba, type Rendimientos } from './semana';

/**
 * MÓDULO NPCs (id `npcs`).
 *
 * Los NPCs dan profundidad al personaje y son la red que une módulos:
 * - Ayudan según lo que saben hacer (carácter, intereses y nivel), no por una etiqueta fija: ver `aptitudDe`.
 * - `levels`: nivel por disciplina; los rivales progresan solos cada día.
 * - Escuchan `competicion.resultado` (evento compartido) de cualquier deporte.
 * - Publican el servicio `npcs` para que otros módulos los consulten.
 */

import { añadirDeporte, completarUnaCategoria, draftDeEquipos, renovarDeportistas } from './draft';
import { colocarDesplazados } from './fichajes';
import { equipoDelPersonajeEn, equiposDeUnaCategoria, idDelPersonaje, plantillaDeUnEquipo, JugadorEnClub, ListaDeTrabajo, MercadoDeFichajes, categoriasDelEquipo, claveDeEquipo, reclutarDeportistas, reclutarEnTodos, sinDeporte } from './plantillas';
import { categoriaDe, consejoDeUnProfesor, plazaEnElEquipo, piernaDe, puestosDelPersonaje, valoracionDe, valoresGuardados } from './plaza';
import { entrenadoresDeEquiposExtra, entrenadoresDeUnDeporte } from './draft';
export * from './plaza';
export * from './plantillas';
export * from './fichajes';
export * from './draft';

const mediaDe = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
export interface Npc {
  id: string;
  /** Nombre completo. */
  name: string;
  /** Nombre de pila (compuesto o no) y apodo, si tiene (al azar o puesto por el jugador). */
  nombrePila?: string;
  apodo?: string;
  role: NpcRole;
  gender: Gender;
  tags: string[];
  levels: Record<string, number>;
  /** Origen, apariencia, carácter, intereses y gustos. */
  rasgos?: RasgosDe;
  /** Lo que heredó de sus padres (topes, perks, ventaja de crianza y lo que ellos practicaron): lo tienen los niños, y de ahí sale qué deporte les encaja. */
  genetica?: Genetica;
  /** Colegio al que va si no es el del personaje: uno de `COLEGIOS_DE_FUERA` o `ninguno` (ya no va al colegio). Ausente: el del personaje (si es alumno) o el que le da `colegioDeFuera`. */
  colegio?: string;
  /** Equipo o club de su deporte en el que juega (id del club) y deportes que ha dejado (para que no lo vuelvan a reclutar). */
  equipo?: string;
  dejado?: string[];
  /** Deportes de los que lo han echado del equipo (por entrar el personaje en su plaza): no se le vuelve a reclutar hasta el curso siguiente. */
  apartado?: string[];
  /** Sus 18 capacidades reales (`gen.*`, en el orden de `CAPACIDADES_GENETICAS`), y el máximo que alcanzó cada una. Los niños con genética las tienen (plan `MISMAS_REGLAS.md`). */
  cap?: number[];
  pico?: number[];
  /** Cuándo entrenó por última vez cada capacidad con la rutina de su deporte (días de la partida; ausente = nunca). */
  capUlt?: number[];
  /** Las habilidades y el conocimiento de cada deporte que juega o ha jugado (las mismas que el personaje; ver `rutina.ts`). Su `levels` es el rendimiento calculado con ellas. */
  hab?: Record<string, HabilidadesDe>;
  /** Cómo está para jugar: condición física, moral, forma y salud (y semanas de baja por lesión). Los que juegan a un deporte con rutina lo tienen (`estado-de-jugador.ts`). */
  estado?: EstadoDeJugador;
  /** Lo que ha competido en cada deporte (resumen: pruebas, victorias, podios, mejor marca y las últimas). */
  historial?: Record<string, HistorialDeDeporte>;
  /** Su pierna buena (diestro o zurdo): un rasgo estable. Sale de un sorteo suyo con la proporción de zurdos del deporte (en torno a un 20 %), igual que el personaje; se guarda al empezar a jugar. */
  pierna?: Pierna;
  /** En los deportes con puestos: el puesto en que juega en su equipo (id del puesto) y el que prefiere (el favorito, aquel en que más valía al empezar), por deporte. */
  puesto?: Record<string, string>;
  /** Las temporadas que lleva jugando en un equipo de cada deporte (con ellas y lo que vale en su puesto se forma su puesto favorito: `preferenciaDe`). */
  temporadas?: Record<string, number>;
  /** Sus estadísticas de la temporada en cada deporte de equipo (F2.4): partidos, titularidades, minutos, goles, asistencias y nota. Las mismas que guarda el personaje. */
  est?: Record<string, EstadisticasDeTemporada>;
  /** Sus temporadas ya cerradas, en forma compacta (`TemporadaCerrada`): el historial del jugador; no se tira nunca. */
  estHist?: Record<string, TemporadaCerrada[]>;
  /** Su experiencia (0 a 100) en cada puesto en que ha jugado, por deporte: se gana partido a partido (`experienciaTrasElPartido`). */
  exp?: Record<string, Record<string, number>>;
  /** El equipo (A, B, C o D) de su club y su categoría **durante toda la temporada**, por deporte: se fija en verano (`fijarEquipos`) y no cambia en el curso (decisión del usuario, 08/11/2026). */
  letra?: Record<string, 'A' | 'B' | 'C' | 'D'>;
  /** Los deportes en que juega **un año por encima de su edad** (el que sería titular en la categoría de arriba asciende: `completarUnaCategoria`). Un 1 por deporte. */
  adelanto?: Record<string, 1>;
  /**
   * Lo que vale en cada deporte que juega y en cada puesto, **calculado al crear la partida y al final de cada semana** (con la pierna ya contada): las consultas (la regla de plaza, los equipos,
   * las pruebas) solo lo leen, no lo recalculan. Se redondea a dos decimales.
   */
  vp?: Record<string, { valor: number; puestos?: Record<string, number> }>;
  /** Nivel máximo al que puede llegar cada disciplina. */
  potential: Record<string, number>;
  /** Ritmo de progreso por disciplina (1 = medio): lo constante y bien entrenado que es. Ausente = 1. */
  ritmo?: Record<string, number>;
  /** Día de nacimiento respecto al inicio de la partida (negativo si nació antes). Solo los que tienen edad. */
  nacimiento?: number;
  /** Años de adelanto (+) o retraso (−) en su desarrollo físico. */
  desfase?: number;
  /** ¿El personaje ya lo conoce? Los rivales se conocen al competir contra ellos. Ausente = sí. */
  known?: boolean;
  /** Club al que pertenece (los rivales). */
  club?: string;
  /** Entrenadores: edades de los deportistas a los que entrenan. */
  edades?: [number, number];
  /** Puntuación típica de estatura (hermanos y padres, que la heredan); el resto la saca de un hash de su id (`estaturaZ`). */
  estatura?: number;
  /** Perks (rasgos genéticos especiales) de rivales y hermanos: se les asignan al crearlos; no se enseñan (revelarlos es cosa de los eventos o de un personaje muy perspicaz). */
  perks?: PerksDe;
  /** Padres: índice de su profesión (`OFICIOS_DE_PADRES`), según la semilla de la partida. */
  oficio?: number;
  /** Lo que el personaje ha averiguado preguntando (se suma a lo que sabe por defecto). */
  aprendido?: DatoPersonal[];
  /** Tipos de agenda: de ellos sale dónde está a cada hora (ver `contracts/agendas.ts`). */
  tipos?: TipoAsignado[];
  /** Deporte que practica (deportistas) o al que se dedica (entrenadores): su id. Ausente = ninguno (los niños que no han sido reclutados). */
  deporte?: string;
  /** Entrenadores: a qué se dedican («de atletismo») y dónde trabajan, guardados con ellos para no depender del módulo del deporte. */
  dedicacion?: string;
  trabajo?: string;
  description?: string;
}

/** Un equipo o club con su plantilla ya sorteada y su nombre y calidad resueltos con los datos del país. */
export interface EquipoGuardado extends EquipoDeDeporte {
  nombre: string;
  calidad: 1 | 2 | 3;
  /** Cuántos niños tiene aproximadamente (sorteado entre su plantilla mínima y máxima al crear la partida). */
  objetivo: number;
  /**
   * Cuántos equipos tiene el club en cada categoría (id → número; ausente = 1). Los abre el club cuando quedan sin equipo tantos interesados como el mínimo de una plantilla
   * (el «draft», `draftDeEquipos`) y los cierra si no llega al mínimo de jugadores. La plantilla del club en esa categoría es el máximo de un equipo por el número de equipos.
   */
  equiposPorCategoria?: Record<string, number>;
}

/**
 * Lo que un deporte pidió de la gente, guardado con la partida: con ello `npcs` sigue reclutando y renovando a los niños de ese deporte cada curso aunque el
 * módulo del deporte ya no esté cargado (plan de deportes §5).
 */
export interface PoblacionGuardada extends Omit<PoblacionDeDeporte, 'equipos'> {
  deporte: string;
  /** Nombre del deporte en minúscula para los textos («atletismo»). */
  nombre: string;
  /** ¿Es el primer deporte de la partida? Sus entrenadores llevan los ids de siempre (`entrenador`, `entrenador_<club>_N`). */
  primero: boolean;
  equipos: EquipoGuardado[];
  /** Las categorías del deporte en el país de la partida (para los equipos por categoría). Ausente en partidas anteriores. */
  categorias?: CategoriaDef[];
  /** Cómo se llaman sus clubes (id → nombre del sitio donde trabajan), para decir dónde trabajan los entrenadores. */
  nombresDeClub: Record<string, string>;
}

/** Lo que hizo un jugador en una temporada (curso) en una categoría y con un club: una entrada por temporada para su historial de siempre (lo que pedirá un ojeador o un mánager). */
export interface TemporadaDeJugador {
  curso: number;
  categoria: string;
  club: string;
  pruebas: number;
  victorias: number;
  podios: number;
  mejorMarca?: number;
}

/**
 * El historial de un jugador en un deporte, compacto: totales, una entrada por temporada y sus últimas competiciones (semana absoluta, tipo, puesto en la clasificación general,
 * total de corredores, marca y su serie).
 */
export interface HistorialDeDeporte {
  pruebas: number;
  victorias: number;
  podios: number;
  mejorMarca?: number;
  temporadas?: TemporadaDeJugador[];
  ultimas: [number, string, number, number, number, number?][];
}
/** Cuántas competiciones recientes se guardan por jugador y deporte (los totales y las temporadas no se recortan). */
export const ULTIMAS_COMPETICIONES = 12;

/** Los datos de una competición para anotar en el historial de un jugador. */
export interface CompeticionAnotada {
  semana: number;
  tipo: string;
  puesto: number;
  total: number;
  marca: number;
  serie?: number;
  curso?: number;
  categoria?: string;
  club?: string;
}

/** Anota una competición en el historial de un deporte (puro): totales, la entrada de su temporada y las últimas. */
export function anotarCompeticion(h: HistorialDeDeporte | undefined, c: CompeticionAnotada): HistorialDeDeporte {
  const base = h ?? { pruebas: 0, victorias: 0, podios: 0, ultimas: [] };
  const gana = c.puesto === 1 ? 1 : 0;
  const podio = c.puesto <= 3 ? 1 : 0;
  let temporadas = base.temporadas;
  if (c.curso !== undefined) {
    const lista = [...(temporadas ?? [])];
    const i = lista.findIndex((x) => x.curso === c.curso && x.categoria === (c.categoria ?? '') && x.club === (c.club ?? ''));
    const antes = i >= 0 ? lista[i] : { curso: c.curso, categoria: c.categoria ?? '', club: c.club ?? '', pruebas: 0, victorias: 0, podios: 0 };
    const nueva: TemporadaDeJugador = { ...antes, pruebas: antes.pruebas + 1, victorias: antes.victorias + gana, podios: antes.podios + podio, mejorMarca: antes.mejorMarca === undefined ? c.marca : Math.min(antes.mejorMarca, c.marca) };
    if (i >= 0) lista[i] = nueva;
    else lista.push(nueva);
    temporadas = lista;
  }
  return {
    pruebas: base.pruebas + 1,
    victorias: base.victorias + gana,
    podios: base.podios + podio,
    mejorMarca: base.mejorMarca === undefined ? c.marca : Math.min(base.mejorMarca, c.marca),
    ...(temporadas ? { temporadas } : {}),
    ultimas: [...base.ultimas, [c.semana, c.tipo, c.puesto, c.total, c.marca, c.serie] as [number, string, number, number, number, number?]].slice(-ULTIMAS_COMPETICIONES),
  };
}

export interface NpcsState {
  npcs: Npc[];
  /** Lo que ha pedido cada deporte de la partida, en orden. Ausente en partidas anteriores. */
  poblaciones?: PoblacionGuardada[];
  /** Semilla de la partida: de ella salen los niños de otros colegios que los clubes pueden reclutar. */
  semilla?: number;
  /** Cuántos niños han dejado el deporte para siempre en cada nuevo curso por no encontrar club (desplazados que ningún club quiso), por curso: para vigilar que los equipos no se vacían. */
  dejanSinClub?: Record<number, number>;
  /** El puesto en que juega el personaje en el equipo de su club, por deporte (el que le ofreció el club al entrar): cuenta como un jugador más del equipo en los fichajes de verano. */
  puestoDelPersonaje?: Record<string, string>;
}

/**
 * La gente de un deporte la pide cada deporte como dato (`PoblacionDeDeporte`, en sus datos por país) y `npcs` la guarda con la partida
 * (`PoblacionGuardada`). Los niños se crean con su genética y sus gustos y los clubes y equipos de cada deporte reclutan a los que mejor encajan (ver
 * `reclutarDeportistas`). Un deportista lleva su deporte (`Npc.deporte`) y el equipo en el que juega (`Npc.equipo`).
 */

/**
 * El país de la partida mientras se genera la gente (sus orígenes siguen la demografía del país y sus nombres, su cultura). Las funciones de
 * generación solo reciben el azar, así que el país se fija en la entrada (`conPais`) y se restablece al salir.
 */
let PAIS_GENERANDO: PaisDef = paisPorId('espana');
function conPais<T>(pais: PaisDef, hacer: () => T): T {
  const antes = PAIS_GENERANDO;
  PAIS_GENERANDO = pais;
  try {
    return hacer();
  } finally {
    PAIS_GENERANDO = antes;
  }
}
const rasgosDeAqui = (rng: Rng, opciones: Parameters<typeof rasgosAlAzar>[1] = {}): RasgosDe => rasgosAlAzar(rng, { ...opciones, demografia: PAIS_GENERANDO.demografia });

export const clamp = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));

/**
 * La identidad de una persona nueva según su origen, sin repetir a nadie del mundo: se permiten dos homónimos como mucho y de «momentos» distintos
 * (15 años o más de diferencia de nacimiento: el hijo se puede llamar como su padre, pero no hay dos «Nicolás Sánchez» en el mismo colegio).
 */
function nombreUnico(rng: Rng, g: Gender, origen: OrigenFamiliar, edad: number, nacimiento: number, usados: RegistroDeNombres): { identidad: Identidad; completo: string; nombrePila: string; apodo?: string } {
  let identidad = identidadAlAzar(rng, g, origen, { edad, pais: PAIS_GENERANDO });
  for (let i = 0; i < 60 && !nombrePermitido(usados, nombreCompleto(identidad, g), nacimiento); i++) identidad = identidadAlAzar(rng, g, origen, { edad, pais: PAIS_GENERANDO });
  const completo = nombreCompleto(identidad, g);
  registrarNombre(usados, completo, nacimiento);
  return { identidad, completo, ...datosDeNombre(identidad, completo) };
}

/** El nombre de pila y el apodo al azar de una identidad (para guardarlos con la persona). */
const datosDeNombre = (identidad: Identidad, completo: string): { nombrePila: string; apodo?: string } => {
  const apodo = apodoAlAzar(completo, identidad.pila);
  return { nombrePila: identidad.pila, ...(apodo ? { apodo } : {}) };
};

/** El registro de nombres de lo que ya hay (para añadir gente nueva sin repetir). */
export const registroDe = (npcs: readonly Npc[]): RegistroDeNombres => {
  const r: RegistroDeNombres = new Map();
  for (const n of npcs) registrarNombre(r, n.name, n.nacimiento ?? 0);
  return r;
};

export { desarrolloRival };

/**
 * Edad de competición de un NPC con fecha de nacimiento: año del curso menos año de nacimiento. Es la que decide su
 * categoría (no la edad exacta) y no cambia durante el curso. `primerDiaDelCurso` es el día en que empezó el curso.
 */
export const edadNpc = (n: Npc, primerDiaDelCurso: number): number | undefined =>
  n.nacimiento === undefined ? undefined : edadDeCompeticion(n.nacimiento, primerDiaDelCurso);

/** La edad con la que juega un niño en los equipos de su deporte: la suya (el primer día del curso) y, si juega un año por encima (`adelanto`), una más. Decide su categoría y su año en ella. */
export const edadDeJuego = (n: Npc, primerDiaDelCurso: number): number | undefined => {
  const edad = edadNpc(n, primerDiaDelCurso);
  return edad === undefined ? undefined : edad + (n.deporte !== undefined && n.adelanto?.[n.deporte] ? 1 : 0);
};

/**
 * Población del colegio y del barrio (ver `docs/ANEXO_HORARIOS_PNJ.md`): 24 compañeros de tu clase (con los 2 del reparto),
 * otros 25 de la otra clase de tu curso, ~150 alumnos de los demás cursos, 11 profesores más (con el tutor son 12), un equipo
 * de atletismo del colegio de 16 alumnos y 80 vecinos de todas las edades. Todos son desconocidos hasta que se habla con ellos.
 */
/** La ciudad de la partida mientras se genera la gente: cuántos colegios, clases y vecinos hay (datos del país; ver `CiudadDef`). */
const ciudad = (): CiudadDef => PAIS_GENERANDO.ciudad ?? CIUDAD_ACTUAL;
/** Los compañeros de tu clase (sin ti) y los alumnos por curso del colegio (todas sus clases, la tuya incluida). */
const companerosDeClase = (): number => ciudad().alumnosPorAula - 1;
const alumnosPorCurso = (): number => ciudad().aulasPorCurso * ciudad().alumnosPorAula;
/** Jóvenes de cada edad que ya no van al colegio (18 y 19 años): tantos como alumnos por curso tienen los colegios de fuera juntos. */
const jovenesPorEdad = (): number => ciudad().alumnosPorCursoDeCadaColegio * ciudad().colegiosDeFuera;
/** A esta edad (de competición) los jóvenes de otros colegios dejan de formar parte del barrio. */
const EDAD_FIN_JOVENES = 20;
export const descripcionDeOtroColegio = (g: Gender): string => (g === 'f' ? 'Alumna de otro colegio.' : 'Alumno de otro colegio.');
const EDAD_ALUMNO_MIN = 8;
/** A esta edad (de competición) se termina el colegio: 2.º de bachillerato es a los 17. */
export const EDAD_FIN_COLEGIO = 18;
/** Qué profesor da cada asignatura (número de `profesor_N`, por orden de `ASIGNATURAS_DE_PROFESORES`): al ir a su clase se presenta. */
const PROFESOR_DE_ASIGNATURA: Readonly<Record<string, number>> = {
  'estudios.lengua': 1, 'estudios.matematicas': 2, 'estudios.ingles': 3, 'estudios.educacion_fisica': 4,
  'estudios.naturales': 5, 'estudios.biologia': 5, 'estudios.sociales': 6, 'estudios.economia': 6,
  'estudios.artistica': 7, 'estudios.musica': 7, 'estudios.tecnologia': 8,
  'estudios.fisica_quimica': 9, 'estudios.fisica': 9, 'estudios.quimica': 9,
  'estudios.filosofia': 10, 'estudios.latin': 10,
  'estudios.historia': 11, 'estudios.historia_espana': 11, 'estudios.historia_arte': 11,
};
/** Las asignaturas (ids de las stats) que da un profesor (`profesor_N`), a partir de `PROFESOR_DE_ASIGNATURA`. */
const asignaturasDe = (id: string): string[] => {
  const numero = Number(/^profesor_(\d+)$/.exec(id)?.[1]);
  return numero ? Object.entries(PROFESOR_DE_ASIGNATURA).filter(([, n]) => n === numero).map(([stat]) => stat) : [];
};
const ASIGNATURAS_DE_PROFESORES = ['Lengua', 'Matemáticas', 'Inglés', 'Educación física', 'Ciencias', 'Ciencias sociales', 'Artística y música', 'Tecnología', 'Física y química', 'Filosofía', 'Historia'];

/**
 * Una persona sin más: desconocida, con edad y aspecto, sin nivel deportivo. Los niños (`conGenetica`) llevan además lo que heredaron de sus padres,
 * y de ello sale, con sus gustos, a qué deporte les encaja ser reclutados.
 */
export function persona(rng: Rng, id: string, role: NpcRole, edad: number, dia: number, usados: RegistroDeNombres, tipos: TipoAsignado[], descripcion: (g: Gender) => string, tags: string[] = [], conGenetica = false): Npc {
  const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
  const gustos = rasgosDeAqui(rng);
  const nacimiento = primerDiaDelAnio(anioNatural(dia) - edad) + rng.int(0, 364);
  const nombre = nombreUnico(rng, gender, gustos.origen, edad, nacimiento, usados);
  const genetica = conGenetica ? geneticaDeNino(rng, id) : undefined;
  const rasgos = genetica ? aficionadoPorLosPadres(gustos, genetica.padres, rng) : gustos;
  return {
    id,
    name: nombre.completo,
    nombrePila: nombre.nombrePila,
    ...(nombre.apodo ? { apodo: nombre.apodo } : {}),
    role,
    gender,
    tags,
    levels: {},
    potential: {},
    rasgos,
    nacimiento,
    known: false,
    tipos,
    ...(genetica ? { genetica, perks: genetica.perks, desfase: genetica.desfase } : {}),
    description: descripcion(gender),
  };
}

function poblarElColegio(rng: Rng, usados: RegistroDeNombres, existentes: number): Npc[] {
  const o = (g: Gender, f: string, m: string) => (g === 'f' ? f : m);
  const alumno = (id: string, edad: number, desc: (g: Gender) => string, tuClase = false): Npc => persona(rng, id, 'companero', edad, 0, usados, [{ tipo: 'alumno', ...(tuClase ? { tuClase: true } : {}) }], desc, [], true);
  const tuClase = Array.from({ length: companerosDeClase() - existentes }, (_, i) => alumno(`clase_${i + 1}`, EDAD_ALUMNO_MIN, (g) => o(g, 'Compañera de tu clase.', 'Compañero de tu clase.'), true));
  // Las demás clases de tu curso (con una sola clase por curso no hay otra).
  const otraClase = Array.from({ length: (ciudad().aulasPorCurso - 1) * ciudad().alumnosPorAula }, (_, i) => alumno(`curso_${i + 1}`, EDAD_ALUMNO_MIN, (g) => o(g, 'Alumna de la otra clase de tu curso.', 'Alumno de la otra clase de tu curso.')));
  const otrosCursos: Npc[] = [];
  for (let edad = EDAD_ALUMNO_MIN + 1; edad < EDAD_FIN_COLEGIO; edad++) {
    for (let i = 0; i < alumnosPorCurso(); i++) otrosCursos.push(alumno(`alumno_${otrosCursos.length + 1}`, edad, (g) => o(g, 'Alumna del colegio.', 'Alumno del colegio.')));
  }
  const profesores = ASIGNATURAS_DE_PROFESORES.map((materia, i) =>
    persona(rng, `profesor_${i + 1}`, 'profesor', rng.int(28, 60), 0, usados, [{ tipo: 'profesor' }], (g) => `${o(g, 'Profesora', 'Profesor')} de ${materia.toLowerCase()}.`, ['profesor']),
  );
  const vecinos = Array.from({ length: ciudad().vecinos }, (_, i) => {
    const r = rng.next();
    const edad = r < 0.15 ? rng.int(5, 12) : r < 0.25 ? rng.int(13, 17) : rng.int(18, 75);
    const id = `vecino_${i + 1}`;
    // Los niños del barrio van a un colegio de fuera: también pueden ser reclutados por un club.
    const nino = edad < EDAD_FIN_COLEGIO;
    const vecino = persona(rng, id, 'vecino', edad, 0, usados, [{ tipo: 'vecino' }], (g) => o(g, 'Vecina del barrio.', 'Vecino del barrio.'), [], nino);
    return nino ? { ...vecino, colegio: colegioDeFuera(id, ciudad().colegiosDeFuera) } : vecino;
  });
  return [...tuClase, ...otraClase, ...otrosCursos, ...profesores, ...vecinos, ...ninosDeOtrosColegios(rng, usados, 0, 1)];
}

/**
 * Los niños de otros colegios, a todos: personas del barrio con su genética (`nino_N`), jueguen o no a algún deporte. Al crear la partida, de 8 años a los
 * que ya terminaron el colegio (18 y 19 años, sin colegio); cada curso, solo los que entran con 8 años. `desde` es el número del primero.
 */
function ninosDeOtrosColegios(rng: Rng, usados: RegistroDeNombres, dia: number, desde: number, soloEntrantes = false): Npc[] {
  const lista: Npc[] = [];
  const nino = (colegio: string, edad: number): void => {
    lista.push({ ...persona(rng, `nino_${desde + lista.length}`, 'vecino', edad, dia, usados, [{ tipo: 'vecino' }], descripcionDeOtroColegio, [], true), colegio });
  };
  for (const colegio of idsDeColegiosDeFuera(ciudad())) {
    for (let edad = EDAD_ALUMNO_MIN; edad < (soloEntrantes ? EDAD_ALUMNO_MIN + 1 : EDAD_FIN_COLEGIO); edad++) {
      for (let i = 0; i < ciudad().alumnosPorCursoDeCadaColegio; i++) nino(colegio, edad);
    }
  }
  if (!soloEntrantes) {
    for (let edad = EDAD_FIN_COLEGIO; edad < EDAD_FIN_JOVENES; edad++) for (let i = 0; i < jovenesPorEdad(); i++) nino('ninguno', edad);
  }
  return lista;
}

/**
 * Nuevo curso: quien acaba el colegio se va y entra un niño de 8 años (con su genética y sin deporte: los equipos reclutan después). Los niños de otros
 * colegios hacen lo mismo: los que acaban el colegio pasan a no tener colegio, los que cumplen 20 años salen del barrio y cada colegio recibe sus nuevos alumnos.
 */
function renovarAlumnos(npcs: Npc[], dia: number, rng: Rng): Npc[] {
  const usados = registroDe(npcs);
  let num = npcs.reduce((m, n) => Math.max(m, Number(/^alumno_(\d+)$/.exec(n.id)?.[1] ?? 0)), 0) + 1;
  const sale = (n: Npc) => n.role === 'companero' && n.nacimiento !== undefined && (edadNpc(n, dia) ?? 0) >= EDAD_FIN_COLEGIO;
  const esDeFuera = (n: Npc) => /^nino_\d+$/.test(n.id);
  const seVa = (n: Npc) => esDeFuera(n) && (edadNpc(n, dia) ?? 0) >= EDAD_FIN_JOVENES;
  const nuevos = npcs.filter(sale).map((viejo) =>
    persona(rng, `alumno_${num++}`, 'companero', EDAD_ALUMNO_MIN, dia, usados, (viejo.tipos ?? [{ tipo: 'alumno' }]).filter((t) => t.tipo === 'alumno'), (g) => (g === 'f' ? 'Alumna del colegio.' : 'Alumno del colegio.'), [], true)
  );
  const desde = npcs.reduce((m, n) => Math.max(m, Number(/^nino_(\d+)$/.exec(n.id)?.[1] ?? 0)), 0) + 1;
  const quedan = npcs.filter((n) => !sale(n) && !seVa(n)).map((n) => (esDeFuera(n) && n.colegio !== 'ninguno' && (edadNpc(n, dia) ?? 0) >= EDAD_FIN_COLEGIO ? { ...n, colegio: 'ninguno' } : n));
  return [...quedan, ...nuevos, ...ninosDeOtrosColegios(rng, usados, dia, desde, true)];
}

/** Edad a la que empieza el personaje y desde la que se compite (el primer curso del juego). */
const EDAD_DE_INICIO = 8;
/**
 * El padre y la madre como personas con las que relacionarse (rol `familia`, etiqueta `progenitor`): el mismo nombre y los mismos rasgos
 * que en el módulo `familia`, que los saca de la semilla. Viven en casa y salen a trabajar. No llevan edad aquí (la ficha está en `familia`).
 */
function progenitores(ctx: InitContext, usados: RegistroDeNombres): Npc[] {
  return (['padre', 'madre'] as const).map((id) => {
    const gender: Gender = id === 'padre' ? 'm' : 'f';
    // Su nombre y apellidos salen de su origen y de la semilla (los hijos llevan el primer apellido de cada uno).
    const name = nombreCompletoDeProgenitor(ctx.seed, id, ctx.pais);
    registrarNombre(usados, name, nacimientoDeProgenitor(ctx.seed, id));
    const nombrePila = nombreDeProgenitor(ctx.seed, id, ctx.pais);
    const apodo = apodoAlAzar(name, nombrePila);
    return {
      id,
      name,
      nombrePila,
      ...(apodo ? { apodo } : {}),
      role: 'familia' as NpcRole,
      gender,
      tags: ['progenitor'],
      levels: {},
      potential: {},
      // Misma fecha de nacimiento y misma estatura que en el módulo `familia` (salen de la semilla y de la herencia).
      nacimiento: nacimientoDeProgenitor(ctx.seed, id),
      estatura: ctx.herencia('estatura')[id],
      rasgos: ctx.rasgosDePadres[id],
      tipos: [{ tipo: 'progenitor' as const }],
      oficio: oficioDeProgenitorAlAzar(ctx.seed, id),
      description: id === 'padre' ? 'Tu padre. Vive en casa.' : 'Tu madre. Vive en casa.',
    };
  });
}

/** Edad de los hermanos a la que empiezan el colegio (a los 18 lo terminan, como el resto del alumnado). */
const EDAD_COLEGIO_HERMANOS = 3;
/** Los tipos de agenda de un hermano: va al colegio si tiene edad y, si practica un deporte, compite en su jornada (y sigue los tipos de su club). */
const tiposDeHermano = (edad: number, deporte: string | undefined, otros: readonly TipoAsignado[] = []): TipoAsignado[] => [
  { tipo: 'hermano', ...(edad < 8 ? { duerme: true } : {}), ...(edad >= EDAD_COLEGIO_HERMANOS && edad < EDAD_FIN_COLEGIO ? { escolar: true } : {}), ...(deporte ? { deporte } : {}) },
  ...otros.filter((t) => t.tipo !== 'hermano'),
];

/** Cada curso, los hermanos que cumplen la edad del colegio entran y los que acaban salen (los tipos de su deporte y su club se conservan). */
function actualizarHermanos(npcs: Npc[], dia: number): Npc[] {
  return npcs.map((n) => {
    if (!n.tags.includes('hermano')) return n;
    const tipos = tiposDeHermano(edadNpc(n, dia) ?? EDAD_DE_INICIO, n.deporte, n.tipos ?? []);
    return JSON.stringify(tipos) === JSON.stringify(n.tipos) ? n : { ...n, tipos };
  });
}

/**
 * Los hermanos del personaje (0 a 3): hijos de los mismos padres, con el mismo proceso de herencia (la mitad de las capacidades físicas de cada padre
 * ±20 %, carácter e intereses heredados). Son niños como los demás del colegio: si les encaja un deporte, un club los recluta (ver `reclutarDeportistas`)
 * y compiten en el que les corresponda; los que aún no tienen 8 años pueden ser reclutados al cumplirlos.
 */
export function hermanos(ctx: InitContext, usados: RegistroDeNombres): Npc[] {
  const { rng } = ctx;
  const padres = padresDeSemilla(ctx.seed, ctx.pais);
  const diferencias = diferenciasDeEdad(numeroDeHermanos(rng), rng);
  const rasgosPadre = ctx.rasgosDePadres.padre;
  const rasgosMadre = ctx.rasgosDePadres.madre;
  return diferencias.map((dif, i) => {
    const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
    const id = `hermano_${i + 1}`;
    // Hereda como el personaje: cada capacidad física de UN padre (la mitad de cada uno), con su tope ±20 %; sus perks, de los mismos padres (con un generador propio de cada hermano).
    const genetica = geneticaDeHermano(rng, ctx.topesDePadres, ctx.perksDePadres, rngEstable('perks', ctx.seed, id), ctx.seed, id);
    const edad = EDAD_DE_INICIO + dif;
    const nacimiento = primerDiaDelAnio(anioNatural(0) - edad) + rng.int(0, 364);
    const rasgos = rasgosHeredadosNpc(rasgosPadre, rasgosMadre, rng);
    // Su nombre sale del origen de sus padres y lleva el primer apellido de cada uno; puede llamarse como su padre o su madre (15 años de diferencia), no como otro niño.
    let identidad = identidadDeHijo(rng, gender, padres.padre.identidad, padres.madre.identidad, rasgos.origen, { edad, pais: PAIS_GENERANDO });
    for (let k = 0; k < 60 && !nombrePermitido(usados, nombreCompleto(identidad, gender), nacimiento); k++) identidad = identidadDeHijo(rng, gender, padres.padre.identidad, padres.madre.identidad, rasgos.origen, { edad, pais: PAIS_GENERANDO });
    const nombre = nombreCompleto(identidad, gender);
    registrarNombre(usados, nombre, nacimiento);
    const apodo = apodoAlAzar(nombre, identidad.pila);
    const relacion = relacionDeHermano(gender, dif);
    return {
      id,
      name: nombre,
      nombrePila: identidad.pila,
      ...(apodo ? { apodo } : {}),
      role: 'familia' as NpcRole,
      gender,
      tags: ['hermano'],
      levels: {},
      potential: {},
      perks: genetica.perks,
      genetica,
      nacimiento,
      // Estatura: parecida a la de sus padres (media de los dos, algo atenuada) más una variación propia.
      estatura: (ctx.herencia('estatura').padre + ctx.herencia('estatura').madre) * 0.45 + estaturaZ(id) * 0.6,
      desfase: genetica.desfase,
      rasgos,
      tipos: tiposDeHermano(edad, undefined),
      description: `${relacion}. Vive en casa.`,
    };
  });
}

function generarReparto(ctx: InitContext, pob: PoblacionGuardada | undefined): Npc[] {
  const { rng } = ctx;
  const usados: RegistroDeNombres = new Map();
  /** `extra` puede ser una función del género para concordar la descripción. */
  const npc = (id: string, role: NpcRole, extra: (g: Gender) => Partial<Npc>, edad: number): Npc => {
    const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
    const extras = extra(gender);
    const nacimiento = nacimientoParaEdad(id, edad);
    const nombre = nombreUnico(rng, gender, extras.rasgos?.origen ?? [{ id: 'espana_centro', peso: 1 }], edad, nacimiento, usados);
    return {
    id,
    name: nombre.completo,
    nombrePila: nombre.nombrePila,
    ...(nombre.apodo ? { apodo: nombre.apodo } : {}),
    role,
    gender,
    tags: [],
    levels: {},
    potential: {},
    // Quien te rodea al empezar es desconocido: se conoce hablando con él o con ella (el entrenador, al apuntarte a su club).
    known: false,
    nacimiento,
    ...extras,
    };
  };
  const o = (g: Gender, f: string, m: string) => (g === 'f' ? f : m);

  return [
    ...(pob ? [nuevoEntrenador(rng, pob, usados, { id: 'entrenador', club: 'colegio', edades: [0, 99], edad: [28, 55], descripcion: pob.entrenadores.descripcionDelColegio })] : []),
    npc('tutor', 'profesor', (g) => ({
      rasgos: rasgosDeAqui(rng, { sesgoCaracter: { disciplina: 15, honestidad: 10 }, interesesPreferidos: ['estudio', 'lectura'] }),
      tags: ['estudio', 'mentor'],
      description: `${o(g, 'Tu tutora', 'Tu tutor')}. Exigente pero ${o(g, 'justa', 'justo')}.`,
      tipos: [{ tipo: 'profesor' }],
    }), edadAdultaDe('tutor', 28, 60)),
    npc('companero_estudio', 'companero', (g) => ({
      rasgos: rasgosDeAqui(rng, { sesgoCaracter: { disciplina: 15, sociabilidad: -5 }, interesesPreferidos: ['estudio', 'tecnologia'] }),
      tags: ['estudio'],
      description: `${o(g, 'Compañera de clase aplicada', 'Compañero de clase aplicado')}.`,
      tipos: [{ tipo: 'alumno', tuClase: true }],
    }), EDAD_ALUMNO_MIN),
    npc('companero_social', 'companero', () => ({
      rasgos: rasgosDeAqui(rng, { sesgoCaracter: { sociabilidad: 20, optimismo: 8 }, interesesPreferidos: ['videojuegos', 'cine', 'musica'] }),
      tags: ['social'],
      description: 'Conoce a todo el mundo en el colegio.',
      tipos: [{ tipo: 'alumno', tuClase: true }],
    }), EDAD_ALUMNO_MIN),
    ...progenitores(ctx, usados),
    ...hermanos(ctx, usados),
  ];
}

/**
 * Lo que pide un deporte de la gente, con los datos del país de la partida, para guardarlo: sus equipos con su nombre, su calidad y su plantilla ya sorteada
 * (entre el mínimo y el máximo, con un generador propio del equipo y la partida). `primero` es si es el primer deporte de la partida (sus entrenadores
 * llevan los ids de siempre).
 */
function poblacionDe(ctx: Pick<ReadContext, 'aportes' | 'pais'>, ficha: FichaDeDeporte, primero: boolean, semilla: number): PoblacionGuardada {
  const datos = datosDeDeporte(ctx, ficha.id);
  const nombresDeClub: Record<string, string> = Object.fromEntries(datos.clubes.map((c) => [c.id, c.esColegio ? COLEGIO_DEL_PERSONAJE : c.nombre]));
  const equipos: EquipoGuardado[] = datos.poblacion.equipos.map((e) => {
    const catalogo = datos.clubes.find((c) => c.id === e.club);
    return {
      ...e,
      nombre: e.nombre ?? catalogo?.nombre ?? e.club,
      calidad: e.tamano ? CALIDAD_DE_TAMANO[e.tamano] : (e.calidad ?? catalogo?.calidad ?? (e.colegio ? 1 : 2)),
      // Los equipos por categoría no tienen un objetivo del club: cada categoría reclutará entre su mínimo y su máximo.
      objetivo: e.plantilla ? rngEstable('plantilla', semilla, ficha.id, e.club).int(e.plantilla.min, e.plantilla.max) : 0,
    };
  });
  const pob: PoblacionGuardada = JSON.parse(JSON.stringify({ ...datos.poblacion, equipos, categorias: datos.categorias, deporte: ficha.id, nombre: ficha.nombre.toLowerCase(), primero, nombresDeClub }));
  // Los clubes grandes tienen siempre dos equipos por categoría, el A y el B (por año: segundo año y primero); los C y D los abren cuando sus propios suplentes llegan al mínimo.
  for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria && x.calidad >= 3 && pob.puestos)) {
    e.equiposPorCategoria = Object.fromEntries(categoriasDelEquipo(pob, e).map((c) => [c.id, 2]));
  }
  return pob;
}

/** Lo que han pedido los deportes de la partida (en el orden de sus fichas). */
const poblacionesDe = (ctx: Pick<ReadContext, 'aportes' | 'pais'>, semilla: number): PoblacionGuardada[] => fichasDeDeporte(ctx).map((f, i) => poblacionDe(ctx, f, i === 0, semilla));

/** Marca a los niños con la semilla de la partida: sus sorteos estables (talento, aptitud, valor inicial, asistencia...) salen de su id y de ella, para que el mismo `nino_5` no sea igual en todas las partidas. */
export function conSemilla(npcs: Npc[], semilla: number): Npc[] {
  if (!npcs.some((n) => n.genetica && n.genetica.semilla === undefined)) return npcs;
  return npcs.map((n) => (n.genetica && n.genetica.semilla === undefined ? { ...n, genetica: { ...n.genetica, semilla } } : n));
}

// ---------------------------------------------------------------------------------------------------- capacidades reales

/** Da a los niños con genética que aún no las tienen sus capacidades con su historia hasta `dia` (al crear la partida, al llegar un niño nuevo, en partidas anteriores). */
export function conCapacidades(npcs: Npc[], dia: number): Npc[] {
  // Si nadie las necesita se devuelve la misma lista: cambiar la lista invalida las cachés de presencia y de consultas, que cuestan mucho más que esto.
  if (!npcs.some((n) => n.genetica && n.nacimiento !== undefined && !n.cap)) return npcs;
  return npcs.map((n) => {
    if (!n.genetica || n.nacimiento === undefined || n.cap) return n;
    const c = historiaDe(n.id, n.genetica, n.nacimiento, dia);
    return { ...n, ...c };
  });
}

/**
 * Lo mismo que `avanzarCapacidades`, pero **en el sitio**: cambia los números de las listas de cada niño sin cambiar la lista de personas. Es lo que se hace cada semana:
 * las capacidades todavía no las lee nadie desde fuera (las vistas y las cachés de presencia y de consultas no dependen de ellas) y crear una lista nueva cada semana
 * invalidaría esas cachés. Son datos del propio módulo (regla 5).
 */
export function avanzarCapacidadesEnSitio(npcs: readonly Npc[], dia: number): void {
  for (const n of npcs) {
    // Los que juegan a un deporte con rutina avanzan con ella (`semanaDeportiva`), que ya incluye el desarrollo natural y la caída de sus capacidades.
    if (!n.genetica || n.nacimiento === undefined || !n.cap || !n.pico || n.hab) continue;
    const c = { cap: n.cap, pico: n.pico, base: valoresIniciales(n.id, n.genetica) as number[] };
    avanzarSemana(c, n.genetica, n.nacimiento, dia);
    for (let i = 0; i < c.cap.length; i++) {
      c.cap[i] = Math.round(c.cap[i] * 100) / 100;
      c.pico[i] = Math.round(c.pico[i] * 100) / 100;
    }
  }
}

/** Una semana más para todos los que tienen capacidades: desarrollo natural y caída (las mismas reglas que el personaje). `dia` es el día en que acaba la semana. */
export function avanzarCapacidades(npcs: readonly Npc[], dia: number): Npc[] {
  return npcs.map((n) => {
    if (!n.genetica || n.nacimiento === undefined || !n.cap || !n.pico) return n;
    const c = { cap: [...n.cap], pico: [...n.pico], base: valoresIniciales(n.id, n.genetica) as number[] };
    avanzarSemana(c, n.genetica, n.nacimiento, dia);
    return { ...n, ...aGuardar(c) };
  });
}

// ---------------------------------------------------------------------------------------------------- habilidades reales de los que juegan

/** Cómo vale cada deporte de la partida a una persona: lo que aportan los módulos de deporte cargados (`APORTES.rendimientoDeDeporte`). */
export const rendimientosDe = (ctx: Pick<ReadContext, 'aportes'>): Rendimientos =>
  new Map(ctx.aportes<RendimientoDeDeporte>(APORTES.rendimientoDeDeporte).map((r) => [r.id, Object.assign((persona: LectorDePersona) => r.rendimiento(persona), r.puestos ? { puestos: r.puestos } : {})]));

/**
 * Da sus habilidades a los niños que juegan a un deporte con rutina y aún no las tienen (al crear la partida, al llegar un niño nuevo a un equipo): su historia, con el
 * juego informal y la rutina de su club desde que empezó (`historiaDeportiva`). Cambia sus capacidades también: la rutina las entrena. Los deportes sin rutina (o sin
 * módulo cargado) se quedan con el nivel de siempre.
 */
export function conHabilidades(npcs: Npc[], pobs: readonly PoblacionGuardada[], rend: Rendimientos, dia: number): Npc[] {
  const porDeporte = new Map(pobs.filter((p) => p.rutina && rend.has(p.deporte)).map((p) => [p.deporte, p]));
  if (!npcs.some((n) => n.deporte && porDeporte.has(n.deporte) && n.genetica && n.nacimiento !== undefined && !n.hab?.[n.deporte])) return npcs;
  return npcs.map((n) => {
    const pob = n.deporte ? porDeporte.get(n.deporte) : undefined;
    if (!pob || !n.genetica || n.nacimiento === undefined || n.hab?.[pob.deporte]) return n;
    const h = historiaDeportiva(n as never, pob.deporte, pob.rutina!, rend.get(pob.deporte)!, dia, (semana, hueco, lector) => listaDeSesion(pob.rutina!, (stat) => lector.stat(stat), [pob.deporte, n.equipo ?? n.id, 'sin-categoria', semana, hueco]));
    return { ...n, cap: h.cap, pico: h.pico, capUlt: h.capUlt, hab: { ...n.hab, [pob.deporte]: h.hab }, levels: { ...n.levels, [pob.deporte]: h.nivel }, vp: { ...n.vp, [pob.deporte]: valoresGuardados(n, pob, h.nivel, h.puestos) } };
  });
}

/**
 * Una semana de los niños que juegan a un deporte con rutina, **en el sitio** (no cambia la lista de personas): las sesiones de su club, la caída y el desarrollo de sus
 * capacidades y habilidades, y su rendimiento (`levels`) calculado con ellas. `fin` es el día en que acaba la semana. Los de un equipo con ejercicios elegidos por el
 * entrenador hacen todos los mismos, según lo que le falta al equipo.
 */
export function semanaDeportiva(npcs: readonly Npc[], pobs: readonly PoblacionGuardada[], rend: Rendimientos, fin: number, inicioCurso: number): void {
  for (const pob of pobs) {
    const r = pob.rutina;
    const f = rend.get(pob.deporte);
    if (!r || !f) continue;
    const jugadores = npcs.filter((n) => n.hab?.[pob.deporte] && n.genetica && n.nacimiento !== undefined && n.cap && n.pico);
    // Lo que le falta a cada equipo (club y categoría): la media de sus jugadores en cada habilidad. Los ejercicios de la sesión son los mismos para todos.
    const medias = r.ejercicios ? mediasDeLosEquipos(jugadores, pob, inicioCurso) : new Map<string, Record<string, number>>();
    for (const n of jugadores) {
      const clave = claveDeEquipoCategoria(pob, n, inicioCurso);
      const media = clave ? medias.get(clave) : undefined;
      const estado = n.estado ?? ESTADO_INICIAL;
      const res = semanaDeNino(n as never, pob.deporte, r, f, fin, (semana, hueco, lector) =>
        listaDeSesion(r, (stat) => media?.[stat] ?? lector.stat(stat), clave ? semillaDeSesionDeEquipo(pob.deporte, clave.split('|')[0], clave.split('|')[1], semana, hueco) : [pob.deporte, n.id, semana, hueco]),
        { baja: !!estado.baja, eficiencia: eficienciaDeEstado(estado) },
      );
      // Su estado pasa la semana: las sesiones lo cansan, descansa, se anima o se desanima y puede lesionarse (sus azares son solo suyos).
      const semanaAbs = semanaQueAcaba(fin);
      const semilla = n.genetica!.semilla ?? 0;
      const resil = (n.cap![CAPACIDADES_GENETICAS.indexOf('gen.resiliencia')] ?? 50) / 100;
      n.estado = pasoDeSemanaDelEstado(estado, {
        sesiones: res.sesiones,
        azarDeLesion: rngEstable('lesion', semilla, n.id, semanaAbs).next(),
        azarDeGravedad: rngEstable('gravedad', semilla, n.id, semanaAbs).next(),
        animo: resil,
        constitucion: n.cap![CAPACIDADES_GENETICAS.indexOf('gen.constitucion')] ?? 50,
      });
      n.cap!.splice(0, n.cap!.length, ...res.cap);
      n.pico!.splice(0, n.pico!.length, ...res.pico);
      n.capUlt = res.capUlt;
      n.hab![pob.deporte] = res.hab;
      n.levels[pob.deporte] = res.nivel;
      n.vp = { ...n.vp, [pob.deporte]: valoresGuardados(n, pob, res.nivel, res.puestos) };
    }
  }
}

/** El equipo de un jugador (club y categoría que le toca por edad de competición) como clave, o `undefined` si no está en un equipo. */
function claveDeEquipoCategoria(pob: PoblacionGuardada, n: Npc, inicioCurso: number): string | undefined {
  if (n.deporte !== pob.deporte || !n.equipo) return undefined;
  const edad = edadDeJuego(n, inicioCurso);
  const cat = edad === undefined ? undefined : categoriaDe(pob, edad);
  return `${n.equipo}|${cat?.id ?? 'sin-categoria'}`;
}

/** Lo que vale cada equipo (club y categoría) en cada habilidad del deporte: la media de sus jugadores. */
function mediasDeLosEquipos(jugadores: readonly Npc[], pob: PoblacionGuardada, inicioCurso: number): Map<string, Record<string, number>> {
  const r = pob.rutina!;
  const sumas = new Map<string, { n: number; v: number[] }>();
  for (const n of jugadores) {
    const clave = claveDeEquipoCategoria(pob, n, inicioCurso);
    if (!clave) continue;
    const e = sumas.get(clave) ?? { n: 0, v: r.stats.map(() => 0) };
    n.hab![pob.deporte].v.forEach((x, i) => (e.v[i] += x));
    e.n++;
    sumas.set(clave, e);
  }
  return new Map([...sumas].map(([clave, e]) => [clave, Object.fromEntries(r.stats.map((d, i) => [d.id, e.v[i] / e.n]))]));
}

/** Las medias de los equipos para el servicio, guardadas por lista de personas y semana (las listas de habilidades se cambian en el sitio cada semana). */
const MEDIAS_DE_EQUIPOS = new WeakMap<readonly Npc[], { semana: number; porDeporte: Map<string, Map<string, Record<string, number>>> }>();
export function nivelesDelEquipoDe(npcs: readonly Npc[], pobs: readonly PoblacionGuardada[], deporte: string, club: string, categoria: string, semana: number, inicioCurso: number): Record<string, number> | undefined {
  let c = MEDIAS_DE_EQUIPOS.get(npcs);
  if (!c || c.semana !== semana) MEDIAS_DE_EQUIPOS.set(npcs, (c = { semana, porDeporte: new Map() }));
  let m = c.porDeporte.get(deporte);
  if (!m) {
    const pob = pobs.find((p) => p.deporte === deporte);
    m = pob?.rutina ? mediasDeLosEquipos(npcs.filter((n) => n.hab?.[deporte] && n.nacimiento !== undefined), pob, inicioCurso) : new Map();
    c.porDeporte.set(deporte, m);
  }
  return m.get(`${club}|${categoria}`);
}

// ---------------------------------------------------------------------------------------------------- plaza del personaje en un equipo

/** El reparto base, la población del colegio y del barrio, los entrenadores y, al final, los niños que reclutan los deportes. */
function generarTodos(ctx: InitContext, pobs: readonly PoblacionGuardada[]): { npcs: Npc[]; pobs: PoblacionGuardada[] } {
  const base = generarReparto(ctx, pobs[0]);
  const usados = registroDe(base);
  const colegio = poblarElColegio(ctx.rng, usados, base.filter((n) => n.role === 'companero').length);
  const sin = conSemilla([...base, ...colegio, ...bibliotecarios(ctx.rng, usados)], ctx.seed);
  const conEntrenadores = pobs.reduce((lista, pob) => [...lista, ...entrenadoresDeUnDeporte(lista, pob, ctx.rng), ...entrenadoresDeEquiposExtra(lista, pob, ctx.rng)], sin);
  // Todos los niños tienen ya sus capacidades reales: los clubes escogen por lo que vale cada uno de verdad.
  const rend = rendimientosDe(ctx);
  const equipos = reclutarEnTodos(conCapacidades(conEntrenadores, 0), pobs, 0, new Map(), rend);
  // La partida empieza dentro del plazo de fichajes: aquí también se aplica la regla de los equipos según la demanda (los interesados que se quedan sin equipo abren otros).
  const mercado: MercadoDeFichajes = { lista: new ListaDeTrabajo(equipos.map((n) => [n.id, n])), pobs, dia: 0, val: valoracionDe(rend), reservas: new Map() };
  // Los equipos de los clubes salen del «draft» por rondas (sin el personaje: no entra en los porcentajes).
  draftDeEquipos(mercado, ctx.rng, { conPrueba: false, conAmbicion: false, reiniciar: true });
  // Los que juegan llevan su historia deportiva (que incluye la de sus capacidades); al resto se les da la de siempre.
  return { npcs: conCapacidades(conHabilidades([...mercado.lista.values()], mercado.pobs, rend, 0), 0), pobs: [...mercado.pobs] };
}

/** El personal de la biblioteca: uno en el turno de mañana (y los sábados) y otro en el de tarde. Van al final para no cambiar el azar de lo demás. */
function bibliotecarios(rng: Rng, usados: RegistroDeNombres): Npc[] {
  return (['manana', 'tarde'] as const).map((turno, i) =>
    persona(rng, `bibliotecario_${i + 1}`, 'vecino', rng.int(30, 60), 0, usados, [{ tipo: 'bibliotecario', turno }], (g) => `${g === 'f' ? 'Bibliotecaria' : 'Bibliotecario'} de la biblioteca municipal (turno de ${turno === 'manana' ? 'mañana' : 'tarde'}).`, ['bibliotecario']),
  );
}

/**
 * Un entrenador de un deporte (el del club del colegio o uno de los clubes de fuera): su carácter y sus intereses son los que pide el deporte, y lleva
 * guardado a qué se dedica y dónde trabaja (así no depende del módulo del deporte). Más adelante cada entrenador tendrá sus propias habilidades
 * (según su carácter, su conocimiento del deporte y sus capacidades), mejores en los clubes que en el colegio.
 */
export function nuevoEntrenador(
  rng: Rng,
  pob: PoblacionGuardada,
  usados: RegistroDeNombres,
  e: { id: string; club: string; edades: readonly [number, number]; edad: readonly [number, number]; descripcion?: string },
): Npc {
  const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
  const rasgos = rasgosDeAqui(rng, { sesgoCaracter: pob.entrenadores.sesgoCaracter, interesesPreferidos: pob.entrenadores.interesesPreferidos });
  const edad = edadAdultaDe(e.id, e.edad[0], e.edad[1]);
  const nacimiento = nacimientoParaEdad(e.id, edad);
  const nombre = nombreUnico(rng, gender, rasgos.origen, edad, nacimiento, usados);
  const [min, max] = e.edades;
  return {
    id: e.id,
    name: nombre.completo,
    nombrePila: nombre.nombrePila,
    ...(nombre.apodo ? { apodo: nombre.apodo } : {}),
    role: 'entrenador',
    gender,
    tags: [pob.deporte, 'mentor'],
    levels: {},
    potential: {},
    rasgos,
    nacimiento,
    known: false,
    club: e.club,
    edades: [min, max],
    deporte: pob.deporte,
    dedicacion: pob.entrenadores.dedicacion,
    trabajo: pob.nombresDeClub[e.club],
    tipos: [{ tipo: 'entrenador', club: e.club, deporte: pob.deporte }],
    description: e.descripcion ?? `Entrena ${max >= 99 ? `a partir de ${min} años` : `de ${min} a ${max} años`} en el ${pob.nombresDeClub[e.club]}.`,
  };
}

/** Los entrenadores de los clubes de fuera del colegio: cada club tiene varios, cada uno con las categorías de unas edades (alguno lleva varias). El del colegio es `entrenador` (de todas las edades). */
export const entrenadoresDeClubes = (rng: Rng, pob: PoblacionGuardada, usados: RegistroDeNombres): Npc[] =>
  pob.entrenadores.deFuera.flatMap(({ club, edades }) =>
    edades.map(([min, max], i) => nuevoEntrenador(rng, pob, usados, { id: `entrenador${pob.primero ? '' : `_${pob.deporte}`}_${club}_${i + 1}`, club, edades: [min, max], edad: [30, 55] })),
  );

/** ¿Es alumno del colegio del personaje? Los compañeros y los hermanos en edad escolar (el profesorado trabaja allí, no va). */
export const delColegio = (n: Npc): boolean => !!n.tipos?.some((t) => t.tipo === 'alumno' || (t.tipo === 'hermano' && t.escolar));

/** Clubes con entrenadores propios en las partidas anteriores a guardar el lugar de trabajo con cada entrenador: cómo se llaman (para decir dónde trabajan). */
const NOMBRES_DE_CLUB: Readonly<Record<string, string>> = { colegio: COLEGIO_DEL_PERSONAJE, club_ciudad: 'Club Atletismo Ciudad', club_alto_rendimiento: 'Club de Alto Rendimiento' };

/**
 * A qué se dedica y dónde trabaja (los adultos): el profesorado y los entrenadores y los vecinos. `basica` es lo que se ve sin preguntar
 * («Profesor»): la asignatura o el deporte se saben al ir a su clase, al apuntarte a su club o preguntando.
 */
function ocupacionDe(n: Npc, edad: number | undefined): { profesion?: string; basica?: string; trabajo?: string } {
  const f = n.gender === 'f';
  if (n.role === 'profesor') {
    const numero = Number(/^profesor_(\d+)$/.exec(n.id)?.[1]);
    const materia = numero ? ASIGNATURAS_DE_PROFESORES[numero - 1] : undefined;
    return { profesion: materia ? `${f ? 'Profesora' : 'Profesor'} de ${materia.toLowerCase()}` : f ? 'Profesora y tutora' : 'Profesor y tutor', basica: f ? 'Profesora' : 'Profesor', trabajo: COLEGIO_DEL_PERSONAJE };
  }
  if (n.role === 'entrenador') return { profesion: `${f ? 'Entrenadora' : 'Entrenador'} ${n.dedicacion ?? 'de atletismo'}`, basica: f ? 'Entrenadora' : 'Entrenador', trabajo: n.trabajo ?? NOMBRES_DE_CLUB[n.club ?? 'colegio'] };
  if (n.tags.includes('bibliotecario')) return { profesion: f ? 'Bibliotecaria' : 'Bibliotecario', basica: f ? 'Bibliotecaria' : 'Bibliotecario', trabajo: 'Biblioteca municipal' };
  if (n.role === 'vecino' && edad !== undefined && edad >= 18) return oficioDeVecino(n.id, n.gender, edad);
  if (n.oficio !== undefined && n.tags.includes('progenitor')) {
    const o = oficioDeProgenitor(n.oficio, n.gender);
    return { profesion: o.profesion, basica: o.profesion, trabajo: o.trabajo };
  }
  return {};
}

/** A qué colegio va (si va a alguno): el del personaje o, en los rivales y los vecinos en edad escolar, uno de fuera. */
function colegioDe(n: Npc, edad: number | undefined): string | undefined {
  if (delColegio(n)) return COLEGIO_DEL_PERSONAJE;
  // Los niños reclutados de otros colegios y los del barrio llevan el suyo; los jóvenes que ya no van al colegio, ninguno.
  if (n.colegio === 'ninguno') return undefined;
  if (n.colegio) return n.colegio;
  if ((n.role === 'rival' || n.role === 'vecino') && edad !== undefined && edad >= EDAD_DE_COLEGIO.desde && edad <= EDAD_DE_COLEGIO.hasta) return colegioDeFuera(n.id);
  return undefined;
}

/**
 * A qué clase va, con su letra («3.ºA»; solo se enseña a quien es del mismo colegio y es alumno). Cada curso tiene dos clases: tú y tus
 * compañeros estáis en la A, la otra clase de tu curso es la B y los demás cursos se reparten entre A y B.
 */
function claseDe(n: Npc, edad: number | undefined): string | undefined {
  if (!delColegio(n) || edad === undefined) return undefined;
  const tuya = n.tipos?.some((t) => t.tuClase);
  const letra = tuya ? LETRA_DE_TU_CLASE : n.id.startsWith('curso_') ? 'B' : letraDeClaseDe(n.id);
  const nombre = nombreDeClase(edad, letra);
  return nombre && tuya ? `${nombre} (tu clase)` : nombre;
}

/** Lo que se sabe de alguien sin preguntarle: su edad y su colegio y clase si es de la familia; el colegio, si es del tuyo; la clase, si es de la tuya. */
function sabePorDefecto(n: Npc): DatoPersonal[] {
  // Tus padres: sabes cuántos años tienen y a qué se dedican y dónde trabajan.
  if (n.role === 'familia') return n.tags.includes('progenitor') ? ['edad', 'colegio', 'clase', 'profesion', 'trabajo'] : ['edad', 'colegio', 'clase'];
  // El profesorado y los entrenadores: se sabe dónde trabajan (no su asignatura o su deporte).
  if (n.role === 'profesor' || n.role === 'entrenador' || n.tags.includes('bibliotecario')) return ['trabajo'];
  const base: DatoPersonal[] = delColegio(n) ? ['colegio'] : [];
  return n.tipos?.some((t) => t.tuClase) ? [...base, 'clase'] : base;
}

/** Altura de hoy: padres y hermanos, de su herencia; el resto, de un hash de su id. */
function alturaHoy(n: Npc, hoy: number): number | undefined {
  if (n.nacimiento === undefined) return undefined;
  return alturaDe(n.gender, (hoy - n.nacimiento) / 365, n.estatura ?? estaturaZ(n.id));
}

/** La vista de cada persona se recuerda mientras no cambie la persona ni el día: se pide muchas veces (listas, presencia, acciones). */
const VISTAS = new WeakMap<Npc, { clave: string; vista: NpcView }>();
const vista = (n: Npc, day: number, hoy: number = day): NpcView => {
  const clave = `${day}|${hoy}`;
  const guardada = VISTAS.get(n);
  if (guardada?.clave === clave) return guardada.vista;
  const v = construirVista(n, day, hoy);
  VISTAS.set(n, { clave, vista: v });
  return v;
};

/**
 * Lo que se cuenta de una persona. Para un hermano se calcula (no se usa lo guardado): si es mayor o menor sale de los años de nacimiento
 * respecto a los del personaje, que empieza con `EDAD_DE_INICIO`. Así vale también para las partidas guardadas con el texto al revés.
 */
const descripcionDe = (n: Npc): string | undefined =>
  n.tags.includes('hermano') && n.nacimiento !== undefined
    ? `${relacionDeHermano(n.gender, anioNatural(0) - EDAD_DE_INICIO - anioNatural(n.nacimiento))}. Vive en casa.`
    : n.description;

const construirVista = (n: Npc, day: number, hoy: number): NpcView => {
  const age = edadNpc(n, day);
  const sabe = [...new Set([...sabePorDefecto(n), ...(n.aprendido ?? [])])];
  return {
    id: n.id,
    name: n.name,
    nombrePila: n.nombrePila,
    apodo: n.apodo,
    nombreCorto: nombreCortoDe(n),
    role: n.role,
    gender: n.gender,
    tags: n.tags,
    levels: n.levels,
    ...(n.estado ? { estadoDeJuego: { eficiencia: eficienciaDeEstado(n.estado, false), baja: !!n.estado.baja } } : {}),
    age,
    known: n.known,
    club: n.club,
    rasgos: n.rasgos,
    description: descripcionDe(n),
    ...(n.nacimiento === undefined ? {} : { nacimiento: n.nacimiento, edadExacta: edadCumplida(n.nacimiento, hoy), cumple: cumpleaños(n.nacimiento).corto, alturaCm: alturaHoy(n, hoy) }),
    colegio: colegioDe(n, age),
    clase: claseDe(n, age),
    ...(n.nacimiento === undefined ? {} : (() => { const o = ocupacionDe(n, edadCumplida(n.nacimiento, hoy)); return { profesion: o.profesion, profesionBasica: o.basica, trabajo: o.trabajo }; })()),
    ...(n.edades ? { edades: n.edades } : {}),
    ...(n.role === 'profesor' ? { asignaturas: asignaturasDe(n.id) } : {}),
    ...(n.perks ? { perks: { activos: [...n.perks.activos], pool: [...n.perks.pool] } } : {}),
    sabe,
    ...(sabe.includes('gustos') && n.rasgos ? { gustos: gustosDe(n.rasgos.intereses) } : {}),
  };
};

/** Sesiones de los clubes de fuera: se reparten en cuatro patrones según el nombre del club (todas las sedes, de momento, en el estadio). */
const PATRONES_DE_SESION: readonly Omit<SesionDeClub, 'sede'>[] = [
  { weekdays: [0, 2], desde: 17, hasta: 19 },
  { weekdays: [1, 3], desde: 18, hasta: 20 },
  { weekdays: [0, 1, 3], desde: 17, hasta: 20 },
  { weekdays: [2, 4], desde: 17, hasta: 19 },
];

/**
 * Sesiones de un club: las del catálogo de clubes (por id o por nombre) y, si no está, las de un club de fuera, que entrena en la sede por defecto de
 * los clubes de fuera de su deporte. Provisional: toda la gente es del primer deporte de la partida (la gente de cada deporte llega en la fase 4).
 */
function sesionDeClub(clubes: ClubDirectory | undefined, deporte: string | undefined, sedeDeFuera: string | null, club: string): SesionDeClub {
  const c = deporte ? clubes?.list(deporte).find((x) => x.id === club || x.nombre === club) : undefined;
  if (c) return { weekdays: c.sesiones.weekdays, desde: c.sesiones.desde, hasta: c.sesiones.hasta, sede: c.sede };
  return { ...PATRONES_DE_SESION[Math.floor(azarDe('sesion', club) * PATRONES_DE_SESION.length)], sede: sedeDeFuera };
}

/** Qué tipo de persona sale antes en una lista de «Gente aquí» a igualdad de nivel. */
const RELEVANCIA: Record<string, number> = { profesor: 6, entrenador: 6, amigo: 5, club: 4, rival: 3, alumno: 2, vecino: 1 };

/**
 * Lo que pidió cada deporte de la gente: lo guardado en la partida (así sigue valiendo si el módulo del deporte ya no está) o, en una partida
 * anterior a guardarlo, lo que piden ahora los deportes cargados.
 */
const poblacionesGuardadas = (ctx: ReadContext): PoblacionGuardada[] => ctx.state<NpcsState>().poblaciones ?? poblacionesDe(ctx, ctx.state<NpcsState>().semilla ?? 0);

/** Consultas del servicio `npcs` ya resueltas, por lista de personas (cambia cuando cambia la población) y filtro. */
const CONSULTAS = new WeakMap<Npc[], Map<string, NpcView[]>>();
const POR_ID = new WeakMap<Npc[], Map<string, Npc>>();

/** Una persona por su id sin recorrer la lista (se pregunta por muchas en cada acción). */
function personaPorId(lista: Npc[], id: string): Npc | undefined {
  let porId = POR_ID.get(lista);
  if (!porId) POR_ID.set(lista, (porId = new Map(lista.map((x) => [x.id, x]))));
  return porId.get(id);
}

const SERVICIOS_DE_PRESENCIA = new WeakMap<Npc[], { minuto: number; servicio: PresenciaService }>();
const SIN_TIPOS: TipoAsignado[] = [];
/** La agenda depende de los tipos de la persona y de los datos del deporte del país: se monta una vez por lista de tipos (los acontecimientos con fecha de fin no se guardan). */
const AGENDAS = new WeakMap<TipoAsignado[], TramoDeAgenda[]>();
/** Las personas con los mismos tipos comparten la misma agenda (el mismo objeto): así lo que se calcula para una vale para todas. */
const AGENDAS_COMPARTIDAS = new Map<string, TramoDeAgenda[]>();

function agendaDePersona(n: Npc, datos: DatosDeAgenda, dia: number): TramoDeAgenda[] {
  const tipos = n.tipos ?? SIN_TIPOS;
  if (tipos.some((x) => x.hasta !== undefined)) return construirAgenda(tipos, datos, dia);
  let a = AGENDAS.get(tipos);
  if (!a) {
    // La agenda también depende de lo que da el deporte del país (la jornada de competición y las sesiones y sedes de los clubes): entra en la clave.
    const clave = JSON.stringify([tipos, tipos.map((x) => [typeof x.deporte === 'string' ? x.deporte : undefined, datos.jornada(typeof x.deporte === 'string' ? x.deporte : undefined), x.club ? datos.sesionDeClub(x.club, typeof x.deporte === 'string' ? x.deporte : undefined) : null])]);
    let compartida = AGENDAS_COMPARTIDAS.get(clave);
    if (!compartida) AGENDAS_COMPARTIDAS.set(clave, (compartida = construirAgenda(tipos, datos, dia)));
    AGENDAS.set(tipos, (a = compartida));
  }
  return a;
}

/** Minutos del día en que algún tramo de alguna agenda empieza o acaba (en orden). Cambia solo cuando cambia la lista de personas. */
const LIMITES = new WeakMap<Npc[], number[]>();

function limitesDeTramos(lista: Npc[], agendaDe: (n: Npc) => TramoDeAgenda[]): number[] {
  let l = LIMITES.get(lista);
  if (!l) {
    const set = new Set<number>();
    const vistas = new Set<TramoDeAgenda[]>();
    for (const n of lista) {
      const a = agendaDe(n);
      if (vistas.has(a)) continue;
      vistas.add(a);
      for (const x of a) {
        set.add(x.desde);
        set.add(x.hasta);
        for (const [a, b] of x.ocupado ?? []) {
          set.add(a);
          set.add(b);
        }
      }
    }
    LIMITES.set(lista, (l = [...set].sort((a, b) => a - b)));
  }
  return l;
}

interface EnLugar {
  n: Npc;
  nivel: number;
  tipo: string;
  /** Orden estable al azar dentro de su nivel; se calcula al ordenar el lugar, no para toda la población. */
  azar?: number;
}

/** Número de índices de presencia construidos: `PresenciaService.version`. */
let versionDeIndices = 0;

/**
 * Quién está en cada lugar entre dos cambios de tramo: se calcula una vez para toda la población y se reutiliza mientras no
 * cambie el intervalo ni la lista de personas. Cada lugar guarda sus personas ya ordenadas (a quien conoces primero, después el nivel, lo
 * que son y, por último, un orden estable al azar).
 */
const INDICES = new WeakMap<Npc[], { clave: string; version: number; lugares: Map<string, EnLugar[]>; ocupados: Map<string, { n: Npc; motivo: string }[]>; ordenados: Set<string> }>();

function indiceDePresencia(lista: Npc[], clave: string, ubicar: (n: Npc) => { sitio: string | null; nivel: number; tipo: string; atendiendo?: { sitio: string; motivo: string } }, dia: number) {
  let idx = INDICES.get(lista);
  if (!idx || idx.clave !== clave) {
    const lugares = new Map<string, EnLugar[]>();
    const ocupados = new Map<string, { n: Npc; motivo: string }[]>();
    for (const n of lista) {
      const u = ubicar(n);
      // Ocupado pero a la vista (en clase, durmiendo): no está «aquí» para hablar, pero se ve en el sitio con su estado.
      if (u.atendiendo) ocupados.set(u.atendiendo.sitio, [...(ocupados.get(u.atendiendo.sitio) ?? []), { n, motivo: u.atendiendo.motivo }]);
      if (u.sitio === null) continue;
      let l = lugares.get(u.sitio);
      if (!l) lugares.set(u.sitio, (l = []));
      l.push({ n, nivel: u.nivel, tipo: u.tipo });
    }
    INDICES.set(lista, (idx = { clave, version: ++versionDeIndices, lugares, ocupados, ordenados: new Set() }));
  }
  const actual = idx;
  return {
    version: actual.version,
    ocupadosEn: (lugar: string): { n: Npc; motivo: string }[] => actual.ocupados.get(lugar) ?? [],
    en(lugar: string): EnLugar[] {
      const l = actual.lugares.get(lugar) ?? [];
      if (!actual.ordenados.has(lugar)) {
        actual.ordenados.add(lugar);
        for (const e of l) e.azar = azarDe(e.n.id, dia, 'orden');
        l.sort(
          (a, b) =>
            Number(b.n.known !== false) - Number(a.n.known !== false) || b.nivel - a.nivel || (RELEVANCIA[b.tipo] ?? 0) - (RELEVANCIA[a.tipo] ?? 0) || a.azar! - b.azar!,
        );
      }
      return l;
    },
  };
}

export const npcs = defineModule<NpcsState>({
  id: 'npcs',
  name: 'Personas',
  description: 'La población: compañeros, tutores, entrenadores y rivales.',
  dependsOn: ['gen'],

  initState: (ctx) => {
    // Cada deporte de la partida pide su gente (y se guarda lo que pidió, para que siga viviendo sin su módulo).
    const poblaciones = poblacionesDe(ctx, ctx.seed);
    const { npcs, pobs } = conPais(ctx.pais, () => generarTodos(ctx, poblaciones));
    return { npcs, poblaciones: pobs, semilla: ctx.seed };
  },

  // Ponerle (o quitarle) un apodo a alguien que conoces: el texto va en el id de la acción (`idDePonerApodo`).
  resolverAccion: (ctx, id) => {
    const partes = id.split('.');
    if (partes[0] !== 'npcs' || partes[1] !== 'apodo' || partes.length !== 4) return undefined;
    const n = ctx.state<NpcsState>().npcs.find((x) => x.id === partes[2]);
    const apodo = apodoDeId(partes[3]);
    if (!n || apodo === undefined) return undefined;
    const pila = n.nombrePila ?? n.name.split(' ')[0];
    return {
      id,
      name: apodo ? `Llamarle «${apodo}»` : 'Quitarle el apodo',
      description: 'Cómo le llamas en los textos. No cambia lo que siente por ti.',
      tags: [],
      group: 'Gente',
      duration: 1,
      available: () => (n.known === false ? 'Todavía no sabes cómo se llama' : (n.apodo ?? '') === apodo ? 'Ya le llamas así' : true),
      run: (c) => {
        c.updateState<NpcsState>((st) => ({ ...st, npcs: st.npcs.map((x) => (x.id === n.id ? (apodo ? { ...x, apodo } : { ...x, apodo: undefined }) : x)) }));
        c.log(apodo ? `Desde ahora le llamas «${apodo}» a ${pila}.` : `Vuelves a llamarle ${pila}.`, 'info');
      },
    };
  },

  on: {
    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as { day: number };
      ctx.updateState<NpcsState>((s) => ({
        ...s,
        npcs: s.npcs.map((n) => {
          // Los que practican un deporte progresan solos hacia el techo de su edad.
          // Los que tienen las habilidades reales de su deporte avanzan con su rutina cada semana (`semanaDeportiva`), no con esta aproximación.
          const entradas = Object.entries(n.levels).filter(([k]) => !n.hab?.[k]);
          if (!entradas.length) return n;
          const levels = { ...n.levels };
          const edad = n.nacimiento === undefined ? undefined : (day - n.nacimiento) / 365;
          for (const [k, v] of entradas) {
            const pot = n.potential[k] ?? 80;
            // El techo de cada edad es el potencial por el desarrollo físico de esa edad: sin edad, el potencial entero.
            const ritmo = n.ritmo?.[k] ?? 1;
            // Rinde cada curso una parte distinta de su techo (su constancia y cómo le va el año), así que el orden entre ellos cambia con los años.
            const techo = edad === undefined ? pot : pot * desarrolloRival(edad + (n.desfase ?? 0)) * formaEn(n.id, k, day, ritmo, n.genetica?.semilla ?? 0);
            // Progresan con rendimientos decrecientes hacia el techo de su edad.
            // Su suerte de cada día es solo suya (id, disciplina y día): no cambia con lo que haga el jugador.
            if (v < techo) levels[k] = Math.min(techo, v + rngEstable('progreso', n.id, k, day).range(0, 0.35) * (1 - v / techo) * 2 * ritmo);
          }
          return { ...n, levels };
        }),
      }));
    },

    [CORE_EVENTS.WEEK_END]: (ctx, ev) => {
      const { week } = ev.data as { week: number };
      // Cada semana, las capacidades de los niños se desarrollan y caen (las mismas reglas que las del personaje).
      ctx.updateState<NpcsState>((s) => {
        const rend = rendimientosDe(ctx);
        const pobs = s.poblaciones ?? poblacionesDe(ctx, s.semilla ?? 0);
        const npcs = conCapacidades(conHabilidades(s.npcs, pobs, rend, week * 7), week * 7);
        avanzarCapacidadesEnSitio(npcs, (week + 1) * 7);
        semanaDeportiva(npcs, pobs, rend, (week + 1) * 7, (ctx.time.week - ctx.time.schoolWeek) * 7);
        return { ...s, npcs };
      });
      // Si la semana que viene empieza un curso nuevo, se renueva la gente: los que acaban el colegio se van, entran niños nuevos y los equipos rellenan sus plazas.
      const proximo = ctx.timeAt((week + 1) * 7 * MINUTES_PER_DAY);
      if (proximo.schoolWeek !== 0) return;
      const pobs = poblacionesGuardadas(ctx);
      // Si el personaje ya es miembro de un equipo por categoría, su plaza cuenta: el equipo se queda en el máximo menos uno (el curso que viene tendrá un año más).
      // Si aún no es miembro no se le guarda ningún hueco: entra como cualquier niño (hay hueco, o está completo y es mejor que alguno).
      const edadProxima = (ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8) + 1;
      const reservas = new Map<string, number>();
      const personaje: JugadorEnClub[] = [];
      const rend = rendimientosDe(ctx);
      const clubes = ctx.service<ClubDirectory>(SERVICES.clubes);
      for (const pob of pobs) {
        const club = clubes?.membership(pob.deporte);
        const cat = club && pob.equipos.some((e) => e.club === club.id && e.plantillaPorCategoria) ? categoriaDe(pob, edadProxima) : undefined;
        if (!club || !cat) continue;
        reservas.set(claveDeEquipo(club.id, cat.id), 1);
        const f = rend.get(pob.deporte);
        const puestoDelPersonaje = ctx.state<NpcsState>().puestoDelPersonaje?.[pob.deporte];
        const valoresDelPersonaje = puestosDelPersonaje(ctx, rend, pob);
        if (f) personaje.push({ deporte: pob.deporte, club: club.id, categoria: cat.id, valor: puestoDelPersonaje && valoresDelPersonaje ? valoresDelPersonaje[puestoDelPersonaje] : f(ctx), edad: edadProxima, pierna: ctx.service<IdentityService>(SERVICES.identidad)?.view().leftHanded ? 'izquierda' : 'derecha', ...(puestoDelPersonaje ? { puesto: puestoDelPersonaje } : {}), ...(valoresDelPersonaje ? { valores: valoresDelPersonaje } : {}) });
      }
      const resultado = { sinPlaza: [] as string[], dejanSinClub: 0, pobs: undefined as PoblacionGuardada[] | undefined, propuestas: [] as { deporte: string; puesto: string }[] };
      ctx.updateState<NpcsState>((s) => {
        const npcs = conPais(ctx.pais, () => actualizarHermanos(renovarDeportistas(conCapacidades(conSemilla(renovarAlumnos(s.npcs, proximo.day, ctx.rng), s.semilla ?? 0), proximo.day), pobs, proximo.day, ctx.rng, reservas, rend, s.semilla ?? 0, proximo.schoolYear, personaje, resultado), proximo.day));
        const pobsNuevas = resultado.pobs ?? pobs;
        return { ...s, poblaciones: pobsNuevas, npcs: conCapacidades(conHabilidades(npcs, pobsNuevas, rend, proximo.day), proximo.day), dejanSinClub: { ...s.dejanSinClub, [proximo.schoolYear]: resultado.dejanSinClub } };
      });
      // El entrenador le propone al personaje otro puesto si en el suyo sobran y en otro faltan (decide él: `club.cambio_de_puesto`).
      for (const p of resultado.propuestas) if (!resultado.sinPlaza.includes(p.deporte)) ctx.emit<PuestoPropuestoData>({ type: SHARED_EVENTS.PROPUESTA_DE_PUESTO, data: { sport: p.deporte, puesto: p.puesto } });
      for (const deporte of resultado.sinPlaza) ctx.emit<PlazaPerdidaData>({ type: SHARED_EVENTS.PLAZA_PERDIDA, data: { sport: deporte, clubId: clubes!.membership(deporte)!.id } });
    },

    // El personaje acepta el cambio de puesto que le propuso su entrenador: el equipo cuenta con él en el nuevo.
    [SHARED_EVENTS.CAMBIO_DE_PUESTO]: (ctx, ev) => {
      const { sport, puesto } = ev.data as PuestoPropuestoData;
      ctx.updateState<NpcsState>((st) => ({ ...st, puestoDelPersonaje: { ...(st.puestoDelPersonaje ?? {}), [sport]: puesto } }));
    },

    // Al entrar en un club conoces a su entrenador: se presenta el primer día.
    // Se añade un deporte a una partida empezada: sus equipos reclutan entre los niños que no juegan a nada (si ya estuvo, solo completan lo que falte).
    [SHARED_EVENTS.DEPORTE_ANADIDO]: (ctx, ev) => {
      const { deporte } = ev.data as DeporteAnadidoData;
      const ficha = fichasDeDeporte(ctx).find((f) => f.id === deporte);
      if (!ficha) return;
      const guardadas = poblacionesGuardadas(ctx);
      const previa = guardadas.find((p) => p.deporte === deporte);
      // Las edades se miran el primer día del curso en curso, como en la renovación de cada curso.
      const dia = (ctx.time.week - ctx.time.schoolWeek) * 7;
      ctx.updateState<NpcsState>((s) => {
        const pob = previa ?? poblacionDe(ctx, ficha, false, s.semilla ?? 0);
        const npcs = conPais(ctx.pais, () => (previa ? reclutarDeportistas(conCapacidades(s.npcs, dia), pob, dia, false, new Map(), valoracionDe(rendimientosDe(ctx))) : añadirDeporte(conCapacidades(s.npcs, dia), pob, dia, ctx.rng, rendimientosDe(ctx))));
        return { ...s, poblaciones: previa ? guardadas : [...guardadas, pob], npcs };
      });
    },

    [SHARED_EVENTS.CLUB_JOIN]: (ctx, ev) => {
      const { clubId, sport, nivel, puesto, valores: valoresDePrueba } = ev.data as ClubJoinData;
      ctx.updateState<NpcsState>((st) => {
        const { [sport]: _antes, ...resto } = st.puestoDelPersonaje ?? {};
        return { ...st, puestoDelPersonaje: puesto ? { ...resto, [sport]: puesto } : resto };
      });
      // El que entrena tu edad en ese club (los clubes tienen varios, cada uno con unas categorías).
      const edad = ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;
      const pobs = poblacionesGuardadas(ctx);
      // Si su equipo está completo y el personaje es mejor que alguno, ocupa su plaza (la misma regla que para cualquier niño): el peor deja el sitio y busca otro club, dentro del plazo,
      // y si ninguno lo coge deja el deporte (`colocarDesplazados`).
      if (nivel !== undefined) {
        const inicioCurso = (ctx.time.week - ctx.time.schoolWeek) * 7;
        const rendDelClub = rendimientosDe(ctx);
        const pob = pobs.find((p) => p.deporte === sport);
        const plaza = plazaEnElEquipo(ctx.state<NpcsState>().npcs, pobs, sport, clubId, edad, nivel, inicioCurso, pob ? (valoresDePrueba ?? puestosDelPersonaje(ctx, rendDelClub, pob)) : undefined, rendDelClub, undefined, valoresDePrueba && puesto ? { puesto, yaPasada: true } : undefined);
        if (plaza.estado === 'por_merito' && plaza.peor && pob) {
          const cat = categoriaDe(pob, edad);
          const reservas = new Map<string, number>(cat ? [[claveDeEquipo(clubId, cat.id), 1]] : []);
          let final: Npc | undefined;
          ctx.updateState<NpcsState>((st) => {
            const m: MercadoDeFichajes = { lista: new ListaDeTrabajo(st.npcs.map((x) => [x.id, x])), pobs, dia: inicioCurso, val: valoracionDe(rendimientosDe(ctx)), reservas };
            const sale = m.lista.get(plaza.peor!.id)!;
            m.lista.set(sale.id, sinDeporte(sale, pob, false));
            colocarDesplazados(m, [{ id: sale.id, origen: sport }]);
            final = m.lista.get(sale.id);
            return { ...st, npcs: st.npcs.map((x) => m.lista.get(x.id) ?? x) };
          });
          const dondeAcabo = final?.deporte === undefined ? ' y no encuentra otro club: deja el deporte' : final.deporte === sport ? ' y ficha por otro club' : ` y se va a otro deporte`;
          ctx.log(`${plaza.peor.nombre} pierde su plaza en el equipo para dejarte sitio: eres mejor${dondeAcabo}.`, 'info');
        }
      }
      const delClub = ctx.state<NpcsState>().npcs.filter((n) => n.known === false && n.tipos?.some((t) => t.tipo === 'entrenador' && t.club === clubId && (t.deporte ?? pobs[0]?.deporte) === sport));
      const entrenador = delClub.find((n) => !n.edades || (edad >= n.edades[0] && edad <= n.edades[1])) ?? delClub[0];
      if (!entrenador) return;
      ctx.updateState<NpcsState>((st) => ({ ...st, npcs: st.npcs.map((x) => (x.id === entrenador.id ? { ...x, known: true, aprendido: [...(x.aprendido ?? []), 'profesion' as const] } : x)) }));
      ctx.log(`${entrenador.gender === 'f' ? 'Tu entrenadora' : 'Tu entrenador'} se presenta: ${entrenador.name}.`, 'info');
    },

    // Al ir a una clase, su profesor se presenta si todavía no lo conoces.
    [SHARED_EVENTS.CLASS_ATTENDED]: (ctx, ev) => {
      const { asignatura } = ev.data as ClassAttendedData;
      const numero = PROFESOR_DE_ASIGNATURA[asignatura];
      const profesor = numero === undefined ? undefined : ctx.state<NpcsState>().npcs.find((n) => n.id === `profesor_${numero}`);
      if (!profesor) return;
      const nuevo = profesor.known === false;
      // Ir a su clase es saber qué da (aunque ya lo conocieras por el nombre).
      if (!nuevo && profesor.aprendido?.includes('profesion')) return;
      ctx.updateState<NpcsState>((st) => ({ ...st, npcs: st.npcs.map((x) => (x.id === profesor.id ? { ...x, known: true, aprendido: [...new Set([...(x.aprendido ?? []), 'profesion' as const])] } : x)) }));
      if (nuevo) ctx.log(`${profesor.gender === 'f' ? 'La profesora' : 'El profesor'} se presenta al empezar la clase: ${profesor.name}.`, 'info');
    },

    // El personaje le ha preguntado algo a alguien (edad, colegio, clase): desde ahora lo sabe.
    [SHARED_EVENTS.DATO_PERSONAL]: (ctx, ev) => {
      const { npcId, dato } = ev.data as DatoPersonalData;
      const n = ctx.state<NpcsState>().npcs.find((x) => x.id === npcId);
      if (!n) return;
      const v = vista(n, (ctx.time.week - ctx.time.schoolWeek) * 7, ctx.time.day);
      if (v.sabe?.includes(dato)) return;
      ctx.updateState<NpcsState>((st) => ({ ...st, npcs: st.npcs.map((x) => (x.id === npcId ? { ...x, aprendido: [...(x.aprendido ?? []), dato] } : x)) }));
      const quien = nombreCortoDe(n);
      const respuesta =
        dato === 'edad' ? `${quien} tiene ${v.edadExacta} años y cumple el ${cumpleaños(n.nacimiento!).texto}.`
        : dato === 'colegio' ? `${quien} va a ${v.colegio === COLEGIO_DEL_PERSONAJE ? 'tu colegio' : v.colegio}.`
        : dato === 'profesion' ? `${quien} trabaja como ${v.profesion?.toLowerCase()}.`
        : dato === 'trabajo' ? `${quien} trabaja en ${v.trabajo}.`
        : dato === 'gustos' ? `A ${quien} le gusta: ${gustosDe(n.rasgos?.intereses ?? {}).map((g) => g.toLowerCase()).join(', ')}.`
        : `${quien} va a ${v.clase?.toLowerCase()}.`;
      ctx.log(respuesta, 'info');
    },

    [SHARED_EVENTS.PRESENTACION]: (ctx, ev) => {
      const { npcId } = ev.data as PresentacionData;
      const n = ctx.state<NpcsState>().npcs.find((x) => x.id === npcId);
      if (!n || n.known !== false) return;
      ctx.updateState<NpcsState>((s) => ({ ...s, npcs: s.npcs.map((x) => (x.id === npcId ? { ...x, known: true } : x)) }));
      ctx.log(`Se llama ${n.name}. ${n.description ?? ''}`.trim(), 'info');
    },

    // Una competición del mundo: cada jugador anota su resultado en su historial y le cambian la moral, la forma y la condición (las mismas reglas para todos).
    [SHARED_EVENTS.COMPETICION_MUNDO]: (ctx, ev) => {
      const c = ev.data as CompeticionDelMundoData;
      const por = new Map<string, CompeticionAnotada[]>();
      for (const p of c.pruebas) {
        for (const x of p.resultados) {
          por.set(x.npcId, [...(por.get(x.npcId) ?? []), { semana: c.semana, tipo: p.tipo, puesto: x.puesto, total: x.total, marca: x.marca, serie: x.serie, curso: c.curso, categoria: p.categoria }]);
        }
      }
      if (!por.size) return;
      ctx.updateState<NpcsState>((s) => ({
        ...s,
        npcs: s.npcs.map((n) => {
          const xs = por.get(n.id);
          if (!xs) return n;
          const resil = (n.cap?.[CAPACIDADES_GENETICAS.indexOf('gen.resiliencia')] ?? 50) / 100;
          let estado = n.estado ?? ESTADO_INICIAL;
          let h = n.historial?.[c.deporte];
          for (const x of xs) {
            estado = trasUnaCompeticion(estado, valoracionDelPuesto(x.puesto, x.total), resil);
            h = anotarCompeticion(h, { ...x, club: n.equipo ?? n.club ?? '' });
          }
          return { ...n, estado, historial: { ...n.historial, [c.deporte]: h! } };
        }),
      }));
    },

    // Un partido de un deporte de equipo: a quienes jugaron les cambian la condición, la moral y la forma como tras una carrera (las mismas reglas para todos: `trasUnaCompeticion`).
    [SHARED_EVENTS.PARTIDO_MUNDO]: (ctx, ev) => {
      const p = ev.data as PartidoDelMundoData;
      if (!p.jugadores.length) return;
      const pob = poblacionesGuardadas(ctx).find((x) => x.deporte === p.deporte);
      const curso = p.curso ?? ctx.time.schoolYear;
      const por = new Map(p.jugadores.map((x) => [x.npcId, x]));
      ctx.updateState<NpcsState>((s) => ({
        ...s,
        npcs: s.npcs.map((n) => {
          const x = por.get(n.id);
          if (x === undefined) return n;
          const estado = n.estado ?? ESTADO_INICIAL;
          // La temporada anterior pasa al historial cuando llega el primer partido de la siguiente.
          const anterior = n.est?.[p.deporte];
          const cerrada = anterior && anterior.curso !== curso ? cerrarTemporadaDeJugador(anterior) : undefined;
          const conEstadisticas = {
            ...n,
            est: { ...n.est, [p.deporte]: sumarPartido(anterior, curso, { minutos: x.minutos, titular: x.titular, goles: x.goles, asistencias: x.asistencias, nota: x.nota }) },
            ...(cerrada ? { estHist: { ...n.estHist, [p.deporte]: [...(n.estHist?.[p.deporte] ?? []), cerrada] } } : {}),
          };
          // Convocado y sin jugar: baja su moral (más cuanto más ambicioso) y no cambia su forma.
          if (x.minutos <= 0) return { ...conEstadisticas, estado: trasElBanquillo(estado, ((n.rasgos?.caracter.ambicion ?? 0) + 50) / 100) };
          const resil = (n.cap?.[CAPACIDADES_GENETICAS.indexOf('gen.resiliencia')] ?? 50) / 100;
          // La experiencia en el puesto en que jugó: con rendimientos decrecientes y más deprisa en el lado de su pierna buena.
          const exp = x.puesto && x.aprendizaje !== undefined && pob
            ? { ...n.exp, [p.deporte]: { ...n.exp?.[p.deporte], [x.puesto]: experienciaTrasElPartido(n.exp?.[p.deporte]?.[x.puesto] ?? 0, { minutos: x.minutos, aprendizaje: x.aprendizaje, factorDelLado: factorDeExperienciaDelPuesto(pob.puestos, x.puesto, piernaDe(n, pob)), ritmo: pob.puestos?.experiencia?.ritmo }) } }
            : n.exp;
          return { ...conEstadisticas, ...(exp ? { exp } : {}), estado: trasUnaCompeticion(estado, x.valoracion, resil) };
        }),
      }));
    },

    [SHARED_EVENTS.COMPETITION_RESULT]: (ctx, ev) => {
      const r = ev.data as CompetitionResultData;
      ctx.updateState<NpcsState>((s) => ({
        ...s,
        // Competir contra alguien (sea de otro colegio, un compañero o un hermano) es conocerlo.
        npcs: s.npcs.map((n) => (n.known === false && r.participants.some((x) => x.npcId === n.id) ? { ...n, known: true } : n)),
      }));
    },
  },

  services: {
    [SERVICES.presencia]: (ctx): PresenciaService => {
      const lista = ctx.state<NpcsState>().npcs;
      const t = ctx.time;
      // Se pide muchas veces seguidas (en cada acción de relación): dentro del mismo minuto es el mismo servicio.
      const hecho = SERVICIOS_DE_PRESENCIA.get(lista);
      if (hecho?.minuto === t.minute) return hecho.servicio;
      const clubes = ctx.service<ClubDirectory>(SERVICES.clubes);
      // Cada persona sigue la jornada y los clubes de su deporte (el primero de la partida si no dice cuál); si el deporte ya no está cargado, no hay nada que seguir.
      const cargados = fichasDeDeporte(ctx).map((f) => f.id);
      const datosDe = (deporte: string | undefined) => {
        const id = deporte ?? cargados[0];
        return id !== undefined && cargados.includes(id) ? { id, datos: datosDeDeporte(ctx, id) } : undefined;
      };
      const datos: DatosDeAgenda = {
        sesionDeClub: (club, deporte) => {
          const d = datosDe(deporte);
          return sesionDeClub(clubes, d?.id, d?.datos.sedes.fuera ?? null, club);
        },
        jornada: (deporte) => datosDe(deporte)?.datos.competiciones.jornada,
      };
      const inicioCurso = (t.week - t.schoolWeek) * 7;
      const agendaDe = (n: Npc): TramoDeAgenda[] => agendaDePersona(n, datos, t.day);
      /**
       * Dónde está cada persona entre dos cambios de tramo de cualquier agenda: mientras no cambie ninguno, la presencia no cambia
       * (nadie aparece ni desaparece), así que se calcula una vez por intervalo (unas 10 veces al día) y no cada pocos minutos.
       */
      const intervalo = limitesDeTramos(lista, agendaDe).filter((m) => m <= t.minuteOfDay).length;
      const indice = indiceDePresencia(lista, `${t.day}:${intervalo}`, (n) => ubicacionEn(agendaDe(n), t, n.id), t.day);
      const servicio: PresenciaService = {
        version: indice.version,
        en: (lugar, max = Infinity) => indice.en(lugar).slice(0, max).map((e) => vista(e.n, inicioCurso, t.day)),
        ocupadosEn: (lugar) => indice.ocupadosEn(lugar).map((e) => ({ persona: vista(e.n, inicioCurso, t.day), motivo: e.motivo })),
        donde: (id) => {
          const n = personaPorId(lista, id);
          return n ? ubicacionEn(agendaDe(n), t, n.id).sitio : undefined;
        },
        agenda: (id) => {
          const n = personaPorId(lista, id);
          return n ? agendaDe(n) : [];
        },
      };
      SERVICIOS_DE_PRESENCIA.set(lista, { minuto: t.minute, servicio });
      return servicio;
    },
    [SERVICES.npcs]: (ctx): NpcDirectory => {
      const lista = ctx.state<NpcsState>().npcs;
      // Edad de temporada: la de cada rival el primer día del curso, que es la que decide su categoría.
      const inicioCurso = (ctx.time.week - ctx.time.schoolWeek) * 7;
      return {
        list: (f) => {
          // Las consultas se repiten en cada acción: se resuelven una vez por lista de personas, curso y filtro.
          const clave = `${inicioCurso}|${f?.role ?? ''}|${f?.tag ?? ''}|${f?.minAge ?? ''}|${f?.maxAge ?? ''}|${f?.known ?? ''}`;
          let porFiltro = CONSULTAS.get(lista);
          if (!porFiltro) CONSULTAS.set(lista, (porFiltro = new Map()));
          let vistas = porFiltro.get(clave);
          if (!vistas) {
            vistas = lista
              .filter((n) => {
                if (f?.role && n.role !== f.role) return false;
                if (f?.known !== undefined && (n.known !== false) !== f.known) return false;
                if (f?.tag && !n.tags.includes(f.tag)) return false;
                if (f?.minAge !== undefined || f?.maxAge !== undefined) {
                  const edad = edadNpc(n, inicioCurso);
                  if (edad === undefined || edad < (f.minAge ?? 0) || edad > (f.maxAge ?? 200)) return false;
                }
                return true;
              })
              .map((n) => vista(n, inicioCurso, ctx.time.day));
            porFiltro.set(clave, vistas);
          }
          // Quien llama puede ordenar o modificar lo que recibe: se le da una copia.
          return [...vistas];
        },
        get: (id) => {
          const n = personaPorId(lista, id);
          return n ? vista(n, inicioCurso, ctx.time.day) : undefined;
        },
        equiposDeLaCategoria: (deporte, categoria) => equiposDeUnaCategoria(lista, poblacionesGuardadas(ctx), deporte, categoria, inicioCurso),
        plantillaDelEquipo: (deporte, club, categoria, letra) => plantillaDeUnEquipo(lista, poblacionesGuardadas(ctx), deporte, club, categoria, letra, inicioCurso, semanaQueAcaba(ctx.time.day)),
        equipoDelPersonaje: (deporte) => {
          const club = ctx.service<ClubDirectory>(SERVICES.clubes)?.membership(deporte);
          const pob = poblacionesGuardadas(ctx).find((p) => p.deporte === deporte);
          const edad = ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;
          const cat = pob ? categoriaDe(pob, edad) : undefined;
          const rend = rendimientosDe(ctx);
          const puesto = ctx.state<NpcsState>().puestoDelPersonaje?.[deporte];
          const valores = pob ? puestosDelPersonaje(ctx, rend, pob) : undefined;
          if (!club || !pob || !cat || !puesto || !valores) return undefined;
          const letra = equipoDelPersonajeEn(lista, poblacionesGuardadas(ctx), deporte, club.id, cat.id, { id: idDelPersonaje(deporte), puesto, valor: valores[puesto] }, edad, inicioCurso, valoracionDe(rend));
          return letra ? { club: club.id, categoria: cat.id, letra } : undefined;
        },
        nivelesDelEquipo: (deporte, club, categoria) => nivelesDelEquipoDe(lista, poblacionesGuardadas(ctx), deporte, club, categoria, ctx.time.week, inicioCurso),
        plaza: (deporte, club, nivel, puestos, prueba) => plazaEnElEquipo(lista, poblacionesGuardadas(ctx), deporte, club, ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8, nivel, inicioCurso, puestos, rendimientosDe(ctx), ctx.service<IdentityService>(SERVICES.identidad)?.view().leftHanded ? 'izquierda' : 'derecha', prueba),
        consejoDeportivo: () => consejoDeUnProfesor(ctx, lista, poblacionesGuardadas(ctx), rendimientosDe(ctx), inicioCurso),
      };
    },
  },
});

export default npcs;
