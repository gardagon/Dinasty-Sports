import { afterEach, describe, expect, it } from 'vitest';
import { perfilDeRiesgo, type LectorDePersona } from '@ds/contracts';
import { PARAMETROS_DE_PARTIDO, avanzarPartido, crearPartido, jugarPartido, resultadoDelPartido, type EquipoDePartido, type EstadoDePartido, type JugadorDePartido, type ResultadoDePartido } from './partido';

const lector = (valor: number): LectorDePersona => ({ stat: (id) => (id.startsWith('gen.') ? valor : valor + ((id.length * 7) % 13)), norm: (id) => (id === 'gen.resistencia' ? 0.4 : 0.5), inmutable: true });
const TITULARES = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CDM', 'LW', 'RW', 'ST'];
const SUPLENTES = ['GK', 'CB', 'CM', 'LW', 'ST'];
const equipo = (id: string, valor: number): EquipoDePartido => ({
  id,
  nombre: id,
  jugadores: [...TITULARES.map((p) => [p, true] as const), ...SUPLENTES.map((p) => [p, false] as const)].map(([puesto, titular], i): JugadorDePartido => ({ id: `${id}_${i}`, nombre: id, puesto, titular, rinde: 0.9 + (i % 4) * 0.03, energia: 70 + i, lector: lector(valor + i) })),
});
/** Un equipo plano: todos con el mismo valor en todo (el típico de un adulto es 40) y en plena forma. */
const equipoPlano = (id: string, valor: number): EquipoDePartido => ({
  id,
  nombre: id,
  jugadores: [...TITULARES.map((p) => [p, true] as const), ...SUPLENTES.map((p) => [p, false] as const)].map(([puesto, titular], i): JugadorDePartido => ({ id: `${id}_${i}`, nombre: id, puesto, titular, lector: { stat: () => valor, norm: () => 0.5, inmutable: true } })),
});
const CAMBIOS = { maximo: 5, despuesDeTramos: [1, 3, 4] };
const partidos = (n: number, categoria = 'infantil', a = 30, b = 30): ResultadoDePartido[] =>
  Array.from({ length: n }, (_, i) => jugarPartido(equipo('a', a), equipo('b', b), { id: `p${i}`, semilla: 5, categoria, cambios: CAMBIOS }));
const suma = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

describe('el motor de posesiones y ocasiones es una máquina de estados reanudable', () => {
  it('un partido parado, guardado como JSON y seguido después es exactamente el mismo que uno jugado de un tirón', () => {
    const a = equipo('a', 28);
    const b = equipo('b', 33);
    for (const corte of [1, 15, 37, 45, 60, 89]) {
      const o = { id: `reanuda-${corte}`, semilla: 9, categoria: 'cadete', cambios: CAMBIOS };
      const entero = jugarPartido(a, b, o);
      const estado = crearPartido(a, b, o);
      avanzarPartido(estado, a, b, corte);
      expect(estado.minuto).toBe(corte);
      const guardado = JSON.parse(JSON.stringify(estado)) as EstadoDePartido;
      avanzarPartido(guardado, a, b, 90);
      expect(resultadoDelPartido(guardado, a, b)).toEqual(entero);
    }
  });

  it('se puede ver minuto a minuto: el registro solo crece y cada minuto trae sucesos de ese minuto', () => {
    const a = equipo('a', 30);
    const b = equipo('b', 30);
    const estado = crearPartido(a, b, { id: 'directo', semilla: 2, categoria: 'infantil', cambios: CAMBIOS });
    let vistos = 0;
    for (let m = 1; m <= 90; m++) {
      avanzarPartido(estado, a, b, m);
      expect(estado.minuto).toBe(m);
      expect(estado.registro.length).toBeGreaterThanOrEqual(vistos);
      for (const s of estado.registro.slice(vistos)) expect(s.minuto).toBe(m - 1);
      vistos = estado.registro.length;
    }
    expect(estado.minuto).toBe(90);
    // Pedir más de 90 no juega más.
    avanzarPartido(estado, a, b, 120);
    expect(estado.minuto).toBe(90);
  });

  it('el nivel que se pide se guarda en el resultado y no cambia el partido', () => {
    const o = { id: 'nivel', semilla: 3, categoria: 'alevin', cambios: CAMBIOS };
    const n1 = jugarPartido(equipo('a', 28), equipo('b', 31), { ...o, nivel: 1 });
    const n2 = jugarPartido(equipo('a', 28), equipo('b', 31), o);
    expect(n1.nivel).toBe(1);
    expect(n2.nivel).toBe(2);
    expect({ ...n1, nivel: 2 }).toEqual(n2);
  });
});

