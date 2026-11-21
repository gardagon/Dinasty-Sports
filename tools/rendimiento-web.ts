/**
 * Lo que tarda el juego **en un navegador de verdad** (Chromium con Playwright), en escritorio y en un móvil emulado (perfil de teléfono y CPU ×4 más lenta): crear la partida con la ciudad grande y el fútbol («creando el mundo»),
 * abrirla de nuevo (recargar la página con la partida guardada), cada acción tal como la hace el jugador (clic en el botón: lo que tarda la página en responder y volver a pintar) y guardar (copiar a texto + escribir en IndexedDB).
 *
 *   npm run rendimiento:web -- [--perfil escritorio|movil|ambos] [--acciones 60] [--semilla 35] [--json]
 *
 * Construye la web con una clave de firma de usar y tirar y publica los deportes con ella (como `probar-web`). Tarda varios minutos (crear con la ciudad grande son ~10 s en escritorio y varias veces más en el móvil emulado).
 * Un solo hilo: no lo ejecutes a la vez que otra medición.
 */
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarClaves } from '@ds/paquetes';
import { publicarDeportes } from './publicar';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const valor = (n: string, def: string): string => (args.includes(n) ? args[args.indexOf(n) + 1] : def);
const perfiles = valor('--perfil', 'ambos') === 'ambos' ? ['escritorio', 'movil'] : [valor('--perfil', 'escritorio')];
const nAcciones = Number(valor('--acciones', '60'));
const semilla = Number(valor('--semilla', '35'));
const pw = createRequire(import.meta.url)('playwright') as { chromium: { launch(): Promise<any> }; devices: Record<string, Record<string, unknown>> };
const mediana = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const p90 = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.9)];
const f = (x: number, d = 1): string => x.toFixed(d);

const claves = await generarClaves();
const dist = mkdtempSync(join(tmpdir(), 'ds-web-rend-'));
execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: join(raiz, 'apps', 'web'), env: { ...process.env, VITE_DS_CLAVE_PUBLICA: claves.publica }, stdio: 'pipe' });
await publicarDeportes(raiz, dist, claves.privada, () => undefined);
const TIPOS: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const ruta = join(dist, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  const archivo = existsSync(ruta) && statSync(ruta).isDirectory() ? join(ruta, 'index.html') : ruta;
  if (!existsSync(archivo)) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
  createReadStream(archivo).pipe(res);
});
await new Promise<void>((r) => servidor.listen(0, r));
const url = `http://localhost:${(servidor.address() as { port: number }).port}/?depurar`;
const salida: Record<string, Record<string, number>> = {};

