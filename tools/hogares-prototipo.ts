/**
 * Prototipo de la generación hacia delante (familias primero) del addendum de `docs/relevo/hogares.md`. NO cambia el juego ni guarda nada: con la ciudad grande calcula la demanda de niños por colegio y edad (la
 * que hoy cubren `poblarElColegio` y `ninosDeOtrosColegios`), genera familias (pareja con rasgos, topes y perks propios; hijos con la herencia del personaje: `rasgosHeredadosNpc`, `geneticaDeHermano`,
 * `identidadDeHijo`) hasta cubrirla y mide tiempo, peso y cuánto se parece lo que sale a lo de ahora.
 *
 *   npx tsx tools/hogares-prototipo.ts [grande|actual|prueba] [semilla]
 */
import {
  CAPACIDADES_GENETICAS, CIUDAD_ACTUAL, CIUDAD_DE_PRUEBA, GRUPO_DE_CAPACIDAD, PAIS_CIUDAD_GRANDE, PAIS_ESPANA, calidadDePadreDelMundo, demografiaDelLugar, identidadAlAzar, identidadDeHijo, nombreCompleto,
  nombrePermitido, origenesDePareja, parejasDelLugar, perfilDePadre, perksDePadre, rasgosAlAzar, rasgosHeredadosNpc, registrarNombre, registrarPais, rngEstable, type PaisDef, type RasgosDe, type RegistroDeNombres, type Rng,
  idsDeColegiosDeFuera, estaturaZ, RASGOS_DE_ROSTRO, rostroDe,
} from '@ds/contracts';
import { geneticaDeHermano } from '../modules/npcs/src/deportistas';
import { persona } from '@ds/mod-npcs';

const cual = process.argv[2] ?? 'grande';
const semilla = Number(process.argv[3] ?? 31);
const pais: PaisDef = cual === 'grande' ? PAIS_CIUDAD_GRANDE : cual === 'prueba' ? { ...PAIS_ESPANA, ciudad: CIUDAD_DE_PRUEBA } : { ...PAIS_ESPANA, ciudad: CIUDAD_ACTUAL };
registrarPais(pais);
const ciudad = pais.ciudad ?? CIUDAD_ACTUAL;
const rng: Rng = rngEstable('hogares-prototipo', semilla);
const t0 = performance.now();

// ---- 1. Demanda: cuántos niños hacen falta por colegio y edad (lo mismo que hoy)
const EDAD_MIN = 8, EDAD_FIN_COLEGIO = 18, EDAD_FIN_JOVENES = 20;
const colegios = ['propio', ...idsDeColegiosDeFuera(ciudad)];
const demanda = new Map<string, number>(); // `${colegio}|${edad}`
const propiosPorCurso = ciudad.aulasPorCurso * ciudad.alumnosPorAula;
for (let e = EDAD_MIN; e < EDAD_FIN_COLEGIO; e++) {
  demanda.set(`propio|${e}`, propiosPorCurso - (e === EDAD_MIN ? 1 : 0)); // el 8 del personaje es uno de los de su clase
  for (const c of colegios.slice(1)) demanda.set(`${c}|${e}`, ciudad.alumnosPorCursoDeCadaColegio);
}
for (let e = EDAD_FIN_COLEGIO; e < EDAD_FIN_JOVENES; e++) demanda.set(`ninguno|${e}`, ciudad.alumnosPorCursoDeCadaColegio * ciudad.colegiosDeFuera);
const restante = new Map(demanda);
const totalDemanda = [...demanda.values()].reduce((a, b) => a + b, 0);
const porEdad = (e: number) => [...restante].filter(([k]) => k.endsWith(`|${e}`)).reduce((s, [, v]) => s + v, 0);
const quedaDe = (e: number) => porEdad(e);
const elegirColegio = (e: number, preferido?: string): string | undefined => {
  if (preferido && (restante.get(`${preferido}|${e}`) ?? 0) > 0) return preferido;
  const opciones = [...restante].filter(([k, v]) => k.endsWith(`|${e}`) && v > 0);
  if (!opciones.length) return undefined;
  let u = rng.next() * opciones.reduce((s, [, v]) => s + v, 0);
  for (const [k, v] of opciones) { if (u < v) return k.split('|')[0]; u -= v; }
  return opciones[0][0].split('|')[0];
};