describe('las estadísticas del partido cuadran con el registro', () => {
  const rs = partidos(120);

  it('los tiros, las faltas, las tarjetas y los pases de los jugadores suman los de los equipos', () => {
    for (const r of rs) {
      for (const i of [0, 1] as const) {
        const de = Object.entries(r.jugadores).filter(([id]) => id.startsWith(i === 0 ? 'a_' : 'b_')).map(([, s]) => s);
        expect(suma(de.map((s) => s.tiros))).toBe(r.tiros[i]);
        expect(suma(de.map((s) => s.alPuerta))).toBe(r.alPuerta[i]);
        expect(suma(de.map((s) => s.faltas))).toBe(r.faltas[i]);
        expect(suma(de.map((s) => s.amarillas))).toBe(r.amarillas[i]);
        expect(de.filter((s) => s.roja).length).toBe(r.rojas[i]);
        expect(suma(de.map((s) => s.pases))).toBe(r.pases[i]);
        expect(suma(de.map((s) => s.pasesOk))).toBe(r.pasesOk[i]);
        expect(suma(de.map((s) => s.goles))).toBe(r.goles[i]);
        expect(Math.abs(suma(de.map((s) => s.xg)) - r.xg[i])).toBeLessThan(0.3);
      }
    }
  });

  it('cada gol tiene su tiro a puerta, y las faltas, tarjetas y córners del registro son los de las estadísticas', () => {
    for (const r of rs) {
      for (const i of [0, 1] as const) {
        expect(r.goles[i]).toBeLessThanOrEqual(r.alPuerta[i]);
        expect(r.alPuerta[i]).toBeLessThanOrEqual(r.tiros[i]);
        expect(r.pasesOk[i]).toBeLessThanOrEqual(r.pases[i]);
        expect(r.registro.filter((s) => s.equipo === i && s.tipo === 'falta')).toHaveLength(r.faltas[i]);
        expect(r.registro.filter((s) => s.equipo === i && s.tipo === 'amarilla')).toHaveLength(r.amarillas[i]);
        expect(r.registro.filter((s) => s.equipo === i && s.tipo === 'roja')).toHaveLength(r.rojas[i]);
        expect(r.registro.filter((s) => s.equipo === i && s.tipo === 'corner')).toHaveLength(r.corners[i]);
      }
      expect(r.registro.filter((s) => s.tipo === 'gol')).toHaveLength(r.goles[0] + r.goles[1]);
      expect(r.jugadas).toHaveLength(r.goles[0] + r.goles[1]);
      // El registro va en orden de minutos.
      expect(r.registro.map((s) => s.minuto)).toEqual([...r.registro.map((s) => s.minuto)].sort((x, y) => x - y));
    }
  });

  it('la crónica sale del registro: tiene los goles, las tarjetas, los penaltis y los cambios, y no las faltas sin tarjeta', () => {
    for (const r of rs) {
      expect(r.cronica.filter((m) => m.tipo === 'gol')).toHaveLength(r.goles[0] + r.goles[1]);
      expect(r.cronica.filter((m) => m.tipo === 'amarilla')).toHaveLength(r.amarillas[0] + r.amarillas[1]);
      expect(r.cronica.filter((m) => m.tipo === 'roja')).toHaveLength(r.rojas[0] + r.rojas[1]);
      expect(r.cronica.some((m) => m.tipo === 'falta')).toBe(false);
      expect(r.cronica.some((m) => m.tipo === 'corner')).toBe(false);
    }
  });

  it('un expulsado se queda sin minutos desde su expulsión y no vuelve a hacer nada; con diez, el equipo no repone', () => {
    let expulsiones = 0;
    for (const r of rs) {
      for (const e of r.registro.filter((s) => s.tipo === 'roja')) {
        expulsiones++;
        expect(r.jugadores[e.jugador].roja).toBe(true);
        // Un titular juega hasta que lo echan; un suplente, desde que entró.
        if (r.jugadores[e.jugador].titular) expect(r.jugadores[e.jugador].minutos).toBe(e.minuto);
        else expect(r.jugadores[e.jugador].minutos).toBeLessThanOrEqual(e.minuto);
        expect(r.registro.filter((s) => s.jugador === e.jugador && s.minuto > e.minuto && s.tipo !== 'cambio')).toHaveLength(0);
      }
    }
    expect(expulsiones).toBeGreaterThan(5);
  });

  it('una doble amarilla es una roja con dos amarillas; cada jugador tiene como mucho dos', () => {
    for (const r of rs) {
      for (const s of Object.values(r.jugadores)) expect(s.amarillas).toBeLessThanOrEqual(2);
      for (const e of r.registro.filter((x) => x.tipo === 'roja' && x.dobleAmarilla)) expect(r.jugadores[e.jugador].amarillas).toBe(2);
    }
  });
});

