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
import { GRUPOS_QUE_NOMBRA_EL_ENTRENADOR, entrenadorDelJugador, idDeSucesoDePrueba, sedeDelClub } from './club';
import { idDeConocimiento } from './habilidades';
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

/** Los textos de la prueba de acceso (los pone el deporte; las llaves son las de siempre: `{entrenador.nombre}`, `{señal.necesita}`). `{puesto}` se cambia por el nombre de cada puesto. */
export interface TextosDePruebaDeAcceso {
  titulo: string;
  /** Faltan jugadores en más de 2 grupos de puestos: el entrenador dice que necesita en varios y pregunta. */
  pregunta: string;
  /** Faltan en 1 o 2 grupos: dice cuáles (`{señal.necesita}`: «centrales y laterales») y pregunta. */
  preguntaConNecesidad: string;
  /** Una opción por puesto (`{puesto}`). */
  opcionDePuesto: string;
  /** Eliges un puesto en que le faltan jugadores (lo dijera o no). */
  resultadoDeHueco: string;
  /** Con «varios»: pides un puesto en que no faltan jugadores: dice que no, pero que te quedes a probar donde él decida (`{puesto}`). */
  resultadoSinHueco: string;
  /** Con dos puestos dichos: pides uno que no es ninguno de esos (`{puesto}`, `{señal.necesita}`): dice que no es ninguno y te prueba donde decida él. */
  resultadoSinHuecoDicho: string;
  /** Dejar que decida él. */
  opcionQueDecida: string;
  resultadoQueDecida: string;
  /** Sin huecos: solo se presenta y le prueba donde decida. */
  presentacion: string;
}

/**
 * El suceso de la prueba de acceso (`<deporte>.prueba_de_acceso`): al unirte al entrenamiento de prueba, el entrenador se presenta (pasa a ser conocido) y dice lo que más necesita: los dos grupos de
 * puestos en que más le faltan jugadores o, si faltan en más de dos, «varios» (`necesidadesDelEquipo`). Tú eliges entre **todos** los puestos: si en el que eliges le faltan jugadores (lo dijera o no), te prueba ahí;
 * si no, te dice que no es ninguno de esos y te prueba donde decida él. Sin huecos, solo se presenta. El puesto lo apunta el deporte (`PRUEBA_PUESTO`).
 */
