import {
  aforoCercano,
  SERVICES,
  descripcionDeDesconocido,
  edadAparente,
  edadRelativa,
  alturaRelativa,
  type IdentityService,
  nombreSegunEdad,
  NOMBRE_RASGO,
  nombreEstado,
  type LugaresService,
  type NpcDirectory,
  type NpcRole,
  type NpcView,
  type PresenciaService,
  type RelationsService,
  type RelationView,
} from '@ds/contracts';
import type { Game } from '@ds/core';

/**
 * Panel «Gente»: las personas del juego con filtros, tarjetas paginadas y una ficha. Quien no conoces sale sin nombre y con la
 * descripción de su aspecto (y lo que es para ti: compañero, rival...) hasta que hables con él o con ella.
 */

type Filtro = 'aqui' | 'familia' | 'conocidos' | 'companeros' | 'profesorado' | 'rivales' | 'vecinos';
type Pestana = 'resumen' | 'aspecto';

const FILTROS: [Filtro, string][] = [
  ['aqui', 'Aquí'],
  ['familia', 'Familia'],
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
const rol = (n: NpcView) =>
  n.tags.includes('progenitor') ? (n.gender === 'f' ? 'Madre' : 'Padre') : n.tags.includes('hermano') ? (n.gender === 'f' ? 'Hermana' : 'Hermano') : ROL[n.role][n.gender === 'f' ? 0 : 1];
const conocida = (n: NpcView) => n.known !== false;
const aspecto = (n: NpcView) => (n.rasgos ? descripcionDeDesconocido(n.rasgos.apariencia, n.gender, edadAparente(n)) : nombreSegunEdad(n.gender, edadAparente(n)));

/**
 * Orden de todas las listas: de mayor a menor relación (mejor amigo, amigo, conocido, antipatía...), luego amistad y luego confianza.
 * A quien aún no conoces (sin vínculo) se le deja al final; a igualdad, por nombre.
 */
export function ordenarPorRelacion<T extends Pick<NpcView, 'id' | 'name'>>(personas: readonly T[], vinculo: (id: string) => Pick<RelationView, 'nivel' | 'afinidad' | 'confianza'> | undefined): T[] {
  const clave = (n: T) => {
    const v = vinculo(n.id);
    return v ? [v.nivel, v.afinidad, v.confianza] : [-Infinity, 0, 0];
  };
  return [...personas].sort((a, b) => {
    const x = clave(a), y = clave(b);
    return y[0] - x[0] || y[1] - x[1] || y[2] - x[2] || a.name.localeCompare(b.name, 'es');
  });
}

/** Cuánta gente tienes cerca ahora (la de «Aquí»): es el número que lleva la pestaña. */
export function genteAqui(g: Game): number {
  return personasDe(g, 'aqui').length;
}

/** Las personas del filtro elegido, ordenadas por relación, amistad y confianza. */
function personasDe(g: Game, f: Filtro): NpcView[] {
  const relaciones = g.service<RelationsService>(SERVICES.relaciones);
  return ordenarPorRelacion(personasSinOrdenar(g, f), (id) => relaciones?.get(id));
}

/** Las personas del filtro elegido: en «Aquí» las que tienes cerca (conocidas o no) y en los demás solo las que conoces. */
function personasSinOrdenar(g: Game, f: Filtro): NpcView[] {
  const dir = g.service<NpcDirectory>(SERVICES.npcs);
  if (!dir) return [];
  if (f === 'aqui') {
    const lugar = g.service<LugaresService>(SERVICES.lugares)?.actual().id;
    const presencia = g.service<PresenciaService>(SERVICES.presencia);
    return lugar && presencia ? presencia.en(lugar, aforoCercano(lugar, presencia.version)) : [];
  }
  // Fuera de «Aquí» solo se guardan las personas que ya conoces: a quien no conoces solo lo ves cuando lo tienes cerca.
  const conocidas = { known: true };
  return f === 'conocidos' ? dir.list(conocidas)
    : f === 'familia' ? dir.list({ role: 'familia', ...conocidas })
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

/** Todo lo que puedes hacer con esta persona (hablar, quedar, proponer planes...): lo disponible ahora y, aparte, lo que no con el motivo. */
function accionesCon(g: Game, n: NpcView): string {
  const todas = g.listActions({ omitir: (d) => !(d.id.startsWith('relaciones.') && d.id.endsWith(`.${n.id}`)) }).filter((o) => o.id.startsWith('relaciones.') && o.id.endsWith(`.${n.id}`));
  const boton = (o: (typeof todas)[number]) =>
    `<button class="action" data-do="${esc(o.id)}"${o.available ? '' : ' disabled'}><span class="action-name">${esc(o.name)}</span><span class="action-time">${o.duration} min</span>${o.available ? '' : `<span class="action-why">${esc(o.reason ?? '')}</span>`}</button>`;
  const ahora = todas.filter((o) => o.available);
  const luego = todas.filter((o) => !o.available);
  return `<h3>Qué hacer con ${esc(n.name.split(' ')[0])}</h3>
    <div class="actions">${ahora.map(boton).join('') || '<p class="note">Ahora mismo no puedes hacer nada con esta persona.</p>'}</div>
    ${luego.length ? `<details class="viaje-rapido"><summary>Lo que no se puede ahora (${luego.length})</summary><div class="actions">${luego.map(boton).join('')}</div></details>` : ''}`;
}

/** Edad, cumpleaños y altura: lo que sabes (la familia, o lo que has preguntado) con cifras; lo demás, a simple vista respecto a ti. */
function datosDeCuerpo(g: Game, n: NpcView): string {
  const yo = g.service<IdentityService>(SERVICES.identidad)?.view();
  const filas: string[] = [];
  if (n.edadExacta !== undefined) {
    const sabe = n.sabe?.includes('edad');
    const texto = sabe ? `${n.edadExacta} años` : yo ? edadRelativa(n.edadExacta, yo.age) : '';
    if (texto) filas.push(`<div><dt>Edad</dt><dd>${esc(texto)}</dd></div>`);
    // El cumpleaños, aparte (día/mes del calendario): se sabe junto con la edad.
    if (sabe && n.cumple) filas.push(`<div><dt>Cumpleaños</dt><dd>${esc(n.cumple)}</dd></div>`);
  }
  if (n.alturaCm !== undefined && yo) {
    // La altura se ve a ojo respecto a la tuya; la cifra exacta solo la sabes de la familia.
    const texto = n.role === 'familia' ? `${Math.round(n.alturaCm)} cm` : alturaRelativa(n.alturaCm, yo.heightCm, n.gender);
    filas.push(`<div><dt>Altura</dt><dd>${esc(texto)}</dd></div>`);
  }
  return filas.length ? `<dl class="identity">${filas.join('')}</dl>` : '';
}

/** Colegio (si aplica: el tuyo por defecto si es compañero; si no, desconocido hasta que lo preguntes) y clase (solo si es de tu colegio). */
function datosDeEstudios(n: NpcView): string {
  const filas: string[] = [];
  // Los adultos: a qué se dedican (lo que se ve sin preguntar y, preguntando, el detalle) y dónde trabajan.
  if (n.profesion !== undefined) filas.push(`<div><dt>Profesión</dt><dd>${esc(n.sabe?.includes('profesion') ? n.profesion : (n.profesionBasica ?? 'Desconocida'))}</dd></div>`);
  if (n.trabajo !== undefined) filas.push(`<div><dt>Trabajo</dt><dd>${esc(n.sabe?.includes('trabajo') ? n.trabajo : 'Desconocido')}</dd></div>`);
  if (n.colegio !== undefined) filas.push(`<div><dt>Colegio</dt><dd>${esc(n.sabe?.includes('colegio') ? n.colegio : 'Desconocido')}</dd></div>`);
  if (n.clase !== undefined) filas.push(`<div><dt>Clase</dt><dd>${esc(n.sabe?.includes('clase') ? n.clase : 'Desconocida')}</dd></div>`);
  return filas.length ? `<dl class="identity">${filas.join('')}</dl>` : '';
}

function ficha(g: Game, n: NpcView): string {
  const rel = g.service<RelationsService>(SERVICES.relaciones)?.get(n.id);
  const nombre = conocida(n) ? esc(n.name) : '???';
  const pestanas: [Pestana, string][] = [['resumen', 'Resumen'], ['aspecto', 'Aspecto']];
  let cuerpo: string;
  if (pestana === 'aspecto') {
    // La frase ya dice el pelo, los ojos, la piel y los distintivos: aquí solo se añade lo que no dice (la forma de la cara).
    cuerpo = `<p>${esc(aspecto(n))}.</p>${n.rasgos ? `<p class="note">Cara ${esc(NOMBRE_RASGO[n.rasgos.apariencia.cara])}.</p>` : ''}${datosDeCuerpo(g, n)}`;
  } else if (!conocida(n)) {
    // Preguntar el nombre solo se puede a quien tienes cerca (el motor lo dice en la disponibilidad de la acción).
    const pregunta = g.preview(`relaciones.presentarse.${n.id}`);
    const boton = pregunta?.available
      ? `<button class="action" data-do="${esc(pregunta.id)}"><span class="action-name">Preguntar su nombre</span><span class="action-time">${pregunta.duration} min</span></button>`
      : `<p class="note">${pregunta ? esc(pregunta.reason ?? '') : 'No la tienes cerca: para preguntarle el nombre tienes que coincidir con ella.'}</p>`;
    cuerpo = `<p>${esc(aspecto(n))}.</p><p class="note">Todavía no sabes cómo se llama. ${n.description ? esc(n.description) : ''}</p>${barra('Amistad', 0, 'amistad')}${barra('Confianza', 0, 'confianza')}${boton}`;
  } else {
    const nivel = Object.entries(n.levels).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ');
    cuerpo = `<p>${esc(n.description ?? '')}</p>${rel ? `<p class="note"><b>${esc(nombreEstado(rel.estado, n.gender))}</b></p>` : ''}${barra('Amistad', rel ? Math.max(0, rel.afinidad) : 0, 'amistad')}${barra('Confianza', rel ? rel.confianza : 0, 'confianza')}${nivel ? `<p class="note">Nivel: ${esc(nivel)}</p>` : ''}${n.club ? `<p class="note">Club: ${esc(n.club)}</p>` : ''}${datosDeEstudios(n)}`;
  }
  const acciones = pestana === 'resumen' && conocida(n) ? accionesCon(g, n) : '';
  return `<section class="sheet ficha-gente">
    <button data-gente="volver">← Volver</button>
    <h2>${nombre} <small>${esc(rol(n))}</small></h2>
    <nav class="tabs">${pestanas.map(([id, label]) => `<button class="tab" aria-selected="${pestana === id}" data-gente="pestana" data-id="${id}">${label}</button>`).join('')}</nav>
    ${cuerpo}
    ${acciones}
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
