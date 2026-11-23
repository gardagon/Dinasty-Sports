/**
 * De los niños de 8 años que hay al crear la partida, qué parte tiene un hermano mayor en el mundo (de 9 a 19 años), para distintos valores de `FAMILIAS.siguiente` (probabilidad de un hermano más pequeño después del 1.º, 2.º, 3.º y
 * 4.º hijo). Es la medida que se contrasta con el orden de nacimiento de la vida real (`docs/relevo/hogares.md`). Solo mide: no cambia el juego.
 *
 *   npx tsx tools/hogares-orden.ts [semillas=5]
 */
import { CAPACIDADES_GENETICAS as _c, PAIS_CIUDAD_GRANDE_CON_HOGARES, idsDeColegiosDeFuera, registrarPais, rngEstable, type RegistroDeNombres } from '@ds/contracts';
import { FAMILIAS, generarFamilias } from '@ds/mod-npcs';

registrarPais(PAIS_CIUDAD_GRANDE_CON_HOGARES);
const pais = PAIS_CIUDAD_GRANDE_CON_HOGARES;
const c = pais.ciudad!;
const semillas = Number(process.argv[2] ?? 5);
const demanda = (): Map<string, number> => {
  const m = new Map<string, number>();
  for (let e = 8; e < 18; e++) { m.set(`propio|${e}`, c.aulasPorCurso * c.alumnosPorAula - (e === 8 ? 1 : 0)); for (const col of idsDeColegiosDeFuera(c)) m.set(`${col}|${e}`, c.alumnosPorCursoDeCadaColegio); }
  for (let e = 18; e < 20; e++) m.set(`ninguno|${e}`, c.alumnosPorCursoDeCadaColegio * c.colegiosDeFuera);
  return m;
};
const candidatos: number[][] = [[0.55, 0.3, 0.2, 0.15], [0.6, 0.35, 0.25, 0.2], [0.65, 0.4, 0.3, 0.2], [0.7, 0.4, 0.3, 0.2], [0.75, 0.45, 0.3, 0.2], [0.8, 0.45, 0.3, 0.2]];
console.log('siguiente (1.º,2.º,3.º,4.º) | con hermano mayor a los 8 años | con hermano mayor de 8 a 12 años (media) | hijos por familia (8–19) | menores de 8 por cada 100 niños de 8–19');
for (const sig of candidatos) {
  (FAMILIAS.siguiente as unknown as number[]).splice(0, 4, ...sig);
  let con = 0, de8 = 0, hijosTot = 0, fams = 0, pequenos = 0;
  for (let s = 0; s < semillas; s++) {
    const usados: RegistroDeNombres = new Map();
    const r = generarFamilias({ rng: rngEstable('hogares-orden', s, sig.join()), seed: 31 + s, pais, usados, demanda: demanda(), dia: 0, desde: 1, desdePeques: 1, pequenos: true });
    const todos = [...r.ninos.values()].flat();
    const porHogar = new Map<string, number[]>();
    for (const n of todos) { const e = Math.round(-n.nacimiento! / 365); porHogar.set(n.hogar!, [...(porHogar.get(n.hogar!) ?? []), e]); }
    for (const [, edades] of porHogar) { fams++; hijosTot += edades.length; for (const e of edades) if (e === 8) { de8++; if (edades.some((x) => x > 8)) con++; } }
    pequenos += r.pequenos.length;
  }
  console.log(`${sig.join('/')} | ${((con / de8) * 100).toFixed(1)} % | - | ${(hijosTot / fams).toFixed(2)} | ${((pequenos / hijosTot) * 100).toFixed(1)}`);
}
