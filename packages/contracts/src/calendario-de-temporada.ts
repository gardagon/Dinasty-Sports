import { tramoDeSemana, type CalendarioPais, type Periodo } from './calendar';
import { datosDeDeporte, semanasDeTemporada, type TemporadaDeDeporte } from './deporte-datos';
import type { ReadContext } from './context';
import { fechaDelDia } from './personas';

/**
 * **EN QUÉ TRAMO DE LA TEMPORADA ESTÁ UN DEPORTE Y CUÁNDO EMPIEZA EL SIGUIENTE** (`ANEXO_DEPORTE.md`): pretemporada, competición (la liga, las carreras…), parada por vacaciones, temporada terminada y verano.
 * Es dato del deporte (`TemporadaDeDeporte`) pasado por el calendario del país: sirve igual para cualquier deporte con temporada. Lo que depende del juego en marcha (si la liga ya ha acabado) lo dice quien llama.
 * (Todavía no hay copa: cuando un deporte la tenga, será otro tramo entre la liga y el verano.)
 */
export type TramoDeTemporada = 'pretemporada' | 'competicion' | 'parada' | 'terminada' | 'verano';

/** Cómo se llama la competición del deporte en los textos: «la liga» (`nombre` «liga», `articulo` «la») o «las carreras» (plural). */
export interface NombreDeCompeticion {
  nombre: string;
  articulo: string;
  plural?: boolean;
}

export interface OpcionesDeSituacion {
  competicion: NombreDeCompeticion;
  /** Día de la semana (0 = lunes) de la primera jornada: el más temprano de los días en que se compite. */
  diaDeJornada: number;
  /** La competición ya ha acabado este curso (la liga cerrada), aunque no sea verano. */
  terminada?: boolean;
}

export interface SituacionDeTemporada {
  tramo: TramoDeTemporada;
  /** El texto para el jugador, p. ej. «Pretemporada. La liga empieza el sábado 13 de octubre.» */
  texto: string;
  /** La primera jornada de la competición: la de este curso o, en verano, la del que viene. `texto` es «el sábado 13 de octubre». */
  primeraJornada: { dia: number; texto: string };
  /** Cuándo empieza la competición (o se reanuda tras las vacaciones), en palabras («el sábado 13 de octubre»), si el tramo es de espera (pretemporada, parada, verano). */
  empieza?: string;
}

const DIAS_DE_LA_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const mayuscula = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** «el sábado 13 de octubre»: el día de la partida con su día de la semana (el día 0 es lunes) y sin año. */
export const diaConFecha = (dia: number): string => `el ${DIAS_DE_LA_SEMANA[((dia % 7) + 7) % 7]} ${fechaDelDia(dia).texto}`;

/** Cuándo es, en palabras, el primer día de una semana del curso (un lunes) o uno de sus días. */
const diaDeLaSemana = (primeraSemanaDelCurso: number, semanaDelCurso: number, diaDeLaSemanaN: number): number => (primeraSemanaDelCurso + semanaDelCurso) * 7 + diaDeLaSemanaN;

export function situacionDeTemporada(cal: CalendarioPais, temporada: TemporadaDeDeporte, t: { week: number; schoolWeek: number; period: Periodo }, o: OpcionesDeSituacion): SituacionDeTemporada {
  const sem = semanasDeTemporada(cal, temporada);
  const inicioDelCurso = t.week - t.schoolWeek;
  const { articulo, nombre, plural } = o.competicion;
  const empiezan = `${mayuscula(articulo)} ${nombre} ${plural ? 'empiezan' : 'empieza'}`;
  const nombreDelTramo = mayuscula(nombre);
  const jornada = (curso0: number, semana: number) => {
    const dia = diaDeLaSemana(curso0, semana, o.diaDeJornada);
    return { dia, texto: diaConFecha(dia) };
  };
  const verano = cal.tramos.find((x) => x.periodo === 'verano');
  const finDeCurso = (): string => (verano ? diaConFecha(diaDeLaSemana(inicioDelCurso, verano.desde, 0)) : 'cuando acaben las clases');
  if (t.period === 'verano') {
    const siguienteCurso = inicioDelCurso + cal.semanasPorCurso;
    const primera = jornada(siguienteCurso, sem.primeraCompeticion);
    const pretemporada = diaConFecha(diaDeLaSemana(siguienteCurso, 0, 0));
    return { tramo: 'verano', primeraJornada: primera, empieza: primera.texto, texto: `Verano. La pretemporada empieza ${pretemporada} y ${articulo} ${nombre} ${plural ? 'empiezan' : 'empieza'} ${primera.texto}.` };
  }
  const primera = jornada(inicioDelCurso, sem.primeraCompeticion);
  if (t.period === 'clase' && t.schoolWeek < sem.primeraCompeticion) return { tramo: 'pretemporada', primeraJornada: primera, empieza: primera.texto, texto: `Pretemporada. ${empiezan} ${primera.texto}.` };
  if (t.period !== 'clase') {
    // Vacaciones de Navidad o de Semana Santa en plena temporada: no hay competición hasta la primera semana de clase que viene.
    const reanuda = [...Array(cal.semanasPorCurso).keys()].find((w) => w > t.schoolWeek && tramoDeSemana(cal, w).periodo === 'clase');
    const vuelve = reanuda !== undefined ? jornada(inicioDelCurso, reanuda) : primera;
    return { tramo: 'parada', primeraJornada: primera, empieza: vuelve.texto, texto: `${nombreDelTramo}, parada por las vacaciones. Se reanuda ${vuelve.texto}.` };
  }
  if (o.terminada) return { tramo: 'terminada', primeraJornada: primera, texto: `${nombreDelTramo} terminada. El verano empieza ${finDeCurso()}.` };
  return { tramo: 'competicion', primeraJornada: primera, texto: `${nombreDelTramo}. El verano empieza ${finDeCurso()}.` };
}

/**
 * `situacionDeTemporada` de un deporte por su id, con sus datos en el país de la partida: la temporada y el día de la primera jornada (el más temprano de los de `competiciones.jornada.dias`).
 * Lo usan la pestaña del deporte, la acción de jugar y el entrenador.
 */
export function situacionDelDeporte(ctx: Pick<ReadContext, 'aportes' | 'pais' | 'time'>, deporte: string, competicion: NombreDeCompeticion, terminada?: boolean): SituacionDeTemporada {
  const datos = datosDeDeporte(ctx, deporte);
  return situacionDeTemporada(ctx.pais.calendario, datos.temporada, ctx.time, { competicion, diaDeJornada: Math.min(...datos.competiciones.jornada.dias), ...(terminada ? { terminada } : {}) });
}
