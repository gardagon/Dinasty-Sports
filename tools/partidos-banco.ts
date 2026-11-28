/**
 * EL BANCO DE REALISMO DE LOS PARTIDOS (P0 de `docs/relevo/partidos-reales.md` §5.3): juega partidos entre equipos reales de la zona con el motor (`jugarPartido`), saca las cifras que dicen si un partido «se parece a un
 * partido» y las compara con **la referencia guardada** (`docs/relevo/partidos-banco-referencia.json`: lo que daba el motor cuando se calibró). Sirve para dos cosas:
 *   1. que una reorganización no cambie el motor (con el mismo código, todas las cifras salen exactamente igual: `✅ igual`);
 *   2. que un motor nuevo (P1 en adelante) enseñe **qué cambia** y cuánto, por categoría, frente a lo anterior y frente a lo que se sabe de un partido real.
 *
 * `npm run partidos:banco -- [partidos por categoría = 300] [prueba|grande] [--guardar-referencia] [--estricto]`
 *   --guardar-referencia  escribe las cifras de ahora como referencia (solo cuando el cambio de motor es a propósito y está decidido);
 *   --estricto            sale con error si alguna cifra se sale de su tolerancia (para `npm run check` o un CI).
 * Las cifras que el motor de hoy no tiene (faltas, tarjetas, córners, pases) salen como «—» y las rellenan los motores nuevos.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { PAIS_CIUDAD_GRANDE, PAIS_CIUDAD_DE_PRUEBA, registrarPais, rngEstable } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PUESTOS_DE_FUTBOL, convocarYAlinear, equipoDePartido, futbol, jugarPartido, type EquipoDePartido, type ResultadoDePartido } from '@ds/mod-futbol';
import { plantillaDeUnEquipo, type NpcsState } from '@ds/mod-npcs';

const args = process.argv.slice(2);
const banderas = new Set(args.filter((a) => a.startsWith('--')));
const posicionales = args.filter((a) => !a.startsWith('--'));
const PARTIDOS = Number(posicionales[0] ?? 300);
const GRANDE = (posicionales[1] ?? 'prueba') === 'grande';
const CIUDAD = GRANDE ? 'grande' : 'prueba';
const REFERENCIA = new URL('../docs/relevo/partidos-banco-referencia.json', import.meta.url);
registrarPais(GRANDE ? PAIS_CIUDAD_GRANDE : PAIS_CIUDAD_DE_PRUEBA);
const f = (x: number, d = 2): string => x.toFixed(d);
const media = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const CATEGORIAS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
const CAMBIOS = { maximo: 5, despuesDeTramos: [1, 3, 4] };

/**
 * Lo que se mide. `tolerancia` es lo que puede moverse la cifra frente a la referencia sin que sea un aviso (absoluta, en las unidades de la cifra): el azar de un banco de N partidos y un cambio pequeño y buscado
 * caben dentro; un cambio de motor se ve fuera. `real` es el orden de magnitud de un partido de fútbol profesional adulto (**de memoria, a contrastar con FBref/Opta**: `partidos-reales.md` §5.1) y solo informa.
 */
const CIFRAS: { id: string; nombre: string; tolerancia: number; decimales: number; real?: string }[] = [
  { id: 'goles', nombre: 'Goles por partido', tolerancia: 0.25, decimales: 2, real: '2,6–2,8' },
  { id: 'tiros', nombre: 'Tiros (los dos equipos)', tolerancia: 2, decimales: 1, real: '24–26' },
  { id: 'cero', nombre: '0 a 0 (%)', tolerancia: 2, decimales: 1, real: '7–8' },
  { id: 'goleadas', nombre: 'Partidos de 6 goles o más (%)', tolerancia: 3, decimales: 1 },
  { id: 'local', nombre: 'Gana el local (%)', tolerancia: 4, decimales: 1, real: '44–46' },
  { id: 'empate', nombre: 'Empate (%)', tolerancia: 4, decimales: 1, real: '24–27' },
  { id: 'posesion', nombre: 'Posesión del local (%)', tolerancia: 2, decimales: 1 },
  { id: 'posesionSd', nombre: 'Desviación de la posesión (puntos)', tolerancia: 2, decimales: 1 },
  { id: 'golesDelantero', nombre: 'Goles de los delanteros (% de los de campo)', tolerancia: 4, decimales: 1, real: '≈ 50' },
  { id: 'golesMedio', nombre: 'Goles de los de medio (%)', tolerancia: 4, decimales: 1, real: '≈ 35–40' },
  { id: 'golesDefensa', nombre: 'Goles de los defensas (%)', tolerancia: 3, decimales: 1, real: '≈ 10–12' },
  { id: 'nota', nombre: 'Nota media de los titulares de campo (≥ 60 min)', tolerancia: 0.1, decimales: 2, real: '6' },
  { id: 'suplentes', nombre: 'Suplentes que juegan (%)', tolerancia: 4, decimales: 1 },
  { id: 'golesPrimera', nombre: 'Goles en la primera parte (% del total)', tolerancia: 3, decimales: 1, real: '≈ 44' },
];
type Cifras = Record<string, number>;
/** El registro del partido (si el motor aún no lo tiene, la crónica, para poder medir también el motor anterior). */
const registroDe = (r: ResultadoDePartido): unknown[] => (r as { registro?: unknown[] }).registro ?? r.cronica;
const linea = (puesto: string): 'GK' | 'DEF' | 'MID' | 'ATT' => {
  const g = PUESTOS_DE_FUTBOL.reparto.find((x) => x.puestos.includes(puesto))?.grupo;
  return g === 'portero' ? 'GK' : g === 'central' || g === 'lateral' ? 'DEF' : g === 'delantero' ? 'ATT' : 'MID';
};

