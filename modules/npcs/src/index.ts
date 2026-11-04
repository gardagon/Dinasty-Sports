import {
  APORTES,
  GEN,
  CORE_EVENTS,
  type RendimientoDeDeporte,
  type LectorDePersona,
  categoriaDeEdad,
  type CategoriaDef,
  type PlazaEnEquipo,
  MINUTES_PER_DAY,
  SERVICES,
  anioNatural,
  edadDeCompeticion,
  primerDiaDelAnio,
  factorPorEdad,
  INTERESES,
  apellidosDePadres,
  COLEGIO_DEL_PERSONAJE,
  EDAD_DE_COLEGIO,
  colegioDeFuera,
  alturaDe,
  estaturaZ,
  edadCumplida,
  LETRA_DE_TU_CLASE,
  letraDeClaseDe,
  nombreDeClase,
  cumpleaños,
  nacimientoDeProgenitor,
  nacimientoParaEdad,
  edadAdultaDe,
  oficioDeVecino,
  oficioDeProgenitor,
  oficioDeProgenitorAlAzar,
  type DatoPersonal,
  type DatoPersonalData,
  nombreCompletoDeProgenitor,
  nombreDeProgenitor,
  padresDeSemilla,
  identidadAlAzar,
  identidadDeHijo,
  apodoAlAzar,
  apodoDeId,
  nombreCompleto,
  nombreCortoDe,
  nombrePermitido,
  registrarNombre,
  origenHeredado,
  type Identidad,
  type OrigenFamiliar,
  paisPorId,
  type PaisDef,
  type RegistroDeNombres,
  diferenciasDeEdad,
  relacionDeHermano,
  numeroDeHermanos,
  rasgosHeredadosNpc,
  heredarTope,
  perfilDePadre,
  repartirHerencia,
  practicaSegunTope,
  ventajaDeCrianza,
  efectosDe,
  heredarPerks,
  perksDePadre,
  rngEstable,
  ESTADO_INICIAL,
  CAPACIDADES_GENETICAS,
  eficienciaDeEstado,
  pasoDeSemanaDelEstado,
  trasUnaCompeticion,
  valoracionDelPuesto,
  type EstadoDeJugador,
  type CompeticionDelMundoData,
  type PerksDe,
  type FamilyService,
  type Practica,
  type RasgosDe,
  rasgosAlAzar,
  gustosDe,
  timeView,
  SHARED_EVENTS,
  type DeporteAnadidoData,
  type PlazaPerdidaData,
  cuposPorGrupo,
  PROPORCION_DE_ZURDOS,
  conLaPierna,
  ladoDePuesto,
  type Pierna,
  TAGS,
  defineModule,
  type CompetitionResultData,
  type PresentacionData,
  type Rng,
  type Gender,
  type InitContext,
  type NpcDirectory,
  type NpcRole,
  type NpcView,
  type ClubDirectory,
  type ClassAttendedData,
  type ClubJoinData,
  type ClubLeaveData,
  type IdentityService,
  type DatosDeAgenda,
  CALIDAD_DE_TAMANO,
  NIVEL_PRACTICA,
  CIUDAD_ACTUAL,
  idsDeColegiosDeFuera,
  type CiudadDef,
  aptitudDe,
  datosDeDeporte,
  fichasDeDeporte,
  type EquipoDeDeporte,
  type FichaDeDeporte,
  type PoblacionDeDeporte,
  type ReadContext,
  type PresenciaService,
  type SesionDeClub,
  type TipoAsignado,
  azarDe,
  construirAgenda,
  ubicacionEn,
  type TramoDeAgenda,
} from '@ds/contracts';
import {
  aficionadoPorLosPadres,
  desarrolloRival,
  geneticaDeHermano,
  geneticaDeNino,
  interesPor,
  nivelEn,
  plazasPorEdad,
  potencialEn,
  ritmoEn,
  formaEn,
  type Genetica,
} from './deportistas';
import { aGuardar, avanzarSemana, historiaDe, valoresIniciales } from './capacidades';
import { semillaDeSesionDeEquipo } from '@ds/kit-deporte';
import { habilidadesIniciales, lectorDe, prepararTrabajo, type HabilidadesDe } from './rutina';
import { ofertaDePuesto, probabilidadDeAceptarPuesto, puestoDondeMasVale, type JugadorConPuesto, type OfertaDePuesto } from './puestos';
import { NUNCA, historiaDeportiva, listaDeSesion, semanaDeNino, semanaQueAcaba, type Rendimientos } from './semana';

/**
 * MÓDULO NPCs (id `npcs`).
 *
 * Los NPCs dan profundidad al personaje y son la red que une módulos:
 * - Ayudan según lo que saben hacer (carácter, intereses y nivel), no por una etiqueta fija: ver `aptitudDe`.
 * - `levels`: nivel por disciplina; los rivales progresan solos cada día.
 * - Escuchan `competicion.resultado` (evento compartido) de cualquier deporte.
 * - Publican el servicio `npcs` para que otros módulos los consulten.
 */

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
  puestoFavorito?: Record<string, string>;
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
   * (`equiposPorDemanda`) y los cierra si no llega al mínimo de jugadores. La plantilla del club en esa categoría es el máximo de un equipo por el número de equipos.
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

const clamp = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));

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
const registroDe = (npcs: readonly Npc[]): RegistroDeNombres => {
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
const descripcionDeOtroColegio = (g: Gender): string => (g === 'f' ? 'Alumna de otro colegio.' : 'Alumno de otro colegio.');
const EDAD_ALUMNO_MIN = 8;
/** A esta edad (de competición) se termina el colegio: 2.º de bachillerato es a los 17. */
const EDAD_FIN_COLEGIO = 18;
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
function persona(rng: Rng, id: string, role: NpcRole, edad: number, dia: number, usados: RegistroDeNombres, tipos: TipoAsignado[], descripcion: (g: Gender) => string, tags: string[] = [], conGenetica = false): Npc {
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
function hermanos(ctx: InitContext, usados: RegistroDeNombres): Npc[] {
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
  return JSON.parse(JSON.stringify({ ...datos.poblacion, equipos, categorias: datos.categorias, deporte: ficha.id, nombre: ficha.nombre.toLowerCase(), primero, nombresDeClub }));
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
    return { ...n, cap: h.cap, pico: h.pico, capUlt: h.capUlt, hab: { ...n.hab, [pob.deporte]: h.hab }, levels: { ...n.levels, [pob.deporte]: h.nivel } };
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
    }
  }
}

