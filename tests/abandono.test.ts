import { describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, registrarPais } from '@ds/contracts';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { DATOS_FUTBOL, futbol } from '@ds/mod-futbol';
import { edadNpc, type NpcsState } from '@ds/mod-npcs';
import { baseDelAbandono, dejaElDeporte, motivosDeAbandono, probabilidadDeAbandonar, type DatosDelDeportista } from '../modules/npcs/src/abandono';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });
registrarPais(PAIS_CIUDAD_DE_PRUEBA);

/**
 * El abandono por edad (`CIUDAD_Y_LIGAS.md` §11, decisión del usuario del 07/11): cada verano cada deportista decide si sigue; la probabilidad de dejarlo sube con la edad (sobre todo desde cadete) y pesan el
 * interés, la ambición, los minutos, los estudios (4.º de la ESO y bachillerato) y los padres.
 */
const D = DATOS_FUTBOL.paises.espana.poblacion.reclutamiento.abandono!;
const rasgos = (interes: number, ambicion = 0, estudio = 0) => ({ origen: 'x', apariencia: {}, caracter: { ambicion }, intereses: { futbol: interes, estudio }, gustos: {} }) as unknown as DatosDelDeportista['rasgos'];
const normal = (edad: number, o: Partial<DatosDelDeportista> = {}): DatosDelDeportista => ({ edad, rasgos: rasgos(2), titular: true, padres: { padre: 'aficionado', madre: 'aficionado' }, ...o });

describe('la probabilidad de dejarlo sube con la edad, sobre todo desde cadete', () => {
  it('la base crece con la edad y es la del dato', () => {
    expect(baseDelAbandono(D, 8)).toBe(D.baseDeLaEdad[8]);
    expect(baseDelAbandono(D, 12)).toBe(D.baseDeLaEdad[8]);
    expect(baseDelAbandono(D, 15)).toBe(D.baseDeLaEdad[15]);
    expect(baseDelAbandono(D, 19)).toBe(D.baseDeLaEdad[18]);
    const ps = [10, 13, 14, 15, 16, 17, 18].map((e) => probabilidadDeAbandonar(D, normal(e), 'futbol'));
    expect(ps).toEqual([...ps].sort((a, b) => a - b));
    expect(ps[5]).toBeGreaterThan(2 * ps[1]); // a los 17 mucho más que a los 13
  });
});

describe('los motivos pesan', () => {
  const p = (o: Partial<DatosDelDeportista>, edad = 16) => probabilidadDeAbandonar(D, normal(edad, o), 'futbol');
  it('menos interés, más probabilidad de dejarlo', () => expect(p({ rasgos: rasgos(0) })).toBeGreaterThan(p({ rasgos: rasgos(3) })));
  it('el ambicioso sigue más', () => expect(p({ rasgos: rasgos(2, 50) })).toBeLessThan(p({ rasgos: rasgos(2, -50) })));
  it('el suplente lo deja más que el titular', () => expect(p({ titular: false })).toBeGreaterThan(p({ titular: true })));
  it('los padres deportistas lo animan a seguir', () => expect(p({ padres: { padre: 'profesional', madre: 'federado' } })).toBeLessThan(p({ padres: { padre: 'ninguna', madre: 'ninguna' } })));
  it('los estudios pesan más en 4.º de la ESO y bachillerato, y más en quien le interesa estudiar', () => {
    const estudioso = rasgos(2, 0, 3);
    expect(p({ rasgos: estudioso }, 17)).toBeGreaterThan(p({ rasgos: rasgos(2, 0, 0) }, 17));
    // La subida por los estudios a los 17 es mayor que a los 14 (sin presión).
    const subida = (edad: number) => p({ rasgos: estudioso }, edad) / p({ rasgos: rasgos(2, 0, 0) }, edad);
    expect(subida(17)).toBeGreaterThan(subida(14));
    expect(subida(14)).toBeCloseTo(1, 5);
  });
  it('el personaje ve los mismos motivos, con su texto', () => {
    const motivos = motivosDeAbandono(D, normal(16, { titular: false }), 'futbol');
    expect(motivos.map((m) => m.id).sort()).toEqual(['ambicion', 'estudios', 'interes', 'minutos', 'padres']);
    expect(motivos.every((m) => m.texto.length > 5 && Math.abs(m.fuerza) <= 1)).toBe(true);
    expect(motivos.find((m) => m.id === 'minutos')!.texto).toContain('pocos minutos');
    // Sin saber si fue titular, ese motivo no aparece.
    expect(motivosDeAbandono(D, { edad: 16 }, 'futbol').some((m) => m.id === 'minutos')).toBe(false);
  });
  it('la decisión es un sorteo estable suyo: preguntar dos veces el mismo verano da lo mismo', () => {
    const a = dejaElDeporte(D, normal(17, { rasgos: rasgos(0) }), 'futbol', 31, 'nino_7', 2);
    expect(dejaElDeporte(D, normal(17, { rasgos: rasgos(0) }), 'futbol', 31, 'nino_7', 2)).toBe(a);
  });
});

describe('en el mundo, cada verano lo dejan más los mayores', () => {
  it('de los futbolistas de 16 a 18 años que había antes del verano, lo dejan proporcionalmente más que de los de 10 a 12', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    const jugadores = () => (g.moduleState<NpcsState>('npcs') as NpcsState).npcs.filter((n) => n.genetica);
    const antes = new Map(jugadores().filter((n) => n.deporte === 'futbol').map((n) => [n.id, edadNpc(n, 0) ?? 0]));
    advanceToWeek(g, 'gen.descansar', 52 + 2, 2, 15);
    const dejados = new Set(jugadores().filter((n) => n.dejado?.includes('futbol') && n.deporte === undefined).map((n) => n.id));
    const tasa = (min: number, max: number) => {
      const ids = [...antes].filter(([, e]) => e >= min && e <= max).map(([id]) => id);
      return ids.filter((id) => dejados.has(id)).length / Math.max(1, ids.length);
    };
    expect(tasa(16, 18)).toBeGreaterThan(tasa(10, 12));
  });
});
