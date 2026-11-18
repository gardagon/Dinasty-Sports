/**
 * ¿Suenan extranjeros los nombres de los compañeros? Propuesta de «nombres más nacionales» con muestras. SOLO LEE: no cambia nada del juego.
 * `npm run nombres-nacionales -- [semillas=5] [muestraMC=40000]` escribe en la salida (markdown) las muestras de los compañeros de clase del personaje y la tabla de opciones.
 * Informe: docs/relevo/nombres-nacionales.md.
 *
 * Cómo mide: las muestras de «hoy» son los nombres reales que genera el juego (`nuevaPartida`). Para las opciones se toman los mismos orígenes y se vuelven a poner los nombres
 * con una copia local, parametrizada, de las reglas de `identidadAlAzar` (`nombres.ts`); con los parámetros de hoy sale lo mismo que el juego (se comprueba en el informe).
 * «Suena extranjero» = el nombre de pila no está en las listas de España/Latinoamérica, o algún apellido no está en sus listas de apellidos.
 */
import { CIUDAD_GRANDE, PAIS_CIUDAD_GRANDE, culturaPorId, identidadDeJugador, origenDeJugador, origenesDePareja, origenHeredado, padresDeSemilla, registrarPais, reservaDeNombres, rngEstable, origen as origenDef, describirOrigen, ORIGENES, type Cultura, type OrigenFamiliar, type Rng } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { edadNpc, type NpcsState } from '@ds/mod-npcs';

// ------------------------------------------------------------------------------------------------ las listas hispanas
const HISPANAS = ['espana', 'latinoamerica'].map((id) => culturaPorId(id)!);
const PILAS_HISPANAS = new Set<string>();
const APELLIDOS_HISPANOS = new Set<string>();
for (const c of HISPANAS) {
  for (const g of ['f', 'm'] as const) for (const n of [...c.nombres[g].jovenes, ...c.nombres[g].adultos, ...(c.compuestos?.[g] ?? [])]) PILAS_HISPANAS.add(n);
  for (const a of c.apellidos) APELLIDOS_HISPANOS.add(a);
}
const APELLIDOS_POR_LARGO = [...APELLIDOS_HISPANOS].sort((a, b) => b.length - a.length);
const pilaHispana = (p: string): boolean => PILAS_HISPANAS.has(p);
const apellidosHispanos = (texto: string): boolean => {
  let resto = texto.trim();
  while (resto) {
    const a = APELLIDOS_POR_LARGO.find((x) => resto === x || resto.startsWith(x + ' '));
    if (!a) return false;
    resto = resto.slice(a.length).trim();
  }
  return true;
};
const primerApellidoHispano = (texto: string): boolean => APELLIDOS_POR_LARGO.some((x) => texto === x || texto.startsWith(x + ' '));
/** A primera vista: el nombre de pila o el primer apellido de fuera (lo que se lee en una lista de clase). */
export const sueneAPrimeraVista = (pila: string, apellidos: string): boolean => !pilaHispana(pila) || !primerApellidoHispano(apellidos.trim());
export const suenaExtranjero = (pila: string, apellidos: string): boolean => !pilaHispana(pila) || !apellidosHispanos(apellidos);

