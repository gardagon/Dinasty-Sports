import { describe, expect, it } from 'vitest';
import { NIVEL_AGENDA, azarDe, construirAgenda, ubicacionEn, type DatosDeAgenda, type TipoAsignado } from './agendas';
import { timeView } from './time';

const CLUBES: Record<string, { weekdays: number[]; desde: number; hasta: number; sede: string }> = {
  colegio: { weekdays: [0, 2], desde: 15, hasta: 17, sede: 'colegio' },
  ciudad: { weekdays: [1, 3], desde: 18, hasta: 20, sede: 'estadio' },
};
const datos: DatosDeAgenda = { sesionDeClub: (c) => CLUBES[c], jornada: () => ({ dias: [5], desde: 9, hasta: 13, lugar: 'estadio', texto: 'Carreras: los sábados.' }) };

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
    const posibles = new Set([null, 'parque', 'supermercado', 'gimnasio', 'biblioteca']);
    const vistos = new Set<string | null>();
    for (let i = 0; i < 400; i++) {
      const s = ubicacionEn(construirAgenda([{ tipo: 'alumno' }], datos), en(7 * Math.floor(i / 20) + (i % 5), 16), `p${i}`).sitio;
      expect(posibles.has(s)).toBe(true);
      vistos.add(s);
    }
    expect(vistos.size).toBe(5);
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

  it('los padres están en casa hasta medianoche (también los días de clase y los de fiesta)', () => {
    const padre: TipoAsignado[] = [{ tipo: 'progenitor' }];
    expect(donde(padre, 0, 22, 59)).toBe('casa');
    expect(donde(padre, 0, 23, 30)).toBe('casa'); // lunes, día de clase
    expect(donde(padre, 0, 23, 59)).toBe('casa');
    expect(donde(padre, 5, 23, 30)).toBe('casa'); // sábado
    // Y están a la vista: no están ocupados.
    expect(ubicacionEn(construirAgenda(padre, datos), en(0, 23, 30), 'x').ocupado).toBeFalsy();
  });

  it('un hermano menor de 8 años duerme de 23:00 a 7:00: está en casa, pero no se puede hablar con él; uno mayor sigue disponible', () => {
    const pequeno: TipoAsignado[] = [{ tipo: 'hermano', escolar: true, duerme: true }];
    const mayor: TipoAsignado[] = [{ tipo: 'hermano', escolar: true }];
    const u = (tipos: TipoAsignado[], hora: number, min = 0) => ubicacionEn(construirAgenda(tipos, datos), en(5, hora, min), 'x');
    expect(u(pequeno, 22, 59)).toMatchObject({ sitio: 'casa' });
    expect(u(pequeno, 22, 59).ocupado).toBeFalsy();
    expect(u(pequeno, 23)).toMatchObject({ ocupado: true, atendiendo: { sitio: 'casa', motivo: 'durmiendo' } });
    expect(u(pequeno, 3)).toMatchObject({ ocupado: true, atendiendo: { sitio: 'casa', motivo: 'durmiendo' } });
    expect(u(pequeno, 7).ocupado).toBeFalsy();
    expect(u(mayor, 23, 30)).toMatchObject({ sitio: 'casa' });
    expect(u(mayor, 23, 30).ocupado).toBeFalsy();
  });

  it('en el aula, durante la clase, tus compañeros siguen ahí pero ocupados («atendiendo en clase»); los de otras clases siguen fuera del mapa', () => {
    const compa: TipoAsignado[] = [{ tipo: 'alumno', tuClase: true }];
    const otro: TipoAsignado[] = [{ tipo: 'alumno' }];
    const u = (tipos: TipoAsignado[], hora: number, min = 0) => ubicacionEn(construirAgenda(tipos, datos), en(0, hora, min), 'x');
    expect(u(compa, 8)).toMatchObject({ sitio: null, ocupado: true, atendiendo: { sitio: 'aula', motivo: 'atendiendo en clase' } });
    expect(u(compa, 12, 40)).toMatchObject({ ocupado: true, atendiendo: { sitio: 'aula', motivo: 'atendiendo en clase' } });
    expect(u(compa, 9, 15)).toMatchObject({ sitio: 'aula' }); // los 5 minutos entre clases se puede hablar
    expect(u(compa, 9, 15).atendiendo).toBeUndefined();
    expect(u(otro, 8)).toMatchObject({ sitio: null, ocupado: true });
    expect(u(otro, 8).atendiendo).toBeUndefined();
  });

  describe('niños de otros colegios (17/11)', () => {
    const nino: TipoAsignado[] = [{ tipo: 'vecino', escolar: true }];
    const adulto: TipoAsignado[] = [{ tipo: 'vecino' }];
    const u = (tipos: TipoAsignado[], dia: number, hora: number, min = 0, quien = 'x') => ubicacionEn(construirAgenda(tipos, datos), en(dia, hora, min), quien);

    it('un día lectivo, de 7:30 a 14:30 están en su colegio (fuera del mapa): nunca en el parque a las 11:00', () => {
      for (let i = 0; i < 300; i++) {
        for (const [hora, min] of [[9, 0], [10, 0], [11, 0], [12, 30], [13, 59], [14, 29]] as const) expect(u(nino, 0, hora, min, `n${i}`).sitio, `n${i} a las ${hora}:${min}`).toBeNull();
      }
      // El mismo niño sin horario escolar (la agenda de siempre de un vecino) sí aparece por el barrio a esas horas.
      expect(Array.from({ length: 300 }, (_, i) => u(adulto, 0, 11, 0, `n${i}`).sitio).filter((x) => x !== null).length).toBeGreaterThan(50);
    });

    it('sin colegio (sábado) y por la tarde sigue la vida de un vecino', () => {
      expect(Array.from({ length: 300 }, (_, i) => u(nino, 5, 11, 0, `n${i}`).sitio).filter((x) => x === 'parque').length).toBeGreaterThan(50);
      expect(Array.from({ length: 300 }, (_, i) => u(nino, 0, 17, 0, `n${i}`).sitio).filter((x) => x === 'parque').length).toBeGreaterThan(50);
    });
  });

  describe('quien tiene una actividad poco después de las clases no se va a casa (17/11)', () => {
    // Un compañero del equipo del colegio (sesión de 15:00 a 17:00 los lunes y miércoles, en el colegio).
    const jugador: TipoAsignado[] = [{ tipo: 'alumno' }, { tipo: 'club', club: 'colegio' }];
    const alumno: TipoAsignado[] = [{ tipo: 'alumno' }];
    const u = (tipos: TipoAsignado[], dia: number, hora: number, min = 0, quien = 'x') => ubicacionEn(construirAgenda(tipos, datos), en(dia, hora, min), quien);

    it('sigue en el colegio entre las 14:00 y las 14:50 y 10 minutos antes de empezar está en su sitio', () => {
      for (let i = 0; i < 100; i++) {
        for (const [hora, min] of [[14, 0], [14, 20], [14, 31], [14, 49]] as const) expect(['colegio', 'patio'], `j${i} ${hora}:${min}`).toContain(u(jugador, 0, hora, min, `j${i}`).sitio);
        expect(u(jugador, 0, 14, 50, `j${i}`).sitio).toBe('colegio'); // la sede del club
        expect(u(jugador, 0, 14, 50, `j${i}`).tipo).toBe('club');
      }
      // El mismo alumno sin esa actividad se va como los demás: a las 14:31 ya no queda nadie.
      for (let i = 0; i < 100; i++) expect(u(alumno, 0, 14, 31, `j${i}`).sitio).toBeNull();
      // Y quien se queda se queda donde estaba (el mismo sitio de las 14:00 a las 14:50).
      for (let i = 0; i < 50; i++) expect(u(jugador, 0, 14, 40, `j${i}`).sitio).toBe(u(jugador, 0, 14, 5, `j${i}`).sitio);
    });

    it('solo los días que tiene la actividad y que hay colegio', () => {
      for (let i = 0; i < 50; i++) expect(u(jugador, 1, 14, 40, `j${i}`).sitio).toBeNull(); // martes: no hay sesión
      // El sábado, en el colegio no hay nadie a esa hora.
      expect(u(jugador, 5, 14, 40).sitio).toBeNull();
    });

    it('un hermano en edad escolar con su club hace lo mismo', () => {
      const h: TipoAsignado[] = [{ tipo: 'hermano', escolar: true }, { tipo: 'club', club: 'colegio' }];
      expect(['colegio', 'patio']).toContain(u(h, 0, 14, 40).sitio);
    });
  });

  describe('padres que recogen a su hijo (17/11)', () => {
    const padre: TipoAsignado[] = [{ tipo: 'vecino', recoge: true }];
    const u = (dia: number, hora: number, min: number, quien: string) => ubicacionEn(construirAgenda(padre, datos), en(dia, hora, min), quien).sitio;
    const personas = Array.from({ length: 400 }, (_, i) => `p${i}`);

    it('llegan a la entrada entre las 13:45 y las 14:00 y se van entre las 14:05 y las 14:30', () => {
      for (const p of personas) {
        // A las 14:00 todos están ya, y a las 14:30 no queda ninguno.
        expect(u(0, 14, 0, p), p).toBe('colegio');
        expect(u(0, 14, 2, p), p).toBe('colegio');
        expect(u(0, 14, 30, p), p).not.toBe('colegio');
        // Antes de las 13:45 no están; una vez que llegan se quedan hasta que se van (sin entrar y salir).
        expect(u(0, 13, 44, p) === 'colegio', p).toBe(false);
        let dentro = false;
        let salio = false;
        for (let m = 13 * 60 + 45; m < 14 * 60 + 30; m += 5) {
          const aqui = u(0, 0, m, p) === 'colegio';
          if (aqui) expect(salio, `${p} vuelve a las ${m}`).toBe(false);
          if (dentro && !aqui) salio = true;
          if (aqui) dentro = true;
        }
      }
      const en = (hora: number, min: number) => personas.filter((p) => u(0, hora, min, p) === 'colegio').length / personas.length;
      expect(en(13, 45)).toBeGreaterThan(0.2); // un tercio ya ha llegado
      expect(en(13, 45)).toBeLessThan(0.5);
      expect(en(13, 55)).toBe(1);
      expect(en(14, 5)).toBeGreaterThan(0.7);
      expect(en(14, 5)).toBeLessThan(0.95);
      expect(en(14, 25)).toBeGreaterThan(0.05);
      expect(en(14, 25)).toBeLessThan(0.3);
    });

    it('solo los días de colegio', () => {
      for (const p of personas.slice(0, 50)) expect(u(5, 14, 0, p)).not.toBe('colegio');
    });
  });
});
