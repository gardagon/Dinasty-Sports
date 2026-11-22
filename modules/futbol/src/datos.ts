import { EJERCICIOS_DE_FUTBOL, JUEGO_INFORMAL, SIEMPRE } from './ejercicios';
import { PUESTOS_DE_FUTBOL } from './puestos';
import { ENTRENAMIENTOS_DE_FUTBOL, entrenaPorLibre } from './entrenamientos';
import { QUEDADAS_DE_FUTBOL } from './quedadas';
import { CONOCIMIENTO, STATS_DE_FUTBOL } from './habilidades';
import { GEN, type PorLibreDeDeporte, type AporteDeLugares, type CategoriaDef, type ClubDeDeporte, type DatosDeDeporte, type FichaDeDeporte, type PoblacionDeDeporte } from '@ds/contracts';

/**
 * Lo que el fútbol trae de cada país (datos puros, ver `DatosDeDeporte`). Hoy solo España; los demás países usan estos datos hasta que el deporte
 * traiga los suyos. **Fútbol 11 en todas las categorías**, también a los 8 años (decisión del 31/10: el fútbol 7 pediría otro motor de partido).
 */

/** Categorías de la federación española de fútbol, por edad de competición. Desde los 19 se compite en categoría sénior. */
/** Los días del curso en que se apuntan los niños a sus equipos (cifra provisional, decisión del usuario del 21/11/2026: desde el segundo día de clase, y antes de que acabe la primera semana). */
const APUNTARSE: readonly [number, number] = [1, 6];
export const CATEGORIAS_ESPANA: readonly CategoriaDef[] = [
  { id: 'prebenjamin', nombre: 'Prebenjamín', edadMin: 0, edadMax: 7, apuntarseEnLosDias: APUNTARSE },
  { id: 'benjamin', nombre: 'Benjamín', edadMin: 8, edadMax: 9, nuevosEnElClub: true, rotacionEn: ['colegio'], primerAnioNoDesplazaEn: ['colegio', 'club'], probarFuera: 0.15, apuntarseEnLosDias: APUNTARSE },
  { id: 'alevin', nombre: 'Alevín', edadMin: 10, edadMax: 11, rotacionEn: ['colegio'], primerAnioNoDesplazaEn: ['colegio', 'club'], probarFuera: 0.25, apuntarseEnLosDias: APUNTARSE },
  { id: 'infantil', nombre: 'Infantil', edadMin: 12, edadMax: 13, probarFuera: 0.35, apuntarseEnLosDias: APUNTARSE },
  { id: 'cadete', nombre: 'Cadete', edadMin: 14, edadMax: 15, probarFuera: 0.45, apuntarseEnLosDias: APUNTARSE },
  { id: 'juvenil', nombre: 'Juvenil', edadMin: 16, edadMax: 18, probarFuera: 0.55, apuntarseEnLosDias: APUNTARSE },
  { id: 'senior', nombre: 'Sénior', edadMin: 19, edadMax: 200 },
];

/**
 * Los clubes con sección de fútbol en España: el del colegio y los de la zona (grande, mediano y pequeño). **Cualquier club de la zona admite a quien quiera apuntarse, con la regla de plaza**
 * (hueco, o ser mejor que el peor del equipo de su categoría) y dentro del plazo de fichajes; la prueba de acceso queda para los clubes de élite (F5). Entrenan otros días que el de atletismo,
 * para poder hacer los dos. Los trámites se hacen en la secretaría de los clubes, en el campo municipal.
 */
const CLUBES_ESPANA: readonly ClubDeDeporte[] = [
  {
    id: 'colegio',
    nombre: 'Club deportivo del colegio',
    esColegio: true,
    calidad: 1,
    sesiones: { weekdays: [1, 3], desde: 15, hasta: 17 },
    sede: 'campo_colegio',
    tramites: 'administracion',
  },
  { id: 'club_grande', nombre: 'Real Ciudad C. F.', calidad: 3, sesiones: { weekdays: [0, 1, 3, 4], desde: 17, hasta: 19 }, sede: 'campo_municipal', tramites: 'secretaria_futbol' },
  { id: 'club_mediano', nombre: 'Unión Deportiva del Barrio', calidad: 2, sesiones: { weekdays: [0, 2, 3], desde: 17, hasta: 19 }, sede: 'campo_municipal', tramites: 'secretaria_futbol' },
  { id: 'club_pequeno', nombre: 'Escuela de Fútbol Los Pinos', calidad: 2, sesiones: { weekdays: [1, 3], desde: 18, hasta: 20 }, sede: 'campo_municipal', tramites: 'secretaria_futbol' },
];