/** El equipo de un jugador (club y categoría que le toca por edad de competición) como clave, o `undefined` si no está en un equipo. */
function claveDeEquipoCategoria(pob: PoblacionGuardada, n: Npc, inicioCurso: number): string | undefined {
  if (n.deporte !== pob.deporte || !n.equipo) return undefined;
  const edad = edadNpc(n, inicioCurso);
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

/** La categoría del deporte a una edad de competición, o `undefined` si el deporte no guardó sus categorías. */
const categoriaDe = (pob: PoblacionGuardada, edad: number): CategoriaDef | undefined => (pob.categorias?.length ? categoriaDeEdad(pob.categorias, edad) : undefined);

/** Quiénes juegan hoy en el equipo de un club en una categoría del deporte. */
const jugadoresDelEquipo = (npcs: readonly Npc[], pob: PoblacionGuardada, club: string, cat: CategoriaDef, dia: number): Npc[] =>
  npcs.filter((n) => n.deporte === pob.deporte && n.equipo === club && (edadNpc(n, dia) ?? -1) >= cat.edadMin && (edadNpc(n, dia) ?? -1) <= cat.edadMax);

/**
 * ¿Entra el personaje (de esta edad de competición y este nivel en el deporte) en el equipo de su categoría? Si el equipo tiene hueco, sí. Si está completo
 * (en su máximo), solo si es mejor que alguno de los que hay (en global, de momento): saldría el peor. Los deportes sin equipos por categoría no tienen tope.
 */
export function plazaEnElEquipo(npcs: readonly Npc[], pobs: readonly PoblacionGuardada[], deporte: string, club: string, edad: number, nivel: number, dia: number, puestos?: Readonly<Record<string, number>>, rend: Rendimientos = new Map(), pierna?: Pierna): PlazaEnEquipo {
  const pob = pobs.find((p) => p.deporte === deporte);
  const equipo = pob?.equipos.find((e) => e.club === club);
  const cat = pob && equipo?.plantillaPorCategoria ? categoriaDe(pob, edad) : undefined;
  if (!pob || !equipo?.plantillaPorCategoria || !cat) return { estado: 'libre' };
  const delEquipo = jugadoresDelEquipo(npcs, pob, club, cat, dia);
  const max = capacidadDe(equipo, cat.id);
  // Con puestos (el fútbol), la plaza se mide por puesto: el club le ofrece el puesto en que entraría (el suyo, si entra; si no, aquel en que más vale).
  if (pob.puestos && puestos) {
    const val = valoracionDe(rend);
    const favorito = puestoDondeMasVale(puestos);
    const oferta = ofertaAlCandidato(delEquipo, max, pob, puestos, favorito, val, dia, pierna);
    if (oferta) return { estado: oferta.estado, ...(oferta.peor ? { peor: { id: oferta.peor.id, nombre: oferta.peor.nombre, nivel: oferta.peor.valor } } : {}), puesto: oferta.puesto };
    // Completo en todos los puestos: se dice quién es el peor del grupo de su mejor puesto.
    const grupo = pob.puestos.reparto.find((g) => g.puestos.includes(favorito));
    const delGrupo = delEquipo.filter((j) => grupo?.puestos.includes(puestoDeJugador(j, pob, val, dia) ?? ''));
    const peor = delGrupo.length ? delGrupo.reduce((m, j) => (valorEnSuPuesto(j, pob, val, dia, puestoDeJugador(j, pob, val, dia)!) < valorEnSuPuesto(m, pob, val, dia, puestoDeJugador(m, pob, val, dia)!) ? j : m)) : undefined;
    return { estado: 'completo', ...(peor ? { peor: { id: peor.id, nombre: peor.name, nivel: valorEnSuPuesto(peor, pob, val, dia, puestoDeJugador(peor, pob, val, dia)!) } } : {}), puesto: favorito };
  }
  return reglaDePlaza(delEquipo.map((n) => ({ id: n.id, nombre: n.name, valor: n.levels[deporte] ?? 0 })), max, nivel);
}

/** Un jugador de un equipo, con lo que vale de verdad (su rendimiento en el deporte). */
export interface JugadorDeEquipo {
  id: string;
  nombre: string;
  valor: number;
}

/**
 * LA REGLA DE PLAZA en un equipo, **la misma para el personaje y para cualquier PNJ**: si el equipo tiene hueco, la plaza es libre; si está completo, solo entra quien vale más
 * que el peor de los que hay (en un empate, sale el de id mayor), que sería quien deje el sitio; y si no, el equipo está completo. `valor` es lo que vale de verdad el que
 * quiere entrar (su rendimiento en el deporte). La usan `plazaEnElEquipo` (el personaje) y el reclutamiento de los clubes (los niños del mundo).
 */
export function reglaDePlaza(equipo: readonly JugadorDeEquipo[], max: number, valor: number): PlazaEnEquipo {
  if (equipo.length < max) return { estado: 'libre' };
  const peor = equipo.reduce((m, n) => (n.valor < m.valor || (n.valor === m.valor && n.id > m.id) ? n : m));
  const datos = { id: peor.id, nombre: peor.nombre, nivel: peor.valor };
  return valor > peor.valor ? { estado: 'por_merito', peor: datos } : { estado: 'completo', peor: datos };
}

// ---------------------------------------------------------------------------------------------------- reclutamiento de deportistas

/** Las edades en las que recluta un equipo: las del deporte, acotadas por las suyas (un equipo de colegio solo llega a la edad en que acaba el colegio). */
const edadesDe = (pob: PoblacionGuardada, e: EquipoGuardado): number[] => {
  const min = Math.max(pob.reclutamiento.edades.min, e.edades?.min ?? 0);
  const max = Math.min(pob.reclutamiento.edades.max, e.edades?.max ?? (e.colegio ? EDAD_FIN_COLEGIO - 1 : Infinity));
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
};

/** Un niño al que un equipo puede mirar: una persona del mundo con genética que aún no juega a nada (ni lo ha dejado). */
interface Aspirante {
  npc: Npc;
  /** Su colegio: `propio` (el del personaje), uno de `COLEGIOS_DE_FUERA` o `ninguno` (ya no va al colegio). */
  colegio: string;
  /** Cuánto le interesa el deporte (0 a 3), su potencial en él y **lo que vale de verdad hoy** (su rendimiento con sus capacidades reales): lo que decide a quién recluta un equipo. */
  interes: number;
  potencial: number;
  valor: number;
}

/** Lo que necesita el reclutamiento para valer a cada niño de verdad: el rendimiento de cada deporte (con sus capacidades reales) y una caché del valor de cada uno en este reclutamiento. */
export interface Valoracion {
  rend: Rendimientos;
  valores: Map<string, number>;
  /** Lo que vale cada niño en cada puesto del deporte (si lo tiene), por niño y deporte. */
  puestos: Map<string, Record<string, number>>;
}
export const valoracionDe = (rend: Rendimientos = new Map()): Valoracion => ({ rend, valores: new Map(), puestos: new Map() });

/**
 * Lo que vale hoy un niño en un deporte: su rendimiento con sus capacidades reales y sus habilidades (las que lleva si ya juega o las de partida si aún no). Sin rendimiento del
 * deporte (los deportes de prueba) o sin capacidades, `undefined`: entonces se usa su potencial.
 */
export function valorRealDe(n: Npc, pob: PoblacionGuardada, v: Valoracion, dia: number): number | undefined {
  const f = v.rend.get(pob.deporte);
  if (!f || !pob.rutina || !n.genetica || !n.cap || !n.pico || n.nacimiento === undefined) return undefined;
  const clave = `${n.id}|${pob.deporte}`;
  const guardado = v.valores.get(clave);
  if (guardado !== undefined) return guardado;
  const hab = n.hab?.[pob.deporte] ?? habilidadesIniciales(n.id, n.genetica, pob.deporte, pob.rutina, dia);
  const t = prepararTrabajo({ id: n.id, genetica: n.genetica, nacimiento: n.nacimiento, cap: n.cap, pico: n.pico }, valoresIniciales(n.id, n.genetica), pob.deporte, pob.rutina, hab, n.capUlt ?? CAPACIDADES_GENETICAS.map(() => NUNCA), dia);
  const lector = lectorDe(t);
  const valor = f(lector);
  v.valores.set(clave, valor);
  if (f.puestos && pob.puestos) v.puestos.set(clave, conLaPierna(f.puestos(lector), piernaDe(n, pob), ventajaDelLado(pob)));
  return valor;
}

/** Lo que vale un niño en cada puesto del deporte (`undefined` si el deporte no tiene puestos o no se puede calcular). */
export function valoresPorPuestoDe(n: Npc, pob: PoblacionGuardada, v: Valoracion, dia: number): Record<string, number> | undefined {
  if (!pob.puestos || valorRealDe(n, pob, v, dia) === undefined) return undefined;
  return v.puestos.get(`${n.id}|${pob.deporte}`);
}

/** La pierna buena de un niño: la que tiene o, si aún no la ha dado (partidas anteriores), un sorteo estable suyo con la proporción de zurdos del deporte. */
export const piernaDe = (n: Pick<Npc, 'id' | 'pierna' | 'genetica'>, pob: PoblacionGuardada): Pierna =>
  n.pierna ?? (rngEstable('pierna', n.genetica?.semilla ?? 0, n.id).next() < (pob.puestos?.pierna?.proporcionDeZurdos ?? PROPORCION_DE_ZURDOS) ? 'izquierda' : 'derecha');

/** Lo que vale el personaje en cada puesto con su pierna buena (la misma regla que los PNJ), o `undefined` si el deporte no tiene puestos. */
const puestosDelPersonaje = (ctx: ReadContext, rend: Rendimientos, pob: PoblacionGuardada): Record<string, number> | undefined => {
  const crudos = rend.get(pob.deporte)?.puestos?.(ctx);
  return crudos ? conLaPierna(crudos, ctx.service<IdentityService>(SERVICES.identidad)?.view().leftHanded ? 'izquierda' : 'derecha', ventajaDelLado(pob)) : undefined;
};

/** Lo que vale la pierna buena de base en los puestos de su lado (±0,25 por defecto): la misma regla para el personaje y los PNJ (`conLaPierna`). */
const ventajaDelLado = (pob: PoblacionGuardada): number => pob.puestos?.pierna?.ventajaDelLado ?? 0.25;

/** El puesto favorito de un niño: el que se le dio o, si aún no lo tiene, aquel en que más vale. */
export function favoritoDe(n: Npc, pob: PoblacionGuardada, v: Valoracion, dia: number): string | undefined {
  const guardado = n.puestoFavorito?.[pob.deporte];
  if (guardado) return guardado;
  const valores = valoresPorPuestoDe(n, pob, v, dia);
  return valores ? puestoDondeMasVale(valores) : undefined;
}

/** El puesto en que juega un niño de un equipo: el que tiene o, si aún no lo tiene (partidas anteriores), aquel en que más vale. */
const puestoDeJugador = (n: Npc, pob: PoblacionGuardada, v: Valoracion, dia: number): string | undefined => n.puesto?.[pob.deporte] ?? favoritoDe(n, pob, v, dia);

/** Lo que vale un jugador de un equipo en su puesto (el personaje, que no tiene capacidades de niño, lleva su valor en `levels`). */
const valorEnSuPuesto = (n: Npc, pob: PoblacionGuardada, v: Valoracion, dia: number, puesto: string): number => valoresPorPuestoDe(n, pob, v, dia)?.[puesto] ?? n.levels[pob.deporte] ?? 0;

/**
 * La oferta de puesto de un equipo (con `jugadores`, que caben `max`) a un candidato que vale `valores` en cada puesto: la regla de plaza por puesto (`ofertaDePuesto`), con el reparto de la
 * plantilla por grupos del deporte. `undefined`: no entra en ningún puesto.
 */
export function ofertaAlCandidato(jugadores: readonly Npc[], max: number, pob: PoblacionGuardada, valores: Readonly<Record<string, number>>, favorito: string | undefined, v: Valoracion, dia: number, piernaDelCandidato?: Pierna): OfertaDePuesto | undefined {
  const conPuesto: JugadorConPuesto[] = jugadores.flatMap((j) => {
    const puesto = puestoDeJugador(j, pob, v, dia);
    return puesto ? [{ id: j.id, nombre: j.name, puesto, valor: valorEnSuPuesto(j, pob, v, dia, puesto), pierna: j.pierna ?? (j.genetica ? piernaDe(j, pob) : undefined) }] : [];
  });
  return ofertaDePuesto(conPuesto, cuposPorGrupo(pob.puestos!, max), pob.puestos!, valores, favorito, piernaDelCandidato);
}

/** ¿Acepta el niño el puesto que le ofrece el club? Siempre el favorito; los demás según su carácter, lo que se parece a su puesto y si sería titular (un sorteo suyo y del club). */
function aceptaElPuesto(n: Npc, pob: PoblacionGuardada, club: string, favorito: string | undefined, oferta: OfertaDePuesto): boolean {
  const p = probabilidadDeAceptarPuesto(pob.puestos!, n.rasgos?.caracter, favorito, oferta.puesto, oferta.titular);
  return p >= 1 || rngEstable('puesto', n.genetica?.semilla ?? 0, n.id, club, oferta.puesto).chance(p);
}

const colegioDeNino = (n: Npc): string => n.colegio ?? (delColegio(n) ? 'propio' : 'ninguno');

/** Los niños de una edad que un deporte puede reclutar: los del colegio del personaje, los de otros colegios, los hermanos y los jóvenes que ya no van al colegio. */
function aspirantesDeEdad(npcs: readonly Npc[], pob: PoblacionGuardada, edad: number, dia: number, val: Valoracion): Aspirante[] {
  const lista: Aspirante[] = [];
  for (const n of npcs) {
    if (!n.genetica || n.deporte !== undefined || n.dejado?.includes(pob.deporte) || n.apartado?.includes(pob.deporte) || edadNpc(n, dia) !== edad) continue;
    const potencial = potencialEn(n.id, n.genetica, pob);
    lista.push({ npc: n, colegio: colegioDeNino(n), interes: interesPor(n.rasgos, pob.deporte), potencial, valor: valorRealDe(n, pob, val, dia) ?? potencial });
  }
  return lista;
}

/** Un equipo recluta a un niño: pasa a jugar al deporte en ese equipo, con su potencial, su ritmo y su nivel a esa edad, y sigue los tipos de agenda de su club. */
function reclutarA(a: Aspirante, e: EquipoGuardado, pob: PoblacionGuardada, edad: number, dia: number, puesto?: string, favorito?: string): Npc {
  const base = a.npc;
  const g = base.genetica!;
  const enSuColegio = e.colegio === 'propio';
  // Un niño de otro colegio pasa a ser un rival (juega en su club o en el equipo de su colegio); un compañero, un hermano o un niño del barrio sigue siendo quien es y además va a las sesiones de su club.
  const deFuera = base.role === 'vecino';
  const tipos: TipoAsignado[] = deFuera
    ? [{ tipo: 'rival', club: e.nombre, deporte: pob.deporte }]
    : [...(base.tipos ?? []).map((t) => (t.tipo === 'hermano' ? { ...t, deporte: pob.deporte } : t)), { tipo: 'club', club: e.club, deporte: pob.deporte }];
  return {
    ...base,
    ...(deFuera ? { role: 'rival' as NpcRole } : {}),
    deporte: pob.deporte,
    equipo: e.club,
    club: e.nombre,
    tags: [...base.tags, pob.etiqueta, ...(enSuColegio ? ['equipo'] : [])],
    levels: { ...base.levels, [pob.deporte]: nivelEn(base.id, g, a.potencial, (dia - base.nacimiento!) / 365, pob.deporte, dia) },
    potential: { ...base.potential, [pob.deporte]: a.potencial },
    ...(pob.puestos ? { pierna: piernaDe(base, pob) } : {}),
    ...(puesto ? { puesto: { ...base.puesto, [pob.deporte]: puesto } } : {}),
    ...(favorito || base.puestoFavorito?.[pob.deporte] ? { puestoFavorito: { ...base.puestoFavorito, [pob.deporte]: base.puestoFavorito?.[pob.deporte] ?? favorito! } } : {}),
    ritmo: { ...base.ritmo, [pob.deporte]: ritmoEn(base.id, g, pob.deporte) },
    tipos,
    description: deFuera ? pob.descripcionDeRival : enSuColegio ? `${base.description?.replace(/\.$/, '')}. ${pob.descripcionDelEquipo}` : base.description,
  };
}

/**
 * Los equipos y clubes de un deporte completan sus plantillas. Cada equipo tiene un número de niños más o menos definido y reparte sus plazas entre las
 * edades que recluta; en cada edad, los equipos escogen por orden de calidad (los clubes de más nivel, primero) entre los niños que les corresponden: los
 * equipos de un colegio, solo entre sus alumnos; los clubes, entre los de cualquier colegio (puede pasar que un compañero del personaje vaya a un club de
 * fuera, pero nunca que un niño de otro colegio juegue en el equipo del colegio del personaje). Entre ellos se recluta primero a los interesados en el
 * deporte y, de ellos, a los de más potencial: así, entre tantos niños, de forma natural unos destacan sobre otros. Sirve para crear la partida, para
 * rellenar las plazas que quedan libres cada curso y para añadir un deporte a una partida empezada.
 */
export function reclutarDeportistas(npcs: Npc[], pob: PoblacionGuardada, dia: number, soloInteresados = false, reservas: ReadonlyMap<string, number> = new Map(), val: Valoracion = valoracionDe()): Npc[] {
  const equipos = [...pob.equipos].filter((e) => !e.plantillaPorCategoria).sort((a, b) => b.calidad - a.calidad || (a.club < b.club ? -1 : 1));
  const plazas = new Map(equipos.map((e) => [e.club, plazasPorEdad(e.club, e.objetivo, edadesDe(pob, e))]));
  const ocupadas = new Map<string, number>();
  // Cuántos le faltan a cada equipo para completar su plantilla (los niños envejecen y las plazas por edad ya no coinciden con quien hay: lo que cuenta es el total).
  const faltan = new Map(equipos.map((e) => [e.club, e.objetivo]));
  for (const n of npcs) {
    const edad = n.deporte === pob.deporte && n.equipo !== undefined ? edadNpc(n, dia) : undefined;
    if (edad === undefined) continue;
    ocupadas.set(`${n.equipo}|${edad}`, (ocupadas.get(`${n.equipo}|${edad}`) ?? 0) + 1);
    faltan.set(n.equipo!, (faltan.get(n.equipo!) ?? 0) - 1);
  }
  const cambios = new Map<string, Npc>();
  const tomados = new Set<string>();
  const orden = (x: Aspirante, y: Aspirante): number => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1);
  for (let edad = pob.reclutamiento.edades.min; edad <= pob.reclutamiento.edades.max; edad++) {
    // En cada edad, un equipo busca cubrir lo que le falta respecto a su reparto ideal por edades, sin pasar de lo que le falta en total.
    const huecos = equipos
      .map((e) => ({ e, falta: Math.min((plazas.get(e.club)?.get(edad) ?? 0) - (ocupadas.get(`${e.club}|${edad}`) ?? 0), faltan.get(e.club) ?? 0) }))
      .filter((h) => h.falta > 0);
    if (!huecos.length) continue;
    const pool = aspirantesDeEdad(npcs, pob, edad, dia, val);
    for (const { e, falta } of huecos) {
      const elegibles = pool.filter((a) => !tomados.has(a.npc.id) && (e.colegio === undefined || a.colegio === e.colegio));
      const elegidos = [...elegibles.filter((a) => a.interes > 0).sort(orden), ...(soloInteresados ? [] : elegibles.filter((a) => a.interes === 0).sort(orden))].slice(0, falta);
      faltan.set(e.club, (faltan.get(e.club) ?? 0) - elegidos.length);
      for (const a of elegidos) {
        tomados.add(a.npc.id);
        cambios.set(a.npc.id, reclutarA(a, e, pob, edad, dia));
      }
    }
  }
  const conLegados = npcs.map((n) => cambios.get(n.id) ?? n);
  return reclutarEquiposPorCategoria(conLegados, pob, dia, soloInteresados, reservas, tomados, val);
}

