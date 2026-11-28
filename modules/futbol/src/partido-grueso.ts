/**
 * **EL NIVEL GRUESO DE LOS PARTIDOS** (nivel 3 de `DECISIONES.md`, 24/11/2026; `docs/relevo/partidos-reales.md` §3): el partido de las ligas lejanas, que serán miles por semana. **Las mismas reglas, calculadas de otra forma:**
 * en vez de unas 215 posesiones minuto a minuto, un modelo de Poisson por equipo cuyos goles y tiros esperados salen de lo que valen los dos equipos (las mismas cuatro zonas del motor, con los mismos jugadores reales y su
 * estado del día), y después se reparten entre los jugadores con los mismos pesos que usa el motor (quién tira, quién asiste, quién comete falta, quién ve tarjeta, quién pasa). El resultado es el mismo `ResultadoDePartido`:
 * los jugadores siguen siendo personas con sus goles, tiros, tarjetas, pases, minutos y nota. Lo único que no hay es el relato jugada a jugada: el registro solo trae los goles y las tarjetas.
 *
 * **Solo vale si un test demuestra que da lo mismo en distribución** (la visión: «calcular de otra forma solo si un test demuestra que da lo mismo»): `partido-grueso.test.ts` lo compara con el motor de posesiones y ocasiones
 * (el nivel 2) con una prueba chi² del marcador, la diferencia y los goles por línea, en una malla de equipos que no es la que sirvió para ajustarlo. Los coeficientes de `PARAMETROS_DEL_NIVEL_GRUESO` salen de
 * `tools/partidos-grueso-ajuste.ts` (regresión de Poisson sobre partidos del motor); si se toca el motor, se vuelve a ajustar y a pasar el test.
 */
import { rngEstable, type Rng } from '@ds/contracts';
import { PARAMETROS_DE_PARTIDO, PESO_DE_PASE, PESO_DE_REMATADOR_EN_CORNER, PESO_DE_TIRADOR, PESO_DE_FALTA, GRUPO_DE_PUESTO, armar, crearPartido, fuerzasDe, mejorQue, rendimientoPorCansancio, resultadoDelPartido, type EquipoDePartido, type Fuerzas, type Jug, type OpcionesDePartido, type ResultadoDePartido } from './partido';
import type { SucesoDePartido } from './registro';

/**
 * Los coeficientes del modelo (de la regresión de Poisson sobre el motor: `tools/partidos-grueso-ajuste.ts`). Con `x = caracteristicas(a, b, casa)` (17 números):
 * `goles_a ~ Poisson(exp(goles · x))` y `tiros_a ~ Poisson(exp(tiros · x))`; `poder = 0,4 · creación + 0,6 · ataque`.
 */
export const PARAMETROS_DEL_NIVEL_GRUESO = {
  goles: [3.6368, 0.889, 1.026, 0.7136, 0.8979, 0.5295, -1.1433, 0.0749, 1.2686, 0.1206, -0.8368, 0.0746, 0.5921, 0.0045, -0.4959, -0.0753, 0.1312] as readonly number[],
  tiros: [5.0886, 1.9923, 0.9683, 0.2704, 0.7514, -0.135, 1.0315, 0.089, -0.5821, -0.0872, -0.0441, 0.0227, 0.4731, 0.001, -0.4367, -0.0396, 0.0305] as readonly number[],
  /** Cuánto se separan goles y tiros de un Poisson puro (con las características que siguen la forma del motor, ninguno: χ² de Pearson / gl de 0,97 y 1,03): la media se multiplica por `exp(σ·z − σ²/2)` antes de sortear . */
  dispersion: { goles: 0, tiros: 0 },
  /** Lo que no depende de lo que valen los equipos: expulsiones directas y pases completados; y los córners, que salen de los tiros (de lo que da el motor). */
  cornersPorTiro: 0.33,
  /** Cuánto pesa el efecto del marcador en el grueso, en veces el del motor (`ritmoDelMarcador`): se ajusta para que la diferencia de goles se reparta como en el motor. */
  marcador: 1,
  rojasDirectas: 0.07,
  precisionDePase: 0.81,
  /** Qué parte de los tiros salen de un balón parado (córners y faltas), donde pesan también los centrales. */
  parteDeBalonParado: 0.3,
};

