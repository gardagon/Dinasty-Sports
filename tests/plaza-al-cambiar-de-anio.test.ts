import { describe, expect, it, vi } from 'vitest';
import { SERVICES, SHARED_EVENTS, defineModule, type ClubDirectory, type NpcDirectory, type SucesosService } from '@ds/contracts';
import { idDeElegir } from '@ds/mod-sucesos';
import { advanceToWeek } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { PUESTOS_DE_FUTBOL, futbol } from '@ds/mod-futbol';
import { CATEGORIAS_ESPANA } from '../modules/futbol/src/datos';
import { repartirEnEquipos, type MiembroDeClub } from '../modules/npcs/src/equipos';
import { hacer } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * La plaza al cambiar de año (decisión del usuario, 22/11/2026): en benjamín y alevín los de primer año no desplazan a uno de segundo que ya tenía plaza en el club; desde infantil se puede salir, y la salida del
 * personaje es un suceso con opciones (su entrenador se lo dice), no una línea del diario.
 */
const P = PUESTOS_DE_FUTBOL;
const DELANTERO = P.reparto.find((r) => r.grupo === 'delantero' || r.puestos.includes('ST') || r.puestos.includes('RST'))!.puestos[0];

/** Un A completo de segundo año más un primer año muy bueno: con la regla, el primero no le quita el sitio al de segundo año que vale menos. */
function conUnSegundoFlojo(): MiembroDeClub[] {
  const puestos = ['GK', 'GK', 'CB', 'CB', 'CB', 'RB', 'LB', 'RCR', 'RCR', 'RCR', 'RCR', 'RW', 'LW', DELANTERO, DELANTERO, DELANTERO, DELANTERO].map((p) => p);
  const segundos: MiembroDeClub[] = puestos.map((puesto, i) => ({ id: `s${String(i).padStart(2, '0')}`, puesto, valor: 14 - i * 0.1, anio: 2 }));
  // El de segundo año que menos vale (un delantero de más) y 16 de primer año, uno de ellos mucho mejor.
  const flojo: MiembroDeClub = { id: 'flojo', puesto: DELANTERO, valor: 5, anio: 2 };
  const primeros: MiembroDeClub[] = Array.from({ length: 16 }, (_, i) => ({ id: `p${String(i).padStart(2, '0')}`, puesto: puestos[i % puestos.length], valor: 11 - i * 0.1, anio: 1 }));
  primeros.push({ id: 'estrella', puesto: DELANTERO, valor: 40, anio: 1 });
  return [...segundos, flojo, ...primeros];
}