/** Las categorías en que un equipo tiene su propio equipo (las de `categorias`, o todas las que recluta el club) con las edades que recluta en cada una. */
function categoriasDelEquipo(pob: PoblacionGuardada, e: EquipoGuardado): { id: string; edades: number[] }[] {
  const delClub = new Set(edadesDe(pob, e));
  return (pob.categorias ?? [])
    .filter((c) => !e.categorias || e.categorias.includes(c.id))
    .map((c) => ({ id: c.id, edades: [...delClub].filter((x) => x >= c.edadMin && x <= c.edadMax).sort((a, b) => a - b) }))
    .filter((c) => c.edades.length > 0);
}

/** Cuántos jugadores caben en el club en una categoría: el máximo de un equipo por los equipos que el club tiene abiertos en ella. */
export const capacidadDe = (e: EquipoGuardado, categoria: string): number => (e.plantillaPorCategoria?.max ?? 0) * (e.equiposPorCategoria?.[categoria] ?? 1);

/** Clave de un equipo por categoría (club y categoría) en el mapa de reservas del personaje. */
export const claveDeEquipo = (club: string, categoria: string): string => `${club}|${categoria}`;

/**
 * Los equipos por categoría (`plantillaPorCategoria`): uno por club y categoría. Los clubes escogen por orden de tamaño (los grandes primero) y cada uno recluta a los
 * interesados **por lo que vale cada uno de verdad** (su rendimiento hoy), con **la misma regla de plaza que el personaje** (`reglaDePlaza`): con hueco entra, y con el equipo
 * completo solo entra quien vale más que el peor, que deja el sitio y vuelve a estar disponible para los clubes que escojan después. Se llega como mucho al máximo (menos
 * la plaza que ocupa el personaje, si juega ahí: `reservas`) y, si con los interesados no se llega al mínimo, se completa con niños sin interés hasta el mínimo y no más allá.
 * Con `soloInteresados` solo se hace lo primero.
 */
