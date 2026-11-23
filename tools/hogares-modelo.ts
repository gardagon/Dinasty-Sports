/**
 * Modelo de hogares sobre la ciudad grande (encargo `docs/relevo/hogares.md`). NO cambia el juego ni guarda nada: crea la partida, mira a los niños que ya hay
 * (edades, apellidos, orígenes) y cuenta qué hogares, padres, bebés y hermanos harían falta para darles familia con las cifras de §1 del informe.
 *
 *   npx tsx tools/hogares-modelo.ts [grande|actual]
 */
import { PAIS_CIUDAD_GRANDE, registrarPais } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { edadNpc, type Npc, type NpcsState } from '@ds/mod-npcs';

const cual = process.argv[2] ?? 'grande';
if (cual === 'grande') registrarPais(PAIS_CIUDAD_GRANDE);
const MODS = [...MODULOS, futbol];
const g = nuevaPartida({ seed: 31, pais: cual === 'grande' ? PAIS_CIUDAD_GRANDE.id : 'espana', deportes: ['atletismo', 'futbol'] }, MODS);
const lista = (g.serialize().modules.npcs as NpcsState).npcs;
const edad = (n: Npc) => edadNpc(n, 0) ?? 0;

// ---- 1. Quién hay hoy por edad
const porEdad = new Map<number, number>();
for (const n of lista) {
  const e = n.nacimiento === undefined ? -1 : edad(n);
  porEdad.set(e, (porEdad.get(e) ?? 0) + 1);
}
const tramo = (a: number, b: number) => lista.filter((n) => n.nacimiento !== undefined && edad(n) >= a && edad(n) <= b);
const ninos = tramo(3, 19).filter((n) => !n.tags.includes('hermano') && n.role !== 'profesor');
const jovenes1819 = tramo(18, 19).filter((n) => !n.tags.includes('hermano'));
const adultos = lista.filter((n) => n.nacimiento !== undefined && edad(n) >= 20 && !n.tags.includes('progenitor'));
console.log(`Ciudad ${cual}: ${lista.length} personas; con edad: ${lista.filter((n) => n.nacimiento !== undefined).length}`);
console.log(`Niños y jóvenes de 3 a 19 años (sin la familia del personaje): ${ninos.length} (de 18-19: ${jovenes1819.length}); adultos de 20+: ${adultos.length} (profesores, entrenadores, vecinos...)`);
console.log('Por edad:', [...porEdad.entries()].sort((a, b) => a[0] - b[0]).map(([e, c]) => `${e}:${c}`).join(' '));

// ---- 2. Hermanos que ya serían compatibles sin cambiar ningún nombre: mismos apellidos, mismo origen y de 1 a 6 años de diferencia
const apellidosDe = (n: Npc) => (n.name.startsWith(n.nombrePila ?? '\0') ? n.name.slice((n.nombrePila ?? '').length).trim() : n.name.split(' ').slice(1).join(' '));
const clave = (n: Npc) => `${apellidosDe(n)}|${JSON.stringify(n.rasgos?.origen ?? [])}`;
const grupos = new Map<string, Npc[]>();
for (const n of ninos) grupos.set(clave(n), [...(grupos.get(clave(n)) ?? []), n]);
let parejasNaturales = 0;
const usadosNat = new Set<string>();
for (const [, gs] of grupos) {
  const ord = [...gs].sort((a, b) => (b.nacimiento ?? 0) - (a.nacimiento ?? 0));
  for (let i = 0; i < ord.length; i++) {
    if (usadosNat.has(ord[i].id)) continue;
    for (let j = i + 1; j < ord.length; j++) {
      if (usadosNat.has(ord[j].id)) continue;
      const dif = ((ord[i].nacimiento ?? 0) - (ord[j].nacimiento ?? 0)) / 365;
      if (Math.abs(dif) >= 1 && Math.abs(dif) <= 6) { usadosNat.add(ord[i].id); usadosNat.add(ord[j].id); parejasNaturales++; break; }
    }
  }
}
const conMismoApellido = [...grupos.values()].filter((x) => x.length > 1).length;
console.log(`Apellidos+origen repetidos entre niños: ${conMismoApellido} grupos; parejas de hermanos posibles SIN cambiar ningún nombre (1–6 años de diferencia): ${parejasNaturales} (${((2 * parejasNaturales) / ninos.length * 100).toFixed(1)} % de los niños)`);
const dosApellidos = ninos.filter((n) => apellidosDe(n).split(' ').length >= 2).length;
console.log(`Niños con dos apellidos (o más palabras): ${dosApellidos}/${ninos.length}; con origen mezclado: ${ninos.filter((n) => (n.rasgos?.origen.length ?? 0) > 1).length}; con algún origen de fuera: ver tools/demografia-origenes.ts`);