// ---- 2. Parámetros de las familias
const P = {
  siguiente: [0.55, 0.3, 0.2, 0.15], // probabilidad de un hermano más pequeño después del 1.º, 2.º, 3.º y 4.º
  separacion: [[1, 0.22], [2, 0.3], [3, 0.22], [4, 0.14], [5, 0.08], [6, 0.04]] as [number, number][], // años con el siguiente
  mellizos: 0.04,
  monoparental: 0.2,
  mismoColegio: 0.75, // un hermano va al colegio de su hermano si hay hueco
  edadMadre: { media: 31, sd: 4.5, min: 19, max: 42 }, // al nacer el mayor
};
const normal = () => { let s = 0; for (let i = 0; i < 6; i++) s += rng.next(); return (s - 3) * Math.SQRT2; };
const pesado = (xs: [number, number][]): number => { let u = rng.next(); for (const [v, p] of xs) { if (u < p) return v; u -= p; } return xs[0][0]; };

// ---- 3. Generación
interface Adulto { id: string; name: string; pila: string; gender: 'f' | 'm'; edad: number; rasgos: RasgosDe; identidad: ReturnType<typeof identidadAlAzar>; nacimiento: number; topes: Record<string, number>; perks: ReturnType<typeof perksDePadre>; calidad: number }
const usados: RegistroDeNombres = new Map();
const demografia = demografiaDelLugar(pais);
const parejas = parejasDelLugar(pais);
let nAdulto = 0, nHijo = 0;
const nacimientoDe = (edad: number) => -Math.round(edad * 365) - rng.int(0, 364);
const adulto = (gender: 'f' | 'm', edad: number, origen: ReturnType<typeof origenesDePareja>[0]): Adulto => {
  const rasgos = rasgosAlAzar(rng, { origen, sexo: gender, demografia });
  const nacimiento = nacimientoDe(edad);
  let identidad = identidadAlAzar(rng, gender, rasgos.origen, { edad, pais });
  for (let k = 0; k < 60 && !nombrePermitido(usados, nombreCompleto(identidad, gender), nacimiento); k++) identidad = identidadAlAzar(rng, gender, rasgos.origen, { edad, pais });
  const name = nombreCompleto(identidad, gender);
  registrarNombre(usados, name, nacimiento);
  const calidad = calidadDePadreDelMundo(rng);
  const perfil = perfilDePadre(CAPACIDADES_GENETICAS, rng, calidad, GRUPO_DE_CAPACIDAD);
  return { id: `adulto_${++nAdulto}`, name, pila: identidad.pila, gender, edad, rasgos, identidad, nacimiento, topes: perfil.topes, perks: perksDePadre(rng), calidad };
};
interface Hijo { padre: Adulto; madre: Adulto; apellidos: string; id: string; edad: number; gender: 'f' | 'm'; json: string; colegio: string; familia: number }
const adultos: Adulto[] = [], hijos: Hijo[] = [];
const familias: { padres: number; hijos: number[]; menoresDe8: number; monoparental: boolean }[] = [];
let pendientes0a7 = 0;
const tablaEdades = new Map<number, number>();

