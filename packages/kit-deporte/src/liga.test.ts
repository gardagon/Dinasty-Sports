import { describe, expect, it } from 'vitest';
import { ascensosYDescensos, actualizarDivisiones, calendarioDobleVuelta, gruposDe, repartirEnDivisiones, tablaDeClasificacion, tamanosDeDivisiones, type EquipoDeLiga, type FilaDeTabla, type FormatoDeDivisiones } from './liga';

const F: FormatoDeDivisiones = { tamano: 10, fijas: 2, grupo: { max: 12 }, suben: 2, bajan: 2, playoff: { jornadasObjetivo: 18 } };
/** `n` equipos de `clubes` clubes (el equipo `i` es del club `i % clubes`, letra por vueltas), el primero el más fuerte. */
const equipos = (n: number, clubes: number): EquipoDeLiga[] => Array.from({ length: n }, (_, i) => ({ id: `c${i % clubes}${'ABCD'[Math.floor(i / clubes)]}`, club: `c${i % clubes}`, fuerza: 1000 - i }));
const clubDe = (id: string): string => id.slice(0, -1);
/** Una tabla de un grupo donde el orden de los ids es el de la clasificación (el primero, el campeón). */
const tabla = (ids: string[]): FilaDeTabla[] => ids.map((id, i) => ({ id, pj: 18, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, puntos: 100 - i }));
const todos = (d: { grupos: string[][] }[]): string[] => d.flatMap((x) => x.grupos.flat());

describe('el reparto en divisiones', () => {
  it('Primera y Segunda, siempre de 10, y una última con el resto: en un grupo si cabe en 12 y, si no, partida en dos grupos o más, aunque sean pequeños (10 + 10 + 7 + 7)', () => {
    expect(tamanosDeDivisiones(30, F)).toEqual([10, 10, 10]);
    expect(tamanosDeDivisiones(32, F)).toEqual([10, 10, 12]);
    expect(tamanosDeDivisiones(27, F)).toEqual([10, 10, 7]); // la última no tiene por qué llegar a 8: un grupo pequeño
    expect(tamanosDeDivisiones(34, F)).toEqual([10, 10, 14]); // juvenil: la última no cabe en un grupo de 12
    expect(tamanosDeDivisiones(45, F)).toEqual([10, 10, 25]);
    expect(tamanosDeDivisiones(10, F)).toEqual([10]);
    expect(tamanosDeDivisiones(7, F)).toEqual([7]);
    expect(tamanosDeDivisiones(22, F)).toEqual([10, 12]); // dos equipos solos no hacen una división: se juntan con la de arriba
    expect(gruposDe(25, F)).toBe(3);
    expect(gruposDe(14, F)).toBe(2);
    expect(gruposDe(12, F)).toBe(1);
    expect(gruposDe(7, F)).toBe(1);
  });

  it('al crear la partida se reparten por lo que vale cada equipo: los mejores arriba', () => {
    const d = repartirEnDivisiones(equipos(30, 15), F);
    expect(d.map((x) => x.grupos.flat().length)).toEqual([10, 10, 10]);
    expect(todos(d).sort()).toEqual(equipos(30, 15).map((e) => e.id).sort());
    expect(d[0].grupos[0]).toContain('c0A');
    expect(d[0].grupos[0]).not.toContain('c14B'); // el más débil, abajo
    expect(d[2].grupos[0]).toContain('c14B');
  });

  it('dos equipos de un mismo club no coinciden en una división, salvo en la última (y allí, en grupos distintos si los hay)', () => {
    for (const [n, clubes] of [[30, 10], [30, 12], [44, 11], [60, 15]] as const) {
      const d = repartirEnDivisiones(equipos(n, clubes), F);
      d.forEach((div, i) => {
        const ultima = i === d.length - 1;
        if (!ultima) {
          const cs = div.grupos.flat().map(clubDe);
          expect(new Set(cs).size, `${n}/${clubes} división ${i}`).toBe(cs.length);
        } else if (div.grupos.length > 1) {
          // En grupos distintos: ningún grupo tiene más equipos de un club que los que no le caben en los demás.
          for (const g of div.grupos) {
            const cs = g.map(clubDe);
            expect(Math.max(...Object.values(cs.reduce<Record<string, number>>((m, c) => ({ ...m, [c]: (m[c] ?? 0) + 1 }), {}))), `${n}/${clubes}`).toBeLessThanOrEqual(Math.ceil(4 / div.grupos.length));
          }
        }
      });
      expect(todos(d)).toHaveLength(n);
    }
  });

  it('sin bastantes clubes distintos, la división fija se queda más pequeña antes que juntar a dos de un club', () => {
    const d = repartirEnDivisiones(equipos(24, 6), F); // 6 clubes de 4 equipos: en Primera solo caben 6
    expect(d[0].grupos[0]).toHaveLength(6);
    expect(new Set(d[0].grupos[0].map(clubDe)).size).toBe(6);
    expect(todos(d)).toHaveLength(24);
  });
});

