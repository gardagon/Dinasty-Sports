import { describe, expect, it } from 'vitest';
import { CALENDARIOS } from '../calendar';
import { HORARIOS_DE_ESPANA } from '../lugares';
import { copiaDeEspana, existePais, importarPais, listarPaises, paisPorId, registrarPais, validarPais, PAIS_ARGENTINA, PAIS_ESPANA, PAIS_INGLATERRA } from './index';

describe('paquetes de país', () => {
  it('España es el país de partida y es válido; el país que no existe es España', () => {
    expect(validarPais(PAIS_ESPANA)).toEqual([]);
    expect(paisPorId('espana')).toBe(PAIS_ESPANA);
    expect(paisPorId(undefined)).toBe(PAIS_ESPANA);
    expect(paisPorId('atlantida')).toBe(PAIS_ESPANA);
    expect(PAIS_ESPANA.cursos).toHaveLength(10);
    expect(PAIS_ESPANA.categorias.atletismo[0].id).toBe('sub10');
    expect(PAIS_ESPANA.horarios).toBe(HORARIOS_DE_ESPANA);
    expect(Object.keys(PAIS_ESPANA.horarios)).toEqual(expect.arrayContaining(['colegio', 'biblioteca', 'supermercado']));
  });

  it('Argentina e Inglaterra vienen de serie como copia de España con su nombre (calendario incluido)', () => {
    for (const [pais, id, nombre] of [[PAIS_ARGENTINA, 'argentina', 'Argentina'], [PAIS_INGLATERRA, 'inglaterra', 'Inglaterra']] as const) {
      expect(existePais(id)).toBe(true);
      expect(paisPorId(id)).toBe(pais);
      expect(pais).toMatchObject({ id, nombre });
      expect(pais.calendario).toMatchObject({ id, nombre });
      expect(CALENDARIOS[id]).toBe(pais.calendario);
      // Lo demás, igual que en España.
      expect({ ...pais, id: 'x', nombre: 'x', calendario: { ...pais.calendario, id: 'x', nombre: 'x' } }).toMatchObject({ cursos: PAIS_ESPANA.cursos, categorias: PAIS_ESPANA.categorias, horarios: PAIS_ESPANA.horarios, cursoDeModalidad: PAIS_ESPANA.cursoDeModalidad });
      expect(validarPais(pais)).toEqual([]);
    }
    expect(listarPaises().map((p) => p.id)).toEqual(expect.arrayContaining(['espana', 'argentina', 'inglaterra']));
  });

  it('una copia es independiente: cambiarla no toca a España', () => {
    const copia = copiaDeEspana('prueba_copia', 'Prueba', { cursoDeModalidad: 5 });
    expect(copia.cursoDeModalidad).toBe(5);
    expect(PAIS_ESPANA.cursoDeModalidad).toBe(8);
    expect(copia.cursos).not.toBe(PAIS_ESPANA.cursos);
  });

  it('la validación dice en español qué está mal', () => {
    const roto = (cambios: Record<string, unknown>) => validarPais({ ...structuredClone(PAIS_ESPANA), ...cambios });
    expect(validarPais(null)).toEqual(['El paquete de país no es un objeto']);
    expect(roto({ id: 'Mal Id' }).join()).toMatch(/«id»/);
    expect(roto({ nombre: '' }).join()).toMatch(/«nombre»/);
    expect(roto({ calendario: { ...PAIS_ESPANA.calendario, tramos: [{ desde: 0, hasta: 14, periodo: 'clase', trimestre: 1 }, { desde: 20, hasta: 51, periodo: 'verano', trimestre: 0 }] } }).join()).toMatch(/no continúa al anterior/);
    expect(roto({ calendario: { ...PAIS_ESPANA.calendario, tramos: [{ desde: 0, hasta: 14, periodo: 'clase', trimestre: 1 }] } }).join()).toMatch(/tiene que cubrir las 52 semanas/);
    expect(roto({ cursos: [] }).join()).toMatch(/Faltan los «cursos»/);
    expect(roto({ categorias: { atletismo: [{ id: 'a', nombre: 'A', edadMin: 0, edadMax: 9 }, { id: 'b', nombre: 'B', edadMin: 12, edadMax: 13 }] } }).join()).toMatch(/no son seguidas/);
    expect(roto({ horarios: { la_luna: { tramos: [], texto: 'x' } } }).join()).toMatch(/no existe en el mapa/);
    expect(roto({ demografia: { atlantes: 1 } }).join()).toMatch(/el origen «atlantes» no existe/);
    expect(roto({ origenesLocales: ['magreb'] , demografia: { espana_centro: 1 } }).join()).toMatch(/origenesLocales/);
    expect(roto({ apellidosDeLosNacidosAqui: 3 }).join()).toMatch(/1 o 2/);
    expect(roto({ origenes: [{ id: 'x', nombre: 'X', reserva: 'espana', frecuencia: 1, peloColor: [1], peloTipo: [1], ojos: [1], piel: [1] }] }).join()).toMatch(/lista de 6 probabilidades/);
    expect(roto({ reservasDeNombres: { rara: [{ id: 'r' }] } }).join()).toMatch(/mal formada/);
  });

  it('un paquete se importa de un texto JSON: se valida, se registra y queda entre los países', () => {
    const paquete = copiaDeEspana('importado', 'Importadia');
    const pais = importarPais(JSON.stringify(paquete));
    expect(pais.id).toBe('importado');
    expect(paisPorId('importado').nombre).toBe('Importadia');
    expect(CALENDARIOS.importado.nombre).toBe('Importadia');
    expect(() => importarPais('esto no es json')).toThrow(/JSON válido/);
    expect(() => importarPais(JSON.stringify({ ...paquete, id: 'otro', demografia: {} }))).toThrow(/demografia/);
    expect(existePais('otro')).toBe(false); // el que no vale no se registra
    expect(() => registrarPais({ id: 'x' })).toThrow(/Paquete de país no válido/);
  });
});
