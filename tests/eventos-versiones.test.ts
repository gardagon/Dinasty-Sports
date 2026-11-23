import { describe, expect, it, vi } from 'vitest';
import { APORTE_DE_SUCESOS, SIN_CONTENIDO_DURO, defineModule, hilo, suceso } from '@ds/contracts';
import { MODULOS } from '@ds/game';
import { futbol } from '@ds/mod-futbol';
import { Banco, recorrer } from '../tools/eventos/banco';

vi.setConfig({ testTimeout: 240000, hookTimeout: 240000 });

/** El formato nuevo del lote 2 (textos y resultados al azar, variantes con peso, contenido duro) recorrido por la herramienta: cada versión se enseña. */
const ejemplo = defineModule({
  id: 'ejemplo2',
  name: 'Ejemplo del formato del lote 2',
  aportes: {
    [APORTE_DE_SUCESOS]: [
      suceso({
        id: 'ejemplo2.patio',
        titulo: 'En el patio',
        categoria: 'menor',
        disparo: { cada: 'dia', prob: 0.1 },
        familia: 'patio',
        reparto: { amigo: { relacion: { afinidad: { min: 0 } } } },
        variantes: [
          { id: 'sol', si: [], peso: 2, textos: ['{amigo.Nombre} se sienta al sol.', '{amigo.Nombre} te guarda sitio al sol.'] },
          { id: 'sombra', si: [], peso: 1, texto: '{amigo.Nombre} busca la sombra.' },
        ],
      }),
      suceso({
        id: 'ejemplo2.pregunta',
        titulo: 'Una pregunta',
        disparo: { cada: 'dia', prob: 0.1 },
        reparto: { amigo: { relacion: { afinidad: { min: 0 } } } },
        textos: ['{amigo.Nombre} te mira.', '{amigo.Nombre} se acerca.', '{amigo.Nombre} te espera.'],
        plazo: { dias: 1, porDefecto: 'callar' },
        opciones: [
          { id: 'callar', texto: 'Callar', resultados: ['No dices nada.', 'Te encoges de hombros.'] },
          { id: 'reirte', texto: 'Reírte de {amigo.nombre}', duro: ['burlas'], resultados: ['{amigo.Nombre} se ríe contigo.', '{amigo.Nombre} se enfada.'] },
        ],
      }),
      hilo({
        id: 'ejemplo2.hilo_duro',
        nombre: 'Hilo con una parte dura',
        reparto: { amigo: { relacion: { afinidad: { min: 0 } } } },
        sucesos: [
          { id: 'ejemplo2.hilo_duro.abre', titulo: 'Abre', disparo: { cada: 'dia', prob: 0.05 }, texto: 'Empieza.', plazo: { dias: 1, porDefecto: 'suave' }, opciones: [{ id: 'suave', texto: 'Con calma', efectos: [{ programa: 'ejemplo2.hilo_duro.cierra', en: { dias: 2 } }] }, { id: 'fuerte', texto: 'A gritos', duro: ['peleas'], efectos: [{ programa: 'ejemplo2.hilo_duro.pelea', en: { dias: 1 } }] }] },
          { id: 'ejemplo2.hilo_duro.pelea', titulo: 'Pelea', disparo: { programado: true }, duro: ['peleas'], texto: 'Os pegáis.', efectos: [{ fin: true }] },
          { id: 'ejemplo2.hilo_duro.cierra', titulo: 'Cierra', disparo: { programado: true }, texto: 'Se calma.', efectos: [{ fin: true }] },
        ],
      }),
    ],
  },
});

describe('el formato del lote 2 en la herramienta', () => {
  const modulos = [...MODULOS, futbol, ejemplo];
  const banco = new Banco(modulos);

  it('el catálogo de ejemplo es válido (también sin lo duro)', () => {
    expect(banco.validar().errores).toEqual([]);
  });

  it('recorrer enseña cada variante y cada versión de los textos y de los resultados, con las personas en los dos géneros', () => {
    for (const genero of ['f', 'm'] as const) {
      const patio = recorrer(banco, 'ejemplo2.patio', genero);
      expect(patio.errores).toEqual([]);
      const leidos = patio.caminos.flatMap((c) => c.textos).join('\n');
      for (const t of ['se sienta al sol', 'te guarda sitio al sol', 'busca la sombra']) expect(leidos).toContain(t);
      const pregunta = recorrer(banco, 'ejemplo2.pregunta', genero);
      expect(pregunta.errores).toEqual([]);
      const texto = pregunta.caminos.flatMap((c) => c.textos).join('\n');
      for (const t of ['te mira', 'se acerca', 'te espera', 'No dices nada', 'Te encoges', 'se ríe contigo', 'se enfada']) expect(texto).toContain(t);
      expect(pregunta.caminos.some((c) => c.pasos.some((p) => /\[versión 3\/3\]/.test(p)))).toBe(true);
      expect([...patio.caminos, ...pregunta.caminos].flatMap((c) => c.textos).some((t) => /[{}]/.test(t))).toBe(false);
    }
  });

  it('con el contenido duro desactivado, recorrer deja fuera lo marcado y el hilo sigue teniendo camino', () => {
    const sinDuro = new Banco(modulos, { duro: SIN_CONTENIDO_DURO });
    const pregunta = recorrer(sinDuro, 'ejemplo2.pregunta');
    expect(pregunta.errores).toEqual([]);
    expect(pregunta.caminos.flatMap((c) => c.pasos).some((p) => p.includes('reirte'))).toBe(false);
    expect(pregunta.caminos.length).toBeGreaterThan(0);
    const h = recorrer(sinDuro, 'ejemplo2.hilo_duro');
    expect(h.errores).toEqual([]);
    expect(h.caminos.flatMap((c) => c.pasos).join(' ')).not.toMatch(/fuerte|pelea/);
    expect(h.caminos.every((c) => c.hiloCerrado)).toBe(true);
    // Con todo permitido, el hilo tiene los dos finales.
    const todo = recorrer(banco, 'ejemplo2.hilo_duro');
    expect(todo.caminos.flatMap((c) => c.pasos).join(' ')).toMatch(/pelea/);
  });
});
