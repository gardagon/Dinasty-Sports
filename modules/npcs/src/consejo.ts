/**
 * El consejo sobre los puestos (`NpcDirectory.consejoDeportivo` y `lecturaDePuesto`): lo que ve un profesor de Educación Física o un entrenador en el personaje.
 * Lógica común a todo deporte con puestos; los textos son datos del deporte (`PuestosDeDeporte.pistas`). **Sin cifras** para el jugador (`VISION.md`, principio 7).
 *
 * Los puestos van **sin lado** (`FamiliaDePuestos`: «lateral», no izquierdo y derecho) y se comparan **con los niños de su edad y consigo mismo**, no en valor absoluto
 * (decisión del usuario, 21/11/2026): la puntuación de una familia es lo que vale el personaje en ella por encima de la mediana de los de su edad que ya juegan, más lo que
 * vale por encima de su propia media. El azar estable de ±2 puntos del día se mantiene (se descartó quitarlo).
 */
import {
  type ConsejoDeDeporte,
  type FamiliaDePuestos,
  type IdentityService,
  type LecturaDePuesto,
  type ReadContext,
  SERVICES,
  familiasDePuestos,
  pesosDeFamilia,
  rngEstable,
  valoresPorFamilia,
} from '@ds/contracts';
import { type Npc, type PoblacionGuardada, edadNpc } from './index';
import { lectorDeUnNpc, valoracionDe, valoresPorPuestoDe } from './plaza';
import type { Rendimientos } from './semana';

/** Cuántos niños de su edad se miran stat a stat (los de id menor: siempre los mismos): basta para una mediana y no cuesta de más. */
const MUESTRA_DE_COMPANEROS = 40;
/** Cuántos de los que ya juegan hacen falta para decir «frente a los de tu edad»; con menos, solo se compara consigo mismo. */
const MINIMO_DE_COMPANEROS = 3;
/** El azar estable del consejo del día (puntos): se mantiene, decisión del usuario. */
export const AZAR_DEL_CONSEJO = 2;
/** A partir de qué parte de los de su edad (percentil) se dice que «ya estás para ese puesto» y cuál es «cerca»; por debajo, «lejos». */
export const UMBRALES_DE_LECTURA = { ya: 0.6, cerca: 0.25 } as const;
/** Cuántas cualidades se nombran como máximo, a favor y en contra. */
const CUALIDADES_QUE_SE_NOMBRAN = 3;

const mediana = (xs: readonly number[]): number => {
  const o = [...xs].sort((a, b) => a - b);
  return o.length ? o[Math.floor((o.length - 1) / 2)] : 0;
};

/** Lo que se sabe de los niños de la edad del personaje que ya juegan el deporte, calculado una vez. */
interface Companeros {
  /** Lo que vale cada uno en cada familia (sin pierna). */
  porFamilia: Record<string, number>[];
  /** Una muestra de ellos, con sus stats. */
  muestra: { stat(id: string): number }[];
}

function companerosDe(ctx: ReadContext, lista: readonly Npc[], pob: PoblacionGuardada, rend: Rendimientos, dia: number, edad: number): Companeros {
  const val = valoracionDe(rend);
  const suyos = lista.filter((n) => n.deporte === pob.deporte && edadNpc(n, dia) === edad).sort((a, b) => (a.id < b.id ? -1 : 1));
  const porFamilia = suyos.flatMap((n) => {
    const v = valoresPorPuestoDe(n, pob, val, dia);
    return v ? [valoresPorFamilia(pob.puestos!, v)] : [];
  });
  const muestra = suyos.slice(0, MUESTRA_DE_COMPANEROS).flatMap((n) => {
    const l = lectorDeUnNpc(n, pob, dia);
    return l ? [l] : [];
  });
  void ctx;
  return { porFamilia, muestra };
}

