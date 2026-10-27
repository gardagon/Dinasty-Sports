import {
  CALENDARIO_ESPANA,
  COLEGIO_DEL_PERSONAJE,
  HUECO_ENTRE_CLASES,
  LETRA_DE_TU_CLASE,
  nombreDeClase,
  type IdentityService,
  JORNADA_ESCOLAR,
  NOMBRE_PERIODO,
  SERVICES,
  fechaDelDia,
  type NpcDirectory,
  type StudiesService,
} from '@ds/contracts';
import type { Game } from '@ds/core';

/**
 * Pestaña «Estudios»: el colegio (nombre, curso, clase y tutor), la evolución de cada asignatura con sus notas, el horario semanal de
 * clases, los próximos exámenes, el calendario del curso y los boletines. No sabe de ninguna asignatura: dibuja lo que publica el servicio `estudios`.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const hhmm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const TIPO: Record<string, string> = { parcial1: 'parcial 1', parcial2: 'parcial 2', global: 'global' };

function tabla(cabecera: string[], filas: string[][], resaltada = -1): string {
  const th = cabecera.map((h) => `<th>${esc(h)}</th>`).join('');
  const tr = filas.map((f, i) => `<tr${i === resaltada ? ' class="me"' : ''}>${f.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<div class="table"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}

function barra(g: Game, id: string, texto: string): string {
  const info = g.registry.stats.get(id);
  if (!info) return '';
  const span = info.max - info.min;
  const cap = ((g.cap(id) - info.min) / span) * 100;
  return `<div class="stat" title="Techo actual: ${Math.round(g.cap(id))}">
    <span>${esc(info.def.name)}</span>
    <div class="bar"><i style="width:${((g.stat(id) - info.min) / span) * 100}%"></i>${cap < 99.5 ? `<span class="cap" style="left:${cap}%"></span>` : ''}</div>
    <span class="stat-val">${esc(texto)}</span>
  </div>`;
}

/** Semana del curso → «del 10/09 al 16/09». */
const semanas = (desde: number, hasta: number): string => `semana${desde === hasta ? '' : 's'} ${desde + 1}${desde === hasta ? '' : `–${hasta + 1}`} (${fechaDelDia(desde * 7).corto} a ${fechaDelDia(hasta * 7 + 6).corto})`;

function colegio(g: Game, est: StudiesService): string {
  const dir = g.service<NpcDirectory>(SERVICES.npcs);
  const tutor = dir?.get('tutor');
  const alumnos = dir ? dir.list().filter((n) => n.clase?.endsWith('(tu clase)')).length + 1 : undefined;
  const edad = g.service<IdentityService>(SERVICES.identidad)?.view().seasonAge;
  const miClase = edad === undefined ? undefined : nombreDeClase(edad, LETRA_DE_TU_CLASE);
  const media = est.average();
  const filas = [
    ['Colegio', COLEGIO_DEL_PERSONAJE],
    ['Curso', est.courseName()],
    ...(alumnos ? [['Tu clase', `${miClase ? `${miClase}: ` : ''}${alumnos} alumnos (tú y ${alumnos - 1} compañeros)`]] : []),
    ...(tutor ? [['Tutor', tutor.known === false ? 'Todavía no lo conoces' : tutor.name]] : []),
    ['Jornada', `De ${hhmm(JORNADA_ESCOLAR.clases[0][0])} a 14:00: 4 clases y un recreo (${hhmm(JORNADA_ESCOLAR.recreo[0])}–${hhmm(JORNADA_ESCOLAR.recreo[1])})`],
    ['Nota media reciente', media === null ? 'Sin exámenes aún' : media.toFixed(1)],
    ['Faltas', String(est.absences())],
  ];
  return `<section class="sheet"><h2>Estudios</h2><dl class="identity">${filas.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>`;
}

function asignaturas(g: Game, est: StudiesService): string {
  const filas = est
    .activeSubjects()
    .map((id) => {
      const notas = est.grades(id);
      const texto = est.levelText(id)?.toString() ?? String(Math.round(g.stat(id)));
      return `${barra(g, id, texto)}${notas.length ? `<p class="note">Últimas notas: ${notas.slice(-4).map((n) => n.toFixed(1)).join(', ')}</p>` : ''}`;
    })
    .join('');
  return `<section class="sheet"><h2>Asignaturas</h2>${filas}<p class="note">La marca gris es tu techo actual: sube con la edad y con las características que lo apoyan.</p></section>`;
}

