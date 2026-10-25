import { describe, expect, it } from 'vitest';
import { SERVICES, type StudiesService } from '@ds/contracts';
import { Game, advanceTo, advanceToWeek, advanceUntil } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { estudios, nivelDeAsignatura, notaExamen, notaFinal, type EstudiosState } from './index';
import { ASIGNATURAS, CURSOS_ESPANA, asignaturasDelCurso, diaDeExamen, elegirModalidad, horarioSemanal } from './curriculo';

const nueva = () => Game.create([personaje, estudios], { seed: 3 });

describe('módulo estudios', () => {
  it('funciona solo con el módulo base', () => {
    const g = nueva();
    expect(g.stat('estudios.matematicas')).toBeGreaterThan(0);
  });

  it('la clase solo está disponible entre semana a primera hora', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 0, 8);
    expect(g.preview('estudios.clase')!.available).toBe(true);
    g.perform('estudios.clase');
    expect(g.time.hour).toBe(14);
    expect(g.preview('estudios.clase')!.available).toBe(false);
    advanceTo(g, 'gen.descansar', 5, 8);
    expect(g.preview('estudios.clase')!.reason).toMatch(/no hay clase/);
  });

  it('cuenta las faltas y no hay controles semanales', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 10); // pasa una semana sin ir a clase
    const s = g.moduleState<EstudiosState>('estudios');
    expect(s.faltas).toBe(5);
    expect(s.notas.matematicas.length).toBe(0);
    const svc = g.service<StudiesService>(SERVICES.estudios)!;
    expect(svc.absences()).toBe(5);
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
      const xs = Array.from({ length: 150 }, (_, i) => Game.create([personaje, estudios], { seed: i + 1 }));
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

    it('no todas las asignaturas se dan todos los días y el horario cubre las horas semanales', () => {
      const activas = claves(4);
      const h = horarioSemanal(activas);
      for (const k of activas) {
        expect(h[k]).toHaveLength(ASIGNATURAS.find((a) => a.key === k)!.horas);
        expect(new Set(h[k]).size).toBe(h[k].length);
      }
      for (let d = 0; d < 5; d++) {
        const hoy = activas.filter((k) => h[k].includes(d));
        expect(hoy.length).toBeGreaterThan(2);
        expect(hoy.length).toBeLessThan(activas.length);
      }
      const g = nueva();
      const svc = g.service<StudiesService>(SERVICES.estudios)!;
      expect(svc.timetable(0).length).toBeLessThan(claves(0).length);
    });

    it('ir a clase solo sube las asignaturas que se dan ese día', () => {
      const g = nueva();
      const svc = g.service<StudiesService>(SERVICES.estudios)!;
      const hoy = svc.timetable(0);
      const fuera = claves(0).map((k) => `estudios.${k}`).filter((id) => !hoy.includes(id));
      expect(fuera.length).toBeGreaterThan(0);
      advanceTo(g, 'gen.descansar', 0, 8);
      const antes = Object.fromEntries(claves(0).map((k) => [k, g.stat(`estudios.${k}`)]));
      g.perform('estudios.clase');
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
      const xs = Array.from({ length: 200 }, (_, i) => Game.create([personaje, estudios], { seed: i + 1 }));
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
        return Game.load([personaje, estudios], g);
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
      return Game.load([personaje, estudios], guardado);
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
        if (d !== 3) g.perform('estudios.clase'); // el jueves falta
      }
      advanceToWeek(g, 'gen.descansar', 14, 5, 10);
      const s = g.moduleState<EstudiosState>('estudios');
      expect(s.boletines).toHaveLength(1);
      for (const k of claves(0)) expect(s.notas[k]).toHaveLength(1);
      for (const k of claves(0)) {
        const nota = s.notas[k][0];
        if (diaDeExamen(0, 1, k) === 3) expect(nota).toBe(0);
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
      const mal = Game.load([personaje, estudios], guardado);
      expect(mal.service<StudiesService>(SERVICES.estudios)!.levelText('estudios.educacion_fisica')).toBe('Regular');
      expect(mal.service<StudiesService>(SERVICES.estudios)!.levelText('estudios.matematicas')).toBe('Mal');
      for (let d = 0; d < 5; d++) {
        advanceToWeek(mal, 'gen.descansar', 14, d, 8);
        mal.perform('estudios.clase');
      }
      advanceToWeek(mal, 'gen.descansar', 14, 5, 10);
      const s = mal.moduleState<EstudiosState>('estudios');
      expect(s.notas.educacion_fisica[0]).toBeGreaterThanOrEqual(3); // 0,6 del global ≥ 5 (parciales sin hacer: 0)
      expect(s.notas.matematicas[0]).toBeLessThan(s.notas.educacion_fisica[0]);
    });

    it('varios exámenes pueden caer el mismo día', () => {
      const dias = claves(0).map((k) => diaDeExamen(0, 1, k));
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
      const listo = Game.load([personaje, estudios], guardado);
      for (const semana of [6, 11, 14]) {
        for (let d = 0; d < 5; d++) {
          advanceToWeek(listo, 'gen.descansar', semana, d, 8);
          listo.perform('estudios.clase');
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
      return Game.load([personaje, estudios], guardado);
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
