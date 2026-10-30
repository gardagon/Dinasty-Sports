import {
  GEN,
  azarDe,
  efectosDe,
  factorPorEdad,
  heredarPerks,
  heredarTope,
  perfilDePadre,
  perksDePadre,
  practicaSegunTope,
  primerDiaDelAnio,
  rasgosAlAzar,
  repartirHerencia,
  rngEstable,
  ventajaDeCrianza,
  type Gender,
  type PaisDef,
  type PerksDe,
  type Practica,
  type PoblacionDeDeporte,
  type RasgosDe,
  type Rng,
} from '@ds/contracts';

/**
 * Lo que hace falta para que un niño sea deportista: su genética (que no depende del deporte), cuánto le encaja un deporte (su potencial en él y si le
 * interesa) y cómo se reparten las plazas de un club por edades. Los niños se crean como en la vida real, sin pensar en ningún deporte: con padres que tienen su
 * perfil físico y lo que practicaron, de los que heredan sus topes, su ventaja de crianza y, con alguna probabilidad (nunca por obligación), su afición. Puede
 * salir un niño muy dotado de padres deportistas o uno poco dotado de padres que no hicieron deporte, pero también lo contrario. Los deportes los reclutan después (ver `npcs`).
 *
 * Todo lo que depende de un niño y de un deporte se sortea con un generador propio de ese par (`rngEstable`), no con el de la partida: así no cambia
 * con el orden en que se crea la gente ni con los deportes que haya.
 */

/** Capacidades físicas que se heredan (las de las que sale el potencial de cualquier deporte; un deporte usa las suyas, entre estas). */
export const CAPACIDADES_HEREDABLES: readonly string[] = [GEN.velocidad, GEN.fuerza, GEN.resistencia, GEN.constitucion, GEN.agilidad, GEN.coordinacion];

const mediaDe = (v: readonly number[]): number => v.reduce((a, b) => a + b, 0) / v.length;
const clamp = (v: number, a = 0, b = 100): number => Math.min(b, Math.max(a, v));

/** La genética de un niño: lo que heredó de sus padres y cómo se desarrolla. Es lo que decide, junto a sus gustos, qué deporte le encaja. */
export interface Genetica {
  /** Tope heredado de cada capacidad física (de un padre o de otro, ±20 %). Los topes se distribuyen en campana: unos pocos son muy buenos y otros muy flojos. */
  topes: Record<string, number>;
  /** Perks (rasgos genéticos especiales): suben o bajan sus topes. */
  perks: PerksDe;
  /** Años de adelanto (+) o retraso (−) en su desarrollo físico. */
  desfase: number;
  /** Ventaja (o desventaja) de partida por lo que practicaron sus padres: de ×0,95 (ninguno) a ×1,10 (los dos profesionales). */
  ventaja: number;
  /** Lo que practicó de deporte cada uno de sus padres (según su perfil físico: los más dotados llegan más lejos). */
  padres: { padre: Practica; madre: Practica };
}

/**
 * Parte de su potencial que un niño ha desarrollado a una edad: la misma curva física por edad que el jugador (`CURVAS_POR_EDAD`) por 0,75, porque un
 * deportista típico no entrena a diario como el mejor jugador posible. Los deportistas solo juegan hasta los 19 años.
 */
export const desarrolloRival = (edad: number): number => 0.75 * factorPorEdad('fisico', edad);

/** Perks de un niño: se sortean los de sus dos padres y de ahí los suyos, con un generador que solo depende de él (no de la partida). */
export function perksDeNino(id: string, semilla: number): PerksDe {
  const rng = rngEstable('perks', id, Math.round(semilla * 1000));
  return heredarPerks(perksDePadre(rng), perksDePadre(rng), rng);
}

/**
 * La genética de un niño de otra familia: unos padres con su perfil de topes (de calidad al azar: unos muy buenos, otros flojos) de los que hereda la
 * mitad de cada uno, ±20 %. Con tantos niños, el potencial de cada capacidad sale en campana (Gauss): unos pocos destacan y otros quedan por debajo.
 */
