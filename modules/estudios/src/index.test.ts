import { describe, expect, it } from 'vitest';
import { SERVICES, defineModule, type StudiesService } from '@ds/contracts';
import { Game, advanceTo, advanceToWeek, advanceUntil, type ActionResult } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { estudios, nivelDeAsignatura, notaExamen, notaFinal, type EstudiosState } from './index';
import { ASIGNATURAS, CURSOS_ESPANA, asignaturasDelCurso, clasesPorSemana, diaDeExamen, elegirModalidad, horarioDeClases, horarioSemanal, pesoDeClase } from './curriculo';

/** Días de la semana en que se da una asignatura del primer curso. */
const diasDe = (k: string): number[] => horarioSemanal(asignaturasDelCurso(0))[k];

/** Un módulo de pruebas con una pausa de 5 minutos: entre clase y clase solo se puede entrar 10 minutos antes, así que hay que esperar poco. */
const pausas = defineModule({
  id: 'pausas',
  name: 'Pausas',
  description: 'Solo para los tests: esperar 5 minutos.',
  actions: [{ id: 'pausas.cinco', name: 'Esperar 5 minutos', tags: [], duration: 5 }],
});

const nueva = () => Game.create([personaje, estudios, pausas], { seed: 3 });

/** Espera (de 5 en 5 minutos) hasta ese minuto del día. */
function esperarHasta(g: Game, minutoDelDia: number): void {
  for (let i = 0; i < 300 && g.time.minuteOfDay < minutoDelDia; i++) g.perform('pausas.cinco');
}

const INICIO_DE_CLASE = [480, 560, 680, 760];
/** Va a la clase n (1 a 4): espera hasta 10 minutos antes de que empiece y entra. */
function irAClase(g: Game, n: number): ActionResult {
  esperarHasta(g, INICIO_DE_CLASE[n - 1] - 10);
  return g.perform(`estudios.clase_${n}`);
}

/** Va a todas las clases del día, a tiempo, desde donde esté el reloj (hasta 4). */
function irAClases(g: Game): void {
  for (let n = 1; n <= 4; n++) {
    if (g.preview(`estudios.clase_${n}`)?.reason === 'Ya has ido a esta clase') continue;
    if (g.time.minuteOfDay > INICIO_DE_CLASE[n - 1] - 10 && !g.preview(`estudios.clase_${n}`)?.available) continue;
    irAClase(g, n);
  }
}

