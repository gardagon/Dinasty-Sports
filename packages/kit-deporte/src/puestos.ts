import {
  GEN,
  SERVICES,
  SHARED_EVENTS,
  TAGS,
  servicioDeConversacion,
  suceso,
  type ActionDef,
  type AjusteDeTirada,
  type AporteDeSucesos,
  type Condicion,
  type ConversacionService,
  type NpcView,
  type PidePuestoData,
  type PresenciaService,
  type ReadContext,
  type Rango,
} from '@ds/contracts';
import { entrenadorDelJugador, idDeSucesoDePrueba, sedeDelClub } from './club';
import { PEDIR_PUESTO, type ConfigDeporte, type EstadoBaseDeDeporte } from './tipos';

/**
 * PEDIR PUESTO, común a todos los deportes con puestos (`puestosDelDeporte`): ya en un equipo, se le pide jugar en otro a tu entrenador **desde su ficha** (un desplegable de puestos:
 * `servicioDePedirPuesto`) y decide un suceso con una tirada de comunicación (`sucesoDePedirPuesto`). En la prueba de acceso lo pregunta el entrenador (`sucesoDePruebaDeAcceso`).
 * Los textos son del deporte (los pasa a los constructores); aquí solo hay reglas.
 */

const estado = (ctx: ReadContext) => ctx.state<EstadoBaseDeDeporte>();
export const idDeAccionDePedirPuesto = (deporte: string, npcId: string, puesto: string): string => `${deporte}.pedir_puesto.${npcId}.${puesto}`;
const nombreDe = (cfg: ConfigDeporte, id: string): string => cfg.puestosDelDeporte?.find((p) => p.id === id)?.nombre.toLowerCase() ?? id;

/**
 * Cuánto cuesta convencer al entrenador (PROVISIONAL, tabla en `docs/relevo/futbol-pedir-puesto.md`): escalones que se suman sobre la dificultad de partida.
 * `ventaja` dice cómo se lee lo que vale más en el puesto pedido que en el actual (un hecho del deporte o un dato de la señal): `(r) => ({ señal: 'ventaja', ...r })`.
 */
export const DIFICULTAD_DE_PEDIR_PUESTO = 55;
export const ajustesDePedirPuesto = (ventaja: (rango: Rango) => Condicion): AjusteDeTirada[] => [
  { si: [{ relacion: 'entrenador', estado: ['antipatia', 'enemigo', 'antagonista'] }], mas: 10 },
  { si: [{ relacion: 'entrenador', afinidad: { min: 20 } }], mas: -5 },
  { si: [{ relacion: 'entrenador', afinidad: { min: 40 } }], mas: -5 },
  { si: [{ relacion: 'entrenador', afinidad: { min: 75 } }], mas: -5 },
  { si: [ventaja({ min: 3 })], mas: -5 },
  { si: [ventaja({ min: 10 })], mas: -5 },
  { si: [ventaja({ min: 20 })], mas: -5 },
  { si: [ventaja({ max: -3 })], mas: 8 },
  { si: [ventaja({ max: -10 })], mas: 7 },
];

/** Por qué no se le puede pedir ahora un puesto a este entrenador, si no se puede (no es el tuyo, no está, esperas, ya juegas ahí). */
function motivoDePedirPuesto(ctx: ReadContext, cfg: ConfigDeporte, npcId: string, puesto?: string): string | undefined {
  const entrenador = entrenadorDelJugador(ctx, cfg.id);
  if (!entrenador || entrenador.id !== npcId) return 'Solo se lo puedes pedir a tu entrenador';
  const presencia = ctx.service<PresenciaService>(SERVICES.presencia);
  if (presencia && presencia.donde(entrenador.id) !== sedeDelClub(ctx, cfg)[0]) return `${entrenador.nombreCorto} ahora no está disponible: búscalo antes o después de la sesión`;
  const actual = estado(ctx).puesto;
  if (puesto && puesto === actual) return `Ya juegas de ${nombreDe(cfg, puesto)}`;
  const espera = cfg.pedirPuesto?.esperaDias ?? PEDIR_PUESTO.esperaDias;
  const ultima = estado(ctx).ultimaPeticionDePuesto;
  if (espera > 0 && ultima !== undefined && ctx.time.day - ultima < espera) return `Se lo pediste hace poco: espera ${espera - (ctx.time.day - ultima)} días más`;
  return undefined;
}

