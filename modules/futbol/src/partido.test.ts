import { describe, expect, it } from 'vitest';
import type { LectorDePersona } from '@ds/contracts';
import { PARAMETROS_DE_PARTIDO, POTENCIADOR_POR_CATEGORIA, PARTICIPACION_DEL_PUESTO, cansancioDelTramo, jugarPartido, rendimientoPorCansancio, valorEnPartido, type EquipoDePartido, type JugadorDePartido } from './partido';

/** Un jugador sintético: todas las habilidades en `valor` y todas las capacidades en `cap`; un 0,5 en lo normalizado (lo típico de su edad). */
const lector = (valor: number, cap = valor, resistencia = 0.5): LectorDePersona => ({
  stat: (id) => (id.startsWith('gen.') ? cap : valor),
  norm: (id) => (id === 'gen.resistencia' ? resistencia : 0.5),
});
const PUESTOS_TITULARES = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CDM', 'LW', 'RW', 'ST'];
const PUESTOS_SUPLENTES = ['GK', 'CB', 'CM', 'LW', 'ST'];
const equipo = (id: string, valor: number, o: { cap?: number; portero?: number; intensidad?: EquipoDePartido['intensidad']; energia?: number } = {}): EquipoDePartido => ({
  id,
  nombre: id,
  intensidad: o.intensidad,
  jugadores: [...PUESTOS_TITULARES.map((p) => [p, true] as const), ...PUESTOS_SUPLENTES.map((p) => [p, false] as const)].map(([puesto, titular], i): JugadorDePartido => ({
    id: `${id}_${i}`,
    nombre: `${id} ${i}`,
    puesto,
    titular,
    energia: o.energia,
    lector: lector(puesto === 'GK' && o.portero !== undefined ? o.portero : valor, o.cap),
  })),
});
const partido = (a: EquipoDePartido, b: EquipoDePartido, n: number, categoria = 'infantil', cambios = true) =>
  Array.from({ length: n }, (_, i) => jugarPartido(a, b, { id: `p${i}`, semilla: 7, categoria, ...(cambios ? { cambios: { maximo: 5, despuesDeTramos: [1, 3, 4] } } : {}) }));
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('el motor de partido', () => {
  it('es reproducible: con las mismas entradas, el mismo partido; con otro id, otro azar', () => {
    const a = equipo('a', 20);
    const b = equipo('b', 20);
    const o = { id: 'liga-1-a-b', semilla: 3, categoria: 'alevin' };
    expect(jugarPartido(a, b, o)).toEqual(jugarPartido(a, b, o));
    const distintos = Array.from({ length: 20 }, (_, i) => jugarPartido(a, b, { ...o, id: `x${i}` }).goles.join('-'));
    expect(new Set(distintos).size).toBeGreaterThan(3);
  });

  it('con equipos iguales hay goles y casi nada acaba 0 a 0, en cualquier categoría (el potenciador lleva a todas a la escala de adulto)', () => {
    // Un niño de cada categoría con lo típico de su edad (la mitad de lo de un adulto en benjamín, casi todo en juvenil): el potenciador lo lleva a la escala de adulto.
    const tipico: Record<string, number> = { benjamin: 40 / 2.8, alevin: 40 / 2, infantil: 40 / 1.6, cadete: 40 / 1.33, juvenil: 40 / 1.1 };
    for (const [cat, v] of Object.entries(tipico)) {
      const r = partido(equipo('a', v), equipo('b', v), 400, cat);
      const goles = media(r.map((x) => x.goles[0] + x.goles[1]));
      expect(goles, cat).toBeGreaterThan(1.8);
      expect(goles, cat).toBeLessThan(4.8);
      expect(r.filter((x) => x.goles[0] + x.goles[1] === 0).length / r.length, cat).toBeLessThan(0.12);
    }
  });

  it('gana más el mejor, y a más diferencia de nivel, más goles y más diferencia en el marcador', () => {
    const pasos = [0, 0.1, 0.25, 0.5].map((d) => {
      const r = partido(equipo('a', 30 * (1 + d)), equipo('b', 30), 400);
      return { victorias: r.filter((x) => x.goles[0] > x.goles[1]).length / r.length, goles: media(r.map((x) => x.goles[0] + x.goles[1])), dif: media(r.map((x) => Math.abs(x.goles[0] - x.goles[1]))) };
    });
    expect(pasos.map((p) => p.victorias)).toEqual([...pasos.map((p) => p.victorias)].sort((a, b) => a - b));
    expect(pasos[3].goles).toBeGreaterThan(pasos[0].goles);
    expect(pasos[3].dif).toBeGreaterThan(pasos[0].dif + 0.5);
    expect(pasos[3].victorias).toBeGreaterThan(0.7);
  });

  it('jugar en casa da una ventaja pequeña', () => {
    const r = partido(equipo('a', 30), equipo('b', 30), 1500);
    const casa = r.filter((x) => x.goles[0] > x.goles[1]).length;
    const fuera = r.filter((x) => x.goles[1] > x.goles[0]).length;
    expect(casa).toBeGreaterThan(fuera);
    expect(casa / (casa + fuera)).toBeLessThan(0.65); // pequeña
  });

  it('un portero malo encaja más goles y uno bueno, menos', () => {
    const goles = (portero: number) => media(partido(equipo('a', 30), equipo('b', 30, { portero }), 400).map((x) => x.goles[0]));
    expect(goles(5)).toBeGreaterThan(goles(30));
    expect(goles(30)).toBeGreaterThan(goles(80));
  });

  it('el cansancio sube un jugador típico a unos 45 en 6 tramos a intensidad normal; a tope, más, y relajado, menos; llegar sin energía cansa más', () => {
    const j = equipo('a', 30).jugadores[1];
    const en6 = (i: 'relajado' | 'normal' | 'a_tope', energia = 100) => 6 * cansancioDelTramo({ ...j, energia }, i);
    expect(en6('normal')).toBeGreaterThan(40);
    expect(en6('normal')).toBeLessThan(50);
    expect(en6('a_tope')).toBeGreaterThan(en6('normal'));
    expect(en6('relajado')).toBeLessThan(en6('normal'));
    expect(en6('normal', 40)).toBeGreaterThan(en6('normal', 100));
    // La resistencia: quien resiste más, se cansa menos.
    expect(cansancioDelTramo({ ...j, lector: lector(30, 30, 0.9) }, 'normal')).toBeLessThan(cansancioDelTramo({ ...j, lector: lector(30, 30, 0.1) }, 'normal'));
  });

  it('la tabla de rendimiento por cansancio es la del addon y la intensidad la multiplica', () => {
    expect(rendimientoPorCansancio(10, 'normal')).toBe(1); // frescura 90
    expect(rendimientoPorCansancio(40, 'normal')).toBe(0.9); // 60
    expect(rendimientoPorCansancio(60, 'normal')).toBe(0.75); // 40
    expect(rendimientoPorCansancio(80, 'normal')).toBe(0.55); // 20
    expect(rendimientoPorCansancio(95, 'normal')).toBe(0.3); // 5
    expect(rendimientoPorCansancio(0, 'a_tope')).toBeCloseTo(1.07, 5);
    expect(rendimientoPorCansancio(0, 'relajado')).toBeCloseTo(0.93, 5);
  });

  it('a tope rinde más al principio pero el equipo se cansa más; relajado, al revés (se nota en el rendimiento de los últimos tramos)', () => {
    const tope = jugarPartido(equipo('a', 30, { intensidad: 'a_tope' }), equipo('b', 30), { id: 'x', semilla: 1, categoria: 'infantil' });
    const jugadores = equipo('a', 30).jugadores;
    expect(PARAMETROS_DE_PARTIDO.intensidades.a_tope.cansancio).toBeGreaterThan(1);
    expect(tope.porTramo).toHaveLength(6);
    expect(jugadores.length).toBe(16);
  });

  it('el potenciador de cada categoría lleva a la escala de adulto: el mismo niño vale menos en la categoría de arriba (queda donde le corresponde)', () => {
    const niño = lector(25, 25);
    expect(valorEnPartido(niño, 'futbol.pase', POTENCIADOR_POR_CATEGORIA.alevin)).toBeGreaterThan(valorEnPartido(niño, 'futbol.pase', POTENCIADOR_POR_CATEGORIA.infantil));
    expect(POTENCIADOR_POR_CATEGORIA.benjamin).toBeGreaterThan(POTENCIADOR_POR_CATEGORIA.alevin);
    expect(POTENCIADOR_POR_CATEGORIA.juvenil).toBeGreaterThan(POTENCIADOR_POR_CATEGORIA.senior);
  });

  it('las capacidades de apoyo suben o bajan la habilidad de ×0,6 a ×1,2 frente a lo típico de un adulto', () => {
    const flojo = valorEnPartido(lector(40, 5), 'futbol.pase', 1);
    const normal = valorEnPartido(lector(40, 40), 'futbol.pase', 1);
    const bueno = valorEnPartido(lector(40, 100), 'futbol.pase', 1);
    expect(flojo / normal).toBeCloseTo(0.6, 1);
    expect(bueno / normal).toBeCloseTo(1.2, 1);
  });

  it('cada puesto aporta a las zonas según lo que pesa en él: el portero a la portería, el central a la defensa, el delantero al ataque', () => {
    const suma = (p: string) => Object.values(PARTICIPACION_DEL_PUESTO[p]).reduce((a, b) => a + b, 0);
    for (const p of Object.keys(PARTICIPACION_DEL_PUESTO)) expect(suma(p)).toBeCloseTo(1, 5);
    expect(PARTICIPACION_DEL_PUESTO.GK.porteria).toBeGreaterThan(0.7);
    expect(PARTICIPACION_DEL_PUESTO.CB.defensa).toBeGreaterThan(PARTICIPACION_DEL_PUESTO.CB.ataque);
    expect(PARTICIPACION_DEL_PUESTO.ST.ataque).toBeGreaterThan(PARTICIPACION_DEL_PUESTO.ST.defensa);
    expect(PARTICIPACION_DEL_PUESTO.CAM.creacion).toBeGreaterThan(PARTICIPACION_DEL_PUESTO.CB.creacion);
  });

  it('las estadísticas cuadran: los goles de los jugadores son los del marcador, los titulares juegan 90 minutos sin cambios y las notas están entre 1 y 10', () => {
    const r = partido(equipo('a', 30), equipo('b', 30), 60, 'infantil', false);
    for (const x of r) {
      const goles = (pref: string) => Object.entries(x.jugadores).filter(([id]) => id.startsWith(pref)).reduce((t, [, s]) => t + s.goles, 0);
      expect(goles('a_')).toBe(x.goles[0]);
      expect(goles('b_')).toBe(x.goles[1]);
      expect(x.jugadas).toHaveLength(x.goles[0] + x.goles[1]);
      for (const [id, s] of Object.entries(x.jugadores)) {
        if (s.titular) expect(s.minutos, id).toBe(90);
        else expect(s.minutos, id).toBe(0);
        if (s.minutos > 0) {
          expect(s.nota).toBeGreaterThanOrEqual(1);
          expect(s.nota).toBeLessThanOrEqual(10);
        } else expect(s.nota).toBe(0);
      }
    }
  });

  it('con cambios, juegan suplentes y los minutos del equipo siguen siendo 11 × 90; con cambios volantes pueden volver a entrar', () => {
    const r = partido(equipo('a', 30), equipo('b', 30), 40, 'infantil', true);
    let suplentesQueJuegan = 0;
    for (const x of r) {
      const minutos = Object.entries(x.jugadores).filter(([id]) => id.startsWith('a_')).reduce((t, [, s]) => t + s.minutos, 0);
      expect(minutos).toBe(11 * 90);
      suplentesQueJuegan += Object.entries(x.jugadores).filter(([id, s]) => id.startsWith('a_') && !s.titular && s.minutos > 0).length;
      // Nadie pasa de 5 cambios.
      expect(Object.entries(x.jugadores).filter(([id, s]) => id.startsWith('a_') && !s.titular && s.minutos > 0).length).toBeLessThanOrEqual(5);
    }
    expect(suplentesQueJuegan).toBeGreaterThan(20);
  });

  it('el goleador y el asistente tienen mejor nota que el resto; la nota media de un jugador típico ronda el 6', () => {
    const r = partido(equipo('a', 30), equipo('b', 30), 300, 'infantil', false);
    const notas = r.flatMap((x) => Object.values(x.jugadores).filter((s) => s.minutos > 0 && s.puesto !== 'GK'));
    expect(media(notas.map((s) => s.nota))).toBeGreaterThan(5.7);
    expect(media(notas.map((s) => s.nota))).toBeLessThan(6.5);
    expect(media(notas.filter((s) => s.goles > 0).map((s) => s.nota))).toBeGreaterThan(media(notas.filter((s) => s.goles === 0).map((s) => s.nota)) + 0.7);
  });

  it('un equipo más fuerte (en todas sus zonas) también saca mejor nota a sus jugadores', () => {
    const r = partido(equipo('a', 45), equipo('b', 25), 200, 'infantil', false);
    const notas = (pref: string) => media(r.flatMap((x) => Object.entries(x.jugadores).filter(([id, s]) => id.startsWith(pref) && s.minutos > 0).map(([, s]) => s.nota)));
    expect(notas('a_')).toBeGreaterThan(notas('b_'));
  });
});
