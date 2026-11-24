/**
 * PROTOTIPO (no es código del juego; `docs/relevo/partidos-reales.md`): cuatro formas de simular un partido de fútbol, de menos a más detalle, con los mismos jugadores que el motor de hoy (`valorEnPartido`), para medir
 * lo que cuesta cada una y lo que enseña. No toca el motor ni el juego: es una herramienta aparte, como `tools/partidos.ts`.
 *
 *   A  el motor de hoy con tramos más finos (los mismos parámetros, más tramos)                 — `jugarPartido` de verdad
 *   B  posesiones y ocasiones con xG (una lista de sucesos por minuto, sin campo)               — `motorB`
 *   C  jugadas encadenadas por zonas (12 zonas, un jugador con balón y una acción cada vez)      — `motorC`
 *   D  simulación espacial (22 jugadores y balón con posiciones, un paso cada 0,5 o 1 s)         — `motorD`
 *
 * Uso: `npx tsx tools/partidos-reales-prototipo.ts [partidos por motor=200] [ciudad: prueba|grande]`.
 * B, C y D están ajustados a ojo (unas pocas pasadas) para dar cifras del orden de un partido real entre equipos iguales; D, el menos. Sirven para el COSTE y para ver qué estadísticas salen, no como motor calibrado.
 */
import { PAIS_CIUDAD_GRANDE, PAIS_CIUDAD_DE_PRUEBA, registrarPais, rngEstable, type LectorDePersona, type Rng } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PARAMETROS_DE_PARTIDO, POTENCIADOR_POR_CATEGORIA, cansancioDelTramo, convocarYAlinear, equipoDePartido, futbol, jugarPartido, rendimientoPorCansancio, valorEnPartido, type EquipoDePartido, type JugadorDePartido } from '@ds/mod-futbol';
import { plantillaDeUnEquipo, type NpcsState } from '@ds/mod-npcs';

const N = Number(process.argv[2] ?? 200);
const GRANDE = (process.argv[3] ?? 'prueba') === 'grande';
registrarPais(GRANDE ? PAIS_CIUDAD_GRANDE : PAIS_CIUDAD_DE_PRUEBA);
const f = (x: number, d = 1): string => x.toFixed(d);
const media = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
const rel = (a: number, b: number, p = 1): number => Math.pow(Math.max(a, 1e-6), p) / (Math.pow(Math.max(a, 1e-6), p) + Math.pow(Math.max(b, 1e-6), p));

// ------------------------------------------------------------------------------------------------------------- jugadores preparados (comunes a B, C y D)

const HAB = ['pase', 'control', 'regate', 'definicion', 'tecnica', 'cabeza', 'marcaje', 'entrada', 'disparo_lejano', 'faltas', 'corners', 'vision', 'posicionamiento', 'desmarque', 'anticipacion', 'decisiones', 'arrancada', 'reflejos', 'mano_a_mano', 'blocaje', 'alcance_aereo', 'dominio_area', 'juego_colectivo', 'centros'] as const;
type Hab = (typeof HAB)[number];
type Linea = 'GK' | 'DEF' | 'MID' | 'ATT';
/** Posición de partida en el campo: x de 0 (su portería) a 1 (la rival) e y de 0 a 1 (de banda a banda). */
const ANCLA: Record<string, [number, number]> = { GK: [0.03, 0.5], CB: [0.2, 0.5], LB: [0.25, 0.1], RB: [0.25, 0.9], CDM: [0.38, 0.5], CM: [0.5, 0.5], LCR: [0.5, 0.35], RCR: [0.5, 0.65], LM: [0.55, 0.1], RM: [0.55, 0.9], CAM: [0.65, 0.5], LW: [0.78, 0.1], RW: [0.78, 0.9], ST: [0.85, 0.5], LST: [0.85, 0.4], RST: [0.85, 0.6] };
const LINEA = (p: string): Linea => (p === 'GK' ? 'GK' : ['CB', 'LB', 'RB'].includes(p) ? 'DEF' : ['CDM', 'CM', 'LCR', 'RCR', 'LM', 'RM'].includes(p) ? 'MID' : 'ATT');

interface Jug {
  id: string;
  puesto: string;
  linea: Linea;
  v: Record<Hab, number>;
  vel: number;
  res: number;
  rinde: number;
  cans: number;
  anclaX: number;
  anclaY: number;
  // estadísticas
  goles: number;
  asist: number;
  tiros: number;
  alPuerta: number;
  xg: number;
  pases: number;
  pasesOk: number;
  regates: number;
  entradas: number;
  faltas: number;
  amarillas: number;
  expulsado: boolean;
  paradas: number;
  // espacial
  x: number;
  y: number;
}
interface Eq {
  id: string;
  campo: Jug[];
  banquillo: Jug[];
  pot: number;
  energia: Map<string, number>;
}

const prepararJug = (j: JugadorDePartido, pot: number): Jug => {
  const v = {} as Record<Hab, number>;
  for (const h of HAB) v[h] = valorEnPartido(j.lector, `futbol.${h}`, pot);
  const [ax, ay] = ANCLA[j.puesto] ?? [0.5, 0.5];
  return { id: j.id, puesto: j.puesto, linea: LINEA(j.puesto), v, vel: j.lector.stat('gen.velocidad') * pot, res: j.lector.norm('gen.resistencia'), rinde: j.rinde ?? 1, cans: 0, anclaX: ax, anclaY: ay, goles: 0, asist: 0, tiros: 0, alPuerta: 0, xg: 0, pases: 0, pasesOk: 0, regates: 0, entradas: 0, faltas: 0, amarillas: 0, expulsado: false, paradas: 0, x: ax, y: ay };
};
function prepararEq(e: EquipoDePartido, pot: number): Eq {
  const todos = e.jugadores.map((j) => ({ j, e: prepararJug(j, pot) }));
  // Los que juegan en el mismo puesto se reparten por la anchura (dos centrales a ambos lados del eje).
  const por = new Map<string, number>();
  for (const { e: x } of todos.filter((t) => t.j.titular)) {
    const n = por.get(x.puesto) ?? 0;
    por.set(x.puesto, n + 1);
    if (n === 1) x.anclaY = x.puesto === 'CB' ? 0.62 : x.puesto === 'CM' ? 0.65 : x.anclaY;
    if (n === 0 && x.puesto === 'CB') x.anclaY = 0.38;
    if (n === 0 && x.puesto === 'CM') x.anclaY = 0.35;
  }
  return { id: e.id, campo: todos.filter((t) => t.j.titular).map((t) => t.e), banquillo: todos.filter((t) => !t.j.titular).map((t) => t.e), pot, energia: new Map(e.jugadores.map((j) => [j.id, j.energia ?? 100])) };
}
const rindeAhora = (j: Jug): number => rendimientoPorCansancio(j.cans, 'normal') * j.rinde;
const cansPorMinuto = (j: Jug, energia: number): number => (PARAMETROS_DE_PARTIDO.cansancioPorTramo / PARAMETROS_DE_PARTIDO.minutosPorTramo) * (1.5 - j.res) * (1 + (100 - energia) / 100);

