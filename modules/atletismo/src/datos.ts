import type { CategoriaDef, DatosDeDeporte, FichaDeDeporte } from '@ds/contracts';

/**
 * Lo que el atletismo trae de cada país (datos puros, ver `DatosDeDeporte`): sus categorías, su temporada y sus competiciones. Hoy solo España;
 * los demás países usan estos mismos datos (con su nombre donde pone `{pais}`) hasta que el deporte traiga los suyos.
 */

/** Categorías de la federación española de atletismo (por edad). Los de 23 años o más compiten en absoluta. */
export const CATEGORIAS_ESPANA: readonly CategoriaDef[] = [
  { id: 'sub10', nombre: 'Sub-10', edadMin: 0, edadMax: 9 },
  { id: 'sub12', nombre: 'Sub-12', edadMin: 10, edadMax: 11 },
  { id: 'sub14', nombre: 'Sub-14', edadMin: 12, edadMax: 13 },
  { id: 'sub16', nombre: 'Sub-16', edadMin: 14, edadMax: 15 },
  { id: 'sub18', nombre: 'Sub-18', edadMin: 16, edadMax: 17 },
  { id: 'sub20', nombre: 'Sub-20', edadMin: 18, edadMax: 19 },
  { id: 'sub23', nombre: 'Sub-23', edadMin: 20, edadMax: 22 },
  { id: 'absoluta', nombre: 'Absoluta', edadMin: 23, edadMax: 200 },
];

export const FICHA_ATLETISMO: FichaDeDeporte = {
  id: 'atletismo',
  nombre: 'Atletismo',
  disciplina: '400 m',
  descripcion: '400 metros lisos: entrenas por la tarde y compites los sábados.',
  tipo: 'individual',
};

export const DATOS_ATLETISMO: DatosDeDeporte = {
  id: 'atletismo',
  paises: {
    espana: {
      categorias: CATEGORIAS_ESPANA,
      // Con el calendario de España: la primera carrera en la semana 5 del curso y las semifinales y la final en las semanas 38 y 39 (las clases acaban en la 41).
      temporada: { semanasDePretemporada: 4, semifinalAntesDelFinal: 3, finalAntesDelFinal: 2 },
      competiciones: { federacion: 'Real Federación Española de Atletismo', campeonato: 'campeonato de {pais}' },
    },
  },
};
