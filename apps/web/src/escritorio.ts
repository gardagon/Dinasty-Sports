import './escritorio.css';
import { ID_DEL_PERSONAJE, SERVICES, deportePrincipal, type ClubDirectory, type DeporteView, type IdentityService, type LogTable } from '@ds/contracts';
import type { Game } from '@ds/core';
import { deportesDe } from './deporte';
import { viewRetrato } from './retrato';

/**
 * Composición para pantallas anchas (PROTOTIPOS, detrás de una opción en Opciones). No dibuja nada nuevo de la partida: coloca de otra forma las
 * mismas funciones `view*` de `main.ts` (que le llegan en `Vistas`) y añade dos resúmenes pequeños (el personaje y el deporte) hechos solo con datos
 * que ya publican los módulos. El móvil y el diseño actual no pasan por aquí: `usaEscritorio()` es `false` mientras la opción esté en «Móvil».
 *
 * Tres prototipos (se elige en Opciones):
 *  - **A · Tres columnas**: barra del día arriba; personaje, pendientes y planes a la izquierda; la pestaña elegida en el centro; diario y deporte a la derecha.
 *  - **B · Dos pestañas a la vez**: la barra del día arriba y dos paneles, cada uno con su pestaña, uno al lado del otro.
 *  - **C · Panel**: «Qué hacer» pasa a ser un tablero con todo a la vista (acciones, viajes, deporte, gente, planes y diario); las demás pestañas, a pantalla ancha.
 */

export type Diseno = 'automatico' | 'escritorio' | 'movil';
export type Prototipo = 'a' | 'b' | 'c';
export const DISENOS: readonly { id: Diseno; nombre: string }[] = [
  { id: 'movil', nombre: 'Móvil (como ahora)' },
  { id: 'automatico', nombre: 'Automático (escritorio desde 1280 px)' },
  { id: 'escritorio', nombre: 'Escritorio (siempre, si cabe)' },
];
export const PROTOTIPOS: readonly { id: Prototipo; nombre: string }[] = [
  { id: 'a', nombre: 'A · Tres columnas' },
  { id: 'b', nombre: 'B · Dos pestañas a la vez' },
  { id: 'c', nombre: 'C · Panel' },
];
/** Ancho (px) desde el que «Automático» usa la composición de escritorio, y mínimo para «Escritorio». */
export const ANCHO_AUTOMATICO = 1280;
const ANCHO_MINIMO = 1000;

const CLAVE_DISENO = 'ds.diseno';
const CLAVE_PROTOTIPO = 'ds.prototipo';

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function escribir(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: la elección dura hasta recargar */
  }
}

let diseno: Diseno = (DISENOS.find((d) => d.id === leer(CLAVE_DISENO))?.id ?? 'movil') as Diseno;
let prototipo: Prototipo = (PROTOTIPOS.find((p) => p.id === leer(CLAVE_PROTOTIPO))?.id ?? 'a') as Prototipo;

export const disenoActual = (): Diseno => diseno;
export const prototipoActual = (): Prototipo => prototipo;

/** ¿Se usa ahora la composición de escritorio? Con «Móvil» nunca; con «Automático» desde 1280 px; con «Escritorio» desde 1000 px. */
export function usaEscritorio(): boolean {
  if (diseno === 'movil' || typeof window === 'undefined') return false;
  return window.innerWidth >= (diseno === 'automatico' ? ANCHO_AUTOMATICO : ANCHO_MINIMO);
}

/** Avisa cuando la ventana cruza el ancho en que cambia el diseño (para volver a dibujar). */
export function vigilarAncho(redibujar: () => void): void {
  let antes = usaEscritorio();
  window.addEventListener('resize', () => {
    const ahora = usaEscritorio();
    if (ahora !== antes) {
      antes = ahora;
      redibujar();
    }
  });
}

/** Los dos selectores de Opciones: el diseño y el prototipo de escritorio. */
export function viewOpcionesDeDiseno(): string {
  const lista = (id: string, xs: readonly { id: string; nombre: string }[], actual: string) =>
    `<select id="${id}">${xs.map((x) => `<option value="${x.id}"${x.id === actual ? ' selected' : ''}>${x.nombre}</option>`).join('')}</select>`;
  return `<h3>Diseño</h3>
    <p><label>Diseño ${lista('diseno-modo', DISENOS, diseno)}</label></p>
    <p><label>Prototipo de escritorio ${lista('diseno-prototipo', PROTOTIPOS, prototipo)}</label></p>
    <p class="note">Solo para pantallas anchas. «Móvil» deja la web como estaba.</p>`;
}

/** Atiende los cambios de esos selectores. `true` si hay que volver a dibujar. */
export function cambioEnDiseno(el: HTMLElement): boolean {
  if (!(el instanceof HTMLSelectElement)) return false;
  if (el.id === 'diseno-modo' && DISENOS.some((d) => d.id === el.value)) {
    diseno = el.value as Diseno;
    escribir(CLAVE_DISENO, diseno);
    return true;
  }
  if (el.id === 'diseno-prototipo' && PROTOTIPOS.some((p) => p.id === el.value)) {
    prototipo = el.value as Prototipo;
    escribir(CLAVE_PROTOTIPO, prototipo);
    return true;
  }
  return false;
}

