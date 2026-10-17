import type { BotSummary, Check } from './analysis';
import { globalScore } from './analysis';
import type { Area } from './runner';
import { BOTS } from './bots';

/**
 * Informes de la simulación:
 * - Markdown (consola, GitHub Actions summary).
 * - HTML con curvas semanales por área (una gráfica por área, una línea por estrategia).
 */

const ICON = { ok: '✅', aviso: '⚠️', fallo: '❌' } as const;
const f = (n: number | null | undefined, d = 1) => (n === null || n === undefined || Number.isNaN(n) ? '—' : n.toFixed(d));
const botName = (id: string) => BOTS.find((b) => b.id === id)?.name ?? id;

export interface ReportMeta {
  days: number;
  seeds: number;
  date: string;
}

export function markdownReport(sum: BotSummary[], areas: Area[], checks: Check[], meta: ReportMeta): string {
  const mainAreas = areas.filter((a) => !a.key.includes('.'));
  const lines: string[] = [];
  lines.push(`# Informe de simulación`);
  lines.push('');
  lines.push(`${meta.days} días simulados · ${meta.seeds} semillas por estrategia · ${meta.date}`);
  lines.push('');
  lines.push('## Chequeos de sentido del juego');
  lines.push('');
  lines.push('| | Chequeo | Detalle |');
  lines.push('|---|---|---|');
  for (const c of checks) lines.push(`| ${ICON[c.level]} | ${c.name} | ${c.detail} |`);
  lines.push('');
  lines.push('## Valores finales por estrategia (media)');
  lines.push('');
  lines.push(`| Estrategia | Global | ${mainAreas.map((a) => a.label).join(' | ')} | Salud | Estrés | Nota media | Mejor 400 m | Podios |`);
  lines.push(`|---|---|${mainAreas.map(() => '---').join('|')}|---|---|---|---|---|`);
  for (const s of sum) {
    lines.push(
      `| ${botName(s.bot)} | ${f(globalScore(s, areas))} | ${mainAreas.map((a) => `${f(s.final[a.key])} (${signed(s.final[a.key] - s.start[a.key])})`).join(' | ')} | ${f(s.final['gen.salud'], 0)} | ${f(s.final['gen.estres'], 0)} | ${f(s.extras.notaMedia)} | ${f(s.extras.mejorMarca, 2)} s | ${f(s.extras.podios, 1)} |`,
    );
  }
  lines.push('');
  lines.push('_Entre paréntesis: cambio desde el inicio. "Global" = media de habilidades y genéricas._');
  return lines.join('\n');
}

const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;

// ---------------------------------------------------------------- HTML

/** Paleta categórica validada (orden fijo; el color sigue a la estrategia, nunca al ranking). */
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function chartSvg(area: Area, sum: BotSummary[], order: string[]): string {
  const W = 560;
  const H = 240;
  const m = { l: 36, r: 12, t: 12, b: 26 };
  const weeks = Math.max(...sum.map((s) => s.series[area.key].length));
  const vals = sum.flatMap((s) => s.series[area.key]);
  const lo = Math.max(0, Math.floor(Math.min(...vals) / 10) * 10);
  const hi = Math.min(100, Math.ceil(Math.max(...vals) / 10) * 10 || 10);
  const x = (w: number) => m.l + (w / Math.max(1, weeks - 1)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - m.t - m.b);

  const grid: string[] = [];
  const step = hi - lo > 40 ? 20 : 10;
  for (let v = lo; v <= hi; v += step) {
    grid.push(`<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`);
    grid.push(`<text class="tick" x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`);
  }
  const xStep = weeks > 30 ? 8 : 4;
  for (let w = 0; w < weeks; w += xStep) grid.push(`<text class="tick" x="${x(w)}" y="${H - 8}" text-anchor="middle">${w}</text>`);

  const paths = sum.map((s) => {
    const i = order.indexOf(s.bot);
    const d = s.series[area.key].map((v, w) => `${w ? 'L' : 'M'}${x(w).toFixed(1)},${y(v).toFixed(1)}`).join('');
    return `<path class="line" d="${d}" style="stroke:var(--series-${i + 1})"/>`;
  });

  const data = JSON.stringify({
    lo, hi, weeks, m, W, H,
    series: sum.map((s) => ({ bot: botName(s.bot), slot: order.indexOf(s.bot) + 1, v: s.series[area.key].map((v) => +v.toFixed(2)) })),
  });

  return `<figure class="chart" data-chart='${esc(data)}'>
  <figcaption>${esc(area.label)}</figcaption>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(area.label)} por semana y estrategia">
    ${grid.join('\n    ')}
    ${paths.join('\n    ')}
    <line class="cross" y1="${m.t}" y2="${H - m.b}" x1="0" x2="0" visibility="hidden"/>
    <rect class="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"/>
  </svg>
  <div class="tip" hidden></div>
</figure>`;
}

