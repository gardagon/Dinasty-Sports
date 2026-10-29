import './style.css';
import {
  GEN,
  MINUTES_PER_DAY,
  NOMBRE_PERIODO,
  SERVICES,
  timeView,
  type BodyType,
  type ClubDirectory,
  type LugaresService,
  type FamilyService,
  type IdentityService,
  PRACTICA_TEXTO,
  type LogTable,
  type NpcDirectory,
  fechaDelDia,
  type PerksService,
  type ProfileService,
  type Gustos,
  EJES,
  INTERESES,
  NOMBRE_RASGO,
  compatibilidad,
  describirApariencia,
  describirCaracter,
  describirOrigen,
  factorDeCompatibilidad,
  perk,
  type RelationsService,
  nombreEstado,
  type StudiesService,
  type ApellidoPrincipal,
  existePais,
  identidadDeJugador,
  paisPorId,
  idDePonerApodo,
} from '@ds/contracts';
import type { ActionOption, ActionResult, Game, GameState } from '@ds/core';
import { cargarPartida, nuevaPartida } from '@ds/game';
import { hayEstudios, viewEstudios } from './estudios';
import { clicEnDeporte, habilidadesDeDeporte, pestanaDeDeporte, viewDeporte } from './deporte';
import { cambioEnGente, clicEnGente, genteAqui, ordenarPorRelacion, reiniciarGente, viewPanelGente } from './gente';
import { reclamarPestana } from './pestana';
import { cargarPaquetesGuardados, idsImportados, importarPaquete, paisesElegibles } from './paquetes';
import {
  FRECUENCIAS,
  borrarRecuperacion,
  crearAlmacen,
  deJSON,
  escribirFrecuencia,
  esFrecuencia,
  fechaDeJuego,
  guardarRecuperacion,
  leerFrecuencia,
  leerRecuperacion,
  pedirAlmacenamientoPersistente,
  serializarPartida,
  textoDeRecomendacion,
  tocaGuardar,
  type AgendaItem,
  type Almacen,
  type FrecuenciaDeGuardado,
  type Recuperacion,
} from './almacen';

/**
 * Interfaz web mínima. Solo habla con el motor (@ds/game / @ds/core): no conoce
 * la lógica de ningún módulo, así que cada módulo nuevo aparece aquí solo.
 */

// ------------------------------------------------------------------ estado de la UI

type Tab = 'hacer' | 'personaje' | 'estudios' | 'deporte' | 'gente' | 'relaciones' | 'diario';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const ESTADO = [GEN.energia, GEN.salud, GEN.estres, GEN.motivacion];
/** Stats en las que subir es malo (se pintan al revés). */
const MALO_SI_SUBE = new Set<string>([GEN.estres]);

let game: Game | null = null;
let agenda: AgendaItem[] = [];
let tab: Tab = 'hacer';
let lastResult: { name: string; result: ActionResult; fresh: boolean } | null = null;
let showUnavailable = false;

/** Pantallas de antes de jugar: el menú, crear una partida y las opciones. Con una partida guardada también se empieza en el menú («Continuar»). */
type Pantalla = 'menu' | 'nueva' | 'opciones';
let pantalla: Pantalla = 'menu';
let enMenu = true;
const sortearSemilla = (): number => 1 + Math.floor(Math.random() * 0x7ffffffe);
/** La partida que se está creando: la semilla decide el nombre, los apellidos y los padres; «volver a sortear» es otra semilla. */
let nueva: { seed: number; principal: ApellidoPrincipal; pais: string } = { seed: sortearSemilla(), principal: 'padre', pais: 'espana' };
let avisoDeSalir = false;

const app = document.getElementById('app')!;

// ------------------------------------------------------------------ guardado

/** Dónde se guarda (IndexedDB, o en memoria si el navegador no lo permite). Plan: `docs/ALMACENAMIENTO.md`. */
let almacen: Almacen | null = null;
/** Último motivo por el que no se pudo guardar (se enseña en la cabecera). */
let errorDeGuardado: string | null = null;
let guardadoPendiente: ReturnType<typeof setTimeout> | undefined;
/** Hay algo por escribir (lo que pasa mientras se guarda se escribe al acabar). */
let hayCambios = false;
/** Hay cambios que la partida guardada no tiene (con el guardado automático espaciado puede pasar mucho tiempo). */
let sinGuardar = false;
let enCurso: Promise<void> | null = null;
let pidioPersistencia = false;
/** ¿Es esta la pestaña que guarda? Si hay otra abierta con la misma partida, esta no guarda (ver `pestana.ts`). */
let esPrincipal = true;
let frecuencia: FrecuenciaDeGuardado = leerFrecuencia();
/** Día del juego del último guardado, lo que tardó (ms) y si hay una copia de recuperación escrita. */
let ultimoGuardado: { dia: number; minuto: number } | undefined;
let msDeGuardado: number | undefined;
let recuperacionEscrita = false;

/** Se llama tras cada cambio. Guarda según la frecuencia elegida; `forzar` guarda ya sea cual sea (partida nueva, importada, «Guardar partida»). */
function save(forzar = false): void {
  if (!esPrincipal) return;
  sinGuardar = true;
  if (!forzar && !(game && tocaGuardar(frecuencia, ultimoGuardado?.dia, game.time.day))) return;
  hayCambios = true;
  if (guardadoPendiente !== undefined) return;
  guardadoPendiente = setTimeout(() => void guardarYa(), 500);
}

/** Guarda ahora lo pendiente. Si ya se está guardando, espera a que acabe (que repite si hubo cambios). */
function guardarYa(): Promise<void> {
  if (guardadoPendiente !== undefined) clearTimeout(guardadoPendiente);
  guardadoPendiente = undefined;
  if (!almacen || !esPrincipal) return Promise.resolve();
  enCurso ??= escribirPartida().finally(() => {
    enCurso = null;
    const aviso = document.getElementById('aviso-guardado');
    if (aviso) aviso.textContent = textoDeAvisoDeGuardado();
  });
  return enCurso;
}

async function escribirPartida(): Promise<void> {
  const a = almacen!;
  try {
    while (hayCambios && game) {
      hayCambios = false;
      sinGuardar = false;
      const t0 = performance.now();
      const marca = { dia: game.time.day, minuto: game.time.minute };
      try {
        await a.guardar(serializarPartida(game, agenda.slice(-60)));
      } catch (e) {
        sinGuardar = true;
        throw e;
      }
      msDeGuardado = performance.now() - t0;
      ultimoGuardado = marca;
      errorDeGuardado = null;
    }
    // Con todo guardado, la copia de recuperación sobra.
    if (!sinGuardar && recuperacionEscrita) {
      recuperacionEscrita = false;
      await borrarRecuperacion(a).catch(() => undefined);
    }
    if (!pidioPersistencia && a.tipo === 'indexeddb') {
      pidioPersistencia = true;
      void pedirAlmacenamientoPersistente();
    }
  } catch (e) {
    console.warn('No se pudo guardar la partida', e);
    errorDeGuardado = e instanceof Error ? e.message : 'error desconocido';
  }
}

function textoDeAvisoDeGuardado(): string {
  if (!esPrincipal) return 'Esta partida está abierta en otra pestaña: aquí no se guarda nada. Cierra una de las dos; esta se recargará sola cuando la otra se cierre.';
  if (errorDeGuardado) return `No se pudo guardar la partida (${errorDeGuardado}). Exporta una copia para no perderla.`;
  return almacen?.tipo === 'memoria' ? 'Este navegador no permite guardar: la partida se perderá al cerrar la pestaña. Puedes exportar una copia.' : '';
}