/** La acción de pedirle a tu entrenador jugar en un puesto: no se lista (el desplegable de su ficha la construye); la encuentra `resolverAccion`. El módulo del deporte la pone en su `resolverAccion`. */
export function resolverPedirPuesto(cfg: ConfigDeporte): (ctx: ReadContext, id: string) => ActionDef | undefined {
  const prefijo = `${cfg.id}.pedir_puesto.`;
  return (ctx, id) => {
    if (!id.startsWith(prefijo) || !cfg.puestosDelDeporte) return undefined;
    const resto = id.slice(prefijo.length);
    const corte = resto.lastIndexOf('.');
    const npcId = resto.slice(0, corte);
    const puesto = resto.slice(corte + 1);
    if (corte < 0 || !cfg.puestosDelDeporte.some((p) => p.id === puesto) || !ctx.service<{ get(id: string): NpcView | undefined }>(SERVICES.npcs)?.get(npcId)) return undefined;
    return {
      id,
      name: `Pedirle a tu entrenador jugar de ${nombreDe(cfg, puesto)}`,
      description: 'Se lo explicas con tus palabras: decide él, según lo bien que os llevéis y lo que vales en ese puesto frente al tuyo.',
      tags: [TAGS.social, cfg.id],
      group: 'Puesto',
      duration: 5,
      available: (c) => motivoDePedirPuesto(c, cfg, npcId, puesto) ?? true,
      run: (c) => {
        const valores = cfg.puestos?.(c) ?? {};
        const actual = estado(c).puesto;
        const ultima = estado(c).ultimaPeticionDePuesto;
        const ventaja = Math.round(((valores[puesto] ?? 0) - (actual ? (valores[actual] ?? 0) : (valores[puesto] ?? 0))) * 10) / 10;
        c.updateState<EstadoBaseDeDeporte>((s) => ({ ...s, ultimaPeticionDePuesto: c.time.day }));
        c.emit<PidePuestoData>({ type: SHARED_EVENTS.PIDE_PUESTO, data: { sport: cfg.id, puesto, puestoNombre: nombreDe(cfg, puesto), ventaja, diasDesdeLaUltima: ultima === undefined ? 999 : c.time.day - ultima, participants: [{ npcId }] } });
      },
    };
  };
}

/** El servicio de conversación `conversacion.<deporte>`: en la ficha de tu entrenador, «Pedir jugar…» con un desplegable de los demás puestos (el que más vales, sugerido). */
export function servicioDePedirPuesto(cfg: ConfigDeporte): [string, (ctx: ReadContext) => ConversacionService] {
  return [
    servicioDeConversacion(cfg.id),
    (ctx) => ({
      peticiones: (npcId) => {
        const entrenador = entrenadorDelJugador(ctx, cfg.id);
        if (!cfg.puestosDelDeporte?.length || !entrenador || entrenador.id !== npcId) return [];
        const actual = estado(ctx).puesto;
        const valores = cfg.puestos?.(ctx) ?? {};
        const otros = cfg.puestosDelDeporte.filter((p) => p.id !== actual);
        const sugerida = otros.reduce<string | undefined>((a, p) => (a === undefined || (valores[p.id] ?? 0) > (valores[a] ?? 0) ? p.id : a), undefined);
        const motivo = motivoDePedirPuesto(ctx, cfg, npcId);
        return [
          {
            id: 'pedir_puesto',
            nombre: 'Pedir jugar…',
            descripcion: `${actual ? `Ahora juegas de ${nombreDe(cfg, actual)}. ` : ''}Decide ${entrenador.nombreCorto}: cuenta lo bien que os llevéis y lo que vales en ese puesto frente al tuyo.`,
            etiqueta: 'Puesto',
            opciones: otros.map((p) => ({ valor: p.id, texto: p.nombre })),
            ...(sugerida ? { sugerida } : {}),
            boton: 'Pedirle jugar de {opcion}',
            minutos: 5,
            prefijoDeAccion: `${cfg.id}.pedir_puesto.${npcId}.`,
            ...(motivo ? { motivo } : {}),
          },
        ];
      },
    }),
  ];
}

/** Los textos de la prueba de acceso (los pone el deporte; las llaves son las de siempre: `{entrenador.nombre}`, `{señal.nHuecos}`). `{puesto}` se cambia por el nombre de cada puesto. */
export interface TextosDePruebaDeAcceso {
  titulo: string;
  /** Con huecos en varios puestos: lo que dice el entrenador y pregunta. */
  pregunta: string;
  /** Una opción por hueco (`{puesto}`). */
  opcionDeHueco: string;
  resultadoDeHueco: string;
  /** Dejar que decida él. */
  opcionQueDecida: string;
  resultadoQueDecida: string;
  /** Sin varios huecos: solo se presenta y le prueba donde decida. */
  presentacion: string;
}

/**
 * El suceso de la prueba de acceso (`<deporte>.prueba_de_acceso`): al unirte al entrenamiento de prueba, el entrenador se presenta (pasa a ser conocido) y, si al equipo le faltan jugadores en varios
 * puestos, te pregunta dónde quieres jugar (solo se ofrecen los huecos). Elegir uno es que te prueben ahí; si no, te prueba donde decida él. El puesto lo apunta el deporte (`PRUEBA_PUESTO`).
 */
