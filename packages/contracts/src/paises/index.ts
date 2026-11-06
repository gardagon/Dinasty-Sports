import { CALENDARIOS } from '../calendar';
import { CIUDAD_DE_PRUEBA, type CiudadDef } from '../ciudad';
import { registrarReserva } from '../culturas';
import { OJOS, PELO_COLOR, PELO_TIPO, PIEL, origen, registrarOrigen } from '../rasgos';
import { PAIS_ARGENTINA } from './argentina';
import { PAIS_ESPANA, copiaDeEspana } from './espana';
import { PAIS_INGLATERRA } from './inglaterra';
import type { PaisDef } from './tipos';

export * from './tipos';
export * from './curriculo';
export { PAIS_ESPANA, copiaDeEspana } from './espana';
export { PAIS_ARGENTINA } from './argentina';
export { PAIS_INGLATERRA } from './inglaterra';

/**
 * Un país con la **ciudad pequeña de prueba** (`CIUDAD_DE_PRUEBA`): los mismos datos (calendario, currículo, nombres, deportes), pero unas 220 personas en vez de 1.100, así que crear
 * una partida cuesta una fracción. Los tests que crean muchas partidas lo registran (`registrarPais(conCiudadDePrueba(PAIS_ESPANA))`) y piden su id (`id + SUFIJO_CIUDAD_DE_PRUEBA`).
 */
export const SUFIJO_CIUDAD_DE_PRUEBA = '_ciudad_de_prueba';
/** Un país con otra ciudad (otra población, otro número de clubes...): el mismo país con su id acabado en `sufijo`, listo para registrar. */
export function conCiudad(pais: PaisDef, ciudad: CiudadDef, sufijo: string): PaisDef {
  const id = `${pais.id}${sufijo}`;
  const copia = structuredClone(pais) as PaisDef;
  return { ...copia, id, calendario: { ...copia.calendario, id }, ciudad };
}
export function conCiudadDePrueba(pais: PaisDef): PaisDef {
  const id = `${pais.id}${SUFIJO_CIUDAD_DE_PRUEBA}`;
  const copia = structuredClone(pais) as PaisDef;
  return { ...copia, id, calendario: { ...copia.calendario, id }, ciudad: CIUDAD_DE_PRUEBA };
}
/** España con la ciudad pequeña de prueba, lista para registrar. */
export const PAIS_CIUDAD_DE_PRUEBA = conCiudadDePrueba(PAIS_ESPANA);
export const ID_PAIS_CIUDAD_DE_PRUEBA = PAIS_CIUDAD_DE_PRUEBA.id;

/** Los países disponibles (el de España siempre; los demás, los de los paquetes registrados). */
const PAISES: Record<string, PaisDef> = { espana: PAIS_ESPANA };

/** Un país por su id; si no existe (una partida guardada de un paquete que falta), el de España. */
export const paisPorId = (id: string | undefined): PaisDef => PAISES[id ?? 'espana'] ?? PAIS_ESPANA;
export const existePais = (id: string): boolean => id in PAISES;
export const listarPaises = (): readonly PaisDef[] => Object.values(PAISES);

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const esLista = (x: unknown, minimo = 1): x is unknown[] => Array.isArray(x) && x.length >= minimo;

/**
 * Comprueba un paquete de país (por ejemplo, el que viene de un archivo): devuelve los problemas que tiene, en español; vacío si vale.
 * Mira la forma de los datos, no su contenido de juego (que las asignaturas de un curso existan lo comprueba el módulo de estudios).
 */