/**
 * Al ocultarse o cerrarse la pestaña: si se guarda tras cada acción, se escribe lo pendiente; si no, se guarda aparte una copia de
 * recuperación (la partida guardada no se toca) que se ofrece al volver.
 */
function alOcultar(): void {
  if (!sinGuardar || !game || !almacen || !esPrincipal) return;
  if (frecuencia === 'accion') {
    void guardarYa();
    return;
  }
  recuperacionEscrita = true;
  void guardarRecuperacion(almacen, serializarPartida(game, agenda.slice(-60))).catch((e) => console.warn('No se pudo guardar la copia de recuperación', e));
}
window.addEventListener('pagehide', alOcultar);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && alOcultar());
// El navegador no deja preguntar con botones propios al cerrar la pestaña: solo su aviso genérico, y solo con cambios sin guardar.
window.addEventListener('beforeunload', (e) => {
  if (!sinGuardar || !esPrincipal || !game) return;
  e.preventDefault();
  e.returnValue = '';
});

/** Una copia de recuperación más reciente que la partida guardada, que se ofrece en el menú. */
let recuperacion: Recuperacion | null = null;
/** Lo que se hará cuando el jugador conteste «Guardar y salir / Salir sin guardar / Cancelar». */
let preguntaDeSalida: 'menu' | 'salir' | null = null;
let opcionesAbiertas = false;

/** Aviso en la pantalla inicial cuando se descarta una partida guardada que ya no sirve (alfa: sin compatibilidad entre versiones). */
let avisoPartidaAntigua = false;

function descartarPartida(): void {
  game = null;
  agenda = [];
  avisoPartidaAntigua = true;
  void almacen?.borrar().catch(() => undefined);
}

/** Aviso en la pantalla inicial si la partida guardada es de un país cuyo paquete no está cargado (no se borra: se puede importar y volver). */
let avisoDePaisFaltante = '';

async function load(): Promise<void> {
  try {
    const texto = await almacen!.cargar();
    if (esPrincipal) recuperacion = await leerRecuperacion(almacen!, texto).catch(() => null);
    recuperacionEscrita = recuperacion !== null;
    if (!texto) return;
    const data = deJSON(texto);
    try {
      comprobarPais(data.state);
    } catch (e) {
      avisoDePaisFaltante = e instanceof Error ? e.message : String(e);
      return;
    }
    // El estado acaba de salir del texto y no lo usa nadie más: no hace falta copiarlo.
    game = cargarPartida(data.state, undefined, { copiar: false });
    agenda = data.agenda;
    ultimoGuardado = { dia: game.time.day, minuto: game.time.minute };
  } catch (e) {
    console.warn('No se pudo cargar la partida guardada', e);
    descartarPartida();
  }
}

// ------------------------------------------------------------------ copias de seguridad

