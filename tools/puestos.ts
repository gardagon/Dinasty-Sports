/**
 * Lectura de lo que valora el motor en cada puesto del fútbol (`docs/ANEXO_PUESTOS.md`). No cambia nada del juego.
 *
 *   npm run puestos -- tabla                      los pesos de cada puesto, normalizados (los de las tablas del anexo)
 *   npm run puestos -- partida <semilla>          un personaje nuevo (ciudad grande, semana 3): sus habilidades y lo que vale en cada puesto, con la cuenta hecha
 *   npm run puestos -- guardado <archivo.json>    lo mismo con una partida guardada (la copia que da el botón «Exportar» del juego, o el JSON de `game.serialize()`)
 *   npm run puestos -- ruido <semilla>            con qué frecuencia sale cada puesto entre los tres del profesor (su azar de ±2)
 *   npm run puestos -- buscar <desde> <hasta>     recorre semillas y enseña las del personaje al que le salen portero e interior entre sus tres mejores puestos (el caso del usuario)
 *   npm run puestos -- pistas <semilla> [familia…] el consejo del profesor (puestos sin lado y porqué), lo que dice al preguntarle por cada puesto y qué entrenamiento recomendaría el entrenador (los textos que ve el jugador)
 *
 * Añade `--zurdo` para contar la pierna izquierda y `--hab futbol.reflejos=30,gen.coordinacion=70` para cambiar valores a mano.
 */
import { ENTRENAMIENTOS_DE_FUTBOL } from '../modules/futbol/src/entrenamientos';
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { conLaPierna } from '@ds/contracts';
import { futbol, PUESTOS_DE_FUTBOL, rendimientoPorPuestos } from '@ds/mod-futbol';
import { fraseDeEntrenamiento, fraseDeLectura, fraseDelPorque, familiasDePuestos, type NpcDirectory } from '@ds/contracts';
import { elegirEntrenamiento } from '@ds/kit-deporte';