export function sucesoDePruebaDeAcceso(cfg: ConfigDeporte, t: TextosDePruebaDeAcceso): AporteDeSucesos {
  const puestos = cfg.puestosDelDeporte ?? [];
  const sin = (puesto?: string): readonly [{ presenta: string }, { emite: string; datos: unknown }] => [{ presenta: 'entrenador' }, { emite: SHARED_EVENTS.PRUEBA_PUESTO, datos: { sport: cfg.id, ...(puesto ? { puesto } : {}) } }];
  const nombreDe2 = (id: string) => puestos.find((p) => p.id === id)!.nombre.toLowerCase();
  return suceso({
    id: idDeSucesoDePrueba(cfg.id),
    titulo: t.titulo,
    deporte: cfg.id,
    disparo: { al: SHARED_EVENTS.PRUEBA_EMPIEZA },
    ejemploDeSeñal: { sport: cfg.id, club: 'club', huecos: puestos.slice(0, 3).map((p) => p.id), nHuecos: Math.min(3, puestos.length), participants: [{ npcId: 'entrenador' }] },
    cuando: [{ señal: 'sport', es: cfg.id }],
    repite: 'siempre',
    reparto: { entrenador: { rol: 'entrenador', deLaSeñal: 'participants', conocido: false } },
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'que_decida' },
    variantes: [
      {
        id: 'con_huecos',
        si: [{ señal: 'nHuecos', min: 2 }],
        texto: t.pregunta,
        opciones: [
          ...puestos.map((p) => ({
            id: `en_${p.id.toLowerCase()}`,
            texto: t.opcionDeHueco.replaceAll('{puesto}', nombreDe2(p.id)),
            requiere: [{ señal: 'huecos', incluye: p.id }] as Condicion[],
            oculta: true,
            minutos: 5,
            efectos: sin(p.id),
            resultado: t.resultadoDeHueco.replaceAll('{puesto}', nombreDe2(p.id)),
          })),
          { id: 'que_decida', texto: t.opcionQueDecida, minutos: 5, efectos: sin(), resultado: t.resultadoQueDecida },
        ],
      },
      { id: 'sin_huecos', si: [], texto: t.presentacion, efectos: sin() },
    ],
  });
}

/** Los textos de pedir puesto al entrenador (`{señal.puestoNombre}`, `{entrenador.nombre}`). */
export interface TextosDePedirPuesto {
  titulo: string;
  /** Lo que haces: se lo planteas. */
  planteamiento: string;
  concede: string;
  niega: string;
  /** Si se lo pides pasado poco tiempo desde la última vez. */
  pocoTiempo: string;
}

/**
 * El suceso de pedirle a tu entrenador jugar en otro puesto (`<deporte>.pedir_puesto`): sin opciones (ya elegiste en su ficha), con una tirada de comunicación cuya dificultad
 * depende de la relación con él y de lo que vales en ese puesto frente al tuyo (`ajustesDePedirPuesto`). Si se lo pides pasado poco tiempo, se lo toma mal (configurable: `ConfigDePedirPuesto`).
 */
export function sucesoDePedirPuesto(cfg: ConfigDeporte, t: TextosDePedirPuesto): AporteDeSucesos {
  const enfado = cfg.pedirPuesto?.enfadoSiPocoTiempo ?? PEDIR_PUESTO.enfadoSiPocoTiempo;
  return suceso({
    id: `${cfg.id}.pedir_puesto`,
    titulo: t.titulo,
    texto: t.planteamiento,
    deporte: cfg.id,
    disparo: { al: SHARED_EVENTS.PIDE_PUESTO },
    ejemploDeSeñal: { sport: cfg.id, puesto: cfg.puestosDelDeporte?.[0]?.id ?? 'x', puestoNombre: cfg.puestosDelDeporte?.[0]?.nombre.toLowerCase() ?? 'x', ventaja: 6, diasDesdeLaUltima: 999, participants: [{ npcId: 'entrenador' }] },
    cuando: [{ señal: 'sport', es: cfg.id }],
    repite: 'siempre',
    reparto: { entrenador: { rol: 'entrenador', deLaSeñal: 'participants' } },
    urgencia: 'ahora',
    presentacion: 'linea',
    efectos: [
      ...(enfado ? [{ si: [{ señal: 'diasDesdeLaUltima', max: enfado.dias - 1 }] as Condicion[], entonces: [{ relacion: 'entrenador', afinidad: enfado.afinidad }, { diario: t.pocoTiempo }] }] : []),
      {
        tirada: { con: GEN.comunicacion, dificultad: DIFICULTAD_DE_PEDIR_PUESTO, ajustes: ajustesDePedirPuesto((r) => ({ señal: 'ventaja', ...r })) },
        exito: [{ emite: SHARED_EVENTS.CAMBIO_DE_PUESTO, datos: { sport: cfg.id, puesto: '{señal.puesto}' } }, { diario: t.concede }],
        fallo: [{ diario: t.niega }],
      },
    ],
  });
}