function exportarPartida(): void {
  if (!game) return;
  const texto = serializarPartida(game, agenda.slice(-60)).texto;
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  enlace.download = `dinasty-sports-${game.playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

/** Importa un paquete de país de un archivo JSON (se valida, se guarda en el navegador y queda entre los países que se pueden elegir). */
function importarPaqueteDeArchivo(): void {
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = 'application/json,.json';
  entrada.onchange = async () => {
    const archivo = entrada.files?.[0];
    if (!archivo) return;
    try {
      const pais = importarPaquete(await archivo.text());
      alert(`País «${pais.nombre}» importado. Ya lo puedes elegir al crear una partida.`);
      render();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo importar el paquete.');
    }
  };
  entrada.click();
}

/** Una partida de un país cuyo paquete no está cargado no se puede abrir (se jugaría con España sin saberlo). */
function comprobarPais(estado: { pais?: string }): void {
  if (estado.pais && !existePais(estado.pais)) throw new Error(`Esta partida es del país «${estado.pais}», que no está cargado: impórtalo desde Opciones («Importar un paquete de país») y vuelve a abrirla.`);
}

function importarPartida(): void {
  if (game && !confirm('Importar una copia sustituye la partida actual. ¿Seguir?')) return;
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = 'application/json,.json';
  entrada.onchange = async () => {
    const archivo = entrada.files?.[0];
    if (!archivo) return;
    try {
      const data = deJSON(await archivo.text());
      comprobarPais(data.state);
      game = cargarPartida(data.state, undefined, { copiar: false });
      empezarAJugar(data.agenda);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo importar la copia.');
    }
  };
  entrada.click();
}

// ------------------------------------------------------------------ utilidades

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const hhmm = (minuteOfDay: number) =>
  `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
const fmtDur = (m: number) => {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
};
const statName = (id: string) => game?.registry.stats.get(id)?.def.name ?? id;
const pct = (v: number) => `${Math.round(v * 100)} %`;

function signedChange(id: string, d: number): string {
  const bueno = MALO_SI_SUBE.has(id) ? d < 0 : d > 0;
  // En la alfa se enseña el dato exacto de cada cambio, por pequeño que sea (más decimales cuanto menor).
  const m = Math.abs(d);
  const txt = `${d > 0 ? '+' : '−'}${m < 0.1 ? m.toFixed(3) : m < 1 ? m.toFixed(2) : m.toFixed(1)}`;
  return `<span class="${bueno ? 'gain' : 'loss'}">${esc(statName(id))} ${txt}</span>`;
}

// ------------------------------------------------------------------ vistas

function viewInicio(): string {
  if (pantalla === 'nueva') return viewNueva();
  if (pantalla === 'opciones') return viewOpciones();
  return viewMenu();
}

function viewMenu(): string {
  return `<main class="app"><section class="start">
    <h1>Dinasty Sports</h1>
    <p>Un curso escolar, un deporte y cada hora cuenta. Decide en qué inviertes tu tiempo.</p>
    ${avisoDePaisFaltante ? `<p class="note loss">${esc(avisoDePaisFaltante)}</p>` : ''}
    ${viewRecuperacion()}
    ${avisoPartidaAntigua ? '<p class="note">Tu partida guardada era de una versión anterior y ya no se puede cargar (estamos en fase alfa y el juego cambia mucho). Empieza una nueva.</p>' : ''}
    <div class="menu">
      <button class="primary" data-act="ir-nueva">Nueva partida</button>
      <button class="menu-boton" data-act="continuar"${game ? '' : ' disabled'}>Continuar${game ? ` <small>${esc(game.playerName)}</small>` : ''}</button>
      <button class="menu-boton" data-act="importar">Cargar partida</button>
      <button class="menu-boton" data-act="ir-opciones">Opciones</button>
      <button class="menu-boton" data-act="salir">Salir</button>
    </div>
    ${avisoDeSalir ? '<p class="note">Ya puedes cerrar la pestaña: tu partida está guardada.</p>' : ''}
    <p class="note loss" id="aviso-guardado">${esc(textoDeAvisoDeGuardado())}</p>
  </section></main>`;
}

function viewNueva(): string {
  const id = identidadDeJugador(nueva.seed, nueva.principal, paisPorId(nueva.pais));
  const apellido = (quien: ApellidoPrincipal, texto: string, nombre: string) =>
    `<button type="button" class="opcion" data-act="principal" data-quien="${quien}" aria-pressed="${nueva.principal === quien}"><b>${esc(nombre)}</b><small>${texto}</small></button>`;
  return `<main class="app"><section class="start">
    <h1>Nueva partida</h1>
    <label for="pais">País</label>
    <select id="pais">${paisesElegibles().map((p) => `<option value="${esc(p.id)}"${p.id === nueva.pais ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>
    <label for="sexo">Sexo</label>
    <select id="sexo" disabled><option>Masculino</option></select>
    <p class="note">De momento solo hay personaje masculino. La gente (nombres, orígenes y aspecto) es del país que elijas; el calendario, el currículo, las categorías y los horarios de otros países son, por ahora, copia de los de España. Puedes importar más países desde Opciones.</p>
    <label>Nombre</label>
    <p class="nombre-sorteado">${esc(id.nombre)}</p>
    ${
      paisPorId(nueva.pais).apellidosDeLosNacidosAqui === 1
        ? `<label>Apellido</label><p class="nombre-sorteado">${esc(id.delPadre)} <small>el de tu padre (aquí se lleva un solo apellido)</small></p>`
        : `<label>Apellido principal</label>
    <div class="opciones">
      ${apellido('padre', 'primer apellido de tu padre', id.delPadre)}
      ${apellido('madre', 'primer apellido de tu madre', id.delMadre)}
    </div>`
    }
    <p class="te-llamaras">Te llamarás <b>${esc(id.completo)}</b></p>
    <button type="button" class="menu-boton" data-act="sortear">Volver a sortear nombre y apellidos</button>
    <button type="button" class="primary" data-act="empezar">Empezar el curso</button>
    <p class="note"><button type="button" data-act="ir-menu">‹ Volver al menú</button></p>
    ${game ? '<p class="note loss">Ya tienes una partida guardada: al empezar una nueva se perderá.</p>' : ''}
  </section></main>`;
}

function viewOpciones(): string {
  return `<main class="app"><section class="start">
    <h1>Opciones</h1>
    <p>Aún no hay muchas: el juego está en fase alfa.</p>
    <p class="note">Países disponibles: ${paisesElegibles().map((p) => esc(p.nombre) + (idsImportados().includes(p.id) ? ' (importado)' : '')).join(', ')}.</p>
    <div class="menu">
      <button class="menu-boton" data-act="importar-pais">Importar un paquete de país (.json)</button>
      <button class="menu-boton" data-act="exportar"${game ? '' : ' disabled'}>Descargar una copia de seguridad</button>
      <button class="menu-boton" data-act="borrar"${game ? '' : ' disabled'}>Borrar la partida guardada</button>
    </div>
    <p class="note"><button type="button" data-act="ir-menu">‹ Volver al menú</button></p>
  </section></main>`;
}

/** «Hay una partida sin guardar más reciente…»: la copia de recuperación que dejó una pestaña cerrada con cambios. */
function viewRecuperacion(): string {
  if (!recuperacion) return '';
  const r = recuperacion;
  const cuando = r.guardadoEn ? new Date(r.guardadoEn).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }) : '';
  return `<div class="note loss recuperacion"><p>Hay una partida sin guardar más reciente de <b>${esc(r.nombre)}</b> (${esc(fechaDeJuego(r.dia))}${cuando ? `; la pestaña se cerró el ${esc(cuando)}` : ''}). ¿Recuperarla?</p>
    <p><button data-act="recuperar">Recuperar</button> <button data-act="descartar-recuperacion">Descartar</button></p></div>`;
}

/** Ventanas encima de la partida: la pregunta al salir con cambios sin guardar y «Opciones». */
function viewVentana(g: Game | null): string {
  if (preguntaDeSalida) {
    return `<div class="velo" role="dialog" aria-modal="true"><div class="ventana">
      <h2>${preguntaDeSalida === 'salir' ? 'Salir' : 'Volver al menú'}</h2>
      <p>Tienes cambios sin guardar${ultimoGuardado ? ` (lo último guardado es del ${esc(fechaDeJuego(ultimoGuardado.dia))})` : ''}. ¿Qué quieres hacer?</p>
      <p class="botones"><button data-act="salida-guardar">Guardar y salir</button><button data-act="salida-sin-guardar">Salir sin guardar</button><button data-act="salida-cancelar">Cancelar</button></p>
    </div></div>`;
  }
  if (!opcionesAbiertas || !g || enMenu) return '';
  const opciones = FRECUENCIAS.map((f) => `<option value="${f.id}"${f.id === frecuencia ? ' selected' : ''}>${esc(f.nombre)}</option>`).join('');
  return `<div class="velo" role="dialog" aria-modal="true"><div class="ventana">
    <h2>Opciones</h2>
    <p><button data-act="guardar">Guardar partida</button></p>
    <p class="note" id="ultimo-guardado">${ultimoGuardado ? `Último guardado: ${esc(fechaDeJuego(ultimoGuardado.dia))}, ${hhmm(ultimoGuardado.minuto % MINUTES_PER_DAY)}.` : 'Aún no se ha guardado en esta sesión.'}${sinGuardar ? ' Hay cambios sin guardar.' : ''}</p>
    <p><label>Guardado automático <select id="frecuencia">${opciones}</select></label></p>
    ${msDeGuardado === undefined ? '<p class="note">Cuando se haya guardado una vez, aquí verás cuánto tarda y qué frecuencia te recomendamos.</p>' : `<p class="note">${esc(textoDeRecomendacion(msDeGuardado))}</p>`}
    <p class="botones"><button data-act="exportar" title="Descargar una copia de seguridad (JSON)">Exportar</button><button data-act="importar" title="Cargar una copia de seguridad">Importar</button><button data-act="importar-pais">Importar un país</button></p>
    <p class="botones"><button data-act="cerrar-opciones">Cerrar</button></p>
  </div></div>`;
}

function viewDay(g: Game): string {
  const t = g.time;
  const dayStart = t.day * MINUTES_PER_DAY;
  const blocks = agenda
    .map((a) => {
      const s = Math.max(a.start, dayStart);
      const e = Math.min(a.start + a.duration, dayStart + MINUTES_PER_DAY);
      if (e <= s) return '';
      const left = ((s - dayStart) / MINUTES_PER_DAY) * 100;
      const width = ((e - s) / MINUTES_PER_DAY) * 100;
      return `<span class="lane-block${a.rest ? ' descanso' : ''}" style="left:${left}%;width:${width}%" title="${esc(a.name)} · ${hhmm(s - dayStart)}–${hhmm(e - dayStart)}"></span>`;
    })
    .join('');
  const now = (t.minuteOfDay / MINUTES_PER_DAY) * 100;

  const meters = ESTADO.map((id) => {
    const v = g.stat(id);
    const warn = MALO_SI_SUBE.has(id) ? v > 60 : v < 30;
    return `<div class="meter${warn ? ' warn' : ''}">
      <div class="meter-head">${esc(statName(id))}<b>${Math.round(v)}</b></div>
      <div class="bar"><i style="width:${v}%"></i></div>
    </div>`;
  }).join('');

  return `<header class="day">
    <div class="day-top">
      <h1 class="clock">${hhmm(t.minuteOfDay)}<small>${DIAS[t.weekday]} ${fechaDelDia(t.day).conAnio} · curso ${t.schoolYear + 1}, semana ${t.schoolWeek + 1}<br>${t.period === 'clase' ? `${t.term}.º trimestre` : NOMBRE_PERIODO[t.period]}</small></h1>
      <div class="who"><strong>${esc(g.playerName)}</strong><span class="copias"><button data-act="opciones" title="Guardar, guardado automático, exportar e importar">Opciones</button><button data-act="menu">Menú</button></span></div>
    </div>
    <div class="lane" role="img" aria-label="Lo que has hecho hoy">${blocks}<span class="lane-now" style="left:calc(${now}% - 1px)"></span></div>
    <div class="lane-hours"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>24 h</span></div>
    <div class="meters">${meters}</div>
    <p class="note loss" id="aviso-guardado">${esc(textoDeAvisoDeGuardado())}</p>
    <p class="money">Dinero: <b>${g.stat(GEN.dinero).toLocaleString('es-ES', { maximumFractionDigits: 2 })} €</b></p>
  </header>`;
}

function viewTable(t: LogTable): string {
  const cls = (i: number) => (t.align?.[i] === 'right' ? ' class="num"' : '');
  const head = t.header.map((h, i) => `<th${cls(i)}>${esc(h)}</th>`).join('');
  const rows = t.rows
    .map((r, i) => `<tr${i === t.highlight ? ' class="me"' : ''}>${r.map((c, j) => `<td${cls(j)}>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<details class="table" open><summary>${t.header[0] === 'Pos.' ? 'Clasificación' : 'Detalle'}</summary><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></details>`;
}

function viewResult(): string {
  if (!lastResult) return '';
  const { name, result } = lastResult;
  const fresh = lastResult.fresh ? ' fresh' : '';
  lastResult.fresh = false; // la animación solo marca lo que acaba de cambiar
  if (!result.ok) return `<section class="sheet result${fresh}"><p><b>${esc(name)}</b>: ${esc(result.reason ?? '')}</p></section>`;
  const changes = Object.entries(result.changes)
    // Fase alfa: se enseña cada cambio individual (hasta milésimas). Más adelante se valorará marcar solo qué sube.
    .filter(([, d]) => Math.abs(d) >= 0.0005)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([id, d]) => signedChange(id, d))
    .join('');
  const log = result.log
    .map((l) => `<p class="${l.kind === 'aviso' ? 'loss' : ''}">${esc(l.text)}</p>${l.table ? viewTable(l.table) : ''}`)
    .join('');
  return `<section class="sheet result${fresh}" aria-live="polite">
    <p><b>${esc(name)}</b> <span class="note">${fmtDur(result.duration)}${result.efficiency !== 1 ? `, rendimiento ${pct(result.efficiency)}` : ''}</span></p>
    ${changes ? `<div class="changes">${changes}</div>` : ''}
    ${log}
  </section>`;
}

function actionButton(o: ActionOption): string {
  const why: string[] = [];
  if (!o.available) why.push(esc(o.reason ?? 'No disponible'));
  else {
    if (Math.abs(o.efficiency - 1) >= 0.01) why.push(`Rendimiento ${pct(o.efficiency)}`);
    for (const m of o.modifiers) {
      const e = m.result.efficiency ?? 1;
      const cls = e > 1 || (m.result.cost ?? 1) < 1 ? 'up' : 'down';
      if (m.result.reason) why.push(`<span class="${cls}">${esc(m.result.reason)}</span>`);
    }
  }
  return `<button class="action" data-do="${esc(o.id)}" ${o.available ? '' : 'disabled'}>
    <span class="action-name">${esc(o.name)}</span>
    <span class="action-time">${fmtDur(o.duration)}</span>
    ${why.length ? `<span class="action-why">${why.join(' · ')}</span>` : ''}
  </button>`;
}

/** Dónde estás: el nombre y la descripción del lugar. Lo que se puede hacer aquí está debajo y los viajes, aparte (en la columna lateral). */
function viewLugar(g: Game): string {
  const aqui = g.service<LugaresService>(SERVICES.lugares)?.actual();
  return aqui ? `<section class="sheet lugar"><h2>${esc(aqui.name)}</h2><p>${esc(aqui.descripcion)}</p></section>` : '';
}

/**
 * A dónde puedes ir. Moverte **dentro** de un lugar (a su aula, a la sala de profesores…) y **fuera** (a la calle, y de ahí a otras calles y a sus
 * lugares) son cosas distintas y van en bloques separados. El viaje rápido, desplegable, es solo a lugares (nunca a zonas ni a calles) y solo se ofrece estando en una calle.
 */
function viewViaje(g: Game): string {
  const svc = g.service<LugaresService>(SERVICES.lugares);
  if (!svc) return '';
  const aqui = svc.actual();
  const boton = (id: string, nombre?: string) => {
    const o = g.preview(`lugares.ir_${id}`);
    return o ? actionButton({ ...o, name: nombre ?? svc.lugar(id)?.name ?? o.name }) : '';
  };
  // Lo más corto primero (a igualdad, el orden del mapa).
  const pasos = [...svc.pasos()].sort((a, b) => a.minutos - b.minutos);
  const de = (...tipos: string[]) => pasos.filter((p) => tipos.includes(p.tipo));
  const bloque = (titulo: string, ps: typeof pasos, nombre: (p: (typeof pasos)[number]) => string) =>
    ps.length ? `<h4>${esc(titulo)}</h4><div class="actions">${ps.map((p) => boton(p.lugar.id, nombre(p))).join('')}</div>` : '';
  const raiz = aqui.dentroDe ? svc.lugar(aqui.dentroDe) : aqui;
  const del = (n: string) => (n === 'Casa' ? 'de casa' : `del ${n.toLowerCase()}`);
  const html = aqui.calle
    ? bloque('En esta calle', de('lugar'), (p) => `Entrar en ${p.lugar.name.toLowerCase()}`) + bloque('Ir a otra calle', de('otra_calle'), (p) => p.lugar.name)
    : bloque(raiz ? `Dentro ${del(raiz.name)}` : 'Aquí dentro', de('dentro', 'entrada'), (p) => (p.tipo === 'entrada' ? `Volver a la entrada ${del(p.lugar.name)}` : p.lugar.name)) +
      bloque('Salir', de('calle'), (p) => `Salir a la calle (${p.lugar.name})`);
  // Viaje rápido: dentro de cada grupo, el más cercano primero, y los grupos por su lugar más cercano.
  const grupos = new Map<string, { id: string; min: number }[]>();
  for (const l of svc.lugares()) {
    if (l.calle || l.dentroDe || l.id === aqui.id) continue; // el viaje rápido es solo a lugares
    grupos.set(l.grupo, [...(grupos.get(l.grupo) ?? []), { id: l.id, min: svc.minutosA(l.id) ?? Infinity }]);
  }
  const todo = [...grupos]
    .map(([grupo, ls]) => ({ grupo, ls: ls.sort((a, b) => a.min - b.min) }))
    .sort((a, b) => a.ls[0].min - b.ls[0].min)
    .map(({ grupo, ls }) => `<h4>${esc(grupo)}</h4><div class="actions">${ls.map((l) => boton(l.id)).join('')}</div>`)
    .join('');
  return `<section class="sheet lugar">
    <h3>Viajar</h3>
    ${html}
    ${aqui.calle ? `<details class="viaje-rapido"><summary>Viaje rápido (a otro lugar)</summary>${todo}</details>` : ''}
  </section>`;
}

/** Los planes acordados que están por llegar (con quién, qué, cuándo y dónde). */
function viewPlanes(g: Game): string {
  const rel = g.service<RelationsService>(SERVICES.relaciones);
  const dir = g.service<NpcDirectory>(SERVICES.npcs);
  const planes = rel?.planes() ?? [];
  if (!planes.length) return '';
  const cuando = (d: number) => (d === g.time.day ? 'hoy' : d === g.time.day + 1 ? 'mañana' : `dentro de ${d - g.time.day} días`);
  const lugares = g.service<LugaresService>(SERVICES.lugares);
  const filas = planes
    .map(
      (p) =>
        `<li><b>${esc(dir?.get(p.npcId)?.name ?? p.npcId)}</b>: ${esc(p.nombre)} ${cuando(p.dia)} a las ${hhmm(p.minuto)} (${esc(lugares?.lugar(p.lugar)?.name.toLowerCase() ?? p.lugar)}) <button class="action" data-do="${esc(p.cancelar)}"><span class="action-name">Cancelar</span><span class="action-time">5 min</span></button></li>`,
    )
    .join('');
  return `<section class="sheet"><h3>Planes</h3><ul class="planes">${filas}</ul><p class="note">Llega a tiempo: si no apareces, pierdes afinidad y confianza. Si no vas a poder, cancélalo: con tiempo apenas se nota.</p></section>`;
}

function viewActions(g: Game): string {
  // Los desplazamientos se hacen desde la pantalla del lugar, no desde la lista de acciones.
  // Los desplazamientos se hacen desde la pantalla del lugar y preguntar nombres, desde el panel «Gente».
  // Con las personas se interactúa desde su ficha, en «Gente».
  const opts = g.listActions({ omitir: (d) => d.id.startsWith('relaciones.') && d.id !== 'relaciones.al_azar' && d.id !== 'relaciones.jugar_con_otros' }).filter((o) => o.module !== 'lugares');
  const aqui = g.service<LugaresService>(SERVICES.lugares)?.actual().id;
  // Primero lo que se hace en el sitio donde estás (aunque ahora no se pueda): el resto, después.
  const delSitio = new Set(opts.filter((o) => aqui && o.lugar?.includes(aqui)).map((o) => o.group));
  const groups = new Map<string, ActionOption[]>();
  for (const o of [...opts.filter((o) => delSitio.has(o.group)), ...opts.filter((o) => !delSitio.has(o.group))]) {
    if (!o.available && !showUnavailable) continue;
    groups.set(o.group, [...(groups.get(o.group) ?? []), o]);
  }
  const hidden = opts.filter((o) => !o.available).length;
  const html = [...groups]
    .map(([group, list]) => `<h3>${esc(group)}</h3><div class="actions">${list.map(actionButton).join('')}</div>`)
    .join('');
  return `<section class="sheet">
    ${html || '<p class="note">Ahora mismo no puedes hacer nada. Pasa el rato para que avance el tiempo.</p>'}
    ${hidden ? `<button class="toggle-unavailable" data-act="toggle">${showUnavailable ? 'Ocultar lo que no está disponible' : `Ver lo que no está disponible ahora (${hidden})`}</button>` : ''}
  </section>`;
}

const COMPLEXION: Record<BodyType, string> = {
  delgado: 'Delgada',
  normal: 'Normal',
  atletico: 'Atlética',
  musculado: 'Musculosa',
  con_sobrepeso: 'Con sobrepeso',
};

/** Perks en texto: los activos y, entre paréntesis, los que lleva en su pool (solo para las pruebas). */
function textoPerks(p: { activos: readonly string[]; pool: readonly string[] }): string {
  const nombre = (id: string) => perk(id)?.nombre ?? id;
  const activos = p.activos.length ? p.activos.map(nombre).join(', ') : 'ninguno';
  return p.pool.length ? `${activos} (en el pool: ${p.pool.map(nombre).join(', ')})` : activos;
}

function viewFamily(g: Game): string {
  const f = g.service<FamilyService>(SERVICES.familia);
  if (!f) return '';
  const filas = f
    .parents()
    .map((p) => {
      // Lo que practicaron de deporte es herencia (pruebas): no sale en el juego normal.
      const deporte = MOSTRAR_GENETICA ? ` ${p.deporte ? `${PRACTICA_TEXTO[p.practica]} (${p.deporte})` : PRACTICA_TEXTO[p.practica]}.` : '';
      const perksPadre = MOSTRAR_GENETICA ? ` Perks: ${textoPerks(p.perks)}. Origen: ${describirOrigen(p.rasgos.origen)}. Apariencia: ${describirApariencia(p.rasgos.apariencia)}. Carácter: ${describirCaracter(p.rasgos.caracter)}. Intereses: ${textoIntereses(p.rasgos.intereses, 'npc')}.` : '';
      return `<p class="note"><b>${p.gender === 'f' ? 'Madre' : 'Padre'}:</b> ${esc(p.nombre)}, ${p.edad} años, ${Math.round(p.alturaCm)} cm.${esc(deporte)} Apoyo ${p.apoyo}, expectativas ${p.expectativas}, tiempo en casa ${p.tiempoEnCasa}.${esc(perksPadre)}</p>`;
    })
    .join('');
  const hermanos = f
    .siblings()
    .map((h) => {
      const rasgos = MOSTRAR_GENETICA && h.rasgos ? ` Carácter: ${describirCaracter(h.rasgos.caracter)}. Intereses: ${textoIntereses(h.rasgos.intereses, 'npc')}.` : '';
      const nivel = MOSTRAR_GENETICA && h.levels.atletismo !== undefined ? ` Atletismo ${Math.round(h.levels.atletismo)}.` : '';
      return `<p class="note"><b>${h.gender === 'f' ? 'Hermana' : 'Hermano'}:</b> ${esc(h.name)}, ${h.age ?? '?'} años.${nivel}${esc(rasgos)}</p>`;
    })
    .join('');
  return `<h3>Familia ${esc(f.apellidos)}</h3>${filas}${hermanos || '<p class="note">Eres hijo único.</p>'}`;
}

/** Intereses en texto, de más a menos (solo para las pruebas). */
function textoIntereses(i: Record<string, number>, escala: 'npc' | 'jugador'): string {
  const nombre = (id: string) => INTERESES.find((x) => x.id === id)?.nombre ?? id;
  const lista = Object.entries(i)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => `${nombre(id)} ${escala === 'npc' ? '·'.repeat(Math.round(v)) : Math.round(v)}`);
  return lista.length ? lista.join(', ') : 'ninguno';
}

/** Carácter con los ejes marcados y sus valores (solo para las pruebas: al jugador no se le enseñan). */
function textoCaracter(c: Record<string, number>): string {
  return `${describirCaracter(c)} (${EJES.map((e) => `${e.positivo} ${c[e.id] > 0 ? '+' : ''}${c[e.id]}`).join(', ')})`;
}

function textoGustos(g: Gustos): string {
  const n = (xs: string[]) => xs.map((x) => NOMBRE_RASGO[x]).join(' o ');
  const car = Object.entries(g.caracter).map(([id, v]) => `${v > 0 ? EJES.find((e) => e.id === id)!.positivo : EJES.find((e) => e.id === id)!.negativo}`);
  return `pelo ${n(g.fisicos.peloColor)}, ojos ${n(g.fisicos.ojos)}, piel ${n(g.fisicos.piel)}, cara ${n(g.fisicos.cara)}${car.length ? `; de carácter, ${car.join(', ')}` : ''}`;
}

function viewPerfil(g: Game): string {
  if (!MOSTRAR_GENETICA) return '';
  const p = g.service<ProfileService>(SERVICES.perfil)?.view();
  if (!p) return '';
  return `<h3>Origen, apariencia y carácter (solo pruebas)</h3>
    <p class="note"><b>Origen familiar:</b> ${esc(describirOrigen(p.origen))}.</p>
    <p class="note"><b>Apariencia:</b> ${esc(describirApariencia(p.apariencia))}.</p>
    <p class="note"><b>Carácter:</b> ${esc(textoCaracter(p.caracter))}.</p>
    <p class="note"><b>Intereses:</b> ${esc(textoIntereses(p.intereses, 'jugador'))}.</p>
    <p class="note"><b>Gustos:</b> ${esc(textoGustos(p.gustos))}.</p>
    <p class="note">Salen de los padres; los intereses suben con lo que haces. Se ocultarán al pasar a beta.</p>`;
}

function viewPerks(g: Game): string {
  if (!MOSTRAR_GENETICA) return '';
  const v = g.service<PerksService>(SERVICES.perks)?.view();
  if (!v) return '';
  const lista = (xs: { nombre: string; descripcion: string; latente: boolean }[]) =>
    xs.length ? `<ul class="note">${xs.map((x) => `<li><b>${esc(x.nombre)}</b>${x.latente ? ' <small>(latente)</small>' : ''}: ${esc(x.descripcion)}</li>`).join('')}</ul>` : '<p class="note">Ninguno.</p>';
  return `<h3>Perks (solo pruebas)</h3>${lista(v.activos)}${v.pool.length ? `<p class="note">En tu pool (para tus hijos): ${v.pool.map((x) => esc(x.nombre)).join(', ')}.</p>` : ''}<p class="note">Todos se enseñan y su efecto cuenta aunque sean latentes. Se ocultarán al pasar a beta.</p>`;
}

function viewIdentity(g: Game): string {
  const id = g.service<IdentityService>(SERVICES.identidad)?.view();
  if (!id) return '';
  const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `<section class="sheet"><h2>${esc(g.playerName)}</h2>
    <dl class="identity">
      <div><dt>Edad</dt><dd>${id.age} años</dd></div>
      <div><dt>Altura</dt><dd>${fmt(id.heightCm)} cm</dd></div>
      <div><dt>Peso</dt><dd>${fmt(id.weightKg)} kg</dd></div>
      <div><dt>Dominancia</dt><dd>${id.leftHanded ? 'Zurdo' : 'Diestro'}</dd></div>
      <div><dt>Complexión</dt><dd>${COMPLEXION[id.bodyType]}</dd></div>
    </dl>
    ${viewFamily(g)}
    ${viewPerks(g)}
    ${viewPerfil(g)}
  </section>`;
}

/** Mientras dure la fase de pruebas se enseña la genética oculta. Ponlo en `false` al pasar a beta. */
const MOSTRAR_GENETICA = true;

function viewGenetics(g: Game): string {
  if (!MOSTRAR_GENETICA) return '';
  const n = (v: number | undefined) => (v === undefined ? '—' : String(Math.round(v)));
  const filas = g.registry.statList
    .filter((s) => g.hiddenPotential(s.def.id) !== undefined && s.module !== 'estudios' && !habilidadesDeDeporte(g).has(s.def.id))
    .map((s) => {
      const id = s.def.id;
      const origen = g.geneticOrigin(id);
      const celda = (lado: 'padre' | 'madre') => {
        const v = n(g.parentPotential(lado, id));
        return origen === lado ? `<b>${v}</b> ←` : v;
      };
      return `<tr><td>${esc(s.def.name)}</td><td>${celda('padre')}</td><td>${celda('madre')}</td><td><b>${n(g.hiddenPotential(id))}</b>${origen ? '' : ' <small>(derivado)</small>'}</td></tr>`;
    })
    .join('');
  if (!filas) return '';
  return `<section class="sheet"><h2>Genética (solo pruebas)</h2>
    <p class="note"><b>Padre:</b> ${esc(g.parentBias('padre') ?? '—')} (calidad ${Math.round((g.parentQuality('padre') ?? 0) * 100)}) · <b>Madre:</b> ${esc(g.parentBias('madre') ?? '—')} (calidad ${Math.round((g.parentQuality('madre') ?? 0) * 100)})</p>
    <div class="table"><table><thead><tr><th>Capacidad</th><th>Padre</th><th>Madre</th><th>Tope tuyo</th></tr></thead><tbody>${filas}</tbody></table></div>
    <p class="note">Topes genéticos ocultos. Cada capacidad la hereda UN solo padre (la flecha marca cuál; la mitad de cada uno, al azar) con una variación de ±20 %, sin punto intermedio. Las asignaturas y las habilidades de un deporte (que se ven en sus pestañas) no se heredan: salen de las capacidades que las apoyan más una aptitud propia. Se ocultará al pasar a beta.</p>
  </section>`;
}

/** Mientras dure la fase de pruebas se enseña también la cifra de preparación de cada asignatura. Ponlo en `false` al pasar a beta. */
const MOSTRAR_CIFRAS_ASIGNATURAS = true;

function viewCharacter(g: Game): string {
  const estudios = g.service<StudiesService>(SERVICES.estudios);
  const groups = new Map<string, string[]>();
  // Las asignaturas van en la pestaña «Estudios» y las habilidades de un deporte en «Deporte»: aquí solo lo genérico.
  const deSuPestana = habilidadesDeDeporte(g);
  for (const s of g.registry.statList) {
    if (s.def.category === 'estado' || s.def.hidden) continue;
    if (s.module === 'estudios' || deSuPestana.has(s.def.id)) continue;
    const key = s.def.group ?? g.registry.moduleNames.get(s.module) ?? s.module;
    groups.set(key, [...(groups.get(key) ?? []), s.def.id]);
  }
  const nivelEnTexto = (id: string, v: number): string => {
    const texto = estudios?.levelText(id);
    return texto ? `${texto}${MOSTRAR_CIFRAS_ASIGNATURAS ? ` <small>(${Math.round(v)})</small>` : ''}` : String(Math.round(v));
  };
  const rows = [...groups]
    .map(([group, ids]) => {
      const items = ids
        .map((id) => {
          const info = g.registry.stats.get(id)!;
          const v = g.stat(id);
          const span = info.max - info.min;
          const cap = ((g.cap(id) - info.min) / span) * 100;
          const tope = MOSTRAR_GENETICA ? g.hiddenPotential(id) : undefined;
          const topePct = tope === undefined ? undefined : ((tope - info.min) / span) * 100;
          return `<div class="stat" title="Techo actual: ${Math.round(g.cap(id))}${tope === undefined ? '' : ` · Tope genético: ${Math.round(tope)} (solo pruebas)`}">
            <span>${esc(info.def.name)}</span>
            <div class="bar"><i style="width:${((v - info.min) / span) * 100}%"></i>${cap < 99.5 ? `<span class="cap" style="left:${cap}%"></span>` : ''}${topePct === undefined ? '' : `<span class="cap tope" style="left:${topePct}%"></span>`}</div>
            <span class="stat-val">${nivelEnTexto(id, v)}</span>
          </div>`;
        })
        .join('');
      return `<h3>${esc(group)}</h3>${items}`;
    })
    .join('');
  return `<section class="sheet"><h2>Características</h2>${rows}
    <p class="note">La marca gris es tu techo actual: sube con la edad y cuando mejoran las características que lo apoyan.${MOSTRAR_GENETICA ? ' La marca de color es tu tope genético (solo pruebas: se ocultará al pasar a beta).' : ''}</p>
  </section>${viewGenetics(g)}`;
}

/** Mientras dure la fase de pruebas se enseñan las cifras de cada relación. Ponlo en `false` al pasar a beta. */
const MOSTRAR_RELACIONES = true;

function viewPeople(g: Game): string {
  const dir = g.service<NpcDirectory>(SERVICES.npcs);
  if (!dir) return '<section class="sheet"><p class="note">No hay módulo de relaciones cargado.</p></section>';
  const ROL: Record<string, [string, string]> = {
    entrenador: ['Entrenadora', 'Entrenador'],
    profesor: ['Tutora', 'Tutor'],
    companero: ['Compañera', 'Compañero'],
    amigo: ['Amiga', 'Amigo'],
    rival: ['Rival', 'Rival'],
    familia: ['Familia', 'Familia'],
  };
  const rel = g.service<RelationsService>(SERVICES.relaciones);
  const items = ordenarPorRelacion(dir.list({ known: true }), (id) => rel?.get(id))
    .map((n) => {
      const v = rel?.get(n.id);
      const yo = g.service<ProfileService>(SERVICES.perfil)?.view();
      const compat = n.rasgos && yo ? compatibilidad(n.rasgos, yo) : undefined;
      const lvl = Object.entries(n.levels).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ');
      return `<div class="npc">
        <div class="npc-head"><b>${esc(n.name)}</b><span>${n.tags.includes('progenitor') ? (n.gender === 'f' ? 'Madre' : 'Padre') : n.tags.includes('hermano') ? (n.gender === 'f' ? 'Hermana' : 'Hermano') : (ROL[n.role]?.[n.gender === 'f' ? 0 : 1] ?? n.role)}</span></div>
        ${v ? `<div class="note"><b>${nombreEstado(v.estado, n.gender)}</b>${MOSTRAR_RELACIONES ? ` · afinidad ${Math.round(v.afinidad)}, confianza ${Math.round(v.confianza)} (solo pruebas)` : ''}${lvl ? ` · nivel ${esc(lvl)}` : ''}</div>` : ''}
        ${MOSTRAR_RELACIONES && v ? `<div class="bar" title="Afinidad ${Math.round(v.afinidad)}"><i style="width:${(v.afinidad + 100) / 2}%"></i></div>` : ''}
        <div class="note">${esc(n.description ?? '')}</div>
        ${MOSTRAR_RELACIONES && n.rasgos ? `<div class="note">(solo pruebas) Carácter: ${esc(describirCaracter(n.rasgos.caracter))}. Intereses: ${esc(textoIntereses(n.rasgos.intereses, 'npc'))}.${compat === undefined ? '' : ` Compatibilidad contigo: ${Math.round(compat * 100)} % (×${factorDeCompatibilidad(compat).toFixed(2)}).`}</div>` : ''}
      </div>`;
    })
    .join('');
  return `<section class="sheet"><h2>Relaciones</h2>${items}</section>`;
}

function viewLog(g: Game): string {
  const items = [...g.log]
    .reverse()
    .map((l) => {
      const t = timeView(l.minute, g.pais.calendario);
      return `<li><time>${DIAS[t.weekday].slice(0, 3)} ${hhmm(t.minuteOfDay)}</time><span class="${l.kind ?? ''}">${esc(l.text)}</span>${l.table ? `<div class="log-table">${viewTable({ ...l.table }).replace(' open>', '>')}</div>` : ''}</li>`;
    })
    .join('');
  return `<section class="sheet"><h2>Diario</h2>${items ? `<ul class="log">${items}</ul>` : '<p class="note">Aún no ha pasado nada destacable.</p>'}</section>`;
}

function viewGame(g: Game): string {
  const deporte = pestanaDeDeporte(g);
  // Sin club la pestaña del deporte está desactivada: si estabas en ella (dejaste el club), se vuelve a «Qué hacer».
  if (tab === 'deporte' && (!deporte || deporte.inactivo)) tab = 'hacer';
  const tabs: [Tab, string, string?][] = [
    ['hacer', 'Qué hacer'],
    ['personaje', 'Personaje'],
    ...(hayEstudios(g) ? ([['estudios', 'Estudios']] as [Tab, string][]) : []),
    ...(deporte ? ([['deporte', deporte.etiqueta, deporte.inactivo]] as [Tab, string, string?][]) : []),
    ['gente', `Gente (${genteAqui(g)})`],
    ['relaciones', 'Relaciones'],
    ['diario', 'Diario'],
  ];
  let main = '';
  let side = '';
  if (tab === 'hacer') {
    main = viewLugar(g) + viewResult() + viewActions(g);
    side = viewViaje(g) + viewPlanes(g);
  } else if (tab === 'personaje') {
    main = viewIdentity(g) + viewCharacter(g);
  } else if (tab === 'estudios') main = viewEstudios(g);
  else if (tab === 'deporte') main = viewDeporte(g);
  else if (tab === 'gente') main = viewResult() + viewPanelGente(g);
  else if (tab === 'relaciones') main = viewPeople(g);
  else main = viewLog(g);

  return `<main class="app">
    ${viewDay(g)}
    <div class="tabs-wrap">
      <button class="tabs-flecha izq" data-tabscroll="-1" aria-label="Pestañas anteriores" tabindex="-1">‹</button>
      <nav class="tabs" role="tablist">${tabs
        .map(([id, label, inactivo]) => `<button class="tab" role="tab" aria-selected="${tab === id}" data-tab="${id}"${inactivo ? ` disabled title="${esc(inactivo)}"` : ''}>${label}</button>`)
        .join('')}</nav>
      <button class="tabs-flecha der" data-tabscroll="1" aria-label="Más pestañas" tabindex="-1">›</button>
    </div>
    <div class="layout"><div class="main">${main}</div><aside class="side">${side}</aside></div>
  </main>`;
}

/** Las pestañas se desplazan si no caben: se enseñan flechas por el lado donde queda algo oculto. */
function marcarDesbordePestañas(): void {
  const nav = app.querySelector<HTMLElement>('.tabs');
  const wrap = nav?.parentElement;
  if (!nav || !wrap) return;
  wrap.classList.toggle('mas-izq', nav.scrollLeft > 2);
  wrap.classList.toggle('mas-der', nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2);
}
document.addEventListener('scroll', (e) => { if ((e.target as HTMLElement).classList?.contains('tabs')) marcarDesbordePestañas(); }, true);
window.addEventListener('resize', marcarDesbordePestañas);

function render(): void {
  // Al redibujar se conserva el desplazamiento de las pestañas y se asegura que la elegida se vea.
  const antes = app.querySelector<HTMLElement>('.tabs')?.scrollLeft ?? 0;
  app.innerHTML = (game && !enMenu ? viewGame(game) : viewInicio()) + viewVentana(game);
  const nav = app.querySelector<HTMLElement>('.tabs');
  if (nav) {
    nav.scrollLeft = antes;
    const elegida = nav.querySelector<HTMLElement>('[aria-selected="true"]');
    if (elegida && (elegida.offsetLeft < nav.scrollLeft || elegida.offsetLeft + elegida.offsetWidth > nav.scrollLeft + nav.clientWidth)) nav.scrollLeft = elegida.offsetLeft - 24;
    marcarDesbordePestañas();
  }
}

// ------------------------------------------------------------------ interacción

// El cuadro del apodo: el botón lleva el id de la acción con lo escrito (sin redibujar, para no perder el foco).
app.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset?.gente !== 'apodo-campo') return;
  const boton = app.querySelector<HTMLElement>('#apodo-boton');
  if (boton) boton.dataset.do = idDePonerApodo(el.dataset.npc ?? '', el.value);
});

