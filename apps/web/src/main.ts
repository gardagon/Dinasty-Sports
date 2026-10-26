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
} from '@ds/contracts';
import type { ActionOption, ActionResult, Game, GameState } from '@ds/core';
import { cargarPartida, nuevaPartida } from '@ds/game';
import { clicEnDeporte, pestanaDeDeporte, viewDeporte } from './deporte';
import { clicEnGente, genteAqui, reiniciarGente, viewPanelGente } from './gente';
import { crearAlmacen, deJSON, pedirAlmacenamientoPersistente, serializarPartida, type AgendaItem, type Almacen } from './almacen';

/**
 * Interfaz web mínima. Solo habla con el motor (@ds/game / @ds/core): no conoce
 * la lógica de ningún módulo, así que cada módulo nuevo aparece aquí solo.
 */

// ------------------------------------------------------------------ estado de la UI

type Tab = 'hacer' | 'personaje' | 'deporte' | 'gente' | 'relaciones' | 'diario';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const ESTADO = [GEN.energia, GEN.salud, GEN.estres, GEN.motivacion];
/** Stats en las que subir es malo (se pintan al revés). */
const MALO_SI_SUBE = new Set<string>([GEN.estres]);

let game: Game | null = null;
let agenda: AgendaItem[] = [];
let tab: Tab = 'hacer';
let lastResult: { name: string; result: ActionResult; fresh: boolean } | null = null;
let showUnavailable = false;

const app = document.getElementById('app')!;

// ------------------------------------------------------------------ guardado

/** Dónde se guarda (IndexedDB, o en memoria si el navegador no lo permite). Plan: `docs/ALMACENAMIENTO.md`. */
let almacen: Almacen | null = null;
/** Último motivo por el que no se pudo guardar (se enseña en la cabecera). */
let errorDeGuardado: string | null = null;
let guardadoPendiente: ReturnType<typeof setTimeout> | undefined;
let hayCambios = false;
let guardando = false;
let pidioPersistencia = false;

/** Guardar cuesta lo que pesa la partida: se agrupa lo que pasa en medio segundo y nunca se guarda a la vez dos veces. */
function save(): void {
  hayCambios = true;
  if (guardadoPendiente !== undefined) return;
  guardadoPendiente = setTimeout(() => void guardarYa(), 500);
}

async function guardarYa(): Promise<void> {
  if (guardadoPendiente !== undefined) clearTimeout(guardadoPendiente);
  guardadoPendiente = undefined;
  if (guardando || !almacen) return; // si ya está guardando, lo hará de nuevo al acabar si hay cambios
  guardando = true;
  try {
    while (hayCambios && game) {
      hayCambios = false;
      await almacen.guardar(serializarPartida(game, agenda.slice(-60)));
      errorDeGuardado = null;
    }
    if (!pidioPersistencia && almacen.tipo === 'indexeddb') {
      pidioPersistencia = true;
      void pedirAlmacenamientoPersistente();
    }
  } catch (e) {
    console.warn('No se pudo guardar la partida', e);
    errorDeGuardado = e instanceof Error ? e.message : 'error desconocido';
  } finally {
    guardando = false;
    const aviso = document.getElementById('aviso-guardado');
    if (aviso) aviso.textContent = textoDeAvisoDeGuardado();
  }
}

function textoDeAvisoDeGuardado(): string {
  if (errorDeGuardado) return `No se pudo guardar la partida (${errorDeGuardado}). Exporta una copia para no perderla.`;
  return almacen?.tipo === 'memoria' ? 'Este navegador no permite guardar: la partida se perderá al cerrar la pestaña. Puedes exportar una copia.' : '';
}

// Al cerrar o cambiar de pestaña se guarda lo que quede pendiente.
window.addEventListener('pagehide', () => hayCambios && void guardarYa());
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && hayCambios && void guardarYa());

/** Aviso en la pantalla inicial cuando se descarta una partida guardada que ya no sirve (alfa: sin compatibilidad entre versiones). */
let avisoPartidaAntigua = false;

function descartarPartida(): void {
  game = null;
  agenda = [];
  avisoPartidaAntigua = true;
  void almacen?.borrar().catch(() => undefined);
}

