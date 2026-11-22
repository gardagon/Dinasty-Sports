/**
 * Lee los resultados de `tools/analisis-profesionales.ts` (uno o varios archivos, uno por versión) y escribe las tablas del informe (`docs/relevo/analisis-profesionales.md`) en Markdown. Solo lectura.
 *
 *   npx tsx tools/analisis-profesionales-informe.ts <etiqueta=archivo.json[,archivo2.json]>... [--umbral=N]
 *
 * Ejemplo: `antes=a31.json,a32.json despues=d31.json,d32.json`. El umbral de «profesional» por defecto sale de la mediana de los titulares de los equipos A de los clubes grandes a los 17–18 años de la **primera** versión.
 */
import { readFileSync } from 'node:fs';

interface Fila { id: string; k: number; edad: number; juega: boolean; club?: string; tamano?: string; colegio?: boolean; letra?: string; valor?: number; capF?: number[]; habF?: number[]; capPob?: number[]; min: number; pj: number; ti: number }
interface Nino { id: string; potencial?: number; topeCap: number; topeFis: number; interes: number; club0?: string; tamano0?: string; colegio0?: boolean; letra0?: string; filas: Fila[] }
type Datos = Record<string, { ninos: Nino[]; ref: Record<string, Record<string, number[]>>; todos: Record<string, number[]> }>;