/** Lo que se cuenta de un partido, igual para los cuatro motores. */
interface Salida {
  goles: [number, number];
  tiros: [number, number];
  alPuerta: [number, number];
  xg: [number, number];
  posesion: number;
  faltas: [number, number];
  amarillas: [number, number];
  rojas: [number, number];
  corners: [number, number];
  pases: [number, number];
  eventos: number;
  /** El registro del partido (lo que una crónica o un visualizador leería). */
  registro: unknown[];
  consultasDeLesion: number;
}
const vacia = (): Salida => ({ goles: [0, 0], tiros: [0, 0], alPuerta: [0, 0], xg: [0, 0], posesion: 0.5, faltas: [0, 0], amarillas: [0, 0], rojas: [0, 0], corners: [0, 0], pases: [0, 0], eventos: 0, registro: [], consultasDeLesion: 0 });

/**
 * El gancho de las lesiones (`MOTOR_PARTIDOS.md` §9; la otra sesión define el servicio `salud`): en el motor real devolvería la probabilidad de lesionarse con ese esfuerzo; aquí vale 0 y solo cuenta cuántas veces se le preguntaría.
 */
const preguntarLesion = (s: Salida, _j: Jug, _minuto: number, _contacto: number): number => {
  s.consultasDeLesion++;
  return 0;
};

// ------------------------------------------------------------------------------------------------------------- B: posesiones y ocasiones (xG)

const PB = { posesionesPorMinuto: 2.45, avance: 0.4, tiroDelAvance: 0.3, xgMedio: 0.105, faltasPorMinuto: 0.26, amarilla: 0.17, roja: 0.004, penalti: 0.012, cornerDelTiro: 0.08, casa: 0.04 };

function fuerzas(eq: Eq, casa: number): { cre: number; ata: number; def: number; por: number } {
  let cre = 0, ata = 0, def = 0, nc = 0, na = 0, nd = 0, por = 1;
  for (const j of eq.campo) {
    if (j.expulsado) continue;
    const r = rindeAhora(j);
    if (j.linea === 'GK') por = (0.3 * j.v.reflejos + 0.2 * j.v.blocaje + 0.2 * j.v.mano_a_mano + 0.15 * j.v.alcance_aereo + 0.15 * j.v.dominio_area) * r;
    else {
      const c = (0.35 * j.v.pase + 0.25 * j.v.control + 0.25 * j.v.vision + 0.15 * j.v.decisiones) * r;
      const a = (0.3 * j.v.definicion + 0.25 * j.v.desmarque + 0.25 * j.v.regate + 0.2 * j.v.arrancada) * r;
      const d = (0.3 * j.v.marcaje + 0.3 * j.v.entrada + 0.2 * j.v.anticipacion + 0.2 * j.v.posicionamiento) * r;
      const wc = j.linea === 'MID' ? 1 : j.linea === 'DEF' ? 0.45 : 0.55;
      const wa = j.linea === 'ATT' ? 1 : j.linea === 'MID' ? 0.45 : 0.1;
      const wd = j.linea === 'DEF' ? 1 : j.linea === 'MID' ? 0.5 : 0.12;
      cre += wc * c; nc += wc; ata += wa * a; na += wa; def += wd * d; nd += wd;
    }
  }
  return { cre: (cre / Math.max(nc, 1e-6)) * (1 + casa), ata: (ata / Math.max(na, 1e-6)) * (1 + casa), def: (def / Math.max(nd, 1e-6)) * (1 + casa), por: por * (1 + casa) };
}
const pesoSorteo = <T>(rng: Rng, xs: readonly T[], w: (x: T) => number): T => {
  let t = 0;
  for (const x of xs) t += Math.max(0, w(x));
  let r = rng.next() * (t || 1);
  for (const x of xs) {
    r -= Math.max(0, w(x));
    if (r <= 0) return x;
  }
  return xs[xs.length - 1];
};