/** Las stats de una o varias familias que más pesan, con lo que aportan al personaje (a favor o en contra) frente a los de su edad (o frente a su media si no hay con quién compararse). */
function aportes(ctx: ReadContext, pob: PoblacionGuardada, familias: readonly FamiliaDePuestos[], c: Companeros): { stat: string; aporte: number }[] {
  const pesos: Record<string, number> = {};
  for (const f of familias) for (const [k, v] of Object.entries(pesosDeFamilia(pob.puestos!, f))) pesos[k] = (pesos[k] ?? 0) + v / familias.length;
  const stats = Object.keys(pesos);
  const mias = Object.fromEntries(stats.map((k) => [k, ctx.stat(k)]));
  const propia = stats.reduce((t, k) => t + (mias[k] ?? 0) * (pesos[k] ?? 0), 0) / (stats.reduce((t, k) => t + (pesos[k] ?? 0), 0) || 1);
  return stats.map((k) => {
    const referencia = c.muestra.length >= MINIMO_DE_COMPANEROS ? mediana(c.muestra.map((l) => l.stat(k))) : propia;
    return { stat: k, aporte: (pesos[k] ?? 0) * ((mias[k] ?? 0) - referencia) };
  });
}

/** Las cualidades escritas de los mayores aportes a favor (o en contra) que el deporte sabe decir. */
const cualidadesDe = (pob: PoblacionGuardada, xs: readonly { stat: string; aporte: number }[], a: 'tiene' | 'falta'): { stat: string; texto: string }[] =>
  xs
    .filter((x) => (a === 'tiene' ? x.aporte > 0 : x.aporte < 0) && pob.puestos?.pistas?.cualidades[x.stat])
    .sort((p, q) => (a === 'tiene' ? q.aporte - p.aporte : p.aporte - q.aporte) || (p.stat < q.stat ? -1 : 1))
    .slice(0, CUALIDADES_QUE_SE_NOMBRAN)
    .map((x) => ({ stat: x.stat, texto: pob.puestos!.pistas!.cualidades[x.stat][a] }));

/**
 * Lo que ve un profesor de Educación Física en el personaje: los deportes en que rinde al menos el 90 % de la mediana de los niños de su edad que ya juegan (o en los que aún no juega nadie) y, en los que tienen
 * puestos, **tres puestos sin lado** en que más destaca: lo que vale en cada uno frente a los de su edad y frente a sí mismo, más el azar estable del día. Con el porqué en cualidades (`tiene`).
 */
export function consejoDeUnProfesor(ctx: ReadContext, lista: readonly Npc[], pobs: readonly PoblacionGuardada[], rend: Rendimientos, dia: number): ConsejoDeDeporte[] {
  const edad = ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;
  const consejos: ConsejoDeDeporte[] = [];
  for (const pob of pobs) {
    const f = rend.get(pob.deporte);
    if (!f) continue;
    const suyos = lista.filter((n) => n.deporte === pob.deporte && edadNpc(n, dia) === edad).map((n) => n.levels[pob.deporte] ?? 0).sort((a, b) => a - b);
    if (f(ctx) < 0.9 * (suyos.length ? suyos[Math.floor((suyos.length - 1) / 2)] : 0)) continue;
    const crudos = f.puestos?.(ctx);
    if (!crudos || !pob.puestos) {
      consejos.push({ deporte: pob.deporte, nombre: pob.nombre, puestos: [] });
      continue;
    }
    const familias = familiasDePuestos(pob.puestos);
    const mios = valoresPorFamilia(pob.puestos, crudos);
    const c = companerosDe(ctx, lista, pob, rend, dia, edad);
    const propia = Object.values(mios).reduce((a, b) => a + b, 0) / (Object.keys(mios).length || 1);
    const elegidas = familias
      .map((fam) => {
        const frenteALosDeSuEdad = c.porFamilia.length >= MINIMO_DE_COMPANEROS ? (mios[fam.id] ?? 0) - mediana(c.porFamilia.map((v) => v[fam.id] ?? 0)) : 0;
        const frenteASiMismo = (mios[fam.id] ?? 0) - propia;
        const percibido = frenteALosDeSuEdad + frenteASiMismo + AZAR_DEL_CONSEJO * (2 * rngEstable('consejo', ctx.time.day, pob.deporte, fam.id).next() - 1);
        return { fam, percibido };
      })
      .sort((a, b) => b.percibido - a.percibido || (a.fam.id < b.fam.id ? -1 : 1))
      .slice(0, 3)
      .map((x) => x.fam);
    const tiene = pob.puestos.pistas ? cualidadesDe(pob, aportes(ctx, pob, elegidas, c), 'tiene').map((x) => x.texto) : undefined;
    consejos.push({ deporte: pob.deporte, nombre: pob.nombre, puestos: elegidas.map((x) => ({ id: x.id, nombre: x.nombre })), ...(tiene ? { tiene } : {}), ...(pob.puestos.pistas ? { pistas: pob.puestos.pistas } : {}) });
  }
  return consejos;
}