const args = process.argv.slice(2);
const umbralArg = args.find((a) => a.startsWith('--umbral='));
const versiones = args.filter((a) => !a.startsWith('--')).map((a) => {
  const [et, archivos] = a.split('=');
  const datos: Datos = {};
  for (const f of archivos.split(',')) Object.assign(datos, JSON.parse(readFileSync(f, 'utf8')));
  return { et, datos };
});
const mean = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN);
const pct = (x: number[], p: number) => { const s = [...x].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const f1 = (x: number) => (Number.isNaN(x) ? '–' : x.toFixed(1));
const f2 = (x: number) => (Number.isNaN(x) ? '–' : x.toFixed(2));
const pc = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)} %` : '–');
const anios = (d: Datos) => Math.max(...Object.values(d).flatMap((s) => s.ninos.flatMap((n) => n.filas.map((f) => f.k))));
const filasDe = (d: Datos, k: number) => Object.values(d).flatMap((s) => s.ninos.map((n) => ({ n, f: n.filas.find((f) => f.k === k) }))).filter((x): x is { n: Nino; f: Fila } => !!x.f);
const nSemillas = (d: Datos) => Object.keys(d).length;
const out: string[] = [];
const w = (s = '') => out.push(s);

// Umbral: mediana de los titulares del A de grandes (17–18 años) en el último año de la primera versión.
const primera = versiones[0];
const K = anios(primera.datos);
const refVals = Object.values(primera.datos).flatMap((s) => ['17', '18'].flatMap((e) => s.ref[String(K)]?.[e] ?? []));
const UMBRAL = umbralArg ? Number(umbralArg.split('=')[1]) : Math.round(pct(refVals, 0.5));
w(`<!-- umbral usado: ${UMBRAL} (mediana de ${refVals.length} titulares del A de clubes grandes a 17–18 años, versión «${primera.et}») -->`);

for (const { et, datos } of versiones) {
  const K = anios(datos), S = nSemillas(datos);
  w(`\n## Versión «${et}» (${S} semillas, cohorte de 8 años al crear, hasta el año ${K})\n`);
  w('### Año a año: nivel (valor de jugador) de la cohorte que juega al fútbol\n');
  w('| año | edad | cohorte | juegan | nivel medio | p10 | p50 | p90 | máx | % ≥ umbral ' + UMBRAL + ' | % ≥ 60 | % ≥ 70 |');
  w('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (let k = 0; k <= K; k++) {
    const fs = filasDe(datos, k);
    const jug = fs.filter((x) => x.f.juega);
    const v = jug.map((x) => x.f.valor!);
    w(`| ${k} | ${8 + k} | ${(fs.length / S).toFixed(0)} | ${(jug.length / S).toFixed(0)} | ${f1(mean(v))} | ${f1(pct(v, 0.1))} | ${f1(pct(v, 0.5))} | ${f1(pct(v, 0.9))} | ${f1(Math.max(...v))} | ${pc(v.filter((x) => x >= UMBRAL).length, jug.length)} | ${pc(v.filter((x) => x >= 60).length, jug.length)} | ${pc(v.filter((x) => x >= 70).length, jug.length)} |`);
  }
  w('\n(cohorte y juegan: por semilla, media.)\n');
  w('### Año a año: fracción del tope que alcanzan (los que juegan)\n');
  w('| año | capacidades del fútbol: media | habilidades: media | niños con media de capacidades ≥ 90 % | ≥ 95 % | ≥ 100 % | capacidades (de 18) a ≥ 95 % por niño | habilidades (de ~28) a ≥ 95 % por niño | habilidades ≥ 100 % por niño |');
  w('|---|---|---|---|---|---|---|---|---|');
  for (let k = 0; k <= K; k++) {
    const jug = filasDe(datos, k).filter((x) => x.f.juega);
    const cm = jug.map((x) => mean(x.f.capPob!)), hm = jug.map((x) => mean(x.f.habF!));
    w(`| ${k} | ${(100 * mean(cm)).toFixed(1)} % | ${(100 * mean(hm)).toFixed(1)} % | ${pc(cm.filter((x) => x >= 0.9).length, jug.length)} | ${pc(cm.filter((x) => x >= 0.95).length, jug.length)} | ${pc(cm.filter((x) => x >= 1).length, jug.length)} | ${f2(mean(jug.map((x) => x.f.capF!.filter((c) => c >= 0.95).length)))} | ${f2(mean(jug.map((x) => x.f.habF!.filter((c) => c >= 0.95).length)))} | ${f2(mean(jug.map((x) => x.f.habF!.filter((c) => c >= 1).length)))} |`);
  }
  // Embudo: los mejores de cada edad y cuántos de los mejores a los 14 siguen jugando al final.
  w('\n### Los mejores de la cohorte (por semilla, media de los 1.º, 3.º y 10.º de cada año) y quién se queda\n');
  w('| año | edad | 1.º | 3.º | 10.º | juegan (de los interesados) |');
  w('|---|---|---|---|---|---|');
  for (let k = 0; k <= K; k++) {
    const porS = Object.values(datos).map((d) => d.ninos.map((n) => n.filas.find((x) => x.k === k)).filter((x): x is Fila => !!x && x.juega).map((x) => x.valor!).sort((a, b) => b - a));
    const nth = (i: number) => mean(porS.map((v) => v[i] ?? NaN));
    const jug = porS.reduce((t, v) => t + v.length, 0) / S;
    w(`| ${k} | ${8 + k} | ${f1(nth(0))} | ${f1(nth(2))} | ${f1(nth(9))} | ${jug.toFixed(0)} (${pc(jug * S, Object.values(datos).reduce((t, d) => t + d.ninos.filter((n) => n.interes > 0).length, 0))}) |`);
  }
  const mejores14 = Object.values(datos).flatMap((d) => d.ninos.map((n) => ({ a: n.filas.find((x) => x.k === 6), b: n.filas.find((x) => x.k === K) })).filter((x) => x.a?.juega).sort((x, y) => y.a!.valor! - x.a!.valor!).slice(0, 10));
  w(`\nDe los 10 mejores de cada semilla a los 14 años (${mejores14.length}), siguen jugando a los ${8 + K}: ${mejores14.filter((x) => x.b?.juega).length}.`);
  // Los de 18 años: último año.
  // «A los 18»: el último nivel conocido a los 17–18 años (año K−1 o K): quien deja el fútbol o sale del mundo a los 18 cuenta con su último año jugando (de otro modo se perdería, por ejemplo, a los que pasan a sénior).
  const fin = Object.values(datos).flatMap((d) => d.ninos.map((n) => ({ n, f: [...n.filas].reverse().find((x) => x.k >= K - 1 && x.juega) }))).filter((x): x is { n: Nino; f: Fila } => !!x.f);
  const todos = filasDe(datos, 0);
  const interesados = todos.filter((x) => x.n.interes > 0);
  w(`\n### A los ${8 + K} años (año ${K})\n`);
  w(`- Cohorte por semilla: ${(todos.length / S).toFixed(0)}; con interés por el fútbol: ${(interesados.length / S).toFixed(0)}; juegan a los 17–18 (último año jugando): ${(fin.length / S).toFixed(0)}; jugaban al crear la partida: ${(todos.filter((x) => x.f.juega).length / S).toFixed(0)}.`);
  const vals = fin.map((x) => x.f.valor!);
  const ultimo = (n: Nino) => [...n.filas].reverse().find((x) => x.k >= K - 1 && x.juega);
  const porSemilla = Object.entries(datos).map(([s, d]) => {
    const f = d.ninos.map(ultimo).filter((x): x is Fila => !!x);
    const sobre = f.filter((x) => x.valor! >= UMBRAL).length;
    return `${s}: ${sobre}`;
  });
  w(`- Superan el umbral de profesional (${UMBRAL}) por semilla: ${porSemilla.join(', ')}.`);
  w('- Los 10 mejores niveles de cada semilla (ordenados): ' + Object.entries(datos).map(([s, d]) => `${s}: ` + d.ninos.map(ultimo).filter((x): x is Fila => !!x).map((x) => x.valor!).sort((a, b) => b - a).slice(0, 10).map((x) => x.toFixed(0)).join('/')).join(' · '));
  w('\n**Sensibilidad del umbral (a los ' + (8 + K) + ' años):**\n');
  w('| umbral | ' + [40, 45, 50, 55, 60, 65, 70, 75, 80].join(' | ') + ' |');
  w('|---|' + [40, 45, 50, 55, 60, 65, 70, 75, 80].map(() => '---').join('|') + '|');
  w('| niños por semilla | ' + [40, 45, 50, 55, 60, 65, 70, 75, 80].map((u) => (vals.filter((x) => x >= u).length / S).toFixed(1)).join(' | ') + ' |');
  w('| % de los interesados | ' + [40, 45, 50, 55, 60, 65, 70, 75, 80].map((u) => pc(vals.filter((x) => x >= u).length, interesados.length)).join(' | ') + ' |');
  // Los mejores de cada semilla (los candidatos reales a profesional): su fracción del tope.
  const mejores = Object.values(datos).flatMap((d) => d.ninos.map(ultimo).filter((x): x is Fila => !!x).sort((a, b) => b.valor! - a.valor!).slice(0, 10));
  w(`- Los 10 mejores de cada semilla (${mejores.length}): nivel medio ${f1(mean(mejores.map((x) => x.valor!)))}; capacidades del fútbol al ${(100 * mean(mejores.map((x) => mean(x.capPob!)))).toFixed(1)} % de su tope; habilidades al ${(100 * mean(mejores.map((x) => mean(x.habF!)))).toFixed(1)} %; la capacidad más alta al ${(100 * mean(mejores.map((x) => Math.max(...x.capF!)))).toFixed(0)} % y la habilidad más alta al ${(100 * mean(mejores.map((x) => Math.max(...x.habF!)))).toFixed(0)} %.`);
  // Referencia: titulares del A de clubes grandes por edad en el último año.
  w('\n**Referencia: niveles de los jugadores del A de clubes grandes en el año ' + K + ' (todas las semillas; el nivel de la plantilla del A de un grande, no solo titulares):**\n');
  w('| edad | n | p25 | p50 | p75 | máx |');
  w('|---|---|---|---|---|---|');
  for (const e of ['14', '15', '16', '17', '18']) {
    const v = Object.values(datos).flatMap((s) => s.ref[String(K)]?.[e] ?? []);
    w(`| ${e} | ${v.length} | ${f1(pct(v, 0.25))} | ${f1(pct(v, 0.5))} | ${f1(pct(v, 0.75))} | ${f1(Math.max(...v))} |`);
  }
  w('\n**Todos los futbolistas del mundo por edad en el año ' + K + ' (media / p90 / máx):**\n');
  w('| edad | n | media | p90 | máx |');
  w('|---|---|---|---|---|');
  for (const e of ['14', '16', '17', '18', '19']) {
    const v = Object.values(datos).flatMap((s) => s.todos[`${K}|${e}`] ?? []);
    if (v.length) w(`| ${e} | ${(v.length / S).toFixed(0)} | ${f1(mean(v))} | ${f1(pct(v, 0.9))} | ${f1(Math.max(...v))} |`);
  }
  // Club de origen (el de los 8–9 años) y club final.
  w('\n### Por el club y los minutos (a los ' + (8 + K) + ' años)\n');
  const grupo = (clave: (x: { n: Nino; f: Fila }) => string) => {
    const m = new Map<string, { n: Nino; f: Fila }[]>();
    for (const x of fin) { const c = clave(x); (m.get(c) ?? m.set(c, []).get(c)!).push(x); }
    return [...m.entries()].sort();
  };
  const tabla = (titulo: string, g: [string, { n: Nino; f: Fila }[]][]) => {
    w(`**${titulo}**\n`);
    w('| grupo | n/semilla | nivel medio | p90 | % ≥ umbral ' + UMBRAL + ' | cap. fútbol % del tope | habilidades % del tope | minutos acumulados | partidos |');
    w('|---|---|---|---|---|---|---|---|---|');
    for (const [c, xs] of g) {
      const v = xs.map((x) => x.f.valor!);
      w(`| ${c} | ${(xs.length / S).toFixed(1)} | ${f1(mean(v))} | ${f1(pct(v, 0.9))} | ${pc(v.filter((x) => x >= UMBRAL).length, xs.length)} | ${f1(100 * mean(xs.map((x) => mean(x.f.capPob!))))} | ${f1(100 * mean(xs.map((x) => mean(x.f.habF!))))} | ${mean(xs.map((x) => x.f.min)).toFixed(0)} | ${mean(xs.map((x) => x.f.pj)).toFixed(0)} |`);
    }
    w();
  };
  const etq = (x: { n: Nino; f: Fila }) => (x.f.colegio ? 'colegio' : x.f.tamano ?? '?');
  tabla('Club en el que están a esa edad', grupo(etq));
  tabla('Club de origen (al crear la partida, a los 8 años; «ninguno»: empezaron más tarde)', grupo((x) => (x.n.club0 ? (x.n.colegio0 ? 'colegio' : x.n.tamano0 ?? '?') : 'ninguno')));
  tabla('Equipo (letra) a esa edad', grupo((x) => x.f.letra ?? '?'));
  const q = (p: number) => pct(fin.map((x) => x.f.min), p);
  tabla('Minutos jugados en toda la carrera (cuartiles)', grupo((x) => (x.f.min <= q(0.25) ? '1 (menos minutos)' : x.f.min <= q(0.5) ? '2' : x.f.min <= q(0.75) ? '3' : '4 (más minutos)')));
  const pq = (p: number) => pct(fin.map((x) => x.n.topeFis), p);
  tabla('Talento de partida (tope medio de las capacidades del fútbol, cuartiles)', grupo((x) => (x.n.topeFis <= pq(0.25) ? '1 (menos talento)' : x.n.topeFis <= pq(0.5) ? '2' : x.n.topeFis <= pq(0.75) ? '3' : '4 (más talento)')));
  // Correlaciones sencillas.
  const corr = (a: number[], b: number[]) => { const ma = mean(a), mb = mean(b); let sab = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sab / Math.sqrt(sa * sb); };
  w(`Correlación del nivel final con: tope físico de partida ${f2(corr(fin.map((x) => x.n.topeFis), vals))}; minutos jugados ${f2(corr(fin.map((x) => x.f.min), vals))}; potencial ${f2(corr(fin.map((x) => x.n.potencial ?? 0), vals))}.\n`);
  // Quién supera el umbral.
  const pros = fin.filter((x) => x.f.valor! >= UMBRAL);
  w(`Los ${pros.length} (de ${fin.length}, todas las semillas) que superan el umbral: club ${[...new Set(pros.map(etq))].map((c) => `${c} ${pros.filter((x) => etq(x) === c).length}`).join(', ')}; tope físico medio ${f1(mean(pros.map((x) => x.n.topeFis)))} (cohorte ${f1(mean(fin.map((x) => x.n.topeFis)))}); minutos medios ${mean(pros.map((x) => x.f.min)).toFixed(0)} (cohorte ${mean(fin.map((x) => x.f.min)).toFixed(0)}).`);
}
console.log(out.join('\n'));