// ---- 3. El modelo (las cifras de §1.2 del informe; cambiar aquí para probar otras)
const P = {
  hijosEnEdadEscolar: [0.52, 0.36, 0.12], // familias con 1, 2 y 3+ (3 → 3,2 de media) niños de 3 a 19 años en casa
  monoparental: 0.2, // familias con hijos que tienen un solo progenitor en casa
  abuelosEnCasa: 0.05, // familias con hijos en que vive un abuelo (1,5 de media)
  bebesConHermanoMayor: 0.4, // de los niños de 0 a 7, los que tienen un hermano en edad escolar (de 8 a 19)
  bebesPorFamiliaJoven: 1.45, // niños de 0 a 7 en una familia que no tiene a nadie mayor de 8
  nacimientosPorAnio: 0, // se calcula: niños por año de nacimiento de 8 a 17
};
const mediaFam = P.hijosEnEdadEscolar[0] * 1 + P.hijosEnEdadEscolar[1] * 2 + P.hijosEnEdadEscolar[2] * 3.2;
const familiasConHijos = Math.round(ninos.length / mediaFam);
const progenitores = Math.round(familiasConHijos * ((1 - P.monoparental) * 2 + P.monoparental));
const abuelos = Math.round(familiasConHijos * P.abuelosEnCasa * 1.5);
const por8a17 = [...porEdad.entries()].filter(([e]) => e >= 8 && e <= 17).map(([, c]) => c);
P.nacimientosPorAnio = Math.round(por8a17.reduce((a, b) => a + b, 0) / por8a17.length);
const bebesTotal = P.nacimientosPorAnio * 8; // 0 a 7 años
const bebesEnFamiliasActuales = Math.round(bebesTotal * P.bebesConHermanoMayor);
const bebesEnFamiliasJovenes = bebesTotal - bebesEnFamiliasActuales;
const familiasJovenes = Math.round(bebesEnFamiliasJovenes / P.bebesPorFamiliaJoven);
const progenitoresJovenes = Math.round(familiasJovenes * ((1 - P.monoparental) * 2 + P.monoparental));
console.log(`\nModelo (niños 3–19: ${ninos.length}; media ${mediaFam.toFixed(2)} por familia → ${familiasConHijos} familias con hijos en el colegio)`);
console.log(`  Nacimientos por año (media de los de 8 a 17): ${P.nacimientosPorAnio}; niños de 0 a 7: ${bebesTotal}`);
const filas: [string, number][] = [
  ['hoy', lista.length],
  ['+ progenitores de los niños que ya hay', progenitores],
  ['+ abuelos que viven con la familia', abuelos],
  ['+ niños de 0 a 7 con hermano mayor en el colegio', bebesEnFamiliasActuales],
];
let acum = 0;
for (const [t, c] of filas) { acum += c; console.log(`  ${t.padEnd(52)} ${String(c).padStart(6)}  → ${acum}`); }
console.log(`  = H-mínimo (hogares de los niños que ya hay): ${acum} personas (×${(acum / lista.length).toFixed(2)})`);
const jovenes = bebesEnFamiliasJovenes + progenitoresJovenes;
console.log(`  + familias jóvenes (solo niños de 0 a 7): ${familiasJovenes} hogares, ${progenitoresJovenes} progenitores y ${bebesEnFamiliasJovenes} niños = ${jovenes}  → ${acum + jovenes}`);
console.log(`  = H-completo (todos los niños de 0 a 7 con familia): ${acum + jovenes} personas (×${((acum + jovenes) / lista.length).toFixed(2)})`);
console.log(`  Hogares (H-completo): con hijos ${familiasConHijos + familiasJovenes}; y adultos sin hijos a añadir con una perilla (INE: solos 26 %, parejas sin hijos ~21 %, otros ~12 %).`);
console.log(`  Hermanos a emparejar entre los niños que ya hay: familias de 2+ niños = ${Math.round(familiasConHijos * (P.hijosEnEdadEscolar[1] + P.hijosEnEdadEscolar[2]))}; naturales (sin renombrar): ${parejasNaturales}`);
