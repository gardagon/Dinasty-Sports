import { clamp } from './util-numerica';

/**
 * EL ESTADO DE UN JUGADOR (plan `docs/MISMAS_REGLAS.md`, P2a-2): lo que importa para jugar además de lo que sabe hacer. El personaje lo vive día a día con sus
 * estados (energía, estrés, motivación y salud); un PNJ que juega lleva los mismos efectos resumidos en cuatro números que se actualizan cada semana y en cada
 * competición: **condición física** (baja con las sesiones y las competiciones y se recupera descansando), **moral** (sube y baja con los resultados y su
 * carácter), **forma** (cómo le va estas semanas) y **salud** (lesiones). Sus efectos en el rendimiento son **los mismos factores del personaje**: están aquí y el
 * módulo del personaje los usa también.
 */

// ---------------------------------------------------------------------------------------------------- los factores del personaje (una sola copia)

/** Con la energía por debajo de 35 se rinde menos en todo: de ×1 a ×0,5. */
export const factorPorCansancio = (energia: number): number => (energia < 35 ? 0.5 + (0.5 * energia) / 35 : 1);

/** Con el estrés por encima de 50 se rinde menos en lo mental y en el estudio. */
export const factorPorEstres = (estres: number): number => (estres > 50 ? 1 - (estres - 50) / 100 : 1);

/** La motivación (normalizada, 0 a 1) da de ×0,85 a ×1,15 al entrenar y estudiar. */
export const factorPorMotivacion = (motivacionNormalizada: number): number => 0.85 + 0.3 * motivacionNormalizada;

/** Con la salud por debajo de 60 se rinde menos en todo (×0,4 más la salud, entre 100). */
export const factorPorSalud = (salud: number): number => (salud >= 60 ? 1 : 0.4 + salud / 100);

/**
 * Cuánto rinde el día de una competición: de ×0,85 (con la eficiencia en cero) a ×1,00 (normal) y hasta ×1,03 (con la eficiencia muy alta). Lo usan la carrera del
 * personaje (con su eficiencia del día) y la de cualquier PNJ (con la de su estado).
 */
export const factorDeCompeticion = (eficiencia: number): number => 0.85 + 0.15 * Math.min(1.2, eficiencia);

// ---------------------------------------------------------------------------------------------------- el estado de un PNJ

export interface EstadoDeJugador {
  /** 0 a 100. Baja con las sesiones y las competiciones y se recupera descansando. Hace el papel de la energía del personaje. */
  fisica: number;
  /** 0 a 100. Sube y baja con los resultados; vuelve a su nivel de siempre (según su carácter). Hace el papel de la motivación. */
  moral: number;
  /** 0 a 100. Cómo le va estas semanas: sube con buenos resultados y buen estado y baja con los malos, y se olvida despacio. */
  forma: number;
  /** 0 a 100. Baja con una lesión y se recupera. Es la salud del personaje. */
  salud: number;
  /** Semanas de baja que le quedan por una lesión (ausente = sano). */
  baja?: number;
}

/** Valores de partida de un jugador sano y descansado. */
export const ESTADO_INICIAL: Readonly<EstadoDeJugador> = { fisica: 90, moral: 60, forma: 60, salud: 100 };

/** Cuánto cansa cada cosa, en puntos de condición física. Una sesión de un club cansa menos que una competición. */
export const CARGA = { sesion: 6, competicion: 8 } as const;
/** Fracción de la fatiga (lo que falta para 100) que se recupera cada semana descansando. */
export const RECUPERACION_SEMANAL = 0.6;
/** Fracción de la distancia a su nivel de siempre que la moral recupera cada semana. */
export const RECUPERACION_DE_LA_MORAL = 0.25;
/** Cuánto cambia la moral con un resultado (de −1, el peor, a +1, el mejor), en puntos: lo amortigua la resiliencia de cada uno. */
export const EFECTO_DEL_RESULTADO_EN_LA_MORAL = 8;
/** Cuánto se olvida la forma cada semana (la parte del valor anterior que se conserva). */
export const MEMORIA_DE_LA_FORMA = 0.7;
/** Salud que se recupera cada semana, en puntos. */
export const RECUPERACION_DE_LA_SALUD = 25;
/** Probabilidad base de lesión por semana de un jugador activo (el 0,4 %); crece con la carga y baja con una buena constitución. */
export const PROBABILIDAD_DE_LESION = 0.004;

/**
 * El rendimiento de un jugador por su estado: los mismos factores del personaje. Al **entrenar** cuentan el cansancio, la salud y la motivación (la moral); en una
 * **competición**, el cansancio, la salud y la **forma** (una pequeña ventaja o desventaja de ×0,97 a ×1,03). La forma no cambia el entrenamiento, ni en los PNJ ni en el
 * personaje: así la usa el motor (en la marca del día, `factorPorForma`), y el entrenamiento solo mira lo que el personaje ya tiene en sus modificadores.
 */
export function eficienciaDeEstado(e: EstadoDeJugador, entrenando = true): number {
  const f = factorPorCansancio(e.fisica) * factorPorSalud(e.salud);
  return entrenando ? f * factorPorMotivacion(e.moral / 100) : f * factorPorForma(e.forma);
}

/** De ×0,97 (forma 20) a ×1,03 (forma 80): neutra en 50. Es pequeña: la forma pesa poco, pero se nota entre iguales. */
export const factorPorForma = (forma: number): number => 1 + 0.001 * (forma - 50);