describe('el reparto en equipos con «los de primer año no desplazan»', () => {
  it('sin la regla, el primer año que destaca le quita el sitio al de segundo año que vale menos; con ella, no', () => {
    const m = conUnSegundoFlojo();
    const sin = repartirEnEquipos(m, P, 2, 18, true, 0, 14, false);
    const con = repartirEnEquipos(m, P, 2, 18, true, 0, 14, true);
    expect(sin.A).toContain('estrella');
    expect(sin.sobran.length + sin.B.length, 'sin la regla, el flojo no cabe en el A').toBeGreaterThan(0);
    expect(sin.A).not.toContain('flojo');
    expect(con.A, 'con la regla, el de segundo año del club conserva su plaza').toContain('flojo');
    // Los de segundo año del club siguen en el A mientras quepan (18 como máximo); a la estrella solo le toca el sitio que queda.
    expect(con.A.filter((id) => id.startsWith('s') || id === 'flojo').length).toBe(18);
    expect(con.A).not.toContain('estrella');
    expect(con.A.length).toBeLessThanOrEqual(18);
  });

  it('con sitio libre en el A, los de primer año que destacan siguen subiendo', () => {
    const m = conUnSegundoFlojo().filter((x) => x.anio === 1 || ['s00', 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12', 's13', 'flojo'].includes(x.id));
    const con = repartirEnEquipos(m, P, 2, 18, true, 0, 14, true);
    expect(con.A).toContain('flojo');
    expect(con.A).toContain('estrella');
  });

  it('es un dato de la categoría: benjamín y alevín, sí; infantil y las demás, no', () => {
    const por = (id: string) => CATEGORIAS_ESPANA.find((c) => c.id === id)?.primerAnioNoDesplazaEn;
    expect(por('benjamin')).toEqual(expect.arrayContaining(['colegio', 'club']));
    expect(por('alevin')).toEqual(expect.arrayContaining(['colegio', 'club']));
    for (const id of ['infantil', 'cadete', 'juvenil']) expect(por(id), id).toBeUndefined();
  });
});

describe('la salida del personaje por perder la plaza', () => {
  const avisa = (data: Record<string, unknown>) =>
    defineModule<Record<string, never>>({
      id: 'avisa',
      name: 'Aviso',
      dependsOn: ['gen'],
      initState: () => ({}),
      actions: [{ id: 'avisa.perdida', name: 'Perder la plaza', tags: [], duration: 1, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.PLAZA_PERDIDA, data }) }],
    });

  it('sale del club y su entrenador se lo cuenta con un suceso con opciones (otro club con la fecha de las pruebas, entrenar por su cuenta…)', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol, avisa({ sport: 'futbol', clubId: 'colegio', participants: [{ npcId: 'entrenador' }], plazoHasta: 'el lunes 14 de septiembre' })]);
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    expect(g.perform('avisa.perdida').ok).toBe(true);
    expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol'), 'sale del club').toBeUndefined();
    const p = g.service<SucesosService>(SERVICES.sucesos)!.pendientes().find((x) => x.suceso === 'futbol.plaza_perdida');
    expect(p, 'le llega el suceso').toBeDefined();
    expect(p!.texto).toMatch(/hasta el lunes 14 de septiembre/);
    expect(p!.texto).not.toMatch(/\{[^}]+\}/); // sin marcas sin resolver
    expect(p!.opciones.map((o) => o.id)).toEqual(expect.arrayContaining(['buscar_club', 'por_mi_cuenta']));
    expect(g.log.some((l) => /Un jugador que vale más ha ocupado tu plaza/.test(l.text)), 'ya no es una línea del diario').toBe(false);
  });

  it('el caso de la semilla 31 (ciudad grande, benjamín B sin entrenar): al pasar a segundo año sigue en el club', async () => {
    const { PAIS_CIUDAD_GRANDE, registrarPais } = await import('@ds/contracts');
    registrarPais(PAIS_CIUDAD_GRANDE);
    const g = nuevaPartida({ seed: 31, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 0, 2, 9);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    advanceToWeek(g, 'gen.descansar', 52 + 2, 2, 15);
    expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol'), 'sigue en el club del colegio').toBeDefined();
  });

  it('«buscar otro club» dice qué clubes hacen pruebas y hasta cuándo, y deja a mano «Pedir hacer una prueba…»', () => {
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol, avisa({ sport: 'futbol', clubId: 'colegio', participants: [{ npcId: 'entrenador' }], plazoHasta: 'el lunes 14 de septiembre', clubes: 'Real Ciudad C. F. y Unión Deportiva del Barrio' })]);
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    expect(g.perform('avisa.perdida').ok).toBe(true);
    const p = g.service<SucesosService>(SERVICES.sucesos)!.pendientes().find((x) => x.suceso === 'futbol.plaza_perdida')!;
    expect(g.perform(idDeElegir(p.id, 'buscar_club')).ok).toBe(true);
    const texto = g.log.map((l) => l.text).join('\n');
    expect(texto).toMatch(/Hacen pruebas Real Ciudad C\. F\. y Unión Deportiva del Barrio, hasta el lunes 14 de septiembre/);
    expect(texto).toMatch(/Pedir hacer una prueba/);
    // La acción está en su lista (en el desplegable «Prueba de acceso…»), no solo en el texto.
    expect(g.preview('futbol.pedir_prueba.club_grande')).toBeDefined();
  });
});

describe('el personaje que se apunta tiene equipo, y el que acaba la última categoría recibe aviso', () => {
  it('semilla 33 de la ciudad grande: o se puede apuntar y acaba en un equipo, o la acción dice por qué no', async () => {
    const { PAIS_CIUDAD_GRANDE, registrarPais } = await import('@ds/contracts');
    registrarPais(PAIS_CIUDAD_GRANDE);
    const g = nuevaPartida({ seed: 33, pais: PAIS_CIUDAD_GRANDE.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
    advanceToWeek(g, 'gen.descansar', 0, 2, 9);
    const vista = g.preview('futbol.apuntarse_colegio')!;
    if (vista.available) {
      expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
      expect(g.service<NpcDirectory>(SERVICES.npcs)!.equipoDelPersonaje?.('futbol'), 'si entra en el club, tiene equipo').toBeDefined();
    } else {
      expect(vista.reason ?? '').toMatch(/no queda sitio|completo/);
      expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol')).toBeUndefined();
    }
  });

  it('al acabar el fútbol base (sin categoría a su edad) le llega el suceso «se acaba el fútbol base» y sale del club', () => {
    const avisa = defineModule<Record<string, never>>({
      id: 'avisa',
      name: 'Aviso',
      dependsOn: ['gen'],
      initState: () => ({}),
      actions: [{ id: 'avisa.fin', name: 'Fin del fútbol base', tags: [], duration: 1, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.EQUIPO_SIN_NINOS, data: { sport: 'futbol', clubId: 'colegio', motivo: 'fin_de_categorias' } }) }],
    });
    const g = nuevaPartida({ seed: 31, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol, avisa]);
    advanceToWeek(g, 'gen.descansar', 1, 2, 15);
    expect(hacer(g, 'futbol.apuntarse_colegio').ok).toBe(true);
    expect(g.perform('avisa.fin').ok).toBe(true);
    expect(g.service<ClubDirectory>(SERVICES.clubes)!.membership('futbol')).toBeUndefined();
    const p = g.service<SucesosService>(SERVICES.sucesos)!.pendientes().find((x) => x.suceso === 'futbol.equipo_sin_ninos');
    expect(p!.texto).toMatch(/se acaba el fútbol base en tu club/);
  });
});
