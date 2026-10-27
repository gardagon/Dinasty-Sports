import { SERVICES, defineModule, type StudiesService } from '@ds/contracts';
import { Game } from '@ds/core';
import { MODULOS } from '@ds/game';

/**
 * BANCO DE NOTAS: ¿saca cada tipo de alumno la nota que sacaría en la vida real con su esfuerzo?
 * Alumnos con la misma aptitud en todas las asignaturas (floja 40, típica 60, brillante 85) siguen una rutina fija
 * durante un curso y se mide su nota media. Los objetivos se acordaron con el usuario (ver DECISIONES del 27/10/2026).
 * Solo carga personaje y estudios: es rápido y no depende de lo que hagan los bots.
 *
 *   npm run sim:notas              # tabla con los objetivos
 */

const pausas = defineModule({
  id: 'pausas',
  name: 'Pausas',
  description: 'Solo para el banco de notas: esperar 5 minutos.',
  actions: [{ id: 'pausas.cinco', name: 'Esperar 5 minutos', tags: [], duration: 5 }],
});
const modulo = (id: string) => MODULOS.find((m) => m.id === id)!;
const MODULOS_DEL_BANCO = [modulo('gen'), modulo('estudios'), pausas];
const INICIO_DE_CLASE = [480, 560, 680, 760];

export interface Rutina {
  id: string;
  nombre: string;
  /** Va a clase (si no, solo va los días de examen). */
  clase: boolean;
  /** Sesiones de estudio de 90 minutos de lunes a viernes y el fin de semana. */
  laborable: number;
  finde: number;
}

export const RUTINAS: readonly Rutina[] = [
  { id: 'nada', nombre: 'Ni clase ni estudio (solo va a los exámenes)', clase: false, laborable: 0, finde: 0 },
  { id: 'clase', nombre: 'Solo va a clase', clase: true, laborable: 0, finde: 0 },
  { id: '1h', nombre: 'Clase + ~1 h al día (1 sesión de lunes a viernes)', clase: true, laborable: 1, finde: 0 },
  { id: '3h', nombre: 'Clase + 3 h al día (2 sesiones todos los días)', clase: true, laborable: 2, finde: 2 },
];

export const APTITUDES = { floja: 40, tipica: 60, brillante: 85 } as const;
export type Perfil = keyof typeof APTITUDES;

/** Nota media esperada [mín, máx] por perfil y rutina. Lo que no está no se exige. */
export const OBJETIVOS: Partial<Record<Perfil, Partial<Record<string, [number, number]>>>> = {
  // «Ni clase ni estudio» acordado en 3–4: lo sube a ~4,2 el suelo de lo aprendido de base y Educación física (mínimo 5).
  tipica: { nada: [3, 4.5], clase: [5, 6], '1h': [6.5, 7.5], '3h': [7.5, 8.5] },
  // «Estudiando, 9 o más» en las asignaturas académicas: Educación física y Artística (que van con las skills) bajan la media.
  brillante: { clase: [6.5, 7], '3h': [8.5, 10] },
  floja: { '3h': [6, 7] },
};

export interface ResultadoDeNotas {
  perfil: Perfil;
  rutina: string;
  /** Nota media del curso (media de los tres trimestres), promediada entre semillas. */
  media: number;
  /** Estrés máximo al que llega (el estrés alto penaliza los exámenes). */
  estresMax: number;
}

function esperar(g: Game, minuto: number): void {
  for (let i = 0; i < 400 && g.time.minuteOfDay < minuto; i++) g.perform('pausas.cinco');
}

