/**
 * ¿Cargan las partidas guardadas por la versión publicada (`main`)? `npm run compat -- <archivo.json> [semanas]`: carga el texto como lo hace la web, comprueba «Mi equipo»,
 * la plantilla, los dorsales, las caras, la comparación y el guardado en Blob, y juega unas semanas y un cambio de curso.
 */
import { readFileSync } from 'node:fs';
import { PAIS_CIUDAD_DE_PRUEBA, PAIS_CIUDAD_GRANDE, SERVICES, claveDeDeporte, registrarPais, rostroDe, servicioDeComparacion, type ComparacionService, type DeporteService, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, cargarPartida } from '@ds/game';
import { futbol, type FutbolState } from '@ds/mod-futbol';
import { deJSON, serializarPartidaPorTrozos, serializarPartida } from '../apps/web/src/almacen';

registrarPais(PAIS_CIUDAD_GRANDE);
registrarPais(PAIS_CIUDAD_DE_PRUEBA);
const [archivo, semanasMas = '10'] = process.argv.slice(2);
const mods = [...MODULOS, futbol];
const t0 = Date.now();
const { state, agenda } = deJSON(readFileSync(archivo!, 'utf8'));
const g = cargarPartida(state, mods, { copiar: false });
console.log(`cargada en ${Date.now() - t0} ms; semana ${g.time.week}`);
const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
const f = () => g.moduleState<FutbolState>('futbol') as FutbolState;
const vista = () => g.service<DeporteService>(claveDeDeporte('futbol'))!.view();
const problemas: string[] = [];
const ok = (c: boolean, m: string) => { if (!c) problemas.push(m); };

function revisar(etapa: string): void {
  const eq = dir.equipoDelPersonaje!('futbol');
  const v = vista();
  console.log(`[${etapa}] equipo del personaje: ${eq ? `${eq.club} ${eq.categoria} ${eq.letra}` : 'ninguno'}; secciones: ${(v.secciones ?? []).map((s) => s.titulo).join(' | ')}`);
  if (!eq) return;
  const plantilla = dir.plantillaDelEquipo!('futbol', eq.club, eq.categoria, eq.letra);
  ok(plantilla.length >= 8, `${etapa}: plantilla de ${plantilla.length}`);
  ok(plantilla.every((j) => j.dorsal !== undefined), `${etapa}: jugadores sin dorsal en la plantilla`);
  ok(new Set(plantilla.map((j) => j.dorsal)).size === plantilla.length, `${etapa}: dorsales repetidos`);
  const m = v.miEquipo;
  ok(!!m, `${etapa}: sin «Mi equipo»`);
  if (m) {
    ok(m.companeros.length >= 8, `${etapa}: Mi equipo con ${m.companeros.length}`);
    ok(m.companeros.every((c) => c.dorsal !== undefined), `${etapa}: Mi equipo con compañeros sin dorsal`);
    ok(new Set(m.companeros.map((c) => c.dorsal)).size === m.companeros.length, `${etapa}: Mi equipo con dorsales repetidos`);
    ok(m.companeros.filter((c) => !c.yo).every((c) => c.aspecto), `${etapa}: compañeros sin aspecto`);
    const sv = g.service<ComparacionService>(servicioDeComparacion('futbol'))!;
    for (const c of m.companeros.filter((x) => !x.yo).slice(0, 5)) sv.sobre(c.id);
    console.log(`  Mi equipo: ${m.titulo}; ${m.companeros.length} compañeros; dorsales ${m.companeros.map((c) => c.dorsal).join(',')}`);
  }
  const pj = f().personaje;
  console.log(`  personaje: dorsal en estado ${JSON.stringify(f().dorsal)}; ${JSON.stringify(pj)}`);
}

function caras(etapa: string): void {
  const ids = dir.list();
  let n = 0, medio = 0;
  for (const p of ids) {
    const a = p.rasgos?.apariencia;
    if (!a) continue;
    const r = rostroDe(a);
    n++;
    if (r.parpado[0] === 0.5 || Math.abs(r.parpado[0] - 0.5) < 0.01) medio++;
  }
  console.log(`[${etapa}] caras: ${n} leídas, ${medio} con párpado ≈0,5 (rostro de ${new Set(ids.map((p) => p.rasgos?.apariencia?.rostro?.length)).size === 1 ? ids[0]?.rasgos?.apariencia?.rostro?.length : 'varios largos'} caracteres)`);
  ok(n > 50, `${etapa}: solo ${n} caras`);
}

revisar('al cargar');
caras('al cargar');
const hasta = g.time.week + Number(semanasMas);
let w = g.time.week + 1;
const siguiente = () => { advanceToWeek(g, 'gen.descansar', w++, 2, 15); };
try {
  while (w <= hasta + 54) {
    siguiente();
    if (w === g.time.week + 3 || w === hasta + 1 || w === hasta + 54) revisar(`semana ${g.time.week}`);
  }
} catch (e) { problemas.push(`al jugar: ${(e as Error).stack}`); }
caras('al final');
const t1 = Date.now();
const b = await serializarPartidaPorTrozos(g, agenda);
console.log(`guardado en Blob: ${b ? (b.bytes / 1e6).toFixed(2) + ' MB' : 'descartado'} (${Date.now() - t1} ms); texto ${(serializarPartida(g, agenda).texto.length / 1e6).toFixed(2)} MB`);
const vuelta = deJSON(b ? await b.blob.text() : '');
const g2 = cargarPartida(vuelta.state, mods, { copiar: false });
console.log('recargada tras guardar: semana', g2.time.week);
console.log(problemas.length ? `\nPROBLEMAS:\n- ${problemas.join('\n- ')}` : '\nSin problemas.');