// ------------------------------------------------------------------------------------------------ opciones
export interface Cfg {
  nombre: string;
  /** Demografía (origen → peso) de la ciudad; sin ella, la de hoy. */
  demografia?: Record<string, number>;
  /** (b) Probabilidad de nombre de pila español: hijo de dos padres de fuera del mismo origen (hoy 0). */
  pLocalSolo: number;
  /** (b) Idem, mezcla de dos orígenes de fuera (hoy 0,12 = PROBABILIDAD_DE_NOMBRE_LOCAL). */
  pLocalMezcla: number;
  /** (b) Idem, mezcla con un origen de aquí (hoy 0,5: el nombre sale de un origen u otro por su peso). */
  pLocalEnMixta: number;
  /** (c) Probabilidad de que el apellido español vaya primero en una mixta (hoy: el del origen del que sale el nombre, ~el mismo azar que pLocalEnMixta). */
  espanolPrimero?: number;
  /** (d) Con esta probabilidad, un hijo de fuera con nombre de su cultura lleva uno de los que también están en las listas hispanas (Daniel, Sara, Adam…), si su cultura los tiene. */
  pCompartido: number;
}
const HOY: Cfg = { nombre: 'Hoy', pLocalSolo: 0, pLocalMezcla: 0.12, pLocalEnMixta: 0.5, pCompartido: 0 };
const DEMOGRAFIA_HOY = { ...CIUDAD_GRANDE.demografia! } as Record<string, number>;
/** (a) Madrid: ~19 % de fuera, repartido por continente como la Comunidad de Madrid (informe §2). */
const DEMOGRAFIA_MADRID: Record<string, number> = { espana_norte: 0.162, espana_centro: 0.324, espana_sur: 0.324, latinoamerica: 0.099, europa_este: 0.030, europa_norte: 0.024, magreb: 0.012, africa_subsahariana: 0.006, asia_oriental: 0.019 };
export const OPCIONES: Cfg[] = [
  HOY,
  { ...HOY, nombre: 'a', demografia: DEMOGRAFIA_MADRID },
  { ...HOY, nombre: 'b', pLocalSolo: 0.35, pLocalMezcla: 0.35, pLocalEnMixta: 0.65 },
  { ...HOY, nombre: 'c', espanolPrimero: 0.7 },
  { ...HOY, nombre: 'd', pCompartido: 0.3 },
  { ...HOY, nombre: 'a+b', demografia: DEMOGRAFIA_MADRID, pLocalSolo: 0.35, pLocalMezcla: 0.35, pLocalEnMixta: 0.65 },
  { ...HOY, nombre: 'b+c', pLocalSolo: 0.35, pLocalMezcla: 0.35, pLocalEnMixta: 0.65, espanolPrimero: 0.7 },
  { ...HOY, nombre: 'a+b+c', demografia: DEMOGRAFIA_MADRID, pLocalSolo: 0.35, pLocalMezcla: 0.35, pLocalEnMixta: 0.65, espanolPrimero: 0.7 },
  { ...HOY, nombre: 'a+b+c+d', demografia: DEMOGRAFIA_MADRID, pLocalSolo: 0.35, pLocalMezcla: 0.35, pLocalEnMixta: 0.65, espanolPrimero: 0.7, pCompartido: 0.3 },
];
const cfgDe = (nombre: string): Cfg => OPCIONES.find((o) => o.nombre === nombre)!;

// ------------------------------------------------------------------------------------------------ copia local de las reglas de nombres (nombres.ts)
const LOCALES = ['espana_norte', 'espana_centro', 'espana_sur'];
const esLocal = (id: string): boolean => LOCALES.includes(id);
function porFrecuencia<T>(lista: readonly T[], rng: Rng): T {
  const n = lista.length;
  let total = 0;
  for (let i = 0; i < n; i++) total += 1 / (1 + (4 * i) / n);
  let u = rng.next() * total;
  for (let i = 0; i < n; i++) {
    u -= 1 / (1 + (4 * i) / n);
    if (u < 0) return lista[i];
  }
  return lista[n - 1];
}
function porPeso<T>(items: readonly T[], peso: (t: T) => number, rng: Rng): T {
  const total = items.reduce((a, t) => a + peso(t), 0);
  let u = rng.next() * total;
  for (const t of items) {
    u -= peso(t);
    if (u < 0) return t;
  }
  return items[items.length - 1];
}
const culturaDe = (rng: Rng, id: string): Cultura => {
  const cs = reservaDeNombres(origenDef(id)?.reserva ?? 'espana');
  return cs.length === 1 ? cs[0] : porPeso(cs, (c) => c.peso, rng);
};
const unidos = (l: { jovenes: readonly string[]; adultos: readonly string[] }): string[] => [...new Set([...l.jovenes, ...l.adultos])];
const COMPARTIDOS = new Map<string, Record<'f' | 'm', string[]>>();
function compartidos(c: Cultura): Record<'f' | 'm', string[]> {
  let r = COMPARTIDOS.get(c.id);
  if (!r) {
    r = { f: unidos(c.nombres.f).filter(pilaHispana), m: unidos(c.nombres.m).filter(pilaHispana) };
    COMPARTIDOS.set(c.id, r);
  }
  return r;
}
const EDAD_NINO = 8;
function pilaDe(rng: Rng, c: Cultura, g: 'f' | 'm', cfg: Cfg, deFuera: boolean): string {
  if (c.compuestos && rng.chance(c.probabilidadDeCompuesto?.jovenes ?? 0)) return porFrecuencia(c.compuestos[g], rng);
  if (deFuera && cfg.pCompartido > 0 && compartidos(c)[g].length && rng.chance(cfg.pCompartido)) return porFrecuencia(compartidos(c)[g], rng);
  return porFrecuencia(unidos(c.nombres[g]), rng);
}