function reclutarEquiposPorCategoria(npcs: Npc[], pob: PoblacionGuardada, dia: number, soloInteresados: boolean, reservas: ReadonlyMap<string, number>, tomados: Set<string>, val: Valoracion): Npc[] {
  const equipos = pob.equipos.filter((e) => e.plantillaPorCategoria).sort((a, b) => b.calidad - a.calidad || (a.club < b.club ? -1 : 1));
  if (!equipos.length) return npcs;
  // La lista de trabajo: los niños que van cambiando de equipo mientras los clubes escogen.
  const lista = new Map(npcs.map((n) => [n.id, n]));
  const orden = (x: Aspirante, y: Aspirante): number => y.valor - x.valor || (x.npc.id < y.npc.id ? -1 : 1);
  const valorDe = (n: Npc): number => valorRealDe(n, pob, val, dia) ?? n.levels[pob.deporte] ?? 0;
  for (const e of equipos) {
    const { min } = e.plantillaPorCategoria!;
    for (const cat of categoriasDelEquipo(pob, e)) {
      const max = capacidadDe(e, cat.id);
      const enEquipo = (): Npc[] => [...lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club && cat.edades.includes(edadNpc(n, dia) ?? -1));
      const tope = max - (reservas.get(claveDeEquipo(e.club, cat.id)) ?? 0);
      const todos = [...lista.values()];
      const elegibles = cat.edades
        .flatMap((edad) => aspirantesDeEdad(todos, pob, edad, dia, val).map((a) => ({ a, edad })))
        .filter(({ a }) => !tomados.has(a.npc.id) && (e.colegio === undefined || a.colegio === e.colegio));
      const ficha = ({ a, edad }: { a: Aspirante; edad: number }): void => {
        tomados.add(a.npc.id);
        lista.set(a.npc.id, reclutarA(a, e, pob, edad, dia));
      };
      if (pob.puestos && val.rend.get(pob.deporte)?.puestos) {
        // Con puestos: se llena el reparto de la plantilla grupo a grupo (los más escasos primero: porteros, centrales...) con los interesados que más valen en cada grupo y que aceptan el
        // puesto (siempre el favorito; los demás, según su carácter); después, quien vale más que el peor de un grupo lo sustituye, y por último se completa hasta el mínimo con los demás.
        const mercado: MercadoDeFichajes = { lista, pobs: [pob], dia, val, reservas };
        const pasos = (interesados: boolean) => (a: Aspirante) => (interesados ? a.interes > 0 : a.interes === 0) && !tomados.has(a.npc.id);
        const intentar = (c: { a: Aspirante; edad: number }, grupo?: string): boolean => {
          const valores = valoresPorPuestoDe(c.a.npc, pob, val, dia);
          if (!valores) return false;
          const favorito = favoritoDe(c.a.npc, pob, val, dia);
          const jugadores = enEquipo();
          const cupos = cuposPorGrupo(pob.puestos!, tope);
          const solo = grupo ? { [grupo]: cupos[grupo] } : cupos;
          const oferta = ofertaAlCandidato(jugadores, tope, pob, valores, favorito, val, dia);
          const ofrecida = grupo ? ofertaDePuesto(jugadores.flatMap((j) => { const pj = puestoDeJugador(j, pob, val, dia); return pj ? [{ id: j.id, nombre: j.name, puesto: pj, valor: valorEnSuPuesto(j, pob, val, dia, pj) }] : []; }), solo as Record<string, number>, pob.puestos!, valores, favorito) : oferta;
          if (!ofrecida || (c.a.interes > 0 && !aceptaElPuesto(c.a.npc, pob, e.club, favorito, ofrecida))) return false;
          if (ofrecida.peor) {
            lista.set(ofrecida.peor.id, sinDeporte(lista.get(ofrecida.peor.id)!, pob, false));
            tomados.delete(ofrecida.peor.id);
          }
          tomados.add(c.a.npc.id);
          lista.set(c.a.npc.id, reclutarA(c.a, e, pob, c.edad, dia, ofrecida.puesto, favorito));
          return true;
        };
        void mercado;
        const grupos = [...pob.puestos.reparto].sort((x, y) => x.jugadores - y.jugadores || (x.grupo < y.grupo ? -1 : 1));
        const cupos = cuposPorGrupo(pob.puestos, tope);
        const enGrupo = (g: { puestos: readonly string[] }) => enEquipo().filter((j) => g.puestos.includes(puestoDeJugador(j, pob, val, dia) ?? '')).length;
        for (const g of grupos) {
          const mejoresEnElGrupo = (a: Aspirante) => {
            const vs = valoresPorPuestoDe(a.npc, pob, val, dia);
            const fav = favoritoDe(a.npc, pob, val, dia);
            return (fav && g.puestos.includes(fav) ? 1000 : 0) + (vs ? Math.max(...g.puestos.map((p) => vs[p] ?? 0)) : 0);
          };
          for (const c of elegibles.filter(({ a }) => pasos(true)(a)).sort((x, y) => mejoresEnElGrupo(y.a) - mejoresEnElGrupo(x.a) || (x.a.npc.id < y.a.npc.id ? -1 : 1))) {
            if (enGrupo(g) >= (cupos[g.grupo] ?? 0)) break;
            intentar(c, g.grupo);
          }
        }
        // Los que quedan (interesados), del que más vale al que menos: entran por mérito si valen más que el peor de algún grupo.
        for (const c of elegibles.filter(({ a }) => pasos(true)(a)).sort((x, y) => orden(x.a, y.a))) intentar(c);
        if (!soloInteresados) {
          for (const g of grupos) {
            for (const c of elegibles.filter(({ a }) => pasos(false)(a)).sort((x, y) => orden(x.a, y.a))) {
              if (enEquipo().length >= min || enGrupo(g) >= (cupos[g.grupo] ?? 0)) break;
              intentar(c, g.grupo);
            }
          }
        }
        continue;
      }
      for (const c of elegibles.filter(({ a }) => a.interes > 0).sort((x, y) => orden(x.a, y.a))) {
        const actuales = enEquipo();
        const plaza = reglaDePlaza(actuales.map((n) => ({ id: n.id, nombre: n.name, valor: valorDe(n) })), tope, c.a.valor);
        if (plaza.estado === 'completo') continue;
        if (plaza.estado === 'por_merito') {
          // Entra quien vale más que el peor: el peor deja el sitio (sin quedar vetado: otro club puede escogerlo).
          const sale = lista.get(plaza.peor!.id)!;
          lista.set(sale.id, sinDeporte(sale, pob, false));
          tomados.delete(sale.id);
        }
        ficha(c);
      }
      const total = enEquipo().length;
      if (!soloInteresados && total < min) for (const c of elegibles.filter(({ a }) => a.interes === 0 && !tomados.has(a.npc.id)).sort((x, y) => orden(x.a, y.a)).slice(0, min - total)) ficha(c);
    }
  }
  return npcs.map((n) => lista.get(n.id) ?? n);
}