export function geneticaDeNino(rng: Rng, id: string): Genetica {
  const padre = perfilDePadre(CAPACIDADES_HEREDABLES, rng, rng.next());
  const madre = perfilDePadre(CAPACIDADES_HEREDABLES, rng, rng.next());
  const practica = { padre: practicaSegunTope(mediaDe(Object.values(padre.topes)), rng), madre: practicaSegunTope(mediaDe(Object.values(madre.topes)), rng) };
  const reparto = repartirHerencia(CAPACIDADES_HEREDABLES, rng);
  const padres = { padre, madre };
  const topes = Object.fromEntries(CAPACIDADES_HEREDABLES.map((c) => [c, heredarTope(padres[reparto[c]].topes[c], rng)]));
  return { topes, perks: perksDeNino(id, mediaDe(Object.values(topes))), desfase: clamp(rng.normal() * 0.7, -1.2, 1.2), ventaja: ventajaDeCrianza(practica.padre, practica.madre), padres: practica };
}

/** La genética de un hermano del personaje: hereda de los mismos padres que él (sus topes y sus perks), con su propio azar. */
export function geneticaDeHermano(
  rng: Rng,
  padres: { padre: Readonly<Record<string, number>>; madre: Readonly<Record<string, number>> },
  perksPadres: { padre: PerksDe; madre: PerksDe },
  rngPerks: Rng,
  semilla: number,
  id: string,
): Genetica {
  const reparto = repartirHerencia(CAPACIDADES_HEREDABLES, rng);
  const topes = Object.fromEntries(CAPACIDADES_HEREDABLES.map((c) => [c, heredarTope(padres[reparto[c]][c] ?? 62, rng)]));
  const perks = heredarPerks(perksPadres.padre, perksPadres.madre, rngPerks);
  // Lo que practicaron sus padres (los del personaje) se saca de sus topes, con un generador estable: no hace falta el módulo `familia`.
  const practica = (cual: 'padre' | 'madre') => practicaSegunTope(mediaDe(CAPACIDADES_HEREDABLES.map((c) => padres[cual][c] ?? 62)), rngEstable('practica', semilla, id, cual));
  const hechas = { padre: practica('padre'), madre: practica('madre') };
  return { topes, perks, desfase: clamp(rng.normal() * 0.7, -1.2, 1.2), ventaja: ventajaDeCrianza(hechas.padre, hechas.madre), padres: hechas };
}

/** Lo que un deporte necesita de un niño para valorarlo (de `PoblacionGuardada`). */
export type DeporteDeNino = Pick<PoblacionDeDeporte, 'capacidades' | 'aptitud'> & { deporte: string };

/**
 * Potencial de un niño en un deporte (20 a 95): la media de sus topes en las capacidades que pide el deporte, con el efecto de sus perks, por su aptitud
 * propia para ese deporte (sorteada solo para él y ese deporte).
 */
export function potencialEn(id: string, g: Genetica, d: DeporteDeNino): number {
  const efecto = efectosDe(g.perks.activos).tope;
  const topes = d.capacidades.filter((c) => c in g.topes).map((c) => clamp(g.topes[c] + (efecto[c] ?? 0), 0, 100));
  const u = rngEstable('aptitud', id, d.deporte).next();
  return clamp((topes.length ? mediaDe(topes) : 50) * (1 + d.aptitud * (u * 2 - 1)), 20, 95);
}

/** Su ritmo de progreso en un deporte (1 = medio): lo constante y bien entrenado que es. */
export const ritmoEn = (id: string, deporte: string): number => clamp(1 + rngEstable('ritmo', id, deporte).normal() * 0.22, 0.55, 1.5);

/** Su nivel en un deporte a una edad (en años, con el desfase de su desarrollo): el potencial desarrollado a esa edad por su ventaja de crianza, entre el 80 y el 100 %. */
export function nivelEn(id: string, g: Genetica, potencial: number, edadReal: number, deporte: string): number {
  const techo = potencial * desarrolloRival(edadReal + g.desfase);
  return Math.min(techo, techo * rngEstable('nivel', id, deporte).range(0.8, 1) * g.ventaja);
}