export interface Nombre { pila: string; apellidos: string; completo: string; extranjero: boolean; vista: boolean; primeroEsLocal?: boolean }
/** El nombre de un niño del mundo con su origen (copia de `identidadAlAzar` con las opciones). */
export function nombreDeNino(rng: Rng, g: 'f' | 'm', o: OrigenFamiliar, cfg: Cfg): Nombre {
  const culturas = new Map<string, Cultura>();
  const de = (id: string) => culturas.get(id) ?? culturas.set(id, culturaDe(rng, id)).get(id)!;
  const hayLocal = o.some((x) => esLocal(x.id));
  let origenNombre: string;
  if (o.length === 1) origenNombre = !esLocal(o[0].id) && cfg.pLocalSolo > 0 && rng.chance(cfg.pLocalSolo) ? 'espana_norte' : o[0].id;
  else if (!hayLocal && rng.chance(cfg.pLocalMezcla)) origenNombre = 'espana_norte';
  else if (hayLocal && o.some((x) => !esLocal(x.id))) {
    const loc = o.find((x) => esLocal(x.id))!;
    const fuera = o.find((x) => !esLocal(x.id))!;
    origenNombre = rng.chance(cfg.pLocalEnMixta) ? loc.id : fuera.id;
  } else origenNombre = porPeso(o, (x) => x.peso, rng).id;
  const cultNombre = de(origenNombre);
  const pila = pilaDe(rng, cultNombre, g, cfg, !esLocal(origenNombre) && cultNombre.id !== 'latinoamerica');
  let primero = o.some((x) => x.id === origenNombre) ? origenNombre : o[0].id;
  const mixtaConLocal = o.length > 1 && hayLocal && o.some((x) => !esLocal(x.id));
  if (cfg.espanolPrimero !== undefined && mixtaConLocal) primero = rng.chance(cfg.espanolPrimero) ? o.find((x) => esLocal(x.id))!.id : o.find((x) => !esLocal(x.id))!.id;
  const origenes = [primero, ...o.map((x) => x.id).filter((id) => id !== primero)];
  const numero = origenes.some((id) => de(id).numeroDeApellidos === 2) ? 2 : 1;
  const ap: string[] = [];
  for (let i = 0; i < numero; i++) {
    const c = de(origenes[i % origenes.length]);
    let base = '';
    for (let k = 0; k < 20; k++) {
      base = porFrecuencia(c.apellidos, rng);
      if (!ap.includes(base)) break;
    }
    ap.push(base);
  }
  const apellidos = ap.join(' ');
  return { pila, apellidos, completo: `${pila} ${apellidos}`, extranjero: suenaExtranjero(pila, apellidos), vista: sueneAPrimeraVista(pila, apellidos), primeroEsLocal: mixtaConLocal ? esLocal(primero) : undefined };
}

// ------------------------------------------------------------------------------------------------ muestras de la partida
const SEMILLAS = Number(process.argv[2] ?? 5);
const N_MC = Number(process.argv[3] ?? 40000);
const ID_MADRID = "espana_madrid_reparto";
registrarPais(PAIS_CIUDAD_GRANDE);
registrarPais({ ...PAIS_CIUDAD_GRANDE, id: ID_MADRID, ciudad: { ...CIUDAD_GRANDE, demografia: DEMOGRAFIA_MADRID } });

