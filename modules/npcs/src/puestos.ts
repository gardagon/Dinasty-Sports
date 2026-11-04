import { grupoDePuesto, ladoDePuesto, parecidoDePuestos, type Pierna, type PuestosDeDeporte } from '@ds/contracts';

/**
 * LA REGLA DE PLAZA POR PUESTO (`CIUDAD_Y_LIGAS.md` §5): un club mira al candidato en todos los puestos y le ofrece aquel en el que entraría (con hueco en ese puesto o valiendo más que el
 * peor de ese puesto). Es la misma para el personaje y para cualquier PNJ. Todo son funciones puras sobre lo que vale cada uno en cada puesto.
 */

/** Un jugador del equipo: el puesto en que juega y lo que vale en él. */
export interface JugadorConPuesto {
  id: string;
  nombre: string;
  puesto: string;
  valor: number;
  /** Su pierna buena, si se sabe: decide los empates en un puesto de banda. */
  pierna?: Pierna;
}

/** ¿Juega en el lado contrario al de su pierna buena (un diestro de extremo izquierdo)? Solo cuenta en los puestos de banda. */
const enSuLadoMalo = (j: JugadorConPuesto): boolean => {
  const lado = ladoDePuesto(j.puesto);
  return !!lado && !!j.pierna && lado !== j.pierna;
};

/** Un puesto que el club le ofrece al candidato. */
export interface OfertaDePuesto {
  puesto: string;
  /** `libre`: hay hueco en ese puesto; `por_merito`: está completo y el candidato vale más que `peor`, que saldría. */
  estado: 'libre' | 'por_merito';
  peor?: JugadorConPuesto;
  /** Lo que vale el candidato en ese puesto. */
  valor: number;
  /** ¿Sería titular (vale al menos como la mediana de los que juegan en ese grupo, o el grupo está vacío)? */
  titular: boolean;
}

const mediana = (xs: number[]): number => {
  const o = [...xs].sort((a, b) => a - b);
  return o.length ? o[Math.floor((o.length - 1) / 2)] : -Infinity;
};

/** El puesto en que más vale (el favorito de un niño del mundo al empezar); en un empate, el de id menor. */
export const puestoDondeMasVale = (valores: Readonly<Record<string, number>>, entre?: readonly string[]): string => {
  let mejor = '';
  for (const [p, v] of Object.entries(valores)) if ((!entre || entre.includes(p)) && (mejor === '' || v > valores[mejor] || (v === valores[mejor] && p < mejor))) mejor = p;
  return mejor;
};

/**
 * Todas las ofertas posibles de un club a un candidato: una por grupo de puestos (portero, central, lateral...) en que entraría. En cada grupo se mira su mejor puesto (el favorito, si es
 * de ese grupo): con hueco (menos jugadores que el cupo) entra; completo, solo si vale más que el peor de ese grupo (en un empate sale el de id mayor).
 * `cupos` es lo que cabe de cada grupo en esa plantilla (`cuposPorGrupo`).
 */
export function ofertasDePuesto(jugadores: readonly JugadorConPuesto[], cupos: Readonly<Record<string, number>>, p: PuestosDeDeporte, valores: Readonly<Record<string, number>>, favorito?: string, piernaDelCandidato?: Pierna): OfertaDePuesto[] {
  const ofertas: OfertaDePuesto[] = [];
  for (const g of p.reparto) {
    const cupo = cupos[g.grupo] ?? 0;
    if (cupo <= 0) continue;
    const delGrupo = jugadores.filter((j) => g.puestos.includes(j.puesto));
    const puesto = favorito && g.puestos.includes(favorito) ? favorito : puestoDondeMasVale(valores, g.puestos);
    if (!puesto) continue;
    const valor = valores[puesto];
    const titular = delGrupo.length === 0 || valor >= mediana(delGrupo.map((j) => j.valor));
    if (delGrupo.length < cupo) {
      ofertas.push({ puesto, estado: 'libre', valor, titular });
    } else {
      // El peor de un puesto: el que menos vale; en un empate, el que juega en el lado contrario al de su pierna y, después, el de id mayor.
      const peor = delGrupo.reduce((m, j) => (j.valor < m.valor || (j.valor === m.valor && (enSuLadoMalo(j) !== enSuLadoMalo(m) ? enSuLadoMalo(j) : j.id > m.id)) ? j : m));
      // En un empate en un puesto de banda decide la pierna: entra el que juega en el lado de su pierna buena (y el peor, no).
      const empataYDecideLaPierna = valor === peor.valor && !!piernaDelCandidato && ladoDePuesto(puesto) === piernaDelCandidato && enSuLadoMalo(peor);
      if (valor > peor.valor || empataYDecideLaPierna) ofertas.push({ puesto, estado: 'por_merito', peor, valor, titular });
    }
  }
  return ofertas;
};

/**
 * La oferta que se le hace: la del grupo de su puesto favorito si entra en él y, si no, aquella en que más vale (prefiriendo el hueco). `undefined`: no entra en ningún puesto (completo).
 */
export function ofertaDePuesto(jugadores: readonly JugadorConPuesto[], cupos: Readonly<Record<string, number>>, p: PuestosDeDeporte, valores: Readonly<Record<string, number>>, favorito?: string, piernaDelCandidato?: Pierna): OfertaDePuesto | undefined {
  const ofertas = ofertasDePuesto(jugadores, cupos, p, valores, favorito, piernaDelCandidato);
  if (!ofertas.length) return undefined;
  const grupoFavorito = favorito ? grupoDePuesto(p, favorito) : undefined;
  const delFavorito = ofertas.find((o) => grupoDePuesto(p, o.puesto) === grupoFavorito);
  if (delFavorito) return delFavorito;
  return [...ofertas].sort((a, b) => b.valor - a.valor || (a.puesto < b.puesto ? -1 : 1))[0];
}

/**
 * Cuánto acepta un niño un puesto que no es su favorito, de 5 % a 95 %: más fácil cuanto más **disciplinado** y **sacrificado** es (ejes del carácter, de −50 a 50), cuanto más se parece el
 * puesto ofrecido al suyo y si en él sería **titular**. En el puesto favorito (o uno del mismo grupo y parecido total) siempre lo acepta.
 */
export function probabilidadDeAceptarPuesto(p: PuestosDeDeporte, caracter: Readonly<Record<string, number>> | undefined, favorito: string | undefined, ofrecido: string, titular: boolean): number {
  if (!favorito || favorito === ofrecido) return 1;
  const disciplina = (caracter?.disciplina ?? 0) / 50;
  const sacrificio = (caracter?.sacrificio ?? 0) / 50;
  const x = 0.3 + 0.2 * disciplina + 0.15 * sacrificio + 0.35 * parecidoDePuestos(p, favorito, ofrecido) + 0.15 * (titular ? 1 : 0);
  return Math.min(0.95, Math.max(0.05, x));
}