async function load(): Promise<void> {
  try {
    const texto = await almacen!.cargar();
    if (!texto) return;
    const data = deJSON(texto);
    // El estado acaba de salir del texto y no lo usa nadie más: no hace falta copiarlo.
    game = cargarPartida(data.state, undefined, { copiar: false });
    agenda = data.agenda;
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
      game = cargarPartida(data.state, undefined, { copiar: false });
      agenda = data.agenda;
      lastResult = null;
      tab = 'hacer';
      reiniciarGente();
      avisoPartidaAntigua = false;
      save();
      render();
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

function viewStart(): string {
  return `<main class="app"><section class="start">
    <h1>Dinasty Sports</h1>
    <p>Un curso escolar, un deporte y cada hora cuenta. Decide en qué inviertes tu tiempo.</p>
    ${avisoPartidaAntigua ? '<p class="note">Tu partida guardada era de una versión anterior y ya no se puede cargar (estamos en fase alfa y el juego cambia mucho). Empieza una nueva.</p>' : ''}
    <form data-form="nueva">
      <label for="nombre">Nombre de tu personaje</label>
      <input id="nombre" name="nombre" maxlength="24" autocomplete="off" value="Alex" required />
      <button class="primary" type="submit">Empezar el curso</button>
    </form>
    <p class="note"><button data-act="importar">Importar una copia de seguridad</button></p>
    <p class="note loss" id="aviso-guardado">${esc(textoDeAvisoDeGuardado())}</p>
  </section></main>`;
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
      <h1 class="clock">${hhmm(t.minuteOfDay)}<small>${DIAS[t.weekday]} · curso ${t.schoolYear + 1}, semana ${t.schoolWeek + 1}<br>${t.period === 'clase' ? `${t.term}.º trimestre` : NOMBRE_PERIODO[t.period]}</small></h1>
      <div class="who"><strong>${esc(g.playerName)}</strong><span class="copias"><button data-act="exportar" title="Descargar una copia de seguridad (JSON)">Exportar</button><button data-act="importar" title="Cargar una copia de seguridad">Importar</button><button data-act="reiniciar">Nueva partida</button></span></div>
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

/** A dónde puedes ir: los vecinos primero y, desplegable, todo el mapa con lo que cuesta. Va separado de lo que se hace en el lugar. */
function viewViaje(g: Game): string {
  const svc = g.service<LugaresService>(SERVICES.lugares);
  if (!svc) return '';
  const aqui = svc.actual();
  const opcion = (id: string) => g.preview(`lugares.ir_${id}`);
  const boton = (id: string, extra = '') => {
    const o = opcion(id);
    return o ? actionButton({ ...o, name: `${o.name.replace(/^Ir a /, '')}${extra}`.replace(/^./, (c) => c.toUpperCase()) }) : '';
  };
  const cerca = svc.vecinos().map((v) => boton(v.lugar.id)).join('');
  const grupos = new Map<string, string[]>();
  for (const l of svc.lugares()) {
    if (l.id === aqui.id) continue;
    grupos.set(l.grupo, [...(grupos.get(l.grupo) ?? []), boton(l.id)]);
  }
  const todo = [...grupos].map(([grupo, botones]) => `<h4>${esc(grupo)}</h4><div class="actions">${botones.join('')}</div>`).join('');
  return `<section class="sheet lugar">
    <h3>Viajar</h3>
    <div class="actions">${cerca}</div>
    <details class="viaje-rapido"><summary>Viaje rápido</summary>${todo}</details>
  </section>`;
}

/** Los planes acordados que están por llegar (con quién, qué, cuándo y dónde). */
function viewPlanes(g: Game): string {
  const rel = g.service<RelationsService>(SERVICES.relaciones);
  const dir = g.service<NpcDirectory>(SERVICES.npcs);
  const planes = rel?.planes() ?? [];
  if (!planes.length) return '';
  const cuando = (d: number) => (d === g.time.day ? 'hoy' : d === g.time.day + 1 ? 'mañana' : `dentro de ${d - g.time.day} días`);
  const filas = planes
    .map((p) => `<li><b>${esc(dir?.get(p.npcId)?.name ?? p.npcId)}</b>: ${esc(p.actividad)} ${cuando(p.dia)} a las ${hhmm(p.minuto)} (${esc(p.lugar)})</li>`)
    .join('');
  return `<section class="sheet"><h3>Planes</h3><ul class="planes">${filas}</ul><p class="note">Llega a tiempo: si no apareces, pierdes afinidad y confianza.</p></section>`;
}

function viewActions(g: Game): string {
  // Los desplazamientos se hacen desde la pantalla del lugar, no desde la lista de acciones.
  // Los desplazamientos se hacen desde la pantalla del lugar y preguntar nombres, desde el panel «Gente».
  // Con las personas se interactúa desde su ficha, en «Gente».
  const opts = g.listActions({ omitir: (d) => d.id.startsWith('relaciones.') }).filter((o) => o.module !== 'lugares');
  const groups = new Map<string, ActionOption[]>();
  for (const o of opts) {
    if (!o.available && !showUnavailable) continue;
    groups.set(o.group, [...(groups.get(o.group) ?? []), o]);
  }
  const hidden = opts.filter((o) => !o.available).length;
  const html = [...groups]
    .map(([group, list]) => `<h3>${esc(group)}</h3><div class="actions">${list.map(actionButton).join('')}</div>`)
    .join('');
  return `<section class="sheet">
    ${html || '<p class="note">Ahora mismo no puedes hacer nada. Descansa un rato para que pase el tiempo.</p>'}
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
      const deporte = p.deporte ? `${PRACTICA_TEXTO[p.practica]} (${p.deporte})` : PRACTICA_TEXTO[p.practica];
      const perksPadre = MOSTRAR_GENETICA ? ` Perks: ${textoPerks(p.perks)}. Origen: ${describirOrigen(p.rasgos.origen)}. Apariencia: ${describirApariencia(p.rasgos.apariencia)}. Carácter: ${describirCaracter(p.rasgos.caracter)}. Intereses: ${textoIntereses(p.rasgos.intereses, 'npc')}.` : '';
      return `<p class="note"><b>${p.gender === 'f' ? 'Madre' : 'Padre'}:</b> ${esc(p.nombre)}, ${p.edad} años, ${Math.round(p.alturaCm)} cm. ${esc(deporte)}. Apoyo ${p.apoyo}, expectativas ${p.expectativas}, tiempo en casa ${p.tiempoEnCasa}.${esc(perksPadre)}</p>`;
    })
    .join('');
  const hermanos = f
    .siblings()
    .map((h) => {
      const rasgos = MOSTRAR_GENETICA && h.rasgos ? ` Carácter: ${describirCaracter(h.rasgos.caracter)}. Intereses: ${textoIntereses(h.rasgos.intereses, 'npc')}.` : '';
      const nivel = h.levels.atletismo !== undefined ? ` Atletismo ${Math.round(h.levels.atletismo)}.` : '';
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
  const curso = g.service<StudiesService>(SERVICES.estudios)?.courseName();
  const clubes = g.service<ClubDirectory>(SERVICES.clubes);
  const club = clubes ? (clubes.membership('atletismo')?.nombre ?? 'Sin club') : undefined;
  return `<section class="sheet"><h2>${esc(g.playerName)}</h2>
    <dl class="identity">
      <div><dt>Edad</dt><dd>${id.age} años</dd></div>
      <div><dt>Altura</dt><dd>${fmt(id.heightCm)} cm</dd></div>
      <div><dt>Peso</dt><dd>${fmt(id.weightKg)} kg</dd></div>
      <div><dt>Dominancia</dt><dd>${id.leftHanded ? 'Zurdo' : 'Diestro'}</dd></div>
      <div><dt>Complexión</dt><dd>${COMPLEXION[id.bodyType]}</dd></div>
      ${curso ? `<div><dt>Curso</dt><dd>${esc(curso)}</dd></div>` : ''}
      ${club ? `<div><dt>Club de atletismo</dt><dd>${esc(club)}</dd></div>` : ''}
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
    .filter((s) => g.hiddenPotential(s.def.id) !== undefined)
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
    <p class="note">Topes genéticos ocultos. Cada capacidad la hereda UN solo padre (la flecha marca cuál; la mitad de cada uno, al azar) con una variación de ±20 %, sin punto intermedio. Las asignaturas y las habilidades de atletismo no se heredan: salen de las capacidades que las apoyan más una aptitud propia (derivado). Se ocultará al pasar a beta.</p>
  </section>`;
}

/** Mientras dure la fase de pruebas se enseña también la cifra de preparación de cada asignatura. Ponlo en `false` al pasar a beta. */
const MOSTRAR_CIFRAS_ASIGNATURAS = true;

function viewCharacter(g: Game): string {
  const estudios = g.service<StudiesService>(SERVICES.estudios);
  const groups = new Map<string, string[]>();
  // Solo se muestran las asignaturas del curso actual.
  const activas = g.service<StudiesService>(SERVICES.estudios)?.activeSubjects();
  for (const s of g.registry.statList) {
    if (s.def.category === 'estado' || s.def.hidden) continue;
    if (activas && s.module === 'estudios' && !activas.includes(s.def.id)) continue;
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

function viewResults(g: Game): string {
  const parts: string[] = [];
  const est = g.service<StudiesService>(SERVICES.estudios);
  if (est) {
    const m = est.average();
    const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
    const exs = est.upcomingExams(14);
    const proximos = exs.length
      ? `<ul class="note">${exs.map((e) => `<li><b>${esc(e.name)}</b> (${{ parcial1: 'parcial 1', parcial2: 'parcial 2', global: 'global' }[e.tipo]}): ${e.inDays === 0 ? 'hoy' : e.inDays === 1 ? 'mañana' : `el ${dias[e.day % 7]} (en ${e.inDays} días)`}</li>`).join('')}</ul>`
      : '<span class="note">No hay exámenes a la vista.</span>';
    const hoy = g.time.isSchoolDay ? est.timetable(g.time.weekday).map((id) => esc(g.registry.stats.get(id)?.def.name ?? id)).join(', ') : '';
    parts.push(`<p>Nota media reciente: <b>${m === null ? 'sin exámenes aún' : m.toFixed(1)}</b><br><span class="note">Faltas: ${est.absences()}. Cada trimestre: dos parciales y el global (40 % la media de los parciales, 60 % el global).</span></p>
      <h3>Exámenes próximos</h3>${proximos}${hoy ? `<p class="note">Hoy hay clase de: ${hoy}.</p>` : ''}`);
  }
  const atl = g.moduleState<{ mejorMarca: number | null; carreras: { position: number; total: number }[] } | undefined>('atletismo');
  if (atl) {
    const ult = atl.carreras[atl.carreras.length - 1];
    parts.push(`<p>Mejor marca en 400 m: <b>${atl.mejorMarca === null ? 'sin carreras aún' : `${atl.mejorMarca.toFixed(2)} s`}</b><br><span class="note">${ult ? `Última carrera: ${ult.position}º de ${ult.total}.` : 'Las carreras son los sábados por la mañana.'}</span></p>`);
  }
  return parts.length ? `<section class="sheet"><h2>Resultados</h2>${parts.join('')}</section>` : '';
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
  const items = dir
    .list({ known: true })
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
      const t = timeView(l.minute);
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
    ...(deporte ? ([['deporte', deporte.etiqueta, deporte.inactivo]] as [Tab, string, string?][]) : []),
    ['gente', `Gente (${genteAqui(g)})`],
    ['relaciones', 'Relaciones'],
    ['diario', 'Diario'],
  ];
  let main = '';
  let side = '';
  if (tab === 'hacer') {
    main = viewLugar(g) + viewResult() + viewActions(g);
    side = viewViaje(g) + viewPlanes(g) + viewResults(g);
  } else if (tab === 'personaje') {
    main = viewIdentity(g) + viewCharacter(g);
    side = viewResults(g);
  } else if (tab === 'deporte') main = viewDeporte(g);
  else if (tab === 'gente') main = viewResult() + viewPanelGente(g);
  else if (tab === 'relaciones') main = viewPeople(g);
  else main = viewLog(g);

  return `<main class="app">
    ${viewDay(g)}
    <nav class="tabs" role="tablist">${tabs
      .map(([id, label, inactivo]) => `<button class="tab" role="tab" aria-selected="${tab === id}" data-tab="${id}"${inactivo ? ` disabled title="${esc(inactivo)}"` : ''}>${label}</button>`)
      .join('')}</nav>
    <div class="layout"><div class="main">${main}</div><aside class="side">${side}</aside></div>
  </main>`;
}

function render(): void {
  app.innerHTML = game ? viewGame(game) : viewStart();
}

// ------------------------------------------------------------------ interacción

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-do],[data-tab],[data-act],[data-gente],[data-deporte]');
  if (el?.dataset.act === 'importar') {
    importarPartida();
    return;
  }
  if (!el || !game) return;
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
  if (el.dataset.act === 'reiniciar') {
    if (confirm('¿Empezar una partida nueva? Se perderá la actual.')) {
      hayCambios = false;
      void almacen?.borrar().catch(() => undefined);
      game = null;
      agenda = [];
      lastResult = null;
      render();
    }
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

app.addEventListener('submit', (e) => {
  const form = e.target as HTMLFormElement;
  if (form.dataset.form !== 'nueva') return;
  e.preventDefault();
  const nombre = (new FormData(form).get('nombre') as string).trim() || 'Alex';
  game = nuevaPartida({ playerName: nombre });
  agenda = [];
  lastResult = null;
  tab = 'hacer';
  reiniciarGente();
  save();
  render();
});

async function iniciar(): Promise<void> {
  app.innerHTML = '<main class="app"><p class="note">Cargando…</p></main>';
  almacen = await crearAlmacen();
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
