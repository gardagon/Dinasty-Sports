import { describe, expect, it, vi } from 'vitest';
import { PAIS_CIUDAD_DE_PRUEBA, SERVICES, registrarPais, servicioDeConversacion, type ConversacionService, type NpcDirectory, type RelationsService } from '@ds/contracts';
import type { Game } from '@ds/core';
import { MODULOS, nuevaPartida } from '@ds/game';
import { futbol, type FutbolState } from '@ds/mod-futbol';
import { hacer, posible } from './ayudas';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * Pedirle a tu entrenador jugar en otro puesto, desde su ficha: el servicio de conversación (el desplegable), la acción que no sale en la lista general y el suceso con su tirada.
 * La tirada y sus cifras (relación y valer más en el puesto pedido): `tests/eventos-primeros.test.ts` y `packages/contracts/src/sucesos`.
 */
const esperar = (g: Game): void => {
  if (!g.perform('gen.esperar').ok) throw new Error('No se puede esperar');
};

/** Una partida con el personaje ya en el club del colegio y su entrenador delante (en su sede, fuera de la sesión), listo para hablarle. */
function conEntrenador(): { g: Game; entrenador: string } {
  registrarPais(PAIS_CIUDAD_DE_PRUEBA);
  const g = nuevaPartida({ seed: 31, pais: PAIS_CIUDAD_DE_PRUEBA.id, deportes: ['atletismo', 'futbol'] }, [...MODULOS, futbol]);
  for (let k = 0; k < 6000 && !posible(g, 'futbol.pedir_consejo'); k++) {
    if (posible(g, 'futbol.apuntarse_colegio')) hacer(g, 'futbol.apuntarse_colegio');
    else if (!g.perform('gen.descansar').ok) esperar(g);
  }
  const entrenador = g.service<NpcDirectory>(SERVICES.npcs)!.list({ role: 'entrenador', known: true }).find((n) => n.club === 'colegio')!;
  return { g, entrenador: entrenador.id };
}

describe('pedirle a tu entrenador jugar en otro puesto', () => {
  it('en la ficha de tu entrenador sale «Pedir jugar…» con los demás puestos; en la de nadie más, y no hay una acción por puesto en la lista general', () => {
    const { g, entrenador } = conEntrenador();
    expect(posible(g, 'futbol.pedir_consejo')).toBe(true);
    const peticiones = g.service<ConversacionService>(servicioDeConversacion('futbol'))!.peticiones(entrenador);
    expect(peticiones).toHaveLength(1);
    const puesto = g.moduleState<FutbolState>('futbol').puesto!;
    expect(peticiones[0]).toMatchObject({ nombre: 'Pedir jugar…', etiqueta: 'Puesto', minutos: 5, prefijoDeAccion: `futbol.pedir_puesto.${entrenador}.` });
    expect(peticiones[0].opciones.length).toBeGreaterThanOrEqual(10);
    expect(peticiones[0].opciones.map((o) => o.valor)).not.toContain(puesto);
    expect(peticiones[0].sugerida).toBeDefined();
    expect(peticiones[0].motivo).toBeUndefined();
    const otro = g.service<NpcDirectory>(SERVICES.npcs)!.list({ role: 'profesor', known: true })[0] ?? g.service<NpcDirectory>(SERVICES.npcs)!.list({ known: true }).find((n) => n.id !== entrenador)!;
    expect(g.service<ConversacionService>(servicioDeConversacion('futbol'))!.peticiones(otro.id)).toEqual([]);
    expect(g.listActions().filter((a) => a.id.includes('pedir_puesto') || a.id.includes('elegir_puesto'))).toEqual([]);
  });

  it('pedirlo es una acción que se resuelve por su id: decide el suceso (con tirada) y, si lo concede, el equipo cuenta con él en el nuevo puesto', () => {
    const { g, entrenador } = conEntrenador();
    const estado = () => g.moduleState<FutbolState>('futbol');
    const pedido = g.service<ConversacionService>(servicioDeConversacion('futbol'))!.peticiones(entrenador)[0].sugerida!;
    const id = `futbol.pedir_puesto.${entrenador}.${pedido}`;
    expect(g.preview(id)).toMatchObject({ available: true, duration: 5 });
    expect(g.preview(`futbol.pedir_puesto.${entrenador}.${estado().puesto}`)!.reason).toMatch(/Ya juegas de/);
    expect(g.preview(`futbol.pedir_puesto.${entrenador}.NO_EXISTE`)).toBeUndefined();
    const antes = estado().puesto;
    expect(g.perform(id).ok).toBe(true);
    expect(estado().ultimaPeticionDePuesto).toBeDefined();
    // Sale en el diario lo que pides y lo que decide (con la semilla es estable: o te lo concede o no).
    const diario = g.log.map((l) => l.text);
    expect(diario.some((t) => /Pedirle a .+ jugar de /.test(t))).toBe(true);
    if (estado().puesto !== antes) expect(estado().puesto).toBe(pedido);
  });

  it('pedirlo otra vez enseguida le sienta mal al entrenador (mal rato configurable: 14 días, −3 de afinidad)', () => {
    const { g, entrenador } = conEntrenador();
    const afinidad = () => g.service<RelationsService>(SERVICES.relaciones)!.get(entrenador)!.afinidad;
    const pedidos = g.service<ConversacionService>(servicioDeConversacion('futbol'))!.peticiones(entrenador)[0].opciones.map((o) => o.valor);
    g.perform(`futbol.pedir_puesto.${entrenador}.${pedidos[0]}`);
    const antes = afinidad();
    const puesto = g.moduleState<FutbolState>('futbol').puesto;
    const otro = pedidos.find((p) => p !== pedidos[0] && p !== puesto)!;
    const r = g.perform(`futbol.pedir_puesto.${entrenador}.${otro}`);
    expect(r.ok, JSON.stringify(g.preview(`futbol.pedir_puesto.${entrenador}.${otro}`))).toBe(true);
    expect(g.log.map((l) => l.text).some((t) => /Hace muy poco que le pedías/.test(t))).toBe(true);
    expect(afinidad()).toBeLessThan(antes);
  });
});