/**
 * La gente del fútbol, de momento solo la del colegio: la plantilla del equipo del colegio (reclutada entre los alumnos) y su entrenador. Los equipos
 * de la ciudad y las ligas con sus rivales llegan en la F2.
 */
/** Las categorías en que los clubes de la zona tienen equipo (benjamín a juvenil: los de fuera siguen en el sénior, que llega con la liga). */
const CATEGORIAS_DE_LOS_CLUBES = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];

/**
 * Que una parte de los PNJ entrene por su cuenta y quede a jugar con las mismas listas que el personaje (`docs/relevo/pnj-entrenan-y-abandono.md` §3; activada el 22/11 con la intensidad «fuerte», **cifras provisionales**
 * para hacer pruebas, `docs/relevo/pnj-entrenan-2.md`): hasta 4 sesiones a la semana fuera del club; la probabilidad de cada una es la base (0,20) más lo que pesa el interés (0,12), la ambición (0,20), el sacrificio
 * (0,08) y la disciplina (0,05) y un azar de cada curso (0,20), por un factor por edad que baja con los estudios (15: 0,9 · 16: 0,75 · 17: 0,6 · 18: 0,7). Un niño medio hace así 2,8 sesiones a la semana (1,7 del club) y los más aficionados, 4–5.
 */
export const PNJ_POR_LIBRE: PorLibreDeDeporte = {
  entrenamientos: ENTRENAMIENTOS_DE_FUTBOL.filter((e) => e.quien.includes('solo')).map((e) => ({ id: e.id, entrena: entrenaPorLibre(e), ...(e.soloPuesto ? { soloPuesto: e.soloPuesto } : {}), ...(e.noPara ? { noPara: e.noPara } : {}) })),
  quedadas: QUEDADAS_DE_FUTBOL.map((q) => ({ id: q.id, entrena: q.entrena })),
  eficiencia: 0.85,
  maximoPorSemana: 4,
  propension: { base: 0.2, interes: 0.12, ambicion: 0.2, sacrificio: 0.08, disciplina: 0.05, dispersion: 0.2 },
  factorPorEdad: { 15: 0.9, 16: 0.75, 17: 0.6, 18: 0.7 },
};

/**
 * Jugar engancha (22/11): cada sesión de la semana (del club o por su cuenta) cuenta como 1,5 horas jugando y sube el interés por el fútbol con la regla del personaje (`SUBIDA_DE_INTERES_POR_HORA`: 0,6 puntos por hora sobre
 * 100, con rendimientos decrecientes), multiplicada por 0,08 (**provisional**: a 1 sería igual que el personaje, que juega hasta 13 sesiones a la semana y llega a «le gusta mucho» en pocas semanas; con 0,08, un niño que
 * entrena con el club y algo por su cuenta pasa de 1,5 a 3 en unos 2 años y uno que solo va al club, en 3 o 4).
 */
export const INTERES_AL_JUGAR = { horasPorSesion: 1.5, escala: 0.08 } as const;

/**
 * Cuánto pesan el nivel y el interés en el abandono (22/11; `docs/relevo/pnj-entrenan-2.md`, **cifras provisionales**): los mejores de su edad lo dejan menos (peso 0,6 del nivel frente a los de su edad: el mejor baja la
 * probabilidad un 60 % y el peor la sube otro tanto) y nunca por debajo del 4 % cada verano («no todos los mejores triunfan, por mentalidad o por temas personales»); y el interés pesa más (de 0,4 a 0,6: a quien le
 * gusta mucho el fútbol lo deja un 60 % menos que a la media, y a quien casi no le interesa, un 60 % más).
 */
export const ABANDONO_PROPUESTO = { pesos: { nivel: 0.6, interes: 0.6 }, suelo: 0.04 } as const;