// ------------------------------------------------------------------ composición

type Vista = (g: Game) => string;
/** Las funciones que dibujan cada pieza (las de `main.ts`, `deporte.ts` y `gente.ts`). */
export interface Vistas {
  dia: Vista;
  lugar: Vista;
  resultado: () => string;
  pendientes: Vista;
  acciones: Vista;
  viaje: Vista;
  planes: Vista;
  identidad: Vista;
  personaje: Vista;
  estudios: Vista;
  deporte: Vista;
  gente: Vista;
  relaciones: Vista;
  recuerdos: Vista;
  diario: Vista;
  pruebas: Vista;
}
export type Pestana = 'hacer' | 'personaje' | 'estudios' | 'deporte' | 'gente' | 'relaciones' | 'diario';
export interface ContextoDeEscritorio {
  tab: string;
  tabs: readonly (readonly [string, string, string?])[];
  vistas: Vistas;
}

/** El contenido de una pestaña a pantalla ancha (en el prototipo C, «Qué hacer» es el panel). */
function contenido(g: Game, id: string, c: ContextoDeEscritorio): string {
  const v = c.vistas;
  switch (id) {
    case 'hacer':
      return prototipo === 'c' ? panel(g, v) : `<div class="esc-dos">${`<div>${v.lugar(g)}${v.acciones(g)}</div>`}<div>${v.viaje(g)}${prototipo === 'a' ? '' : v.planes(g)}</div></div>`;
    case 'personaje':
      return `<div class="esc-personaje-pag">${v.identidad(g)}${v.personaje(g)}</div>`;
    case 'estudios':
      return v.estudios(g);
    case 'deporte':
      return `<div class="esc-deporte-pag">${v.deporte(g)}</div>`;
    case 'gente':
      return v.gente(g);
    case 'relaciones':
      return `<div class="esc-relaciones-pag">${v.relaciones(g)}</div>`;
    default:
      return `<div class="esc-dos esc-diario-pag">${v.recuerdos(g)}${v.diario(g)}${v.pruebas(g)}</div>`;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function tablaCompacta(t: LogTable, filas = 8): string {
  // Si es larga y hay una fila marcada (la del personaje), solo las de alrededor.
  let desde = 0;
  let hasta = t.rows.length;
  if (t.rows.length > filas && t.highlight !== undefined) {
    desde = Math.max(0, Math.min(t.highlight - Math.floor(filas / 2), t.rows.length - filas));
    hasta = desde + filas;
  } else if (t.rows.length > filas) hasta = filas;
  const cls = (i: number) => (t.align?.[i] === 'right' ? ' class="num"' : '');
  const head = t.header.map((h, i) => `<th${cls(i)}>${esc(h)}</th>`).join('');
  const rows = t.rows
    .slice(desde, hasta)
    .map((r, i) => `<tr${desde + i === t.highlight ? ' class="me"' : ''}>${r.map((x, j) => `<td${cls(j)}>${esc(x)}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

/** El deporte que se practica (el del club al que se pertenece, o el primero activo). */
function deporteActivo(g: Game): DeporteView | undefined {
  const todos = deportesDe(g).filter((d) => !d.inactivo);
  const principal = deportePrincipal(g.service<ClubDirectory>(SERVICES.clubes), todos.map((d) => d.id));
  return todos.find((d) => d.id === principal) ?? todos[0];
}

/** Resumen del deporte: sus datos, la próxima prueba, el último partido y la clasificación alrededor del personaje. */
function resumenDeDeporte(g: Game): string {
  const d = deporteActivo(g);
  if (!d) return '';
  const t = d.temporada;
  const ultima = [...t.pruebas].reverse()[0];
  const clasificacion = d.clasificaciones[0];
  return `<section class="sheet esc-deporte-resumen">
    <h3>${esc(d.nombre)} <small>${esc(t.etiqueta)}</small></h3>
    <p class="note"><b>Próxima prueba:</b> ${esc(t.proxima)}</p>
    ${ultima ? `<p class="note"><b>Última:</b> semana ${ultima.semana} · ${esc(ultima.titulo)} · <b>${ultima.resultado ? esc(ultima.resultado) : `${ultima.posicion}º de ${ultima.total}`}</b></p>` : ''}
    <dl class="identity">${d.resumen.filter((r) => r.valor.length <= 24).slice(0, 4).map((r) => `<div><dt>${esc(r.etiqueta)}</dt><dd>${esc(r.valor)}</dd></div>`).join('')}</dl>
    ${clasificacion ? `<h4>${esc(clasificacion.titulo)}</h4>${tablaCompacta(clasificacion.tabla)}` : ''}
  </section>`;
}

/** El personaje en pequeño: su retrato y lo esencial. */
function resumenDelPersonaje(g: Game): string {
  const id = g.service<IdentityService>(SERVICES.identidad)?.view();
  const dato = (e: string, x: string) => `<div><dt>${e}</dt><dd>${x}</dd></div>`;
  return `<section class="sheet esc-yo">
    <h3>${esc(g.playerName)}</h3>
    <div class="esc-yo-cuerpo">${viewRetrato(g, ID_DEL_PERSONAJE)}
    ${id ? `<dl class="identity">${dato('Edad', `${id.age} años`)}${dato('Altura', `${Math.round(id.heightCm)} cm`)}${dato('Peso', `${Math.round(id.weightKg)} kg`)}</dl>` : ''}</div>
  </section>`;
}

function barraDePestanas(c: ContextoDeEscritorio, activa: string, atributo: 'data-tab' | 'data-esc-tab', excluir?: string): string {
  return `<div class="tabs-wrap"><nav class="tabs" role="tablist">${c.tabs
    .filter(([id]) => id !== excluir)
    .map(([id, etiqueta, inactivo]) => `<button class="tab" role="tab" aria-selected="${activa === id}" ${atributo}="${id}"${inactivo ? ` disabled title="${esc(inactivo)}"` : ''}>${etiqueta}</button>`)
    .join('')}</nav></div>`;
}

/** El prototipo C: «Qué hacer» como tablero con todo a la vista. */
function panel(g: Game, v: Vistas): string {
  return `<div class="esc-panel">
    <div class="esc-tarjeta esc-t-acciones">${v.lugar(g)}${v.pendientes(g)}${v.acciones(g)}</div>
    <div class="esc-tarjeta">${v.viaje(g)}${v.planes(g)}</div>
    <div class="esc-tarjeta">${resumenDelPersonaje(g)}${resumenDeDeporte(g)}</div>
    <div class="esc-tarjeta esc-t-gente">${v.gente(g)}</div>
    <div class="esc-tarjeta esc-t-diario">${v.diario(g)}</div>
  </div>`;
}

// B: la pestaña del segundo panel (la del primero es la de siempre, `tab`).
let segunda = 'deporte';

/** La página entera de escritorio. */
export function viewEscritorio(g: Game, c: ContextoDeEscritorio): string {
  const v = c.vistas;
  const barra = `<div class="esc-barra">${v.dia(g)}</div>`;
  const ultimo = v.resultado();
  if (prototipo === 'b') {
    const ids = c.tabs.filter(([, , inactivo]) => !inactivo).map(([id]) => id);
    if (segunda === c.tab || !ids.includes(segunda)) segunda = ids.find((id) => id !== c.tab) ?? c.tab;
    return `<main class="app esc esc-b">${barra}
      ${ultimo || v.pendientes(g) ? `<div class="esc-tira">${ultimo}${v.pendientes(g)}</div>` : ''}
      <div class="esc-cuerpo">
        <section class="esc-panel-b">${barraDePestanas(c, c.tab, 'data-tab', segunda)}<div class="esc-scroll">${contenido(g, c.tab, c)}</div></section>
        <section class="esc-panel-b">${barraDePestanas(c, segunda, 'data-esc-tab', c.tab)}<div class="esc-scroll">${contenido(g, segunda, c)}</div></section>
      </div></main>`;
  }
  if (prototipo === 'c') {
    return `<main class="app esc esc-c">${barra}
      ${barraDePestanas({ ...c, tabs: c.tabs.map(([id, e, i]) => (id === 'hacer' ? [id, 'Panel', i] : [id, e, i])) as ContextoDeEscritorio['tabs'] }, c.tab, 'data-tab')}
      ${c.tab === 'hacer' ? `${ultimo ? `<div class="esc-tira">${ultimo}</div>` : ''}<div class="esc-cuerpo esc-sin-scroll">${contenido(g, 'hacer', c)}</div>` : `${ultimo ? `<div class="esc-tira">${ultimo}</div>` : ''}<div class="esc-cuerpo esc-scroll">${contenido(g, c.tab, c)}</div>`}
    </main>`;
  }
  // A
  return `<main class="app esc esc-a">${barra}
    <div class="esc-cuerpo">
      <aside class="esc-izq esc-scroll">${resumenDelPersonaje(g)}${v.pendientes(g)}${v.planes(g)}${resumenDeDeporte(g)}</aside>
      <div class="esc-centro">${barraDePestanas(c, c.tab, 'data-tab')}<div class="esc-scroll">${ultimo}${contenido(g, c.tab, c)}</div></div>
      <aside class="esc-der esc-scroll"><div class="esc-diario-reciente">${v.diario(g)}</div></aside>
    </div></main>`;
}

/** Clics propios de la composición (la pestaña del segundo panel). `true` si hay que volver a dibujar. */
export function clicEnEscritorio(el: HTMLElement): boolean {
  if (el.dataset.escTab) {
    segunda = el.dataset.escTab;
    return true;
  }
  return false;
}
