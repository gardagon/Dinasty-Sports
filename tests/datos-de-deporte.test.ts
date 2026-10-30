import { describe, expect, it } from 'vitest';
import { APORTES, CALENDARIO_ESPANA, claveDeDeporte, copiaDeEspana, registrarPais, validarDatosDeDeporte, type DatosDeDeporte, type DeporteService, type FichaDeDeporte } from '@ds/contracts';
import { MODULOS, catalogoDeDeportes, nuevaPartida } from '@ds/game';
import { atletismo } from '@ds/mod-atletismo';

/** Aportes de los deportes (ficha y datos por país): fase 1 y 2 del plan de deportes modulares. */

const nombreDe = (g: ReturnType<typeof nuevaPartida>, id: string) => g.preview(id)!.name;
const federacion = (g: ReturnType<typeof nuevaPartida>) => g.service<DeporteService>(claveDeDeporte('atletismo'))!.view().resumen.find((r) => r.etiqueta === 'Federación')!.valor;
const datosDeAtletismo = () => atletismo.aportes![APORTES.datosDeDeporte][0] as DatosDeDeporte;

describe('ficha y datos de cada deporte', () => {
  it('cada módulo de deporte aporta una ficha con su id y unos datos válidos con España', () => {
    const fichas = catalogoDeDeportes();
    expect(fichas.map((f) => f.id)).toEqual(['atletismo']);
    for (const f of fichas) {
      expect(MODULOS.some((m) => m.id === f.id)).toBe(true);
      const datos = MODULOS.find((m) => m.id === f.id)!.aportes![APORTES.datosDeDeporte] as DatosDeDeporte[];
      expect(datos).toHaveLength(1);
      expect(datos[0].id).toBe(f.id);
      expect(validarDatosDeDeporte(datos[0])).toEqual([]);
      expect(f).toMatchObject({ nombre: expect.any(String), disciplina: expect.any(String), tipo: expect.stringMatching(/^(individual|equipo)$/) });
    }
  });

  it('la partida conoce las fichas de sus deportes', () => {
    const g = nuevaPartida({ seed: 31 });
    expect(g.aportes<FichaDeDeporte>(APORTES.fichaDeDeporte).map((f) => f.id)).toEqual(['atletismo']);
  });
});

describe('los datos del deporte son por país', () => {
  it('España: los textos y las semanas de siempre', () => {
    const g = nuevaPartida({ seed: 31 });
    expect(nombreDe(g, 'atletismo.final')).toBe('Competir: final del campeonato de España');
    expect(g.preview('atletismo.semifinal')!.description).toMatch(/sábado de la semana 38\)/);
    expect(g.preview('atletismo.final')!.description).toMatch(/sábado de la semana 39\)/);
  });

  it('un país que el deporte no trae usa los datos de España con su nombre', () => {
    const g = nuevaPartida({ seed: 31, pais: 'argentina' });
    expect(nombreDe(g, 'atletismo.final')).toBe('Competir: final del campeonato de Argentina');
    expect(g.preview('atletismo.semifinal')!.description).toMatch(/semana 38\)/); // su calendario es copia del de España
    expect(federacion(g)).toBe('Real Federación Española de Atletismo (con los datos de España: Argentina aún no tiene los suyos)');
    expect(federacion(nuevaPartida({ seed: 31 }))).toBe('Real Federación Española de Atletismo');
  });

  it('un deporte puede traer las categorías y las competiciones de un país', () => {
    registrarPais(copiaDeEspana('con_datos', 'Con datos'));
    const propios = {
      ...datosDeAtletismo().paises.espana,
      categorias: [
        { id: 'u11', nombre: 'Under 11', edadMin: 0, edadMax: 10 },
        { id: 'abierta', nombre: 'Abierta', edadMin: 11, edadMax: 200 },
      ],
      competiciones: { federacion: 'Federación de prueba', campeonato: 'campeonato nacional de {pais}' },
    };
    const datos: DatosDeDeporte = { id: 'atletismo', paises: { ...datosDeAtletismo().paises, con_datos: propios } };
    expect(validarDatosDeDeporte(datos)).toEqual([]);
    const conDatos = { ...atletismo, aportes: { ...atletismo.aportes, [APORTES.datosDeDeporte]: [datos] } };
    const modulos = MODULOS.map((m) => (m.id === 'atletismo' ? conDatos : m));
    const categoria = (pais: string) => nuevaPartida({ seed: 5, pais }, modulos).service<DeporteService>(claveDeDeporte('atletismo'))!.view().resumen.find((r) => r.etiqueta === 'Categoría')!.valor;
    expect(categoria('con_datos')).toMatch(/Under 11/);
    expect(categoria('espana')).toMatch(/Sub-10/);
    expect(nombreDe(nuevaPartida({ seed: 5, pais: 'con_datos' }, modulos), 'atletismo.final')).toBe('Competir: final del campeonato nacional de Con datos');
  });

  it('la temporada sigue al calendario del país: con un curso más corto, las fases finales se adelantan', () => {
    registrarPais(
      copiaDeEspana('curso_corto', 'Curso corto', {
        calendario: {
          ...CALENDARIO_ESPANA,
          id: 'curso_corto',
          nombre: 'Curso corto',
          tramos: [
            { desde: 0, hasta: 14, periodo: 'clase', trimestre: 1 },
            { desde: 15, hasta: 16, periodo: 'navidad', trimestre: 0 },
            { desde: 17, hasta: 28, periodo: 'clase', trimestre: 2 },
            { desde: 29, hasta: 29, periodo: 'semana_santa', trimestre: 0 },
            { desde: 30, hasta: 34, periodo: 'clase', trimestre: 3 },
            { desde: 35, hasta: 51, periodo: 'verano', trimestre: 0 },
          ],
          evaluaciones: [14, 28, 34],
          parciales: [6, 11, 21, 25, 31, 32],
        },
      }),
    );
    const g = nuevaPartida({ seed: 31, pais: 'curso_corto' });
    expect(g.preview('atletismo.semifinal')!.description).toMatch(/sábado de la semana 32\)/);
    expect(g.preview('atletismo.final')!.description).toMatch(/sábado de la semana 33\)/);
  });
});