registrarPais(PAIS_CIUDAD_GRANDE);
const [modo = 'tabla', ...resto] = process.argv.slice(2).filter((a) => !a.startsWith('--') || a === '--zurdo' || a === '--hab');
const argumento = (clave: string): string | undefined => {
  const i = process.argv.indexOf(clave);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const zurdo = process.argv.includes('--zurdo');
const ajustes = Object.fromEntries((argumento('--hab') ?? '').split(',').filter(Boolean).map((p) => p.split('=')).map(([k, v]) => [k, Number(v)]));
const f = (x: number, d = 1): string => x.toFixed(d).replace('.', ',');
const nombre = (id: string): string => PUESTOS_DE_FUTBOL.puestos.find((p) => p.id === id)?.nombre ?? id;

function valoresDe(stats: Readonly<Record<string, number>>): Record<string, number> {
  const mios = { ...stats, ...ajustes };
  const lector = { stat: (id: string) => mios[id] ?? 0, norm: (id: string) => (mios[id] ?? 0) / 100 };
  return conLaPierna(rendimientoPorPuestos(lector), zurdo ? 'izquierda' : 'derecha', PUESTOS_DE_FUTBOL.pierna?.ventajaDelLado ?? 0.25);
}

/** Qué habilidades de un puesto aportan más (peso × valor) y cuáles lo frenan (peso × (valor − media de sus habilidades)). */
function porQue(id: string, stats: Readonly<Record<string, number>>): string {
  const p = PUESTOS_DE_FUTBOL.puestos.find((x) => x.id === id)!;
  const mios = { ...stats, ...ajustes };
  const lineas = Object.entries(p.pesos)
    .sort((a, b) => b[1] - a[1])
    .map(([s, w]) => `${s.replace('futbol.', '')} ${f(100 * w, 0)} % × ${f(mios[s] ?? 0, 0)}`);
  return lineas.join(' · ');
}

function enseña(stats: Readonly<Record<string, number>>): void {
  const mios = { ...stats, ...ajustes };
  const hab = Object.keys(mios).filter((k) => k.startsWith('futbol.') && k !== 'futbol.conocimiento').sort();
  console.log('Habilidades de fútbol:', hab.map((k) => `${k.replace('futbol.', '')} ${f(mios[k], 0)}`).join(', '));
  console.log('Capacidades:', Object.keys(mios).filter((k) => /^gen\.(velocidad|resistencia|fuerza|coordinacion|agilidad|atencion|inteligencia|concentracion)$/.test(k)).map((k) => `${k.replace('gen.', '')} ${f(mios[k], 0)}`).join(', '), `· conocimiento ${f(mios['futbol.conocimiento'] ?? 0, 0)}`);
  const v = valoresDe(stats);
  const orden = Object.entries(v).sort((a, b) => b[1] - a[1]);
  console.log('\nValor en cada puesto (de mejor a peor):');
  for (const [id, x] of orden) console.log(`  ${id.padEnd(3)} ${nombre(id).padEnd(20)} ${f(x)}`);
  console.log('\nPor qué los tres primeros (peso × valor):');
  for (const [id] of orden.slice(0, 3)) console.log(`  ${nombre(id)}: ${porQue(id, stats)}`);
}

function personaje(seed: number): Record<string, number> {
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  advanceToWeek(g, 'gen.descansar', 3, 1, 9);
  const guardado = g.serialize() as { stats: Record<string, number> };
  return guardado.stats;
}

if (modo === 'tabla') {
  const todas = new Set(PUESTOS_DE_FUTBOL.puestos.flatMap((p) => Object.keys(p.pesos)));
  console.log(`| Habilidad | ${PUESTOS_DE_FUTBOL.puestos.map((p) => p.id).join(' | ')} |`);
  console.log(`|---|${PUESTOS_DE_FUTBOL.puestos.map(() => '---').join('|')}|`);
  for (const s of [...todas].sort()) console.log(`| ${s.replace('futbol.', '')} | ${PUESTOS_DE_FUTBOL.puestos.map((p) => (p.pesos[s] ? f(100 * p.pesos[s], 1) : '·')).join(' | ')} |`);
} else if (modo === 'partida') {
  const seed = Number(resto[0] ?? 31);
  console.log(`Semilla ${seed}${zurdo ? ' (zurdo)' : ''}\n`);
  enseña(personaje(seed));
} else if (modo === 'guardado') {
  const { readFileSync } = await import('node:fs');
  // La copia de seguridad del botón «Exportar» del juego (`{ …, state: { stats } }`) o el JSON de `game.serialize()` (`{ stats }`).
  const json = JSON.parse(readFileSync(resto[0], 'utf8')) as { stats?: Record<string, number>; state?: { stats?: Record<string, number> } };
  const stats = json.state?.stats ?? json.stats;
  if (!stats) throw new Error('El archivo no tiene `stats`: pasa la copia de seguridad de una partida (botón «Exportar» del juego).');
  enseña(stats);
} else if (modo === 'buscar') {
  const [desde, hasta] = [Number(resto[0] ?? 1), Number(resto[1] ?? 20)];
  for (let seed = desde; seed <= hasta; seed++) {
    const stats = personaje(seed);
    const top = Object.entries(valoresDe(stats)).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const ids = top.map(([id]) => id);
    const esCaso = ids.includes('GK') && ids.some((i) => i === 'LCR' || i === 'RCR') /* interior */;
    console.log(`${esCaso ? '★' : ' '} semilla ${seed}: ${top.map(([id, x]) => `${id} ${f(x)}`).join(', ')}`);
  }
} else if (modo === 'pistas') {
  const seed = Number(resto[0] ?? 31);
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  advanceToWeek(g, 'gen.descansar', 3, 1, 9);
  const dir = g.service<NpcDirectory>('npcs')!;
  const consejo = dir.consejoDeportivo?.().find((c) => c.deporte === 'futbol');
  console.log(`Semilla ${seed}\n`);
  if (!consejo) console.log('El profesor no ve nada claro en fútbol.');
  else console.log(`Profesor: «en ${consejo.nombre} te veo bien de ${consejo.puestos.map((p) => p.nombre.toLowerCase()).join(', ')}. ${fraseDelPorque(consejo) ?? ''}»\n`);
  const catalogo = futbol.actions!.filter((a) => a.train && a.id.startsWith('futbol.entrena_')).map((a) => ({ id: a.id, nombre: String(a.name), entrena: a.train!, soloClub: !ENTRENAMIENTOS_DE_FUTBOL.find((e) => `futbol.entrena_${e.id}` === a.id)?.quien.includes('solo') }));
  const pedidas = resto.slice(1);
  for (const f of familiasDePuestos(PUESTOS_DE_FUTBOL).filter((x) => !pedidas.length || pedidas.includes(x.id))) {
    const l = dir.lecturaDePuesto?.('futbol', f.id);
    if (!l) continue;
    const e = elegirEntrenamiento(catalogo, l.frenan);
    console.log(`Preguntar por ${f.nombre.toLowerCase()} [${l.nivel}]: «${fraseDeLectura(l) ?? '—'}»`);
    console.log(`  El entrenador: «${fraseDeEntrenamiento(l.pistas!, f.nombre, l.falta, e?.nombre, undefined, e?.soloClub)}»\n`);
  }
} else if (modo === 'ruido') {
  // Con qué frecuencia sale cada puesto entre los tres que nombra el profesor (valor + azar de ±2, como `consejoDeUnProfesor`), para ver cuánto es perfil y cuánto es azar.
  const stats = personaje(Number(resto[0] ?? 31));
  const v = valoresDe(stats);
  const veces: Record<string, number> = {};
  const N = 5000;
  for (let i = 0; i < N; i++) {
    const top = Object.entries(v).map(([id, x]) => [id, x + 2 * (2 * Math.random() - 1)] as const).sort((a, b) => b[1] - a[1]).slice(0, 3);
    for (const [id] of top) veces[id] = (veces[id] ?? 0) + 1;
  }
  console.log(`Semilla ${resto[0] ?? 31}: % de días en que cada puesto sale entre los tres del profesor (azar ±2):`);
  for (const [id, n] of Object.entries(veces).sort((a, b) => b[1] - a[1])) console.log(`  ${id.padEnd(3)} ${nombre(id).padEnd(20)} valor ${f(v[id])}  sale ${f((100 * n) / N, 0)} %`);
} else {
  console.log('Modos: tabla | partida <semilla> | guardado <archivo> | buscar <desde> <hasta> | ruido <semilla> | pistas <semilla> [familia…]');
}
