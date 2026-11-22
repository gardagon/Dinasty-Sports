/**
 * Análisis de la cohorte de benjamín hasta los 18 años (solo lectura: no cambia el juego). Crea la ciudad grande con fútbol, toma a todos los niños que tienen 8 años al crear la partida (la cohorte) y avanza
 * el mundo entero año a año hasta que tienen 18 (por defecto, 10 años). Cada año guarda una fila por niño con lo que hace falta para medir el nivel, la fracción de su tope (capacidades y habilidades), el club,
 * los minutos jugados y el talento de partida, y la lista de niveles de los titulares de los equipos A de los clubes grandes (referencia para el criterio de «profesional»).
 * Se puede lanzar sobre cualquier commit (se compara el antes y el después de los entrenamientos nuevos). Después se lee con `tools/analisis-profesionales-informe.ts`.
 *
 *   npx tsx tools/analisis-profesionales.ts <salida.json> [semillas=31,32,33] [años=10]
 */
import { writeFileSync } from 'node:fs';
import { CAPACIDADES_GENETICAS, PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { fijosDeNino, topeEfectivo } from '../modules/npcs/src/rutina';
import { interesPor } from '../modules/npcs/src/deportistas';

registrarPais(PAIS_CIUDAD_GRANDE);
const salida = process.argv[2] ?? 'analisis-profesionales.json';
const semillas = (process.argv[3] ?? '31,32,33').split(',').map(Number);
const anios = Number(process.argv[4] ?? 10);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

interface Fila {
  id: string; k: number; edad: number; juega: boolean;
  club?: string; tamano?: string; colegio?: boolean; letra?: string;
  valor?: number; capF?: number[]; habF?: number[]; capPob?: number[];
  min: number; pj: number; ti: number;
}
interface Nino { id: string; potencial?: number; topeCap: number; topeFis: number; interes: number; club0?: string; tamano0?: string; colegio0?: boolean; letra0?: string; filas: Fila[] }

const resultado: Record<string, { ninos: Nino[]; ref: Record<string, Record<string, number[]>>; todos: Record<string, number[]> }> = {};
for (const seed of semillas) {
  const t0 = performance.now();
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const st0 = g.moduleState('npcs') as any;
  const pob = st0.poblaciones.find((p: any) => p.deporte === 'futbol');
  const dia0 = g.time.day;
  const edadDe = (n: any, dia: number) => Math.floor((dia - n.nacimiento) / 365);
  const ids = new Set<string>(st0.npcs.filter((n: any) => n.nacimiento !== undefined && n.genetica && edadDe(n, dia0) === 8 && n.role !== 'hermano').map((n: any) => n.id));
  const ninos = new Map<string, Nino>();
  const ref: Record<string, Record<string, number[]>> = {};
  const todos: Record<string, number[]> = {};
  const tamanoDe = (club?: string) => pob.equipos.find((e: any) => e.club === club);
  const foto = (k: number) => {
    const st = g.moduleState('npcs') as any;
    const dia = g.time.day;
    const clave = String(k);
    ref[clave] = {};
    for (const n of st.npcs) {
      if (n.nacimiento === undefined || n.deporte !== 'futbol' || !n.hab?.futbol) continue;
      const edad = edadDe(n, dia);
      const club = tamanoDe(n.equipo);
      const v = n.vp?.futbol?.valor ?? n.levels.futbol;
      (todos[`${clave}|${edad}`] ??= []).push(r3(v));
      if (club && !club.colegio && club.tamano === 'grande' && n.letra?.futbol === 'A') (ref[clave][String(edad)] ??= []).push(r3(v));
    }
    for (const n of st.npcs) {
      if (!ids.has(n.id)) continue;
      const juega = n.deporte === 'futbol' && !!n.hab?.futbol;
      let ni = ninos.get(n.id);
      const club = tamanoDe(n.equipo);
      if (!ni) {
        const caps = CAPACIDADES_GENETICAS.map((c) => topeEfectivo(n.genetica, c));
        const fis = pob.capacidades.map((c: string) => topeEfectivo(n.genetica, c));
        ni = { id: n.id, potencial: n.potential?.futbol, topeCap: r3(caps.reduce((a, b) => a + b, 0) / caps.length), topeFis: r3(fis.reduce((a: number, b: number) => a + b, 0) / fis.length), interes: interesPor(n.rasgos, 'futbol'), filas: [] };
        ninos.set(n.id, ni);
      }
      const f: Fila = { id: n.id, k, edad: edadDe(n, dia), juega, min: 0, pj: 0, ti: 0 };
      const hist = (n.estHist?.futbol ?? []) as number[][];
      const e = n.est?.futbol;
      f.pj = hist.reduce((t, h) => t + h[1], 0) + (e?.pj ?? 0);
      f.ti = hist.reduce((t, h) => t + h[2], 0) + (e?.ti ?? 0);
      f.min = hist.reduce((t, h) => t + h[3], 0) + (e?.min ?? 0);
      if (juega) {
        f.club = n.equipo; f.tamano = club?.tamano; f.colegio = club?.colegio !== undefined; f.letra = n.letra?.futbol;
        f.valor = r3(n.vp?.futbol?.valor ?? n.levels.futbol);
        f.capF = CAPACIDADES_GENETICAS.map((c, i) => r3(n.cap[i] / topeEfectivo(n.genetica, c)));
        f.capPob = pob.capacidades.map((c: string) => r3(n.cap[CAPACIDADES_GENETICAS.indexOf(c)] / topeEfectivo(n.genetica, c)));
        const fijos = fijosDeNino(n.id, n.genetica, 'futbol', pob.rutina);
        f.habF = n.hab.futbol.v.map((v: number, i: number) => (fijos.tope[i] ? r3(v / fijos.tope[i]!) : -1)).filter((x: number) => x >= 0);
        if (k === 0) { ni.club0 = n.equipo; ni.tamano0 = club?.tamano; ni.colegio0 = club?.colegio !== undefined; ni.letra0 = n.letra?.futbol; }
      }
      ni.filas.push(f);
    }
  };
  foto(0);
  for (let k = 1; k <= anios; k++) {
    advanceToWeek(g, 'gen.descansar', 52 * k, 2, 15);
    foto(k);
    console.log(`semilla ${seed}: año ${k} (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
  }
  resultado[seed] = { ninos: [...ninos.values()], ref, todos };
  writeFileSync(salida, JSON.stringify(resultado));
}
