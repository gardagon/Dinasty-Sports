/**
 * Agrega las líneas `#W` de `tools/verano-sexos.ts` (media y rango entre semillas) en las tablas de `docs/relevo/veranos-sexos.md`.
 * `npx tsx tools/verano-sexos-tabla.ts <carpeta> <semillaDesde> <semillaHasta>` (los archivos son `w_<m|f>_<hoy|nuevo>_<semilla>.txt` con la salida de la herramienta).
 */
import { readFileSync } from 'node:fs';

type Fila = Record<string, number>;
type Resumen = Record<string, { equipos: number; bajo: number; porLetra: Record<string, number>; min: number; max: number; jugadores: number }>;
type Dato = { seed: number; mundo: string; verano: string; filas: Record<string, Fila>; antes: Resumen; despues: Resumen; nivelAntes: Record<string, Record<string, number>>; nivelDespues: Record<string, Record<string, number>>; cambiosEq: Record<string, { cierran: number; abren: number }>; cierres: Record<string, number>; eq: Record<string, Record<string, number>>; trazaCrea: Record<string, number[]>; trazaVera: Record<string, number[]>; letras: Record<string, Record<string, number>>; mercado?: Record<string, Record<string, { equipos: number; tam: number; tamSinAband: number; tamSinTodos: number; bajoAband: number; bajoTodos: number; bajo0: number }>> };
const [carpeta, desde, hasta] = process.argv.slice(2);
const semillas = Array.from({ length: Number(hasta) - Number(desde) + 1 }, (_, i) => Number(desde) + i);
const cargar = (mundo: string, verano: string): Dato[] => semillas.flatMap((s) => { try { return readFileSync(`${carpeta}/w_${mundo}_${verano}_${s}.txt`, 'utf8').split('\n').filter((l) => l.startsWith('#W ')).map((l) => JSON.parse(l.slice(3)) as Dato); } catch { return []; } });
const media = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fmt = (xs: number[], dec = 1): string => (xs.length ? `${media(xs).toFixed(dec)}${xs.length > 1 ? ` (${Math.min(...xs).toFixed(dec)}–${Math.max(...xs).toFixed(dec)})` : ''}` : '—');
const CATS = ['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'];
const GRUPOS: { cat: string; sx: string; mundo: string; nombre: string }[] = [
  { cat: 'benjamin', sx: 'mixto', mundo: 'm', nombre: 'benjamín (mixto)' }, { cat: 'alevin', sx: 'mixto', mundo: 'm', nombre: 'alevín (mixto)' },
  { cat: 'infantil', sx: 'm', mundo: 'm', nombre: 'infantil chicos' }, { cat: 'cadete', sx: 'm', mundo: 'm', nombre: 'cadete chicos' }, { cat: 'juvenil', sx: 'm', mundo: 'm', nombre: 'juvenil chicos' },
  { cat: 'infantil', sx: 'f', mundo: 'f', nombre: 'infantil chicas' }, { cat: 'cadete', sx: 'f', mundo: 'f', nombre: 'cadete chicas' }, { cat: 'juvenil', sx: 'f', mundo: 'f', nombre: 'juvenil chicas' },
];
const salida: string[] = [];
const say = (s = ''): void => { salida.push(s); };
const tabla = (cab: string[], filas: (string | number)[][]): void => { say(`| ${cab.join(' | ')} |`); say(`|${cab.map(() => '---').join('|')}|`); for (const f of filas) say(`| ${f.join(' | ')} |`); say(); };
const suma = (d: Dato, cat: string, sx: string, campo: string): number => [1, 2, 3].reduce((t, a) => t + (d.filas[`${cat}|${a}#${sx}`]?.[campo] ?? 0), 0);
const pct = (a: number, b: number): string => (b ? `${((100 * a) / b).toFixed(0)} %` : '—');