/** Lo que mide el resultado de una competición para el ánimo: de −1 (el último) a +1 (el primero), por el puesto. */
export const valoracionDelPuesto = (puesto: number, total: number): number => (total <= 1 ? 0 : 1 - (2 * (puesto - 1)) / (total - 1));

/** La forma tras una competición: sube con un buen puesto y baja con uno malo (`valoracion` de −1 a +1). Es la misma para el personaje y para cualquier PNJ. */
export const formaTrasUnaCompeticion = (forma: number, valoracion: number): number => clamp(forma + 6 * valoracion, 0, 100);

/** La forma tras una semana: tiende despacio a lo que dice el estado de esa semana (`eficiencia` de cansancio, ánimo y salud). */
export function formaTrasLaSemana(forma: number, eficiencia: number): number {
  const blanco = 100 * clamp((0.5 * (eficiencia - 0.85)) / 0.3 + 0.1, 0, 1);
  return clamp(MEMORIA_DE_LA_FORMA * forma + (1 - MEMORIA_DE_LA_FORMA) * blanco, 0, 100);
}

/** La fatiga de una semana: lo que falta para 100 de condición y lo que añaden las sesiones y las competiciones de la semana. */
export const fatigaDeLaSemana = (fisica: number, sesiones: number): number => 100 - fisica + CARGA.sesion * sesiones;

/** La probabilidad de lesionarse en una semana: crece con la fatiga y baja con la constitución (0 a 100). La misma para el personaje y los PNJ. */
export const riesgoDeLesion = (fatiga: number, constitucion: number): number => PROBABILIDAD_DE_LESION * (1 + fatiga / 40) * (1.4 - (0.8 * clamp(constitucion, 0, 100)) / 100);

/** Cuánto pesa una lesión (`azar` de 0 a 1): semanas de baja (1 a 6) y la salud que queda. La misma para el personaje y los PNJ. */
export function gravedadDeLesion(azar: number): { baja: number; salud: number } {
  const baja = 1 + Math.floor(clamp(azar, 0, 0.999999) * 6);
  return { baja, salud: clamp(80 - 9 * baja, 15, 80) };
}

/** Lo que cambia en un jugador al acabar una competición: cansa y le sube o baja la moral y la forma según cómo le fue. `resiliencia` va de 0 a 1. */
export function trasUnaCompeticion(e: EstadoDeJugador, valoracion: number, resiliencia: number): EstadoDeJugador {
  const amortigua = 1 - 0.5 * clamp(resiliencia, 0, 1);
  return {
    ...e,
    fisica: clamp(e.fisica - CARGA.competicion, 0, 100),
    moral: clamp(e.moral + EFECTO_DEL_RESULTADO_EN_LA_MORAL * valoracion * amortigua, 0, 100),
    forma: formaTrasUnaCompeticion(e.forma, valoracion),
  };
}

/** Cuánto baja la moral de quien está convocado y no juega (en puntos), antes de pesar su ambición: un ambicioso lo lleva peor. */
export const MORAL_DEL_BANQUILLO = -3;

/** Lo que cambia en quien se queda en el banquillo todo el partido: baja su moral, más cuanto más ambicioso (`ambicion` de 0 a 1: ×0,5 el conformista, ×1,5 el más ambicioso). */
export function trasElBanquillo(e: EstadoDeJugador, ambicion: number): EstadoDeJugador {
  return { ...e, moral: clamp(e.moral + MORAL_DEL_BANQUILLO * (0.5 + clamp(ambicion, 0, 1)), 0, 100) };
}

/** Lo que necesita el paso de una semana. `animo` y `resiliencia` van de 0 a 1 (según su carácter); `constitucion`, de 0 a 100. */
export interface EntradaDeSemana {
  sesiones: number;
  /** El azar de la semana para la lesión (0 a 1). */
  azarDeLesion: number;
  /** Otro azar (0 a 1) para elegir cuánto dura y cuánto pesa la lesión. */
  azarDeGravedad: number;
  animo: number;
  constitucion: number;
}

/**
 * Una semana de un jugador: las sesiones lo cansan y descansando se recupera; la moral vuelve a su nivel de siempre (más alto si es optimista); la forma se olvida
 * despacio hacia lo que dice su estado; la salud se recupera y puede haber una lesión (más probable con mucha carga o poco descanso y menos con buena constitución).
 */
export function pasoDeSemanaDelEstado(e: EstadoDeJugador, i: EntradaDeSemana): EstadoDeJugador {
  const fatiga = fatigaDeLaSemana(e.fisica, i.sesiones);
  const fisica = clamp(100 - fatiga * (1 - RECUPERACION_SEMANAL), 0, 100);
  const baseDeLaMoral = 45 + 30 * clamp(i.animo, 0, 1);
  const moral = clamp(e.moral + (baseDeLaMoral - e.moral) * RECUPERACION_DE_LA_MORAL, 0, 100);
  const forma = formaTrasLaSemana(e.forma, eficienciaDeEstado({ ...e, fisica, moral }));
  let salud = clamp(e.salud + RECUPERACION_DE_LA_SALUD, 0, 100);
  let baja = e.baja && e.baja > 1 ? e.baja - 1 : undefined;
  if (!baja && i.azarDeLesion < riesgoDeLesion(fatiga, i.constitucion)) {
    const g = gravedadDeLesion(i.azarDeGravedad);
    baja = g.baja;
    salud = g.salud;
  }
  return { fisica, moral, forma, salud, ...(baja ? { baja } : {}) };
}