describe('el motor se parece a un partido (equipos iguales, nivel de adulto)', () => {
  const rs = Array.from({ length: 400 }, (_, i) => jugarPartido(equipoPlano('a', 40), equipoPlano('b', 40), { id: `s${i}`, semilla: 5, categoria: 'senior', cambios: CAMBIOS }));
  const media = (g: (r: ResultadoDePartido) => number): number => suma(rs.map(g)) / rs.length;

  it('faltas, amarillas, córners, tiros a puerta y pases en el orden de un partido real', () => {
    expect(media((r) => r.faltas[0] + r.faltas[1])).toBeGreaterThan(18);
    expect(media((r) => r.faltas[0] + r.faltas[1])).toBeLessThan(30);
    expect(media((r) => r.amarillas[0] + r.amarillas[1])).toBeGreaterThan(2.5);
    expect(media((r) => r.amarillas[0] + r.amarillas[1])).toBeLessThan(5.5);
    expect(media((r) => r.rojas[0] + r.rojas[1])).toBeLessThan(0.35);
    expect(media((r) => r.corners[0] + r.corners[1])).toBeGreaterThan(6);
    expect(media((r) => r.corners[0] + r.corners[1])).toBeLessThan(14);
    expect(media((r) => r.alPuerta[0] + r.alPuerta[1])).toBeGreaterThan(6);
    expect(media((r) => r.alPuerta[0] + r.alPuerta[1])).toBeLessThan(14);
    expect(media((r) => r.pases[0] + r.pases[1])).toBeGreaterThan(650);
    expect(media((r) => r.pases[0] + r.pases[1])).toBeLessThan(1100);
    const precision = media((r) => r.pasesOk[0] + r.pasesOk[1]) / media((r) => r.pases[0] + r.pases[1]);
    expect(precision).toBeGreaterThan(0.72);
    expect(precision).toBeLessThan(0.92);
  });

  it('quién marca: los delanteros y extremos la mitad, los centrocampistas algo más de un tercio y los defensas muy poco', () => {
    let delanteros = 0;
    let medios = 0;
    let defensas = 0;
    for (const r of rs) {
      for (const s of Object.values(r.jugadores)) {
        if (['ST', 'LW', 'RW'].includes(s.puesto)) delanteros += s.goles;
        else if (['CM', 'CDM'].includes(s.puesto)) medios += s.goles;
        else if (['CB', 'LB', 'RB'].includes(s.puesto)) defensas += s.goles;
      }
    }
    const total = delanteros + medios + defensas;
    expect(delanteros / total).toBeGreaterThan(0.4);
    expect(delanteros / total).toBeLessThan(0.62);
    expect(medios / total).toBeGreaterThan(0.25);
    expect(medios / total).toBeLessThan(0.45);
    expect(defensas / total).toBeLessThan(0.2);
  });

  it('cuando se abre el partido, se marca algo más en la segunda parte', () => {
    const primera = suma(rs.map((r) => r.porTramo.slice(0, 3).reduce((t, x) => t + x.goles[0] + x.goles[1], 0)));
    const total = suma(rs.map((r) => r.goles[0] + r.goles[1]));
    expect(primera / total).toBeLessThan(0.5);
    expect(primera / total).toBeGreaterThan(0.38);
  });

  it('la intensidad «a tope» da más faltas que «relajado»', () => {
    const faltas = (intensidad: 'relajado' | 'a_tope'): number =>
      suma(Array.from({ length: 200 }, (_, i) => jugarPartido({ ...equipo('a', 40), intensidad }, { ...equipo('b', 40), intensidad }, { id: `i${i}`, semilla: 4, categoria: 'senior' })).map((r) => r.faltas[0] + r.faltas[1])) / 200;
    expect(faltas('a_tope')).toBeGreaterThan(faltas('relajado') * 1.2);
  });
});

