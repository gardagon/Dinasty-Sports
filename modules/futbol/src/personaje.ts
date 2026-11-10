/**
 * EL PARTIDO DEL PERSONAJE (F2.3b, segunda parte): lo que el personaje ve antes del sábado (el rival, el puesto de cada uno en la tabla, si está convocado y de titular o suplente, su estado, la intensidad que lleva elegida
 * y los últimos resultados de los dos equipos) y lo que ve después (la crónica del partido entero, tramo a tramo, con lo suyo resaltado, y su nota si jugó). Son funciones puras sobre la liga y el resultado del motor.
 */
import { calendarioDobleVuelta } from '@ds/kit-deporte';
import { tablasDeLaDivision, type LigaDeCategoria } from './liga';
import { PARAMETROS_DE_PARTIDO, type Intensidad, type MomentoDeCronica, type ResultadoDePartido } from './partido';

/** El id del personaje dentro de un partido. */
export const YO = 'personaje';

/** Los números del partido del personaje, como datos. */
export const PARAMETROS_DEL_PERSONAJE = {
  /** Cuánta energía pierde por punto de cansancio con que acaba el partido (un jugador típico acaba con unos 45): el coste de la acción del partido. */
  energiaPorCansancio: 0.6,
  /** Lo que le sube o baja la motivación el resultado del equipo (más o menos un punto por cada dos de nota sobre o bajo el 6). */
  motivacion: { victoria: 4, empate: 1, derrota: -2 } as const,
  /** Cuántos resultados recientes se enseñan de cada equipo. */
  ultimosResultados: 5,
  /** Cuántos partidos suyos se guardan (con el último, con su crónica; F2.4 guardará las estadísticas de todos). */
  partidosGuardados: 10,
};

export const INTENSIDADES: readonly { id: Intensidad; nombre: string; descripcion: string }[] = [
  { id: 'relajado', nombre: 'Relajado', descripcion: 'Te cansas menos (×0,7) pero rindes un poco menos (×0,93).' },
  { id: 'normal', nombre: 'Normal', descripcion: 'Un partido normal: ni te reservas ni te dejas la piel.' },
  { id: 'a_tope', nombre: 'A tope', descripcion: 'Te dejas todo: rindes un poco más (×1,07) pero te cansas mucho antes (×1,4) y al final del partido puedes ir justo.' },
];
export const nombreDeIntensidad = (i: Intensidad): string => INTENSIDADES.find((x) => x.id === i)?.nombre ?? i;

// ---------------------------------------------------------------------------------------------------- la crónica

/** Una línea de la crónica: `titulo` marca el inicio de un tramo y `destacada`, lo que hace el personaje. */
export interface LineaDeCronica {
  texto: string;
  destacada?: boolean;
  titulo?: boolean;
}

export interface OpcionesDeCronica {
  /** Los nombres de los dos equipos ([local, visitante]). */
  equipos: [string, string];
  /** El nombre de cada jugador por id. */
  nombres: Readonly<Record<string, string>>;
}

const MINUTOS = PARAMETROS_DE_PARTIDO.minutosPorTramo;

/**
 * **La crónica del partido entero, tramo a tramo** (decisión del usuario, 10/11): goles, ocasiones, balón parado y cambios de los dos equipos. Lo que hace el personaje (sus jugadas, sus goles y asistencias, sus paradas, los goles
 * que encaja si es el portero y cuándo entra o sale) sale destacado para encontrarlo de un vistazo.
 */
export function cronicaDelPartido(r: ResultadoDePartido, o: OpcionesDeCronica): LineaDeCronica[] {
  const nom = (id: string | undefined): string => (id === YO ? 'tú' : id ? o.nombres[id] ?? 'un jugador' : 'un jugador');
  const nomIni = (id: string): string => (id === YO ? 'Tú' : o.nombres[id] ?? 'Un jugador');
  const linea = (m: MomentoDeCronica): LineaDeCronica => {
    const equipo = o.equipos[m.equipo];
    const rival = o.equipos[1 - m.equipo];
    const mio = m.jugador === YO || m.otro === YO || m.portero === YO;
    switch (m.tipo) {
      case 'gol': {
        const abre = m.gol ? `¡Gol de ${equipo} de balón parado!` : `¡Gol de ${equipo}!`;
        if (m.jugador === YO) return { destacada: true, texto: `${abre} Marcas tú${m.otro ? `, con pase de ${nom(m.otro)}` : ''}. ¡Es tuyo!` };
        if (m.otro === YO) return { destacada: true, texto: `${abre} ${nomIni(m.jugador)} marca con un pase tuyo: asistencia.` };
        if (m.portero === YO) return { destacada: true, texto: `${abre} ${nomIni(m.jugador)} marca y no puedes evitarlo.` };
        return { texto: `${abre} ${nomIni(m.jugador)} marca${m.otro ? `, asistido por ${nom(m.otro)}` : ''}.` };
      }
      case 'ocasion':
        if (m.jugador === YO) return { destacada: true, texto: `Tiras a puerta y ${nom(m.portero)} te la para.` };
        if (m.portero === YO) return { destacada: true, texto: `${nomIni(m.jugador)} (${equipo}) dispara y lo paras tú.` };
        return { texto: `${nomIni(m.jugador)} (${equipo}) dispara y ${nom(m.portero)} se lo para.` };
      case 'balon_parado':
        if (m.jugador === YO) return { destacada: true, texto: `Lanzas a balón parado y ${nom(m.portero)} lo despeja.` };
        if (m.portero === YO) return { destacada: true, texto: `${nomIni(m.jugador)} lanza a balón parado para ${equipo} y lo despejas tú.` };
        return { texto: `${nomIni(m.jugador)} lanza a balón parado para ${equipo} y ${nom(m.portero)} lo despeja.` };
      case 'cambio':
        if (m.jugador === YO) return { destacada: true, texto: `Entras al campo por ${nom(m.otro)}.` };
        if (m.otro === YO) return { destacada: true, texto: `Sales del campo: entra ${nom(m.jugador)}.` };
        return { texto: `Cambio en ${equipo}: entra ${nom(m.jugador)} por ${nom(m.otro)}.` };
      default:
        void rival;
        void mio;
        return { texto: '' };
    }
  };
  const lineas: LineaDeCronica[] = [];
  let a = 0;
  let b = 0;
  for (let t = 0; t < r.porTramo.length; t++) {
    lineas.push({ titulo: true, texto: `Minutos ${t * MINUTOS}–${(t + 1) * MINUTOS}` });
    const momentos = r.cronica.filter((m) => m.tramo === t);
    for (const m of momentos) lineas.push(linea(m));
    if (!momentos.some((m) => m.tipo !== 'cambio')) lineas.push({ texto: 'Tramo sin ocasiones claras.' });
    a += r.porTramo[t].goles[0];
    b += r.porTramo[t].goles[1];
    const p = Math.round(r.porTramo[t].posesion[0] * 100);
    lineas.push({ texto: `${o.equipos[0]} ${a}–${b} ${o.equipos[1]} · posesión ${p} %–${100 - p} %` });
  }
  lineas.push({ titulo: true, texto: `Final: ${o.equipos[0]} ${r.goles[0]}–${r.goles[1]} ${o.equipos[1]}` });
  return lineas;
}