export function validarPais(x: unknown): string[] {
  const p: string[] = [];
  if (!esObjeto(x)) return ['El paquete de país no es un objeto'];
  if (typeof x.id !== 'string' || !/^[a-z][a-z0-9_]{1,30}$/.test(x.id)) p.push('«id» tiene que ser un texto corto en minúsculas (letras, cifras y guion bajo)');
  if (typeof x.nombre !== 'string' || !x.nombre.trim()) p.push('Falta el «nombre» del país');
  // Ciudad (opcional)
  if (x.ciudad !== undefined) {
    const c = x.ciudad;
    const campos: [string, number][] = [['colegiosDeFuera', 1], ['aulasPorCurso', 1], ['alumnosPorAula', 2], ['alumnosPorCursoDeCadaColegio', 1], ['vecinos', 0]];
    if (!esObjeto(c)) p.push('«ciudad» no es un objeto');
    else for (const [k, min] of campos) if (!Number.isInteger(c[k]) || (c[k] as number) < min) p.push(`«ciudad.${k}» tiene que ser un entero de ${min} o más`);
    if (esObjeto(c) && c.colegiosConClub !== undefined && (!Number.isInteger(c.colegiosConClub) || (c.colegiosConClub as number) < 0)) p.push('«ciudad.colegiosConClub» tiene que ser un entero de 0 o más');
    if (esObjeto(c) && c.personasPorClub !== undefined && (typeof c.personasPorClub !== 'number' || c.personasPorClub < 50)) p.push('«ciudad.personasPorClub» tiene que ser un número de 50 o más');
  }
  // Calendario
  const cal = x.calendario;
  if (!esObjeto(cal)) p.push('Falta el «calendario»');
  else {
    const semanas = cal.semanasPorCurso;
    if (typeof semanas !== 'number' || semanas < 10 || semanas > 60) p.push('«calendario.semanasPorCurso» tiene que estar entre 10 y 60');
    else if (!esLista(cal.tramos)) p.push('«calendario.tramos» está vacío');
    else {
      let siguiente = 0;
      for (const t of cal.tramos as { desde?: number; hasta?: number; periodo?: string; trimestre?: number }[]) {
        if (t.desde !== siguiente || typeof t.hasta !== 'number' || t.hasta < t.desde) p.push(`«calendario.tramos»: el tramo que empieza en ${t.desde} no continúa al anterior (tendría que empezar en ${siguiente})`);
        if (!['clase', 'navidad', 'semana_santa', 'verano'].includes(String(t.periodo))) p.push(`«calendario.tramos»: periodo «${t.periodo}» desconocido`);
        siguiente = (t.hasta ?? siguiente) + 1;
      }
      if (siguiente !== semanas) p.push(`«calendario.tramos» tiene que cubrir las ${semanas} semanas del curso (llega a la ${siguiente})`);
    }
    for (const campo of ['evaluaciones', 'parciales'] as const) {
      if (!Array.isArray(cal[campo]) || (cal[campo] as unknown[]).some((n) => typeof n !== 'number')) p.push(`«calendario.${campo}» tiene que ser una lista de semanas`);
    }
  }
  // Cursos
  if (!esLista(x.cursos)) p.push('Faltan los «cursos»');
  else {
    for (const c of x.cursos as Record<string, unknown>[]) {
      if (!esObjeto(c) || typeof c.nombre !== 'string' || !esLista(c.asignaturas) || (c.asignaturas as unknown[]).some((a) => typeof a !== 'string')) p.push(`Un curso está mal formado: ${JSON.stringify(c)?.slice(0, 80)}`);
    }
    if (typeof x.cursoDeModalidad !== 'number' || x.cursoDeModalidad < 0) p.push('Falta «cursoDeModalidad» (el curso en que se elige modalidad)');
  }
  // Horarios
  if (!esObjeto(x.horarios)) p.push('Faltan los «horarios» (puede ser {})');
  else {
    for (const [lugar, h] of Object.entries(x.horarios)) {
      if (!/^[a-z][a-z0-9_]*$/.test(lugar)) p.push(`«horarios»: «${lugar}» no es un id de lugar válido`);
      if (!esObjeto(h) || !esLista(h.tramos) || typeof h.texto !== 'string') p.push(`«horarios.${lugar}» está mal formado (tramos y texto)`);
    }
  }
  // Demografía y orígenes
  const propios = esLista(x.origenes, 0) ? (x.origenes as { id?: string }[]).map((o) => o.id) : [];
  for (const o of (esLista(x.origenes, 0) ? x.origenes : []) as Record<string, unknown>[]) {
    for (const [campo, largo] of [['peloColor', PELO_COLOR.length], ['peloTipo', PELO_TIPO.length], ['ojos', OJOS.length], ['piel', PIEL.length]] as const) {
      if (!Array.isArray(o[campo]) || (o[campo] as unknown[]).length !== largo) p.push(`Origen «${o.id}»: «${campo}» tiene que ser una lista de ${largo} probabilidades`);
    }
    if (typeof o.id !== 'string' || typeof o.reserva !== 'string' || typeof o.nombre !== 'string') p.push(`Un origen está mal formado: ${JSON.stringify(o)?.slice(0, 80)}`);
  }
  if (!esObjeto(x.demografia) || !Object.keys(x.demografia).length) p.push('Falta la «demografia» (id de origen → peso)');
  else {
    for (const [id, peso] of Object.entries(x.demografia)) {
      if (typeof peso !== 'number' || peso < 0) p.push(`«demografia.${id}» tiene que ser un número positivo`);
      if (!origen(id) && !propios.includes(id)) p.push(`«demografia»: el origen «${id}» no existe (ni en el catálogo ni en los «origenes» del paquete)`);
    }
    if (!esLista(x.origenesLocales) || (x.origenesLocales as unknown[]).some((o) => !(String(o) in (x.demografia as object)))) p.push('«origenesLocales» tiene que ser una lista de orígenes de la «demografia»');
  }
  if (x.apellidosDeLosNacidosAqui !== 1 && x.apellidosDeLosNacidosAqui !== 2) p.push('«apellidosDeLosNacidosAqui» tiene que ser 1 o 2');
  // Reservas de nombres
  if (x.reservasDeNombres !== undefined) {
    if (!esObjeto(x.reservasDeNombres)) p.push('«reservasDeNombres» tiene que ser un objeto');
    else {
      for (const [reserva, culturas] of Object.entries(x.reservasDeNombres)) {
        if (!esLista(culturas)) p.push(`Reserva «${reserva}» sin culturas`);
        for (const c of (esLista(culturas) ? culturas : []) as Record<string, unknown>[]) {
          const n = c.nombres as Record<string, Record<string, unknown>> | undefined;
          const listas = [n?.f?.jovenes, n?.f?.adultos, n?.m?.jovenes, n?.m?.adultos, c.apellidos];
          if (typeof c.id !== 'string' || listas.some((l) => !esLista(l)) || (c.numeroDeApellidos !== 1 && c.numeroDeApellidos !== 2)) p.push(`Cultura «${c.id}» de «${reserva}» mal formada (id, nombres de jóvenes y adultos de ambos sexos, apellidos y numeroDeApellidos)`);
        }
      }
    }
  }
  return p;
}

/**
 * Registra un paquete de país: lo comprueba (si tiene problemas, lanza un error con todos), añade sus orígenes, sus reservas de nombres y su
 * calendario, y lo pone entre los países elegibles. Registrar el mismo id otra vez lo sustituye.
 */
export function registrarPais(x: unknown): PaisDef {
  const problemas = validarPais(x);
  if (problemas.length) throw new Error(`Paquete de país no válido:\n- ${problemas.join('\n- ')}`);
  const pais = x as PaisDef;
  for (const o of pais.origenes ?? []) registrarOrigen(o);
  for (const [id, culturas] of Object.entries(pais.reservasDeNombres ?? {})) registrarReserva(id, culturas);
  CALENDARIOS[pais.id] = pais.calendario;
  PAISES[pais.id] = pais;
  return pais;
}

/** Lee un paquete de país de un texto JSON y lo registra. */
export function importarPais(texto: string): PaisDef {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es un JSON válido');
  }
  return registrarPais(datos);
}

// Los paquetes que vienen de serie (copias de España hasta que tengan sus datos).
registrarPais(PAIS_ARGENTINA);
registrarPais(PAIS_INGLATERRA);