/** Probabilidad de que cada padre pase la afición al deporte según lo que practicó. */
const AFICION_DE_LOS_PADRES: Record<Practica, number> = { ninguna: 0, aficionado: 0.15, federado: 0.3, profesional: 0.5 };

/**
 * Los hijos de padres deportistas se aficionan más al deporte: con una probabilidad que crece con lo que practicó cada padre (nunca por obligación) se
 * le añade el interés por el deporte. Los de padres que no hicieron deporte se aficionan solo por azar. Devuelve los rasgos con el cambio.
 */
export function aficionadoPorLosPadres(rasgos: RasgosDe, padres: Genetica['padres'], rng: Rng): RasgosDe {
  const sin = (1 - AFICION_DE_LOS_PADRES[padres.padre]) * (1 - AFICION_DE_LOS_PADRES[padres.madre]);
  // Se tira siempre (aunque ya tenga el interés) para no cambiar el azar de lo demás.
  const se = rng.chance(1 - sin);
  const intensidad = rng.int(2, 3);
  return se && !rasgos.intereses.deporte ? { ...rasgos, intereses: { ...rasgos.intereses, deporte: intensidad } } : rasgos;
}

/** Cuánto le interesa un deporte (0 a 3): el interés por ese deporte o por el deporte en general, el mayor. */
export const interesPor = (rasgos: RasgosDe | undefined, deporte: string): number => (rasgos ? Math.max(rasgos.intereses[deporte] ?? 0, rasgos.intereses.deporte ?? 0) : 0);

/**
 * Cuántas plazas tiene un equipo en cada edad: su plantilla repartida entre sus edades lo más igual posible (los que sobran, en edades que salen de un
 * sorteo propio del equipo). Con una plantilla de 9 y 12 edades, 9 edades tienen una plaza y 3 ninguna: así un club no tiene veinte niños de golpe.
 */
export function plazasPorEdad(club: string, plantilla: number, edades: readonly number[]): Map<number, number> {
  const base = Math.floor(plantilla / edades.length);
  const resto = plantilla - base * edades.length;
  const conExtra = new Set([...edades].sort((a, b) => azarDe('plaza', club, a) - azarDe('plaza', club, b)).slice(0, resto));
  return new Map(edades.map((e) => [e, base + (conExtra.has(e) ? 1 : 0)]));
}

/** Un niño de otro colegio (o ya sin colegio) que no existe como persona hasta que un club lo recluta: sale siempre igual de su colegio, su cohorte y su número. */
export interface NinoVirtual {
  id: string;
  colegio: string;
  gender: Gender;
  rasgos: RasgosDe;
  nacimiento: number;
  genetica: Genetica;
}

/** Id de un niño virtual (`nino_<colegio>_<año de nacimiento>_<n>`). */
export const idDeNino = (colegio: string, anioNac: number, i: number): string => `nino_${colegio}_${anioNac}_${i}`;

/**
 * Un niño de otro colegio, con su género, sus gustos, su genética y su día de nacimiento: todo sale de la semilla y de su id (colegio, año de nacimiento y
 * número), no de la secuencia de la partida. Así cada curso se pueden volver a mirar los mismos niños sin guardarlos.
 */
export function ninoVirtual(semilla: number, colegio: string, anioNac: number, i: number, pais: Pick<PaisDef, 'demografia'>): NinoVirtual {
  const id = idDeNino(colegio, anioNac, i);
  const rng = rngEstable('nino', semilla, id);
  const gender: Gender = rng.chance(0.5) ? 'f' : 'm';
  const gustos = rasgosAlAzar(rng, { demografia: pais.demografia });
  const nacimiento = primerDiaDelAnio(anioNac) + rng.int(0, 364);
  const genetica = geneticaDeNino(rng, id);
  return { id, colegio, gender, rasgos: aficionadoPorLosPadres(gustos, genetica.padres, rng), nacimiento, genetica };
}
