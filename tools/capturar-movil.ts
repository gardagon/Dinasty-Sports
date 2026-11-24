/**
 * Captura la ficha del personaje, su evolución y la pestaña «Deporte» en un móvil (por defecto Pixel 5) con el tema que se pida,
 * tras instalar el fútbol y crear una partida con la ciudad grande. También vuelca los estilos calculados de todos los
 * ascendientes del retrato (opacidad, filtro, mezcla) para ver si algo se hereda.
 * `npx tsx tools/capturar-movil.ts <carpeta> [oscuro|claro] [movil|escritorio] [semilla]` (tarda ~2 min).
 */
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarClaves } from '@ds/paquetes';
import { publicarDeportes } from './publicar';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const salida = resolve(process.argv[2] ?? join(tmpdir(), 'ds-movil'));
const tema = process.argv[3] === 'claro' ? 'light' : 'dark';
const aparato = process.argv[4] === 'escritorio' ? 'escritorio' : 'movil';
const semilla = Number(process.argv[5] ?? 35);
mkdirSync(salida, { recursive: true });
const pw = createRequire(import.meta.url)('playwright') as { chromium: { launch(): Promise<any> }; devices: Record<string, any> };
const claves = await generarClaves();
const dist = mkdtempSync(join(tmpdir(), 'ds-web-'));
execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: join(raiz, 'apps', 'web'), env: { ...process.env, VITE_DS_CLAVE_PUBLICA: claves.publica }, stdio: 'pipe' });
await publicarDeportes(raiz, dist, claves.privada, () => {});
const TIPOS: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const ruta = join(dist, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  const archivo = existsSync(ruta) && statSync(ruta).isDirectory() ? join(ruta, 'index.html') : ruta;
  if (!existsSync(archivo)) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
  createReadStream(archivo).pipe(res);
});
await new Promise<void>((r) => servidor.listen(0, r));
const puerto = (servidor.address() as { port: number }).port;
const navegador = await (pw.chromium as any).launch({ args: (process.env.DS_ARGS ?? '').split(' ').filter(Boolean) });
try {
  const opciones = aparato === 'movil' ? { ...pw.devices['Pixel 5'], deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 };
  const contexto = await navegador.newContext({ ...opciones, colorScheme: tema });
  const pagina = await contexto.newPage();
  // DS_AUTODARK=1: el «modo oscuro automático» de Chrome para Android (oscurece a la fuerza las páginas que no se declaran oscuras).
  if (process.env.DS_AUTODARK) await (await contexto.newCDPSession(pagina)).send('Emulation.setAutoDarkModeOverride', { enabled: true });
  await pagina.addInitScript('window.__name = (f) => f;');
  pagina.on('dialog', (d: any) => void d.accept());
  await pagina.goto(`http://localhost:${puerto}/?depurar`);
  await pagina.waitForFunction(() => '__ds' in window);
  await pagina.click('[data-act="ir-opciones"]');
  await pagina.waitForSelector('[data-act="instalar-deporte"]', { timeout: 20000 });
  await pagina.locator('p.botones', { hasText: 'Fútbol' }).locator('[data-act="instalar-deporte"]').click();
  await pagina.waitForFunction(() => (window as any).__ds.deportesInstalados().includes('futbol'), undefined, { timeout: 30000 });
  await pagina.click('[data-act="ir-menu"]');
  await pagina.click('[data-act="ir-nueva"]');
  await pagina.waitForSelector('[data-deporte-incluido="futbol"]');
  await pagina.selectOption('#pais', { label: 'España · ciudad grande' });
  await pagina.evaluate((s: number) => (window as any).__ds.fijarSemilla(s), semilla);
  await pagina.click('[data-act="empezar"]');
  await pagina.waitForFunction(() => !!(window as any).__ds.game, undefined, { timeout: 300000 });
  await pagina.waitForTimeout(1500);
  await pagina.screenshot({ path: join(salida, '1-inicio.png') });
  await pagina.click('[data-tab="personaje"]');
  await pagina.waitForTimeout(500);
  await pagina.screenshot({ path: join(salida, '2-personaje.png') });
  await pagina.click('[data-retrato="evolucion"]');
  await pagina.waitForSelector('.evolucion');
  await pagina.waitForTimeout(500);
  await pagina.locator('.evolucion').scrollIntoViewIfNeeded();
  await pagina.screenshot({ path: join(salida, '3-evolucion.png') });
  const estilos = await pagina.evaluate(() => {
    const out: string[] = [];
    for (const sel of ['.retrato-boton svg', '.evolucion-fila svg']) {
      let e: Element | null = document.querySelector(sel);
      while (e) {
        const c = getComputedStyle(e);
        out.push(`${sel} <${e.tagName.toLowerCase()}.${(e as HTMLElement).className?.toString?.().slice(0, 30)}> opacity=${c.opacity} filter=${c.filter} mix=${c.mixBlendMode} color=${c.color} bg=${c.backgroundColor} fill-opacity=${c.fillOpacity}`);
        e = e.parentElement;
      }
    }
    return out;
  });
  await pagina.click('[data-tab="deporte"]', { force: true }).catch(() => {});
  const tabs = await pagina.$$eval('.tab', (ts: Element[]) => ts.map((t) => `${t.textContent} disabled=${(t as HTMLButtonElement).disabled} title=${t.getAttribute('title')}`));
  await pagina.screenshot({ path: join(salida, '4-deporte.png') });
  const svg = await pagina.evaluate(() => document.querySelector('.evolucion-fila svg')?.outerHTML.slice(0, 1500) ?? '');
  writeFileSync(join(salida, 'estilos.txt'), [...estilos, '', ...tabs, '', svg].join('\n'));
  console.log([...estilos, ...tabs].join('\n'));
} finally {
  await navegador.close();
  servidor.close();
}
