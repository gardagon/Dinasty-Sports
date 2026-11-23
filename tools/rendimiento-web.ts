/**
 * Lo que tarda el juego **en un navegador de verdad** (Chromium con Playwright), en escritorio y en un móvil emulado (perfil de teléfono y CPU ×4 más lenta): crear la partida con la ciudad grande y el fútbol («creando el mundo»),
 * abrirla de nuevo (recargar la página con la partida guardada), cada acción tal como la hace el jugador (clic en el botón: lo que tarda la página en responder y volver a pintar) y guardar (copiar a texto + escribir en IndexedDB).
 *
 *   npm run rendimiento:web -- [--perfil escritorio|movil4|movil6|escritorio-pagina|todos] [--ciudad grande|prueba|ambas] [--pasadas 1] [--acciones 60] [--semilla 35] [--json]
 *
 * - Perfiles: `escritorio` (1100×900, sin límite), `movil4` y `movil6` (Pixel 5 y CPU ×4 o ×6 más lenta; `movil` = `movil4`, `ambos` = escritorio y móvil ×4), `escritorio-pagina` (sin límite pero creando la partida en la página, como en los móviles).
 *   **El límite de CPU de Chromium (`Emulation.setCPUThrottlingRate`) no se puede poner a un trabajador** («solo para páginas»): en los perfiles de móvil se quita `Worker` de la página para que cree la partida ella misma (el camino que la web ya tiene
 *   sin trabajadores), en su hilo, que sí está limitado. La cifra de crear es entonces el trabajo de crear a ×4/×6 **sin** el texto de ida y vuelta del trabajador (guardar a texto en él y abrirlo en la página: ver «abrir») y con la página quieta mientras dura.
 * - Ciudades: `grande` (España · ciudad grande con el fútbol instalado, ~6.100 personas) y `prueba` (España de siempre, ~1.400 personas, solo atletismo: lo que se juega por defecto).
 * - `--pasadas N`: repite todo en N contextos nuevos y da la mediana y el rango.
 * - Cruzar de día y de semana: se avanza «descansar» de 5 en 5 minutos hasta justo antes del cambio y se cronometra el paso que lo cruza: motor (`perform`) y total (motor + repintar + dos `requestAnimationFrame`).
 *   Se cruzan 8 días seguidos y 6 semanas seguidas; la jornada de liga (~75 partidos del mundo) se juega al cerrar cada semana de clase desde que acaba la pretemporada.
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
const PERFILES: Record<string, { rate: number; trabajador: boolean }> = { escritorio: { rate: 1, trabajador: true }, 'escritorio-pagina': { rate: 1, trabajador: false }, movil4: { rate: 4, trabajador: false }, movil6: { rate: 6, trabajador: false } };
const pedido = valor('--perfil', 'ambos');
const perfiles = pedido === 'ambos' ? ['escritorio', 'movil4'] : pedido === 'todos' ? ['escritorio', 'movil4', 'movil6'] : [pedido === 'movil' ? 'movil4' : pedido];
const ciudadesPedidas = valor('--ciudad', 'grande') === 'ambas' ? ['grande', 'prueba'] : [valor('--ciudad', 'grande')];
const pasadas = Number(valor('--pasadas', '1'));
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
  for (let numPasada = 0; numPasada < pasadas; numPasada++) for (const ciudadId of ciudadesPedidas) for (const perfil of perfiles) {
    const cfg = PERFILES[perfil];
    if (!cfg) throw new Error(`Perfil desconocido: ${perfil}`);
    const grande = ciudadId === 'grande';
    const etq = `${ciudadId}/${perfil}#${numPasada + 1}`;
    const movil = perfil.startsWith('movil');
    const contexto = await navegador.newContext(movil ? { ...pw.devices['Pixel 5'] } : { viewport: { width: 1100, height: 900 } });
    const pagina = await contexto.newPage();
    const cdp = await contexto.newCDPSession(pagina);
    if (cfg.rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cfg.rate });
    await pagina.addInitScript('window.__name = (f) => f;');
    // Sin trabajador la página crea la partida ella misma, en su hilo (el único que se puede limitar): ver la cabecera.
    if (!cfg.trabajador) await pagina.addInitScript('delete window.Worker;');
    pagina.on('dialog', (d: { accept(): Promise<void> }) => void d.accept());
    const ds = <T>(fn: string): Promise<T> => pagina.evaluate(`(${fn})(window.__ds)`) as Promise<T>;
    const t0 = Date.now();
    await pagina.goto(url);
    await pagina.waitForFunction(() => '__ds' in window);
    const arranque = Date.now() - t0;

    // Con la ciudad grande: instalar el fútbol y crear la partida con ella; con la de prueba, la partida por defecto (España, atletismo).
    if (grande) {
      await pagina.click('[data-act="ir-opciones"]');
      await pagina.waitForSelector('[data-act="instalar-deporte"]', { timeout: 60000 });
      await pagina.locator('p.botones', { hasText: 'Fútbol' }).locator('[data-act="instalar-deporte"]').click();
      await pagina.waitForFunction(() => (window as any).__ds.deportesInstalados().includes('futbol'), undefined, { timeout: 120000 });
      await pagina.click('[data-act="ir-menu"]');
    }
    await pagina.click('[data-act="ir-nueva"]');
    if (grande) {
      await pagina.waitForSelector('[data-deporte-incluido="futbol"]');
      const etiqueta = await pagina.evaluate(() => [...document.querySelectorAll('#pais option')].map((o) => o.textContent ?? '').find((t) => /ciudad grande/.test(t)));
      await pagina.selectOption('#pais', { label: etiqueta });
    }
    await pagina.evaluate((s: number) => (window as any).__ds.fijarSemilla(s), semilla);
    const c0 = Date.now();
    await pagina.click('[data-act="empezar"]');
    await pagina.waitForFunction(() => !!(window as any).__ds.game, undefined, { timeout: 3600000, polling: 200 });
    const crear = (Date.now() - c0) / 1000;
    console.log(`[${etq}] arrancar la página ${arranque} ms · crear la partida (${grande ? 'ciudad grande + fútbol' : 'ciudad de prueba'}${cfg.trabajador ? ', en un trabajador' : ', en la página'}): ${f(crear)} s`);

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

    // Cruzar de día y de semana: se avanza hasta justo antes y se cronometra el paso que cruza (motor y total con el repintado).
    const pasarHasta = async (minuto: number): Promise<void> => {
      for (let intentos = 0; intentos < 40; intentos++) {
        await pagina.evaluate((m: number) => (window as any).__ds.hastaElMinuto(m), minuto);
        if ((await pagina.evaluate(() => (window as any).__ds.game.time.minute as number)) >= minuto) return;
        // Una ventana de suceso detiene el tiempo: se elige la primera opción y se sigue.
        if (await pagina.locator('.ventana.suceso').count()) {
          const b = pagina.locator('.ventana.suceso .suceso-opciones button:not([disabled])');
          if (await b.count()) await b.first().click();
          else await pagina.click('.ventana.suceso [data-act="aviso-visto"]');
        } else await pagina.evaluate(() => (window as any).__ds.render());
      }
      throw new Error('No se pudo avanzar el tiempo');
    };
    const cruce = (): Promise<{ motor: number; total: number }> =>
      pagina.evaluate(async () => {
        const d = (window as any).__ds;
        const t = performance.now();
        if (!d.game.perform('gen.descansar').ok) d.game.perform('gen.esperar');
        const motor = performance.now() - t;
        d.render();
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        return { motor, total: performance.now() - t };
      });
    const MIN_DIA = 1440;
    const cruzaDia: { motor: number; total: number }[] = [];
    for (let k = 0; k < 8; k++) {
      const hoy = await ds<number>('(d) => d.game.time.day');
      await pasarHasta((hoy + 1) * MIN_DIA - 5);
      // Si el paso de antes ya cruzó (acabó justo en el límite), se salta ese día.
      if ((await ds<number>('(d) => d.game.time.day')) !== hoy) continue;
      cruzaDia.push(await cruce());
    }
    const cruzaSemana: { motor: number; total: number }[] = [];
    for (let k = 0; k < 6; k++) {
      const sem = await ds<number>('(d) => d.game.time.week');
      await pasarHasta((sem + 1) * 7 * MIN_DIA - 5);
      if ((await ds<number>('(d) => d.game.time.week')) !== sem) continue;
      cruzaSemana.push(await cruce());
    }
    console.log(`[${etq}] cruzar de día (${cruzaDia.length}): motor mediana ${f(mediana(cruzaDia.map((x) => x.motor)))} ms · total (con repintado) mediana ${f(mediana(cruzaDia.map((x) => x.total)))} ms · máx ${f(Math.max(...cruzaDia.map((x) => x.total)))} ms`);
    console.log(`[${etq}] cruzar de semana (${cruzaSemana.length}): motor ${cruzaSemana.map((x) => f(x.motor, 0)).join(' / ')} ms · total ${cruzaSemana.map((x) => f(x.total, 0)).join(' / ')} ms`);

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
    // Guardar de verdad (por trozos, con pausas, hasta IndexedDB) frente al guardado de golpe de antes: lo más que se detiene la página (tareas largas) y,
    // con un clic en mitad del guardado, lo que tarda en responder.
    // La parada se mide con un reloj que no para: un mensaje que se reenvía a sí mismo sin descanso; el hueco más largo entre dos vueltas es lo más que ha estado bloqueada la página.
    const vigilar = `(() => { const c = new MessageChannel(); let ultimo = performance.now(); window.__hueco = 0; c.port1.onmessage = () => { const t = performance.now(); window.__hueco = Math.max(window.__hueco, t - ultimo); ultimo = t; c.port2.postMessage(0); }; c.port2.postMessage(0); })()`;
    await pagina.evaluate(vigilar);
    const largaMax = (): Promise<number> => pagina.evaluate(() => (window as any).__hueco as number);
    const reiniciarLargas = (): Promise<void> => pagina.evaluate(() => { (window as any).__hueco = 0; });
    await reiniciarLargas();
    // «Antes»: texto de golpe + IndexedDB, en el hilo de la página.
    const deGolpe = await pagina.evaluate(async () => {
      const g = (window as any).__ds.game;
      const t = performance.now();
      const texto: string = g.serializarJSON({ formato: 'x', version: 1, agenda: [] });
      const db: IDBDatabase = await new Promise((res, rej) => { const q = indexedDB.open('ds-medida', 1); q.onupgradeneeded = () => q.result.createObjectStore('p'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
      const sinc0 = performance.now();
      await new Promise<void>((res, rej) => { const tx = db.transaction('p', 'readwrite'); const rq = tx.objectStore('p').put(texto, 'actual'); const sinc = performance.now() - sinc0; (window as any).__putSinc = sinc; tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
      return { total: performance.now() - t, putSincMs: (window as any).__putSinc as number };
    });
    await pagina.waitForTimeout(300);
    const largaDeGolpe = await largaMax();
    // «Ahora»: el guardado del juego (3 veces).
    const porTrozos: { total: number; largaMax: number; trabajo: number; bloqueo: number }[] = [];
    for (let i = 0; i < 3; i++) {
      await reiniciarLargas();
      const r = await pagina.evaluate(async () => { const t = performance.now(); const x = await (window as any).__ds.guardarAhora(); return { total: performance.now() - t, ...x }; });
      await pagina.waitForTimeout(200);
      porTrozos.push({ total: r.total, largaMax: await largaMax(), trabajo: r.msDeTrabajo, bloqueo: r.bloqueo });
    }
    // Un clic en mitad de un guardado: lo que tarda la página en responder y volver a pintar.
    const clicsDuranteGuardado: number[] = [];
    for (let i = 0; i < 6; i++) {
      await pagina.evaluate(() => { (window as any).__guardando = (window as any).__ds.guardarAhora(); });
      await pagina.waitForTimeout(60 + i * 50);
      const botones = pagina.locator('button.action:not([disabled])');
      if (!(await botones.count())) break;
      clicsDuranteGuardado.push(await botones.nth(Math.floor(azar() * (await botones.count()))).evaluate(async (el: HTMLElement) => {
        const t = performance.now();
        el.click();
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        return performance.now() - t;
      }));
      await pagina.evaluate(() => (window as any).__guardando);
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

    salida[`${ciudadId}|${perfil}|${numPasada + 1}`] = {
      arranqueMs: arranque, crearS: crear,
      diaMotorMs: mediana(cruzaDia.map((x) => x.motor)), diaTotalMs: mediana(cruzaDia.map((x) => x.total)), diaMaxMs: Math.max(...cruzaDia.map((x) => x.total)),
      semanaMotorMedianaMs: mediana(cruzaSemana.map((x) => x.motor)), semanaTotalMedianaMs: mediana(cruzaSemana.map((x) => x.total)), semanaTotalMaxMs: Math.max(...cruzaSemana.map((x) => x.total)), semanaTotales: cruzaSemana.map((x) => x.total) as unknown as number, accionMedianaMs: mediana(msAcciones), accionP90Ms: p90(msAcciones), accionMaxMs: Math.max(...msAcciones), acciones: msAcciones.length, sucesos, dia,
      guardarDeGolpeTotalMs: deGolpe.total, guardarDeGolpeLargaMs: largaDeGolpe, guardarPutSincMs: deGolpe.putSincMs,
      guardarTrozosTotalMs: mediana(porTrozos.map((g) => g.total)), guardarTrozosLargaMs: Math.max(...porTrozos.map((g) => g.largaMax)), guardarTrozosTrabajoMs: mediana(porTrozos.map((g) => g.trabajo)),
      clicDuranteGuardadoMedianaMs: clicsDuranteGuardado.length ? mediana(clicsDuranteGuardado) : -1, clicDuranteGuardadoMaxMs: clicsDuranteGuardado.length ? Math.max(...clicsDuranteGuardado) : -1,
      guardarTextoMs: mediana(guardados.map((g) => g.texto)), guardarIdbMs: mediana(guardados.map((g) => g.idb)), estadoKB: guardados[0].kb, abrirMs: abierta ? abrir : -1,
    };
    console.log(`[${etq}] ${msAcciones.length} acciones (día ${dia}, ${sucesos} sucesos): mediana ${f(mediana(msAcciones))} ms · p90 ${f(p90(msAcciones))} ms · máx ${f(Math.max(...msAcciones))} ms`);
    console.log(`[${etq}] guardar: a texto ${f(salida[`${ciudadId}|${perfil}|${numPasada + 1}`].guardarTextoMs)} ms + IndexedDB ${f(salida[`${ciudadId}|${perfil}|${numPasada + 1}`].guardarIdbMs)} ms (${f(guardados[0].kb, 0)} KB) · abrir de nuevo: ${abierta ? `${abrir} ms` : 'no se abrió'}`);
    console.log(`[${etq}] guardar DE GOLPE (antes): ${f(deGolpe.total)} ms en total, la página se detiene como máximo ${f(largaDeGolpe)} ms (de ellos, el put de IndexedDB bloquea ${f(deGolpe.putSincMs)} ms)`);
    console.log(`[${etq}] guardar POR TROZOS (ahora): ${f(salida[`${ciudadId}|${perfil}|${numPasada + 1}`].guardarTrozosTotalMs)} ms en total (${f(salida[`${ciudadId}|${perfil}|${numPasada + 1}`].guardarTrozosTrabajoMs)} ms de trabajo, trozo más largo ${f(Math.max(...porTrozos.map((g) => g.bloqueo)))} ms), la página se detiene como máximo ${f(salida[`${ciudadId}|${perfil}|${numPasada + 1}`].guardarTrozosLargaMs)} ms`);
    console.log(`[${etq}] clic durante el guardado (${clicsDuranteGuardado.length}): mediana ${f(salida[`${ciudadId}|${perfil}|${numPasada + 1}`].clicDuranteGuardadoMedianaMs)} ms · máx ${f(salida[`${ciudadId}|${perfil}|${numPasada + 1}`].clicDuranteGuardadoMaxMs)} ms`);
    await contexto.close();
  }
  if (args.includes('--json')) console.log('JSON ' + JSON.stringify(salida));
} finally {
  await navegador.close();
  servidor.close();
  rmSync(dist, { recursive: true, force: true });
}