const navegador = await pw.chromium.launch();
try {
  for (const perfil of perfiles) {
    const movil = perfil === 'movil';
    const contexto = await navegador.newContext(movil ? { ...pw.devices['Pixel 5'] } : { viewport: { width: 1100, height: 900 } });
    const pagina = await contexto.newPage();
    const cdp = await contexto.newCDPSession(pagina);
    if (movil) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await pagina.addInitScript('window.__name = (f) => f;');
    pagina.on('dialog', (d: { accept(): Promise<void> }) => void d.accept());
    const ds = <T>(fn: string): Promise<T> => pagina.evaluate(`(${fn})(window.__ds)`) as Promise<T>;
    const t0 = Date.now();
    await pagina.goto(url);
    await pagina.waitForFunction(() => '__ds' in window);
    const arranque = Date.now() - t0;

    // Instalar el fútbol y crear la partida con la ciudad grande.
    await pagina.click('[data-act="ir-opciones"]');
    await pagina.waitForSelector('[data-act="instalar-deporte"]', { timeout: 60000 });
    await pagina.locator('p.botones', { hasText: 'Fútbol' }).locator('[data-act="instalar-deporte"]').click();
    await pagina.waitForFunction(() => (window as any).__ds.deportesInstalados().includes('futbol'), undefined, { timeout: 120000 });
    await pagina.click('[data-act="ir-menu"]');
    await pagina.click('[data-act="ir-nueva"]');
    await pagina.waitForSelector('[data-deporte-incluido="futbol"]');
    const etiqueta = await pagina.evaluate(() => [...document.querySelectorAll('#pais option')].map((o) => o.textContent ?? '').find((t) => /ciudad grande/.test(t)));
    await pagina.selectOption('#pais', { label: etiqueta });
    await pagina.evaluate((s: number) => (window as any).__ds.fijarSemilla(s), semilla);
    const c0 = Date.now();
    await pagina.click('[data-act="empezar"]');
    await pagina.waitForFunction(() => !!(window as any).__ds.game, undefined, { timeout: 1800000, polling: 200 });
    const crear = (Date.now() - c0) / 1000;
    console.log(`[${perfil}] arrancar la página ${arranque} ms · crear la partida (ciudad grande + fútbol): ${f(crear)} s`);

    // Jugar: cada acción, tal como la hace el jugador (clic en el botón y esperar a que la página vuelva a pintar).
    let x = 12345;
    const azar = (): number => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const msAcciones: number[] = [];
    let sucesos = 0;
    for (let i = 0; msAcciones.length < nAcciones && i < nAcciones * 4; i++) {
      // Si hay una ventana de suceso, se elige la primera opción (o se acepta el aviso).
      if (await pagina.locator('.ventana.suceso').count()) {
        sucesos++;
        const b = pagina.locator('.ventana.suceso .suceso-opciones button:not([disabled])');
        if (await b.count()) await b.first().click();
        else await pagina.click('.ventana.suceso [data-act="aviso-visto"]');
        continue;
      }
      const botones = pagina.locator('button.action:not([disabled])');
      const n = await botones.count();
      if (!n) { await pagina.click('[data-tab="hacer"]').catch(() => undefined); continue; }
      const elegido = botones.nth(Math.floor(azar() * n));
      const ms: number = await elegido.evaluate(async (el: HTMLElement) => {
        const t = performance.now();
        el.click();
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        return performance.now() - t;
      });
      msAcciones.push(ms);
    }
    const dia = await ds<number>('(d) => d.game.time.day');

    // Guardar: copiar a texto + escribir en IndexedDB (lo mismo que hace `serializarPartida` + `almacen.guardar`).
    const guardados: { texto: number; idb: number; kb: number }[] = [];
    for (let i = 0; i < 5; i++) {
      guardados.push(await pagina.evaluate(async () => {
        const g = (window as any).__ds.game;
        const a = performance.now();
        const texto: string = g.serializarJSON({ formato: 'x', version: 1, agenda: [] });
        const b = performance.now();
        const db: IDBDatabase = await new Promise((res, rej) => { const q = indexedDB.open('ds-medida', 1); q.onupgradeneeded = () => q.result.createObjectStore('p'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
        await new Promise<void>((res, rej) => { const tx = db.transaction('p', 'readwrite'); tx.objectStore('p').put(texto, 'actual'); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
        return { texto: b - a, idb: performance.now() - b, kb: texto.length / 1024 };
      }));
    }
    // El botón «Guardar partida» de verdad, de punta a punta.
    const abrirOpciones = pagina.locator('[data-act="ir-opciones"]');
    if (await abrirOpciones.count()) await abrirOpciones.first().click();
    // Abrir de nuevo: recargar la página con la partida guardada (se guarda antes con el botón del juego).
    const botonGuardar = pagina.locator('[data-act="guardar"]');
    if (await botonGuardar.count()) await botonGuardar.first().click();
    await pagina.waitForTimeout(3000);
    const r0 = Date.now();
    await pagina.reload();
    await pagina.waitForFunction(() => !!(window as any).__ds?.game, undefined, { timeout: 600000, polling: 100 }).catch(() => undefined);
    const abrir = Date.now() - r0;
    const abierta = await pagina.evaluate(() => !!(window as any).__ds?.game);

    salida[perfil] = {
      arranqueMs: arranque, crearS: crear, accionMedianaMs: mediana(msAcciones), accionP90Ms: p90(msAcciones), accionMaxMs: Math.max(...msAcciones), acciones: msAcciones.length, sucesos, dia,
      guardarTextoMs: mediana(guardados.map((g) => g.texto)), guardarIdbMs: mediana(guardados.map((g) => g.idb)), estadoKB: guardados[0].kb, abrirMs: abierta ? abrir : -1,
    };
    console.log(`[${perfil}] ${msAcciones.length} acciones (día ${dia}, ${sucesos} sucesos): mediana ${f(mediana(msAcciones))} ms · p90 ${f(p90(msAcciones))} ms · máx ${f(Math.max(...msAcciones))} ms`);
    console.log(`[${perfil}] guardar: a texto ${f(salida[perfil].guardarTextoMs)} ms + IndexedDB ${f(salida[perfil].guardarIdbMs)} ms (${f(guardados[0].kb, 0)} KB) · abrir de nuevo: ${abierta ? `${abrir} ms` : 'no se abrió'}`);
    await contexto.close();
  }
  if (args.includes('--json')) console.log('JSON ' + JSON.stringify(salida));
} finally {
  await navegador.close();
  servidor.close();
  rmSync(dist, { recursive: true, force: true });
}