// Los desplegables del formulario de «Proponer quedar para…» (cada cambio redibuja la ficha).
app.addEventListener('change', (e) => {
  const el = e.target as HTMLElement;
  // El país de la nueva partida: cambia los padres (orígenes, nombres y apellidos) que salen de la semilla.
  if (el instanceof HTMLSelectElement && el.id === 'pais') {
    nueva.pais = el.value;
    render();
    return;
  }
  if (el instanceof HTMLSelectElement && el.id === 'frecuencia' && esFrecuencia(el.value)) {
    frecuencia = el.value;
    escribirFrecuencia(frecuencia);
    render();
    return;
  }
  if (el instanceof HTMLSelectElement && game && cambioEnGente(el)) render();
});

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tabscroll],[data-do],[data-tab],[data-act],[data-gente],[data-deporte]');
  if (el?.dataset.act === 'importar') {
    importarPartida();
    return;
  }
  if (el && accionDeMenu(el.dataset.act, el)) return;
  if (!el || !game) return;
  if (el.dataset.tabscroll) {
    const nav = app.querySelector<HTMLElement>('.tabs');
    nav?.scrollBy({ left: Number(el.dataset.tabscroll) * nav.clientWidth * 0.6, behavior: 'smooth' });
    return;
  }
  if (el.dataset.deporte) {
    if (clicEnDeporte(el)) render();
    return;
  }
  if (el.dataset.gente) {
    if (clicEnGente(el)) render();
    return;
  }
  if (el.dataset.tab) {
    tab = el.dataset.tab as Tab;
    render();
    return;
  }
  if (el.dataset.act === 'toggle') {
    showUnavailable = !showUnavailable;
    render();
    return;
  }
  if (el.dataset.act === 'exportar') {
    exportarPartida();
    return;
  }
  const id = el.dataset.do;
  if (id) {
    const opt = game.preview(id);
    const start = game.time.minute;
    const result = game.perform(id);
    if (result.ok && opt) agenda.push({ start, duration: result.duration, name: opt.name, rest: opt.tags.includes('descanso') });
    lastResult = { name: opt?.name ?? id, result, fresh: true };
    save();
    render();
  }
});

