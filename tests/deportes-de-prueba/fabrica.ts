import { APORTES, GEN, SHARED_EVENTS, defineModule, type DatosDeDeporte, type GameModule } from '@ds/contracts';
import { DATOS_ATLETISMO } from '../../modules/atletismo/src/datos';

/**
 * Deportes de prueba para validar el sistema (fase 7 del plan de deportes modulares): solo existen en los tests. Cada uno trae su habilidad (que cae si no
 * se practica), sus clubes, su jornada, su gente y las acciones de apuntarse, dejar el club y entrenar. Como el módulo no importa más que `contracts`, se
 * puede empaquetar y firmar como un deporte de verdad.
 */
export interface OpcionesDePrueba {
  id: string;
  nombre: string;
  /** Etiqueta de sus deportistas. */
  etiqueta: string;
  /** Día de la semana de su jornada (0 lunes … 6 domingo) y dónde. */
  dia: number;
  lugar: string;
}

export function crearDeportePrueba(o: OpcionesDePrueba): GameModule<any> {
  const datos: DatosDeDeporte = {
    id: o.id,
    paises: {
      espana: {
        ...DATOS_ATLETISMO.paises.espana,
        competiciones: { ...DATOS_ATLETISMO.paises.espana.competiciones, jornada: { dias: [o.dia], desde: 10, hasta: 12, lugar: o.lugar, texto: `${o.nombre}: la jornada es el día ${o.dia + 1} de la semana.` } },
        clubes: [
          { id: 'colegio', nombre: `Club de ${o.nombre.toLowerCase()} del colegio`, esColegio: true, calidad: 1, sesiones: { weekdays: [1, 3], desde: 15, hasta: 17 }, sede: 'pista_colegio', tramites: 'administracion' },
          { id: 'club_norte', nombre: `Club ${o.nombre} Norte`, calidad: 2, sesiones: { weekdays: [4], desde: 18, hasta: 20 }, acceso: { nivel: 30, edadMin: 9 }, sede: 'parque', tramites: 'sala_club_ciudad' },
        ],
        poblacion: {
          etiqueta: o.etiqueta,
          descripcionDeRival: `Juega a ${o.nombre.toLowerCase()}.`,
          capacidades: [GEN.velocidad, GEN.resistencia, GEN.coordinacion],
          aptitud: 0.2,
          reclutamiento: { edades: { min: 8, max: 15 }, edadMaxBaja: 12, probabilidadBaja: 0.1 },
          equipos: [
            { club: 'club_norte', calidad: 2, plantilla: { min: 6, max: 6 } },
            { club: 'colegio', colegio: 'propio', plantilla: { min: 4, max: 4 } },
            { club: 'colegio2', nombre: `${o.nombre} del colegio 2`, colegio: 'colegio2', plantilla: { min: 4, max: 4 } },
          ],
          descripcionDelEquipo: `Del equipo de ${o.nombre.toLowerCase()} del colegio.`,
          entrenadores: {
            sesgoCaracter: { disciplina: 10 },
            interesesPreferidos: ['deporte'],
            descripcionDelColegio: `Entrena al grupo de ${o.nombre.toLowerCase()} del colegio.`,
            dedicacion: `de ${o.nombre.toLowerCase()}`,
            deFuera: [{ club: 'club_norte', edades: [[8, 99]] }],
          },
        },
      },
    },
  };
  const habilidad = `${o.id}.tecnica`;
  return defineModule({
    id: o.id,
    name: o.nombre,
    version: '1.0.0',
    dependsOn: ['gen'],
    initState: () => ({}),
    stats: [{ id: habilidad, name: `Técnica de ${o.nombre.toLowerCase()}`, category: 'habilidad', initial: 10, decay: { graceDays: 3, ratePerDay: 0.02, floorRatio: 0.6 } }],
    aportes: {
      [APORTES.fichaDeDeporte]: [{ id: o.id, nombre: o.nombre, disciplina: 'partido', descripcion: `${o.nombre}, un deporte de prueba.`, tipo: 'equipo' }],
      [APORTES.datosDeDeporte]: [datos],
    },
    actions: [
      { id: `${o.id}.unirse`, name: `Apuntarte a ${o.nombre.toLowerCase()}`, tags: [], duration: 5, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.CLUB_JOIN, data: { sport: o.id, clubId: 'colegio' } }) },
      { id: `${o.id}.salir`, name: `Dejar ${o.nombre.toLowerCase()}`, tags: [], duration: 5, run: (ctx) => ctx.emit({ type: SHARED_EVENTS.CLUB_LEAVE, data: { sport: o.id } }) },
      { id: `${o.id}.entrenar`, name: `Entrenar ${o.nombre.toLowerCase()}`, tags: ['entrenamiento', o.id], duration: 60, run: (ctx) => void ctx.train(habilidad, 1.5) },
    ],
  });
}
