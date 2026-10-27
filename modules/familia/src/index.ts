import { GEN, alturaAdulta, apellidosDeFamilia, nacimientoDeProgenitor, nombreDeProgenitor, PRACTICA_TEXTO, SERVICES, practicaSegunTope, defineModule, type FamilyService, type Gender, type InitContext,
  type NpcDirectory, type ParentView, type Practica, type RasgosDe, type ReadContext } from '@ds/contracts';

/**
 * MÓDULO FAMILIA (id `familia`).
 * El padre y la madre del personaje. Su genética (los topes de los que sale el personaje) la guarda el motor y no se
 * enseña; aquí viven la persona: nombre, edad, altura, el deporte que hicieron y cómo viven al personaje (apoyo,
 * expectativas y tiempo en casa). Esos tres últimos no hacen nada todavía: los moverán los eventos y las decisiones.
 */

export interface Progenitor {
  id: 'padre' | 'madre';
  nombre: string;
  gender: Gender;
  /** Día de nacimiento respecto al inicio de la partida (negativo). */
  nacimiento: number;
  alturaCm: number;
  deporte?: string;
  practica: Practica;
  perks: { activos: string[]; pool: string[] };
  /** Origen, apariencia, carácter, intereses y gustos. */
  rasgos: RasgosDe;
  apoyo: number;
  expectativas: number;
  tiempoEnCasa: number;
}

export interface FamiliaState {
  apellidos: string;
  padres: Progenitor[];
}

const DEPORTES = ['atletismo', 'fútbol', 'baloncesto', 'natación', 'ciclismo', 'balonmano', 'tenis'];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const redondea = (v: number) => Math.round(v * 10) / 10;

const FISICAS = [GEN.velocidad, GEN.fuerza, GEN.resistencia, GEN.constitucion, GEN.agilidad, GEN.coordinacion];

function nuevoProgenitor(id: 'padre' | 'madre', ctx: InitContext): Progenitor {
  const { rng } = ctx;
  const gender: Gender = id === 'padre' ? 'm' : 'f';
  // Su tope físico medio (el mismo perfil del que hereda el personaje) decide hasta dónde llegó en el deporte.
  const topes = ctx.topesDePadres[id];
  const fisico = FISICAS.map((f) => topes[f]).filter((t): t is number => t !== undefined);
  const practica = practicaSegunTope(fisico.length ? fisico.reduce((a, b) => a + b, 0) / fisico.length : 62, rng);
  return {
    id,
    nombre: nombreDeProgenitor(ctx.seed, id),
    gender,
    nacimiento: nacimientoDeProgenitor(ctx.seed, id),
    alturaCm: redondea(alturaAdulta(gender, ctx.herencia('estatura')[id])),
    ...(practica === 'ninguna' ? {} : { deporte: rng.pick(DEPORTES) }),
    practica,
    perks: { activos: [...ctx.perksDePadres[id].activos], pool: [...ctx.perksDePadres[id].pool] },
    rasgos: ctx.rasgosDePadres[id],
    apoyo: Math.round(rng.range(45, 85)),
    expectativas: Math.round(rng.range(30, 80)),
    tiempoEnCasa: Math.round(rng.range(25, 80)),
  };
}

const vista = (p: Progenitor, day: number): ParentView => ({
  id: p.id,
  nombre: p.nombre,
  gender: p.gender,
  edad: Math.floor((day - p.nacimiento) / 365),
  alturaCm: p.alturaCm,
  deporte: p.deporte,
  practica: p.practica,
  perks: p.perks,
  rasgos: p.rasgos,
  apoyo: p.apoyo,
  expectativas: p.expectativas,
  tiempoEnCasa: p.tiempoEnCasa,
});

/** Texto breve de lo que hizo en el deporte (para la interfaz). */
export const textoPractica = (p: Pick<ParentView, 'practica' | 'deporte'>): string =>
  p.deporte ? `${PRACTICA_TEXTO[p.practica]} (${p.deporte})` : PRACTICA_TEXTO[p.practica];

export const familia = defineModule<FamiliaState>({
  id: 'familia',
  name: 'Familia',
  description: 'El padre y la madre del personaje.',
  dependsOn: ['gen'],
  initState: (ctx) => {
    return {
      // Los dos apellidos salen de la semilla para que los hermanos (módulo `npcs`) lleven los mismos sin depender de este módulo.
      apellidos: apellidosDeFamilia(ctx.seed),
      padres: [nuevoProgenitor('padre', ctx), nuevoProgenitor('madre', ctx)],
    };
  },
  services: {
    [SERVICES.familia]: (ctx: ReadContext): FamilyService => {
      const s = ctx.state<FamiliaState>();
      return {
        apellidos: s.apellidos,
        parents: () => s.padres.map((p) => vista(p, ctx.time.day)),
        siblings: () => ctx.service<NpcDirectory>(SERVICES.npcs)?.list({ tag: 'hermano' }) ?? [],
      };
    },
  },
});

export default familia;