const POBLACION_ESPANA: PoblacionDeDeporte = {
  // Los 16 puestos y el reparto de una plantilla de 18 por puestos (adelanto de la F3): los clubes reparten la plantilla y deciden las plazas por puesto.
  puestos: PUESTOS_DE_FUTBOL,
  // Las habilidades de sus jugadores y su rutina: los futbolistas del mundo las llevan como el personaje; el entrenador elige los ejercicios de cada sesión y son los mismos
  // para todo el equipo (`MISMAS_REGLAS.md`).
  rutina: {
    stats: STATS_DE_FUTBOL,
    conocimiento: CONOCIMIENTO,
    ejercicios: EJERCICIOS_DE_FUTBOL,
    siempre: SIEMPRE,
    ejerciciosPorSesion: 2,
    informal: JUEGO_INFORMAL,
    porLibre: PNJ_POR_LIBRE,
    interesAlJugar: INTERES_AL_JUGAR,
    // Cuántas sesiones por semana entrena cada club (sus días de entrenamiento): el del colegio, 2; los de la zona, más cuanto más grandes (el grande entrena cuatro días).
    sesionesPorSemana: Object.fromEntries(CLUBES_ESPANA.map((c) => [c.id, c.sesiones.weekdays.length])),
    sesionesPorDefecto: 2,
  },
  etiqueta: 'futbolista',
  descripcionDeRival: 'Juega al fútbol.',
  capacidades: [GEN.velocidad, GEN.resistencia, GEN.agilidad, GEN.coordinacion, GEN.fuerza, GEN.inteligencia],
  aptitud: 0.15,
  reclutamiento: {
    edades: { min: 8, max: 19 },
    edadMaxBaja: 13,
    probabilidadBaja: 0.1,
    // El abandono por edad (decisión del 07/11; a calibrar con `npm run equipos`): a los 13 o menos, lo de siempre (10 % por verano); desde cadete sube deprisa. Pesan el interés, la ambición, los minutos, los estudios (4.º de la ESO y bachillerato) y los padres.
    abandono: {
      baseDeLaEdad: { 8: 0.1, 13: 0.1, 14: 0.12, 15: 0.18, 16: 0.24, 17: 0.3, 18: 0.36 },
      pesos: { interes: ABANDONO_PROPUESTO.pesos.interes, ambicion: 0.25, minutos: 0.3, estudios: 0.3, padres: 0.15, nivel: ABANDONO_PROPUESTO.pesos.nivel },
      estudiosPorEdad: { 15: 0.6, 16: 0.8, 17: 1, 18: 0.8 },
      suelo: ABANDONO_PROPUESTO.suelo,
    },
  },
  // Los equipos de la zona (`CIUDAD_Y_LIGAS.md` §3): el del colegio es un club pequeño más y escoge a sus alumnos; los de fuera, por su atractivo. Cada club tiene en cada categoría (de benjamín a juvenil) hasta cuatro
  // equipos (A, B, C y D, por año) de 14 a 18 jugadores (once titulares y suplentes), que salen del «draft» al crear la partida y cada verano (`CIUDAD_Y_LIGAS.md` §5): cada club ve a un porcentaje de los niños (su
  // atractivo), coge a los mejores por puesto y los equipos que faltan se sortean entre clubes y colegios; un equipo con menos de 14 se completa con la bolsa y el ascenso del que sería titular arriba y, si ni así
  // llega, se cierra. Los equipos se fijan para toda la temporada. Todos los clubes de la zona (con sus tamaños y los colegios con club) salen de la ciudad (`personasPorClub`, `colegiosConClub`).
  equipos: [
    { club: 'club_grande', nombre: 'Real Ciudad C. F.', tamano: 'grande', categorias: CATEGORIAS_DE_LOS_CLUBES, plantillaPorCategoria: { min: 14, max: 18 } },
    { club: 'club_mediano', nombre: 'Unión Deportiva del Barrio', tamano: 'mediano', categorias: CATEGORIAS_DE_LOS_CLUBES, plantillaPorCategoria: { min: 14, max: 18 } },
    { club: 'club_pequeno', nombre: 'Escuela de Fútbol Los Pinos', tamano: 'pequeno', categorias: CATEGORIAS_DE_LOS_CLUBES, plantillaPorCategoria: { min: 14, max: 18 } },
    { club: 'colegio', colegio: 'propio', tamano: 'pequeno', categorias: ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'], plantillaPorCategoria: { min: 14, max: 18 } },
  ],
  descripcionDelEquipo: 'Del equipo de fútbol del colegio.',
  entrenadores: {
    sesgoCaracter: { disciplina: 12, sacrificio: 8 },
    interesesPreferidos: ['deporte', 'futbol'],
    descripcionDelColegio: 'Entrena al equipo de fútbol del colegio.',
    dedicacion: 'de fútbol',
    // Cada club de la zona tiene sus entrenadores, uno por tramo de edades.
    deFuera: [
      { club: 'club_grande', edades: [[8, 11], [12, 15], [16, 19]] },
      { club: 'club_mediano', edades: [[8, 11], [12, 15], [16, 19]] },
      { club: 'club_pequeno', edades: [[8, 13], [14, 19]] },
    ],
  },
};

export const FICHA_FUTBOL: FichaDeDeporte = {
  id: 'futbol',
  nombre: 'Fútbol',
  disciplina: 'Fútbol 11',
  descripcion: 'Fútbol 11: entrenas con tu equipo y juegas la liga los sábados.',
  tipo: 'equipo',
};

export const DATOS_FUTBOL: DatosDeDeporte = {
  id: 'futbol',
  paises: {
    espana: {
      categorias: CATEGORIAS_ESPANA,
      // Con el calendario de España: la liga empieza en la semana 5 del curso (cuatro semanas de pretemporada) y acaba con las clases. Una liga a doble vuelta
      // de 10 equipos tiene 18 jornadas (por divisiones: Primera y Segunda de 10, el resto en la última en grupos de 8 a 12; suben 2 y bajan 2). Sin semifinales ni final: una liga se juega a jornadas.
      temporada: { semanasDePretemporada: 4, liga: { vueltas: 2, equiposPorCategoria: { min: 6, max: 7 }, divisiones: { tamano: 10, fijas: 2, grupo: { max: 12 }, suben: 2, bajan: 2, playoff: { jornadasObjetivo: 18 } } } },
      competiciones: {
        federacion: 'Real Federación Española de Fútbol',
        campeonato: 'campeonato de {pais}',
        // Partidos de liga los sábados por la mañana (el día da igual de momento).
        // El día de partido (`MOTOR_PARTIDOS.md` §15): cada partido tiene su hora en punto y su campo; en un mismo campo, uno cada 2 horas. Sábado: benjamín, alevín e infantil (los pequeños, por la mañana); domingo: juvenil;
        // cadete, el sábado si cabe y, si no, el domingo. Los clubes grandes y medianos juegan en sus instalaciones; los pequeños y los colegios, en el complejo municipal (varios campos: dato de la ciudad).
        jornada: {
          dias: [5, 6],
          desde: 9,
          hasta: 20,
          lugar: 'campo_municipal',
          texto: 'Partidos de liga: sábados y domingos, cada partido a su hora en punto (de 9:00 a 18:00), en el campo del equipo local.',
          calendario: {
            franjas: [9, 11, 13, 16, 18],
            dias: [{ dia: 5, categorias: ['benjamin', 'alevin', 'infantil'] }, { dia: 6, categorias: ['juvenil'] }],
            siCabe: [{ categoria: 'cadete', dia: 5, siNoCabe: 6 }],
          },
        },
      },
      sedes: { colegio: 'campo_colegio', fuera: 'campo_municipal' },
      clubes: CLUBES_ESPANA,
      poblacion: POBLACION_ESPANA,
    },
  },
};

/** Lo que el fútbol pone en el mapa de la ciudad: el campo del colegio y el campo municipal. */
export const LUGARES_FUTBOL: AporteDeLugares = {
  lugares: [
    {
      id: 'campo_colegio',
      name: 'Campo de fútbol del colegio',
      descripcion: 'El campo de fútbol del colegio: aquí entrena el equipo del colegio y se puede jugar por tu cuenta. Los miembros del club están 10 minutos antes de cada sesión.',
      grupo: 'Dentro del colegio',
      dentroDe: 'colegio',
      despuesDe: 'administracion',
    },
    {
      id: 'campo_municipal',
      name: 'Campo municipal de fútbol',
      descripcion: 'El campo municipal de césped: aquí se juegan los partidos de liga y se puede entrenar por tu cuenta.',
      grupo: 'Deporte',
      enCalle: 'avenida_parque',
      minutosDeCalle: 4,
      horario: { tramos: [{ dias: 'todos', desde: 8 * 60, hasta: 21 * 60 }], texto: 'todos los días de 8:00 a 21:00' },
      despuesDe: 'gimnasio',
    },
    {
      // El vestuario del campo: una zona que se abre media hora antes de cada partido. No tiene «Ir a»: se entra con la acción «Ir al vestuario» (o al acabar el partido) y de dentro se sale como de cualquier zona.
      id: 'vestuario_campo_municipal',
      name: 'Vestuario del campo municipal',
      descripcion: 'El vestuario del campo municipal: se abre media hora antes de cada partido. Aquí te cambias con tus compañeros y, al acabar, vuelves a él.',
      grupo: 'Dentro del campo municipal',
      dentroDe: 'campo_municipal',
      soloPorEvento: 'se abre media hora antes de tu partido: se entra con «Ir al vestuario»',
      despuesDe: 'campo_municipal',
    },
    {
      id: 'secretaria_futbol',
      name: 'Secretaría de los clubes de fútbol',
      descripcion: 'La secretaría de los clubes de fútbol de la zona, en el campo municipal: aquí te apuntas a un club de fútbol (si hay hueco en el equipo de tu categoría o eres mejor que el peor) dentro del plazo de fichajes.',
      grupo: 'Dentro del campo municipal',
      dentroDe: 'campo_municipal',
      horario: {
        tramos: [
          { dias: [0, 1, 2, 3, 4], desde: 16 * 60, hasta: 21 * 60 },
          { dias: [5], desde: 9 * 60, hasta: 14 * 60 },
        ],
        texto: 'de lunes a viernes de 16:00 a 21:00 y los sábados de 9:00 a 14:00',
      },
      despuesDe: 'campo_municipal',
    },
  ],
  entreCalles: [],
};
