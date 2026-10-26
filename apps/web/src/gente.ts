import {
  GENTE_CERCANA,
  SERVICES,
  describirApariencia,
  descripcionDeDesconocido,
  nombreEstado,
  type LugaresService,
  type NpcDirectory,
  type NpcRole,
  type NpcView,
  type PresenciaService,
  type RelationsService,
} from '@ds/contracts';
import type { Game } from '@ds/core';

/**
 * Panel «Gente»: las personas del juego con filtros, tarjetas paginadas y una ficha. Quien no conoces sale sin nombre y con la
 * descripción de su aspecto (y lo que es para ti: compañero, rival...) hasta que hables con él o con ella.
 */

type Filtro = 'aqui' | 'conocidos' | 'companeros' | 'profesorado' | 'rivales' | 'vecinos';
type Pestana = 'resumen' | 'aspecto';

const FILTROS: [Filtro, string][] = [
  ['aqui', 'Aquí'],
  ['conocidos', 'Conocidos'],
  ['companeros', 'Compañeros'],
  ['profesorado', 'Profesorado'],
  ['rivales', 'Rivales'],
  ['vecinos', 'Vecinos'],
];
const POR_PAGINA = 12;

const ROL: Record<NpcRole, [string, string]> = {
  companero: ['Compañera', 'Compañero'],
  profesor: ['Profesora', 'Profesor'],
  entrenador: ['Entrenadora', 'Entrenador'],
  rival: ['Rival', 'Rival'],
  vecino: ['Vecina', 'Vecino'],
  amigo: ['Amiga', 'Amigo'],
  familia: ['Familia', 'Familia'],
};

let filtro: Filtro = 'aqui';
let pagina = 0;
let seleccionada: string | null = null;
let pestana: Pestana = 'resumen';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const rol = (n: NpcView) => ROL[n.role][n.gender === 'f' ? 0 : 1];
const conocida = (n: NpcView) => n.known !== false;
const aspecto = (n: NpcView) => (n.rasgos ? descripcionDeDesconocido(n.rasgos.apariencia, n.gender, n.age) : n.gender === 'f' ? 'Una chica' : 'Un chico');

/** Las personas del filtro elegido: en «Aquí» las que tienes cerca (conocidas o no) y en los demás solo las que conoces. */
function personasDe(g: Game, f: Filtro): NpcView[] {
  const dir = g.service<NpcDirectory>(SERVICES.npcs);
  if (!dir) return [];
  if (f === 'aqui') {
    const lugar = g.service<LugaresService>(SERVICES.lugares)?.actual().id;
    return lugar ? (g.service<PresenciaService>(SERVICES.presencia)?.en(lugar, GENTE_CERCANA) ?? []) : [];
  }
  // Fuera de «Aquí» solo se guardan las personas que ya conoces: a quien no conoces solo lo ves cuando lo tienes cerca.
  const conocidas = { known: true };
  return f === 'conocidos' ? dir.list(conocidas)
    : f === 'companeros' ? dir.list({ role: 'companero', ...conocidas })
    : f === 'rivales' ? dir.list({ role: 'rival', ...conocidas })
    : f === 'vecinos' ? dir.list({ role: 'vecino', ...conocidas })
    : [...dir.list({ role: 'profesor', ...conocidas }), ...dir.list({ role: 'entrenador', ...conocidas })];
}

const barra = (nombre: string, pct: number, clase: string) =>
  `<div class="barra-gente"><span>${nombre}</span><div class="bar ${clase}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div></div>`;

function tarjeta(g: Game, n: NpcView): string {
  const rel = g.service<RelationsService>(SERVICES.relaciones)?.get(n.id);
  if (!conocida(n)) {
    return `<button class="tarjeta-gente desconocida" data-gente="ver" data-id="${esc(n.id)}"><b>???</b><span class="rol">${esc(rol(n))}</span><span>${esc(aspecto(n))}</span>${barra('Amistad', 0, 'amistad')}${barra('Confianza', 0, 'confianza')}</button>`;
  }
  const estado = rel ? nombreEstado(rel.estado, n.gender) : rol(n);
  return `<button class="tarjeta-gente" data-gente="ver" data-id="${esc(n.id)}"><b>${esc(n.name)}</b><span class="rol">${esc(estado)}</span><span>${esc(rol(n) === estado ? '' : rol(n))}</span>${barra('Amistad', rel ? Math.max(0, rel.afinidad) : 0, 'amistad')}${barra('Confianza', rel ? rel.confianza : 0, 'confianza')}</button>`;
}