describe('las lesiones en el partido: enganchadas, detrás de un dato desactivado', () => {
  const persona = { edad: 17, constitucion: 50, salud: 100 };
  const riesgo = { perfil: () => perfilDeRiesgo(persona, 'partido'), persona: () => persona };
  const original = PARAMETROS_DE_PARTIDO.lesiones.activas;
  afterEach(() => void (PARAMETROS_DE_PARTIDO.lesiones.activas = original));

  it('el dato viene desactivado', () => {
    expect(original).toBe(false);
  });

  it('desactivadas, dar el riesgo no cambia nada: el partido es exactamente el mismo', () => {
    const o = { id: 'les-0', semilla: 6, categoria: 'cadete', cambios: CAMBIOS };
    const sin = jugarPartido(equipo('a', 30), equipo('b', 30), o);
    const con = jugarPartido(equipo('a', 30), equipo('b', 30), { ...o, lesiones: riesgo });
    expect(con).toEqual(sin);
    expect(sin.lesiones).toEqual([]);
  });

  it('activadas, un jugador de 16 a 19 años tiene en torno a un 2 % de lesionarse en 90 minutos, y el partido es el mismo hasta que alguien se lesiona', () => {
    PARAMETROS_DE_PARTIDO.lesiones.activas = true;
    let lesionados = 0;
    let jugadores = 0;
    for (let i = 0; i < 400; i++) {
      const o = { id: `les-${i}`, semilla: 7, categoria: 'juvenil', cambios: CAMBIOS };
      const r = jugarPartido(equipo('a', 30), equipo('b', 30), { ...o, lesiones: riesgo });
      lesionados += r.lesiones.length;
      jugadores += 22;
      for (const l of r.lesiones) {
        expect(r.registro.some((s) => s.tipo === 'lesion' && s.jugador === l.jugador && s.minuto === l.minuto)).toBe(true);
        expect(l.lesion.d).toBeGreaterThan(0);
        // El lesionado deja de jugar en ese minuto.
        expect(r.jugadores[l.jugador].minutos).toBeLessThanOrEqual(l.minuto);
      }
      // Hasta el primer suceso de lesión, el registro es el del partido sin lesiones.
      PARAMETROS_DE_PARTIDO.lesiones.activas = false;
      const sin = jugarPartido(equipo('a', 30), equipo('b', 30), o);
      PARAMETROS_DE_PARTIDO.lesiones.activas = true;
      const primera = r.lesiones[0]?.minuto ?? 90;
      expect(r.registro.filter((s) => s.minuto < primera)).toEqual(sin.registro.filter((s) => s.minuto < primera));
    }
    const p = lesionados / jugadores;
    expect(p).toBeGreaterThan(0.01);
    expect(p).toBeLessThan(0.045);
  });

  it('una lesión es reanudable también: parar el partido y seguir da lo mismo', () => {
    PARAMETROS_DE_PARTIDO.lesiones.activas = true;
    const a = equipo('a', 30);
    const b = equipo('b', 30);
    for (let i = 0; i < 60; i++) {
      const o = { id: `les-r-${i}`, semilla: 8, categoria: 'juvenil', cambios: CAMBIOS };
      const entero = jugarPartido(a, b, { ...o, lesiones: riesgo });
      const estado = crearPartido(a, b, o);
      avanzarPartido(estado, a, b, 50, { lesiones: riesgo });
      avanzarPartido(JSON.parse(JSON.stringify(estado)) as EstadoDePartido, a, b, 90, { lesiones: riesgo });
      const seguido = JSON.parse(JSON.stringify(estado)) as EstadoDePartido;
      avanzarPartido(seguido, a, b, 90, { lesiones: riesgo });
      expect(resultadoDelPartido(seguido, a, b)).toEqual(entero);
    }
  });
});