interface Companero { id: string; genero: 'f' | 'm'; nombre: string; pila: string; origen: OrigenFamiliar }
function companeros(seed: number, pais: string): { clase: Companero[]; jugador: { completo: string; origen: OrigenFamiliar; padres: string } } {
  const g = nuevaPartida({ seed, pais, deportes: ['atletismo'] }, MODULOS);
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const clase: Companero[] = [];
  for (const n of s.npcs) {
    if (!n.tipos?.some((t) => t.tuClase) || !n.rasgos?.origen || n.role !== 'companero') continue;
    if ((edadNpc(n, 0) ?? 0) > 9) continue;
    clase.push({ id: n.id, genero: n.gender as 'f' | 'm', nombre: n.name, pila: n.nombrePila ?? n.name.split(' ')[0], origen: n.rasgos.origen });
  }
  const p = paisPorIdSeguro(pais);
  const pad = padresDeSemilla(seed, p);
  const j = identidadDeJugador(seed, 'padre', p);
  return { clase, jugador: { completo: j.completo, origen: origenDeJugador(seed, p), padres: `${describirOrigen(pad.padre.origen)} + ${describirOrigen(pad.madre.origen)}` } };
}
import { paisPorId } from '@ds/contracts';
const paisPorIdSeguro = (id: string) => paisPorId(id);

const corto = (o: OrigenFamiliar): string => o.map((x) => (origenDef(x.id)?.nombre ?? x.id).replace(/^España \((.*)\)$/, 'España-$1')).join(' + ');
/** Los padres de un niño del mundo, deducidos de su origen: uno solo = los dos del mismo origen; dos = uno de cada. */
const padresDe = (o: OrigenFamiliar): string => (o.length === 1 ? `${corto(o)} y ${corto(o)}` : o.map((x) => corto([x])).join(' y '));

const SALIDA: string[] = [];
const out = (s = ''): void => void SALIDA.push(s);
const pct = (n: number, d: number): string => `${((100 * n) / d).toFixed(1)} %`;

function listar(titulo: string, cfgNombre: string, pais: string, conPadres: boolean): number[] {
  const cfg = cfgDe(cfgNombre);
  const cuentas: number[] = [];
  out(`#### ${titulo}\n`);
  for (let seed = 1; seed <= SEMILLAS; seed++) {
    const { clase, jugador } = companeros(seed, pais);
    const real = cfgNombre === 'Hoy';
    const filas = clase.map((c) => {
      const nombre = real ? { pila: c.pila, apellidos: c.nombre.slice(c.pila.length).trim(), completo: c.nombre, extranjero: suenaExtranjero(c.pila, c.nombre.slice(c.pila.length).trim()), vista: sueneAPrimeraVista(c.pila, c.nombre.slice(c.pila.length).trim()) } : nombreDeNino(rngEstable('nombres-nacionales', seed, c.id, cfgNombre), c.genero, c.origen, cfg);
      return { c, nombre };
    });
    const ext = filas.filter((f) => f.nombre.extranjero).length;
    const vista = filas.filter((f) => f.nombre.vista).length;
    cuentas.push(ext);
    const jug = jugador.completo;
    out(`**Semilla ${seed}** — personaje: **${jug}** (${corto(jugador.origen)}; padres: ${jugador.padres}). ${ext} de ${filas.length} suenan extranjeros (nombre o algún apellido; ✱ a primera vista = nombre o primer apellido: ${vista}; · solo el segundo apellido).\n`);
    out(conPadres ? '| # | Compañero | Origen | Padres (deducidos) | |\n|--:|---|---|---|---|' : '| # | Compañero | Origen | |\n|--:|---|---|---|');
    filas.forEach((f, i) => out(`| ${i + 1} | ${f.nombre.completo} | ${corto(f.c.origen)} |${conPadres ? ` ${padresDe(f.c.origen)} |` : ''} ${f.nombre.vista ? '✱' : f.nombre.extranjero ? '·' : ''} |`));
    out();
  }
  return cuentas;
}

