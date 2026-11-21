import { describe, expect, it, vi } from 'vitest';
import { ESTADO_INICIAL, SERVICES, type JugadorDeEquipoView, type NpcDirectory } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { DATOS_FUTBOL, PARAMETROS_DE_CONVOCATORIA, PUESTOS_DE_FUTBOL, convocarYAlinear, factorDeRotacion, futbol, paraConvocar, paraConvocarElEquipo } from '@ds/mod-futbol';
import { rotaElEquipo, type NpcsState } from '@ds/mod-npcs';

vi.setConfig({ testTimeout: 480000, hookTimeout: 480000 });

/**
 * La rotación de los equipos de colegio en benjamín y alevín (decisión del usuario, 21/11/2026): las convocatorias siguen como están, pero el entrenador rota para que todos jueguen algo a lo largo de la liga: el que menos
 * ha jugado (o más lleva sin ser convocado) entra antes. Es un dato de la categoría y del tipo de club (`CategoriaDef.rotacionEn`), la misma regla para el personaje y los PNJ; en los clubes de fuera y en las demás categorías
 * no cambia nada.
 */
const GRUPOS = PUESTOS_DE_FUTBOL.reparto;

/** Una plantilla de 18 con los puestos del reparto (2 porteros, 3 centrales, 3 laterales, 4 medios, 3 de banda, 3 delanteros); `valorDe(i)` dice lo que vale cada uno (en todos los puestos de su grupo). */
function plantilla(valorDe: (i: number) => number, minutos: (i: number) => number | undefined = () => undefined, curso = 0): JugadorDeEquipoView[] {
  const js: JugadorDeEquipoView[] = [];
  let i = 0;
  for (const g of GRUPOS) {
    for (let k = 0; k < g.jugadores; k++, i++) {
      const puesto = g.puestos[k % g.puestos.length];
      const valores = Object.fromEntries(PUESTOS_DE_FUTBOL.puestos.map((p) => [p.id, GRUPOS.find((x) => x.puestos.includes(p.id))?.grupo === g.grupo ? valorDe(i) : valorDe(i) / 4]));
      const m = minutos(i);
      js.push({ id: `n${String(i).padStart(2, '0')}`, nombre: `Niño ${i}`, puesto, valores, valor: valorDe(i), estado: ESTADO_INICIAL, resiliencia: 0.5, ambicion: 0.5, asistencia: 1, disciplinaDelEntrenador: 0.5, lector: undefined as never, ...(m === undefined ? {} : { estadisticas: { curso, pj: 0, ti: 0, min: m, g: 0, a: 0, nota: 0 } }) });
    }
  }
  return js;
}

describe('el dato: qué equipos rotan', () => {
  it('benjamín y alevín dicen que rotan en los colegios; el resto de categorías, no', () => {
    const rotan = DATOS_FUTBOL.paises.espana.categorias!.filter((c) => c.rotacionEn).map((c) => [c.id, c.rotacionEn]);
    expect(rotan).toEqual([['benjamin', ['colegio']], ['alevin', ['colegio']]]);
  });

  it('el colegio rota en benjamín y alevín; en infantil y en los clubes de fuera, no', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const pob = (g.moduleState<NpcsState>('npcs') as NpcsState).poblaciones!.find((p) => p.deporte === 'futbol')!;
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    for (const [club, categoria, rota] of [['colegio', 'benjamin', true], ['colegio', 'alevin', true], ['colegio', 'infantil', false], ['colegio', 'juvenil', false], ['club_grande', 'benjamin', false], ['club_grande', 'alevin', false], ['club_pequeno', 'benjamin', false]] as const) {
      expect(rotaElEquipo([pob], 'futbol', club, categoria), `${club} ${categoria}`).toBe(rota);
      expect(dir.rotaElEquipo!('futbol', club, categoria), `${club} ${categoria} (servicio)`).toBe(rota);
    }
    // Un deporte sin esa categoría o sin ese club no rota.
    expect(rotaElEquipo([pob], 'futbol', 'no_existe', 'benjamin')).toBe(false);
    expect(rotaElEquipo([pob], 'futbol', 'colegio', 'no_existe')).toBe(false);
  });
});

