/**
 * El banco de partidos (`MOTOR_PARTIDOS.md` §11): con los equipos de verdad del mundo (cada club y colegio, de cada categoría, con sus jugadores y lo que valen), juega ligas de cada categoría con el motor
 * (`jugarPartido`) y comprueba que no se rompe: sin objetivo de goles (decisión 1 del diseño), que no casi todo acabe 0 a 0 ni haya goleadas absurdas entre equipos parecidos, que a más diferencia de nivel haya más
 * goles y más diferencia en el marcador, que el mejor equipo gane la liga entre el 40 % y el 75 % de las veces, que un niño subido de categoría rinda menos y que la nota media de un jugador típico ronde el 6 y
 * la de uno muy bueno el 7,5. `npm run sim:partidos -- [temporadas] [ciudad: prueba|grande]`.
 */
import { PAIS_CIUDAD_GRANDE, registrarPais, PAIS_CIUDAD_DE_PRUEBA } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PARAMETROS_DE_PARTIDO, PUESTOS_DE_FUTBOL, futbol, jugarPartido, valorEnPartido, POTENCIADOR_POR_CATEGORIA, type EquipoDePartido, type JugadorDePartido } from '@ds/mod-futbol';
import { edadDeJuego, lectorDeUnNpc, type NpcsState } from '@ds/mod-npcs';