// ------------------------------------------------------------------------------------------------ tabla (Monte Carlo)
interface Fila { cfg: Cfg; vista: number; extranjeros: number; porNombre: number; porApellido: number; ambos: number; soloApellido: number; soloNombre: number; origenNoHispano: number; mixtasConLocalEspanolPrimero: number; mixtasConLocal: number; dist: number[] }
function medir(cfg: Cfg): Fila {
  const rng = rngEstable('nombres-nacionales-mc', cfg.nombre.length);
  const demografia = cfg.demografia ?? DEMOGRAFIA_HOY;
  const parejas = CIUDAD_GRANDE.parejas!;
  let vista = 0, ambos = 0, soloAp = 0, soloNo = 0, ext = 0, porNombre = 0, porApellido = 0, noHisp = 0, mixL = 0, mixLEsp = 0;
  const N = N_MC;
  const esExt: boolean[] = [];
  for (let i = 0; i < N; i++) {
    const [p, m] = origenesDePareja(rng, demografia, LOCALES, parejas);
    const o = origenHeredado(p, m);
    const g: 'f' | 'm' = rng.chance(0.5) ? 'f' : 'm';
    const n = nombreDeNino(rng, g, o, cfg);
    esExt.push(n.extranjero);
    if (n.extranjero) ext++;
    if (n.vista) vista++;
    const nf = !pilaHispana(n.pila), af = !apellidosHispanos(n.apellidos);
    if (nf) porNombre++;
    if (af) porApellido++;
    if (nf && af) ambos++; else if (af) soloAp++; else if (nf) soloNo++;
    if (o.some((x) => !esLocal(x.id) && x.id !== 'latinoamerica')) noHisp++;
    if (o.length > 1 && o.some((x) => esLocal(x.id)) && o.some((x) => !esLocal(x.id))) {
      mixL++;
      if (n.primeroEsLocal) mixLEsp++;
    }
  }
  // Distribución de clases de 24: se reparten los niños sorteados en bloques.
  const dist = new Array(25).fill(0); // sobre «suenan extranjeros»
  const bloques = Math.floor(N / 24);
  for (let b = 0; b < bloques; b++) dist[esExt.slice(b * 24, b * 24 + 24).filter(Boolean).length]++;
  return { cfg, vista: vista / N, extranjeros: ext / N, porNombre: porNombre / N, porApellido: porApellido / N, ambos: ambos / N, soloApellido: soloAp / N, soloNombre: soloNo / N, origenNoHispano: noHisp / N, mixtasConLocalEspanolPrimero: mixL ? mixLEsp / mixL : 0, mixtasConLocal: mixL / N, dist: dist.map((d) => d / bloques) };
}

