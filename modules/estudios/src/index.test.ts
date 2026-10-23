import { describe, expect, it } from 'vitest';
import { SERVICES, type StudiesService } from '@ds/contracts';
import { Game, advanceTo, advanceToWeek, advanceUntil } from '@ds/core';
import { personaje } from '@ds/mod-personaje';
import { estudios, notaControl, type EstudiosState } from './index';
import { ASIGNATURAS, CURSOS_ESPANA, asignaturasDelCurso, elegirModalidad } from './curriculo';

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

  it('cuenta faltas y pone notas los viernes', () => {
    const g = nueva();
    advanceTo(g, 'gen.descansar', 5, 10); // pasa una semana sin ir a clase
    const s = g.moduleState<EstudiosState>('estudios');
    expect(s.faltas).toBe(5);
    expect(s.notas.matematicas.length).toBe(1);
    const svc = g.service<StudiesService>(SERVICES.estudios)!;
    expect(svc.absences()).toBe(5);
    expect(svc.average()).not.toBeNull();
  });

  it('la nota crece con el nivel y baja con el estrés', () => {
    expect(notaControl(80, 20, 0)).toBeGreaterThan(notaControl(30, 20, 0));
    expect(notaControl(60, 95, 0)).toBeLessThan(notaControl(60, 20, 0));
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

    it('todos empiezan con una nota de 5 aproximadamente, sin importar la asignatura', () => {
      const g = nueva();
      for (const a of ASIGNATURAS) {
        const nota = notaControl(g.stat(`estudios.${a.key}`), 20, 0);
        expect(nota).toBeGreaterThan(4.6);
        expect(nota).toBeLessThan(5.6);
      }
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

    it('los controles del viernes tienen una nota por cada asignatura del curso', () => {
      const g = nueva();
      advanceToWeek(g, 'gen.descansar', 0, 5, 10);
      const control = g.log.find((l) => /Controles del viernes/.test(l.text))!;
      expect(control.table!.rows.map((r) => r[0]).sort()).toEqual(
        claves(0).map((k) => ASIGNATURAS.find((a) => a.key === k)!.name).sort(),
      );
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

    it('las asignaturas nuevas sin antecesora parten de un 5', () => {
      const g = alFinalDelCurso(4, { naturales: 85 });
      advanceUntil(g, 'gen.descansar', (t) => t.schoolYear >= 4, 3000);
      expect(notaControl(g.stat('estudios.tecnologia'), 20, 0, 4)).toBeLessThan(5.5);
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

    it('cada curso exige un poco más: con el mismo nivel la nota baja', () => {
      expect(notaControl(60, 20, 0, 8)).toBeLessThan(notaControl(60, 20, 0, 0));
    });
  });

  describe('tope de las asignaturas', () => {
    it('los apoyos de cada asignatura suman 1', () => {
      for (const a of ASIGNATURAS) {
        expect(a.apoyos.reduce((x, y) => x + y.weight, 0)).toBeCloseTo(1, 6);
      }
    });

    it('el tope no se hereda de los padres: sale de las genéricas que apoyan la asignatura (±10 %)', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const g = Game.create([personaje, estudios], { seed });
        for (const a of ASIGNATURAS) {
          const base = a.apoyos.reduce((x, y) => x + y.weight * g.hiddenPotential(y.stat)!, 0);
          const tope = g.hiddenPotential(`estudios.${a.key}`)!;
          expect(tope).toBeGreaterThanOrEqual(Math.max(10, base * 0.9) - 1e-9);
          expect(tope).toBeLessThanOrEqual(Math.min(95, base * 1.1) + 1e-9);
        }
      }
    });

    it('quien tiene tope alto en inteligencia y concentración lo tiene en matemáticas; el de educación física sigue a lo físico', () => {
      const xs = Array.from({ length: 200 }, (_, i) => Game.create([personaje, estudios], { seed: i + 1 }));
      const corr = (f: (g: Game) => number, h: (g: Game) => number) => {
        const a = xs.map(f), b = xs.map(h);
        const ma = a.reduce((x, y) => x + y, 0) / a.length, mb = b.reduce((x, y) => x + y, 0) / b.length;
        let c = 0, sa = 0, sb = 0;
        for (let i = 0; i < a.length; i++) { c += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; }
        return c / Math.sqrt(sa * sb);
      };
      expect(corr((g) => g.hiddenPotential('estudios.matematicas')!, (g) => g.hiddenPotential('gen.inteligencia')!)).toBeGreaterThan(0.5);
      expect(corr((g) => g.hiddenPotential('estudios.educacion_fisica')!, (g) => g.hiddenPotential('gen.coordinacion')!)).toBeGreaterThan(0.35);
    });
  });
});
