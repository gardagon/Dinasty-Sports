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

  describe('trabajo de los progenitores de un hogar (23/11)', () => {
    const sitio = (t: TipoAsignado[], dia: number, hora: number, min: number, quien: string) => ubicacionEn(construirAgenda(t, datos), en(dia, hora, min), quien).sitio;
    const personas = Array.from({ length: 200 }, (_, i) => `p${i}`);

    it('de lunes a viernes de 9:00 a 17:00 está fuera del mapa; el resto del día, como un vecino', () => {
      const t: TipoAsignado[] = [{ tipo: 'vecino', adulto: true, laboral: true }];
      for (const p of personas) for (const dia of [0, 2, 4]) for (const [hora, min] of [[9, 0], [11, 30], [15, 0], [16, 55]]) expect(sitio(t, dia, hora, min, p), `${p} día ${dia} ${hora}:${min}`).toBeNull();
      // El sábado es de un vecino cualquiera: alguno pisa el parque a media mañana.
      expect(personas.some((p) => sitio(t, 5, 11, 0, p) !== null)).toBe(true);
    });

    it('quien recoge sale antes: trabaja hasta las 13:30, está en el colegio a las 14:00 (si va ese día) y no vuelve a trabajar esa tarde', () => {
      const t: TipoAsignado[] = [{ tipo: 'vecino', adulto: true, laboral: true, recoge: true }];
      for (const p of personas) expect(sitio(t, 1, 12, 0, p), p).toBeNull();
      expect(personas.some((p) => sitio(t, 1, 14, 0, p) === 'colegio')).toBe(true);
    });

    it('quien trabaja en un lugar está en él en su horario, no fuera', () => {
      const t: TipoAsignado[] = [{ tipo: 'vecino', adulto: true, laboral: true, trabaja: 'supermercado', turno: 'manana' }];
      expect(personas.some((p) => sitio(t, 1, 11, 0, p) === 'supermercado')).toBe(true);
    });
  });

  describe('padres que recogen a su hijo (17/11)', () => {
    const padre: TipoAsignado[] = [{ tipo: 'vecino', recoge: true }];
    const u = (dia: number, hora: number, min: number, quien: string) => ubicacionEn(construirAgenda(padre, datos), en(dia, hora, min), quien).sitio;
    const personas = Array.from({ length: 400 }, (_, i) => `p${i}`);

    /** Los que van ese día (a las 14:00 están en la entrada); los demás no pisan la entrada en toda la franja. */
    const van = (dia: number) => personas.filter((p) => u(dia, 14, 0, p) === 'colegio');

    it('llegan a la entrada entre las 13:45 y las 14:00 y se van entre las 14:05 y las 14:30 (los días que van)', () => {
      const dentro = van(0);
      for (const p of dentro) {
        expect(u(0, 14, 2, p), p).toBe('colegio');
        expect(u(0, 14, 30, p), p).not.toBe('colegio');
        // Antes de las 13:45 no están; una vez que llegan se quedan hasta que se van (sin entrar y salir).
        expect(u(0, 13, 44, p) === 'colegio', p).toBe(false);
        let aqui0 = false;
        let salio = false;
        for (let m = 13 * 60 + 45; m < 14 * 60 + 30; m += 5) {
          const aqui = u(0, 0, m, p) === 'colegio';
          if (aqui) expect(salio, `${p} vuelve a las ${m}`).toBe(false);
          if (aqui0 && !aqui) salio = true;
          if (aqui) aqui0 = true;
        }
      }
      // Quien no va ese día no aparece en ningún momento de la franja.
      for (const p of personas.filter((x) => !dentro.includes(x))) for (let m = 13 * 60 + 40; m < 14 * 60 + 35; m += 5) expect(u(0, 0, m, p), `${p} a las ${m}`).not.toBe('colegio');
      const en = (hora: number, min: number) => dentro.filter((p) => u(0, hora, min, p) === 'colegio').length / dentro.length;
      expect(en(13, 45)).toBeGreaterThan(0.2); // un tercio ya ha llegado
      expect(en(13, 45)).toBeLessThan(0.5);
      expect(en(13, 55)).toBe(1);
      expect(en(14, 5)).toBeGreaterThan(0.7);
      expect(en(14, 5)).toBeLessThan(0.95);
      expect(en(14, 25)).toBeGreaterThan(0.05);
      expect(en(14, 25)).toBeLessThan(0.3);
    });

    it('van el 80 % de los días de clase (sorteo estable por persona y día) y no siempre los mismos', () => {
      const dias = Array.from({ length: 20 }, (_, i) => i).filter((d) => en(d, 14).isSchoolDay);
      expect(dias.length).toBeGreaterThan(10);
      let total = 0;
      for (const d of dias) total += van(d).length;
      const proporcion = total / (dias.length * personas.length);
      expect(proporcion).toBeGreaterThan(0.77);
      expect(proporcion).toBeLessThan(0.83);
      // Estable: el mismo día da el mismo resultado; y cada persona falta algún día (no son siempre los mismos).
      expect(van(dias[0])).toEqual(van(dias[0]));
      const siempre = personas.filter((p) => dias.every((d) => u(d, 14, 0, p) === 'colegio'));
      expect(siempre.length / personas.length).toBeLessThan(0.1);
      expect(personas.filter((p) => dias.every((d) => u(d, 14, 0, p) !== 'colegio')).length).toBe(0);
    });

    it('solo los días de colegio', () => {
      for (const p of personas.slice(0, 50)) expect(u(5, 14, 0, p)).not.toBe('colegio');
    });
  });

  describe('gente por la calle (23/11)', () => {
    const u = (tipos: TipoAsignado[], dia: number, hora: number, min = 0, quien = 'x') => ubicacionEn(construirAgenda(tipos, datos), en(dia, hora, min), quien);
    const cuantos = (tipos: TipoAsignado[], dia: number, hora: number, min: number, sitio: string, personas = 400) => Array.from({ length: personas }, (_, i) => u(tipos, dia, hora, min, `p${i}`).sitio).filter((x) => x === sitio).length;
    const cualquiera = (tipos: TipoAsignado[], dia: number, hora: number, min: number, personas = 400) => Array.from({ length: personas }, (_, i) => u(tipos, dia, hora, min, `p${i}`).sitio);

    it('un vecino que vive en la calle de tu casa sale y vuelve por ella (de 6:30 a 23:59) y no está en ella de madrugada', () => {
      const vecino: TipoAsignado[] = [{ tipo: 'vecino', adulto: true, vive: 'calle_casa' }];
      expect(cuantos(vecino, 0, 7, 30, 'calle_casa')).toBeGreaterThan(20); // salir a trabajar (p 0,12)
      expect(cuantos(vecino, 0, 7, 30, 'calle_casa')).toBeLessThan(90);
      expect(cuantos(vecino, 0, 18, 30, 'calle_casa')).toBeGreaterThan(5); // volver
      expect(cuantos(vecino, 0, 22, 0, 'calle_casa')).toBeGreaterThan(0); // paseo de noche
      expect(cuantos(vecino, 0, 23, 50, 'calle_casa', 3000)).toBeGreaterThan(0); // hasta las 23:59
      for (const [hora, min] of [[0, 0], [3, 0], [6, 0], [6, 29]] as const) expect(cuantos(vecino, 0, hora, min, 'calle_casa')).toBe(0);
      // Los fines de semana, a media mañana.
      expect(cuantos(vecino, 5, 11, 0, 'calle_casa')).toBeGreaterThan(5);
      // Solo pisa su calle (y las de paso del resto de los adultos).
      expect(cuantos(vecino, 0, 7, 30, 'calle_casa') + cuantos(vecino, 0, 7, 30, 'calle_colegio')).toBeGreaterThan(0);
      expect(cuantos(vecino, 0, 7, 30, 'avenida_estadio')).toBe(0);
    });

    it('a quien no vive en ninguna calle solo se le ve de paso por la del colegio o por la avenida, y poco; los jóvenes (sin la marca de adulto) no pisan la calle', () => {
      expect(cuantos([{ tipo: 'vecino' }], 0, 7, 30, 'calle_colegio', 1000) + cuantos([{ tipo: 'vecino' }], 5, 11, 0, 'avenida_parque', 1000) + cuantos([{ tipo: 'vecino' }], 0, 22, 0, 'calle_casa', 1000)).toBe(0);
      const vecino: TipoAsignado[] = [{ tipo: 'vecino', adulto: true }];
      expect(cuantos(vecino, 0, 7, 30, 'calle_casa', 1000)).toBe(0);
      const deCamino = cuantos(vecino, 0, 7, 30, 'calle_colegio', 1000);
      expect(deCamino).toBeGreaterThan(10);
      expect(deCamino).toBeLessThan(90);
    });

    it('quien pasea al perro sale desde las 6:30 y por la noche, y los fines de semana más rato', () => {
      const dueno: TipoAsignado[] = [{ tipo: 'vecino', vive: 'calle_casa', perro: true }];
      const sitios = (dia: number, hora: number, min: number) => cualquiera(dueno, dia, hora, min).filter((x) => x === 'calle_casa' || x === 'avenida_parque' || x === 'parque');
      expect(sitios(0, 6, 40).length).toBeGreaterThan(80);
      expect(cualquiera(dueno, 0, 6, 20).filter((x) => x === 'avenida_parque').length).toBe(0);
      expect(sitios(0, 22, 0).length).toBeGreaterThan(30);
      // Sin perro, de noche, solo los que salen a dar una vuelta por su calle.
      expect(cuantos([{ tipo: 'vecino', vive: 'calle_casa' }], 0, 22, 0, 'avenida_parque')).toBe(0);
      expect(sitios(5, 10, 0).length).toBeGreaterThan(30);
    });

    it('la marca del perro admite la referencia a una mascota (un texto) y se comporta igual', () => {
      const a: TipoAsignado[] = [{ tipo: 'vecino', vive: 'calle_casa', perro: true }];
      const b: TipoAsignado[] = [{ tipo: 'vecino', vive: 'calle_casa', perro: 'mascota_1' }];
      for (let i = 0; i < 100; i++) expect(u(b, 0, 7, 0, `p${i}`).sitio).toBe(u(a, 0, 7, 0, `p${i}`).sitio);
    });

    it('los jubilados se sientan en un banco de la avenida o del parque por la mañana y por la tarde', () => {
      const jubilado: TipoAsignado[] = [{ tipo: 'vecino', jubilado: true }];
      const enBanco = (hora: number, min: number) => cualquiera(jubilado, 0, hora, min).filter((x) => x === 'avenida_parque' || x === 'parque').length;
      expect(enBanco(11, 0)).toBeGreaterThan(100); // los de la avenida, y los que van al parque como cualquier vecino
      expect(cuantos(jubilado, 0, 11, 0, 'avenida_parque')).toBeGreaterThan(40);
      expect(cuantos(jubilado, 0, 18, 0, 'avenida_parque')).toBeGreaterThan(40);
      expect(cuantos(jubilado, 0, 23, 0, 'avenida_parque')).toBe(0);
      // No hacen lo de salir a trabajar.
      expect(cuantos([{ tipo: 'vecino', jubilado: true, vive: 'calle_casa' }], 0, 7, 30, 'calle_casa')).toBe(0);
    });

    it('los menores de 12 años no van solos al supermercado ni al restaurante (ni de vecino ni de alumno)', () => {
      const pequenos: TipoAsignado[][] = [[{ tipo: 'vecino', pequeno: true }], [{ tipo: 'vecino', escolar: true, pequeno: true }], [{ tipo: 'alumno', pequeno: true }], [{ tipo: 'alumno', tuClase: true, pequeno: true }]];
      for (const t of pequenos) {
        for (let dia = 0; dia < 14; dia++) {
          for (let m = 0; m < 1440; m += 30) for (let p = 0; p < 40; p++) expect(['supermercado', 'restaurante'], `${t[0].tipo} día ${dia} ${m}`).not.toContain(u(t, dia, 0, m, `p${p}`).sitio);
        }
      }
      // Los mayores sí van (y a los demás sitios, los pequeños también).
      expect(cuantos([{ tipo: 'vecino' }], 0, 15, 30, 'supermercado')).toBeGreaterThan(50);
      expect(cuantos([{ tipo: 'alumno' }], 0, 16, 0, 'supermercado')).toBeGreaterThan(10);
      expect(cuantos([{ tipo: 'alumno', pequeno: true }], 0, 16, 0, 'parque')).toBeGreaterThan(85);
      expect(cuantos([{ tipo: 'vecino', pequeno: true }], 5, 11, 0, 'parque')).toBeGreaterThan(100);
    });

    it('un niño pequeño que vive en una calle juega en ella por la tarde y los fines de semana, y en clase no sale', () => {
      const nino: TipoAsignado[] = [{ tipo: 'vecino', escolar: true, pequeno: true, vive: 'calle_casa' }];
      expect(cuantos(nino, 0, 17, 30, 'calle_casa')).toBeGreaterThan(30);
      expect(cuantos(nino, 5, 11, 30, 'calle_casa')).toBeGreaterThan(30);
      for (const [hora, min] of [[8, 0], [10, 0], [14, 20]] as const) expect(cuantos(nino, 0, hora, min, 'calle_casa')).toBe(0);
      expect(cuantos(nino, 0, 22, 0, 'calle_casa')).toBe(0);
    });

    it('quien trabaja en un lugar está allí en su turno, a la vista, casi todos los días y siempre dentro del horario del sitio', () => {
      const dependiente: TipoAsignado[] = [{ tipo: 'vecino', trabaja: 'supermercado', turno: 'manana' }];
      const dias = [0, 1, 2, 3, 4, 5];
      let van = 0;
      for (const d of dias) for (let p = 0; p < 200; p++) if (u(dependiente, d, 10, 0, `p${p}`).sitio === 'supermercado') van++;
      expect(van / (dias.length * 200)).toBeGreaterThan(0.8);
      expect(van / (dias.length * 200)).toBeLessThan(0.9);
      expect(u([{ tipo: 'vecino', trabaja: 'supermercado', turno: 'manana' }], 0, 10, 0, 'p1').nivel).toBe(NIVEL_AGENDA.pertenencia);
      // El de la tarde no está por la mañana (salvo como cliente); el domingo solo trabaja el de la mañana.
      expect(cuantos([{ tipo: 'vecino', trabaja: 'supermercado', turno: 'tarde' }], 6, 12, 0, 'supermercado')).toBeLessThan(200); // solo de cliente
      expect(cuantos([{ tipo: 'vecino', trabaja: 'supermercado', turno: 'manana' }], 6, 12, 0, 'supermercado')).toBeGreaterThan(300);
      // El restaurante: comida y cena; el gimnasio: todo el día en dos turnos.
      expect(cuantos([{ tipo: 'vecino', trabaja: 'restaurante', turno: 'manana' }], 0, 14, 0, 'restaurante')).toBeGreaterThan(300);
      expect(cuantos([{ tipo: 'vecino', trabaja: 'restaurante', turno: 'tarde' }], 0, 21, 0, 'restaurante')).toBeGreaterThan(300);
      expect(cuantos([{ tipo: 'vecino', trabaja: 'gimnasio', turno: 'tarde' }], 0, 21, 30, 'gimnasio')).toBeGreaterThan(300);
      // Se le puede hablar: no está ocupado.
      expect(u(dependiente, 0, 10, 0, 'p3').ocupado).toBeUndefined();
    });

    it('el portero está en la calle de tu casa casi todo el día (no de noche), el conserje en la entrada del colegio mientras está abierto', () => {
      const portero: TipoAsignado[] = [{ tipo: 'portero' }];
      expect(cuantos(portero, 0, 9, 0, 'calle_casa')).toBeGreaterThan(300);
      expect(cuantos(portero, 0, 18, 0, 'calle_casa')).toBeGreaterThan(300);
      expect(cuantos(portero, 0, 15, 0, 'calle_casa')).toBe(0);
      expect(cuantos(portero, 0, 23, 0, 'calle_casa')).toBe(0);
      expect(cuantos(portero, 6, 10, 0, 'calle_casa')).toBeGreaterThan(300);
      const conserje: TipoAsignado[] = [{ tipo: 'conserje' }];
      expect(cuantos(conserje, 0, 8, 30, 'colegio')).toBe(400);
      expect(cuantos(conserje, 0, 19, 0, 'colegio')).toBe(0);
      expect(cuantos(conserje, 5, 12, 0, 'colegio')).toBe(0); // sábado: cerrado
    });

    it('los repartidores hacen paradas cortas en la calle de tu casa y en la del colegio de lunes a sábado', () => {
      const repartidor: TipoAsignado[] = [{ tipo: 'repartidor' }];
      expect(cuantos(repartidor, 0, 11, 0, 'calle_casa') + cuantos(repartidor, 0, 11, 0, 'calle_colegio')).toBeGreaterThan(30);
      expect(cuantos(repartidor, 0, 18, 0, 'calle_casa')).toBeGreaterThan(5);
      expect(cuantos(repartidor, 0, 14, 0, 'calle_casa') + cuantos(repartidor, 6, 11, 0, 'calle_casa')).toBe(0);
    });
  });
});
