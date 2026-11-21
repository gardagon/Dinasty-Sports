/**
 * Los puestos de las plantillas y de los once titulares (solo mide, no cambia el juego), con la ciudad grande. La columna «Puesto» de la plantilla es **el puesto en que más vale cada niño** (su puesto de plantilla: con el que
 * entró en el equipo, y el favorito si lo tiene), no el que juega cada sábado: el entrenador alinea con la formación del equipo (`PUESTOS_DE_FUTBOL.equipos.formacion`: portero, 2 centrales, lateral izquierdo y derecho, pivote
 * y 2 mediocentros, extremo izquierdo y derecho y delantero centro) y reparte a los de cada grupo entre sus puestos. Esta herramienta cuenta, por plantilla de cada categoría: el lado de los puestos de plantilla (izquierda,
 * derecha) frente al de los zurdos de la población, y en el once que sale: cuántos juegan en el puesto de su plantilla, cuántos en otro de su grupo, cuántos fuera de su grupo (el once «cojo») y cuántos puestos de cada lado
 * se cubren con alguien de su pierna. `npm run puestos-del-once -- [semillas]`.
 */
import { PAIS_CIUDAD_GRANDE, SERVICES, grupoDePuesto, ladoDePuesto, registrarPais, type NpcDirectory } from '@ds/contracts';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PUESTOS_DE_FUTBOL, convocarYAlinear, futbol, paraConvocar } from '@ds/mod-futbol';
import { categoriasDelEquipo, type NpcsState } from '@ds/mod-npcs';

registrarPais(PAIS_CIUDAD_GRANDE);
const SEMILLAS = (process.argv[2] ?? '31,33').split(',').map(Number);
const CATEGORIAS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
const f = (x: number, d = 1): string => x.toFixed(d);
const pct = (a: number, b: number): string => (b ? `${f((100 * a) / b)} %` : '—');
const P = PUESTOS_DE_FUTBOL;
/** El puesto en que más vale (en un empate, el de id menor), como el favorito de un niño del mundo al empezar. */
const puestoDondeMasVale = (v: Readonly<Record<string, number>>): string => Object.entries(v).reduce((m, [p, x]) => (x > m[1] || (x === m[1] && p < m[0]) ? [p, x] : m), ['', -Infinity] as [string, number])[0];

