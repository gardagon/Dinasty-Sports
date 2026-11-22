import type { FamiliaDePuestos, PistasDePuestos } from '@ds/contracts';

/**
 * Los puestos del fútbol **sin lado** y los textos de las pistas sobre ellos (`docs/ANEXO_PUESTOS.md` §7). Todo son datos: el motor (kit y `npcs`) decide qué cualidades destacan y cuáles
 * frenan, y este archivo solo dice cómo se cuenta, sin cifras (`VISION.md`, principio 7). El personaje aún no tiene género en los textos de acciones, así que las frases usan formas neutras
 * y, donde hace falta, `{yo:o|a}`; quien habla (profesor o entrenador) concuerda con `{quien:o|a}`.
 */

export const FAMILIAS_DE_PUESTOS_DE_FUTBOL: readonly FamiliaDePuestos[] = [
  { id: 'portero', nombre: 'Portero', puestos: ['GK'] },
  { id: 'central', nombre: 'Central', puestos: ['CB'] },
  { id: 'lateral', nombre: 'Lateral', puestos: ['LB', 'RB'] },
  { id: 'pivote', nombre: 'Pivote', puestos: ['CDM'] },
  { id: 'interior', nombre: 'Interior', puestos: ['LCR', 'RCR'] },
  { id: 'mediocentro', nombre: 'Mediocentro', puestos: ['CM'] },
  { id: 'medio_de_banda', nombre: 'Medio de banda', puestos: ['LM', 'RM'] },
  { id: 'mediapunta', nombre: 'Mediapunta', puestos: ['CAM'] },
  { id: 'extremo', nombre: 'Extremo', puestos: ['LW', 'RW'] },
  { id: 'delantero_centro', nombre: 'Delantero centro', puestos: ['ST'] },
  { id: 'delantero_de_banda', nombre: 'Delantero de banda', puestos: ['LST', 'RST'] },
];

export const PISTAS_DE_PUESTOS_DE_FUTBOL: PistasDePuestos = {
  cualidades: {
    'futbol.reflejos': { tiene: 'reaccionas muy rápido', falta: 'te falta reaccionar más rápido ante los tiros cercanos' },
    'futbol.blocaje': { tiene: 'blocas el balón con seguridad', falta: 'se te escapa el balón de las manos' },
    'futbol.mano_a_mano': { tiene: 'cuando te quedas solo ante el delantero mantienes la calma', falta: 'cuando se plantan solos delante, dudas y no sales a tiempo' },
    'futbol.alcance_aereo': { tiene: 'llegas arriba a los balones colgados', falta: 'los balones altos se te hacen largos' },
    'futbol.dominio_area': { tiene: 'mandas en tu área', falta: 'aún no mandas en tu área, dudas entre salir y quedarte' },
    'futbol.despeje': { tiene: 'despejas y sacas bien con el pie', falta: 'te cuesta despejar con el pie' },
    'futbol.marcaje': { tiene: 'no sueltas a tu hombre', falta: 'tu hombre se te escapa' },
    'futbol.entrada': { tiene: 'quitas bien el balón', falta: 'te cuesta quitar el balón sin hacer falta' },
    'futbol.cabeza': { tiene: 'ganas los balones por alto', falta: 'en el juego de cabeza pierdes casi todas' },
    'futbol.posicionamiento': { tiene: 'estás siempre donde hay que estar', falta: 'a veces no estás donde hay que estar' },
    'futbol.anticipacion': { tiene: 'lees bien lo que va a pasar', falta: 'llegas tarde a lo que va a pasar' },
    'futbol.decisiones': { tiene: 'decides rápido y bien', falta: 'ves las jugadas pero decides tarde' },
    'futbol.vision': { tiene: 'ves los pases antes que los demás', falta: 'te cuesta ver el pase antes de recibir' },
    'futbol.juego_colectivo': { tiene: 'te mueves con el equipo', falta: 'juegas más a lo tuyo que con el equipo' },
    'futbol.pase': { tiene: 'das bien el balón', falta: 'te falta darla mejor al primer toque' },
    'futbol.control': { tiene: 'controlas el balón con facilidad', falta: 'el control se te escapa' },
    'futbol.tecnica': { tiene: 'tienes buena técnica con el balón', falta: 'te falta técnica con el balón' },
    'futbol.regate': { tiene: 'regateas con descaro', falta: 'te cuesta irte del rival' },
    'futbol.centros': { tiene: 'tus centros llegan con peligro', falta: 'tus centros no llegan donde quieres' },
    'futbol.definicion': { tiene: 'ante el portero tienes pulso', falta: 'ante el portero se te encoge la pierna y te falta repetir tiros' },
    'futbol.disparo_lejano': { tiene: 'tiras bien de lejos', falta: 'de lejos no inquietas a nadie' },
    'futbol.desmarque': { tiene: 'te mueves bien sin balón', falta: 'sin balón te quedas parado' },
    'futbol.sangre_fria': { tiene: 'no te tiembla nada en los momentos importantes', falta: 'en los momentos importantes te precipitas' },
    'futbol.arrancada': { tiene: 'arrancas muy bien', falta: 'te falta explosividad en los primeros metros' },
    'futbol.salto': { tiene: 'saltas mucho para tu edad', falta: 'te falta salto' },
    'gen.velocidad': { tiene: 'eres de los más rápidos de tu edad', falta: 'aún te falta velocidad' },
    'gen.resistencia': { tiene: 'no te cansas: corres todo el partido', falta: 'aún te cuesta aguantar un partido entero' },
    'gen.fuerza': { tiene: 'tienes fuerza para tu edad', falta: 'te falta fuerza en los choques' },
  },
  porque: {
    conMotivo: 'Me fijo en esto: {señal.tiene}.',
    sinMotivo: 'Todavía no destacas en nada concreto; pruébalo todo. A estas edades eso es normal.',
  },
  lectura: {
    ya: 'Para ese puesto, {señal.tiene}. Ya estás para jugar de {señal.puesto}: lo que te falta es jugar, y lo de ahí fuera se aprende en partidos.',
    cerca: 'De {señal.puesto} {señal.tiene}, pero {señal.falta}.',
    lejos: 'Para jugar de {señal.puesto}: {señal.falta}. Eso se trabaja con paciencia, no en un mes. Si quieres, empezamos por ahí.',
    sinDatos: 'De {señal.puesto} aún no sé qué decirte: juega unos partidos y lo hablamos.',
  },
  primerEntrenamiento: {
    vas: 'De inicio vas a jugar de {señal.puesto}{señal.otro}.',
    pedido: 'Me dijiste {señal.pedido} en la prueba, y se te veía convencid{yo:o|a}, pero de inicio vas a jugar de {señal.puesto}{señal.otro}.',
    otro: ', pero a lo mejor más adelante te pongo de {señal.otro}',
  },
  entrenamiento: {
    recomienda: 'Para {señal.puesto}, lo que más te frena: {señal.falta}. Esta semana, «{señal.entreno}» por tu cuenta.',
    recomiendaEnElClub: 'Para {señal.puesto}, lo que más te frena: {señal.falta}. Pídele a tu entrenador «{señal.entreno}» en la sesión del club.',
    sinEntreno: 'Para {señal.puesto}, lo que más te frena: {señal.falta}. Eso se gana jugando partidos y con paciencia.',
    yaEntrenas: 'Vas bien: sigue con lo del club y, si puedes, un rato por tu cuenta de lo que más te guste.',
  },
};
