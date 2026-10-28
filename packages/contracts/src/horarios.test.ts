import { describe, expect, it } from 'vitest';
import { construirAgenda, ubicacionEn, type DatosDeAgenda, type TipoAsignado } from './agendas';
import { CIUDAD_INICIAL, abiertoEn } from './lugares';
import { timeView } from './time';

const lugar = (id: string) => CIUDAD_INICIAL.lugares.find((l) => l.id === id)!;
const en = (dia: number, hora: number, min = 0) => timeView(dia * 1440 + hora * 60 + min);

describe('horarios de los lugares', () => {
  it('el colegio abre los días de clase de 7:00 a 19:00 y los lunes y miércoles por la tarde por el club', () => {
    const colegio = lugar('colegio');
    expect(abiertoEn(colegio, en(0, 6, 59))).toBe(false);
    expect(abiertoEn(colegio, en(0, 7))).toBe(true);
    expect(abiertoEn(colegio, en(0, 18, 59))).toBe(true);
    expect(abiertoEn(colegio, en(0, 19))).toBe(false);
    expect(abiertoEn(colegio, en(5, 10))).toBe(false); // sábado
    expect(abiertoEn(colegio, en(6, 16))).toBe(false); // domingo
  });

  it('el supermercado abre de lunes a sábado de 9 a 21 y el domingo de 10 a 15', () => {
    const s = lugar('supermercado');
    expect(abiertoEn(s, en(1, 8, 59))).toBe(false);
    expect(abiertoEn(s, en(1, 9))).toBe(true);
    expect(abiertoEn(s, en(5, 20, 59))).toBe(true);
    expect(abiertoEn(s, en(5, 21))).toBe(false);
    expect(abiertoEn(s, en(6, 9, 59))).toBe(false);
    expect(abiertoEn(s, en(6, 10))).toBe(true);
    expect(abiertoEn(s, en(6, 15))).toBe(false);
  });

  it('el restaurante abre de 13 a 16 y de 20 a 23 todos los días', () => {
    const r = lugar('restaurante');
    for (const dia of [0, 5, 6]) {
      expect(abiertoEn(r, en(dia, 12, 59))).toBe(false);
      expect(abiertoEn(r, en(dia, 13))).toBe(true);
      expect(abiertoEn(r, en(dia, 16))).toBe(false);
      expect(abiertoEn(r, en(dia, 20))).toBe(true);
      expect(abiertoEn(r, en(dia, 23))).toBe(false);
    }
  });
});

describe('las agendas respetan los horarios', () => {
  const CLUBES: Record<string, { weekdays: number[]; desde: number; hasta: number; sede: string }> = {
    colegio: { weekdays: [0, 2], desde: 15, hasta: 17, sede: 'pista_colegio' },
    ciudad: { weekdays: [1, 3], desde: 18, hasta: 20, sede: 'estadio' },
  };
  const datos: DatosDeAgenda = { sesionDeClub: (c) => CLUBES[c] };
  const tipos: TipoAsignado[][] = [
    [{ tipo: 'alumno' }],
    [{ tipo: 'alumno', tuClase: true }],
    [{ tipo: 'profesor' }],
    [{ tipo: 'entrenador', club: 'colegio' }],
    [{ tipo: 'entrenador', club: 'ciudad' }],
    [{ tipo: 'club', club: 'colegio' }],
    [{ tipo: 'rival', club: 'colegio' }],
    [{ tipo: 'rival', club: 'ciudad' }],
    [{ tipo: 'amigo' }],
    [{ tipo: 'hermano', escolar: true, deporte: true }],
    [{ tipo: 'progenitor' }],
    [{ tipo: 'vecino' }],
    [{ tipo: 'bibliotecario', turno: 'manana' }],
    [{ tipo: 'bibliotecario', turno: 'tarde' }],
  ];

  it('nadie está en un sitio (ni en una zona de un sitio) mientras está cerrado', () => {
    const fallos = new Set<string>();
    for (const t of tipos) {
      const agenda = construirAgenda(t, datos);
      // Un curso entero (días de clase, fines de semana y vacaciones), cada media hora y con 24 personas distintas: cada una tiene su destino del día.
      for (let dia = 0; dia < 7 * 52; dia++) {
        for (let m = 0; m < 1440; m += 30) {
          const instante = en(dia, 0, m);
          for (let p = 0; p < 24; p++) {
            const u = ubicacionEn(agenda, instante, `persona_${p}`);
            for (const sitio of [u.sitio, u.atendiendo?.sitio]) {
              if (!sitio) continue;
              const l = lugar(sitio);
              const padre = l.dentroDe ? lugar(l.dentroDe) : undefined;
              if (!abiertoEn(l, instante) || (padre && !abiertoEn(padre, instante))) fallos.add(`${t[0].tipo}/${t[0].club ?? t[0].turno ?? ''} en ${sitio}, ${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'][instante.weekday]} ${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);
            }
          }
        }
      }
    }
    expect([...fallos]).toEqual([]);
  });
});
