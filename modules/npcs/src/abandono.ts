/**
 * El abandono por edad (decisión del usuario, 07/11/2026; `CIUDAD_Y_LIGAS.md` §11): cada verano cada deportista decide si sigue. La probabilidad de dejarlo sube con la edad (sobre todo desde cadete) y pesan su
 * interés por el deporte, su ambición, los minutos que tuvo (si fue titular), sus estudios (más en 4.º de la ESO y en bachillerato) y lo que hacen sus padres. Lo mismo vale para el PNJ y para el personaje: el
 * personaje ve los mismos motivos (`motivosDeAbandono`), pero lo de seguir lo decide el jugador. Todo son funciones puras sobre los datos del deporte (`reclutamiento.abandono`).
 */
import { NIVEL_PRACTICA, rngEstable, type PoblacionDeDeporte, type Practica, type RasgosDe } from '@ds/contracts';
import { interesPor } from './deportistas';

type DatosDeAbandono = NonNullable<PoblacionDeDeporte['reclutamiento']['abandono']>;

/** Lo que se sabe de un deportista para decidir si sigue. */
export interface DatosDelDeportista {
  edad: number;
  rasgos?: RasgosDe;
  /** ¿Fue titular en su equipo (jugó los minutos)? `undefined`: no se sabe, no cuenta. */
  titular?: boolean;
  /** Lo que practican sus padres. */
  padres?: { padre: Practica; madre: Practica };
}

/** Un motivo para dejarlo (peso > 0) o para seguir (peso < 0), con el texto que ve el jugador. */
export interface MotivoDeAbandono {
  id: 'interes' | 'ambicion' | 'minutos' | 'estudios' | 'padres';
  /** De −1 (el motivo más fuerte para seguir) a 1 (para dejarlo). */
  fuerza: number;
  texto: string;
}

/** La probabilidad base de dejarlo a una edad: la de la mayor edad listada que no pasa de ella (la de la menor, para las más pequeñas). */
export function baseDelAbandono(d: DatosDeAbandono, edad: number): number {
  const edades = Object.keys(d.baseDeLaEdad).map(Number).sort((a, b) => a - b);
  const hasta = edades.filter((x) => x <= edad);
  return d.baseDeLaEdad[hasta.length ? hasta[hasta.length - 1] : edades[0]];
}

const limitar = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/** Los motivos de un deportista para dejarlo o seguir, de −1 a 1 cada uno (lo que ve también el personaje). */
export function motivosDeAbandono(d: DatosDeAbandono, p: DatosDelDeportista, deporte: string): MotivoDeAbandono[] {
  const interes = interesPor(p.rasgos, deporte);
  const ambicion = (p.rasgos?.caracter.ambicion ?? 0) / 50;
  const presion = d.estudiosPorEdad[p.edad] ?? 0;
  const interesEstudio = (p.rasgos?.intereses.estudio ?? 0) / 3;
  const padres = p.padres ? (NIVEL_PRACTICA[p.padres.padre] + NIVEL_PRACTICA[p.padres.madre]) / 6 : 0.5;
  const motivos: MotivoDeAbandono[] = [
    { id: 'interes', fuerza: limitar((1.5 - interes) / 1.5, -1, 1), texto: interes >= 2 ? 'Le gusta mucho el fútbol.' : interes >= 1 ? 'El fútbol le gusta, sin más.' : 'Casi no le interesa el fútbol.' },
    { id: 'ambicion', fuerza: limitar(-ambicion, -1, 1), texto: ambicion >= 0.3 ? 'Es ambicioso: quiere llegar lejos.' : ambicion <= -0.3 ? 'No tiene ambición deportiva.' : 'Su ambición es normal.' },
    ...(p.titular === undefined ? [] : [{ id: 'minutos' as const, fuerza: p.titular ? -1 : 1, texto: p.titular ? 'Juega de titular.' : 'Juega pocos minutos.' }]),
    { id: 'estudios', fuerza: limitar(presion * (0.3 + 0.7 * interesEstudio), 0, 1), texto: presion >= 0.6 ? 'Los estudios le exigen mucho este curso.' : 'Los estudios no le quitan tiempo.' },
    { id: 'padres', fuerza: limitar(1 - 2 * padres, -1, 1), texto: padres >= 0.5 ? 'Sus padres hacen deporte y le animan.' : 'En su casa no hay costumbre de hacer deporte.' },
  ];
  return motivos;
}

/** La probabilidad de que un deportista deje el deporte este verano: la base de su edad, subida o bajada por cada motivo según su peso (de 0 a 0,9). */
export function probabilidadDeAbandonar(d: DatosDeAbandono, p: DatosDelDeportista, deporte: string): number {
  const base = baseDelAbandono(d, p.edad);
  const factor = 1 + motivosDeAbandono(d, p, deporte).reduce((t, m) => t + d.pesos[m.id] * m.fuerza, 0);
  return limitar(base * Math.max(0, factor), 0, 0.9);
}

/** ¿Lo deja este verano? Un sorteo estable suyo (no cambia si se pregunta dos veces el mismo verano). */
export const dejaElDeporte = (d: DatosDeAbandono, p: DatosDelDeportista, deporte: string, semilla: number, id: string, curso: number): boolean =>
  rngEstable('abandono', semilla, id, deporte, curso).chance(probabilidadDeAbandonar(d, p, deporte));
