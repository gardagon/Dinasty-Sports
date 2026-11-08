import { grupoDePuesto, ladoDePuesto, parecidoDePuestos, type Pierna, type PuestosDeDeporte } from '@ds/contracts';
import { suplentesDe } from './equipos';

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
  /** Lo que vale en cada puesto (con ello se sabe cómo cubriría uno que no es el suyo). Sin él, se estima por el parecido con el suyo. */
  valores?: Readonly<Record<string, number>>;
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

/** Las condiciones de una prueba de acceso: el puesto en que pide jugar (solo se mide ese) y si ya la pasó (entra ahora: con hueco en su puesto, sin enfrentarse otra vez a nadie). */
export interface CondicionesDePrueba {
  puesto?: string;
  yaPasada?: boolean;
  /** Un equipo nuevo que se forma con lo que queda de la bolsa: entra por hueco sin mirar el cupo de su grupo de puestos (solo el máximo del equipo), para que si hay 14 que pueden formarlo, se forme. */
  sinCuposPorGrupo?: boolean;
}

/**
 * **Plaza con hueco** (decisión del usuario, 05/11/2026): con hueco en su puesto, el candidato se enfrenta en la prueba al **suplente que mejor juega en ese puesto**, por malo que sea en él y por
 * poco que se parezca a su puesto (sin umbral de parecido: si falta un portero, el suplente que mejor para). Los suplentes son los que no están en el once, por el reparto por puestos (con la
 * formación escalada al tamaño de la plantilla). **Con varios huecos, se enfrenta al que cubriría el último**: con dos huecos, al segundo mejor suplente; con tres, al tercero. Devuelve lo que vale
 * ese rival en el puesto, o `undefined` si hay más huecos que suplentes: entonces entra. Igual para el personaje y para los niños.
 */
export function rivalConHueco(jugadores: readonly JugadorConPuesto[], cupos: Readonly<Record<string, number>>, p: PuestosDeDeporte, grupo: string, puesto: string): number | undefined {
  const base = p.reparto.reduce((t, g) => t + g.jugadores, 0) || 1;
  const escala = Object.values(cupos).reduce((a, b) => a + b, 0) / base;
  const titulares = Object.fromEntries(Object.entries(p.equipos?.titulares ?? {}).map(([g, n]) => [g, Math.round(n * escala)]));
  const suplentes = new Set(suplentesDe(jugadores, p, titulares));
  const cubren = jugadores
    .filter((j) => suplentes.has(j.id))
    .map((j) => j.valores?.[puesto] ?? j.valor * parecidoDePuestos(p, j.puesto, puesto))
    .sort((a, b) => b - a);
  const huecos = (cupos[grupo] ?? 0) - jugadores.filter((j) => grupoDePuesto(p, j.puesto) === grupo).length;
  return cubren[Math.max(0, huecos - 1)];
}

/**
 * Todas las ofertas posibles de un club a un candidato: una por grupo de puestos (portero, central, lateral...) en que entraría. En cada grupo se mira su mejor puesto (el favorito, si es
 * de ese grupo): con hueco (menos jugadores que el cupo) entra; completo, solo si vale más que el peor de ese grupo (en un empate sale el de id mayor).
 * `cupos` es lo que cabe de cada grupo en esa plantilla (`cuposPorGrupo`).
 */