/**
 * Las características de un equipo frente a otro, con la forma del propio motor (todo en logaritmos, así que cada coeficiente es «cuánto cuenta» ese paso): llegar al último tercio (`poder` frente a la defensa rival, por la parte de
 * dificultad fija), la calidad de la ocasión (ataque frente a defensa), la posesión (la creación de uno frente a la del otro, al cuadrado) y el tiro frente al portero; y si juega en casa.
 */
export function caracteristicas(a: Fuerzas, b: Fuerzas, local: boolean): number[] {
  const poder = 0.4 * a.creacion + 0.6 * a.ataque;
  const ln = (x: number): number => Math.log(Math.max(x, 1e-9));
  const f = [ln(poder / (poder + b.defensa)), ln(poder / (poder + PARAMETROS_DE_PARTIDO.dificultadDelAvance)), ln(a.ataque / (a.ataque + b.defensa)), ln(mejorQue(a.creacion, b.creacion, 2)), ln(a.ataque / (a.ataque + b.porteria))];
  // Los cinco logaritmos, sus cuadrados (el motor tiene topes y la forma logística no es exactamente una recta en logaritmos), la ventaja de jugar en casa y los cinco logaritmos otra vez solo para el local (la ventaja de casa no pesa igual en todo).
  return [1, ...f, ...f.map((x) => x * x), local ? 1 : 0, ...f.map((x) => (local ? x : 0))];
}

const producto = (b: readonly number[], x: readonly number[]): number => b.reduce((t, c, i) => t + c * x[i], 0);

/** Los goles y tiros esperados de un equipo frente a otro (con el modelo ajustado). */
export const esperadosDelNivelGrueso = (a: Fuerzas, b: Fuerzas, local: boolean): { goles: number; tiros: number } => {
  const x = caracteristicas(a, b, local);
  return { goles: Math.exp(producto(PARAMETROS_DEL_NIVEL_GRUESO.goles, x)), tiros: Math.exp(producto(PARAMETROS_DEL_NIVEL_GRUESO.tiros, x)) };
};

/** Lo que valen los dos equipos al empezar (en plena forma): sus cuatro zonas, con el estado del día y el potenciador de la categoría. */
export function fuerzasAlEmpezar(local: EquipoDePartido, visitante: EquipoDePartido, categoria: string): [Fuerzas, Fuerzas] {
  const estado = crearPartido(local, visitante, { id: 'fuerzas', semilla: 0, categoria });
  const lados = armar(estado, [local, visitante]);
  for (const l of lados) for (const x of l.campo) x.rm = rendimientoPorCansancio(0, x.j.intensidad ?? l.intensidad);
  return [fuerzasDe(lados[0], PARAMETROS_DE_PARTIDO.ventajaDeCasa), fuerzasDe(lados[1], 0)];
}

/**
 * El efecto del marcador (el que pierde arriesga, el que gana se guarda) ya está dentro de los goles esperados que da el ajuste (salen del motor, que lo tiene). Al jugarlo bloque a bloque habría que contarlo dos veces:
 * esto calcula, con el mismo proceso en forma determinista (los goles esperados avanzan bloque a bloque), cuánto hay que escalar la intensidad de cada equipo para que, **con** el efecto, el total sea el esperado.
 */
export function normalizarElMarcador(esperadosA: number, esperadosB: number, bloques: number): [number, number] {
  const P = PARAMETROS_DE_PARTIDO;
  const G = PARAMETROS_DEL_NIVEL_GRUESO;
  const total = P.tramos * P.minutosPorTramo;
  let kA = 1;
  let kB = 1;
  for (let it = 0; it < 5; it++) {
    let gA = 0;
    let gB = 0;
    for (let b = 0; b < bloques; b++) {
      const apertura = 1 + P.apertura * ((b + 0.5) / bloques - 0.5);
      const dif = Math.max(-2, Math.min(2, gA - gB));
      gA += (kA * esperadosA * apertura * (1 - P.ritmoDelMarcador * G.marcador * dif)) / bloques;
      gB += (kB * esperadosB * apertura * (1 + P.ritmoDelMarcador * G.marcador * dif)) / bloques;
    }
    void total;
    kA *= esperadosA / Math.max(gA, 1e-9);
    kB *= esperadosB / Math.max(gB, 1e-9);
  }
  return [kA, kB];
}