function horario(est: StudiesService, g: Game): string {
  const nombre = (id: string) => g.registry.stats.get(id)?.def.name ?? id;
  const clases = JORNADA_ESCOLAR.clases.map(([inicio, fin], h) => [`${hhmm(inicio)}–${hhmm(fin)}`, ...DIAS.map((_, d) => nombre(est.timetable(d)[h] ?? ''))]);
  // El recreo va entre la segunda y la tercera clase.
  const recreo = [`${hhmm(JORNADA_ESCOLAR.recreo[0])}–${hhmm(JORNADA_ESCOLAR.recreo[1])}`, ...DIAS.map(() => 'Recreo')];
  const filas = [...clases.slice(0, 2), recreo, ...clases.slice(2)];
  const hoy = g.time.isSchoolDay ? g.time.weekday : -1;
  return `<section class="sheet"><h2>Horario de clases</h2>${tabla(['Hora', ...DIAS.map((d, i) => (i === hoy ? `${d} (hoy)` : d))], filas)}
    <p class="note">Cada clase dura ${JORNADA_ESCOLAR.clases[0][1] - JORNADA_ESCOLAR.clases[0][0]} minutos y acaba ${HUECO_ENTRE_CLASES} antes de la hora de la siguiente. Se puede entrar 10 minutos antes y llegar tarde (sube solo la parte asistida).</p></section>`;
}

function examenes(g: Game, est: StudiesService): string {
  const exs = est.upcomingExams(14);
  const proximos = exs.length
    ? `<ul class="note">${exs.map((e) => `<li><b>${esc(e.name)}</b> (${TIPO[e.tipo]}): ${e.inDays === 0 ? 'hoy' : e.inDays === 1 ? 'mañana' : `el ${DIAS[e.day % 7]?.toLowerCase() ?? ''} ${fechaDelDia(e.day).corto} (en ${e.inDays} días)`}</li>`).join('')}</ul>`
    : '<p class="note">No hay exámenes a la vista (se avisan con una semana de antelación).</p>';
  const cal = CALENDARIO_ESPANA;
  const semana = g.time.schoolWeek;
  const filas = [1, 2, 3].map((t) => {
    const p1 = cal.parciales[(t - 1) * 2];
    const p2 = cal.parciales[(t - 1) * 2 + 1];
    const ev = cal.evaluaciones[t - 1];
    const f = (w: number) => `semana ${w + 1} · ${fechaDelDia(w * 7).corto}`;
    return [`${t}.º trimestre`, f(p1), f(p2), f(ev)];
  });
  const actual = g.time.period === 'clase' ? g.time.term - 1 : -1;
  const vacaciones = cal.tramos.filter((x) => x.periodo !== 'clase').map((x) => `<li><b>${esc(NOMBRE_PERIODO[x.periodo])}:</b> ${esc(semanas(x.desde, x.hasta))}</li>`).join('');
  return `<section class="sheet"><h2>Exámenes y calendario</h2>
    <h3>Próximos exámenes</h3>${proximos}
    <h3>Calendario del curso</h3>${tabla(['Trimestre', 'Parcial 1', 'Parcial 2', 'Evaluación (global)'], filas, actual)}
    <p class="note">Nota del trimestre: 40 % la media de los parciales y 60 % el global. Ahora estás en la semana ${semana + 1} del curso.</p>
    <h3>Vacaciones</h3><ul class="note">${vacaciones}</ul></section>`;
}

function boletines(est: StudiesService): string {
  const b = est.reports();
  if (!b.length) return '';
  return `<section class="sheet"><h2>Boletines</h2>${tabla(['Curso', 'Trimestre', 'Nota media'], b.map((x) => [`Curso ${x.curso + 1}`, `${x.trimestre}.º`, x.media.toFixed(1)]))}</section>`;
}

export function viewEstudios(g: Game): string {
  const est = g.service<StudiesService>(SERVICES.estudios);
  if (!est) return '<section class="sheet"><p class="note">No hay módulo de estudios cargado.</p></section>';
  return colegio(g, est) + asignaturas(g, est) + horario(est, g) + examenes(g, est) + boletines(est);
}

/** ¿Hay estudios en la partida? (la pestaña solo existe si sí). */
export const hayEstudios = (g: Game): boolean => !!g.service<StudiesService>(SERVICES.estudios);