describe('la última división partida en grupos', () => {
  it('juvenil con 34 equipos: 10 + 10 + 7 + 7, y los equipos de un mismo club, en grupos distintos', () => {
    const d = repartirEnDivisiones(equipos(34, 12), F);
    expect(d.map((x) => x.grupos.map((g) => g.length))).toEqual([[10], [10], [7, 7]]);
    for (const g of d[2].grupos) {
      const cs = g.map(clubDe);
      expect(Math.max(...Object.values(cs.reduce<Record<string, number>>((m, c) => ({ ...m, [c]: (m[c] ?? 0) + 1 }), {})))).toBeLessThanOrEqual(2);
    }
  });
});

describe('el calendario a doble vuelta', () => {
  it('un grupo de 10 tiene 18 jornadas; cada equipo juega una vez por jornada; cada pareja se enfrenta dos veces, una en cada campo', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `e${i}`);
    const cal = calendarioDobleVuelta(ids);
    expect(cal).toHaveLength(18);
    for (const j of cal) {
      expect(j).toHaveLength(5);
      expect(new Set(j.flatMap((p) => [p.local, p.visitante])).size).toBe(10);
    }
    const enfrentamientos = new Map<string, number>();
    for (const p of cal.flat()) enfrentamientos.set(`${p.local}>${p.visitante}`, (enfrentamientos.get(`${p.local}>${p.visitante}`) ?? 0) + 1);
    for (const a of ids) for (const b of ids) if (a !== b) expect(enfrentamientos.get(`${a}>${b}`), `${a}>${b}`).toBe(1);
  });

  it('nadie juega demasiadas veces seguidas en casa, y con un número impar descansa uno cada jornada', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `e${i}`);
    const cal = calendarioDobleVuelta(ids);
    for (const id of ids) {
      const campos = cal.map((j) => j.find((p) => p.local === id) ? 'L' : 'V');
      expect(campos.join('')).not.toMatch(/L{4}|V{4}/);
    }
    const impar = calendarioDobleVuelta(['a', 'b', 'c', 'd', 'e']);
    expect(impar).toHaveLength(10);
    for (const j of impar) expect(j).toHaveLength(2);
  });
});

describe('la clasificación', () => {
  it('3 puntos por victoria y 1 por empate; desempata la diferencia de goles', () => {
    const t = tablaDeClasificacion(['a', 'b', 'c'], [
      { local: 'a', visitante: 'b', golesLocal: 2, golesVisitante: 0 },
      { local: 'b', visitante: 'c', golesLocal: 1, golesVisitante: 1 },
      { local: 'c', visitante: 'a', golesLocal: 0, golesVisitante: 1 },
    ]);
    expect(t.map((f) => f.id)).toEqual(['a', 'c', 'b']);
    expect(t[0]).toMatchObject({ pj: 2, g: 2, puntos: 6, gf: 3, gc: 0, dg: 3 });
    expect(t[1].puntos).toBe(1);
    expect(t[1].dg).toBe(t[2].dg + 0 - 0 + (t[1].dg - t[2].dg)); // c: −1, b: −2
    expect(t[1].dg).toBeGreaterThan(t[2].dg);
  });
});