for (let a = EDAD_FIN_JOVENES - 1; a >= EDAD_MIN; a--) {
  while (quedaDe(a) > 0) {
    // La pareja (la madre tiene la edad al nacer el mayor; el padre, un poco más)
    const edadMadre = Math.round(Math.min(P.edadMadre.max, Math.max(P.edadMadre.min, P.edadMadre.media + normal() * P.edadMadre.sd))) + a;
    const edadPadre = Math.max(edadMadre - 3, Math.round(edadMadre + 2.5 + normal() * 3));
    const [oPadre, oMadre] = parejas ? origenesDePareja(rng, demografia, pais.origenesLocales, parejas) : [undefined as never, undefined as never];
    const padre = adulto('m', edadPadre, oPadre);
    const madre = adulto('f', edadMadre, oMadre);
    const mono = rng.chance(P.monoparental);
    const residentes = mono ? [rng.chance(0.8) ? madre : padre] : [padre, madre];
    adultos.push(...residentes);
    // Los hijos: el mayor con la edad `a` y los siguientes con un hueco de años; los menores de 8 quedan pendientes (H2: bebés)
    const f = { padres: residentes.length, hijos: [] as number[], menoresDe8: 0, monoparental: mono };
    const idxF = familias.length;
    let edad = a;
    let primero = true;
    let colegioDelPrimero: string | undefined;
    for (let k = 0; ; k++) {
      if (!primero) {
        if (!rng.chance(P.siguiente[Math.min(k - 1, P.siguiente.length - 1)])) break;
        edad -= rng.chance(P.mellizos) ? 0 : pesado(P.separacion);
      }
      primero = false;
      if (edad < EDAD_MIN) { f.menoresDe8++; pendientes0a7++; if (edad < 0) break; continue; }
      const colegio = elegirColegio(edad, colegioDelPrimero);
      if (!colegio) continue; // la edad ya está completa: ese hijo no cabe en el mundo (sigue en otro sitio)
      colegioDelPrimero ??= colegio;
      restante.set(`${colegio}|${edad}`, restante.get(`${colegio}|${edad}`)! - 1);
      const gender: 'f' | 'm' = rng.chance(0.5) ? 'f' : 'm';
      const rasgos = rasgosHeredadosNpc(padre.rasgos, madre.rasgos, rng, gender);
      const id = `hijo_${++nHijo}`;
      const nac = nacimientoDe(edad);
      let identidad = identidadDeHijo(rng, gender, padre.identidad, madre.identidad, rasgos.origen, { edad, pais });
      for (let q = 0; q < 60 && !nombrePermitido(usados, nombreCompleto(identidad, gender), nac); q++) identidad = identidadDeHijo(rng, gender, padre.identidad, madre.identidad, rasgos.origen, { edad, pais });
      const name = nombreCompleto(identidad, gender);
      registrarNombre(usados, name, nac);
      const genetica = geneticaDeHermano(rng, { padre: padre.topes, madre: madre.topes }, { padre: padre.perks, madre: madre.perks }, rngEstable('perks', semilla, id), semilla, id);
      const json = JSON.stringify({
        id, name, nombrePila: identidad.pila, role: 'vecino', gender, tags: [], levels: {}, potential: {}, rasgos, nacimiento: nac, known: false,
        tipos: [{ tipo: 'vecino', escolar: true }], genetica, perks: genetica.perks, desfase: genetica.desfase, colegio,
        hogar: `h${idxF}`, padres: [padre.id, madre.id], estatura: 0.45 * (estaturaZ(padre.id) + estaturaZ(madre.id)) + 0.6 * estaturaZ(id), description: 'Alumno de otro colegio.',
      });
      f.hijos.push(hijos.length);
      hijos.push({ padre, madre, apellidos: name.slice(identidad.pila.length).trim(), id, edad, gender, json, colegio, familia: idxF });
      tablaEdades.set(edad, (tablaEdades.get(edad) ?? 0) + 1);
    }
    familias.push(f);
  }
}
const ms = performance.now() - t0;