const poisson = (rng: Rng, media: number): number => {
  // Con medias grandes (los pases), la normal con su misma media y varianza; con las pequeñas, el método de Knuth.
  if (media > 25) return Math.max(0, Math.round(media + Math.sqrt(media) * rng.normal()));
  const L = Math.exp(-media);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L);
  return k - 1;
};
const binomial = (rng: Rng, n: number, p: number): number => {
  let k = 0;
  for (let i = 0; i < n; i++) if (rng.chance(p)) k++;
  return k;
};
/** Reparte `n` sucesos entre los jugadores con pesos (la probabilidad de cada uno es proporcional a su peso): devuelve el jugador de cada suceso. */
const repartir = (rng: Rng, n: number, jugadores: readonly Jug[], peso: (x: Jug) => number): Jug[] => {
  const acum: number[] = [];
  let t = 0;
  for (const x of jugadores) acum.push((t += Math.max(0, peso(x))));
  const res: Jug[] = [];
  for (let k = 0; k < n && t > 0; k++) {
    const r = rng.next() * t;
    res.push(jugadores[Math.max(0, acum.findIndex((a) => r < a))]);
  }
  return res;
};

/**
 * Juega un partido en el nivel grueso. Mismo formato que el motor (`jugarPartido`); el azar es el suyo (`rngEstable('partido', 'grueso', semilla, id)`), reproducible. Los titulares juegan los 90 minutos salvo los que
 * salen por un cambio (hasta los cinco de la regla, los menos resistentes, después del descanso o a la hora) o por expulsión; los suplentes entran en su puesto.
 */
