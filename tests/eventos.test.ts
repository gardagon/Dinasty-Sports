import { describe, expect, it, vi } from 'vitest';
import { PERKS } from '@ds/contracts';
import { Banco, correrTodo, recorrer } from '../tools/eventos/banco';
import { indiceAlDia } from '../tools/eventos/indice';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/**
 * Los tests automáticos de TODOS los sucesos del juego (lo mismo que `npm run eventos:validar`): quien escribe un evento no tiene que
 * escribir un test. Si esto falla, el mensaje dice qué suceso, dónde y qué se esperaba.
 */
describe('catálogo de eventos', () => {
  const banco = new Banco();

  it('el índice del módulo eventos está al día (npm run eventos:indice)', () => {
    expect(indiceAlDia()).toBe(true);
  });

  it('todos los sucesos son válidos: forma, ids, referencias, textos, memoria e hilos', () => {
    expect(banco.validar().errores).toEqual([]);
  });

  it('pasan todas las pruebas y los escenarios escritos como datos', () => {
    const fallos = correrTodo(banco).filter((p) => p.problemas.length).map((p) => `${p.de} · «${p.nombre}»: ${p.problemas.join('; ')}`);
    expect(fallos).toEqual([]);
  });

  it('todos los caminos de todos los hilos y sucesos se pueden recorrer, con las personas en femenino y en masculino', () => {
    const raices = [...banco.catalogo.hilos.keys(), ...[...banco.catalogo.sucesos.values()].filter((x) => !x.hilo).map((x) => x.def.id)];
    const rotos: string[] = [];
    let caminos = 0;
    for (const raiz of raices) {
      for (const genero of ['f', 'm'] as const) {
        const r = recorrer(banco, raiz, genero);
        caminos += r.caminos.length;
        rotos.push(...r.errores);
        // Ningún texto se queda con una llave sin resolver.
        for (const c of r.caminos) for (const t of c.textos) if (/[{}]/.test(t)) rotos.push(`${raiz}: llave sin resolver en «${t}»`);
      }
    }
    expect(rotos).toEqual([]);
    expect(caminos).toBeGreaterThan(raices.length);
  });

  it('cada perk latente tiene su revelación', () => {
    const revela = new Set<string>();
    for (const x of banco.catalogo.sucesos.values()) for (const t of JSON.stringify(x.def).matchAll(/"revelaPerk":"([a-z_]+)"/g)) revela.add(t[1]);
    expect(PERKS.filter((p) => p.latente && !revela.has(p.id)).map((p) => p.id)).toEqual([]);
  });

  it('sin algún módulo que piden, el catálogo sigue cargando y esos sucesos no existen', () => {
    const sin = new Banco(banco.modulos.filter((m) => m.id !== 'estudios' && m.id !== 'relaciones'));
    expect(sin.catalogo.hilos.has('eventos.familia.faltas')).toBe(false);
    expect(sin.catalogo.hilos.has('eventos.relaciones.cumple')).toBe(false);
    expect(sin.catalogo.hilos.has('eventos.perks.pulmones')).toBe(true);
  });
});