// ---------------------------------------------------------------------------------------------------- fichajes, desplazados y quien se queda sin equipo

/** Quiénes juegan hoy en el equipo de un club para niños de esta edad y cuántos caben (menos la plaza del personaje, si es de ese equipo); `undefined` si el club no tiene equipo para esa edad. */
function plantelDe(lista: ReadonlyMap<string, Npc>, pob: PoblacionGuardada, e: EquipoGuardado, edad: number, dia: number, reservas: ReadonlyMap<string, number>): { jugadores: Npc[]; max: number } | undefined {
  if (!edadesDe(pob, e).includes(edad)) return undefined;
  const delClub = [...lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club);
  if (!e.plantillaPorCategoria) return { jugadores: delClub, max: e.objetivo };
  const cat = categoriaDe(pob, edad);
  if (!cat || (e.categorias && !e.categorias.includes(cat.id))) return undefined;
  const jugadores = delClub.filter((n) => (edadNpc(n, dia) ?? -1) >= cat.edadMin && (edadNpc(n, dia) ?? -1) <= cat.edadMax);
  return { jugadores, max: capacidadDe(e, cat.id) - (reservas.get(claveDeEquipo(e.club, cat.id)) ?? 0) };
}

/** Lo que necesitan los fichajes y la búsqueda de club: la lista de trabajo, el día, cómo se valora a cada niño y las plazas que ocupa el personaje. */
export interface MercadoDeFichajes {
  lista: Map<string, Npc>;
  pobs: readonly PoblacionGuardada[];
  dia: number;
  val: Valoracion;
  reservas: ReadonlyMap<string, number>;
}

/** Cuánto vale un niño en un deporte (su rendimiento hoy; si no se puede calcular, su nivel o su potencial). */
const valorEn = (n: Npc, pob: PoblacionGuardada, m: MercadoDeFichajes): number => valorRealDe(n, pob, m.val, m.dia) ?? n.levels[pob.deporte] ?? potencialEn(n.id, n.genetica!, pob);

/** El personaje como jugador de un equipo: su deporte, su club, su categoría (id), cuánto vale en el deporte, su edad de competición y su nombre. */
export interface JugadorEnClub {
  deporte: string;
  club: string;
  categoria: string;
  valor: number;
  edad: number;
  /** El puesto en que juega, si el deporte tiene puestos (y `valor` es lo que vale en él), y su pierna buena. */
  puesto?: string;
  pierna?: Pierna;
}
const idDelPersonaje = (deporte: string): string => `personaje@${deporte}`;
/** El personaje como un jugador más del mundo, solo mientras se hacen los fichajes (para que la regla de plaza lo trate como a los demás). */
const jugadorComoNpc = (j: JugadorEnClub, dia: number): Npc => ({
  id: idDelPersonaje(j.deporte),
  name: 'Tú',
  role: 'companero',
  gender: 'm',
  tags: [],
  levels: { [j.deporte]: j.valor },
  potential: {},
  deporte: j.deporte,
  equipo: j.club,
  ...(j.puesto ? { puesto: { [j.deporte]: j.puesto } } : {}),
  ...(j.pierna ? { pierna: j.pierna } : {}),
  nacimiento: primerDiaDelAnio(anioNatural(dia) - j.edad),
});

type Entrada = { entra: false } | { entra: true; desplazado?: Npc };

/**
 * Un niño sin equipo intenta entrar en un club con **la regla de plaza** (`reglaDePlaza`, la misma que el personaje): con hueco, entra; con el equipo lleno, entra si vale más que
 * el peor, que deja el sitio (queda sin equipo y busca otro). Respeta que los equipos de un colegio solo cogen a sus alumnos y las edades del club.
 */
function intentarEntrar(m: MercadoDeFichajes, n: Npc, e: EquipoGuardado, pob: PoblacionGuardada): Entrada {
  if (!n.genetica || n.nacimiento === undefined) return { entra: false };
  const edad = edadNpc(n, m.dia);
  if (edad === undefined || (e.colegio !== undefined && colegioDeNino(n) !== e.colegio)) return { entra: false };
  const plantel = plantelDe(m.lista, pob, e, edad, m.dia, m.reservas);
  if (!plantel) return { entra: false };
  const potencial = potencialEn(n.id, n.genetica, pob);
  const aspirante = { npc: n, colegio: colegioDeNino(n), interes: interesPor(n.rasgos, pob.deporte), potencial, valor: valorEn(n, pob, m) };
  // Con puestos: el club le ofrece el puesto en que entraría (con hueco en él o valiendo más que el peor de ese puesto) y el niño lo acepta o no según su carácter.
  const valores = valoresPorPuestoDe(n, pob, m.val, m.dia);
  if (pob.puestos && valores) {
    const favorito = favoritoDe(n, pob, m.val, m.dia);
    const oferta = ofertaAlCandidato(plantel.jugadores, plantel.max, pob, valores, favorito, m.val, m.dia, piernaDe(n, pob));
    if (!oferta || !aceptaElPuesto(n, pob, e.club, favorito, oferta)) return { entra: false };
    const desplazado = oferta.peor ? m.lista.get(oferta.peor.id) : undefined;
    m.lista.set(n.id, reclutarA(aspirante, e, pob, edad, m.dia, oferta.puesto, favorito));
    if (desplazado) m.lista.set(desplazado.id, sinDeporte(desplazado, pob, false));
    return { entra: true, desplazado };
  }
  const plaza = reglaDePlaza(plantel.jugadores.map((j) => ({ id: j.id, nombre: j.name, valor: valorEn(j, pob, m) })), plantel.max, aspirante.valor);
  if (plaza.estado === 'completo') return { entra: false };
  const desplazado = plaza.estado === 'por_merito' ? m.lista.get(plaza.peor!.id) : undefined;
  m.lista.set(n.id, reclutarA(aspirante, e, pob, edad, m.dia));
  if (desplazado) m.lista.set(desplazado.id, sinDeporte(desplazado, pob, false));
  return { entra: true, desplazado };
}

/** Los clubes de un deporte del más grande al más pequeño: el orden en que un niño busca plaza. */
const clubesPorTamano = (pob: PoblacionGuardada): EquipoGuardado[] => [...pob.equipos].sort((a, b) => b.calidad - a.calidad || (a.club < b.club ? -1 : 1));

/**
 * Los niños que se quedan sin equipo (desplazados por otro que vale más) buscan club, **dentro del plazo de fichajes y con la misma regla de plaza**:
 * 1. otro club de su deporte, del más grande al más pequeño, con hueco o desplazando a uno peor (que a su vez busca);
 * 2. si no encuentra, deja ese deporte al menos ese curso (`apartado`: puede volver a intentarlo en el siguiente plazo) y busca club en otro deporte que le interese, con la misma regla;
 * 3. si ningún club de ningún deporte lo quiere, deja los deportes que ha intentado **para siempre** (`dejado`): deja de ser deportista y no vuelve a apuntarse.
 * `origen` es el deporte del que se les ha desplazado.
 */