/** Acciones de las pantallas de antes de jugar (y «Menú» desde la partida). Devuelve si ha tratado el clic. */
function accionDeMenu(act: string | undefined, el?: HTMLElement): boolean {
  switch (act) {
    case 'menu':
      if (preguntarAntesDeSalir('menu')) return true;
      irAlMenu();
      return true;
    case 'opciones':
      opcionesAbiertas = true;
      render();
      return true;
    case 'cerrar-opciones':
      opcionesAbiertas = false;
      render();
      return true;
    case 'guardar':
      if (!esPrincipal) {
        alert('La partida está abierta en otra pestaña: aquí no se guarda nada.');
        return true;
      }
      save(true);
      void guardarYa().then(render);
      return true;
    case 'salida-cancelar':
      preguntaDeSalida = null;
      render();
      return true;
    case 'salida-guardar':
      save(true);
      void guardarYa().then(() => {
        if (errorDeGuardado) {
          // No se pudo guardar: no se sale, para no perder nada.
          preguntaDeSalida = null;
          alert(`No se pudo guardar la partida (${errorDeGuardado}). Exporta una copia antes de salir.`);
          render();
          return;
        }
        terminarSalida();
      });
      return true;
    case 'salida-sin-guardar':
      void descartarCambios().then(terminarSalida);
      return true;
    case 'recuperar': {
      if (!recuperacion) return true;
      if (!esPrincipal) {
        alert('La partida está abierta en otra pestaña: recupérala desde allí.');
        return true;
      }
      try {
        const data = deJSON(recuperacion.texto);
        comprobarPais(data.state);
        game = cargarPartida(data.state, undefined, { copiar: false });
        recuperacion = null;
        empezarAJugar(data.agenda);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'No se pudo recuperar la partida.');
      }
      return true;
    }
    case 'descartar-recuperacion':
      recuperacion = null;
      recuperacionEscrita = false;
      if (almacen) void borrarRecuperacion(almacen).catch(() => undefined);
      render();
      return true;
    case 'ir-menu':
      pantalla = 'menu';
      render();
      return true;
    case 'ir-nueva':
      nueva = { seed: sortearSemilla(), principal: 'padre', pais: nueva.pais };
      pantalla = 'nueva';
      render();
      return true;
    case 'importar-pais':
      importarPaqueteDeArchivo();
      return true;
    case 'ir-opciones':
      pantalla = 'opciones';
      render();
      return true;
    case 'continuar':
      if (!game) return true;
      enMenu = false;
      render();
      return true;
    case 'principal':
      nueva.principal = (el?.dataset.quien === 'madre' ? 'madre' : 'padre');
      render();
      return true;
    case 'sortear':
      nueva.seed = sortearSemilla();
      render();
      return true;
    case 'empezar':
      if (!esPrincipal) {
        alert('La partida está abierta en otra pestaña: empieza una nueva desde allí (aquí no se guardaría).');
        return true;
      }
      if (game && !confirm('Empezar una partida nueva sustituye la guardada. ¿Seguir?')) return true;
      game = nuevaPartida({ seed: nueva.seed, pais: nueva.pais, playerName: identidadDeJugador(nueva.seed, nueva.principal, paisPorId(nueva.pais)).completo });
      empezarAJugar();
      return true;
    case 'borrar':
      if (!esPrincipal) {
        alert('La partida está abierta en otra pestaña: bórrala desde allí.');
        return true;
      }
      if (confirm('¿Borrar la partida guardada? No se puede deshacer.')) {
        hayCambios = false;
        sinGuardar = false;
        ultimoGuardado = undefined;
        recuperacion = null;
        void almacen?.borrar().catch(() => undefined);
        if (almacen) void borrarRecuperacion(almacen).catch(() => undefined);
        recuperacionEscrita = false;
        game = null;
        agenda = [];
        lastResult = null;
        pantalla = 'menu';
        render();
      }
      return true;
    case 'salir':
      if (preguntarAntesDeSalir('salir')) return true;
      salir();
      return true;
    default:
      return false;
  }
}