// ---- 4. Resultados
const kb = (x: number) => `${(x / 1024).toFixed(0)} KB`;
const pesoAdulto = (x: Adulto) => JSON.stringify({ id: x.id, name: x.name, nombrePila: x.pila, role: 'vecino', gender: x.gender, tags: [], levels: {}, potential: {}, rasgos: x.rasgos, nacimiento: x.nacimiento, known: false, tipos: [{ tipo: 'vecino' }], hogar: 'h0', herencia: { t: CAPACIDADES_GENETICAS.map((c) => Math.round(x.topes[c])), p: x.perks }, description: 'Vecino del barrio.' }).length;
const bytesAdultos = adultos.reduce((s, x) => s + pesoAdulto(x), 0);
const bytesHijos = hijos.reduce((s, h) => s + h.json.length, 0);
const sinCubrir = [...restante].reduce((s, [, v]) => s + v, 0);
const distHijos = [1, 2, 3, 4, 5].map((n) => familias.filter((f) => f.hijos.length === n).length);
console.log(`Ciudad ${cual} (semilla ${semilla}): demanda ${totalDemanda} niños de 8 a 19 años en ${colegios.length} colegios`);
console.log(`Generadas ${familias.length} familias en ${(ms / 1000).toFixed(2)} s: ${hijos.length} hijos (sin cubrir: ${sinCubrir}) y ${adultos.length} adultos residentes (${familias.filter((f) => f.monoparental).length} monoparentales)`);
console.log(`Por familia, hijos de 8 a 19 en el mundo: ${distHijos.map((c, i) => `${i + 1}→${c}`).join('  ')}; media ${(hijos.length / familias.length).toFixed(2)}; hijos menores de 8 pendientes (para H2): ${pendientes0a7}`);
console.log(`Peso: hijo ${(bytesHijos / hijos.length).toFixed(0)} B (el de hoy, con genética: ~2.887 B ya con capacidades; aquí aún sin ellas); adulto ${(bytesAdultos / adultos.length).toFixed(0)} B con su herencia (topes y perks) → ${kb(bytesHijos)} + ${kb(bytesAdultos)}`);
console.log(`Tiempo por persona: ${((ms * 1000) / (hijos.length + adultos.length)).toFixed(0)} µs (hijos+adultos); por familia ${((ms * 1000) / familias.length).toFixed(0)} µs`);
const porColegioEdad = [...demanda].every(([k]) => (restante.get(k) ?? 0) <= 0);
console.log(`Demanda cubierta exactamente por colegio y edad: ${porColegioEdad ? 'sí' : 'no'}`);
const hermanosMismoColegio = familias.filter((f) => f.hijos.length > 1).map((f) => new Set(f.hijos.map((i) => hijos[i].colegio)).size === 1).filter(Boolean).length;
console.log(`Familias con 2+ hijos en el mundo: ${familias.filter((f) => f.hijos.length > 1).length}; con todos en el mismo colegio: ${hermanosMismoColegio}`);
// Fidelidad: origen y apellidos de los hijos
const conPadreDeFuera = hijos.filter((h) => JSON.parse(h.json).rasgos.origen.some((o: { id: string }) => !pais.origenesLocales.includes(o.id))).length;
console.log(`Hijos con algún origen de fuera: ${((conPadreDeFuera / hijos.length) * 100).toFixed(1)} % (el objetivo de hoy, 25 %)`);
const hermanosConApellidos = familias.filter((f) => f.hijos.length > 1).every((f) => new Set(f.hijos.map((i) => hijos[i].apellidos)).size === 1);
const distintos = familias.filter((f) => f.hijos.length > 1 && new Set(f.hijos.map((i) => hijos[i].apellidos)).size > 1);
console.log(`Hermanos con los mismos apellidos: ${hermanosConApellidos ? 'sí, todas las familias' : `no en ${distintos.length} familias (la forma femenina de un apellido eslavo, p. ej.: ${distintos.slice(0, 3).map((f) => f.hijos.map((i) => hijos[i].apellidos).join(' / ')).join('; ')})`}`);
// Los hermanos comparten alelos de la cara con sus padres: cada valor expresado del hijo es uno de los cuatro de sus padres
// La cara: cada valor expresado de un hijo es uno de los cuatro valores (dos por padre) que le pudieron dar sus padres
let ok = 0, total = 0;
for (const h of hijos) {
  const r = rostroDe(JSON.parse(h.json).rasgos.apariencia), rp = rostroDe(h.padre.rasgos.apariencia), rm = rostroDe(h.madre.rasgos.apariencia);
  for (const k of RASGOS_DE_ROSTRO) { total++; if ([...rp[k], ...rm[k]].some((v) => Math.abs(v - r[k][0]) < 1e-9)) ok++; }
}
console.log(`Rasgos de la cara de los hijos que vienen de un padre o de la madre: ${ok}/${total}`);
// Referencia: lo que cuesta hoy crear los mismos niños con persona(conGenetica)
const t1 = performance.now();
const hoy: RegistroDeNombres = new Map();
const rng2 = rngEstable('hogares-referencia', semilla);
for (let i = 0; i < hijos.length; i++) persona(rng2, `nino_${i}`, 'vecino', 8 + (i % 10), 0, hoy, [{ tipo: 'vecino' }], () => 'Alumno.', [], true);
console.log(`Referencia de hoy: crear ${hijos.length} niños con persona(): ${((performance.now() - t1) / 1000).toFixed(2)} s (la generación por familias: ${(ms / 1000).toFixed(2)} s con los ${adultos.length} adultos)`);
const edades = [...tablaEdades].sort((a, b) => a[0] - b[0]).map(([e, c]) => `${e}:${c}`).join(' ');
console.log(`Hijos por edad: ${edades}`);