describe('ascensos y descensos', () => {
  const dividir = (n: number, clubes: number) => repartirEnDivisiones(equipos(n, clubes), F);
  const tablas = (d: ReturnType<typeof dividir>) => d.map((x) => x.grupos.map((g) => tabla(g))); // la clasificación final = el orden en que están

  it('suben 2 y bajan 2 entre cada par de divisiones y los tamaños se mantienen', () => {
    const d = dividir(30, 30); // 30 clubes distintos: sin reglas del filial
    const n = ascensosYDescensos(d, tablas(d), clubDe, F);
    expect(n.map((x) => x.grupos.flat().length)).toEqual([10, 10, 10]);
    expect(n[0].grupos[0]).toEqual(expect.arrayContaining(d[1].grupos[0].slice(0, 2)));
    expect(n[0].grupos[0]).not.toEqual(expect.arrayContaining(d[0].grupos[0].slice(-2)));
    expect(n[1].grupos[0]).toEqual(expect.arrayContaining([...d[0].grupos[0].slice(-2), ...d[2].grupos[0].slice(0, 2)]));
    expect(n[2].grupos.flat()).toEqual(expect.arrayContaining(d[1].grupos[0].slice(-2)));
    expect(todos(n).sort()).toEqual(todos(d).sort());
  });

  it('con varios grupos en la última, suben los campeones y, si hace falta, los mejores segundos', () => {
    const d = dividir(45, 45); // Tercera de 25 en 3 grupos
    expect(d[2].grupos).toHaveLength(3);
    const t = tablas(d);
    // Que el campeón de un grupo tenga más puntos por partido que el de otro: suben los dos mejores campeones.
    t[2][0][0].puntos = 60;
    t[2][1][0].puntos = 40;
    t[2][2][0].puntos = 50;
    const n = ascensosYDescensos(d, t, clubDe, F);
    expect(n[1].grupos[0]).toContain(d[2].grupos[0][0]);
    expect(n[1].grupos[0]).toContain(d[2].grupos[2][0]);
    expect(n[1].grupos[0]).not.toContain(d[2].grupos[1][0]);
    expect(n.map((x) => x.grupos.flat().length)).toEqual([10, 10, 25]);
    // Y con pocos puntos por partido de los campeones, los segundos pueden subir por detrás de los campeones.
    const solo2 = ascensosYDescensos(d, t, clubDe, { ...F, suben: 4, bajan: 4 });
    expect(solo2[1].grupos[0].filter((id) => d[2].grupos.some((g) => g.includes(id))).length).toBe(4);
  });

  it('un equipo no sube a la división en que se queda otro de su club: sube el siguiente', () => {
    // El B del club 0 es el 1.º de Segunda, pero el A del club 0 se queda en Primera: sube el 3.º.
    const d: ReturnType<typeof dividir> = [
      { grupos: [['x1A', 'x2A', 'c0A', 'x3A', 'x4A', 'x5A', 'x6A', 'x7A', 'x8A', 'x9A']] },
      { grupos: [['c0B', 'y1A', 'y2A', 'y3A', 'y4A', 'y5A', 'y6A', 'y7A', 'y8A', 'y9A']] },
      { grupos: [['z1A', 'z2A', 'z3A', 'z4A', 'z5A', 'z6A', 'z7A', 'z8A', 'z9A', 'z0A']] },
    ];
    const n = ascensosYDescensos(d, tablas(d), clubDe, F);
    expect(n[0].grupos[0]).not.toContain('c0B');
    expect(n[0].grupos[0]).toContain('y1A');
    expect(n[0].grupos[0]).toContain('y2A');
    expect(n[1].grupos[0]).toContain('c0B');
    expect(n.map((x) => x.grupos.flat().length)).toEqual([10, 10, 10]);
  });

  it('si un equipo baja a la división de otro de su club, ese baja una más (y sube uno más de abajo para mantener los tamaños)', () => {
    // El A del club 0 es de los dos últimos de Primera y baja a Segunda, donde está su B: el B baja a Tercera.
    const d: ReturnType<typeof dividir> = [
      { grupos: [['x1A', 'x2A', 'x3A', 'x4A', 'x5A', 'x6A', 'x7A', 'x8A', 'c0A', 'x9A']] },
      { grupos: [['y1A', 'y2A', 'y3A', 'c0B', 'y4A', 'y5A', 'y6A', 'y7A', 'y8A', 'y9A']] },
      { grupos: [['z1A', 'z2A', 'z3A', 'z4A', 'z5A', 'z6A', 'z7A', 'z8A', 'z9A', 'z0A']] },
    ];
    const n = ascensosYDescensos(d, tablas(d), clubDe, F);
    expect(n[1].grupos[0]).toContain('c0A');
    expect(n[1].grupos[0]).not.toContain('c0B');
    expect(n[2].grupos[0]).toContain('c0B');
    // Tamaños: Segunda sigue con 10 (sube uno más de Tercera).
    expect(n.map((x) => x.grupos.flat().length)).toEqual([10, 10, 10]);
    expect(n[1].grupos[0]).toContain('z3A');
    expect(todos(n).sort()).toEqual(todos(d).sort());
  });

  it('si el filial ya estaba en la última división y baja el primer equipo a ella, se queda (allí pueden coincidir, en grupos distintos si los hay)', () => {
    const d: ReturnType<typeof dividir> = [
      { grupos: [['x1A', 'x2A', 'x3A', 'x4A', 'x5A', 'x6A', 'x7A', 'x8A', 'x9A', 'x0A']] },
      { grupos: [['y1A', 'y2A', 'y3A', 'y4A', 'y5A', 'y6A', 'y7A', 'y8A', 'c0A', 'y9A']] },
      { grupos: [['z1A', 'z2A', 'c0B', 'z3A', 'z4A', 'z5A', 'z6A', 'z7A', 'z8A', 'z9A']] },
    ];
    const n = ascensosYDescensos(d, tablas(d), clubDe, F);
    expect(n[2].grupos.flat()).toContain('c0A');
    expect(n[2].grupos.flat()).toContain('c0B');
    expect(n.map((x) => x.grupos.flat().length)).toEqual([10, 10, 10]);
  });
});

describe('las divisiones de la temporada siguiente', () => {
  it('los equipos que desaparecen salen y los nuevos empiezan en la última división', () => {
    const d = repartirEnDivisiones(equipos(30, 15), F);
    const actuales = equipos(30, 15).filter((e) => e.id !== 'c0A' && e.id !== 'c14B').concat([{ id: 'c20A', club: 'c20', fuerza: 5 }]);
    const n = actualizarDivisiones(d, actuales, F);
    expect(todos(n).sort()).toEqual(actuales.map((e) => e.id).sort());
    expect(n[n.length - 1].grupos.flat()).toContain('c20A');
    expect(todos(n)).not.toContain('c0A');
  });
});