// ---------------------------------------------------------------------------------------------------- la liga vista desde un equipo

export interface SituacionEnLaLiga {
  /** 1 = Primera. */
  division: number;
  divisiones: number;
  puesto: number;
  de: number;
  puntos: number;
  pj: number;
}

/** El puesto de un equipo en la tabla de su grupo (con la división). */
export function situacionEnLaLiga(liga: LigaDeCategoria, id: string): SituacionEnLaLiga | undefined {
  for (const [i, d] of liga.divisiones.entries()) {
    for (const tabla of tablasDeLaDivision(d)) {
      const k = tabla.findIndex((f) => f.id === id);
      if (k >= 0) return { division: i + 1, divisiones: liga.divisiones.length, puesto: k + 1, de: tabla.length, puntos: tabla[k].puntos, pj: tabla[k].pj };
    }
  }
  return undefined;
}

export interface ProximoPartido {
  rival: string;
  /** ¿Juega en casa? */
  local: boolean;
  /** «Jornada 5» o «Playoff · semifinal (ida)». */
  texto: string;
}

/** El próximo partido de un equipo: el de su grupo en la siguiente jornada o, en la última división, el del playoff si sigue vivo. `undefined` si descansa o no le queda ninguno. */
export function proximoPartido(liga: LigaDeCategoria, id: string): ProximoPartido | undefined {
  for (const [i, d] of liga.divisiones.entries()) {
    const g = d.grupos.find((x) => x.equipos.includes(id));
    if (!g) continue;
    const jornada = calendarioDobleVuelta(g.equipos)[liga.jornada];
    if (jornada) {
      const p = jornada.find((x) => x.local === id || x.visitante === id);
      return p ? { rival: p.local === id ? p.visitante : p.local, local: p.local === id, texto: `Jornada ${liga.jornada + 1}` } : undefined;
    }
    const po = d.playoff;
    if (i === liga.divisiones.length - 1 && po && po.campeon === undefined) {
      const c = po.ronda.cruces.find((x) => x.a === id || x.b === id);
      if (!c) return undefined;
      const dos = !!c.idaYVuelta;
      // La ida es en el campo del peor sembrado (b); la vuelta y la final, en el del mejor (a).
      const local = dos && po.partido === 0 ? c.b : c.a;
      return { rival: c.a === id ? c.b : c.a, local: local === id, texto: `Playoff · ${po.ronda.nombre}${dos ? (po.partido === 0 ? ' (ida)' : ' (vuelta)') : ''}` };
    }
  }
  return undefined;
}

/** Los últimos resultados de un equipo en la liga (el más reciente, al final): `G`, `E` o `P` con el marcador de su equipo primero. */
export function ultimosResultados(liga: LigaDeCategoria, id: string, n: number = PARAMETROS_DEL_PERSONAJE.ultimosResultados): { letra: 'G' | 'E' | 'P'; propios: number; rival: number }[] {
  for (const d of liga.divisiones) {
    const g = d.grupos.find((x) => x.equipos.includes(id));
    if (!g) continue;
    const k = g.equipos.indexOf(id);
    return g.resultados
      .filter(([l, v]) => l === k || v === k)
      .map(([l, , gl, gv]) => {
        const propios = l === k ? gl : gv;
        const rival = l === k ? gv : gl;
        return { letra: (propios > rival ? 'G' : propios < rival ? 'P' : 'E') as 'G' | 'E' | 'P', propios, rival };
      })
      .slice(-n);
  }
  return [];
}

/** «G 2–1 · E 0–0 · P 1–3»: los resultados recientes en una línea (vacío si no ha jugado). */
export const textoDeResultados = (rs: ReturnType<typeof ultimosResultados>): string => (rs.length ? rs.map((x) => `${x.letra} ${x.propios}–${x.rival}`).join(' · ') : 'sin partidos aún');
