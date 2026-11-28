/**
 * Cifras de los colegios en benjamín y alevín al crear la partida (ciudad grande): alumnos por curso, cuántos quieren jugar (chicos y chicas), cuántos juegan en el equipo del colegio y cuántos en clubes de fuera, y los equipos del colegio (tamaños).
 * Solo mide. `npx tsx tools/colegios-cifras.ts 1-20`.
 */
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { colegioDeNinoPublico, edadDeJuego, interesDe, type NpcsState } from '@ds/mod-npcs';
registrarPais(PAIS_CIUDAD_GRANDE);
const arg = process.argv[2] ?? '1-5';
const [a, b] = arg.includes('-') ? arg.split('-').map(Number) : [Number(arg), Number(arg)];
const filas: Record<string, { n: number; cursos: number; alumnos: number; int: number; intM: number; intF: number; juegaCol: number; juegaFuera: number; sinEquipo: number; equipos: number[] }> = {};
for (let seed = a; seed <= b; seed++) {
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const clubDe = new Map(pob.equipos.filter((e) => e.colegio !== undefined).map((e) => [e.colegio!, e.club]));
  for (const cat of ['benjamin', 'alevin']) {
    const c = pob.categorias!.find((x) => x.id === cat)!;
    const ninos = s.npcs.filter((n) => { const ed = edadDeJuego(n, 0) ?? -1; return n.genetica && ed >= c.edadMin && ed <= c.edadMax && colegioDeNinoPublico(n) !== 'ninguno'; });
    for (const col of new Set(ninos.map((n) => colegioDeNinoPublico(n)))) {
      const clave = `${cat} ${col === 'propio' ? 'COLEGIO DEL PERSONAJE' : clubDe.has(col) ? `${col} (con club)` : `${col} (sin club)`}`;
      const f = (filas[clave] ??= { n: 0, cursos: 0, alumnos: 0, int: 0, intM: 0, intF: 0, juegaCol: 0, juegaFuera: 0, sinEquipo: 0, equipos: [] });
      const suyos = ninos.filter((n) => colegioDeNinoPublico(n) === col);
      f.n++; f.alumnos += suyos.length;
      const quieren = suyos.filter((n) => interesDe(n, 'futbol', edadDeJuego(n, 0)) > 0 && !n.dejado?.includes('futbol'));
      f.int += quieren.length; f.intM += quieren.filter((n) => n.gender !== 'f').length; f.intF += quieren.filter((n) => n.gender === 'f').length;
      const club = clubDe.get(col);
      for (const n of quieren) { if (!n.equipo) f.sinEquipo++; else if (club && n.equipo === club) f.juegaCol++; else f.juegaFuera++; }
      if (club) { const por: Record<string, number> = {}; for (const n of s.npcs) { const ed = edadDeJuego(n, 0) ?? -1; if (n.equipo === club && ed >= c.edadMin && ed <= c.edadMax) { const l = n.letra?.futbol ?? '-'; por[l] = (por[l] ?? 0) + 1; } } f.equipos.push(...Object.values(por)); }
    }
  }
}
const med = (x: number, n: number) => (x / n).toFixed(1);
for (const [k, f] of Object.entries(filas).sort()) {
  const eq = f.equipos.length ? `equipos ${f.equipos.length / f.n} de media, tamaños ${[...f.equipos].sort((x, y) => x - y).join(',')}` : '';
  console.log(`${k.padEnd(48)} alumnos/curso ${med(f.alumnos, f.n)} · quieren jugar ${med(f.int, f.n)} (chicos ${med(f.intM, f.n)}, chicas ${med(f.intF, f.n)}) · en el colegio ${med(f.juegaCol, f.n)} · en clubes de fuera ${med(f.juegaFuera, f.n)} · sin equipo ${med(f.sinEquipo, f.n)} ${eq}`);
}