export function colocarDesplazados(m: MercadoDeFichajes, desplazados: readonly { id: string; origen: string }[]): void {
  const cola = [...desplazados];
  for (let vueltas = 0; cola.length && vueltas < 20000; vueltas++) {
    const { id, origen } = cola.shift()!;
    let n = m.lista.get(id);
    if (!n || n.deporte !== undefined || id.startsWith('personaje@')) continue;
    const deportes = [origen, ...m.pobs.filter((p) => p.deporte !== origen && interesPor(n!.rasgos, p.deporte) > 0).sort((a, b) => interesPor(n!.rasgos, b.deporte) - interesPor(n!.rasgos, a.deporte)).map((p) => p.deporte)];
    const intentados: string[] = [];
    let colocado = false;
    for (const deporte of deportes) {
      const pob = m.pobs.find((p) => p.deporte === deporte);
      if (!pob || n.dejado?.includes(deporte)) continue;
      // Quien deja un deporte (el de origen) no vuelve a él en este plazo después de intentarlo.
      if (deporte !== origen && n.apartado?.includes(deporte)) continue;
      intentados.push(deporte);
      for (const e of clubesPorTamano(pob)) {
        const res = intentarEntrar(m, n, e, pob);
        if (!res.entra) continue;
        colocado = true;
        if (res.desplazado) cola.push({ id: res.desplazado.id, origen: deporte });
        break;
      }
      if (colocado) break;
      if (deporte === origen) {
        n = { ...n, apartado: [...new Set([...(n.apartado ?? []), origen])] };
        m.lista.set(id, n);
      }
    }
    if (!colocado) m.lista.set(id, { ...n, apartado: n.apartado?.filter((x) => !intentados.includes(x)), dejado: [...new Set([...(n.dejado ?? []), ...intentados])] });
  }
}

/** Cuánto ceden los padres y la ambición a un fichaje: de 5 % a 95 %. La ambición (eje del carácter, de −50 a 50) y lo que practicaron los padres (de 0 a 3) la suben; es lo que decide el niño. */
export function probabilidadDeFichar(rasgos: RasgosDe | undefined, padres: { padre: Practica; madre: Practica } | undefined): number {
  const ambicion = (rasgos?.caracter.ambicion ?? 0) / 50;
  const deportivos = padres ? (NIVEL_PRACTICA[padres.padre] + NIVEL_PRACTICA[padres.madre]) / 6 : 0;
  return clamp(0.35 + 0.35 * ambicion + 0.25 * deportivos, 0.05, 0.95);
}

/** A cuántos de cada equipo mira cada club en el verano: los mejores de los clubes más pequeños. */
const CANDIDATOS_POR_EQUIPO = 3;

/**
 * Los fichajes de verano (dentro del plazo, `CIUDAD_Y_LIGAS.md` §7): los clubes, de más grandes a más pequeños, miran a los mejores de los clubes más pequeños de su categoría; cada
 * niño decide si se va según su ambición y lo que practicaron sus padres (`probabilidadDeFichar`) y la plaza (`reglaDePlaza`: con hueco o siendo mejor que el peor). Si la plaza no
 * se consigue, se queda donde estaba. Los desplazados buscan club (`colocarDesplazados`).
 */
export function fichajesDeVerano(m: MercadoDeFichajes, semilla: number, curso: number): void {
  const desplazados: { id: string; origen: string }[] = [];
  for (const pob of m.pobs) {
    for (const e of clubesPorTamano(pob)) {
      const unidades = e.plantillaPorCategoria ? categoriasDelEquipo(pob, e) : [{ id: 'club', edades: edadesDe(pob, e) }];
      for (const u of unidades) {
        const candidatos = [...m.lista.values()]
          .filter((n) => {
            if (n.deporte !== pob.deporte || !n.equipo || n.equipo === e.club || !n.genetica) return false;
            const suyo = pob.equipos.find((x) => x.club === n.equipo);
            return !!suyo && suyo.calidad < e.calidad && u.edades.includes(edadNpc(n, m.dia) ?? -1) && (e.colegio === undefined || colegioDeNino(n) === e.colegio);
          })
          .sort((a, b) => valorEn(b, pob, m) - valorEn(a, pob, m) || (a.id < b.id ? -1 : 1))
          .slice(0, CANDIDATOS_POR_EQUIPO);
        for (const viejo of candidatos) {
          if (!rngEstable('ficha', semilla, viejo.id, e.club, curso).chance(probabilidadDeFichar(viejo.rasgos, viejo.genetica?.padres))) continue;
          const libre = sinDeporte(viejo, pob, false);
          m.lista.set(libre.id, libre);
          const res = intentarEntrar(m, libre, e, pob);
          if (!res.entra) m.lista.set(viejo.id, viejo); // sin plaza: se queda donde estaba
          else if (res.desplazado) desplazados.push({ id: res.desplazado.id, origen: pob.deporte });
        }
      }
    }
  }
  colocarDesplazados(m, desplazados);
}

// ---------------------------------------------------------------------------------------------------- equipos según la demanda

/** Tope de equipos que un club puede tener en una categoría (para que no se abran equipos sin fin). */
export const MAX_EQUIPOS_POR_CATEGORIA = 4;

/** Los niños que quieren jugar al deporte (les interesa) y siguen sin equipo, de las edades de una categoría, y que un club podría coger (un equipo de colegio, solo a sus alumnos). */
function sinEquipoParaClub(arr: readonly Npc[], pob: PoblacionGuardada, e: EquipoGuardado, edades: readonly number[], m: MercadoDeFichajes): Aspirante[] {
  return edades.flatMap((edad) => aspirantesDeEdad(arr, pob, edad, m.dia, m.val)).filter((a) => a.interes > 0 && (e.colegio === undefined || a.colegio === e.colegio));
}

/** Un entrenador para un equipo nuevo: lleva las edades de su categoría y lleva el id de su equipo (para cerrarlo con él). */
const idDeEntrenadorDeEquipo = (club: string, categoria: string, numero: number): string => `entrenador_${club}_${categoria}_${numero}`;

/**
 * **Equipos según la demanda** (decisión del usuario, 03/11/2026): el objetivo es que un personaje del montón siempre encuentre equipo en su categoría y que lo difícil sea subir, no entrar.
 * Cada vez que se fichan jugadores (al crear la partida, que empieza dentro del plazo, y cada verano, después de los fichajes), en cada categoría:
 * 1. **Un club cierra el equipo que no llega al mínimo de jugadores**: si lo que sobra del último equipo no alcanza el mínimo de una plantilla, se cierra (con su entrenador) y los que
 *    sobran, los de menos valor, buscan club como cualquier desplazado.
 * 2. **Si quedan sin equipo al menos tantos interesados como el mínimo de una plantilla, un club abre otro equipo en esa categoría**, con su entrenador. Abre el club con menos equipos en
 *    la categoría (así se reparten) y, a igualdad, el que tiene más demanda (más interesados que podría coger) y el más grande. El equipo nace con los mejores (por lo que valen) de los
 *    que se habían quedado sin equipo, hasta el mínimo de una plantilla (14): con huecos, para que quien vale menos también pueda entrar por la regla de plaza. Se repite hasta que no
 *    quede demanda para otro equipo (quedan sin equipo menos interesados que el mínimo de una plantilla).
 * Dentro de cada club y categoría no cambia nada: si está lleno, entra quien vale más que el peor. (Cuando lleguen los filiales, F2, el segundo equipo será el B.)
 * Devuelve los entrenadores nuevos. Cambia `m.lista` y `m.pobs` (los clubes con sus equipos abiertos).
 */