describe('la regla de la rotación (pura)', () => {
  it('el factor sube de 1 a 1 + peso con lo poco que ha jugado frente a la media, y no baja de 1', () => {
    const peso = PARAMETROS_DE_CONVOCATORIA.rotacion.peso;
    expect(factorDeRotacion(0, 0)).toBe(1);
    expect(factorDeRotacion(500, 0)).toBe(1);
    expect(factorDeRotacion(0, 400)).toBeCloseTo(1 + peso, 10);
    expect(factorDeRotacion(200, 400)).toBeCloseTo(1 + peso / 2, 10);
    expect(factorDeRotacion(400, 400)).toBe(1);
    expect(factorDeRotacion(900, 400)).toBe(1);
  });

  it('sin rotación, la preferencia es la de siempre; con ella, solo suben los que han jugado menos que la media, y los minutos de otro curso no cuentan', () => {
    const p = plantilla(() => 12, (i) => (i < 9 ? 900 : 100));
    expect(paraConvocarElEquipo(p).map((j) => j.prioridad)).toEqual(p.map((j) => paraConvocar(j).prioridad));
    const con = paraConvocarElEquipo(p, { rotar: { curso: 0 } });
    const media = (9 * 900 + 9 * 100) / 18;
    expect(con[0].prioridad).toBeCloseTo(1, 10);
    expect(con[17].prioridad).toBeCloseTo(factorDeRotacion(100, media), 10);
    expect(con[17].prioridad!).toBeGreaterThan(1);
    // Con las estadísticas del curso anterior (a efectos de la rotación, nadie ha jugado este curso): todos igual.
    expect(paraConvocarElEquipo(p, { rotar: { curso: 1 } }).every((j) => j.prioridad === paraConvocar(p[0]).prioridad)).toBe(true);
  });

  it('el peor de la plantilla, que sin rotar no es convocado nunca, juega a lo largo de la liga y nadie se queda sin minutos', () => {
    // 18 niños; el 17 (un delantero) vale 8 frente a los 12-13 de los demás (con el peso de la rotación, ×1,6 sin haber jugado, llega a quien vale más de un 62 % de lo que vale el resto) y sobran 2 sin convocar cada semana. Cada semana el entrenador convoca a 16 y los suplentes juegan 30 minutos, los titulares 90.
    const valor = (i: number) => (i === 17 ? 8 : 12 + (i % 5) * 0.2);
    const liga = (rotar: boolean) => {
      const minutos = new Array<number>(18).fill(0);
      const convocado = new Array<number>(18).fill(0);
      for (let semana = 0; semana < 18; semana++) {
        const p = plantilla(valor, (i) => minutos[i]);
        const c = convocarYAlinear(paraConvocarElEquipo(p, rotar ? { rotar: { curso: 0 } } : {}));
        const idx = (id: string) => Number(id.slice(1));
        for (const t of c.titulares) { minutos[idx(t.id)] += 90; convocado[idx(t.id)]++; }
        for (const s of c.suplentes) { minutos[idx(s.id)] += 30; convocado[idx(s.id)]++; }
      }
      return { minutos, convocado };
    };
    const sin = liga(false);
    const con = liga(true);
    expect(sin.minutos[17], 'sin rotación, el peor no juega nunca').toBe(0);
    expect(con.minutos[17], 'con rotación juega').toBeGreaterThan(0);
    expect(con.convocado[17]).toBeGreaterThanOrEqual(3);
    expect(Math.min(...con.minutos), 'nadie se queda sin jugar').toBeGreaterThan(0);
    // Y el reparto es más parejo que sin rotar.
    const desviacion = (xs: number[]) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length); };
    expect(desviacion(con.minutos)).toBeLessThan(desviacion(sin.minutos));
  });

  it('el que lleva muchos partidos sin ser convocado (y por eso con menos minutos) entra antes que uno parecido que juega a menudo', () => {
    // Todos valen lo mismo salvo lo que ha jugado cada uno: el 16 y el 17 no han jugado nada y los demás, mucho.
    const p = plantilla(() => 12, (i) => (i >= 16 ? 0 : 1200));
    const sin = convocarYAlinear(paraConvocarElEquipo(p));
    const con = convocarYAlinear(paraConvocarElEquipo(p, { rotar: { curso: 0 } }));
    const citados = (c: ReturnType<typeof convocarYAlinear>) => new Set([...c.titulares, ...c.suplentes].map((x) => x.id));
    expect(citados(con).has('n16') && citados(con).has('n17')).toBe(true);
    expect(citados(sin).size).toBe(16);
    expect(citados(con).size).toBe(16);
  });
});

describe('en una temporada con la ciudad de prueba', () => {
  it('en los equipos de colegio de benjamín y alevín juegan todos (la rotación); la misma regla para quien va a entrenar', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 40, 0, 9);
    const dir = g.service<NpcDirectory>(SERVICES.npcs)!;
    const pob = (g.moduleState<NpcsState>('npcs') as NpcsState).poblaciones!.find((p) => p.deporte === 'futbol')!;
    let colegio = 0, sinJugar = 0;
    for (const categoria of ['benjamin', 'alevin']) {
      for (const letra of ['A', 'B', 'C', 'D']) {
        const pl = dir.plantillaDelEquipo!('futbol', 'colegio', categoria, letra);
        if (pl.length < 14) continue;
        expect(rotaElEquipo([pob], 'futbol', 'colegio', categoria)).toBe(true);
        for (const j of pl) {
          if (j.estado.baja) continue;
          colegio++;
          if ((j.estadisticas?.min ?? 0) === 0) sinJugar++;
        }
      }
    }
    expect(colegio).toBeGreaterThan(14);
    expect(sinJugar, `${sinJugar} de ${colegio} sin un minuto`).toBeLessThanOrEqual(Math.floor(colegio * 0.05));
  });
});