function motorB(a: Eq, b: Eq, rng: Rng): Salida {
  const s = vacia();
  const eqs = [a, b] as const;
  const posesiones = [0, 0];
  let fz = [fuerzas(a, PB.casa), fuerzas(b, 0)];
  const log = (e: Record<string, unknown>): void => {
    s.registro.push(e);
    s.eventos++;
  };
  for (let min = 0; min < 90; min++) {
    if (min % 5 === 0) fz = [fuerzas(a, PB.casa), fuerzas(b, 0)];
    for (const [i, eq] of eqs.entries()) for (const j of eq.campo) j.cans += cansPorMinuto(j, eq.energia.get(j.id) ?? 100);
    // Posesiones del minuto: de cada una se sortea quién la tiene (según la creación) y qué pasa.
    const n = Math.floor(PB.posesionesPorMinuto) + (rng.chance(PB.posesionesPorMinuto % 1) ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const i = rng.chance(rel(fz[0].cre, fz[1].cre, 2)) ? 0 : 1;
      const atq = eqs[i], def = eqs[1 - i], fa = fz[i], fd = fz[1 - i];
      posesiones[i]++;
      // Falta (del que defiende) durante la posesión: duelo con contacto.
      if (rng.chance(PB.faltasPorMinuto / PB.posesionesPorMinuto)) {
        const infractor = pesoSorteo(rng, def.campo.filter((j) => !j.expulsado && j.linea !== 'GK'), (j) => 1.6 - j.v.entrada / (j.v.entrada + 40));
        const victima = pesoSorteo(rng, atq.campo.filter((j) => !j.expulsado && j.linea !== 'GK'), (j) => j.v.regate + 10);
        infractor.faltas++;
        s.faltas[1 - i]++;
        preguntarLesion(s, victima, min, 1);
        let tipo = 'falta';
        if (rng.chance(PB.amarilla)) {
          infractor.amarillas++;
          s.amarillas[1 - i]++;
          tipo = 'amarilla';
          if (infractor.amarillas >= 2) { infractor.expulsado = true; s.rojas[1 - i]++; tipo = 'roja_por_doble_amarilla'; }
        } else if (rng.chance(PB.roja)) { infractor.expulsado = true; s.rojas[1 - i]++; tipo = 'roja'; }
        log({ min, tipo, equipo: 1 - i, infractor: infractor.id, victima: victima.id });
        if (rng.chance(PB.penalti)) {
          tirarPenalti(i, min, atq, def, rng, s, log);
          continue;
        }
        // Falta lejos de la portería: balón parado (en la zona de ataque, un centro o un disparo).
        if (!rng.chance(0.3)) continue;
      }
      // Avanzar hasta el último tercio: creación y ataque propios frente a la defensa rival.
      const pAvance = clamp(PB.avance * 2 * rel(0.5 * fa.cre + 0.5 * fa.ata, fd.def, 1.1), 0, 0.9);
      if (!rng.chance(pAvance)) continue;
      // Ocasión: calidad (xG) aleatoria; mejor con mejor ataque y creación frente a la defensa; menos con el portero.
      const q = rel(fa.ata, fd.def, 1);
      if (!rng.chance(clamp(PB.tiroDelAvance * 2 * q, 0, 0.9))) {
        if (rng.chance(PB.cornerDelTiro)) { s.corners[i]++; log({ min, tipo: 'corner', equipo: i }); }
        continue;
      }
      const tipoTiro = rng.next();
      const cabeza = tipoTiro < 0.2;
      const lejano = !cabeza && tipoTiro < 0.38;
      const tirador = pesoSorteo(rng, atq.campo.filter((j) => !j.expulsado && j.linea !== 'GK'), (j) => (j.linea === 'ATT' ? 3 : j.linea === 'MID' ? 1 : 0.35) * Math.pow(cabeza ? j.v.cabeza : lejano ? j.v.disparo_lejano : j.v.definicion, 1.5));
      const asist = !lejano && rng.chance(0.7) ? pesoSorteo(rng, atq.campo.filter((j) => j !== tirador && !j.expulsado && j.linea !== 'GK'), (j) => (j.linea === 'MID' ? 2 : 1) * j.v.pase) : undefined;
      // xG: lejano pequeño, cabeza media, juego grande; sube con la ventaja del ataque sobre la defensa (de ×0,6 a ×1,6 alrededor del valor medio).
      const base = lejano ? 0.025 : cabeza ? 0.055 : 0.085;
      const xg = clamp(base * Math.exp((rng.next() + rng.next() + rng.next() - 1.5) * 1.1) * (0.4 + 1.2 * q), 0.01, 0.85);
      const habTiro = cabeza ? tirador.v.cabeza : lejano ? tirador.v.disparo_lejano : tirador.v.definicion;
      const gk = def.campo.find((j) => j.linea === 'GK');
      const valTiro = habTiro * rindeAhora(tirador);
      const valGk = fd.por;
      const pGol = clamp(xg * 2 * rel(valTiro, valGk, 1.2), 0, 0.9);
      s.tiros[i]++;
      s.xg[i] += xg;
      tirador.tiros++;
      tirador.xg += xg;
      const bloqueado = rng.chance(0.2);
      const fuera = !bloqueado && rng.chance(0.3 + 0.1 * (1 - rel(valTiro, 30)));
      if (bloqueado) { log({ min, tipo: 'tiro_bloqueado', equipo: i, tirador: tirador.id, xg }); continue; }
      if (fuera) { log({ min, tipo: 'tiro_fuera', equipo: i, tirador: tirador.id, xg }); continue; }
      s.alPuerta[i]++;
      tirador.alPuerta++;
      if (rng.chance(clamp(pGol / 0.52, 0, 0.95))) {
        s.goles[i]++;
        tirador.goles++;
        if (asist) asist.asist++;
        log({ min, tipo: 'gol', equipo: i, tirador: tirador.id, asistente: asist?.id, xg });
      } else {
        if (gk) gk.paradas++;
        log({ min, tipo: 'parada', equipo: i, tirador: tirador.id, portero: gk?.id, xg });
        if (rng.chance(0.25)) { s.corners[i]++; log({ min, tipo: 'corner', equipo: i }); }
      }
    }
  }
  s.posesion = posesiones[0] / Math.max(1, posesiones[0] + posesiones[1]);
  s.pases = [Math.round(posesiones[0] * 4.2), Math.round(posesiones[1] * 4.2)];
  return s;
}
function tirarPenalti(i: number, min: number, atq: Eq, def: Eq, rng: Rng, s: Salida, log: (e: Record<string, unknown>) => void): void {
  const t = atq.campo.filter((j) => !j.expulsado && j.linea !== 'GK').reduce((m, j) => (j.v.definicion > m.v.definicion ? j : m));
  const gk = def.campo.find((j) => j.linea === 'GK');
  s.tiros[i]++;
  s.alPuerta[i]++;
  s.xg[i] += 0.76;
  const gol = rng.chance(clamp(0.75 * 2 * rel(t.v.definicion * rindeAhora(t), (gk?.v.reflejos ?? 30), 1.2), 0, 0.95));
  if (gol) { s.goles[i]++; t.goles++; }
  log({ min, tipo: gol ? 'penalti_gol' : 'penalti_fallado', equipo: i, tirador: t.id });
}

// ------------------------------------------------------------------------------------------------------------- C: jugadas por zonas

const FILAS = 4, COLUMNAS = 3;
const zonaDe = (x: number, y: number): [number, number] => [Math.min(FILAS - 1, Math.floor(x * FILAS)), Math.min(COLUMNAS - 1, Math.floor(y * COLUMNAS))];
/** xG de un tiro según la zona desde donde se hace (fila de ataque 3: el área). */
const XG_ZONA: number[][] = [[0.01, 0.01, 0.01], [0.012, 0.015, 0.012], [0.025, 0.04, 0.025], [0.05, 0.12, 0.05]];

