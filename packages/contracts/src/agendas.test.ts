import { describe, expect, it } from 'vitest';
import { NIVEL_AGENDA, azarDe, construirAgenda, ubicacionEn, type DatosDeAgenda, type TipoAsignado } from './agendas';
import { timeView } from './time';

const CLUBES: Record<string, { weekdays: number[]; desde: number; hasta: number; sede: string }> = {
  colegio: { weekdays: [0, 2], desde: 15, hasta: 17, sede: 'colegio' },
  ciudad: { weekdays: [1, 3], desde: 18, hasta: 20, sede: 'estadio' },
};
const datos: DatosDeAgenda = { sesionDeClub: (c) => CLUBES[c] };

/** Minuto absoluto: día 0 es lunes de la segunda semana de septiembre (lectivo). */
const en = (dia: number, hora: number, min = 0) => timeView(dia * 1440 + hora * 60 + min);
const donde = (tipos: TipoAsignado[], dia: number, hora: number, min = 0) => ubicacionEn(construirAgenda(tipos, datos), en(dia, hora, min), 'x').sitio;

describe('agendas de las personas', () => {
  it('sin ningún tipo, una persona está fuera del mapa a todas horas', () => {
    for (const h of [0, 8, 12, 17, 23]) expect(donde([], 0, h)).toBeNull();
  });

  it('un alumno está en el colegio de 7:50 a 14:00 entre semana y no los fines de semana', () => {
    const alumno: TipoAsignado[] = [{ tipo: 'alumno' }];
    expect(donde(alumno, 0, 7, 40)).toBeNull();
    expect(donde(alumno, 0, 7, 50)).toBe('colegio');
    expect(donde(alumno, 0, 11)).toBe('colegio'); // el recreo también es en el colegio
    expect(donde(alumno, 0, 13, 59)).toBe('colegio');
    expect(donde(alumno, 0, 22)).toBeNull();
    for (const h of [8, 10, 12]) expect(donde(alumno, 5, h)).not.toBe('colegio'); // sábado
  });

  it('un alumno reparte su tiempo libre por el barrio según los pesos, sin salirse de los destinos posibles', () => {
    const posibles = new Set([null, 'parque', 'supermercado', 'gimnasio']);
    const vistos = new Set<string | null>();
    for (let i = 0; i < 400; i++) {
      const s = ubicacionEn(construirAgenda([{ tipo: 'alumno' }], datos), en(7 * Math.floor(i / 20) + (i % 5), 16), `p${i}`).sitio;
      expect(posibles.has(s)).toBe(true);
      vistos.add(s);
    }
    expect(vistos.size).toBe(4);
  });

  it('el profesor está en el colegio de 7:30 a 17:00 los días de clase', () => {
    expect(donde([{ tipo: 'profesor' }], 1, 16)).toBe('colegio');
    expect(donde([{ tipo: 'profesor' }], 1, 17)).toBeNull();
    expect(donde([{ tipo: 'profesor' }], 5, 10)).toBeNull();
  });

  it('el tipo dominante manda: un alumno que entra en un club de fuera va allí en la tarde de entrenamiento', () => {
    const base: TipoAsignado[] = [{ tipo: 'alumno' }];
    const conClub: TipoAsignado[] = [{ tipo: 'alumno' }, { tipo: 'club', club: 'ciudad' }];
    // Martes (día 1) de 18 a 20: en el estadio con el club; sin él, en su tarde libre.
    expect(donde(conClub, 1, 19)).toBe('estadio');
    expect(['estadio']).not.toContain(donde(base, 1, 19));
    // Fuera de la sesión sigue yendo a clase.
    expect(donde(conClub, 1, 10)).toBe('colegio');
    // El miércoles no hay sesión del club de ciudad.
    expect(donde(conClub, 2, 19)).not.toBe('estadio');
  });

  it('el club del colegio entrena en el colegio y su entrenador está con él; las carreras son los sábados en el estadio', () => {
    const entrenador: TipoAsignado[] = [{ tipo: 'entrenador', club: 'colegio' }];
    expect(donde(entrenador, 0, 16)).toBe('colegio');
    expect(donde(entrenador, 1, 16)).toBeNull();
    expect(donde(entrenador, 5, 10)).toBe('estadio');
    // Los rivales van solo a una parte de las carreras y de las sesiones.
    const aqui = (dia: number, hora: number) => Array.from({ length: 500 }, (_, i) => ubicacionEn(construirAgenda([{ tipo: 'rival', club: 'ciudad' }], datos), en(dia, hora), `r${i}`).sitio).filter((s) => s === 'estadio').length / 500;
    expect(aqui(5, 12)).toBeGreaterThan(0.3);
    expect(aqui(5, 12)).toBeLessThan(0.5);
    expect(aqui(3, 19)).toBeGreaterThan(0.78);
    expect(aqui(3, 19)).toBeLessThan(0.92);
    expect(aqui(2, 19)).toBe(0);
  });

  it('un acontecimiento con nivel mayor sustituye a todo mientras dura y luego se deja de aplicar', () => {
    const evento: TipoAsignado = { tipo: 'club', club: 'colegio', nivel: NIVEL_AGENDA.evento, hasta: 3 };
    // Lunes (día 0) 16:00: el club del colegio manda sobre la clase de tarde; pasado el día 3 ya no cuenta.
    expect(ubicacionEn(construirAgenda([{ tipo: 'alumno' }, evento], datos, 0), en(0, 16), 'x').nivel).toBe(NIVEL_AGENDA.evento);
    expect(ubicacionEn(construirAgenda([{ tipo: 'alumno' }, evento], datos, 7), en(7, 16), 'x').nivel).toBe(NIVEL_AGENDA.rol);
  });

  it('el azar es estable: la misma persona el mismo día va siempre al mismo sitio dentro de su tramo', () => {
    const agenda = construirAgenda([{ tipo: 'alumno' }], datos);
    for (let i = 0; i < 20; i++) {
      const a = ubicacionEn(agenda, en(2, 15, 5), `n${i}`).sitio;
      for (const m of [20, 40, 120, 230]) expect(ubicacionEn(agenda, en(2, 15, m), `n${i}`).sitio).toBe(a);
    }
    expect(azarDe('a', 1)).toBe(azarDe('a', 1));
    expect(azarDe('a', 1)).not.toBe(azarDe('a', 2));
  });

  it('todos los tramos empiezan y acaban en minutos múltiplos de 10 (la presencia se calcula por tramos de diez minutos)', () => {
    const tipos: TipoAsignado[] = [
      { tipo: 'alumno' }, { tipo: 'profesor' }, { tipo: 'entrenador', club: 'colegio' }, { tipo: 'club', club: 'ciudad' },
      { tipo: 'rival', club: 'ciudad' }, { tipo: 'amigo' }, { tipo: 'vecino' },
    ];
    for (const tr of construirAgenda(tipos, datos)) {
      expect(tr.desde % 10, `${tr.tipo} desde ${tr.desde}`).toBe(0);
      expect(tr.hasta % 10, `${tr.tipo} hasta ${tr.hasta}`).toBe(0);
    }
  });
});