function ficha(g: Game, n: NpcView): string {
  const rel = g.service<RelationsService>(SERVICES.relaciones)?.get(n.id);
  const nombre = conocida(n) ? esc(n.name) : '???';
  const pestanas: [Pestana, string][] = [['resumen', 'Resumen'], ['aspecto', 'Aspecto']];
  let cuerpo: string;
  if (pestana === 'aspecto') {
    cuerpo = `<p>${esc(aspecto(n))}.</p>${n.rasgos ? `<p class="note">${esc(describirApariencia(n.rasgos.apariencia))}.</p>` : ''}`;
  } else if (!conocida(n)) {
    // Preguntar el nombre solo se puede a quien tienes cerca (el motor lo dice en la disponibilidad de la acción).
    const pregunta = g.preview(`relaciones.presentarse.${n.id}`);
    const boton = pregunta?.available
      ? `<button class="action" data-do="${esc(pregunta.id)}"><span class="action-name">Preguntar su nombre</span><span class="action-time">${pregunta.duration} min</span></button>`
      : `<p class="note">${pregunta ? esc(pregunta.reason ?? '') : 'No la tienes cerca: para preguntarle el nombre tienes que coincidir con ella.'}</p>`;
    cuerpo = `<p>${esc(aspecto(n))}.</p><p class="note">Todavía no sabes cómo se llama. ${n.description ? esc(n.description) : ''}</p>${barra('Amistad', 0, 'amistad')}${barra('Confianza', 0, 'confianza')}${boton}`;
  } else {
    const nivel = Object.entries(n.levels).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ');
    cuerpo = `<p>${esc(n.description ?? '')}</p>${rel ? `<p class="note"><b>${esc(nombreEstado(rel.estado, n.gender))}</b></p>` : ''}${barra('Amistad', rel ? Math.max(0, rel.afinidad) : 0, 'amistad')}${barra('Confianza', rel ? rel.confianza : 0, 'confianza')}${nivel ? `<p class="note">Nivel: ${esc(nivel)}</p>` : ''}${n.club ? `<p class="note">Club: ${esc(n.club)}</p>` : ''}`;
  }
  return `<section class="sheet ficha-gente">
    <button data-gente="volver">← Volver</button>
    <h2>${nombre} <small>${esc(rol(n))}</small></h2>
    <nav class="tabs">${pestanas.map(([id, label]) => `<button class="tab" aria-selected="${pestana === id}" data-gente="pestana" data-id="${id}">${label}</button>`).join('')}</nav>
    ${cuerpo}
  </section>`;
}

export function viewPanelGente(g: Game): string {
  if (!g.service<NpcDirectory>(SERVICES.npcs)) return '<section class="sheet"><p class="note">No hay módulo de personas cargado.</p></section>';
  if (seleccionada) {
    const n = g.service<NpcDirectory>(SERVICES.npcs)!.get(seleccionada);
    if (n) return ficha(g, n);
    seleccionada = null;
  }
  const todas = personasDe(g, filtro);
  const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
  pagina = Math.min(pagina, paginas - 1);
  const visibles = todas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const lugar = g.service<LugaresService>(SERVICES.lugares)?.actual().name;
  return `<section class="sheet panel-gente">
    <h2>Gente</h2>
    <nav class="filtros-gente">${FILTROS.map(([id, label]) => `<button class="tab" aria-selected="${filtro === id}" data-gente="filtro" data-id="${id}">${label}</button>`).join('')}</nav>
    <p class="note">${filtro === 'aqui' && lugar ? `En ${esc(lugar.toLowerCase())}: ` : ''}${todas.length} ${todas.length === 1 ? 'persona' : 'personas'}. Pulsa una para ver más.</p>
    <div class="gente-grid">${visibles.map((n) => tarjeta(g, n)).join('') || '<p class="note">No hay nadie.</p>'}</div>
    <div class="paginas-gente"><button data-gente="pagina" data-id="-1" ${pagina === 0 ? 'disabled' : ''}>←</button><span>Página ${pagina + 1} de ${paginas}</span><button data-gente="pagina" data-id="1" ${pagina >= paginas - 1 ? 'disabled' : ''}>→</button></div>
  </section>`;
}

/** Atiende los clics del panel. Devuelve `true` si ha cambiado algo que haya que volver a dibujar. */
export function clicEnGente(el: HTMLElement): boolean {
  const id = el.dataset.id ?? '';
  switch (el.dataset.gente) {
    case 'filtro':
      filtro = id as Filtro;
      pagina = 0;
      return true;
    case 'pagina':
      pagina = Math.max(0, pagina + Number(id));
      return true;
    case 'ver':
      seleccionada = id;
      pestana = 'resumen';
      return true;
    case 'volver':
      seleccionada = null;
      return true;
    case 'pestana':
      pestana = id as Pestana;
      return true;
    default:
      return false;
  }
}

/** Al empezar otra partida se vuelve al principio. */
export function reiniciarGente(): void {
  filtro = 'aqui';
  pagina = 0;
  seleccionada = null;
  pestana = 'resumen';
}