describe('módulo estudios', () => {
  it('funciona solo con el módulo base', () => {
    const g = nueva();
    expect(g.stat('estudios.matematicas')).toBeGreaterThan(0);
  });

  it('la jornada son 4 clases con un recreo, de 8:00 a 14:00, solo entre semana', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 0, 7);
    esperarHasta(g, 7 * 60 + 40);
    expect(g.preview('estudios.clase_1')!.available).toBe(false); // todavía falta más de 10 minutos
    expect(g.preview('estudios.clase_1')!.reason).toMatch(/10 minutos antes/);
    esperarHasta(g, 7 * 60 + 50);
    expect(g.preview('estudios.clase_1')!.available).toBe(true);
    expect(g.preview('estudios.clase_2')!.available).toBe(false);
    g.perform('estudios.clase_1'); // entra a las 7:50 y espera: 10 min + 75 de clase
    expect(g.time.minuteOfDay).toBe(9 * 60 + 15); // la clase acaba 5 minutos antes de la hora de la siguiente (9:20)
    expect(g.preview('estudios.clase_1')!.available).toBe(false);
    irAClase(g, 2);
    expect(g.time.minuteOfDay).toBe(10 * 60 + 35);
    esperarHasta(g, 10 * 60 + 40);
    g.perform('estudios.recreo');
    expect(g.time.minuteOfDay).toBe(11 * 60 + 20);
    irAClase(g, 3);
    irAClase(g, 4);
    expect(g.time.minuteOfDay).toBe(13 * 60 + 55);
    expect(g.moduleState<EstudiosState>('estudios').asistencia.clases).toEqual([0, 1, 2, 3]);
    advanceTo(g, 'gen.descansar', 5, 8);
    expect(g.preview('estudios.sin_clase')!.reason).toMatch(/no hay clase/);
    expect(g.preview('estudios.clase_1')).toBeUndefined();
  });

  it('se puede llegar tarde y solo cuenta la parte asistida; se entra hasta el último minuto y al acabar ya no', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 0, 7);
    esperarHasta(g, 8 * 60 + 25); // 25 de 75 minutos perdidos: se asiste a 50/75
    const o = g.preview('estudios.clase_1')!;
    expect(o.available).toBe(true);
    expect(o.efficiency).toBeCloseTo(50 / 75, 5);
    expect(o.modifiers.some((m) => m.id === 'estudios.llegada_tarde')).toBe(true);
    // A tiempo sube más que tarde.
    const aTiempo = nueva();
    advanceTo(aTiempo, 'gen.descansar', 0, 7);
    esperarHasta(aTiempo, 7 * 60 + 55);
    const hoy = g.service<StudiesService>(SERVICES.estudios)!.timetable(0)[0];
    const antesTarde = g.stat(hoy);
    const antesATiempo = aTiempo.stat(hoy);
    g.perform('estudios.clase_1');
    aTiempo.perform('estudios.clase_1');
    expect(g.stat(hoy) - antesTarde).toBeGreaterThan(0);
    expect(g.stat(hoy) - antesTarde).toBeLessThan(aTiempo.stat(hoy) - antesATiempo);
    // Asistir tarde no es faltar.
    expect(g.moduleState<EstudiosState>('estudios').asistencia.clases).toEqual([0]);
    const tarde = nueva();
    advanceTo(tarde, 'gen.descansar', 0, 7);
    esperarHasta(tarde, 9 * 60 + 10);
    const ultimo = tarde.preview('estudios.clase_1')!;
    expect(ultimo.available).toBe(true); // quedan 5 minutos: se asiste a 5/75
    expect(ultimo.efficiency).toBeCloseTo(5 / 75, 5);
    esperarHasta(tarde, 9 * 60 + 15);
    expect(tarde.preview('estudios.clase_1')!.available).toBe(false);
    expect(tarde.preview('estudios.clase_1')!.reason).toMatch(/ya ha acabado/);
  });

  it('en los 10 minutos antes de la clase se puede repasar su asignatura', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 0, 7);
    esperarHasta(g, 7 * 60 + 40);
    expect(g.preview('estudios.repaso_previo')).toBeUndefined();
    esperarHasta(g, 7 * 60 + 50);
    const o = g.preview('estudios.repaso_previo')!;
    expect(o.available).toBe(true);
    expect(o.duration).toBe(10);
    const hoy = g.service<StudiesService>(SERVICES.estudios)!.timetable(0)[0];
    const antes = g.stat(hoy);
    expect(g.perform('estudios.repaso_previo').ok).toBe(true);
    expect(g.stat(hoy)).toBeGreaterThan(antes);
    expect(g.time.minuteOfDay).toBe(8 * 60);
    // Vale la parte de los 10 minutos que se gasta: a 5 minutos de la clase, el 50 %.
    const tarde = nueva();
    advanceTo(tarde, 'gen.descansar', 0, 7);
    esperarHasta(tarde, 7 * 60 + 55);
    const parcial = tarde.preview('estudios.repaso_previo')!;
    expect(parcial.duration).toBe(5);
    expect(parcial.efficiency).toBeCloseTo(0.5, 5);
    const antesT = tarde.stat(hoy);
    tarde.perform('estudios.repaso_previo');
    expect(tarde.stat(hoy) - antesT).toBeLessThan(g.stat(hoy) - antes);
  });

  it('faltar a una clase no sube esa asignatura, suma una falta y sube el estrés', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 0, 7);
    const hoy = g.service<StudiesService>(SERVICES.estudios)!.timetable(0);
    const antes = g.stat(hoy[3]);
    for (const n of [1, 2, 3]) irAClase(g, n);
    advanceTo(g, 'gen.descansar', 1, 1); // se salta la cuarta clase
    expect(g.moduleState<EstudiosState>('estudios').faltas).toBe(1);
    expect(g.log.some((l) => /faltado a 1 clase/.test(l.text))).toBe(true);
    expect(g.stat(hoy[3])).toBeLessThanOrEqual(antes);
  });

  it('el estrés por faltar es el mismo que cuesta ir: 3 al día repartidos en las clases (0,75 por clase)', () => {
    // Dos partidas idénticas a las 23:30 del lunes, con 3 o 4 clases hechas: al cruzar la medianoche solo cambia la falta.
    const dia = (clases: number[]) => {
      const guardado = nueva().serialize();
      guardado.minute = 23 * 60 + 30;
      guardado.stats['gen.estres'] = 50;
      (guardado.modules.estudios as EstudiosState).asistencia = { day: 0, clases };
      const g = Game.load([personaje, estudios, pausas], guardado);
      g.perform('gen.descansar');
      return g.stat('gen.estres');
    };
    expect(dia([0, 1, 2]) - dia([0, 1, 2, 3])).toBeCloseTo(0.75, 5);
    expect(dia([]) - dia([0, 1, 2, 3])).toBeCloseTo(3, 5);
  });

  it('cuenta las faltas (una por clase) y no hay controles semanales', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 10); // pasa una semana sin ir a clase
    const s = g.moduleState<EstudiosState>('estudios');
    expect(s.faltas).toBe(20);
    expect(s.notas.matematicas.length).toBe(0);
    const svc = g.service<StudiesService>(SERVICES.estudios)!;
    expect(svc.absences()).toBe(20);
    expect(svc.average()).toBeNull();
  });

  it('el nivel con texto sigue la nota esperada: Mal <4, Regular 4–5,9, Bien 6–7,4, Muy bien 7,5–9,2, Excelente 9,3–10', () => {
    expect(nivelDeAsignatura(39.9)).toBe('Mal');
    expect(nivelDeAsignatura(40)).toBe('Regular');
    expect(nivelDeAsignatura(59.9)).toBe('Regular');
    expect(nivelDeAsignatura(60)).toBe('Bien');
    expect(nivelDeAsignatura(74.9)).toBe('Bien');
    expect(nivelDeAsignatura(75)).toBe('Muy bien');
    expect(nivelDeAsignatura(92.9)).toBe('Muy bien');
    expect(nivelDeAsignatura(93)).toBe('Excelente');
  });

  it('la nota del examen crece con la preparación y baja con el estrés', () => {
    expect(notaExamen(80, 20, 50, 0)).toBeGreaterThan(notaExamen(30, 20, 50, 0));
    expect(notaExamen(60, 95, 50, 0)).toBeLessThan(notaExamen(60, 20, 50, 0));
    expect(notaExamen(65, 20, 50, 0)).toBe(6.5); // sin azar, la nota es la preparación / 10
  });

  describe('currículo por etapas (España)', () => {
    const claves = (curso: number, m?: 'ciencias' | 'humanidades') => asignaturasDelCurso(curso, m);

    it('hay diez cursos, de 3.º de primaria a 2.º de bachillerato', () => {
      expect(CURSOS_ESPANA).toHaveLength(10);
      expect(CURSOS_ESPANA[0].nombre).toBe('3.º de primaria');
      expect(CURSOS_ESPANA[9].nombre).toBe('2.º de bachillerato');
    });

    it('las asignaturas cambian con la etapa: unas salen y otras entran', () => {
      expect(claves(0)).toContain('naturales');
      expect(claves(0)).not.toContain('biologia');
      expect(claves(4)).toContain('biologia'); // 1.º de ESO
      expect(claves(4)).not.toContain('naturales');
      expect(claves(4)).toContain('musica');
      expect(claves(6)).not.toContain('musica'); // sale en 3.º de ESO
      expect(claves(5)).toContain('fisica_quimica'); // entra en 2.º de ESO
      expect(claves(8, 'ciencias')).toContain('fisica');
      expect(claves(8, 'humanidades')).toContain('latin');
      expect(claves(8, 'ciencias')).not.toContain('latin');
      expect(claves(9)).toContain('historia_espana');
    });

    it('todas las asignaturas de los cursos existen como habilidad', () => {
      const existentes = new Set(ASIGNATURAS.map((a) => a.key));
      for (let c = 0; c < 10; c++) {
        for (const m of ['ciencias', 'humanidades'] as const) for (const k of claves(c, m)) expect(existentes.has(k)).toBe(true);
      }
    });

    it('todos empiezan entre Mal y Muy bien según sus capacidades: quien tiene mejores bases parte más arriba', () => {
      const xs = Array.from({ length: 150 }, (_, i) => Game.create([personaje, estudios, pausas], { seed: i + 1 }));
      const medias = xs.map((g) => ASIGNATURAS.reduce((a, b) => a + g.stat(`estudios.${b.key}`), 0) / ASIGNATURAS.length);
      for (const g of xs) for (const a of ASIGNATURAS) {
        expect(g.stat(`estudios.${a.key}`)).toBeGreaterThanOrEqual(30);
        expect(g.stat(`estudios.${a.key}`)).toBeLessThanOrEqual(92);
      }
      const media = medias.reduce((a, b) => a + b, 0) / medias.length;
      expect(media).toBeGreaterThan(45);
      expect(media).toBeLessThan(65);
      // Con inteligencia y concentración altas, matemáticas arranca más alta que con ambas bajas.
      const por = (f: (g: Game) => number) => [...xs].sort((a, b) => f(a) - f(b));
      const base = (g: Game) => g.stat('gen.inteligencia') + g.stat('gen.concentracion');
      const ordenados = por(base);
      const bajos = ordenados.slice(0, 30), altos = ordenados.slice(-30);
      const m = (gs: Game[]) => gs.reduce((a, g) => a + g.stat('estudios.matematicas'), 0) / gs.length;
      expect(m(altos)).toBeGreaterThan(m(bajos) + 3);
    });

    it('solo se estudian y puntúan las asignaturas del curso', () => {
      const g = nueva();
      advanceToWeek(g, 'gen.descansar', 1, 1, 17);
      expect(g.preview('estudios.estudiar_naturales')!.available).toBe(true);
      expect(g.preview('estudios.estudiar_biologia')!.available).toBe(false);
      expect(g.preview('estudios.estudiar_biologia')!.reason).toMatch(/No cursas/);
      const svc = g.service<StudiesService>(SERVICES.estudios)!;
      expect(svc.courseName()).toBe('3.º de primaria');
      expect(svc.activeSubjects()).toContain('estudios.naturales');
      expect(svc.activeSubjects()).not.toContain('estudios.biologia');
    });

    it('el horario ocupa los 20 huecos: 4 clases al día, sin repetir asignatura el mismo día, y las horas del currículo se ajustan', () => {
      for (let curso = 0; curso < CURSOS_ESPANA.length; curso++) {
        for (const modalidad of ['ciencias', 'humanidades'] as const) {
          const activas = asignaturasDelCurso(curso, modalidad);
          const horario = horarioDeClases(activas);
          expect(horario).toHaveLength(5);
          for (const dia of horario) {
            expect(dia).toHaveLength(4);
            expect(new Set(dia).size).toBe(4);
          }
          const clases = clasesPorSemana(activas);
          expect(Object.values(clases).reduce((a, b) => a + b, 0)).toBe(20);
          for (const k of activas) {
            expect(clases[k]).toBeGreaterThanOrEqual(1);
            expect(horarioSemanal(activas)[k]).toHaveLength(clases[k]);
          }
        }
      }
      // En ESO sobran horas y se comprimen; en primaria faltan y las asignaturas grandes ganan alguna.
      const eso = asignaturasDelCurso(5);
      expect(eso.reduce((a, k) => a + ASIGNATURAS.find((x) => x.key === k)!.horas, 0)).toBeGreaterThan(20);
      expect(pesoDeClase(eso, 'matematicas')).toBeGreaterThan(1);
      expect(pesoDeClase(asignaturasDelCurso(0), 'lengua')).toBeLessThan(1);
      const g = nueva();
      const svc = g.service<StudiesService>(SERVICES.estudios)!;
      expect(svc.timetable(0)).toHaveLength(4);
    });

    it('ir a clase solo sube las asignaturas que se dan ese día', () => {
      const g = nueva();
      const svc = g.service<StudiesService>(SERVICES.estudios)!;
      const hoy = svc.timetable(0);
      const fuera = claves(0).map((k) => `estudios.${k}`).filter((id) => !hoy.includes(id));
      expect(fuera.length).toBeGreaterThan(0);
      advanceTo(g, 'gen.descansar', 0, 8);
      const antes = Object.fromEntries(claves(0).map((k) => [k, g.stat(`estudios.${k}`)]));
      irAClases(g);
      for (const id of hoy) expect(g.stat(id)).toBeGreaterThan(antes[id.replace('estudios.', '')]);
      for (const id of fuera) expect(g.stat(id)).toBeLessThanOrEqual(antes[id.replace('estudios.', '')]);
    });

    it('sin estudiar, las asignaturas del curso van cayendo despacio (también en vacaciones)', () => {
      const g = nueva();
      const antes = g.stat('estudios.matematicas');
      advanceToWeek(g, 'gen.descansar', 3, 0, 8);
      const tras3 = g.stat('estudios.matematicas');
      expect(tras3).toBeLessThan(antes);
      expect(tras3).toBeGreaterThanOrEqual(antes - 22); // nunca por debajo de lo aprendido de base
    });

    it('un alumno brillante lo es siempre: sin estudiar, el olvido no baja de lo aprendido de base', () => {
      const g = nueva();
      const inicial = g.stat('estudios.matematicas');
      advanceToWeek(g, 'gen.descansar', 12, 0, 8);
      const base = g.moduleState<EstudiosState>('estudios').base!.matematicas;
      expect(base).toBeCloseTo(Math.max(0, inicial - 22), 0);
      expect(g.stat('estudios.matematicas')).toBeGreaterThanOrEqual(base - 1e-6);
    });

    it('la preparación inicial sale de la aptitud: con el tope mental alto se arranca más arriba', () => {
      const xs = Array.from({ length: 200 }, (_, i) => Game.create([personaje, estudios, pausas], { seed: i + 1 }));
      const apt = (g: Game) => (g.hiddenPotential('gen.inteligencia')! + g.hiddenPotential('gen.concentracion')!) / 2;
      const orden = [...xs].sort((a, b) => apt(a) - apt(b));
      const m = (gs: Game[]) => gs.reduce((a, g) => a + g.stat('estudios.matematicas'), 0) / gs.length;
      expect(m(orden.slice(-40))).toBeGreaterThan(m(orden.slice(0, 40)) + 15);
    });

    it('con menos aptitud se olvida más rápido', () => {
      const guardado = nueva().serialize();
      const con = (aptitud: number) => {
        const g = structuredClone(guardado);
        g.stats['estudios.matematicas'] = 95;
        const e = g.modules.estudios as EstudiosState;
        e.base = Object.fromEntries(ASIGNATURAS.map((a) => [a.key, 0]));
        e.base.matematicas = aptitud - 22;
        return Game.load([personaje, estudios, pausas], g);
      };
      const floja = con(30), brillante = con(90);
      advanceToWeek(floja, 'gen.descansar', 1, 0, 8);
      advanceToWeek(brillante, 'gen.descansar', 1, 0, 8);
      expect(95 - floja.stat('estudios.matematicas')).toBeGreaterThan(95 - brillante.stat('estudios.matematicas'));
    });

    it('estudiar una asignatura la sube, y se puede repasar en vacaciones', () => {
      const g = nueva();
      advanceTo(g, 'gen.descansar', 0, 16);
      const antes = g.stat('estudios.matematicas');
      g.perform('estudios.estudiar_matematicas');
      expect(g.stat('estudios.matematicas') - antes).toBeGreaterThan(0.15);
      const navidad = nueva();
      advanceUntil(navidad, 'gen.descansar', (t) => t.period === 'navidad' && t.weekday === 1 && t.hour === 11, 20000);
      expect(navidad.preview('estudios.estudiar_matematicas')!.available).toBe(true);
    });

    /** Partida al lunes de la semana de evaluación de un trimestre (semana 14, 28 o 40 del curso 0). */
    const enExamenes = (semana: number) => {
      const g = nueva();
      const guardado = g.serialize();
      guardado.minute = semana * 7 * 1440 + 7 * 60;
      return Game.load([personaje, estudios, pausas], guardado);
    };

    it('los exámenes se avisan con una semana de antelación, con el día de cada uno', () => {
      const g = enExamenes(12);
      advanceToWeek(g, 'gen.descansar', 13, 0, 9);
      const aviso = g.log.find((l) => /global del trimestre/.test(l.text))!;
      expect(aviso.table!.rows.map((r) => r[1]).sort()).toEqual(claves(0).map((k) => ASIGNATURAS.find((a) => a.key === k)!.name).sort());
      const exs = g.service<StudiesService>(SERVICES.estudios)!.upcomingExams(14);
      expect(exs.map((e) => e.subject).sort()).toEqual(claves(0).map((k) => `estudios.${k}`).sort());
      for (const e of exs) expect(e.inDays).toBeGreaterThanOrEqual(0);
    });

    it('no hay exámenes en otras semanas ni se conocen con más de una semana de antelación', () => {
      const g = nueva();
      expect(g.service<StudiesService>(SERVICES.estudios)!.upcomingExams(7)).toEqual([]);
      advanceToWeek(g, 'gen.descansar', 8, 0, 9);
      expect(g.service<StudiesService>(SERVICES.estudios)!.upcomingExams(7)).toEqual([]);
    });

    it('en la semana de exámenes hay una nota por asignatura; faltar ese día es un 0', () => {
      const g = enExamenes(14);
      for (let d = 0; d < 5; d++) {
        advanceToWeek(g, 'gen.descansar', 14, d, 8);
        if (d !== 3) irAClases(g); // el jueves falta
      }
      advanceToWeek(g, 'gen.descansar', 14, 5, 10);
      const s = g.moduleState<EstudiosState>('estudios');
      expect(s.boletines).toHaveLength(1);
      for (const k of claves(0)) expect(s.notas[k]).toHaveLength(1);
      for (const k of claves(0)) {
        const nota = s.notas[k][0];
        if (diaDeExamen(0, 1, k, 'global', diasDe(k)) === 3) expect(nota).toBe(0);
        else expect(nota).toBeGreaterThan(0);
      }
      expect(s.examenes).toEqual({});
      expect(g.service<StudiesService>(SERVICES.estudios)!.average()).not.toBeNull();
    });

    it('Educación física no se suspende: mínimo 5 presentándose, y el nivel que se ve no baja de Regular', () => {
      const g = enExamenes(14);
      const guardado = g.serialize();
      for (const k of ['educacion_fisica', 'matematicas']) guardado.stats[`estudios.${k}`] = 0;
      for (const id of ['gen.velocidad', 'gen.fuerza', 'gen.resistencia', 'gen.agilidad', 'gen.coordinacion', 'gen.determinacion']) guardado.stats[id] = 0;
      const mal = Game.load([personaje, estudios, pausas], guardado);
      expect(mal.service<StudiesService>(SERVICES.estudios)!.levelText('estudios.educacion_fisica')).toBe('Regular');
      expect(mal.service<StudiesService>(SERVICES.estudios)!.levelText('estudios.matematicas')).toBe('Mal');
      for (let d = 0; d < 5; d++) {
        advanceToWeek(mal, 'gen.descansar', 14, d, 8);
        irAClases(mal);
      }
      advanceToWeek(mal, 'gen.descansar', 14, 5, 10);
      const s = mal.moduleState<EstudiosState>('estudios');
      expect(s.notas.educacion_fisica[0]).toBeGreaterThanOrEqual(3); // 0,6 del global ≥ 5 (parciales sin hacer: 0)
      expect(s.notas.matematicas[0]).toBeLessThan(s.notas.educacion_fisica[0]);
    });

    it('varios exámenes pueden caer el mismo día', () => {
      const dias = claves(0).map((k) => diaDeExamen(0, 1, k, 'global', diasDe(k)));
      expect(new Set(dias).size).toBeLessThan(dias.length);
    });

    it('los parciales caen en las semanas 6 y 11 y también se avisan; el global pesa 60 % y los parciales 40 %', () => {
      const g = enExamenes(4);
      advanceToWeek(g, 'gen.descansar', 5, 0, 9);
      expect(g.log.some((l) => /parcial 1 del trimestre/.test(l.text))).toBe(true);
      const exs = g.service<StudiesService>(SERVICES.estudios)!.upcomingExams(14);
      expect(exs.length).toBe(claves(0).length);
      expect(new Set(exs.map((e) => e.tipo))).toEqual(new Set(['parcial1']));
      expect(notaFinal(10, 10, 0)).toBe(4);
      expect(notaFinal(0, 0, 10)).toBe(6);
      expect(notaFinal(8, 6, 5)).toBe(5.8);
    });

    it('quien llega preparado saca nota alta en parciales y global', () => {
      const g = enExamenes(6);
      const guardado = g.serialize();
      for (const k of claves(0)) guardado.stats[`estudios.${k}`] = 90;
      const listo = Game.load([personaje, estudios, pausas], guardado);
      for (const semana of [6, 11, 14]) {
        for (let d = 0; d < 5; d++) {
          advanceToWeek(listo, 'gen.descansar', semana, d, 8);
          irAClases(listo);
        }
      }
      advanceToWeek(listo, 'gen.descansar', 14, 5, 10);
      expect(listo.moduleState<EstudiosState>('estudios').boletines![0].media).toBeGreaterThan(6);
    });

    /** Partida guardada en el domingo anterior al primer lunes de un curso, con un nivel dado en una asignatura. */
    const alFinalDelCurso = (curso: number, niveles: Record<string, number>) => {
      const g = nueva();
      const guardado = g.serialize();
      for (const [k, v] of Object.entries(niveles)) guardado.stats[`estudios.${k}`] = v;
      (guardado.modules.estudios as EstudiosState).cursoAplicado = curso - 1;
      guardado.minute = (curso * 52 * 7 - 1) * 1440 + 20 * 60;
      return Game.load([personaje, estudios, pausas], guardado);
    };

    it('al pasar a la ESO, biología hereda el nivel de ciencias naturales y se avisa del cambio', () => {
      const g = alFinalDelCurso(4, { naturales: 72, sociales: 66 });
      advanceUntil(g, 'gen.descansar', (t) => t.schoolYear >= 4, 3000);
      expect(g.stat('estudios.biologia')).toBeGreaterThan(65);
      expect(g.stat('estudios.historia')).toBeGreaterThan(60);
      const aviso = g.log.find((l) => /Empiezas 1\.º de ESO/.test(l.text))!;
      expect(aviso.text).toMatch(/Biología y geología/);
      expect(aviso.text).toMatch(/Dejas:.*Ciencias naturales/);
    });

    it('las asignaturas nuevas sin antecesora parten de su nivel inicial', () => {
      const g = alFinalDelCurso(4, { naturales: 85 });
      advanceUntil(g, 'gen.descansar', (t) => t.schoolYear >= 4, 3000);
      // Sin antecesora, parte de su nivel inicial (30–92, según su aptitud), menos el salto de curso.
      expect(g.stat('estudios.tecnologia')).toBeLessThanOrEqual(92);
      expect(g.stat('estudios.tecnologia')).toBeLessThan(g.stat('estudios.biologia') + 100);
    });

    it('en bachillerato se elige la modalidad según las notas', () => {
      const ciencias = alFinalDelCurso(8, { matematicas: 85, biologia: 85, fisica_quimica: 85, lengua: 45, historia: 45, ingles: 45 });
      advanceUntil(ciencias, 'gen.descansar', (t) => t.schoolYear >= 8, 3000);
      expect(ciencias.moduleState<EstudiosState>('estudios').modalidad).toBe('ciencias');
      const letras = alFinalDelCurso(8, { matematicas: 45, biologia: 45, fisica_quimica: 45, lengua: 85, historia: 85, ingles: 85 });
      advanceUntil(letras, 'gen.descansar', (t) => t.schoolYear >= 8, 3000);
      expect(letras.moduleState<EstudiosState>('estudios').modalidad).toBe('humanidades');
      expect(letras.service<StudiesService>(SERVICES.estudios)!.activeSubjects()).toContain('estudios.latin');
      expect(elegirModalidad(() => 50)).toBe('ciencias'); // empate: ciencias
    });

    it('cada curso exige un poco más: al empezarlo las asignaturas pierden preparación', () => {
      const g = alFinalDelCurso(1, { matematicas: 70 });
      const antes = g.stat('estudios.matematicas');
      advanceUntil(g, 'gen.descansar', (t) => t.schoolYear >= 1 && t.weekday === 0 && t.hour === 8, 3000);
      expect(g.stat('estudios.matematicas')).toBeLessThan(antes);
    });
  });

  describe('dificultad de las asignaturas', () => {
    it('los apoyos de cada asignatura suman 1', () => {
      for (const a of ASIGNATURAS) {
        expect(a.apoyos.reduce((x, y) => x + y.weight, 0)).toBeCloseTo(1, 6);
      }
    });

    it('las asignaturas no tienen tope genético: la dificultad la ponen las capacidades', () => {
      const g = nueva();
      for (const a of ASIGNATURAS) expect(g.hiddenPotential(`estudios.${a.key}`)).toBeUndefined();
    });
  });
});