function motorC(a: Eq, b: Eq, rng: Rng): Salida {
  const s = vacia();
  const eqs = [a, b] as const;
  const log = (e: Record<string, unknown>): void => {
    s.registro.push(e);
    s.eventos++;
  };
  // Posiciones: cada jugador está en su zona de partida; con el balón en un lado del campo, el equipo se desplaza (una fila hacia delante si ataca, una hacia atrás si defiende).
  const zonaDelJugador = (j: Jug, ataca: boolean, bola: number): [number, number] => {
    if (j.linea === 'GK') return [0, 1];
    const dx = (ataca ? 0.12 : -0.1) + (bola - 0.5) * 0.25;
    return zonaDe(clamp(j.anclaX + dx, 0, 1), j.anclaY);
  };
  let i = rng.chance(0.5) ? 0 : 1;
  let portador = eqs[i].campo.find((j) => j.puesto === 'CM') ?? eqs[i].campo[5];
  let fila = 1;
  let bola = 0.5; // posición de la bola hacia la portería rival (0 a 1) del que la tiene
  let t = 0;
  let tPosesionA = 0;
  let paso = 0;
  const ultimoActivo: (Jug | undefined)[] = [undefined, undefined];
  while (t < 5400) {
    paso++;
    const atq = eqs[i], def = eqs[1 - i];
    if (paso % 40 === 0) for (const eq of eqs) for (const j of eq.campo) j.cans += cansPorMinuto(j, eq.energia.get(j.id) ?? 100) * (40 * 7.5) / 60;
    if (paso % 40 === 0) preguntarLesion(s, portador, t / 60, 0);
    const dt = 3 + rng.next() * 7;
    t += dt;
    if (i === 0) tPosesionA += dt;
    const col = clamp(Math.round(portador.anclaY * (COLUMNAS - 1)), 0, COLUMNAS - 1);
    // Los de la zona de la jugada: compañeros que pueden recibir (misma fila o la de delante o detrás) y rivales que defienden (fila espejo).
    const zp = zonaDelJugador(portador, true, bola);
    const zonaP: [number, number] = [fila, zp[1]];
    const receptores = atq.campo.filter((j) => {
      if (j === portador || j.expulsado) return false;
      const z = zonaDelJugador(j, true, bola);
      return Math.abs(z[0] - zonaP[0]) <= 1 && Math.abs(z[1] - zonaP[1]) <= 1;
    });
    const rivales = def.campo.filter((j) => {
      if (j.expulsado) return false;
      const z = zonaDelJugador(j, false, bola);
      // El rival defiende en su sistema de referencia (su fila 0 es su portería): la fila del balón vista por él es la contraria.
      return Math.abs(z[0] - (FILAS - 1 - zonaP[0])) <= 1 && Math.abs(z[1] - (COLUMNAS - 1 - zonaP[1])) <= 1;
    });
    const presion = rivales.length ? media(rivales.map((j) => (0.5 * j.v.marcaje + 0.5 * j.v.entrada) * rindeAhora(j))) : 15;
    const anticip = rivales.length ? media(rivales.map((j) => (0.6 * j.v.anticipacion + 0.4 * j.v.posicionamiento) * rindeAhora(j))) : 15;
    const r = rindeAhora(portador);
    // Qué hace el que tiene el balón.
    const enArea = fila >= FILAS - 1;
    const pTiro = enArea ? 0.08 + 0.07 * (portador.v.definicion / 60) : fila === FILAS - 2 ? 0.012 : 0;
    const u = rng.next();
    if (u < pTiro) {
      const xg0 = XG_ZONA[fila][zonaP[1]] * (0.5 + 0.5 * rel(portador.v.definicion * r, presion, 1) * 2) * (0.7 + 0.6 * rel(portador.v.tecnica, presion + 5));
      const gk = def.campo.find((j) => j.linea === 'GK');
      const valGk = gk ? (0.3 * gk.v.reflejos + 0.2 * gk.v.blocaje + 0.2 * gk.v.mano_a_mano + 0.3 * gk.v.alcance_aereo) * rindeAhora(gk) : 15;
      const xg = clamp(xg0, 0.01, 0.8);
      s.tiros[i]++;
      s.xg[i] += xg;
      portador.tiros++;
      portador.xg += xg;
      const hab = portador.v.definicion * r;
      if (rng.chance(0.22)) log({ t: Math.round(t), tipo: 'tiro_bloqueado', equipo: i, tirador: portador.id, xg });
      else if (rng.chance(0.28)) log({ t: Math.round(t), tipo: 'tiro_fuera', equipo: i, tirador: portador.id, xg });
      else {
        s.alPuerta[i]++;
        portador.alPuerta++;
        if (rng.chance(clamp((xg / 0.56) * 2 * rel(hab, valGk, 1.2), 0, 0.95))) {
          s.goles[i]++;
          portador.goles++;
          const asist = ultimoActivo[i] && ultimoActivo[i] !== portador ? ultimoActivo[i] : undefined;
          if (asist) asist.asist++;
          log({ t: Math.round(t), tipo: 'gol', equipo: i, tirador: portador.id, asistente: asist?.id, xg });
          // Saca el rival desde el centro.
          i = 1 - i;
          portador = eqs[i].campo.find((j) => j.puesto === 'CM') ?? eqs[i].campo[5];
          fila = 1; bola = 0.5;
          continue;
        }
        if (gk) gk.paradas++;
        log({ t: Math.round(t), tipo: 'parada', equipo: i, tirador: portador.id, portero: gk?.id, xg });
        if (rng.chance(0.25)) { s.corners[i]++; log({ t: Math.round(t), tipo: 'corner', equipo: i }); }
      }
      // Tras el tiro, el portero saca: el rival tiene el balón atrás.
      i = 1 - i;
      portador = eqs[i].campo.find((j) => j.linea === 'GK') ?? eqs[i].campo[0];
      fila = 0; bola = 0;
      continue;
    }
    // Falta del rival en el duelo.
    if (rng.chance(0.034)) {
      const inf = pesoSorteo(rng, rivales.length ? rivales : def.campo, (j) => 1.6 - j.v.entrada / (j.v.entrada + 40));
      inf.faltas++;
      s.faltas[1 - i]++;
      preguntarLesion(s, portador, t / 60, 1);
      let tipo = 'falta';
      if (rng.chance(PB.amarilla)) { inf.amarillas++; s.amarillas[1 - i]++; tipo = 'amarilla'; if (inf.amarillas >= 2) { inf.expulsado = true; s.rojas[1 - i]++; } }
      else if (rng.chance(PB.roja)) { inf.expulsado = true; s.rojas[1 - i]++; tipo = 'roja'; }
      log({ t: Math.round(t), tipo, equipo: 1 - i, infractor: inf.id, victima: portador.id });
      continue;
    }
    // Pase, regate o pase largo.
    const aPase = receptores.length ? (portador.linea === 'ATT' ? 0.5 : 0.78) : 0;
    const aRegate = portador.linea === 'DEF' ? 0.06 : 0.17;
    const accion = u < pTiro + aPase * (1 - pTiro) ? 'pase' : rng.chance(aRegate / (aRegate + 0.12)) ? 'regate' : 'largo';
    if (accion === 'pase') {
      const objetivo = pesoSorteo(rng, receptores, (j) => (0.4 + 0.6 * (zonaDelJugador(j, true, bola)[0] >= zonaP[0] ? 1.6 : 0.5)) * (0.6 + j.v.desmarque / 60));
      const ok = rng.chance(clamp(0.9 * 2 * rel((0.6 * portador.v.pase + 0.4 * portador.v.vision) * r, anticip * 0.9, 1) * 0.92 + 0.02, 0.05, 0.97));
      portador.pases++;
      s.pases[i]++;
      if (ok) {
        portador.pasesOk++;
        ultimoActivo[i] = portador;
        const z = zonaDelJugador(objetivo, true, bola);
        fila = clamp(z[0] + (rng.chance(0.18 + 0.12 * (portador.v.vision / 60)) ? 1 : 0), 0, FILAS - 1);
        bola = fila / (FILAS - 1);
        portador = objetivo;
      } else {
        const gana = rivales.length ? pesoSorteo(rng, rivales, (j) => j.v.anticipacion + 5) : def.campo[3];
        gana.entradas++;
        i = 1 - i;
        portador = gana;
        fila = clamp(FILAS - 1 - fila, 0, FILAS - 1);
        bola = fila / (FILAS - 1);
        ultimoActivo[i] = undefined;
      }
    } else if (accion === 'regate') {
      portador.regates++;
      if (rng.chance(clamp(2 * 0.5 * rel(portador.v.regate * r, presion, 1.1) * 1.15, 0.05, 0.9))) fila = clamp(fila + 1, 0, FILAS - 1);
      else {
        const gana = rivales.length ? pesoSorteo(rng, rivales, (j) => j.v.entrada + 5) : def.campo[3];
        gana.entradas++;
        i = 1 - i;
        portador = gana;
        fila = clamp(FILAS - 1 - fila, 0, FILAS - 1);
        ultimoActivo[i] = undefined;
      }
    } else {
      // Pase largo a la fila de ataque: sale peor.
      portador.pases++;
      s.pases[i]++;
      const objetivo = pesoSorteo(rng, atq.campo.filter((j) => j !== portador && !j.expulsado && j.linea !== 'GK'), (j) => (j.linea === 'ATT' ? 3 : 1) * j.v.desmarque);
      if (rng.chance(clamp(0.5 * 2 * rel(portador.v.pase * r, anticip + 8, 1), 0.05, 0.8))) {
        portador.pasesOk++;
        ultimoActivo[i] = portador;
        portador = objetivo;
        fila = clamp(fila + 2, 0, FILAS - 1);
      } else {
        const gana = pesoSorteo(rng, def.campo.filter((j) => !j.expulsado && j.linea !== 'ATT'), (j) => j.v.anticipacion + 5);
        i = 1 - i;
        portador = gana;
        fila = 1;
        ultimoActivo[i] = undefined;
      }
    }
    log({ t: Math.round(t), tipo: 'accion', equipo: i });
  }
  s.posesion = tPosesionA / t;
  return s;
}

