import { describe, expect, it } from 'vitest';
import { CALENDARIO_ESPANA, type CalendarioPais } from './calendar';
import { semanasDeTemporada, validarDatosDeDeporte, type DatosDeDeporte } from './deporte-datos';

const DATOS: DatosDeDeporte = {
  id: 'x',
  paises: {
    espana: {
      categorias: [
        { id: 'a', nombre: 'A', edadMin: 0, edadMax: 9 },
        { id: 'b', nombre: 'B', edadMin: 10, edadMax: 200 },
      ],
      temporada: { semanasDePretemporada: 4, semifinalAntesDelFinal: 3, finalAntesDelFinal: 2 },
      competiciones: { federacion: 'Federación', campeonato: 'campeonato de {pais}', jornada: { dias: [5], desde: 9, hasta: 13, lugar: 'estadio', texto: 'Partidos: los sábados.' } },
      sedes: { colegio: 'pista_colegio', fuera: 'estadio' },
      poblacion: {
        etiqueta: 'jugador',
        descripcionDeRival: 'Juega.',
        capacidades: ['gen.velocidad', 'gen.resistencia'],
        aptitud: 0.15,
        reclutamiento: { edades: { min: 8, max: 19 }, edadMaxBaja: 13, probabilidadBaja: 0.1 },
        equipos: [{ club: 'colegio', colegio: 'propio', plantilla: { min: 4, max: 6 } }],
        descripcionDelEquipo: 'Del equipo.',
        entrenadores: { sesgoCaracter: {}, interesesPreferidos: [], descripcionDelColegio: 'Entrena.', dedicacion: 'de prueba', deFuera: [] },
      },
      clubes: [{ id: 'colegio', nombre: 'Club del colegio', esColegio: true, calidad: 1, sesiones: { weekdays: [0, 2], desde: 15, hasta: 17 }, sede: 'pista_colegio', tramites: 'administracion' }],
    },
  },
};

/** Un curso que acaba antes (clases hasta la semana 34) y con la Navidad más corta. */
const CALENDARIO_CORTO: CalendarioPais = {
  ...CALENDARIO_ESPANA,
  id: 'corto',
  tramos: [
    { desde: 0, hasta: 14, periodo: 'clase', trimestre: 1 },
    { desde: 15, hasta: 16, periodo: 'navidad', trimestre: 0 },
    { desde: 17, hasta: 28, periodo: 'clase', trimestre: 2 },
    { desde: 29, hasta: 29, periodo: 'semana_santa', trimestre: 0 },
    { desde: 30, hasta: 34, periodo: 'clase', trimestre: 3 },
    { desde: 35, hasta: 51, periodo: 'verano', trimestre: 0 },
  ],
};

describe('temporada relativa al calendario', () => {
  it('con el calendario de España son las semanas de siempre (la 5.ª, la 38.ª y la 39.ª del curso)', () => {
    expect(semanasDeTemporada(CALENDARIO_ESPANA, DATOS.paises.espana.temporada)).toEqual({ primeraCompeticion: 4, semifinal: 37, final: 38 });
  });

  it('con otro calendario se mueve con él: las fases finales siguen contando desde el final de las clases', () => {
    expect(semanasDeTemporada(CALENDARIO_CORTO, DATOS.paises.espana.temporada)).toEqual({ primeraCompeticion: 4, semifinal: 31, final: 32 });
  });

  it('la pretemporada cuenta semanas de clase, no semanas del curso (no cuenta las vacaciones)', () => {
    // La 16.ª semana de clase cae tras las vacaciones de Navidad.
    expect(semanasDeTemporada(CALENDARIO_ESPANA, { ...DATOS.paises.espana.temporada, semanasDePretemporada: 15 }).primeraCompeticion).toBe(17);
  });
});

describe('validar los datos de un deporte', () => {
  const roto = (cambios: Record<string, unknown>) => validarDatosDeDeporte({ ...structuredClone(DATOS), ...cambios });
  const conEspana = (cambios: Record<string, unknown>) => roto({ paises: { espana: { ...structuredClone(DATOS.paises.espana), ...cambios } } });

  it('vale lo bien formado', () => {
    expect(validarDatosDeDeporte(DATOS)).toEqual([]);
  });

  it('exige España, que es el respaldo', () => {
    expect(roto({ paises: { argentina: DATOS.paises.espana } }).join()).toMatch(/Faltan los datos de «espana»/);
    expect(roto({ paises: {} }).join()).toMatch(/Faltan los «paises»/);
    expect(validarDatosDeDeporte(null)).toEqual(['Los datos del deporte no son un objeto']);
  });

  it('comprueba categorías, temporada y competiciones de cada país', () => {
    expect(conEspana({ categorias: [] }).join()).toMatch(/faltan las «categorias»/);
    expect(conEspana({ categorias: [{ id: 'a', nombre: 'A', edadMin: 0, edadMax: 9 }, { id: 'b', nombre: 'B', edadMin: 12, edadMax: 13 }] }).join()).toMatch(/no tienen edades seguidas/);
    expect(conEspana({ temporada: { semanasDePretemporada: 4 } }).join()).toMatch(/«temporada»/);
    expect(conEspana({ temporada: { semanasDePretemporada: 4, semifinalAntesDelFinal: 2, finalAntesDelFinal: 3 } }).join()).toMatch(/la final tiene que ser después/);
    expect(conEspana({ competiciones: { federacion: '' } }).join()).toMatch(/«competiciones»/);
    expect(conEspana({ competiciones: { ...DATOS.paises.espana.competiciones, jornada: { dias: [9], desde: 9, hasta: 13, lugar: 'estadio', texto: 'x' } } }).join()).toMatch(/«jornada»/);
    expect(conEspana({ sedes: { colegio: 'pista' } }).join()).toMatch(/«sedes»/);
    expect(conEspana({ clubes: [] }).join()).toMatch(/faltan los «clubes»/);
    const pob = DATOS.paises.espana.poblacion;
    expect(conEspana({ poblacion: undefined }).join()).toMatch(/falta la «poblacion»/);
    expect(conEspana({ poblacion: { ...pob, capacidades: [] } }).join()).toMatch(/sus capacidades/);
    expect(conEspana({ poblacion: { ...pob, aptitud: 3 } }).join()).toMatch(/entre 0 y 1/);
    expect(conEspana({ poblacion: { ...pob, reclutamiento: { ...pob.reclutamiento, edades: { min: 9, max: 8 } } } }).join()).toMatch(/«reclutamiento» de la población/);
    expect(conEspana({ poblacion: { ...pob, equipos: [] } }).join()).toMatch(/necesita sus equipos/);
    expect(conEspana({ poblacion: { ...pob, equipos: [{ club: 'a', plantilla: { min: 5, max: 3 } }] } }).join()).toMatch(/equipo mal formado/);
    expect(conEspana({ poblacion: { ...pob, equipos: [pob.equipos[0], pob.equipos[0]] } }).join()).toMatch(/«colegio» está repetido/);
    expect(conEspana({ poblacion: { ...pob, entrenadores: { ...pob.entrenadores, deFuera: undefined } } }).join()).toMatch(/«entrenadores» de la población/);
    const club = DATOS.paises.espana.clubes[0];
    expect(conEspana({ clubes: [club, club] }).join()).toMatch(/está repetido/);
    expect(conEspana({ clubes: [{ ...club, calidad: 7 }] }).join()).toMatch(/club mal formado/);
  });
});