export function equiposPorDemanda(m: MercadoDeFichajes, rng: Rng): Npc[] {
  const entrenadores: Npc[] = [];
  const pobsNuevas: PoblacionGuardada[] = [];
  for (const pob0 of m.pobs) {
    let pob: PoblacionGuardada = { ...pob0, equipos: pob0.equipos.map((e) => ({ ...e })) };
    if (!pob.equipos.some((e) => e.plantillaPorCategoria)) {
      pobsNuevas.push(pob0);
      continue;
    }
    // 1. Cierres.
    const desplazados: { id: string; origen: string }[] = [];
    for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
      for (const cat of categoriasDelEquipo(pob, e)) {
        const k = e.equiposPorCategoria?.[cat.id] ?? 1;
        if (k <= 1) continue;
        const { min, max } = e.plantillaPorCategoria!;
        const miembros = [...m.lista.values()].filter((n) => n.deporte === pob.deporte && n.equipo === e.club && cat.edades.includes(edadNpc(n, m.dia) ?? -1));
        if (miembros.length - (k - 1) * max >= min) continue;
        // El último equipo no llega al mínimo: se cierra con su entrenador y los que ya no caben (los de menos valor) buscan club.
        e.equiposPorCategoria = { ...e.equiposPorCategoria, [cat.id]: k - 1 };
        if (k - 1 === 1) delete e.equiposPorCategoria[cat.id];
        m.lista.delete(idDeEntrenadorDeEquipo(e.club, cat.id, k));
        const sobran = miembros.length - (k - 1) * max;
        for (const n of [...miembros].sort((a, b) => valorEn(a, pob, m) - valorEn(b, pob, m) || (a.id < b.id ? -1 : 1)).slice(0, Math.max(0, sobran))) {
          m.lista.set(n.id, sinDeporte(n, pob, false));
          desplazados.push({ id: n.id, origen: pob.deporte });
        }
      }
    }
    m.pobs = [...pobsNuevas, pob, ...m.pobs.slice(pobsNuevas.length + 1)];
    colocarDesplazados(m, desplazados);
    // 2. Aperturas, categoría a categoría.
    const categorias = new Map<string, CategoriaDef>();
    for (const e of pob.equipos) for (const c of e.plantillaPorCategoria ? categoriasDelEquipo(pob, e) : []) categorias.set(c.id, (pob.categorias ?? []).find((x) => x.id === c.id)!);
    for (const [catId] of categorias) {
      const sinDemanda = new Set<string>();
      for (let ronda = 0; ronda < 3 * MAX_EQUIPOS_POR_CATEGORIA * pob.equipos.length; ronda++) {
        const arr = [...m.lista.values()];
        const candidatos = pob.equipos
          .filter((e) => e.plantillaPorCategoria && (e.equiposPorCategoria?.[catId] ?? 1) < MAX_EQUIPOS_POR_CATEGORIA && !sinDemanda.has(`${e.club}|${catId}`))
          .flatMap((e) => {
            const cat = categoriasDelEquipo(pob, e).find((c) => c.id === catId);
            return cat ? [{ e, cat, demanda: sinEquipoParaClub(arr, pob, e, cat.edades, m).length }] : [];
          })
          .filter((c) => c.demanda >= c.e.plantillaPorCategoria!.min)
          // Abre el club que tiene menos equipos en la categoría (así se reparten) y, a igualdad, el que tiene más demanda y el más grande.
          .sort((a, b) => (a.e.equiposPorCategoria?.[catId] ?? 1) - (b.e.equiposPorCategoria?.[catId] ?? 1) || b.demanda - a.demanda || b.e.calidad - a.e.calidad || (a.e.club < b.e.club ? -1 : 1));
        if (!candidatos.length) break;
        const { e } = candidatos[0];
        const catDef = categorias.get(catId)!;
        const numero = (e.equiposPorCategoria?.[catId] ?? 1) + 1;
        e.equiposPorCategoria = { ...e.equiposPorCategoria, [catId]: numero };
        entrenadores.push(nuevoEntrenador(rng, pob, registroDe([...arr, ...entrenadores]), { id: idDeEntrenadorDeEquipo(e.club, catId, numero), club: e.club, edades: [catDef.edadMin, Math.min(catDef.edadMax, 99)], edad: [28, 55] }));
        m.pobs = [...pobsNuevas, pob, ...m.pobs.slice(pobsNuevas.length + 1)];
        // El equipo nuevo se forma con los mejores (por lo que valen) de los interesados que se habían quedado sin equipo, hasta el mínimo de una plantilla: así nace con huecos
        // (quien vale menos que los demás también puede entrar, por la regla de plaza) y no se queda ningún otro equipo sin jugadores.
        const elegibles = sinEquipoParaClub([...m.lista.values()], pob, e, categorias.get(catId) ? categoriasDelEquipo(pob, e).find((c) => c.id === catId)!.edades : [], m).sort((a, b) => b.valor - a.valor || (a.npc.id < b.npc.id ? -1 : 1));
        // Si, con los puestos que aceptan, el equipo no llega al mínimo de jugadores, no se abre (se deshace): un club no tiene un equipo que se cierra al año siguiente.
        const antes = new Map(m.lista);
        let colocados = 0;
        for (const a of elegibles) {
          if (colocados >= e.plantillaPorCategoria!.min) break;
          if (intentarEntrar(m, a.npc, e, pob).entra) colocados++;
        }
        if (colocados < e.plantillaPorCategoria!.min) {
          m.lista = antes;
          e.equiposPorCategoria = { ...e.equiposPorCategoria, [catId]: numero - 1 };
          if (numero - 1 === 1) delete e.equiposPorCategoria[catId];
          entrenadores.pop();
          sinDemanda.add(`${e.club}|${catId}`);
        }
      }
    }
    pobsNuevas.push(pob);
  }
  m.pobs = pobsNuevas;
  for (const c of entrenadores) m.lista.set(c.id, c);
  return entrenadores;
}

/**
 * Los equipos de todos los deportes completan sus plantillas en dos vueltas: primero cada deporte recluta a los interesados en él y, solo después, los
 * que aún faltan se cubren con quien encaje (aunque no le interese). Así un niño al que le gusta un deporte no lo pierde porque otro deporte, que va antes,
 * tuviese plazas por cubrir.
 */
export function reclutarEnTodos(npcs: Npc[], pobs: readonly PoblacionGuardada[], dia: number, reservas: ReadonlyMap<string, number> = new Map(), rend: Rendimientos = new Map()): Npc[] {
  const interesados = pobs.reduce((lista, pob) => reclutarDeportistas(lista, pob, dia, true, reservas, valoracionDe(rend)), npcs);
  return pobs.reduce((lista, pob) => reclutarDeportistas(lista, pob, dia, false, reservas, valoracionDe(rend)), interesados);
}

/** Un niño deja el deporte (o se retira): ya no está en ningún equipo y, si lo dejó, no se le vuelve a reclutar para él. */
export function sinDeporte(n: Npc, pob: PoblacionGuardada, dejado: boolean): Npc {
  const { [pob.deporte]: _n, ...levels } = n.levels;
  const { [pob.deporte]: _p, ...potential } = n.potential;
  const ritmo = n.ritmo ? Object.fromEntries(Object.entries(n.ritmo).filter(([k]) => k !== pob.deporte)) : undefined;
  const puesto = n.puesto ? Object.fromEntries(Object.entries(n.puesto).filter(([k]) => k !== pob.deporte)) : undefined;
  return {
    ...n,
    puesto,
    deporte: undefined,
    equipo: undefined,
    club: undefined,
    tags: n.tags.filter((t) => t !== pob.etiqueta && t !== 'equipo'),
    levels,
    potential,
    ritmo,
    // Un niño de otro colegio que deja de jugar vuelve a ser un niño del barrio.
    ...(n.role === 'rival'
      ? { role: 'vecino' as NpcRole, tipos: [{ tipo: 'vecino' as const }], description: descripcionDeOtroColegio(n.gender) }
      : { tipos: n.tipos?.filter((t) => !(t.tipo === 'club' && t.deporte === pob.deporte)).map((t) => (t.tipo === 'hermano' ? { ...t, deporte: undefined } : t)) }),
    ...(dejado ? { dejado: [...(n.dejado ?? []), pob.deporte] } : {}),
  };
}

/**
 * Nuevo curso: los que pasan la edad máxima del deporte se retiran, algún niño pequeño lo deja (con la probabilidad que pide el deporte) y los equipos
 * rellenan las plazas libres con otros niños que encajan. Los niños de otros colegios que se van desaparecen (los que lo dejaron no se vuelven a reclutar);
 * los compañeros, los hermanos y los niños del barrio siguen siendo quienes son, solo que sin deporte.
 */