// ------------------------------------------------------------------------------------------------------------- D: simulación espacial

const LARGO = 105, ANCHO = 68;
function motorD(a: Eq, b: Eq, rng: Rng, dt: number): Salida {
  const s = vacia();
  const eqs = [a, b] as const;
  // Posiciones en metros; el equipo 0 ataca hacia x = LARGO y el 1 hacia x = 0.
  const todos: { j: Jug; eq: 0 | 1 }[] = [];
  for (const [i, eq] of eqs.entries()) for (const j of eq.campo) todos.push({ j, eq: i as 0 | 1 });
  const dir = (eq: 0 | 1): number => (eq === 0 ? 1 : -1);
  const pos = (e: { j: Jug; eq: 0 | 1 }): void => {
    e.j.x = (e.eq === 0 ? e.j.anclaX : 1 - e.j.anclaX) * LARGO;
    e.j.y = e.j.anclaY * ANCHO;
  };
  todos.forEach(pos);
  const bola = { x: LARGO / 2, y: ANCHO / 2, vx: 0, vy: 0, dueno: undefined as undefined | { j: Jug; eq: 0 | 1 }, enVuelo: false, destino: undefined as undefined | { j: Jug; eq: 0 | 1 }, tiro: false, xg: 0 };
  const log = (e: Record<string, unknown>): void => {
    s.registro.push(e);
    s.eventos++;
  };
  bola.dueno = todos.find((e) => e.eq === 0 && e.j.puesto === 'CM');
  let tPos = 0, tTotal = 0;
  const velMax = (j: Jug): number => (4.5 + (j.vel / 100) * 4.5) * rindeAhora(j); // m/s (de 4,5 a 9)
  const pasos = Math.round(5400 / dt);
  let ultimo: { j: Jug; eq: 0 | 1 } | undefined;
  let decide = 0;
  for (let n = 0; n < pasos; n++) {
    const tiempo = n * dt;
    if (n % Math.round(60 / dt) === 0) for (const e of todos) { e.j.cans += cansPorMinuto(e.j, eqs[e.eq].energia.get(e.j.id) ?? 100); if (e.j.linea !== 'GK') preguntarLesion(s, e.j, tiempo / 60, 0); }
    const eqBola: 0 | 1 | undefined = bola.dueno?.eq;
    if (eqBola !== undefined) { tTotal += dt; if (eqBola === 0) tPos += dt; }
    // Mover a todos hacia su sitio: ancla desplazada hacia el balón y según quién ataca; el más cercano al balón sin dueño y el más cercano de los que defienden presionan.
    let masCercano: { j: Jug; eq: 0 | 1 } | undefined;
    let dMin = Infinity;
    for (const e of todos) {
      if (e.j.expulsado) continue;
      const d = Math.hypot(e.j.x - bola.x, e.j.y - bola.y);
      if (e.eq !== eqBola && d < dMin && e.j.linea !== 'GK') { dMin = d; masCercano = e; }
    }
    for (const e of todos) {
      const j = e.j;
      if (j === bola.dueno?.j) continue;
      const ataca = e.eq === eqBola;
      let tx = (e.eq === 0 ? j.anclaX : 1 - j.anclaX) * LARGO + (bola.x - LARGO / 2) * (j.linea === 'GK' ? 0.05 : 0.35) + dir(e.eq) * (ataca ? 10 : -6);
      let ty = j.anclaY * ANCHO + (bola.y - ANCHO / 2) * 0.35;
      if (e === masCercano || (bola.dueno === undefined && !bola.enVuelo && Math.hypot(j.x - bola.x, j.y - bola.y) < 12)) { tx = bola.x; ty = bola.y; }
      const dx = tx - j.x, dy = ty - j.y;
      const d = Math.hypot(dx, dy);
      const paso = Math.min(d, velMax(j) * dt * (e === masCercano ? 1 : 0.6));
      if (d > 0.01) { j.x += (dx / d) * paso; j.y += (dy / d) * paso; }
    }
    if (bola.dueno) {
      const d = bola.dueno;
      bola.x = d.j.x; bola.y = d.j.y;
      // Conducir hacia la portería rival.
      const gx = d.eq === 0 ? LARGO : 0;
      const dx = gx - d.j.x, dy = ANCHO / 2 - d.j.y;
      const dd = Math.hypot(dx, dy) || 1;
      const p = Math.min(dd, velMax(d.j) * 0.75 * dt);
      d.j.x += (dx / dd) * p; d.j.y += (dy / dd) * p;
      // Un rival al alcance disputa el balón (entrada).
      const cerca = todos.filter((e) => e.eq !== d.eq && !e.j.expulsado && Math.hypot(e.j.x - d.j.x, e.j.y - d.j.y) < 1.6);
      for (const r of cerca) {
        if (rng.chance(clamp(0.12 * dt * 2 * rel((0.5 * r.j.v.entrada + 0.5 * r.j.v.marcaje) * rindeAhora(r.j), d.j.v.regate * rindeAhora(d.j) + 5, 1), 0, 0.6))) {
          if (rng.chance(0.55)) { r.j.faltas++; s.faltas[r.eq]++; preguntarLesion(s, d.j, tiempo / 60, 1); if (rng.chance(PB.amarilla)) { r.j.amarillas++; s.amarillas[r.eq]++; } log({ t: Math.round(tiempo), tipo: 'falta', equipo: r.eq }); }
          else { r.j.entradas++; bola.dueno = r; ultimo = undefined; log({ t: Math.round(tiempo), tipo: 'robo', equipo: r.eq, jugador: r.j.id }); }
          break;
        }
      }
      decide -= dt;
      if (bola.dueno === d && decide <= 0) {
        decide = 1.2 + rng.next() * 2;
        const alArea = Math.abs(gx - d.j.x);
        const tira = (alArea < 20 && rng.chance(0.045 + 0.03 * (d.j.v.definicion / 60))) || (alArea < 30 && rng.chance(0.006));
        if (tira) {
          const gk = eqs[1 - d.eq].campo.find((j) => j.linea === 'GK')!;
          const defensores = todos.filter((e) => e.eq !== d.eq && Math.hypot(e.j.x - d.j.x, e.j.y - d.j.y) < 4).length;
          const angulo = Math.atan2(7.32, Math.max(3, alArea));
          const xg = clamp(angulo * 0.15 * Math.pow(0.8, defensores) * (0.7 + 0.6 * rel(d.j.v.definicion * rindeAhora(d.j), 30, 1) * 2) * 1.1, 0.01, 0.8);
          s.tiros[d.eq]++; s.xg[d.eq] += xg; d.j.tiros++; d.j.xg += xg;
          if (rng.chance(0.2) || rng.chance(0.28)) log({ t: Math.round(tiempo), tipo: 'tiro_fuera_o_bloqueado', equipo: d.eq, tirador: d.j.id, xg });
          else {
            s.alPuerta[d.eq]++;
            if (rng.chance(clamp((xg / 0.56) * 2 * rel(d.j.v.definicion * rindeAhora(d.j), (0.3 * gk.v.reflejos + 0.2 * gk.v.blocaje + 0.2 * gk.v.mano_a_mano + 0.3 * gk.v.alcance_aereo) * rindeAhora(gk), 1.2), 0, 0.95))) {
              s.goles[d.eq]++; d.j.goles++;
              if (ultimo && ultimo.j !== d.j && ultimo.eq === d.eq) ultimo.j.asist++;
              log({ t: Math.round(tiempo), tipo: 'gol', equipo: d.eq, tirador: d.j.id, xg });
              todos.forEach(pos);
              bola.dueno = todos.find((e) => e.eq !== d.eq && e.j.puesto === 'CM'); bola.x = LARGO / 2; bola.y = ANCHO / 2; ultimo = undefined;
              continue;
            }
            gk.paradas++;
            log({ t: Math.round(tiempo), tipo: 'parada', equipo: d.eq, tirador: d.j.id, xg });
          }
          bola.dueno = todos.find((e) => e.eq !== d.eq && e.j.linea === 'GK'); ultimo = undefined;
          continue;
        }
        // Pase: a un compañero mejor situado (hacia delante) con una línea libre de rivales.
        const cand = todos.filter((e) => e.eq === d.eq && e.j !== d.j && !e.j.expulsado && Math.hypot(e.j.x - d.j.x, e.j.y - d.j.y) < 38);
        let mejor: typeof cand[number] | undefined;
        let mejorV = -Infinity;
        for (const c of cand) {
          const avance = (c.j.x - d.j.x) * dir(d.eq);
          // Rival más cercano a la línea del pase.
          let libre = Infinity;
          const lx = c.j.x - d.j.x, ly = c.j.y - d.j.y, l2 = lx * lx + ly * ly || 1;
          for (const r of todos) {
            if (r.eq === d.eq) continue;
            const tt = clamp(((r.j.x - d.j.x) * lx + (r.j.y - d.j.y) * ly) / l2, 0, 1);
            libre = Math.min(libre, Math.hypot(d.j.x + lx * tt - r.j.x, d.j.y + ly * tt - r.j.y));
          }
          const v = avance * 0.08 + Math.min(libre, 8) * 0.4 + c.j.v.desmarque * 0.01 + rng.next();
          if (v > mejorV) { mejorV = v; mejor = c; }
        }
        if (mejor) {
          const dist = Math.hypot(mejor.j.x - d.j.x, mejor.j.y - d.j.y) || 1;
          d.j.pases++; s.pases[d.eq]++;
          ultimo = d;
          bola.dueno = undefined; bola.enVuelo = true; bola.destino = mejor;
          const v = 16;
          bola.vx = ((mejor.j.x - d.j.x) / dist) * v; bola.vy = ((mejor.j.y - d.j.y) / dist) * v;
          (bola as { precision?: number }).precision = clamp(2 * 0.5 * rel((0.6 * d.j.v.pase + 0.4 * d.j.v.vision) * rindeAhora(d.j), 25, 1) * 1.1 - dist * 0.004, 0.2, 0.97);
        }
      }
    } else if (bola.enVuelo && bola.destino) {
      const dest = bola.destino;
      // El balón avanza (como mucho hasta el destino) y un rival cerca del tramo recorrido puede interceptar.
      const ex = dest.j.x - bola.x, ey = dest.j.y - bola.y, rest = Math.hypot(ex, ey) || 1e-6, v = Math.hypot(bola.vx, bola.vy), tramo = v * dt;
      const nx = rest <= tramo ? dest.j.x : bola.x + (ex / rest) * tramo, ny = rest <= tramo ? dest.j.y : bola.y + (ey / rest) * tramo;
      const sx = nx - bola.x, sy = ny - bola.y, s2 = sx * sx + sy * sy || 1;
      for (const r of todos) {
        if (r.eq === dest.eq || r.j.expulsado) continue;
        const tt = clamp(((r.j.x - bola.x) * sx + (r.j.y - bola.y) * sy) / s2, 0, 1);
        if (Math.hypot(bola.x + sx * tt - r.j.x, bola.y + sy * tt - r.j.y) < 2.2 && rng.chance(clamp(0.5 * rel(r.j.v.anticipacion * rindeAhora(r.j), 30, 1) + 0.1, 0, 0.7))) {
          r.j.entradas++; bola.dueno = r; bola.enVuelo = false; bola.destino = undefined; bola.x = r.j.x; bola.y = r.j.y; log({ t: Math.round(tiempo), tipo: 'intercepta', equipo: r.eq, jugador: r.j.id }); break;
        }
      }
      if (bola.enVuelo) { bola.x = nx; bola.y = ny; }
      if (bola.enVuelo && rest <= tramo) {
        bola.enVuelo = false; bola.destino = undefined;
        if (rng.chance((bola as { precision?: number }).precision ?? 0.8)) { bola.dueno = dest; if (ultimo) ultimo.j.pasesOk++; }
        else { const r = todos.filter((e) => e.eq !== dest.eq).sort((p, q) => Math.hypot(p.j.x - bola.x, p.j.y - bola.y) - Math.hypot(q.j.x - bola.x, q.j.y - bola.y))[0]; bola.dueno = r; ultimo = undefined; log({ t: Math.round(tiempo), tipo: 'pase_fallado', equipo: 1 - dest.eq }); }
      }
      // Fuera del campo: saca el rival.
      if (bola.x < 0 || bola.x > LARGO || bola.y < 0 || bola.y > ANCHO) { bola.enVuelo = false; bola.destino = undefined; bola.x = clamp(bola.x, 0, LARGO); bola.y = clamp(bola.y, 0, ANCHO); bola.dueno = todos.filter((e) => e.eq !== dest.eq).sort((p, q) => Math.hypot(p.j.x - bola.x, p.j.y - bola.y) - Math.hypot(q.j.x - bola.x, q.j.y - bola.y))[0]; ultimo = undefined; }
    } else if (!bola.dueno) {
      bola.dueno = masCercano ?? todos[0];
    }
  }
  s.posesion = tPos / Math.max(1, tTotal);
  return s;
}