export function sucesoDePruebaDeAcceso(cfg: ConfigDeporte, t: TextosDePruebaDeAcceso): AporteDeSucesos {
  const puestos = cfg.puestosDelDeporte ?? [];
  const sin = (puesto?: string): readonly [{ presenta: string }, { emite: string; datos: unknown }] => [{ presenta: 'entrenador' }, { emite: SHARED_EVENTS.PRUEBA_PUESTO, datos: { sport: cfg.id, ...(puesto ? { puesto } : {}) } }];
  const nombreDe2 = (id: string) => puestos.find((p) => p.id === id)!.nombre.toLowerCase();
  const opciones = (resultadoSinHueco: string) => [
    ...puestos.map((p) => ({
      id: `en_${p.id.toLowerCase()}`,
      texto: t.opcionDePuesto.replaceAll('{puesto}', nombreDe2(p.id)),
      requiere: [{ señal: 'huecos', incluye: p.id }] as Condicion[],
      oculta: true,
      efectos: sin(p.id),
      resultado: t.resultadoDeHueco.replaceAll('{puesto}', nombreDe2(p.id)),
    })),
    ...puestos.map((p) => ({
      id: `sin_${p.id.toLowerCase()}`,
      texto: t.opcionDePuesto.replaceAll('{puesto}', nombreDe2(p.id)),
      requiere: [{ no: { señal: 'huecos', incluye: p.id } }] as Condicion[],
      oculta: true,
      efectos: sin(),
      resultado: resultadoSinHueco.replaceAll('{puesto}', nombreDe2(p.id)),
    })),
    { id: 'que_decida', texto: t.opcionQueDecida, efectos: sin(), resultado: t.resultadoQueDecida },
  ];
  return suceso({
    id: idDeSucesoDePrueba(cfg.id),
    titulo: t.titulo,
    deporte: cfg.id,
    disparo: { al: SHARED_EVENTS.PRUEBA_EMPIEZA },
    ejemploDeSeñal: { sport: cfg.id, club: 'club', huecos: puestos.slice(0, 2).map((p) => p.id), nHuecos: Math.min(2, puestos.length), nGrupos: 2, necesita: 'centrales y laterales', participants: [{ npcId: 'entrenador' }] },
    cuando: [{ señal: 'sport', es: cfg.id }],
    repite: 'siempre',
    reparto: { entrenador: { rol: 'entrenador', deLaSeñal: 'participants', conocido: false } },
    urgencia: 'ahora',
    plazo: { dias: 1, porDefecto: 'que_decida' },
    variantes: [
      { id: 'varios', si: [{ señal: 'nGrupos', min: GRUPOS_QUE_NOMBRA_EL_ENTRENADOR + 1 }], texto: t.pregunta, opciones: opciones(t.resultadoSinHueco) },
      { id: 'con_necesidad', si: [{ señal: 'nGrupos', min: 1 }], texto: t.preguntaConNecesidad, opciones: opciones(t.resultadoSinHuecoDicho) },
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


/** Los textos del aviso de la plaza de más (`{entrenador.nombre}`; el género del personaje, `{yo:o|a}`). */
export interface TextosDePlazaExtra {
  titulo: string;
  /** El entrenador le dice que ha llegado alguien que vale más y que contará menos con él, pero que se queda en el equipo. */
  texto: string;
  /** Opción por defecto: quedarse en el equipo con la plaza de más. */
  opcionQuedarse: string;
  resultadoQuedarse: string;
  /** Decirle que va a probar en otros clubes (la plaza sigue siendo suya hasta que otro club lo coja). */
  opcionProbar: string;
  resultadoProbar: string;
  /** Preguntar qué tiene que mejorar. */
  opcionMejorar: string;
  resultadoMejorar: string;
}

/**
 * El suceso de la plaza de más (`<deporte>.plaza_extra`, decisión del usuario, 18/11/2026): en los fichajes de verano otro jugador que vale más le habría quitado la plaza al personaje, pero el
 * equipo abre una plaza de más (`plazasDeMas`) y se queda: el entrenador le avisa de que contará menos con él. **No cambia la convocatoria**: si no da el nivel, ya juega menos. Por defecto se queda;
 * también puede decir que va a probar en otros clubes (la plaza es suya hasta que otro lo coja) o preguntar qué mejorar. Dispara con `club.plaza_extra`.
 */
export function sucesoDePlazaExtra(cfg: ConfigDeporte, t: TextosDePlazaExtra): AporteDeSucesos {
  return suceso({
    id: `${cfg.id}.plaza_extra`,
    titulo: t.titulo,
    deporte: cfg.id,
    disparo: { al: SHARED_EVENTS.PLAZA_EXTRA },
    ejemploDeSeñal: { sport: cfg.id, clubId: 'club' },
    cuando: [{ señal: 'sport', es: cfg.id }],
    repite: 'siempre',
    reparto: { entrenador: { rol: 'entrenador', delDeportePrincipal: true } },
    // Un aviso del club al cambiar de temporada: se puede pensar unos días.
    urgencia: 'aplazable',
    plazo: { dias: 3, porDefecto: 'quedarse' },
    texto: t.texto,
    opciones: [
      { id: 'quedarse', texto: t.opcionQuedarse, caracter: { disciplina: 2, ambicion: -1 }, efectos: [{ relacion: 'entrenador', afinidad: 2 }, { estado: GEN.motivacion, mas: -2 }], resultado: t.resultadoQuedarse },
      { id: 'probar_fuera', texto: t.opcionProbar, caracter: { ambicion: 2 }, minutos: 5, efectos: [{ estado: GEN.motivacion, mas: 2 }, { relacion: 'entrenador', afinidad: -1 }], resultado: t.resultadoProbar },
      { id: 'mejorar', texto: t.opcionMejorar, caracter: { ambicion: 1, disciplina: 1 }, minutos: 5, efectos: [{ relacion: 'entrenador', afinidad: 2, confianza: 1 }, { entrena: idDeConocimiento(cfg.id), cantidad: 1 }], resultado: t.resultadoMejorar },
    ],
    pruebas: [
      { nombre: 'Al perder la plaza en verano sale el aviso y no pasa nada si no contesta', dado: {}, espero: { sale: true } },
    ],
  });
}


/** Los textos de la salida del club por perder la plaza (`{entrenador.nombre}`, `{señal.plazoHasta}`; el género del personaje, `{yo:o|a}`). */
export interface TextosDePlazaPerdida {
  titulo: string;
  texto: string;
  /** Buscar otro club mientras las pruebas están abiertas. */
  opcionBuscar: string;
  resultadoBuscar: string;
  /** Quedarse entrenando por su cuenta hasta el siguiente plazo. */
  opcionPorMiCuenta: string;
  resultadoPorMiCuenta: string;
  /** Preguntarle qué tiene que mejorar. */
  opcionMejorar: string;
  resultadoMejorar: string;
}

/**
 * El suceso de la salida del club (`<deporte>.plaza_perdida`, decisión del usuario, 22/11/2026): al empezar el curso otro jugador que vale más le ocupa la plaza al personaje y ni con una plaza de más cabe, así que **sale del club**
 * (lo hace el módulo de clubes con `club.plaza_perdida`). Su entrenador se lo dice y le da opciones: buscar otro club (con qué clubes hacen pruebas, `{señal.clubes}`, y hasta cuándo siguen abiertas, `{señal.plazoHasta}`, y la acción «Pedir hacer una prueba…» a mano en el desplegable «Prueba de acceso…»), entrenar por su cuenta o preguntar qué mejorar.
 * Antes era una línea del diario. El entrenador y la fecha vienen en la señal (al llegar ya no es de ese club). Dispara con `club.plaza_perdida`.
 */
export function sucesoDePlazaPerdida(cfg: ConfigDeporte, t: TextosDePlazaPerdida): AporteDeSucesos {
  return suceso({
    id: `${cfg.id}.plaza_perdida`,
    titulo: t.titulo,
    deporte: cfg.id,
    disparo: { al: SHARED_EVENTS.PLAZA_PERDIDA },
    ejemploDeSeñal: { sport: cfg.id, clubId: 'club', participants: [{ npcId: 'entrenador' }], plazoHasta: 'el lunes 14 de septiembre', clubes: 'Real Ciudad C. F. y Unión Deportiva del Barrio' },
    cuando: [{ señal: 'sport', es: cfg.id }],
    repite: 'siempre',
    reparto: { entrenador: { rol: 'entrenador', deLaSeñal: 'participants', conocido: false } },
    // Un aviso al cambiar de temporada: se puede pensar unos días (el plazo de fichajes sigue abierto).
    urgencia: 'aplazable',
    plazo: { dias: 3, porDefecto: 'por_mi_cuenta' },
    texto: t.texto,
    opciones: [
      { id: 'buscar_club', texto: t.opcionBuscar, caracter: { ambicion: 2 }, minutos: 5, efectos: [{ estado: GEN.motivacion, mas: 2 }, { relacion: 'entrenador', afinidad: 1 }], resultado: t.resultadoBuscar },
      { id: 'por_mi_cuenta', texto: t.opcionPorMiCuenta, caracter: { disciplina: 2, ambicion: -1 }, efectos: [{ estado: GEN.motivacion, mas: -1 }], resultado: t.resultadoPorMiCuenta },
      { id: 'mejorar', texto: t.opcionMejorar, caracter: { ambicion: 1, disciplina: 1 }, minutos: 5, efectos: [{ relacion: 'entrenador', afinidad: 2, confianza: 1 }, { entrena: idDeConocimiento(cfg.id), cantidad: 1 }], resultado: t.resultadoMejorar },
    ],
    pruebas: [
      { nombre: 'Al perder la plaza en verano sale el aviso de su entrenador y no pasa nada si no contesta', dado: {}, espero: { sale: true } },
    ],
  });
}


/** Los textos del aviso de que el equipo del personaje no sigue este curso (`{señal.jugadores}` y `{señal.minimo}` en el de pocos niños; el género del personaje, `{yo:o|a}`). */
export interface TextosDeEquipoSinNinos {
  titulo: string;
  /** El club no reúne el mínimo de niños en su categoría: el equipo se cierra. */
  pocos: string;
  /** El club no tiene equipos en la categoría a la que sube. */
  sinCategoria: string;
  /** A su edad el deporte ya no tiene categoría: se acaba el deporte base en el club. */
  finDeCategorias: string;
  opcionBuscar: string;
  resultadoBuscar: string;
  opcionEsperar: string;
  resultadoEsperar: string;
}

/**
 * El suceso del equipo que no sigue (`<deporte>.equipo_sin_ninos`, decisión del usuario, 20/11/2026): al empezar el curso, el equipo del personaje se queda sin niños suficientes (menos del mínimo de una plantilla,
 * así que se cierra) o su club no tiene equipos en la categoría a la que sube. **Sale del club como cualquier niño** (lo hace el módulo de clubes con la señal `club.equipo_sin_ninos`) y tiene que buscarse equipo en
 * el plazo de fichajes, como el resto. Sin reparto: avisa el club o el colegio, no una persona (al llegar la señal ya no es de ese club). Más adelante puede dar pie a una misión para convencer a otros niños de jugar en el equipo.
 */
export function sucesoDeEquipoSinNinos(cfg: ConfigDeporte, t: TextosDeEquipoSinNinos): AporteDeSucesos {
  return suceso({
    id: `${cfg.id}.equipo_sin_ninos`,
    titulo: t.titulo,
    deporte: cfg.id,
    disparo: { al: SHARED_EVENTS.EQUIPO_SIN_NINOS },
    ejemploDeSeñal: { sport: cfg.id, clubId: 'club', motivo: 'pocos', jugadores: 12, minimo: 14 },
    cuando: [{ señal: 'sport', es: cfg.id }],
    repite: 'siempre',
    // Un aviso del club o del colegio al cambiar de categoría: se puede pensar unos días.
    urgencia: 'aplazable',
    plazo: { dias: 3, porDefecto: 'esperar' },
    texto: t.pocos,
    variantes: [
      { id: 'fin_de_categorias', si: [{ señal: 'motivo', es: 'fin_de_categorias' }], texto: t.finDeCategorias },
      { id: 'sin_categoria', si: [{ señal: 'motivo', es: 'sin_categoria' }], texto: t.sinCategoria },
      { id: 'pocos', si: [], texto: t.pocos },
    ],
    opciones: [
      { id: 'buscar', texto: t.opcionBuscar, caracter: { ambicion: 1, disciplina: 1 }, minutos: 5, efectos: [{ estado: GEN.motivacion, mas: 2 }], resultado: t.resultadoBuscar },
      { id: 'esperar', texto: t.opcionEsperar, caracter: { ambicion: -1 }, efectos: [{ estado: GEN.motivacion, mas: -2 }], resultado: t.resultadoEsperar },
    ],
    pruebas: [
      { nombre: 'Al cerrarse el equipo por falta de niños sale el aviso y no pasa nada si no contesta', dado: {}, espero: { sale: true } },
    ],
  });
}