let esElMejor = 0, esDelGrupoDelMejor = 0, esElMejorDeSuGrupo = 0;
const ejemplos: string[] = [];
let equipos = 0, jugadores = 0, conLado = 0, izquierda = 0, derecha = 0;
let titulares = 0, mismoPuesto = 0, otroDelGrupo = 0, fueraDelGrupo = 0;
const lateralesPorEquipo: number[] = []; // laterales (LB/RB) de la plantilla que son izquierdos
let sinIzquierdoEnElGrupo = 0, grupos = 0;
let ladoLaterales = { LB: 0, RB: 0 }; // puesto de plantilla de los laterales
let slotsConLado = 0, slotsConSuLado = 0;
const lados = { LB: 0, RB: 0, LW: 0, RW: 0 };
for (const seed of SEMILLAS) {
  const g = nuevaPartida({ seed, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  const s = g.moduleState<NpcsState>('npcs') as NpcsState;
  const pob = s.poblaciones!.find((p) => p.deporte === 'futbol')!;
  const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
  for (const e of pob.equipos.filter((x) => x.plantillaPorCategoria)) {
    for (const cx of categoriasDelEquipo(pob, e).filter((c) => CATEGORIAS.includes(c.id))) {
      for (const letra of ['A', 'B', 'C', 'D']) {
        const plantilla = dir.plantillaDelEquipo!('futbol', e.club, cx.id, letra);
        if (plantilla.length < 14) continue;
        equipos++;
        jugadores += plantilla.length;
        for (const j of plantilla) {
          const mejor = puestoDondeMasVale(j.valores);
          if (j.puesto === mejor) esElMejor++;
          const delGrupo = P.reparto.find((r) => r.puestos.includes(j.puesto))!.puestos;
          if (j.puesto === puestoDondeMasVale(Object.fromEntries(Object.entries(j.valores).filter(([k]) => delGrupo.includes(k))))) esElMejorDeSuGrupo++;
          if (grupoDePuesto(P, j.puesto) === grupoDePuesto(P, mejor)) esDelGrupoDelMejor++;
          const l = ladoDePuesto(j.puesto);
          if (!l) continue;
          conLado++;
          if (l === 'izquierda') izquierda++; else derecha++;
        }
        const laterales = plantilla.filter((j) => grupoDePuesto(P, j.puesto) === 'lateral');
        grupos++;
        if (!laterales.some((j) => j.puesto === 'LB')) sinIzquierdoEnElGrupo++;
        for (const j of laterales) ladoLaterales[j.puesto as 'LB' | 'RB']++;
        const c = convocarYAlinear(plantilla.map((j) => paraConvocar(j)));
        const porId = new Map(plantilla.map((j) => [j.id, j]));
        if (ejemplos.length < 3 && letra === 'A' && cx.id === 'benjamin' && e.colegio !== undefined) {
          const nom = (id: string): string => P.puestos.find((x) => x.id === id)!.nombre;
          ejemplos.push(`  ${e.club} ${cx.id} ${letra}: plantilla [${plantilla.map((j) => j.puesto).join(' ')}]\n    once: ${c.titulares.map((t) => `${t.puesto}${t.puesto === porId.get(t.id)!.puesto ? '' : `(plantilla ${porId.get(t.id)!.puesto})`}`).join(' ')}`);
          void nom;
        }
        for (const t of c.titulares) {
          const j = porId.get(t.id)!;
          titulares++;
          if (t.puesto === j.puesto) mismoPuesto++;
          else if (grupoDePuesto(P, t.puesto) === grupoDePuesto(P, j.puesto)) otroDelGrupo++;
          else fueraDelGrupo++;
          if (t.puesto in lados) lados[t.puesto as keyof typeof lados]++;
        }
      }
    }
  }
}
void slotsConLado; void slotsConSuLado; void lateralesPorEquipo;
console.log(`Plantillas y onces (ciudad grande, semillas ${SEMILLAS.join(',')}): ${equipos} equipos, ${jugadores} jugadores\n`);
console.log(`El puesto de la plantilla es el que más vale al niño (de los 16): ${pct(esElMejor, jugadores)}; es del grupo de su mejor puesto: ${pct(esDelGrupoDelMejor, jugadores)}; es el mejor de los de su grupo (el que le dio el club): ${pct(esElMejorDeSuGrupo, jugadores)}`);
console.log(`Puestos de plantilla con lado (laterales, carrileros, interiores, extremos y delanteros izquierdos/derechos): ${conLado}; izquierda ${pct(izquierda, conLado)}, derecha ${pct(derecha, conLado)}`);
console.log(`Laterales de plantilla: izquierdos ${ladoLaterales.LB}, derechos ${ladoLaterales.RB}; equipos sin ningún lateral izquierdo en la plantilla: ${pct(sinIzquierdoEnElGrupo, grupos)}`);
console.log(`\nEl once que sale (convocarYAlinear): ${titulares} titulares`);
console.log(`  juegan en el puesto de su plantilla ${pct(mismoPuesto, titulares)}, en otro puesto de su grupo ${pct(otroDelGrupo, titulares)}, fuera de su grupo ${pct(fueraDelGrupo, titulares)}`);
console.log(`  puestos de lado cubiertos en el once: lateral izquierdo ${lados.LB}, lateral derecho ${lados.RB}, extremo izquierdo ${lados.LW}, extremo derecho ${lados.RW} (los equipos son ${equipos}: el once tiene los cuatro siempre)`);
console.log('\nEjemplos (equipos A de benjamín de colegio): puestos de la plantilla y once con el puesto en que juega cada uno (entre paréntesis, su puesto de plantilla si es otro):');
for (const e of ejemplos) console.log(e);