/** Los puestos sin lado de cada deporte con puestos (`NpcDirectory.familiasDePuestos`). */
export const familiasDePuestosDeLosDeportes = (pobs: readonly PoblacionGuardada[]): { deporte: string; nombre: string; familias: { id: string; nombre: string }[] }[] =>
  pobs.filter((p) => p.puestos).map((p) => ({ deporte: p.deporte, nombre: p.nombre, familias: familiasDePuestos(p.puestos!).map((f) => ({ id: f.id, nombre: f.nombre })) }));

/**
 * Cómo va el personaje para un puesto sin lado (`NpcDirectory.lecturaDePuesto`): frente a los niños de su edad que ya juegan, en qué tramo está (`ya` desde el percentil 60, `cerca` desde el 25) y qué
 * cualidades tiene y le faltan para él. Es lo que dice quien le conoce (profesor o entrenador) si le preguntas por un puesto.
 */
export function lecturaDeUnPuesto(ctx: ReadContext, lista: readonly Npc[], pobs: readonly PoblacionGuardada[], rend: Rendimientos, dia: number, deporte: string, familia: string): LecturaDePuesto | undefined {
  const pob = pobs.find((p) => p.deporte === deporte);
  const f = rend.get(deporte);
  const fam = pob?.puestos ? familiasDePuestos(pob.puestos).find((x) => x.id === familia) : undefined;
  const crudos = f?.puestos?.(ctx);
  if (!pob?.puestos || !fam || !crudos) return undefined;
  const edad = ctx.service<IdentityService>(SERVICES.identidad)?.view().seasonAge ?? 8;
  const c = companerosDe(ctx, lista, pob, rend, dia, edad);
  const mio = valoresPorFamilia(pob.puestos, crudos)[fam.id] ?? 0;
  const de = c.porFamilia.map((v) => v[fam.id] ?? 0);
  const percentil = de.length >= MINIMO_DE_COMPANEROS ? de.filter((v) => v <= mio).length / de.length : undefined;
  const nivel: LecturaDePuesto['nivel'] = percentil === undefined ? 'sinDatos' : percentil >= UMBRALES_DE_LECTURA.ya ? 'ya' : percentil >= UMBRALES_DE_LECTURA.cerca ? 'cerca' : 'lejos';
  const xs = aportes(ctx, pob, [fam], c);
  const frenan = xs.filter((x) => x.aporte < 0).sort((p, q) => p.aporte - q.aporte || (p.stat < q.stat ? -1 : 1)).slice(0, CUALIDADES_QUE_SE_NOMBRAN).map((x) => x.stat);
  return {
    deporte,
    familia: { id: fam.id, nombre: fam.nombre },
    nivel,
    tiene: cualidadesDe(pob, xs, 'tiene').map((x) => x.texto),
    falta: cualidadesDe(pob, xs, 'falta').map((x) => x.texto),
    frenan,
    ...(pob.puestos.pistas ? { pistas: pob.puestos.pistas } : {}),
  };
}