// ------------------------------------------------------------------------------------------------------------- A: el motor de hoy, con tramos más finos

function motorA(local: EquipoDePartido, visitante: EquipoDePartido, cat: string, id: string, tramos: number): Salida {
  const P = PARAMETROS_DE_PARTIDO;
  const base = { tramos: P.tramos, minutosPorTramo: P.minutosPorTramo, ataquesPorTramo: P.ataquesPorTramo, balonParadoPorTramo: P.balonParadoPorTramo, cansancioPorTramo: P.cansancioPorTramo };
  const k = tramos / 6;
  Object.assign(P, { tramos, minutosPorTramo: 90 / tramos, ataquesPorTramo: Math.round(6 / k), balonParadoPorTramo: 1.2 / k, cansancioPorTramo: 7.5 / k });
  const corte = (m: number): number => Math.round((m / 15) * k);
  const r = jugarPartido(local, visitante, { id, semilla: 31, categoria: cat, cambios: { maximo: 5, despuesDeTramos: [corte(15), corte(45), corte(60)] } });
  Object.assign(P, base);
  const s = vacia();
  s.goles = r.goles;
  s.tiros = r.tiros;
  s.posesion = media(r.porTramo.map((x) => x.posesion[0]));
  s.eventos = r.cronica.length;
  s.registro = r.cronica;
  return s;
}

