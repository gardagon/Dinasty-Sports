import { APORTES, GEN, SHARED_EVENTS, defineModule, type DatosDeDeporte } from '@ds/contracts';
import { MODULOS } from '@ds/game';
import { DATOS_ATLETISMO } from '@ds/mod-atletismo';

/** Un segundo deporte de prueba (solo para los tests): se carga junto al atletismo y trae una habilidad que cae si no se practica. */
export const DATOS_PRUEBA: DatosDeDeporte = {
  id: 'prueba',
  paises: {
    espana: {
      ...DATOS_ATLETISMO.paises.espana,
      competiciones: { ...DATOS_ATLETISMO.paises.espana.competiciones, jornada: { dias: [6], desde: 10, hasta: 12, lugar: 'parque', texto: 'Partidos: los domingos de 10 a 12 en el parque.' } },
      clubes: [
        { id: 'colegio', nombre: 'Club deportivo del colegio', esColegio: true, calidad: 1, sesiones: { weekdays: [1, 3], desde: 15, hasta: 17 }, sede: 'pista_colegio', tramites: 'administracion' },
        { id: 'club_norte', nombre: 'Club Norte', calidad: 2, sesiones: { weekdays: [4], desde: 18, hasta: 20 }, acceso: { nivel: 30, edadMin: 9 }, sede: 'parque', tramites: 'sala_club_ciudad' },
      ],
      poblacion: {
        etiqueta: 'jugador',
        descripcionDeRival: 'Juega a la prueba.',
        capacidades: [GEN.velocidad, GEN.resistencia, GEN.coordinacion],
        aptitud: 0.2,
        reclutamiento: { edades: { min: 8, max: 15 }, edadMaxBaja: 12, probabilidadBaja: 0.1 },
        equipos: [
          { club: 'club_norte', calidad: 2, plantilla: { min: 6, max: 6 } },
          { club: 'colegio', colegio: 'propio', plantilla: { min: 4, max: 4 } },
          { club: 'colegio2', nombre: 'colegio2', colegio: 'colegio2', plantilla: { min: 4, max: 4 } },
        ],
        descripcionDelEquipo: 'Del equipo de prueba del colegio.',
        entrenadores: { sesgoCaracter: { disciplina: 10 }, interesesPreferidos: ['deporte'], descripcionDelColegio: 'Entrena al grupo de prueba del colegio.', dedicacion: 'de prueba', deFuera: [{ club: 'club_norte', edades: [[8, 99]] }] },
      },
    },
  },
};

export const prueba = defineModule({
  id: 'prueba',
  name: 'Prueba',
  dependsOn: ['gen'],
  initState: () => ({}),
  stats: [{ id: 'prueba.tecnica', name: 'Técnica de prueba', category: 'habilidad', initial: 10, decay: { graceDays: 3, ratePerDay: 0.02, floorRatio: 0.6 } }],
  aportes: {
    [APORTES.fichaDeDeporte]: [{ id: 'prueba', nombre: 'Prueba', disciplina: 'partido', descripcion: 'Un deporte de prueba.', tipo: 'equipo' }],
    [APORTES.datosDeDeporte]: [DATOS_PRUEBA],
  },
  actions: [{ id: 'prueba.unirse', name: 'Unirse', tags: [], duration: 5, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: 'prueba', clubId: 'colegio' } }) }],
});

export const CON_PRUEBA = [...MODULOS, prueba];