// ------------------------------------------------------------------------------------------------------------- los equipos reales de la zona

const g = nuevaPartida({ seed: 31, ...(GRANDE ? { pais: PAIS_CIUDAD_GRANDE.id } : {}), deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
const s = g.moduleState<NpcsState>('npcs') as NpcsState;
const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
const clubes = [...new Set(s.npcs.filter((n) => n.deporte === 'futbol' && n.equipo).map((x) => `${x.equipo}`))].sort();
function equiposDe(cat: string): EquipoDePartido[] {
  const res: EquipoDePartido[] = [];
  for (const club of clubes) {
    for (const letra of ['A', 'B', 'C', 'D']) {
      const pl = plantillaDeUnEquipo(s.npcs, [pob], 'futbol', club, cat, letra, 0);
      if (pl.length < 14) continue;
      const c = convocarYAlinear(pl);
      if (c.titulares.length < 11) continue;
      res.push(equipoDePartido(`${club}|${letra}`, `${club} ${letra}`, pl, c));
    }
  }
  return res;
}

// ------------------------------------------------------------------------------------------------------------- jugar y medir

const medidas: Record<string, Cifras> = {};
const extras: Record<string, { ms: number; sucesos: number; kb: number; partidos: number; equipos: number }> = {};
for (const cat of CATEGORIAS) {
  const equipos = equiposDe(cat);
  if (equipos.length < 2) continue;
  const rng = rngEstable('banco', cat);
  const rs: { r: ResultadoDePartido; a: EquipoDePartido; b: EquipoDePartido }[] = [];
  let ms = 0;
  for (let i = 0; i < PARTIDOS; i++) {
    const x = Math.floor(rng.next() * equipos.length);
    let y = Math.floor(rng.next() * equipos.length);
    if (y === x) y = (y + 1) % equipos.length;
    const t0 = performance.now();
    const r = jugarPartido(equipos[x], equipos[y], { id: `banco-${cat}-${i}`, semilla: 31, categoria: cat, cambios: CAMBIOS });
    ms += performance.now() - t0;
    rs.push({ r, a: equipos[x], b: equipos[y] });
  }
  const total = rs.map(({ r }) => r.goles[0] + r.goles[1]);
  const goleadores = { ATT: 0, MID: 0, DEF: 0, GK: 0 };
  const notas: number[] = [];
  let suplentes = 0, suplentesQueJuegan = 0, primera = 0;
  for (const { r, a, b } of rs) {
    const porId = new Map([...a.jugadores, ...b.jugadores].map((j) => [j.id, j]));
    for (const [id, st] of Object.entries(r.jugadores)) {
      const j = porId.get(id)!;
      goleadores[linea(st.puesto)] += st.goles;
      if (!j.titular) { suplentes++; if (st.minutos > 0) suplentesQueJuegan++; }
      else if (st.minutos >= 60 && st.puesto !== 'GK') notas.push(st.nota);
    }
    primera += r.porTramo.slice(0, 3).reduce((t, x) => t + x.goles[0] + x.goles[1], 0);
  }
  const golesDeCampo = goleadores.ATT + goleadores.MID + goleadores.DEF || 1;
  const posesiones = rs.map(({ r }) => media(r.porTramo.map((x) => x.posesion[0])));
  const pos = media(posesiones);
  const nos = (x: number): number => (100 * x) / PARTIDOS;
  medidas[cat] = {
    goles: media(total),
    tiros: media(rs.map(({ r }) => r.tiros[0] + r.tiros[1])),
    cero: nos(total.filter((x) => x === 0).length),
    goleadas: nos(total.filter((x) => x >= 6).length),
    local: nos(rs.filter(({ r }) => r.goles[0] > r.goles[1]).length),
    empate: nos(rs.filter(({ r }) => r.goles[0] === r.goles[1]).length),
    posesion: 100 * pos,
    posesionSd: 100 * Math.sqrt(media(posesiones.map((p) => (p - pos) ** 2))),
    golesDelantero: (100 * goleadores.ATT) / golesDeCampo,
    golesMedio: (100 * goleadores.MID) / golesDeCampo,
    golesDefensa: (100 * goleadores.DEF) / golesDeCampo,
    nota: media(notas),
    suplentes: (100 * suplentesQueJuegan) / Math.max(1, suplentes),
    golesPrimera: (100 * primera) / Math.max(1, total.reduce((a, b) => a + b, 0)),
  };
  extras[cat] = { ms: ms / PARTIDOS, sucesos: media(rs.map(({ r }) => registroDe(r).length)), kb: media(rs.map(({ r }) => JSON.stringify(registroDe(r)).length)) / 1024, partidos: PARTIDOS, equipos: equipos.length };
}

// ------------------------------------------------------------------------------------------------------------- referencia, comparación e informe

const guardada: Record<string, Record<string, Cifras>> = existsSync(REFERENCIA) ? JSON.parse(readFileSync(REFERENCIA, 'utf8')) : {};
if (banderas.has('--guardar-referencia')) {
  const redondeadas = Object.fromEntries(Object.entries(medidas).map(([c, m]) => [c, Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v * 10000) / 10000]))]));
  writeFileSync(REFERENCIA, JSON.stringify({ ...guardada, [`${CIUDAD}-${PARTIDOS}`]: redondeadas }, null, 2) + '\n');
  console.log(`Referencia guardada: ${CIUDAD}-${PARTIDOS} en ${REFERENCIA.pathname}`);
}
const ref = (guardada[`${CIUDAD}-${PARTIDOS}`] ?? undefined) as Record<string, Cifras> | undefined;
console.log(`Banco de realismo de los partidos (${GRANDE ? 'ciudad grande' : 'ciudad de prueba'}; ${PARTIDOS} partidos por categoría entre equipos reales de la zona, parejas al azar con semilla fija)\n`);
console.log(ref ? `Se compara con la referencia guardada (\`${CIUDAD}-${PARTIDOS}\`): ✅ dentro de la tolerancia, ⚠️ fuera de ella; «igual» si coincide al céntimo.\n` : `No hay referencia guardada para \`${CIUDAD}-${PARTIDOS}\`: usa --guardar-referencia para crearla.\n`);
let avisos = 0, iguales = 0, comparadas = 0;
console.log(`| Cifra | ${CATEGORIAS.join(' | ')} | Fútbol profesional adulto (a contrastar) |`);
console.log(`|---|${CATEGORIAS.map(() => '---').join('|')}|---|`);
for (const c of CIFRAS) {
  const celdas = CATEGORIAS.map((cat) => {
    const v = medidas[cat]?.[c.id];
    if (v === undefined) return '—';
    const r = ref?.[cat]?.[c.id];
    if (r === undefined) return f(v, c.decimales);
    comparadas++;
    const d = v - r;
    if (Math.abs(d) < 0.00005) { iguales++; return `${f(v, c.decimales)} ✅ igual`; }
    if (Math.abs(d) <= c.tolerancia) return `${f(v, c.decimales)} ✅ (${d > 0 ? '+' : ''}${f(d, c.decimales)})`;
    avisos++;
    return `${f(v, c.decimales)} ⚠️ (${d > 0 ? '+' : ''}${f(d, c.decimales)})`;
  });
  console.log(`| ${c.nombre} | ${celdas.join(' | ')} | ${c.real ?? ''} |`);
}
const SIN_MOTOR = ['Faltas por partido', 'Amarillas por partido', 'Rojas por partido', 'Córners por partido', 'Tiros a puerta', 'xG por tiro', 'Pases y precisión de pase'];
console.log(`| ${SIN_MOTOR.join(' · ')} | ${CATEGORIAS.map(() => '—').join(' | ')} | el motor de hoy no los tiene (P1) |`);
console.log('\nCoste y tamaño (no se comparan: dependen de la máquina):\n');
console.log(`| Categoría | Equipos | ms por partido (solo el motor) | Sucesos en el registro | KB del registro (JSON) |\n|---|---|---|---|---|`);
for (const cat of CATEGORIAS) if (extras[cat]) console.log(`| ${cat} | ${extras[cat].equipos} | ${f(extras[cat].ms, 3)} | ${f(extras[cat].sucesos, 1)} | ${f(extras[cat].kb, 1)} |`);
const todos = Object.values(extras);
if (todos.length) console.log(`\nMedia de las categorías: ${f(media(todos.map((x) => x.ms)), 3)} ms por partido.`);
if (ref) console.log(`\n${comparadas} cifras comparadas: ${iguales} exactamente iguales, ${avisos} fuera de tolerancia.`);
if (banderas.has('--estricto') && avisos > 0) process.exit(1);
