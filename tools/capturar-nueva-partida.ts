/**
 * Capturas de «Nueva partida» (y del menú de inicio) a 1920 y 390 px, en claro y oscuro, con la ciudad grande elegida (la que lleva el aviso del tiempo de creación).
 * Sirve para comparar antes y después de tocar esa pantalla (`docs/relevo/arreglos-24-11.md`). No crea ninguna partida.
 * `npx tsx tools/capturar-nueva-partida.ts <carpeta> <etiqueta: antes|despues> [--anchos 1920,390]`
 */
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarClaves } from '@ds/paquetes';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = resolve(process.argv[2] ?? join(tmpdir(), 'ds-nueva-partida'));
const etiqueta = process.argv[3] ?? 'despues';
const i = process.argv.indexOf('--anchos');
const anchos = (i >= 0 ? process.argv[i + 1] : '1920,390').split(',').map(Number);
mkdirSync(carpeta, { recursive: true });
const pw = createRequire(import.meta.url)('playwright') as { chromium: { launch(): Promise<any> } };

const claves = await generarClaves();
const dist = mkdtempSync(join(tmpdir(), 'ds-web-'));
execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: join(raiz, 'apps', 'web'), env: { ...process.env, VITE_DS_CLAVE_PUBLICA: claves.publica }, stdio: 'pipe' });
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
const navegador = await pw.chromium.launch();
try {
  for (const ancho of anchos) {
    for (const tema of ['light', 'dark']) {
      const contexto = await navegador.newContext({ viewport: { width: ancho, height: ancho > 800 ? 1080 : 844 }, colorScheme: tema, deviceScaleFactor: 2 });
      const pagina = await contexto.newPage();
      await pagina.addInitScript('window.__name = (f) => f;');
      await pagina.goto(`http://localhost:${puerto}/`);
      await pagina.waitForSelector('[data-act="ir-nueva"]');
      const nombre = `${etiqueta}-${ancho}-${tema === 'light' ? 'claro' : 'oscuro'}`;
      await pagina.screenshot({ path: join(carpeta, `${nombre}-menu.png`), fullPage: true });
      await pagina.click('[data-act="ir-nueva"]');
      await pagina.waitForSelector('#pais');
      await pagina.selectOption('#pais', 'espana_ciudad_grande');
      await pagina.waitForTimeout(300);
      await pagina.screenshot({ path: join(carpeta, `${nombre}-nueva.png`), fullPage: true });
      await contexto.close();
    }
  }
  console.log(`Capturas en ${carpeta}`);
} finally {
  await navegador.close();
  servidor.close();
}
