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

  it('un alumno llega al colegio a las 7:30, en clase está ocupado (fuera) y en el recreo vuelve a estar; no los fines de semana', () => {
    const alumno: TipoAsignado[] = [{ tipo: 'alumno' }];
    expect(donde(alumno, 0, 7, 20)).toBeNull();
    expect(donde(alumno, 0, 7, 30)).toBe('colegio'); // llegando, media hora antes de la primera clase
    expect(donde(alumno, 0, 7, 49)).toBe('colegio'); // la entrada se vacía a las 7:50: se van a sus aulas
    expect(donde(alumno, 0, 7, 50)).toBeNull();
    expect(donde(alumno, 0, 8)).toBeNull(); // en clase
    expect(donde(alumno, 0, 10, 39)).toBeNull();
    expect(donde(alumno, 0, 10, 40)).toBe('patio'); // el recreo es de 10:40 a 11:20, en el patio
    expect(donde(alumno, 0, 11, 9)).toBe('patio');
    expect(donde(alumno, 0, 11, 10)).toBeNull(); // a las 11:10 vuelven a sus aulas
    expect(donde(alumno, 0, 11, 20)).toBeNull(); // otra vez en clase
    expect(donde(alumno, 0, 13, 59)).toBeNull();
    expect(donde(alumno, 0, 22)).toBeNull();
    for (const h of [8, 10, 12]) expect(donde(alumno, 5, h)).not.toBe('colegio'); // sábado
    // Sigue en su agenda (el tramo es de colegio) pero cuenta como ocupado.
    expect(ubicacionEn(construirAgenda(alumno, datos), en(0, 9), 'x').ocupado).toBe(true);
  });

  it('los de tu clase esperan en el aula desde las 7:50 y están libres antes de empezar y entre clase y clase', () => {
    const compa: TipoAsignado[] = [{ tipo: 'alumno', tuClase: true }];
    const ubicacion = (hora: number, min = 0) => ubicacionEn(construirAgenda(compa, datos), en(0, hora, min), 'x');
    expect(ubicacion(7, 40).sitio).toBe('colegio'); // antes de las 7:50, fuera de las aulas
    expect(ubicacion(7, 50)).toMatchObject({ sitio: 'aula' }); // se abre el aula: ya están dentro
    expect(ubicacion(7, 50).ocupado).toBeFalsy();
    expect(ubicacion(7, 59).ocupado).toBeFalsy();
    expect(ubicacion(8).ocupado).toBe(true); // en clase
    expect(ubicacion(9, 15)).toMatchObject({ sitio: 'aula' }); // los 5 minutos de entre clase y clase
    expect(ubicacion(9, 15).ocupado).toBeFalsy();
    expect(ubicacion(9, 20).ocupado).toBe(true);
    expect(ubicacion(10, 40).sitio).toBe('patio'); // el recreo, en el patio
    expect(ubicacion(11, 10).sitio).toBe('aula'); // 10 minutos antes de la tercera clase
    expect(ubicacion(12, 35).sitio).toBe('aula');
    expect(ubicacion(14).sitio).toBeNull();
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

  it('el profesor llega a las 7:30, da clase (ocupado) hasta las 14:00 salvo el recreo, y atiende tutorías hasta las 17:00; fuera de clase está en la sala de profesores o, un par, en el patio', () => {
    const profesor = (dia: number, hora: number, min = 0) => donde([{ tipo: 'profesor' }], dia, hora, min);
    const enElColegio = (s: string | null) => ['sala_profesores', 'colegio', 'patio'].includes(s as string);
    expect(enElColegio(profesor(1, 7, 40))).toBe(true);
    expect(profesor(1, 9)).toBeNull();
    expect(enElColegio(profesor(1, 11))).toBe(true);
    expect(enElColegio(profesor(1, 16))).toBe(true);
    expect(profesor(1, 17)).toBeNull();
    expect(profesor(5, 10)).toBeNull();
    // Del profesorado, casi todos en la sala: un 15 % sale al patio en el recreo (y a la entrada fuera de él).
    expect(Array.from({ length: 400 }, (_, i) => ubicacionEn(construirAgenda([{ tipo: 'profesor' }], datos), en(1, 10, 50), `p${i}`).sitio).filter((s) => s === 'patio').length).toBeGreaterThan(30);
    const salas = Array.from({ length: 400 }, (_, i) => ubicacionEn(construirAgenda([{ tipo: 'profesor' }], datos), en(1, 11), `p${i}`).sitio).filter((s) => s === 'sala_profesores').length / 400;
    expect(salas).toBeGreaterThan(0.78);
    expect(salas).toBeLessThan(0.92);
  });

  it('el tipo dominante manda: un alumno que entra en un club de fuera va allí en la tarde de entrenamiento', () => {
    const base: TipoAsignado[] = [{ tipo: 'alumno' }];
    const conClub: TipoAsignado[] = [{ tipo: 'alumno' }, { tipo: 'club', club: 'ciudad' }];
    // Martes (día 1), 17:50 (llegando a la sesión de 18 a 20): en el estadio con el club; sin él, en su tarde libre. Durante la sesión está ocupado.
    expect(donde(conClub, 1, 17, 50)).toBe('estadio');
    expect(['estadio']).not.toContain(donde(base, 1, 17, 50));
    expect(donde(conClub, 1, 19)).toBeNull();
    expect(donde(conClub, 1, 20, 10)).toBe('estadio'); // se queda un rato al acabar
    // Fuera de la sesión sigue yendo a clase.
    expect(donde(conClub, 1, 11)).toBe('patio'); // en el recreo
    // El miércoles no hay sesión del club de ciudad.
    expect(donde(conClub, 2, 17, 50)).not.toBe('estadio');
  });

  it('el club del colegio entrena en el colegio y su entrenador está con él; las carreras son los sábados en el estadio', () => {
    const entrenador: TipoAsignado[] = [{ tipo: 'entrenador', club: 'colegio' }];
    expect(donde(entrenador, 0, 14, 50)).toBe('colegio'); // llegando a la sesión de 15 a 17
    expect(donde(entrenador, 0, 16)).toBeNull(); // dirigiendo la sesión: ocupado
    expect(donde(entrenador, 0, 17, 10)).toBe('colegio'); // al acabar se le puede hablar un rato
    expect(donde(entrenador, 1, 16)).toBeNull();
    expect(donde(entrenador, 5, 8, 50)).toBe('estadio');
    expect(donde(entrenador, 5, 10)).toBeNull(); // en la carrera
    // Los rivales van solo a una parte de las carreras y de las sesiones (se cuentan al llegar: después están ocupados).
    const aqui = (dia: number, hora: number, min = 0) => Array.from({ length: 500 }, (_, i) => ubicacionEn(construirAgenda([{ tipo: 'rival', club: 'ciudad' }], datos), en(dia, hora, min), `r${i}`).sitio).filter((s) => s === 'estadio').length / 500;
    expect(aqui(5, 8, 50)).toBeGreaterThan(0.3);
    expect(aqui(5, 8, 50)).toBeLessThan(0.5);
    expect(aqui(3, 17, 50)).toBeGreaterThan(0.78);
    expect(aqui(3, 17, 50)).toBeLessThan(0.92);
    expect(aqui(2, 17, 50)).toBe(0);
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
});