function irAlMenu(): void {
  opcionesAbiertas = false;
  enMenu = true;
  pantalla = 'menu';
  avisoDeSalir = false;
  render();
}

function salir(): void {
  // Una pestaña solo se puede cerrar desde el código si la abrió el propio código: si no, se avisa.
  window.close();
  avisoDeSalir = true;
  render();
}

/** Con cambios sin guardar pregunta «Guardar y salir / Salir sin guardar / Cancelar» en vez de salir. Devuelve si ha preguntado. */
function preguntarAntesDeSalir(que: 'menu' | 'salir'): boolean {
  if (!game || !sinGuardar || !esPrincipal) return false;
  preguntaDeSalida = que;
  render();
  return true;
}

function terminarSalida(): void {
  const que = preguntaDeSalida;
  preguntaDeSalida = null;
  if (que === 'salir') salir();
  else irAlMenu();
}

/** «Salir sin guardar»: se tira lo que no está guardado (también la copia de recuperación) y la partida vuelve a lo último guardado. */
async function descartarCambios(): Promise<void> {
  if (guardadoPendiente !== undefined) clearTimeout(guardadoPendiente);
  guardadoPendiente = undefined;
  hayCambios = false;
  sinGuardar = false;
  await enCurso?.catch(() => undefined);
  if (almacen) await borrarRecuperacion(almacen).catch(() => undefined);
  recuperacionEscrita = false;
  game = null;
  agenda = [];
  lastResult = null;
  await load();
}