export function renovarDeportistas(npcs: Npc[], pobs: readonly PoblacionGuardada[], dia: number, rng: Rng, reservas: ReadonlyMap<string, number> = new Map(), rend: Rendimientos = new Map(), semilla = 0, curso = 0, personaje: JugadorEnClub[] = [], resultado: { sinPlaza: string[]; dejanSinClub?: number; pobs?: PoblacionGuardada[] } = { sinPlaza: [] }): Npc[] {
  // Los que echaron del equipo para hacer sitio al personaje vuelven a poder ser reclutados: ya es otro curso.
  let lista = npcs.map((n) => (n.apartado ? { ...n, apartado: undefined } : n));
  for (const pob of pobs) {
    const { edades, edadMaxBaja, probabilidadBaja } = pob.reclutamiento;
    lista = lista.flatMap((n) => {
      if (n.deporte !== pob.deporte || !n.genetica) return [n];
      const edad = edadNpc(n, dia) ?? 0;
      const retirado = edad > edades.max;
      const baja = !retirado && edad <= edadMaxBaja && rng.chance(probabilidadBaja);
      return retirado || baja ? [sinDeporte(n, pob, baja)] : [n];
    });
  }
  // Los fichajes de verano, dentro del plazo (el nuevo curso empieza antes de la primera competición): los clubes grandes miran a los mejores de los pequeños y los desplazados buscan
  // club. El personaje cuenta como un jugador más de su equipo, con lo que vale: si otro que vale más le ocupa el sitio, **sale del club como cualquier niño** (se le avisa con
  // `club.plaza_perdida` y decide él qué hace; lo único distinto es que a él nunca se le retira del deporte para siempre).
  const mercado: MercadoDeFichajes = { lista: new Map(lista.map((n) => [n.id, n])), pobs, dia, val: valoracionDe(rend), reservas: new Map() };
  for (const j of personaje) mercado.lista.set(idDelPersonaje(j.deporte), jugadorComoNpc(j, dia));
  const dejadosAntes = new Set(lista.filter((n) => n.dejado?.length).map((n) => n.id));
  fichajesDeVerano(mercado, semilla, curso);
  resultado.dejanSinClub = [...mercado.lista.values()].filter((n) => n.deporte === undefined && n.dejado?.length && !dejadosAntes.has(n.id)).length;
  const reservasQueQuedan = new Map(reservas);
  for (const j of personaje) {
    const dentro = mercado.lista.get(idDelPersonaje(j.deporte))?.deporte !== undefined;
    mercado.lista.delete(idDelPersonaje(j.deporte));
    if (!dentro) {
      resultado.sinPlaza.push(j.deporte);
      reservasQueQuedan.delete(claveDeEquipo(j.club, j.categoria));
    }
  }
  // Los equipos se rellenan con los interesados y, después, la regla de los equipos según la demanda: cierran los que no llegan al mínimo y abren los que hacen falta para que los
  // interesados que se quedan sin equipo (tantos como el mínimo de una plantilla) lo tengan.
  const llenos = reclutarEnTodos([...mercado.lista.values()], mercado.pobs, dia, reservasQueQuedan, rend);
  const final: MercadoDeFichajes = { lista: new Map(llenos.map((n) => [n.id, n])), pobs: mercado.pobs, dia, val: valoracionDe(rend), reservas: reservasQueQuedan };
  equiposPorDemanda(final, rng);
  resultado.pobs = [...final.pobs];
  return [...final.lista.values()];
}

/**
 * Lo que trae un deporte que se añade a una partida empezada: su entrenador del colegio y los de sus clubes de fuera y el reclutamiento de sus equipos entre
 * los niños que ya hay (y los de otros colegios). La partida, al crearse, recluta en todos los deportes a la vez (`reclutarEnTodos`).
 */
export function añadirDeporte(npcs: Npc[], pob: PoblacionGuardada, dia: number, rng: Rng, rend: Rendimientos = new Map()): Npc[] {
  return reclutarDeportistas([...npcs, ...entrenadoresDeUnDeporte(npcs, pob, rng)], pob, dia, false, new Map(), valoracionDe(rend));
}

/** Los entrenadores de un deporte: el del colegio (el primer deporte ya trae el suyo) y los de los clubes de fuera. */
function entrenadoresDeUnDeporte(npcs: readonly Npc[], pob: PoblacionGuardada, rng: Rng): Npc[] {
  const usados = registroDe(npcs);
  return [...(pob.primero ? [] : [nuevoEntrenador(rng, pob, usados, { id: `entrenador_${pob.deporte}`, club: 'colegio', edades: [0, 99], edad: [28, 55], descripcion: pob.entrenadores.descripcionDelColegio })]), ...entrenadoresDeClubes(rng, pob, usados)];
}

/** El reparto base, la población del colegio y del barrio, los entrenadores y, al final, los niños que reclutan los deportes. */
function generarTodos(ctx: InitContext, pobs: readonly PoblacionGuardada[]): { npcs: Npc[]; pobs: PoblacionGuardada[] } {
  const base = generarReparto(ctx, pobs[0]);
  const usados = registroDe(base);
  const colegio = poblarElColegio(ctx.rng, usados, base.filter((n) => n.role === 'companero').length);
  const sin = conSemilla([...base, ...colegio, ...bibliotecarios(ctx.rng, usados)], ctx.seed);
  const conEntrenadores = pobs.reduce((lista, pob) => [...lista, ...entrenadoresDeUnDeporte(lista, pob, ctx.rng)], sin);
  // Todos los niños tienen ya sus capacidades reales: los clubes escogen por lo que vale cada uno de verdad.
  const rend = rendimientosDe(ctx);
  const equipos = reclutarEnTodos(conCapacidades(conEntrenadores, 0), pobs, 0, new Map(), rend);
  // La partida empieza dentro del plazo de fichajes: aquí también se aplica la regla de los equipos según la demanda (los interesados que se quedan sin equipo abren otros).
  const mercado: MercadoDeFichajes = { lista: new Map(equipos.map((n) => [n.id, n])), pobs, dia: 0, val: valoracionDe(rend), reservas: new Map() };
  equiposPorDemanda(mercado, ctx.rng);
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
function nuevoEntrenador(
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
const entrenadoresDeClubes = (rng: Rng, pob: PoblacionGuardada, usados: RegistroDeNombres): Npc[] =>
  pob.entrenadores.deFuera.flatMap(({ club, edades }) =>
    edades.map(([min, max], i) => nuevoEntrenador(rng, pob, usados, { id: `entrenador${pob.primero ? '' : `_${pob.deporte}`}_${club}_${i + 1}`, club, edades: [min, max], edad: [30, 55] })),
  );

/** ¿Es alumno del colegio del personaje? Los compañeros y los hermanos en edad escolar (el profesorado trabaja allí, no va). */
const delColegio = (n: Npc): boolean => !!n.tipos?.some((t) => t.tipo === 'alumno' || (t.tipo === 'hermano' && t.escolar));

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
        if (f) personaje.push({ deporte: pob.deporte, club: club.id, categoria: cat.id, valor: puestoDelPersonaje && valoresDelPersonaje ? valoresDelPersonaje[puestoDelPersonaje] : f(ctx), edad: edadProxima, pierna: ctx.service<IdentityService>(SERVICES.identidad)?.view().leftHanded ? 'izquierda' : 'derecha', ...(puestoDelPersonaje ? { puesto: puestoDelPersonaje } : {}) });
      }
      const resultado = { sinPlaza: [] as string[], dejanSinClub: 0, pobs: undefined as PoblacionGuardada[] | undefined };
      ctx.updateState<NpcsState>((s) => {
        const npcs = conPais(ctx.pais, () => actualizarHermanos(renovarDeportistas(conCapacidades(conSemilla(renovarAlumnos(s.npcs, proximo.day, ctx.rng), s.semilla ?? 0), proximo.day), pobs, proximo.day, ctx.rng, reservas, rend, s.semilla ?? 0, proximo.schoolYear, personaje, resultado), proximo.day));
        const pobsNuevas = resultado.pobs ?? pobs;
        return { ...s, poblaciones: pobsNuevas, npcs: conCapacidades(conHabilidades(npcs, pobsNuevas, rend, proximo.day), proximo.day), dejanSinClub: { ...s.dejanSinClub, [proximo.schoolYear]: resultado.dejanSinClub } };
      });
      for (const deporte of resultado.sinPlaza) ctx.emit<PlazaPerdidaData>({ type: SHARED_EVENTS.PLAZA_PERDIDA, data: { sport: deporte, clubId: clubes!.membership(deporte)!.id } });
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
      const { clubId, sport, nivel, puesto } = ev.data as ClubJoinData;
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
        const plaza = plazaEnElEquipo(ctx.state<NpcsState>().npcs, pobs, sport, clubId, edad, nivel, inicioCurso, pob ? puestosDelPersonaje(ctx, rendDelClub, pob) : undefined, rendDelClub);
        if (plaza.estado === 'por_merito' && plaza.peor && pob) {
          const cat = categoriaDe(pob, edad);
          const reservas = new Map<string, number>(cat ? [[claveDeEquipo(clubId, cat.id), 1]] : []);
          let final: Npc | undefined;
          ctx.updateState<NpcsState>((st) => {
            const m: MercadoDeFichajes = { lista: new Map(st.npcs.map((x) => [x.id, x])), pobs, dia: inicioCurso, val: valoracionDe(rendimientosDe(ctx)), reservas };
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
        nivelesDelEquipo: (deporte, club, categoria) => nivelesDelEquipoDe(lista, poblacionesGuardadas(ctx), deporte, club, categoria, ctx.time.week, inicioCurso),
        plaza: (deporte, club, nivel, puestos) => plazaEnElEquipo(lista, poblacionesGuardadas(ctx), deporte, club, ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8, nivel, inicioCurso, puestos, rendimientosDe(ctx), ctx.service<IdentityService>(SERVICES.identidad)?.view().leftHanded ? 'izquierda' : 'derecha'),
      };
    },
  },
});

export default npcs;