export function htmlReport(sum: BotSummary[], areas: Area[], checks: Check[], meta: ReportMeta): string {
  const order = BOTS.map((b) => b.id).filter((id) => sum.some((s) => s.bot === id));
  const charted = areas.filter((a) => !a.key.includes('.') || ['gen.salud', 'gen.estres', 'gen.motivacion'].includes(a.key));
  const vars = (pal: string[]) => pal.map((c, i) => `--series-${i + 1}:${c};`).join('');
  const mainAreas = areas.filter((a) => !a.key.includes('.'));

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Informe de simulación</title>
<style>
:root{color-scheme:light;--surface-1:#fcfcfb;--surface-2:#f3f2ef;--text-primary:#0b0b0b;--text-secondary:#52514e;--grid:#e4e2dd;--border:#d9d7d0;${vars(SERIES_LIGHT)}}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){color-scheme:dark;--surface-1:#1a1a19;--surface-2:#242422;--text-primary:#f0efec;--text-secondary:#c3c2b7;--grid:#33332f;--border:#3d3d38;${vars(SERIES_DARK)}}}
:root[data-theme="dark"]{color-scheme:dark;--surface-1:#1a1a19;--surface-2:#242422;--text-primary:#f0efec;--text-secondary:#c3c2b7;--grid:#33332f;--border:#3d3d38;${vars(SERIES_DARK)}}
*{box-sizing:border-box}
body{margin:0;background:var(--surface-1);color:var(--text-primary);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1200px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 12px}
.meta,.note{color:var(--text-secondary);font-size:13px}
table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--border)}
th{color:var(--text-secondary);font-weight:600}
.scroll{overflow-x:auto}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin:8px 0 16px;font-size:13px;color:var(--text-secondary)}
.legend span{display:inline-flex;align-items:center;gap:6px}
.legend i{width:14px;height:3px;border-radius:2px;display:inline-block}
.grid-charts{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr));gap:16px}
.chart:hover{z-index:3}
.chart{position:relative;margin:0;background:var(--surface-2);border-radius:10px;padding:12px}
figcaption{font-weight:600;font-size:14px;margin-bottom:4px}
svg{width:100%;height:auto;display:block}
.grid{stroke:var(--grid);stroke-width:1}
.tick{fill:var(--text-secondary);font-size:11px}
.line{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.cross{stroke:var(--text-secondary);stroke-width:1;stroke-dasharray:3 3}
.hit{fill:transparent;cursor:crosshair}
.tip{position:absolute;z-index:4;pointer-events:none;background:var(--surface-1);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:12px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:160px}
.tip b{display:block;margin-bottom:4px}
.tip div{display:flex;justify-content:space-between;gap:12px}
.tip i{width:10px;height:3px;border-radius:2px;display:inline-block;margin-right:6px;vertical-align:middle}
</style>
</head>
<body>
<main>
<h1>Informe de simulación</h1>
<p class="meta">${meta.days} días simulados · ${meta.seeds} semillas por estrategia · ${esc(meta.date)}</p>

<h2>Chequeos de sentido del juego</h2>
<div class="scroll"><table>
<thead><tr><th></th><th>Chequeo</th><th>Detalle</th></tr></thead>
<tbody>${checks.map((c) => `<tr><td>${ICON[c.level]}</td><td>${esc(c.name)}</td><td>${esc(c.detail)}</td></tr>`).join('')}</tbody>
</table></div>

<h2>Evolución semanal por área</h2>
<p class="note">Media de todas las semillas. Eje X: semana. Pasa el cursor por una gráfica para ver los valores.</p>
<div class="legend">${order.map((id, i) => `<span><i style="background:var(--series-${i + 1})"></i>${esc(botName(id))}</span>`).join('')}</div>
<div class="grid-charts">
${charted.map((a) => chartSvg(a, sum, order)).join('\n')}
</div>

<h2>Valores finales</h2>
<div class="scroll"><table>
<thead><tr><th>Estrategia</th><th>Global</th>${mainAreas.map((a) => `<th>${esc(a.label)}</th>`).join('')}<th>Salud</th><th>Estrés</th><th>Nota media</th><th>Mejor 400 m</th><th>Podios</th></tr></thead>
<tbody>${sum
    .map(
      (s) =>
        `<tr><td>${esc(botName(s.bot))}</td><td>${f(globalScore(s, areas))}</td>${mainAreas.map((a) => `<td>${f(s.final[a.key])} <span class="note">(${signed(s.final[a.key] - s.start[a.key])})</span></td>`).join('')}<td>${f(s.final['gen.salud'], 0)}</td><td>${f(s.final['gen.estres'], 0)}</td><td>${f(s.extras.notaMedia)}</td><td>${f(s.extras.mejorMarca, 2)} s</td><td>${f(s.extras.podios, 1)}</td></tr>`,
    )
    .join('')}</tbody>
</table></div>

<h2>Horas dedicadas por etiqueta</h2>
<div class="scroll"><table>
<thead><tr><th>Estrategia</th>${tagCols(sum).map((t) => `<th>${esc(t)}</th>`).join('')}</tr></thead>
<tbody>${sum.map((s) => `<tr><td>${esc(botName(s.bot))}</td>${tagCols(sum).map((t) => `<td>${f(s.hoursByTag[t] ?? 0, 0)}</td>`).join('')}</tr>`).join('')}</tbody>
</table></div>
</main>
<script>
document.querySelectorAll('.chart').forEach(function (fig) {
  var d = JSON.parse(fig.dataset.chart), svg = fig.querySelector('svg'), hit = fig.querySelector('.hit'),
      cross = fig.querySelector('.cross'), tip = fig.querySelector('.tip');
  function hide() { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); }
  hit.addEventListener('pointerleave', hide);
  hit.addEventListener('pointermove', function (e) {
    var r = svg.getBoundingClientRect(), sx = d.W / r.width;
    var px = (e.clientX - r.left) * sx, plotW = d.W - d.m.l - d.m.r;
    var w = Math.round(((px - d.m.l) / plotW) * Math.max(1, d.weeks - 1));
    w = Math.max(0, Math.min(d.weeks - 1, w));
    var x = d.m.l + (w / Math.max(1, d.weeks - 1)) * plotW;
    cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
    var rows = d.series.slice().filter(function (s) { return s.v[w] !== undefined; })
      .sort(function (a, b) { return b.v[w] - a.v[w]; })
      .map(function (s) { return '<div><span><i style="background:var(--series-' + s.slot + ')"></i>' + s.bot + '</span><span>' + s.v[w].toFixed(1) + '</span></div>'; });
    tip.innerHTML = '<b>Semana ' + w + '</b>' + rows.join('');
    tip.hidden = false;
    var fr = fig.getBoundingClientRect(), left = e.clientX - fr.left + 14;
    if (left + tip.offsetWidth > fr.width) left = e.clientX - fr.left - tip.offsetWidth - 14;
    tip.style.left = Math.max(4, left) + 'px'; tip.style.top = (e.clientY - fr.top + 10) + 'px';
  });
});
</script>
</body>
</html>`;
}

function tagCols(sum: BotSummary[]): string[] {
  const set = new Set(sum.flatMap((s) => Object.keys(s.hoursByTag)));
  return [...set].sort();
}
