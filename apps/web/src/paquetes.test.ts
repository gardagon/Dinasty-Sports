import { describe, expect, it } from 'vitest';
import { copiaDeEspana, existePais } from '@ds/contracts';
import { cargarPaquetesGuardados, idsImportados, importarPaquete, paisesElegibles, type Almacenillo } from './paquetes';

const memoria = (): Almacenillo & { datos: Record<string, string> } => {
  const datos: Record<string, string> = {};
  return { datos, getItem: (k) => datos[k] ?? null, setItem: (k, v) => void (datos[k] = v) };
};

describe('paquetes de país importados', () => {
  it('de serie hay España, Argentina e Inglaterra', () => {
    expect(paisesElegibles().map((p) => p.id)).toEqual(expect.arrayContaining(['espana', 'argentina', 'inglaterra']));
  });

  it('un paquete importado se valida, se registra, se guarda y se puede volver a cargar al arrancar', () => {
    const a = memoria();
    const texto = JSON.stringify(copiaDeEspana('web_prueba', 'Webia'));
    expect(importarPaquete(texto, a).nombre).toBe('Webia');
    expect(existePais('web_prueba')).toBe(true);
    expect(paisesElegibles().find((p) => p.id === 'web_prueba')!.nombre).toBe('Webia');
    expect(idsImportados(a)).toEqual(['web_prueba']);
    // Al arrancar de nuevo se registra lo guardado.
    expect(cargarPaquetesGuardados(a)).toEqual([]);
  });

  it('uno que no vale no se guarda y dice por qué; uno guardado que deja de valer da un aviso', () => {
    const a = memoria();
    expect(() => importarPaquete('{"id":"x"}', a)).toThrow(/Paquete de país no válido/);
    expect(() => importarPaquete('no es json', a)).toThrow(/JSON válido/);
    expect(idsImportados(a)).toEqual([]);
    a.datos['ds.paquetes_de_pais'] = JSON.stringify({ roto: '{"id":"roto"}' });
    expect(cargarPaquetesGuardados(a)).toHaveLength(1);
    expect(cargarPaquetesGuardados(a)[0]).toMatch(/«roto»/);
    // Sin almacenamiento (modo privado) todo sigue funcionando en la sesión.
    expect(cargarPaquetesGuardados(null)).toEqual([]);
    expect(importarPaquete(JSON.stringify(copiaDeEspana('sin_guardar', 'Sin guardar')), null).id).toBe('sin_guardar');
  });
});