const TEMPORADAS = Number(process.argv[2] ?? 30);
const GRANDE = (process.argv[3] ?? 'prueba') === 'grande';
const CATEGORIAS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
registrarPais(GRANDE ? PAIS_CIUDAD_GRANDE : PAIS_CIUDAD_DE_PRUEBA);
const f = (x: number, d = 1): string => x.toFixed(d);
const media = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const g = nuevaPartida({ seed: 31, ...(GRANDE ? { pais: PAIS_CIUDAD_GRANDE.id } : {}), deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
const s = g.moduleState<NpcsState>('npcs') as NpcsState;
const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
const TITULARES = PUESTOS_DE_FUTBOL.equipos!.titulares;

interface EquipoConFuerza { equipo: EquipoDePartido; fuerza: number }
/** Los equipos de una categoría: cada club con cada letra, con sus 11 titulares por grupos de puestos y hasta 5 suplentes. */
function equiposDe(cat: string): EquipoConFuerza[] {
  const def = pob.categorias!.find((c) => c.id === cat)!;
  const porEquipo = new Map<string, typeof s.npcs>();
  for (const n of s.npcs) {
    const edad = edadDeJuego(n, 0);
    if (n.deporte !== 'futbol' || !n.equipo || !n.letra?.futbol || edad === undefined || edad < def.edadMin || edad > def.edadMax) continue;
    const clave = `${n.equipo}|${n.letra.futbol}`;
    (porEquipo.get(clave) ?? porEquipo.set(clave, []).get(clave)!).push(n);
  }
  const res: EquipoConFuerza[] = [];
  for (const [clave, miembros] of porEquipo) {
    if (miembros.length < 14) continue;
    const jugadores = miembros.flatMap((n) => {
      const lector = lectorDeUnNpc(n, pob, 0);
      const puesto = n.puesto?.futbol;
      return lector && puesto ? [{ n, lector, puesto, valor: n.vp?.futbol?.puestos?.[puesto] ?? n.vp?.futbol?.valor ?? 0 }] : [];
    });
    const enCampo = new Set<string>();
    const cuenta: Record<string, number> = {};
    for (const j of [...jugadores].sort((a, b) => b.valor - a.valor)) {
      const grupo = PUESTOS_DE_FUTBOL.reparto.find((r) => r.puestos.includes(j.puesto))!.grupo;
      if ((cuenta[grupo] ?? 0) >= (TITULARES[grupo] ?? 0)) continue;
      cuenta[grupo] = (cuenta[grupo] ?? 0) + 1;
      enCampo.add(j.n.id);
    }
    if (enCampo.size < 11) continue;
    const suplentes = jugadores.filter((j) => !enCampo.has(j.n.id)).sort((a, b) => b.valor - a.valor).slice(0, 5);
    const lista: JugadorDePartido[] = [...jugadores.filter((j) => enCampo.has(j.n.id)), ...suplentes].map((j) => ({ id: j.n.id, nombre: j.n.name, puesto: j.puesto, lector: j.lector, titular: enCampo.has(j.n.id) }));
    const fuerza = media(jugadores.filter((j) => enCampo.has(j.n.id)).map((j) => j.valor));
    res.push({ equipo: { id: clave, nombre: clave, jugadores: lista }, fuerza });
  }
  return res;
}

const CAMBIOS = { maximo: 5, despuesDeTramos: [1, 3, 4], volantes: false };
let partidoNo = 0;
const jugar = (a: EquipoConFuerza, b: EquipoConFuerza, cat: string) => jugarPartido(a.equipo, b.equipo, { id: `${a.equipo.id}-${b.equipo.id}-${partidoNo++}`, semilla: 31, categoria: cat, cambios: CAMBIOS });

const BASE = { ...PARAMETROS_DE_PARTIDO };
/** Con un tercer argumento (un JSON con una lista de cambios en los parámetros del motor) el banco se repite con cada uno, para calibrar. */
const VARIANTES: Record<string, unknown>[] = process.argv[4] ? JSON.parse(process.argv[4]) : [{}];
for (const variante of VARIANTES) {
Object.assign(PARAMETROS_DE_PARTIDO, BASE, variante);
if (Object.keys(variante).length) console.log(`\n=== Parámetros: ${JSON.stringify(variante)}`);
console.log(`Banco de partidos (${GRANDE ? 'ciudad grande' : 'ciudad de prueba'}, ${TEMPORADAS} temporadas por categoría; ligas a doble vuelta de hasta 7 equipos de la ciudad)\n`);
console.log('| Categoría | Equipos | Goles por partido | 0 a 0 | Goleadas (≥ 6 goles) entre parecidos | El mejor gana la liga | Nota media (de campo, titulares) | Nota del mejor cuartil | Nota del mejor 5 % | Minutos de los suplentes (% de los que juegan) |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
const detalle: string[] = [];
for (const cat of CATEGORIAS) {
  const equipos = equiposDe(cat);
  if (equipos.length < 4) { console.log(`| ${cat} | ${equipos.length} | (faltan equipos) |`); continue; }
  const goles: number[] = [];
  let ceroACero = 0, partidos = 0, goleadas = 0, parecidos = 0, mejorGana = 0, ligas = 0;
  const notasTitulares: number[] = [];
  const notasMejores: number[] = [];
  const porDiferencia = new Map<number, { goles: number[]; dif: number[] }>();
  let suplentesQueJuegan = 0, suplentes = 0;
  for (let t = 0; t < TEMPORADAS; t++) {
    // Siete equipos al azar de la categoría (estable por temporada).
    const orden = [...equipos].sort((a, b) => (((a.equipo.id.length * 7919 + t * 104729 + a.fuerza * 1000) % 997) - ((b.equipo.id.length * 7919 + t * 104729 + b.fuerza * 1000) % 997)));
    const liga = orden.slice(0, Math.min(7, equipos.length));
    const puntos = new Map(liga.map((e) => [e, 0]));
    for (const a of liga) for (const b of liga) {
      if (a === b) continue;
      const r = jugar(a, b, cat);
      const [ga, gb] = r.goles;
      goles.push(ga + gb);
      partidos++;
      if (ga + gb === 0) ceroACero++;
      const ratio = Math.min(a.fuerza, b.fuerza) / Math.max(a.fuerza, b.fuerza);
      if (ratio > 0.95) { parecidos++; if (ga + gb >= 6) goleadas++; }
      const cubo = Math.round((1 - ratio) * 20) / 20;
      const reg = porDiferencia.get(cubo) ?? porDiferencia.set(cubo, { goles: [], dif: [] }).get(cubo)!;
      reg.goles.push(ga + gb);
      reg.dif.push(Math.abs(ga - gb));
      puntos.set(a, puntos.get(a)! + (ga > gb ? 3 : ga === gb ? 1 : 0));
      puntos.set(b, puntos.get(b)! + (gb > ga ? 3 : ga === gb ? 1 : 0));
      for (const [id, st] of Object.entries(r.jugadores)) {
        const eq = [a, b].find((e) => e.equipo.jugadores.some((j) => j.id === id))!;
        const j = eq.equipo.jugadores.find((x) => x.id === id)!;
        if (!j.titular) { suplentes++; if (st.minutos > 0) suplentesQueJuegan++; }
        if (st.minutos < 60 || j.puesto === 'GK') continue;
        notasTitulares.push(st.nota);
      }
    }
    const mejorFuerza = liga.reduce((m, e) => (e.fuerza > m.fuerza ? e : m), liga[0]);
    const campeon = [...puntos].reduce((m, x) => (x[1] > m[1] ? x : m));
    ligas++;
    if (campeon[0] === mejorFuerza) mejorGana++;
  }
  const todasNotas = [...notasTitulares].sort((a, b) => a - b);
  const mejor5 = todasNotas.slice(Math.floor(todasNotas.length * 0.95));
  for (const n of todasNotas.slice(Math.floor(todasNotas.length * 0.75))) notasMejores.push(n);
  console.log(`| ${cat} | ${equipos.length} | ${f(media(goles), 2)} | ${f((100 * ceroACero) / partidos)} % | ${goleadas} de ${parecidos} (${f((100 * goleadas) / Math.max(1, parecidos))} %) | ${f((100 * mejorGana) / ligas, 0)} % | ${f(media(notasTitulares), 2)} | ${f(media(notasMejores), 2)} | ${f(media(mejor5), 2)} | ${f((100 * suplentesQueJuegan) / Math.max(1, suplentes), 0)} % |`);
  detalle.push(`\n${cat}: a más diferencia de nivel entre equipos (1 − menor/mayor fuerza), más goles y más diferencia en el marcador:\n| Diferencia | Partidos | Goles por partido | Diferencia de goles |\n|---|---|---|---|`);
  const grupos = [0, 0.05, 0.1, 0.2, 0.3].map((min, i, arr) => ({ min, max: arr[i + 1] ?? 1, g: [] as number[], d: [] as number[] }));
  for (const [cubo, r] of porDiferencia) { const gr = grupos.find((x) => cubo >= x.min && cubo < x.max)!; gr.g.push(...r.goles); gr.d.push(...r.dif); }
  for (const gr of grupos) if (gr.g.length) detalle.push(`| ${gr.min === 0 ? '< 5 %' : `${f(gr.min * 100, 0)} % o más`} | ${gr.g.length} | ${f(media(gr.g), 2)} | ${f(media(gr.d), 2)} |`);
}
console.log(detalle.join('\n'));

}
Object.assign(PARAMETROS_DE_PARTIDO, BASE);

// Un niño subido de categoría rinde menos: el mismo jugador con el potenciador de la suya y con el de la de arriba.
const alevin = equiposDe('alevin')[0]?.equipo.jugadores.filter((j) => j.titular && j.puesto !== 'GK').slice(0, 5) ?? [];
if (alevin.length) {
  const zona = (j: JugadorDePartido, pot: number): number => media(['futbol.pase', 'futbol.regate', 'futbol.definicion', 'futbol.marcaje'].map((st) => valorEnPartido(j.lector, st, pot)));
  console.log(`\nUn alevín subido a infantil rinde menos (media de pase, regate, definición y marcaje en el partido): ${f(media(alevin.map((j) => zona(j, POTENCIADOR_POR_CATEGORIA.alevin))))} en alevín y ${f(media(alevin.map((j) => zona(j, POTENCIADOR_POR_CATEGORIA.infantil))))} en infantil.`);
}