export function jugarPartidoGrueso(local: EquipoDePartido, visitante: EquipoDePartido, o: OpcionesDePartido): ResultadoDePartido {
  const P = PARAMETROS_DE_PARTIDO;
  const G = PARAMETROS_DEL_NIVEL_GRUESO;
  const rng = rngEstable('partido', 'grueso', o.semilla, o.id);
  const estado = crearPartido(local, visitante, { ...o, nivel: 2 });
  const lados = armar(estado, [local, visitante]);
  for (const l of lados) for (const x of l.campo) x.rm = rendimientoPorCansancio(0, x.j.intensidad ?? l.intensidad);
  const fz: [Fuerzas, Fuerzas] = [fuerzasDe(lados[0], P.ventajaDeCasa), fuerzasDe(lados[1], 0)];
  const poseedor = mejorQue(fz[0].creacion, fz[1].creacion, 2);
  const registro: SucesoDePartido[] = [];
  const total = P.tramos * P.minutosPorTramo;
  const minutoAlAzar = (): number => Math.min(total - 1, Math.floor(rng.next() * total));
  const dePuerta = (1 - P.bloqueado) * (1 - P.fuera);

  // Los cambios y las expulsiones: quién se va y cuándo.
  const minutosDe = new Map<Jug, [number, number]>();
  for (const [i, l] of lados.entries()) {
    const titulares = l.todos.filter((x) => x.e.titular);
    const banquillo = l.todos.filter((x) => !x.e.titular);
    for (const x of titulares) minutosDe.set(x, [0, total]);
    const cuantos = Math.min(o.cambios?.maximo ?? 0, banquillo.length);
    const candidatos = titulares.filter((x) => x.linea !== 'GK').sort((a, b) => a.j.lector.norm('gen.resistencia') - b.j.lector.norm('gen.resistencia'));
    const horas = (o.cambios?.despuesDeTramos ?? [1, 3, 4]).map((t) => t * P.minutosPorTramo);
    const libres = new Set(banquillo);
    for (let k = 0; k < cuantos && k < candidatos.length; k++) {
      const sale = candidatos[k];
      const entra = [...libres].find((b) => GRUPO_DE_PUESTO(b.e.puesto) === GRUPO_DE_PUESTO(sale.e.puesto));
      if (!entra) continue;
      libres.delete(entra);
      const m = horas[k % horas.length] ?? 45;
      minutosDe.set(sale, [0, m]);
      minutosDe.set(entra, [m, total]);
      entra.e.puesto = sale.e.puesto;
    }
  }
  const enElCampo = (i: 0 | 1): Jug[] => lados[i].todos.filter((x) => minutosDe.has(x));
  // Quién tira: casi siempre por su puesto y su definición, y una parte por el remate de balón parado (córners y faltas), donde también pesan los centrales.
  const pesoDeTiro = (x: Jug): number => (1 - G.parteDeBalonParado) * (PESO_DE_TIRADOR[x.e.puesto] ?? 1) * Math.pow(Math.max(x.h.definicion * x.r, 1e-6), 1.5) / 3 / 30 ** 1.5 + G.parteDeBalonParado * (PESO_DE_REMATADOR_EN_CORNER[x.e.puesto] ?? 1) * Math.pow(Math.max(x.h.cabeza * x.r, 1e-6), 1.5) / 2.4 / 30 ** 1.5;

  // Los goles y los tiros, por bloques de un minuto y con la misma regla que el motor: el partido se abre hacia el final y el que pierde arriesga más y el que gana, menos (`apertura`, `ritmoDelMarcador`). Así los goles de un equipo
  // dependen de los del otro, como en el motor, y la diferencia de goles sale con su misma dispersión.
  const esperadosPorEquipo = [esperadosDelNivelGrueso(fz[0], fz[1], true), esperadosDelNivelGrueso(fz[1], fz[0], false)];
  const mezcla = (media: number, sigma: number): number => media * Math.exp(sigma * rng.normal() - (sigma * sigma) / 2);
  const lamGoles = esperadosPorEquipo.map((e) => mezcla(e.goles, G.dispersion.goles));
  const lamTiros = esperadosPorEquipo.map((e) => mezcla(e.tiros, G.dispersion.tiros));
  const BLOQUES = 90;
  const [kA, kB] = normalizarElMarcador(lamGoles[0], lamGoles[1], BLOQUES);
  const k = [kA, kB];
  const minutosPorBloque = total / BLOQUES;
  const golesDe = [0, 0];
  const tirosDe = [0, 0];
  const minutosDeLosGoles: number[][] = [[], []];
  for (let b = 0; b < BLOQUES; b++) {
    const apertura = 1 + P.apertura * (((b + 0.5) * minutosPorBloque) / total - 0.5);
    const antes = [golesDe[0] - golesDe[1], golesDe[1] - golesDe[0]];
    for (const i of [0, 1] as const) {
      const ritmo = (k[i] * apertura * (1 - P.ritmoDelMarcador * G.marcador * Math.max(-2, Math.min(2, antes[i])))) / BLOQUES;
      for (let k = poisson(rng, lamGoles[i] * ritmo); k > 0; k--) {
        golesDe[i]++;
        minutosDeLosGoles[i].push(b * minutosPorBloque + Math.floor(rng.next() * minutosPorBloque));
      }
      tirosDe[i] += poisson(rng, lamTiros[i] * ritmo);
    }
  }

  for (const i of [0, 1] as const) {
    const A = lados[i];
    const esperados = esperadosPorEquipo[i];
    const goles = golesDe[i];
    const tiros = Math.max(goles, tirosDe[i]);
    const aPuertaSinGol = binomial(rng, tiros - goles, Math.max(0, Math.min(1, (dePuerta * tiros - goles) / Math.max(1, tiros - goles))));
    estado.goles[i] = goles;
    estado.tiros[i] = tiros;
    estado.alPuerta[i] = goles + aPuertaSinGol;
    estado.xg[i] = esperados.goles;
    // Los tiros, de quien los da; los goles y los tiros a puerta están entre ellos.
    const tiradores = repartir(rng, tiros, enElCampo(i).filter((x) => x.linea !== 'GK'), pesoDeTiro);
    for (let k = tiradores.length - 1; k > 0; k--) {
      const j = Math.floor(rng.next() * (k + 1));
      [tiradores[k], tiradores[j]] = [tiradores[j], tiradores[k]];
    }
    tiradores.forEach((x, k) => {
      x.e.tiros++;
      x.e.xg += esperados.goles / Math.max(1, tiros);
      if (k < estado.alPuerta[i]) x.e.alPuerta++;
      if (k < goles) {
        x.e.goles++;
        const minuto = minutosDeLosGoles[i][k];
        const asistente = rng.chance(0.7) ? repartir(rng, 1, enElCampo(i).filter((y) => y !== x && y.linea !== 'GK'), (y) => PESO_DE_PASE[y.linea] * y.h.pase * y.r)[0] : undefined;
        if (asistente) asistente.e.asistencias++;
        registro.push({ minuto, tramo: Math.floor(minuto / P.minutosPorTramo), tipo: 'gol', equipo: i, jugador: x.e.id, ...(asistente ? { otro: asistente.e.id } : {}), xg: Math.round(Math.min(0.85, esperados.goles / Math.max(1, tiros) * 3) * 1000) / 1000 });
        estado.jugadas.push({ tramo: Math.floor(minuto / P.minutosPorTramo), equipo: i, goleador: x.e.id, ...(asistente ? { asistente: asistente.e.id } : {}), tipo: 'juego' });
        estado.porTramo[Math.floor(minuto / P.minutosPorTramo)].goles[i]++;
      }
    });
    estado.corners[i] = poisson(rng, G.cornersPorTiro * tiros);
    // Faltas, tarjetas y pases del equipo.
    const faltasDelEquipo = poisson(rng, ((P.faltasPorMinuto * total) / 2) * (A.campo.length ? A.campo.reduce((t, x) => t + P.intensidades[x.j.intensidad ?? A.intensidad].faltas, 0) / A.campo.length : 1));
    const infractores = repartir(rng, faltasDelEquipo, enElCampo(i), (x) => PESO_DE_FALTA[x.linea] * (1.5 - (x.h.entrada * x.r) / (x.h.entrada * x.r + 40)));
    estado.faltas[i] = infractores.length;
    for (const x of infractores) {
      x.e.faltas++;
      if (rng.chance(P.amarilla * (x.e.amarillas > 0 ? 0.25 : 1))) {
        x.e.amarillas++;
        estado.amarillas[i]++;
        const minuto = minutoAlAzar();
        registro.push({ minuto, tramo: Math.floor(minuto / P.minutosPorTramo), tipo: 'amarilla', equipo: i, jugador: x.e.id });
        if (x.e.amarillas >= 2 && !x.e.expulsado) expulsar(x, i, true, minuto);
      }
    }
    if (rng.chance(G.rojasDirectas)) {
      const x = repartir(rng, 1, enElCampo(i).filter((y) => !y.e.expulsado), (y) => PESO_DE_FALTA[y.linea])[0];
      if (x) expulsar(x, i, false, minutoAlAzar());
    }
    const posesiones = Math.round(P.posesionesPorMinuto * total * (i === 0 ? poseedor : 1 - poseedor));
    estado.posesiones[i] = posesiones;
    const pases = poisson(rng, posesiones * P.pasesPorPosesion);
    const pesoDePase = (x: Jug): number => PESO_DE_PASE[x.linea] * x.sqrtPase;
    for (const x of repartir(rng, pases, enElCampo(i), pesoDePase)) {
      x.e.pases++;
      if (rng.chance(G.precisionDePase)) x.e.pasesOk++;
    }
  }
  // Las faltas recibidas, de los rivales; las paradas del portero y los goles encajados.
  for (const i of [0, 1] as const) {
    const victimas = repartir(rng, estado.faltas[1 - i], enElCampo(i), (x) => ({ GK: 0, DEF: 0.5, MID: 1, ATT: 1.5 })[x.linea] * (x.h.regate * x.r + 10));
    for (const x of victimas) x.e.faltasRecibidas++;
    const portero = enElCampo(i).find((x) => x.linea === 'GK');
    if (portero) portero.e.paradas = Math.max(0, estado.alPuerta[1 - i] - estado.goles[1 - i]);
    for (const x of enElCampo(i)) x.e.golesEncajados = estado.goles[1 - i];
  }
  // Minutos de cada uno, con las expulsiones.
  for (const [x, [desde, hasta]] of minutosDe) {
    x.e.minutos = Math.max(0, hasta - desde);
    x.e.enCampo = hasta >= total && !x.e.expulsado;
  }
  // La posesión y los minutos van al estado.
  for (const t of estado.porTramo) {
    t.posesiones = [Math.round(((estado.posesiones[0] * 1) / (estado.posesiones[0] + estado.posesiones[1])) * 100), 0];
    t.posesiones[1] = 100 - t.posesiones[0];
  }
  estado.registro = registro.sort((a, b) => a.minuto - b.minuto);
  estado.minuto = total;
  return resultadoDelPartido(estado, local, visitante);

  /** Expulsa a un jugador en un minuto: se queda sin minutos desde entonces y el equipo no repone. */
  function expulsar(x: Jug, i: 0 | 1, doble: boolean, minuto: number): void {
    const [desde, hasta] = minutosDe.get(x) ?? [0, total];
    if (minuto >= hasta) return;
    minutosDe.set(x, [desde, Math.max(desde, minuto)]);
    x.e.expulsado = true;
    estado.rojas[i]++;
    registro.push({ minuto, tramo: Math.floor(minuto / P.minutosPorTramo), tipo: 'roja', equipo: i, jugador: x.e.id, dobleAmarilla: doble });
  }
}