function tabla(): void {
  const filas = OPCIONES.map(medir);
  out(`### Tabla resumen (${N_MC.toLocaleString('es')} niños sorteados por opción, ciudad grande)\n`);
  out('| Opción | Suenan extranjeros | de cada 20 | **A primera vista** | de cada 20 | nombre **y** apellido | solo el apellido | solo el nombre | con origen no hispano | P(≥7 de 24)¹ | P(≤3 de 24)¹ |');
  out('|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|');
  const base = filas[0];
  for (const f of filas) {
    const ge6 = f.dist.slice(Math.ceil(6 * 24 / 20)).reduce((a, b) => a + b, 0);
    const le3 = f.dist.slice(0, Math.floor(3 * 24 / 20) + 1).reduce((a, b) => a + b, 0);
    out(`| ${f.cfg.nombre} | ${(f.extranjeros * 100).toFixed(1)} % | ${(f.extranjeros * 20).toFixed(1)} | ${(f.vista * 100).toFixed(1)} % | **${(f.vista * 20).toFixed(1)}** | ${(f.ambos * 100).toFixed(1)} % | ${(f.soloApellido * 100).toFixed(1)} % | ${(f.soloNombre * 100).toFixed(1)} % | ${(f.origenNoHispano * 100).toFixed(1)} % | ${(ge6 * 100).toFixed(0)} % | ${(le3 * 100).toFixed(0)} % |`);
  }
  out('\n¹ Clases de 24 compañeros (como las del juego). «A primera vista» = nombre de pila o primer apellido de cultura no hispana (lo que se lee en una lista de clase). «Suenan extranjeros» = nombre o algún apellido de cultura no hispana; «solo el apellido» = nombre español/latino con apellido de fuera (Lucas Amrani).\n');
  out(`Referencia: hoy ${(base.extranjeros * 20).toFixed(1)} de cada 20. «Origen no hispano» = el niño tiene algún origen que no es de España ni de Latinoamérica (el suelo que no se baja sin tocar la demografía).`);
  out(`En las mixtas de un origen de aquí con uno de fuera, el apellido español va primero: ${filas.map((f) => `${f.cfg.nombre} ${(f.mixtasConLocalEspanolPrimero * 100).toFixed(0)} %`).join(' · ')}.\n`);
  // Sensibilidad de (b).
  out('### Sensibilidad de (b): probabilidad de nombre español en hijos de dos de fuera del mismo origen\n');
  out('| pLocalSolo | pLocalMezcla | pLocalEnMixta | Nombre de fuera, solo b (de 20) | A primera vista, solo b (de 20) | Nombre de fuera, con a | A primera vista, con a |');
  out('|--:|--:|--:|--:|--:|--:|--:|');
  for (const [s, m, x] of [[0, 0.12, 0.5], [0.2, 0.2, 0.6], [0.35, 0.35, 0.65], [0.5, 0.5, 0.75], [0.7, 0.7, 0.85]] as const) {
    const b = medir({ ...HOY, nombre: 'b?', pLocalSolo: s, pLocalMezcla: m, pLocalEnMixta: x });
    const ac = medir({ ...HOY, nombre: 'ac?', demografia: DEMOGRAFIA_MADRID, pLocalSolo: s, pLocalMezcla: m, pLocalEnMixta: x });
    out(`| ${s * 100} % | ${m * 100} % | ${x * 100} % | ${(b.porNombre * 20).toFixed(1)} | ${(b.vista * 20).toFixed(1)} | ${(ac.porNombre * 20).toFixed(1)} | ${(ac.vista * 20).toFixed(1)} |`);
  }
  out();
}

// ------------------------------------------------------------------------------------------------ comprobación de la copia
function comprobarCopia(): void {
  // Con los parámetros de hoy, la copia da la misma proporción que los nombres reales del juego (mismo origen).
  let real = 0, copia = 0, n = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const { clase } = companeros(seed, PAIS_CIUDAD_GRANDE.id);
    for (const c of clase) {
      n++;
      if (suenaExtranjero(c.pila, c.nombre.slice(c.pila.length).trim())) real++;
      if (nombreDeNino(rngEstable('copia', seed, c.id), c.genero, c.origen, HOY).extranjero) copia++;
    }
  }
  out(`Comprobación de la copia: con los mismos orígenes (20 semillas, ${n} compañeros), el juego da ${pct(real, n)} que suenan extranjeros y la copia con los parámetros de hoy, ${pct(copia, n)}.\n`);
}

out('## 1. Muestras de hoy (nombres reales del juego)\n');
const hoy = listar('Hoy: compañeros de clase del personaje (24), con origen y padres', 'Hoy', PAIS_CIUDAD_GRANDE.id, true);
out(`Suenan extranjeros por semilla: ${hoy.join(', ')} (media ${(hoy.reduce((a, b) => a + b, 0) / hoy.length).toFixed(1)} de 24).\n`);
out('## 2. Muestras de las opciones (mismos compañeros, con las reglas de cada opción)\n');
for (const nombre of ['a', 'b', 'c', 'd', 'a+b', 'a+b+c', 'a+b+c+d']) {
  const cfg = cfgDe(nombre);
  const pais = cfg.demografia ? ID_MADRID : PAIS_CIUDAD_GRANDE.id;
  const r = listar(`Opción ${nombre}`, nombre, pais, false);
  out(`Suenan extranjeros por semilla: ${r.join(', ')} (media ${(r.reduce((x, y) => x + y, 0) / r.length).toFixed(1)} de 24).\n`);
}
out('## 3. Tabla\n');
tabla();
comprobarCopia();
void ORIGENES;
console.log(SALIDA.join('\n'));
