import {
  CORE_EVENTS,
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  defineModule,
  inHours,
  isSchoolHours,
  NIVEL_ESTADO,
  type ActionDef,
  type CompetitionResultData,
  type NpcDirectory,
  type NpcView,
  type ProfileService,
  type ReadContext,
  compatibilidad,
  factorDeCompatibilidad,
  type RelationView,
  type RelationsService,
} from '@ds/contracts';
import { conCambio, conContacto, nuevoVinculo, pasarDia, type Vinculo } from './vinculo';

/**
 * MÓDULO RELACIONES (id `relaciones`).
 *
 * Cómo se vive con cada persona. La población (quién existe, sus rivales, su edad, su club) es del módulo `npcs`,
 * que se consulta por su servicio; aquí vive el vínculo con cada una: afinidad, confianza, estado e historia.
 * Quien aparece en el reparto ya se conoce (vínculo en 0, "conocido"); los rivales se conocen al competir contra ellos.
 *
 * - Acciones con cada persona (quedar, hablar), con la misma duración y horario que tenían.
 * - Apoyo: quien te cae bien (afinidad ≥ 40) y apoya una etiqueta de acción te da eficiencia.
 * - Se enfría con los días sin verse y cambia con los resultados de las carreras.
 * - Publica el servicio `relaciones`.
 */

export interface RelacionesState {
  /** Solo hay vínculo guardado de quien ya ha tenido contacto o un cambio; el resto es "conocido" en 0 de forma implícita. */
  vinculos: Record<string, Vinculo>;
}

const UMBRAL_APOYO = 40;

const dirDe = (ctx: ReadContext) => ctx.service<NpcDirectory>(SERVICES.npcs);

/** ¿Conoce el personaje a esta persona? Los rivales, solo tras competir contra ellos. */
const conocida = (n: NpcView) => n.known !== false;

const vinculoDe = (s: RelacionesState, n: NpcView, dia: number): Vinculo => s.vinculos[n.id] ?? nuevoVinculo(n.id, dia);

const vista = (v: Vinculo): RelationView => ({
  npcId: v.npcId,
  estado: v.estado,
  nivel: NIVEL_ESTADO[v.estado],
  afinidad: v.afinidad,
  confianza: v.confianza,
  ultimoContacto: v.ultimoContacto,
});

const fueraDeClase = (desde: number, hasta: number) => (ctx: ReadContext) =>
  !isSchoolHours(ctx.time) && inHours(ctx.time, desde, hasta) ? true : `Disponible de ${desde} a ${hasta}, fuera de clase`;

function interaccion(
  n: NpcView,
  cfg: {
    suffix: string;
    name: string;
    duration: number;
    tags: string[];
    /** Afinidad y confianza que suma (se escalan con la eficiencia). */
    ganancia: number;
    confianza: number;
    /** Genéricas que entrena la interacción. */
    train: { stat: string; amount: number }[];
    horario: (ctx: ReadContext) => true | string;
  },
): ActionDef {
  return {
    id: `relaciones.${cfg.suffix}.${n.id}`,
    name: cfg.name,
    tags: cfg.tags,
    group: 'Relaciones',
    duration: cfg.duration,
    available: (ctx) => {
      if (ctx.state<RelacionesState>().vinculos[n.id]?.ultimoContacto === ctx.time.day) return `Ya has estado con ${n.name.split(' ')[0]} hoy`;
      return cfg.horario(ctx);
    },
    delta: cfg.tags.includes(TAGS.ocio) ? { [GEN.energia]: -6, [GEN.estres]: -6 } : { [GEN.energia]: -3 },
    train: cfg.train,
    run: (ctx) => {
      const dia = ctx.time.day;
      ctx.updateState<RelacionesState>((s) => ({
        vinculos: { ...s.vinculos, [n.id]: conContacto(s.vinculos[n.id] ?? nuevoVinculo(n.id, dia), dia, cfg.ganancia * ctx.efficiency, cfg.confianza * ctx.efficiency) },
      }));
    },
  };
}