/** Un alumno con la misma aptitud en todas las asignaturas, que sigue la rutina durante `dias` días. */
export function alumno(seed: number, aptitud: number, r: Rutina, dias: number): { cursos: number[]; estresMax: number } {
  const nuevo = Game.create(MODULOS_DEL_BANCO, { seed });
  const asignaturas = nuevo.registry.statList.filter((s) => s.module === 'estudios').map((s) => s.def.id);
  const guardado = nuevo.serialize();
  // Lo aprendido de base es la aptitud menos 22 (MARGEN_DE_BASE del módulo estudios).
  const st = guardado.modules.estudios as { base?: Record<string, number> };
  st.base = {};
  for (const id of asignaturas) {
    st.base[id.replace('estudios.', '')] = aptitud - 22;
    guardado.stats[id] = aptitud;
  }
  const g = Game.load(MODULOS_DEL_BANCO, guardado);
  const svc = () => g.service<StudiesService>(SERVICES.estudios)!;
  const veces: Record<string, number> = {};
  let estresMax = 0;
  while (g.time.day < dias) {
    const dia = g.time.day;
    const examenHoy = svc().upcomingExams(1).some((x) => x.inDays === 0);
    if (g.time.isSchoolDay && (r.clase || examenHoy)) {
      for (let n = 1; n <= 4; n++) {
        esperar(g, INICIO_DE_CLASE[n - 1] - 10);
        g.perform(`estudios.clase_${n}`);
      }
    }
    esperar(g, g.time.isSchoolDay ? 16 * 60 : 10 * 60);
    // Estudia la asignatura que menos ha estudiado (reparte el esfuerzo).
    const activas = svc().activeSubjects();
    for (let i = 0; i < (g.time.isWeekend ? r.finde : r.laborable); i++) {
      const k = [...activas].sort((a, b) => (veces[a] ?? 0) - (veces[b] ?? 0))[0];
      if (g.perform(k.replace('estudios.', 'estudios.estudiar_')).ok) veces[k] = (veces[k] ?? 0) + 1;
    }
    // Como haría una persona: si el estrés aprieta, desconecta un rato.
    for (let i = 0; i < 3 && g.stat('gen.estres') > 30 && g.time.minuteOfDay < 19 * 60; i++) g.perform('gen.ocio');
    estresMax = Math.max(estresMax, g.stat('gen.estres'));
    esperar(g, 21 * 60);
    g.perform('gen.dormir');
    while (g.time.day === dia) g.perform('pausas.cinco');
  }
  const boletines = svc().reports();
  const cursos = [...new Set(boletines.map((b) => b.curso))].map((c) => {
    const xs = boletines.filter((b) => b.curso === c);
    return xs.reduce((a, b) => a + b.media, 0) / xs.length;
  });
  return { cursos, estresMax };
}

/** Todos los perfiles y rutinas; la media es la del último curso completo. */
export function bancoDeNotas(opts: { semillas?: number[]; dias?: number } = {}): ResultadoDeNotas[] {
  const semillas = opts.semillas ?? [1, 2];
  const dias = opts.dias ?? 365;
  const out: ResultadoDeNotas[] = [];
  for (const perfil of Object.keys(APTITUDES) as Perfil[]) {
    for (const r of RUTINAS) {
      const xs = semillas.map((s) => alumno(s, APTITUDES[perfil], r, dias));
      out.push({
        perfil,
        rutina: r.id,
        media: xs.reduce((a, x) => a + x.cursos[x.cursos.length - 1], 0) / xs.length,
        estresMax: Math.max(...xs.map((x) => x.estresMax)),
      });
    }
  }
  return out;
}

/** Objetivo de un resultado y si lo cumple (con un margen por el azar de los exámenes). */
export function cumple(r: ResultadoDeNotas, margen = 0.3): { objetivo?: [number, number]; ok: boolean } {
  const objetivo = OBJETIVOS[r.perfil]?.[r.rutina];
  return { objetivo, ok: !objetivo || (r.media >= objetivo[0] - margen && r.media <= objetivo[1] + margen) };
}

if (process.argv[1]?.endsWith('notas.ts')) {
  const dias = Number(process.argv.find((a) => a.startsWith('--dias='))?.split('=')[1] ?? 730);
  const t0 = Date.now();
  const res = bancoDeNotas({ semillas: [1, 2, 3], dias });
  console.log(`\n# Banco de notas (${dias} días, 3 semillas; nota media del último curso)\n`);
  console.log(`| Rutina | ${Object.entries(APTITUDES).map(([p, a]) => `${p} (${a})`).join(' | ')} |`);
  console.log(`|---|${Object.keys(APTITUDES).map(() => '---').join('|')}|`);
  let fallos = 0;
  for (const r of RUTINAS) {
    const celdas = (Object.keys(APTITUDES) as Perfil[]).map((p) => {
      const x = res.find((y) => y.perfil === p && y.rutina === r.id)!;
      const c = cumple(x, 0);
      if (!c.ok) fallos++;
      return `${x.media.toFixed(1)}${c.objetivo ? ` ${c.ok ? '✅' : '⚠️'} (${c.objetivo[0]}–${c.objetivo[1]})` : ''}`;
    });
    console.log(`| ${r.nombre} | ${celdas.join(' | ')} |`);
  }
  console.log(`\n${fallos ? `${fallos} fuera de objetivo.` : 'Todo dentro de los objetivos.'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