for (const verano of ['hoy', 'nuevo']) {
  say(`## Verano con ${verano === 'hoy' ? 'las reglas de hoy' : 'el método nuevo'} (semillas ${desde}–${hasta})`);
  say();
  const datos = { m: cargar('m', verano), f: cargar('f', verano) };
  say('### Equipos: antes → tras el verano');
  say();
  tabla(['', 'Equipos antes → tras', 'Por debajo de 14 antes → tras', 'Se deshacen (por club)', 'Se abren', 'Niños por equipo tras (mín–máx)', 'Clubes con un C mejor que su A (de los que tienen C), antes → tras · D mejor que B'], GRUPOS.map((g) => {
    const ds = datos[g.mundo as 'm' | 'f'];
    const a = ds.map((d) => d.antes[g.cat]?.equipos ?? 0), b = ds.map((d) => d.despues[g.cat]?.equipos ?? 0);
    const ba = ds.map((d) => d.antes[g.cat]?.bajo ?? 0), bb = ds.map((d) => d.despues[g.cat]?.bajo ?? 0);
    const mn = ds.map((d) => d.despues[g.cat]?.min ?? 0).filter((x) => x < 999), mx = ds.map((d) => d.despues[g.cat]?.max ?? 0);
    return [g.nombre, `${fmt(a)} → ${fmt(b)}`, `${fmt(ba)} → ${fmt(bb)}`, fmt(ds.map((d) => d.cambiosEq[g.cat]?.cierran ?? 0)), fmt(ds.map((d) => d.cambiosEq[g.cat]?.abren ?? 0)), `${fmt(mn, 0)} – ${fmt(mx, 0)}`, `${fmt(ds.map((d) => d.nivelAntes[g.cat]?.cMejorA ?? 0))} → ${fmt(ds.map((d) => d.nivelDespues[g.cat]?.cMejorA ?? 0))} de ${fmt(ds.map((d) => d.nivelAntes[g.cat]?.clubesConC ?? 0))} → ${fmt(ds.map((d) => d.nivelDespues[g.cat]?.clubesConC ?? 0))} · D/B: ${fmt(ds.map((d) => d.nivelAntes[g.cat]?.dMejorB ?? 0))} → ${fmt(ds.map((d) => d.nivelDespues[g.cat]?.dMejorB ?? 0))} de ${fmt(ds.map((d) => d.nivelAntes[g.cat]?.clubesConD ?? 0))} → ${fmt(ds.map((d) => d.nivelDespues[g.cat]?.clubesConD ?? 0))}`];
  }));
  if (verano === 'nuevo') {
    say('### Equipos según el reparto (la traza de cada paso final, antes de que el resto de la creación mueva a nadie): al empezar → tras el verano');
    say();
    tabla(['', 'Equipos', 'Por debajo de 14', 'Niños por equipo mín–máx'], GRUPOS.map((g) => {
      const ds = datos[g.mundo as 'm' | 'f'];
      const c = ds.map((d) => d.trazaCrea[g.cat] ?? []), v = ds.map((d) => d.trazaVera[g.cat] ?? []);
      const n = (xs: number[][]): number[] => xs.map((x) => x.length), b = (xs: number[][]): number[] => xs.map((x) => x.filter((y) => y < 14).length);
      return [g.nombre, `${fmt(n(c))} → ${fmt(n(v))}`, `${fmt(b(c))} → ${fmt(b(v))}`, `${fmt(c.map((x) => (x.length ? Math.min(...x) : 0)), 0)}–${fmt(c.map((x) => (x.length ? Math.max(...x) : 0)), 0)} → ${fmt(v.map((x) => (x.length ? Math.min(...x) : 0)), 0)}–${fmt(v.map((x) => (x.length ? Math.max(...x) : 0)), 0)}`];
    }));
  }
  if (verano === 'hoy' && datos.m[0]?.mercado) {
    say('### El mercado al llegar el verano: quién sale y cómo queda cada equipo sin ellos (por tipo de club)');
    say();
    const filas: (string | number)[][] = [];
    for (const g of GRUPOS) {
      const ds = datos[g.mundo as 'm' | 'f'];
      const sx = g.sx;
      for (const tipo of ['colegio', 'pequeno', 'mediano', 'grande']) {
        const v = (c: 'equipos' | 'tam' | 'tamSinAband' | 'tamSinTodos' | 'bajoAband' | 'bajoTodos' | 'bajo0'): number[] => ds.map((d) => d.mercado?.[`${g.cat}#${sx}`]?.[tipo]?.[c] ?? 0);
        const n = media(v('equipos'));
        if (!n) continue;
        filas.push([g.nombre, tipo, fmt(v('equipos')), (media(v('tam')) / n).toFixed(1), (media(v('tamSinAband')) / n).toFixed(1), (media(v('tamSinTodos')) / n).toFixed(1), `${fmt(v('bajo0'))} · ${fmt(v('bajoAband'))} · ${fmt(v('bajoTodos'))}`]);
      }
    }
    tabla(['', 'Club', 'Equipos', 'Tamaño medio al acabar el curso', 'sin los que abandonan', 'sin los que abandonan ni buscan fuera', 'Por debajo de 14: antes · sin abandonos · sin abandonos ni buscadores'], filas);
  }
  say('### Subidas y bajadas de letra (los que siguen en el mismo club; de la letra del curso que acaba a la del que empieza)');
  say();
  tabla(['', 'Siguen en su club', 'Misma letra', 'Suben de letra (C→B, B→A…)', 'Bajan de letra (A→B, B→C…)', 'Suben dos o más', 'Bajan dos o más'], GRUPOS.map((g) => {
    const ds = datos[g.mundo as 'm' | 'f'];
    const cuenta = (d: Dato, f: (a: number, b: number) => boolean): number => Object.entries(d.letras?.[`${g.cat}#${g.sx}`] ?? {}).reduce((t, [k, n]) => { const [x, y] = k.split('>'); return f(x.charCodeAt(0), y.charCodeAt(0)) ? t + n : t; }, 0);
    return [g.nombre, fmt(ds.map((d) => cuenta(d, () => true)), 0), fmt(ds.map((d) => cuenta(d, (a, b) => a === b)), 0), fmt(ds.map((d) => cuenta(d, (a, b) => b < a)), 0), fmt(ds.map((d) => cuenta(d, (a, b) => b > a)), 0), fmt(ds.map((d) => cuenta(d, (a, b) => a - b >= 2)), 0), fmt(ds.map((d) => cuenta(d, (a, b) => b - a >= 2)), 0)];
  }));
  say('### Niños que quedan fuera tras el verano, por año (querían jugar y no tienen equipo) y por qué se quedan fuera los que jugaban');
  say();
  tabla(['', '1.er año', '2.º año', '3.er año', 'Jugaban y quedan fuera: pierden la plaza por mérito', 'cierra su equipo', 'sobran al recolocar', 'fin de colegio', 'sin hueco', 'dejan tras dos plazos'], GRUPOS.map((g) => {
    const ds = datos[g.mundo as 'm' | 'f'];
    const porAnio = [1, 2, 3].map((a) => fmt(ds.map((d) => d.filas[`${g.cat}|${a}#${g.sx}`]?.bolsa_final ?? 0), 0));
    const f = (c: string): string => fmt(ds.map((d) => suma(d, g.cat, g.sx, `fuera_${c}`)), 1);
    return [g.nombre, ...porAnio, f('merito'), f('cierre'), f('sobra'), f('fin_colegio'), f('sin_hueco'), f('dejo_dos_plazos')];
  }));
  say('### Volumen de movimientos (todos los años de la categoría; media y rango)');
  say();
  tabla(['', 'Jugaban', 'Abandonan', '%', 'Buscan cambiar club', '%', 'Lo consiguen', 'Cambian de club', 'Siguen y suben', 'Entran: 8 años', 'mudanza', 'vuelven apartados', 'Pasan al otro sexo', 'Salen por arriba'], GRUPOS.map((g) => {
    const ds = datos[g.mundo as 'm' | 'f'];
    const s = (c: string): number[] => ds.map((d) => suma(d, g.cat, g.sx, c));
    const h = s('habia');
    return [g.nombre, fmt(h, 0), fmt(s('abandona'), 0), pct(media(s('abandona')), media(h)), fmt(s('busca'), 0), pct(media(s('busca')), media(h)), fmt(s('busca_consigue'), 0), fmt(s('cambia_club'), 0), fmt(s('sigue'), 0), fmt(s('entra_8_anos'), 0), fmt(s('entra_mudanza'), 0), fmt(s('entra_apartado_vuelve'), 0), fmt(s('pasa_otro_sexo'), 0), fmt(s('sale_por_arriba'), 0)];
  }));
  say('### Balance: jugaban al final del curso → juegan al empezar el siguiente');
  say();
  tabla(['', 'Jugaban', 'Juegan tras el verano', 'Balance'], GRUPOS.map((g) => {
    const ds = datos[g.mundo as 'm' | 'f'];
    const h = ds.map((d) => suma(d, g.cat, g.sx, 'habia')), e = ds.map((d) => suma(d, g.cat, g.sx, 'empieza_final'));
    return [g.nombre, fmt(h, 0), fmt(e, 0), `${media(e) - media(h) >= 0 ? '+' : ''}${(media(e) - media(h)).toFixed(0)} (${pct(media(e) - media(h), media(h))})`];
  }));
}
console.log(salida.join('\n'));