export const relaciones = defineModule<RelacionesState>({
  id: 'relaciones',
  name: 'Relaciones',
  description: 'Vínculos con las personas que rodean al personaje.',
  dependsOn: ['gen'],

  initState: () => ({ vinculos: {} }),

  dynamicActions: (ctx) => {
    const dir = dirDe(ctx);
    if (!dir) return [];
    const lista: ActionDef[] = [];
    for (const n of [...dir.list({ role: 'companero' }), ...dir.list({ role: 'amigo' })]) {
      lista.push(
        interaccion(n, {
          suffix: 'quedar',
          name: `Quedar con ${n.name.split(' ')[0]}`,
          duration: 120,
          tags: [TAGS.social, TAGS.ocio],
          ganancia: 5,
          confianza: 3,
          train: [
            { stat: GEN.carisma, amount: 0.8 },
            { stat: GEN.empatia, amount: 0.4 },
            { stat: GEN.cooperacion, amount: 0.3 },
          ],
          horario: fueraDeClase(10, 22),
        }),
      );
    }
    for (const n of dir.list({ role: 'entrenador' })) {
      lista.push(
        interaccion(n, {
          suffix: 'hablar',
          name: `Hablar con ${n.name.split(' ')[0]} (${n.gender === 'f' ? 'entrenadora' : 'entrenador'})`,
          duration: 30,
          tags: [TAGS.social],
          ganancia: 4,
          confianza: 2.5,
          train: [
            { stat: GEN.comunicacion, amount: 0.6 },
            { stat: GEN.carisma, amount: 0.3 },
          ],
          horario: (c) => (!c.time.isSchoolDay ? fueraDeClase(9, 14)(c) : fueraDeClase(15, 21)(c)),
        }),
      );
    }
    for (const n of dir.list({ role: 'profesor' })) {
      lista.push(
        interaccion(n, {
          suffix: 'hablar',
          name: `Hablar con ${n.name.split(' ')[0]} (${n.gender === 'f' ? 'tutora' : 'tutor'})`,
          duration: 30,
          tags: [TAGS.social, TAGS.estudio],
          ganancia: 4,
          confianza: 2.5,
          train: [
            { stat: GEN.comunicacion, amount: 0.6 },
            { stat: GEN.carisma, amount: 0.3 },
          ],
          horario: (c) => (c.time.isSchoolDay && inHours(c.time, 14, 17) ? true : 'Tutorías los días de clase, de 14 a 17'),
        }),
      );
    }
    return lista;
  },

  modifiers: [
    {
      // Compatibilidad: con quien comparte intereses y se parece en carácter, lo que sube la afinidad rinde más (×0,7 a ×1,4).
      id: 'relaciones.compatibilidad',
      tags: ['*'],
      apply: (ctx, action) => {
        if (!action.id.startsWith('relaciones.')) return null;
        const n = dirDe(ctx)?.get(action.id.split('.').pop()!);
        const yo = ctx.service<ProfileService>(SERVICES.perfil)?.view();
        if (!n?.rasgos || !yo) return null;
        const f = factorDeCompatibilidad(compatibilidad(n.rasgos, yo));
        return Math.abs(f - 1) < 0.02 ? null : { efficiency: f, reason: `Compatibilidad con ${n.name.split(' ')[0]}` };
      },
    },
    {
      id: 'relaciones.apoyo',
      tags: ['*'],
      apply: (ctx, action) => {
        const dir = dirDe(ctx);
        if (!dir) return null;
        let bonus = 0;
        const quienes: string[] = [];
        for (const v of Object.values(ctx.state<RelacionesState>().vinculos)) {
          if (v.afinidad < UMBRAL_APOYO) continue;
          const n = dir.get(v.npcId);
          if (!n || !n.supports.some((t) => action.tags.includes(t))) continue;
          bonus += Math.min(0.15, (v.afinidad - UMBRAL_APOYO) / 400);
          quienes.push(n.name.split(' ')[0]);
        }
        if (bonus < 0.01) return null;
        return { efficiency: 1 + Math.min(0.3, bonus), reason: `Apoyo de ${quienes.join(', ')}` };
      },
    },
  ],

  on: {
    [CORE_EVENTS.DAY_END]: (ctx, ev) => {
      const { day } = ev.data as { day: number };
      ctx.updateState<RelacionesState>((s) => {
        const vinculos: Record<string, Vinculo> = {};
        for (const [id, v] of Object.entries(s.vinculos)) vinculos[id] = pasarDia(v, day);
        return { vinculos };
      });
    },

    [SHARED_EVENTS.COMPETITION_RESULT]: (ctx, ev) => {
      const r = ev.data as CompetitionResultData;
      const dir = dirDe(ctx);
      if (!dir) return;
      const dia = ctx.time.day;
      ctx.updateState<RelacionesState>((s) => {
        const vinculos = { ...s.vinculos };
        // El entrenador de ese deporte valora el esfuerzo y más aún el podio.
        for (const n of dir.list({ role: 'entrenador' })) {
          if (n.supports.includes(r.module)) vinculos[n.id] = conCambio(vinculoDe(s, n, dia), dia, r.position <= 3 ? 3 : 1);
        }
        // Los rivales que te ganan se crecen; los que pierden, te respetan un poco más. Competir con alguien es conocerlo.
        for (const p of r.participants) {
          const n = p.npcId ? dir.get(p.npcId) : undefined;
          if (!n || n.role !== 'rival') continue;
          vinculos[n.id] = conCambio(vinculos[n.id] ?? nuevoVinculo(n.id, dia), dia, p.mark > r.mark ? 1 : -0.5);
        }
        return { vinculos };
      });
    },
  },

  services: {
    [SERVICES.relaciones]: (ctx): RelationsService => {
      const s = ctx.state<RelacionesState>();
      const dir = dirDe(ctx);
      const dia = ctx.time.day;
      return {
        get: (npcId) => {
          const guardado = s.vinculos[npcId];
          if (guardado) return vista(guardado);
          const n = dir?.get(npcId);
          return n && conocida(n) ? vista(nuevoVinculo(n.id, dia)) : undefined;
        },
        list: () => {
          const lista = new Map<string, RelationView>();
          for (const n of dir?.list() ?? []) if (conocida(n)) lista.set(n.id, vista(vinculoDe(s, n, dia)));
          for (const v of Object.values(s.vinculos)) lista.set(v.npcId, vista(v));
          return [...lista.values()];
        },
      };
    },
  },
});

export default relaciones;
