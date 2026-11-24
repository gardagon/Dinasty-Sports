/**
 * Compara a los niños de siempre (`persona(..., conGenetica)`) con los hijos de las familias (`generarFamilias`) en lo que decide cuánto juegan: cuántos intereses tienen, con qué intensidad, cuántos lo tienen en el fútbol o en el deporte en
 * general, y la media y la dispersión de sus topes y de su ventaja de crianza. Con las variantes de `VARIANTES` (intereses: maximo|media|uno|ninguno; genética: hijo|nino). Solo mide.
 *
 *   npx tsx tools/hogares-intereses.ts [semillas=4]
 */
import { CAPACIDADES_GENETICAS, GRUPO_DE_CAPACIDAD, efectosDe, PAIS_CIUDAD_GRANDE_CON_HOGARES, idsDeColegiosDeFuera, registrarPais, rngEstable, type RegistroDeNombres } from '@ds/contracts';
import { VARIANTES, generarFamilias, persona, type Npc } from '@ds/mod-npcs';

registrarPais(PAIS_CIUDAD_GRANDE_CON_HOGARES);
const pais = PAIS_CIUDAD_GRANDE_CON_HOGARES;
const c = pais.ciudad!;
const semillas = Number(process.argv[2] ?? 4);
const demanda = (): Map<string, number> => {
  const m = new Map<string, number>();
  for (let e = 8; e < 18; e++) { m.set(`propio|${e}`, 50); for (const col of idsDeColegiosDeFuera(c)) m.set(`${col}|${e}`, 50); }
  for (let e = 18; e < 20; e++) m.set(`ninguno|${e}`, 450);
  return m;
};
const fisicas = CAPACIDADES_GENETICAS.filter((id) => GRUPO_DE_CAPACIDAD[id] === 'fisico');
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => { const m = media(xs); return Math.sqrt(media(xs.map((x) => (x - m) ** 2))); };
const fila = (nombre: string, ninos: Npc[]) => {
  const n = ninos.length;
  const ints = ninos.map((k) => Object.values(k.rasgos!.intereses));
  const dep = ninos.map((k) => Math.max(k.rasgos!.intereses.futbol ?? 0, k.rasgos!.intereses.deporte ?? 0));
  const topes = ninos.map((k) => media(CAPACIDADES_GENETICAS.map((id) => k.genetica!.topes[id])));
  const fis = ninos.map((k) => media(fisicas.map((id) => k.genetica!.topes[id])));
  const activos = ninos.map((k) => k.genetica!.perks.activos.length);
  const suma = ninos.map((k) => Object.values(efectosDe(k.genetica!.perks.activos).tope).reduce((a, b) => a + b, 0));
  const desf = ninos.map((k) => k.genetica!.desfase);
  console.log(`  perks: con alguno ${((activos.filter((x) => x > 0).length / n) * 100).toFixed(1)} % · activos por niño ${media(activos).toFixed(2)} · efecto total sobre los topes ${media(suma).toFixed(2)} (sd ${sd(suma).toFixed(2)}) · desfase ${media(desf).toFixed(2)} (sd ${sd(desf).toFixed(2)})`);
  console.log(`${nombre.padEnd(34)} | ${media(ints.map((a) => a.length)).toFixed(2)} | ${media(ints.flat()).toFixed(2)} | ${((dep.filter((x) => x > 0).length / n) * 100).toFixed(1)} % | ${((dep.filter((x) => x >= 3).length / n) * 100).toFixed(1)} % | ${media(dep.filter((x) => x > 0)).toFixed(2)} | ${media(topes).toFixed(1)} (${sd(topes).toFixed(1)}) | ${media(fis).toFixed(1)} (${sd(fis).toFixed(1)}) | ${media(ninos.map((k) => k.genetica!.ventaja)).toFixed(3)}`);
};
console.log('Niños de 8 a 19 años (ciudad grande, media de las semillas) | intereses por niño | intensidad media | con interés en fútbol o deporte | con intensidad 3 | intensidad media de los que lo tienen | tope medio (sd) | tope físico medio (sd) | ventaja de crianza');
console.log('---|---|---|---|---|---|---|---|---');
const viejos: Npc[] = [];
const variantes: [string, 'maximo' | 'media' | 'uno' | 'ninguno', 'hijo' | 'nino'][] = [['familias: intereses máximo (actual)', 'maximo', 'hijo'], ['familias: intereses media', 'media', 'hijo'], ['familias: intereses de uno', 'uno', 'hijo'], ['familias: sin heredar intereses', 'ninguno', 'hijo'], ['familias: genética de niño de siempre', 'maximo', 'nino']];
const porVariante = variantes.map(() => [] as Npc[]);
for (let s = 0; s < semillas; s++) {
  const rng = rngEstable('hogares-intereses', s);
  const usados: RegistroDeNombres = new Map();
  for (let i = 0; i < 2000; i++) viejos.push(persona(rng, `nino_${i}`, 'vecino', 8 + (i % 12), 0, usados, [], () => 'Niño.', [], true));
  variantes.forEach(([, i, g], k) => {
    VARIANTES.intereses = i; VARIANTES.genetica = g;
    const r = generarFamilias({ rng: rngEstable('hogares-intereses', s, k), seed: 31 + s, pais, usados: new Map(), demanda: demanda(), dia: 0, desde: 1, desdePeques: 1, pequenos: false });
    porVariante[k].push(...[...r.ninos.values()].flat());
  });
}
fila('niños de siempre (sin familia)', viejos);
variantes.forEach(([nombre], k) => fila(nombre, porVariante[k]));