export function ofertasDePuesto(jugadores: readonly JugadorConPuesto[], cupos: Readonly<Record<string, number>>, p: PuestosDeDeporte, valores: Readonly<Record<string, number>>, favorito?: string, piernaDelCandidato?: Pierna, prueba?: CondicionesDePrueba): OfertaDePuesto[] {
  const ofertas: OfertaDePuesto[] = [];
  const totalDeCupos = Object.values(cupos).reduce((a, b) => a + b, 0);
  for (const g of p.reparto) {
    const cupo = cupos[g.grupo] ?? 0;
    if (cupo <= 0) continue;
    // En una prueba en que ha pedido un puesto, solo se mide ese (y su grupo).
    if (prueba?.puesto && !g.puestos.includes(prueba.puesto)) continue;
    const delGrupo = jugadores.filter((j) => g.puestos.includes(j.puesto));
    const puesto = prueba?.puesto ?? (favorito && g.puestos.includes(favorito) ? favorito : puestoDondeMasVale(valores, g.puestos));
    if (!puesto) continue;
    const valor = valores[puesto];
    const titular = delGrupo.length === 0 || valor >= mediana(delGrupo.map((j) => j.valor));
    // El máximo es un tope: con el equipo completo no se entra por hueco (tras subir de categoría puede haber grupos con menos de su cupo y el equipo ya en su máximo).
    const completo = jugadores.length >= totalDeCupos;
    if ((prueba?.sinCuposPorGrupo || delGrupo.length < cupo) && !completo) {
      // Con hueco, en una prueba (el club del colegio no la hace) hay que superar al suplente que mejor cubriría ese puesto; si nadie puede cubrirlo, entra.
      const rival = prueba && !prueba.yaPasada ? rivalConHueco(jugadores, cupos, p, g.grupo, puesto) : undefined;
      if (rival === undefined || valor > rival) ofertas.push({ puesto, estado: 'libre', valor, titular });
    } else if (jugadores.length) {
      // El peor de un puesto (si el grupo está vacío y el equipo completo, el peor de todo el equipo, que dejaría el sitio): el que menos vale; en un empate, el que juega en el lado contrario al de su pierna y, después, el de id mayor.
      const referencia = delGrupo.length ? delGrupo : jugadores;
      const peor = referencia.reduce((m, j) => (j.valor < m.valor || (j.valor === m.valor && (enSuLadoMalo(j) !== enSuLadoMalo(m) ? enSuLadoMalo(j) : j.id > m.id)) ? j : m));
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
export function ofertaDePuesto(jugadores: readonly JugadorConPuesto[], cupos: Readonly<Record<string, number>>, p: PuestosDeDeporte, valores: Readonly<Record<string, number>>, favorito?: string, piernaDelCandidato?: Pierna, prueba?: CondicionesDePrueba): OfertaDePuesto | undefined {
  const ofertas = ofertasDePuesto(jugadores, cupos, p, valores, favorito, piernaDelCandidato, prueba);
  if (!ofertas.length) return undefined;
  const grupoFavorito = favorito ? grupoDePuesto(p, favorito) : undefined;
  const delFavorito = ofertas.find((o) => grupoDePuesto(p, o.puesto) === grupoFavorito);
  if (delFavorito) return delFavorito;
  return [...ofertas].sort((a, b) => b.valor - a.valor || (a.puesto < b.puesto ? -1 : 1))[0];
}

/**
 * **El entrenador ofrece puestos parecidos al montar un equipo** (decisión del usuario, 07/11/2026): todas las ofertas posibles, de la más a la menos adecuada: primero la del grupo de su puesto favorito
 * (si entra en él) y después, **de más a menos parecido** al favorito (los de su línea y los cercanos: un lateral, de central; un extremo, de delantero), las de los demás grupos; a igualdad, la que más
 * vale. Cada oferta la acepta o no el niño según su carácter (`probabilidadDeAceptarPuesto`), y se queda con la primera que acepta.
 */
export function ofertasOrdenadas(jugadores: readonly JugadorConPuesto[], cupos: Readonly<Record<string, number>>, p: PuestosDeDeporte, valores: Readonly<Record<string, number>>, favorito?: string, piernaDelCandidato?: Pierna, prueba?: CondicionesDePrueba): OfertaDePuesto[] {
  const ofertas = ofertasDePuesto(jugadores, cupos, p, valores, favorito, piernaDelCandidato, prueba);
  const grupoFavorito = favorito ? grupoDePuesto(p, favorito) : undefined;
  const parecido = (o: OfertaDePuesto): number => (favorito ? parecidoDePuestos(p, favorito, o.puesto) : 0);
  return [...ofertas].sort((a, b) => Number(grupoDePuesto(p, b.puesto) === grupoFavorito) - Number(grupoDePuesto(p, a.puesto) === grupoFavorito) || parecido(b) - parecido(a) || b.valor - a.valor || (a.puesto < b.puesto ? -1 : 1));
}

/** El grupo de favoritos (portería, defensa, medio o ataque) al que pertenece un puesto, si el deporte los tiene. */
export const grupoDeFavorito = (p: PuestosDeDeporte, puesto: string): string | undefined => p.favoritos?.grupos.find((g) => g.puestos.includes(puesto))?.id;

/** ¿Es el puesto ofrecido «de lo suyo»? Su puesto favorito concreto o, si tiene un grupo favorito (`grupoFavorito`), cualquier puesto de ese grupo. */
export const esDeLoSuyo = (p: PuestosDeDeporte, favorito: string | undefined, grupoFavorito: string | undefined, ofrecido: string): boolean =>
  !!favorito && (favorito === ofrecido || (!!grupoFavorito && grupoDeFavorito(p, ofrecido) === grupoFavorito));

/**
 * Cuánto acepta un niño un puesto que no es de lo suyo (decisión del usuario, 08/11/2026: «al final, si un niño quiere jugar al fútbol, juega»): casi siempre, de 55 % a 97 %; más fácil cuanto más
 * **disciplinado** y **sacrificado** es (ejes del carácter, de −50 a 50), cuanto más se parece el puesto al suyo y si en él sería **titular**. Si es de lo suyo (su puesto favorito o cualquier
 * puesto de su grupo favorito) siempre lo acepta. **Si es su última opción** (se queda sin equipo), la probabilidad de aceptar sube mucho: aceptaría uno que normalmente rechazaría.
 */
export function probabilidadDeAceptarPuesto(p: PuestosDeDeporte, caracter: Readonly<Record<string, number>> | undefined, favorito: string | undefined, ofrecido: string, titular: boolean, o: { grupoFavorito?: string; ultimaOpcion?: boolean } = {}): number {
  if (!favorito || esDeLoSuyo(p, favorito, o.grupoFavorito, ofrecido)) return 1;
  const disciplina = (caracter?.disciplina ?? 0) / 50;
  const sacrificio = (caracter?.sacrificio ?? 0) / 50;
  const x = 0.8 + 0.1 * disciplina + 0.06 * sacrificio + 0.08 * (parecidoDePuestos(p, favorito, ofrecido) - 0.3) + 0.04 * (titular ? 1 : 0);
  const normal = Math.min(0.97, Math.max(0.55, x));
  return o.ultimaOpcion ? normal + (1 - normal) * ULTIMA_OPCION : normal;
}

/** Qué parte de lo que le falta para aceptar un puesto se la da a un niño ser su última opción (quedarse sin equipo). */
export const ULTIMA_OPCION = 0.75;
