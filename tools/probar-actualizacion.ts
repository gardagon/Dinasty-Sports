/**
 * La prueba de la actualización **en un Chromium de verdad**: construye la web dos veces seguidas con distinta versión, sirve la primera como lo hace GitHub Pages (todo con `Cache-Control: max-age=600`),
 * abre la app con el service worker activo, crea una partida, publica la segunda compilación en el mismo servidor y comprueba que la app: ve la nueva (aviso «Hay una versión nueva — Actualizar»),
 * al pulsarlo guarda y recarga con la nueva **sin perder la partida**, y que «Buscar actualización» en Opciones dice «Estás al día» cuando ya lo está.
 * `npm run probar-actualizacion` (~1 min).
 */
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarClaves } from '@ds/paquetes';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: { launch(): Promise<any> } };
const comprobar = (ok: boolean, texto: string): void => {
  console.log(`${ok ? '✓' : '✗'} ${texto}`);
  if (!ok) throw new Error(`Falló: ${texto}`);
};

const claves = await generarClaves();
const construir = (id: string, fecha: string): string => {
  const dist = mkdtempSync(join(tmpdir(), 'ds-act-'));
  execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], {
    cwd: join(raiz, 'apps', 'web'),
    env: { ...process.env, VITE_DS_CLAVE_PUBLICA: claves.publica, DS_VERSION_ID: id, DS_FECHA: fecha, DS_RAMA: 'prueba' },
    stdio: 'pipe',
  });
  return dist;
};
console.log('Construyendo dos compilaciones seguidas…');
const dirA = construir('aaaaaaa1111111111111111111111111111111a', '2026-11-22T10:00:00.000Z');
const dirB = construir('bbbbbbb2222222222222222222222222222222b', '2026-11-22T11:00:00.000Z');
comprobar(existsSync(join(dirA, 'version.json')) && existsSync(join(dirB, 'version.json')), 'cada compilación publica su version.json');

// Como GitHub Pages: todo se sirve con `max-age=600` (la caché HTTP del navegador puede dar copias de hasta 10 minutos).
const TIPOS: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
let publicada = dirA;
const servidor = createServer((req, res) => {
  const ruta = join(publicada, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  const archivo = existsSync(ruta) && statSync(ruta).isDirectory() ? join(ruta, 'index.html') : ruta;
  if (!existsSync(archivo)) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream', 'cache-control': 'max-age=600' });
  createReadStream(archivo).pipe(res);
});
await new Promise<void>((r) => servidor.listen(0, r));
const puerto = (servidor.address() as { port: number }).port;

const navegador = await chromium.launch();
try {
  const contexto = await navegador.newContext({ viewport: { width: 480, height: 900 } });
  const pagina = await contexto.newPage();
  const errores: string[] = [];
  pagina.on('pageerror', (e: { message: string }) => errores.push(e.message));
  pagina.on('dialog', (d: { message(): string; accept(): Promise<void> }) => {
    errores.push(`aviso de la página: ${d.message()}`);
    void d.accept();
  });
  const ds = <T>(f: string): Promise<T> => pagina.evaluate(`window.__ds.${f}`);

  await pagina.goto(`http://localhost:${puerto}/?depurar`);
  await pagina.waitForFunction(() => '__ds' in window);
  comprobar((await ds<{ commit: string }>('version()')).commit === 'aaaaaaa', 'la app arranca con la compilación A (commit aaaaaaa)');
  comprobar((await pagina.textContent('.version-pie'))?.includes('aaaaaaa') === true, 'el menú enseña la versión en pequeño');
  await pagina.evaluate(() => navigator.serviceWorker.ready);
  await pagina.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 10000 }).catch(async () => {
    await pagina.reload(); // la primera vez la página puede no estar controlada hasta recargar
    await pagina.waitForFunction(() => '__ds' in window);
  });
  comprobar(await pagina.evaluate(() => !!navigator.serviceWorker.controller), 'el service worker está activo y controla la página');

  // Opciones enseña la versión y no hay aviso (A es la publicada).
  await pagina.click('[data-act="ir-opciones"]');
  comprobar(((await pagina.textContent('#version-texto')) ?? '').includes('aaaaaaa') && ((await pagina.textContent('#version-texto')) ?? '').includes('rama prueba'), 'Opciones enseña commit, fecha y rama');
  await pagina.click('[data-act="buscar-actualizacion"]');
  await pagina.waitForFunction(() => document.body.textContent?.includes('Estás al día'));
  comprobar(true, '«Buscar actualización» con la misma versión dice «Estás al día»');
  await pagina.click('[data-act="ir-menu"]');

  // Una partida (solo atletismo, para que sea rápida) con algo de juego hecho.
  await pagina.click('[data-act="ir-nueva"]');
  await pagina.waitForSelector('[data-act="empezar"]');
  await pagina.evaluate(`window.__ds.fijarSemilla(7)`);
  await pagina.click('[data-act="empezar"]');
  await pagina.waitForFunction(() => !!(window as unknown as { __ds: { game: unknown } }).__ds.game, undefined, { timeout: 120000 });
  const diaAntes = await ds<number>('game.time.minute');
  await pagina.evaluate(`window.__ds.hastaElMinuto(window.__ds.game.time.minute + 120)`);
  const minutoAntes = await ds<number>('game.time.minute');
  const nombre = await ds<string>('game.playerName');
  comprobar(minutoAntes > diaAntes, `hay una partida en marcha («${nombre}») con juego hecho sin guardar`);

  // Se publica la compilación B en el mismo servidor.
  publicada = dirB;
  await ds('buscarActualizacion()');
  await pagina.waitForSelector('.aviso-actualizacion', { timeout: 10000 });
  comprobar(((await pagina.textContent('.aviso-actualizacion')) ?? '').includes('Hay una versión nueva del juego'), 'al publicar B, la app (con el worker activo y max-age=600) avisa «Hay una versión nueva — Actualizar»');
  await pagina.screenshot({ path: join(tmpdir(), 'ds-actualizacion-aviso.png') });

  // Actualizar: guarda y recarga con la nueva.
  await Promise.all([pagina.waitForNavigation({ waitUntil: 'load' }), pagina.click('.aviso-actualizacion [data-act="actualizar"]')]);
  await pagina.waitForFunction(() => '__ds' in window);
  comprobar((await ds<{ commit: string }>('version()')).commit === 'bbbbbbb', 'tras actualizar, la app corre la compilación B (commit bbbbbbb)');
  comprobar((await pagina.$('.aviso-actualizacion')) === null, 'el aviso desaparece');
  await pagina.click('[data-act="continuar"]');
  await pagina.waitForFunction(() => !!(window as unknown as { __ds: { game: unknown } }).__ds.game, undefined, { timeout: 60000 });
  comprobar((await ds<string>('game.playerName')) === nombre, 'la partida sigue ahí (mismo personaje)');
  comprobar((await ds<number>('game.time.minute')) === minutoAntes, 'y en el mismo minuto: lo jugado antes de actualizar se guardó');
  comprobar(errores.length === 0, `sin errores en la página${errores.length ? `: ${errores.join(' | ')}` : ''}`);
  console.log('Todo bien: la app instalada detecta la versión nueva y se actualiza sin perder la partida.');
} finally {
  await navegador.close();
  servidor.close();
}