function empezarAJugar(agendaGuardada: AgendaItem[] = []): void {
  agenda = agendaGuardada;
  recuperacion = null;
  opcionesAbiertas = false;
  lastResult = null;
  tab = 'hacer';
  enMenu = false;
  pantalla = 'menu';
  avisoPartidaAntigua = false;
  reiniciarGente();
  save(true);
  render();
}

async function iniciar(): Promise<void> {
  app.innerHTML = '<main class="app"><p class="note">Cargando…</p></main>';
  almacen = await crearAlmacen();
  // Los paquetes de país que importó el jugador se vuelven a registrar antes de abrir la partida (puede ser de uno de ellos).
  for (const aviso of cargarPaquetesGuardados()) console.warn(aviso);
  // Si la partida ya está abierta en otra pestaña, esta no guarda; cuando la otra se cierre, se recarga con lo último guardado.
  esPrincipal = await reclamarPestana(() => location.reload());
  await load();
  try {
    render();
  } catch (e) {
    // Una partida guardada con otra forma de datos puede cargar y romper al dibujar: se descarta y se empieza de cero.
    console.error('No se pudo dibujar la partida guardada', e);
    descartarPartida();
    render();
  }
}
void iniciar();

// ------------------------------------------------------------------ PWA (instalable y sin conexión)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('No se pudo registrar el service worker', e));
  });
}