// ------------------------------------------------------------------------------------------------------------- el banco

interface Par { a: EquipoDePartido; b: EquipoDePartido; cat: string }
function paresDeLaCiudad(n: number): Par[] {
  const g = nuevaPartida({ seed: 31, ...(GRANDE ? { pais: PAIS_CIUDAD_GRANDE.id } : {}), deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const clubes = [...new Set(s.npcs.filter((n) => n.deporte === 'futbol' && n.equipo).map((x) => `${x.equipo}`))];
  const porCat: Record<string, EquipoDePartido[]> = {};
  for (const cat of ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil']) {
    porCat[cat] = [];
    for (const club of clubes) for (const letra of ['A', 'B']) {
      const pl = plantillaDeUnEquipo(s.npcs, [pob], 'futbol', club, cat, letra, 0);
      if (pl.length < 14) continue;
      const c = convocarYAlinear(pl);
      if (c.titulares.length < 11) continue;
      porCat[cat].push(equipoDePartido(`${club}|${letra}`, `${club} ${letra}`, pl, c));
    }
  }
  const rng = rngEstable('prototipo', 1, 'pares');
  const res: Par[] = [];
  const cats = Object.keys(porCat).filter((c) => porCat[c].length >= 2);
  for (let i = 0; i < n; i++) {
    const cat = cats[i % cats.length];
    const xs = porCat[cat];
    const x = Math.floor(rng.next() * xs.length);
    let y = Math.floor(rng.next() * xs.length);
    if (y === x) y = (y + 1) % xs.length;
    res.push({ a: xs[x], b: xs[y], cat });
  }
  return res;
}

type Motor = { nombre: string; correr: (p: Par, eqA: Eq, eqB: Eq, i: number) => Salida };
const MOTORES: Motor[] = [
  { nombre: 'Hoy (6 tramos de 15 min)', correr: (p, _a, _b, i) => motorA(p.a, p.b, p.cat, `h${i}`, 6) },
  { nombre: 'A1 · 18 tramos de 5 min', correr: (p, _a, _b, i) => motorA(p.a, p.b, p.cat, `a${i}`, 18) },
  { nombre: 'A2 · 30 tramos de 3 min', correr: (p, _a, _b, i) => motorA(p.a, p.b, p.cat, `a${i}`, 30) },
  { nombre: 'B · posesiones y xG', correr: (_p, a, b, i) => motorB(a, b, rngEstable('partido', 31, `b${i}`)) },
  { nombre: 'C · jugadas por zonas', correr: (_p, a, b, i) => motorC(a, b, rngEstable('partido', 31, `c${i}`)) },
  { nombre: 'D · espacial (paso de 1 s)', correr: (_p, a, b, i) => motorD(a, b, rngEstable('partido', 31, `d${i}`), 1) },
  { nombre: 'D · espacial (paso de 0,5 s)', correr: (_p, a, b, i) => motorD(a, b, rngEstable('partido', 31, `d${i}`), 0.5) },
];

const pares = paresDeLaCiudad(N);
console.log(`Prototipo de motores de partido (${GRANDE ? 'ciudad grande' : 'ciudad de prueba'}, ${N} partidos por motor entre equipos reales de la zona; 4 CPU sin paralelizar, una sola hebra)\n`);

// Coste de preparar a los jugadores (común a B, C y D: 24 habilidades por jugador y partido) frente a lo que prepara hoy el motor.
const tPrep = performance.now();
const preparados = pares.map((p) => [prepararEq(p.a, POTENCIADOR_POR_CATEGORIA[p.cat] ?? 1), prepararEq(p.b, POTENCIADOR_POR_CATEGORIA[p.cat] ?? 1)] as const);
const msPrep = (performance.now() - tPrep) / N;
console.log(`Preparar los 32 jugadores de un partido (24 habilidades cada uno, \`valorEnPartido\`): ${f(msPrep, 2)} ms por partido (los motores B, C y D lo necesitan; el de hoy ya lo hace dentro de su coste).\n`);

console.log('| Motor | ms por partido (sin preparar) | Goles | Tiros | Al puerta | xG | Posesión (σ) | Faltas | Amarillas | Rojas | Córners | Pases | Sucesos en el registro | KB del registro | Consultas de lesión |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const m of MOTORES) {
  // Calentar y medir.
  for (let i = 0; i < 5; i++) m.correr(pares[i], prepararEq(pares[i].a, 1), prepararEq(pares[i].b, 1), 1000 + i);
  const salidas: Salida[] = [];
  let ms = 0;
  for (let i = 0; i < N; i++) {
    // Los jugadores se vuelven a preparar en cada partido (cansancio y estadísticas empiezan en 0): se descuenta ese coste de los que lo necesitan.
    const [a, b] = m.nombre.startsWith('Hoy') || m.nombre.startsWith('A') ? [undefined, undefined] : [prepararEq(pares[i].a, POTENCIADOR_POR_CATEGORIA[pares[i].cat] ?? 1), prepararEq(pares[i].b, POTENCIADOR_POR_CATEGORIA[pares[i].cat] ?? 1)];
    const t0 = performance.now();
    const s = m.correr(pares[i], a as Eq, b as Eq, i);
    ms += performance.now() - t0;
    salidas.push(s);
  }
  const por = (g: (s: Salida) => number): number => media(salidas.map(g));
  const par = (g: (s: Salida) => [number, number]): number => por((s) => g(s)[0] + g(s)[1]);
  const kb = media(salidas.map((s) => JSON.stringify(s.registro).length)) / 1024;
  const sd = Math.sqrt(media(salidas.map((s) => (s.posesion - por((x) => x.posesion)) ** 2)));
  console.log(`| ${m.nombre} | ${f(ms / N, 2)} | ${f(par((s) => s.goles), 2)} | ${f(par((s) => s.tiros), 1)} | ${f(par((s) => s.alPuerta), 1)} | ${f(par((s) => s.xg), 2)} | ${f(100 * por((s) => s.posesion), 0)} % (${f(100 * sd, 0)}) | ${f(par((s) => s.faltas), 1)} | ${f(par((s) => s.amarillas), 1)} | ${f(par((s) => s.rojas), 2)} | ${f(par((s) => s.corners), 1)} | ${f(par((s) => s.pases), 0)} | ${f(por((s) => s.eventos), 0)} | ${f(kb, 1)} | ${f(por((s) => s.consultasDeLesion), 0)} |`);
}

// ------------------------------------------------------------------------------------------------------------- ¿el mismo resultado en distribución? (equipos sintéticos con un ratio de fuerza)
const lector = (valor: number, cap = valor): LectorDePersona => ({ stat: (id) => (id.startsWith('gen.') ? cap : valor), norm: () => 0.5 });
const PUESTOS_T = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CDM', 'LW', 'RW', 'ST'];
const PUESTOS_S = ['GK', 'CB', 'CM', 'LW', 'ST'];
const sint = (id: string, valor: number): EquipoDePartido => ({ id, nombre: id, jugadores: [...PUESTOS_T.map((p) => [p, true] as const), ...PUESTOS_S.map((p) => [p, false] as const)].map(([puesto, titular], i): JugadorDePartido => ({ id: `${id}_${i}`, nombre: `${id}${i}`, puesto, titular, lector: lector(valor) })) });
console.log('\nA más diferencia de nivel entre equipos (el de casa vale ×r; infantil, nivel 25): % de victorias del mejor / empates / goles por partido / diferencia media de goles. 600 partidos por casilla.\n');
console.log('| Motor | r = 1 | r = 1,1 | r = 1,25 | r = 1,5 |');
console.log('|---|---|---|---|---|');
const M2 = MOTORES.filter((m) => ['Hoy', 'B', 'C'].some((p) => m.nombre.startsWith(p)));
for (const m of M2) {
  const celdas: string[] = [];
  for (const r of [1, 1.1, 1.25, 1.5]) {
    const a = sint('a', 25 * r), b = sint('b', 25);
    const p: Par = { a, b, cat: 'infantil' };
    let v = 0, e = 0, g = 0, d = 0;
    const n = 600;
    for (let i = 0; i < n; i++) {
      const s = m.correr(p, prepararEq(a, 1.6), prepararEq(b, 1.6), 5000 + i);
      if (s.goles[0] > s.goles[1]) v++;
      else if (s.goles[0] === s.goles[1]) e++;
      g += s.goles[0] + s.goles[1];
      d += Math.abs(s.goles[0] - s.goles[1]);
    }
    celdas.push(`${f((100 * v) / n, 0)} % / ${f((100 * e) / n, 0)} % / ${f(g / n, 2)} / ${f(d / n, 2)}`);
  }
  console.log(`| ${m.nombre} | ${celdas.join(' | ')} |`);
}

// ------------------------------------------------------------------------------------------------------------- dos niveles: ¿puede un modelo grueso dar lo mismo EN DISTRIBUCIÓN que el detallado?
// El grueso es un Poisson por equipo cuyos goles esperados salen de la comparación de fuerzas (λ_a = L·r^a, λ_b = L·r^−b), ajustado a lo que da el detallado (B) y comprobado con OTRA tanda de partidos con una prueba chi² del
// reparto de goles totales y de diferencia. Es la forma del test que exigiría la visión («calcular de otra forma solo si un test demuestra que da lo mismo»); aquí con la fuerza como un solo número, que es lo más fácil.
{
  const RS = [1, 1.1, 1.25, 1.5];
  const detallado = (r: number, n: number, ini: number): [number, number][] => {
    const a = sint('a', 25 * r), b = sint('b', 25);
    const p: Par = { a, b, cat: 'infantil' };
    return Array.from({ length: n }, (_, i) => MOTORES[3].correr(p, prepararEq(a, 1.6), prepararEq(b, 1.6), ini + i).goles);
  };
  const ajuste = RS.map((r) => detallado(r, 1500, 100000));
  const medias = ajuste.map((x) => [media(x.map((g) => g[0])), media(x.map((g) => g[1]))]);
  const rngF = rngEstable('prototipo', 2, 'ajuste');
  let mejor = { L: 1, a: 1, b: 1, e: Infinity };
  for (let it = 0; it < 6000; it++) {
    const c = { L: 0.3 + rngF.next() * 2, a: rngF.next() * 4, b: rngF.next() * 8 };
    const e = RS.reduce((t, r, k) => t + (c.L * r ** c.a - medias[k][0]) ** 2 + (c.L * r ** -c.b - medias[k][1]) ** 2, 0);
    if (e < mejor.e) mejor = { ...c, e };
  }
  const poisson = (l: number, rng: Rng): number => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rng.next(); } while (p > L); return k - 1; };
  const rngP = rngEstable('prototipo', 3, 'poisson');
  const chi = (xs: number[], ys: number[], cortes: number[]): { x2: number; df: number } => {
    const cubo = (v: number): number => cortes.findIndex((c) => v <= c);
    const ca = new Array(cortes.length).fill(0), cb = new Array(cortes.length).fill(0);
    for (const v of xs) ca[cubo(v)]++;
    for (const v of ys) cb[cubo(v)]++;
    let x2 = 0, df = -1;
    for (let k = 0; k < cortes.length; k++) if (ca[k] + cb[k] > 0) { x2 += (ca[k] - cb[k]) ** 2 / (ca[k] + cb[k]); df++; }
    return { x2, df };
  };
  const tabla = (titulo: string, lambda: (r: number, k: number) => [number, number]): void => {
    console.log(`\n${titulo}\n`);
    console.log('| r | Goles totales: media detallado / grueso | χ² de los goles totales (cubos 0…7+) | χ² de la diferencia (−4…+4) | Victoria del mejor: detallado / grueso | Empate: detallado / grueso | Coste del grueso |');
    console.log('|---|---|---|---|---|---|---|');
    RS.forEach((r, k) => {
      const det = detallado(r, 1500, 200000);
      const [la, lb] = lambda(r, k);
      const t0 = performance.now();
      const gru = Array.from({ length: 1500 }, () => [poisson(la, rngP), poisson(lb, rngP)] as [number, number]);
      const msG = (performance.now() - t0) / 1500;
      const tot = chi(det.map((g) => g[0] + g[1]), gru.map((g) => g[0] + g[1]), [0, 1, 2, 3, 4, 5, 6, 99]);
      const dif = chi(det.map((g) => g[0] - g[1]), gru.map((g) => g[0] - g[1]), [-4, -3, -2, -1, 0, 1, 2, 3, 99]);
      const w = (x: [number, number][]): string => `${f((100 * x.filter((g) => g[0] > g[1]).length) / x.length, 0)} %`;
      const e = (x: [number, number][]): string => `${f((100 * x.filter((g) => g[0] === g[1]).length) / x.length, 0)} %`;
      console.log(`| ${r} | ${f(media(det.map((g) => g[0] + g[1])), 2)} / ${f(media(gru.map((g) => g[0] + g[1])), 2)} | ${f(tot.x2, 1)} (${tot.df} gl) | ${f(dif.x2, 1)} (${dif.df} gl) | ${w(det)} / ${w(gru)} | ${e(det)} / ${e(gru)} | ${f(msG * 1000, 1)} µs |`);
    });
  };
  tabla(`Nivel grueso, versión 1: Poisson por equipo con tres parámetros (λ_a = ${f(mejor.L, 2)}·r^${f(mejor.a, 2)}, λ_b = ${f(mejor.L, 2)}·r^−${f(mejor.b, 2)}) ajustado al motor B. Prueba chi² con otra tanda de 1.500 partidos por casilla (valor crítico al 95 %: ≈ 14,1 con 7 gl y 15,5 con 8 gl):`, (r) => [mejor.L * r ** mejor.a, mejor.L * r ** -mejor.b]);
  tabla('Nivel grueso, versión 2: Poisson con los goles esperados exactos de cada casilla (el mejor caso posible para un Poisson), para ver si lo que falla es la media o la forma:', (_r, k) => [medias[k][0], medias[k][1]]);
}
void cansancioDelTramo;
