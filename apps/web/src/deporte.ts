import { PREFIJO_DE_DEPORTE, type DeporteService, type DeporteView, type LogTable } from '@ds/contracts';
import type { Game } from '@ds/core';

/**
 * Pestaña «Deporte»: habilidades propias, resumen, todas las pruebas de la temporada con su clasificación y las clasificaciones del año.
 * No conoce ningún deporte: dibuja la vista que publica cada módulo de deporte (`deporte.<id>`).
 */

let elegido: string | null = null;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Los deportes que hay en la partida (uno por cada servicio `deporte.*`). */
export function deportesDe(g: Game): DeporteView[] {
  return [...g.registry.services.keys()]
    .filter((k) => k.startsWith(PREFIJO_DE_DEPORTE))
    .map((k) => g.service<DeporteService>(k)?.view())
    .filter((v): v is DeporteView => !!v);
}

/** Ids de las habilidades propias de los deportes: se ven en la pestaña «Deporte», no en «Personaje». */
export function habilidadesDeDeporte(g: Game): Set<string> {
  return new Set(deportesDe(g).flatMap((d) => d.habilidades));
}

function tabla(t: LogTable): string {
  const cls = (i: number) => (t.align?.[i] === 'right' ? ' class="num"' : '');
  const head = t.header.map((h, i) => `<th${cls(i)}>${esc(h)}</th>`).join('');
  const rows = t.rows.map((r, i) => `<tr${i === t.highlight ? ' class="me"' : ''}>${r.map((c, j) => `<td${cls(j)}>${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function barra(g: Game, id: string): string {
  const info = g.registry.stats.get(id);
  if (!info) return '';
  const span = info.max - info.min;
  const v = g.stat(id);
  const cap = ((g.cap(id) - info.min) / span) * 100;
  return `<div class="stat" title="Techo actual: ${Math.round(g.cap(id))}">
    <span>${esc(info.def.name)}</span>
    <div class="bar"><i style="width:${((v - info.min) / span) * 100}%"></i>${cap < 99.5 ? `<span class="cap" style="left:${cap}%"></span>` : ''}</div>
    <span class="stat-val">${Math.round(v)}</span>
  </div>`;
}

function vista(g: Game, d: DeporteView): string {
  const t = d.temporada;
  const pruebas = t.pruebas.length
    ? [...t.pruebas]
        .reverse()
        .map(
          (p) => `<details class="prueba"><summary><b>Semana ${p.semana}</b> · ${esc(p.titulo)} · <b>${p.posicion}º de ${p.total}</b> · ${esc(p.marca)}${p.record ? ' ⭐' : ''}</summary>${p.tabla ? tabla(p.tabla) : '<p class="note">Sin clasificación guardada.</p>'}</details>`,
        )
        .join('')
    : '<p class="note">Todavía no has competido este curso.</p>';
  const clasificaciones = d.clasificaciones.length
    ? d.clasificaciones.map((c) => `<h4>${esc(c.titulo)}</h4>${tabla(c.tabla)}`).join('')
    : '<p class="note">Las clasificaciones aparecen cuando hayas competido.</p>';
  const anteriores = d.temporadasAnteriores.length
    ? `<h3>Cursos anteriores</h3>${tabla({ header: ['Curso', 'Carreras', 'Mejor puesto', 'Mejor marca'], rows: d.temporadasAnteriores.map((a) => [a.etiqueta, String(a.pruebas), a.mejorPuesto, a.mejorMarca]), align: ['left', 'right', 'left', 'right'] })}`
    : '';
  return `<section class="sheet deporte">
    <h2>${esc(d.nombre)} <small>${esc(d.disciplina)}</small></h2>
    <dl class="identity">${d.resumen.map((r) => `<div><dt>${esc(r.etiqueta)}</dt><dd>${esc(r.valor)}</dd></div>`).join('')}</dl>
    <p class="note"><b>Próxima prueba:</b> ${esc(t.proxima)}</p>
    <h3>Habilidades de ${esc(d.nombre.toLowerCase())}</h3>
    ${d.habilidades.map((id) => barra(g, id)).join('')}
    <p class="note">La marca gris es tu techo actual: sube con la edad y con las características que lo apoyan (las ves en la pestaña del personaje).</p>
  </section>
  <section class="sheet deporte">
    <h2>Temporada · ${esc(t.etiqueta)}</h2>
    <h3>Carreras</h3>${pruebas}
    <h3>Clasificaciones</h3>${clasificaciones}
    ${anteriores}
  </section>`;
}

export function viewDeporte(g: Game): string {
  const todos = deportesDe(g).filter((d) => !d.inactivo);
  if (!todos.length) return '<section class="sheet"><p class="note">No practicas ningún deporte.</p></section>';
  const actual = todos.find((d) => d.id === elegido) ?? todos[0];
  const selector =
    todos.length > 1
      ? `<nav class="filtros-gente">${todos.map((d) => `<button class="tab" aria-selected="${d.id === actual.id}" data-deporte="${esc(d.id)}">${esc(d.nombre)}</button>`).join('')}</nav>`
      : '';
  return selector + vista(g, actual);
}

/**
 * La pestaña se llama siempre «Deporte» (con varios deportes, un selector elige cuál). Existe si hay algún deporte en la partida, pero
 * está desactivada hasta que se practique alguno (hasta apuntarse a un club); `inactivo` dice qué hay que hacer.
 */
export function pestanaDeDeporte(g: Game): { etiqueta: string; inactivo?: string } | null {
  const todos = deportesDe(g);
  if (!todos.length) return null;
  return todos.some((d) => !d.inactivo) ? { etiqueta: 'Deporte' } : { etiqueta: 'Deporte', inactivo: todos[0].inactivo };
}

export function clicEnDeporte(el: HTMLElement): boolean {
  if (!el.dataset.deporte) return false;
  elegido = el.dataset.deporte;
  return true;
}
