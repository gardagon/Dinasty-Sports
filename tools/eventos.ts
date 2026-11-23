/**
 * La herramienta de los eventos (sucesos). Formato y ejemplos: docs/ANEXO_EVENTOS.md.
 *
 *   npm run eventos:nuevo -- eventos.familia.cena "Una cena tensa"   crea el archivo con una plantilla comentada y lo apunta en el índice
 *   npm run eventos:validar                                          lo comprueba todo: forma, referencias, textos, memoria, escenarios y todos los caminos
 *   npm run eventos:probar -- eventos.familia.faltas                 enseña un hilo (o un suceso) por todos sus caminos, con sus textos
 *   npm run eventos:probar -- eventos.familia.faltas --elige prometer,…   solo los caminos que pasan por esas opciones
 *   npm run eventos:probar -- <hilo o suceso> --sin-duro             lo que queda con el contenido duro desactivado
 *   npm run eventos:mapa                                             escribe docs/eventos/MAPA.md: hilos, sucesos, quién programa a quién y las marcas
 *   npm run eventos:indice                                           rehace modules/eventos/src/catalogo.ts
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SIN_CONTENIDO_DURO, condicionesDeSuceso, efectosDeSuceso } from '@ds/contracts';
import { Banco, correrTodo, recorrer } from './eventos/banco';
import { RAIZ_DE_EVENTOS, escribirIndice, indiceAlDia } from './eventos/indice';

const [orden, ...args] = process.argv.slice(2);
const RAIZ = join(import.meta.dirname, '..');

function nuevo(): void {
  const [id, titulo] = args;
  const m = /^eventos\.([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)$/.exec(id ?? '');
  if (!m) {
    console.error('Uso: npm run eventos:nuevo -- eventos.<área>.<nombre> "Título"   (minúsculas, números y _)\nLos eventos de un deporte se escriben igual, en una carpeta de su módulo, con «deporte: \'<id>\'» y los aporta él.');
    process.exit(1);
  }
  const [, area, nombre] = m;
  const archivo = join(RAIZ_DE_EVENTOS, area, `${nombre}.ts`);
  if (existsSync(archivo)) {
    console.error(`Ya existe ${archivo}`);
    process.exit(1);
  }
  mkdirSync(dirname(archivo), { recursive: true });
  writeFileSync(
    archivo,
    `import { suceso } from '@ds/contracts';

/** ${titulo ?? nombre}: qué pasa y por qué (una o dos líneas para quien lo lea después). */
export default suceso({
  id: '${id}',
  titulo: '${(titulo ?? nombre).replace(/'/g, "\\'")}',
  // categoria: 'menor',                         // un detalle ligero: tiene su propio cupo y no compite con los importantes

  // CUÁNDO puede salir. Uno de: { al: 'una.señal' } · { cada: 'dia' | 'semana', prob } · { umbral: [condiciones] } · { programado: true }
  disparo: { cada: 'dia', prob: 0.05 },
  // El momento adecuado: todas deben cumplirse. P. ej. { lugar: 'casa' }, { hora: { desde: 20 * 60 } }, { stat: 'gen.estres', min: 60 },
  // { hecho: 'edad', min: 10 }, { periodo: 'clase' }, { presente: 'quien' }, { marca: 'algo' }, { no: { marca: 'algo' } }
  cuando: [],
  repite: { espera: { dias: 30 } },              // 'nunca' · 'una_vez_por_curso' · 'siempre' · { espera: { dias } }
  // requiere: ['estudios'],                     // módulos sin los que este evento no existe

  // QUIÉN participa: papeles que el juego reparte. P. ej. { tipo: 'progenitor' }, { rol: 'entrenador' }, { relacion: { afinidad: { min: 20 } }, presente: true }
  // reparto: { quien: { conocido: true, presente: true } },

  // QUÉ SE LEE. {quien.nombre} / {quien.Nombre}, {quien:o|a}, {yo:o|a}, {señal.dato}, {recuerdo.dato}
  texto: 'Escribe aquí lo que pasa.',

  // QUÉ SE PUEDE ELEGIR (si no hay opciones es un aviso: pon sus «efectos» aquí arriba) y QUÉ DEJA cada opción.
  // Efectos: { estado: 'gen.estres', mas: 5 } · { entrena: 'gen.carisma', cantidad: 1 } · { relacion: 'quien', afinidad: 3 } · { caracter: { disciplina: 1 } }
  //          { marca: 'algo', dura: { dias: 30 } } · { programa: 'eventos.area.otro', en: { dias: 14 } } · { restriccion: { tags: ['ocio'], dias: 7, motivo: '…' } }
  plazo: { dias: 1, porDefecto: 'b' },
  opciones: [
    { id: 'a', texto: 'Primera opción', caracter: {}, efectos: [{ estado: 'gen.estres', mas: -2 }], resultado: 'Lo que pasa después.' },
    { id: 'b', texto: 'Segunda opción', efectos: [] },
  ],

  // PRUEBAS como datos: lo que hay (dado), lo que se elige y lo que se espera.
  pruebas: [{ nombre: 'Sale y se puede elegir la primera opción', espero: { opcionDisponible: 'a' } }],
});
`,
  );
  escribirIndice();
  console.log(`Creado ${archivo.replace(RAIZ + '/', '')} y apuntado en el índice.\nEscríbelo y pasa: npm run eventos:validar   ·   npm run eventos:probar -- ${id}`);
}

function validar(): number {
  const banco = new Banco();
  const { errores, avisos } = banco.validar();
  if (!indiceAlDia()) errores.push('modules/eventos/src/catalogo.ts no está al día: pasa «npm run eventos:indice»');
  const pruebas = correrTodo(banco);
  const caminos: string[] = [];
  let n = 0;
  const raices = [...banco.catalogo.hilos.keys(), ...[...banco.catalogo.sucesos.values()].filter((x) => !x.hilo).map((x) => x.def.id)];
  // Con el contenido duro desactivado se recorre otra vez lo que quedaría (solo lo que lleva marcas de «duro»).
  const sinDuro = new Banco(undefined, { duro: SIN_CONTENIDO_DURO });
  const llevaDuro = (raiz: string): boolean => JSON.stringify(banco.catalogo.hilos.get(raiz) ?? banco.catalogo.sucesos.get(raiz)?.def).includes('"duro"');
  let nSinDuro = 0;
  for (const raiz of raices) {
    for (const genero of ['f', 'm'] as const) {
      const en = genero === 'f' ? 'femenino' : 'masculino';
      const r = recorrer(banco, raiz, genero);
      n += r.caminos.length;
      caminos.push(...r.errores.map((e) => `${e} (personas en ${en})`));
      if (llevaDuro(raiz)) {
        const q = recorrer(sinDuro, raiz, genero);
        nSinDuro += q.caminos.length;
        caminos.push(...q.errores.map((e) => `${e} (personas en ${en}, sin contenido duro)`));
      }
    }
  }
  const fallidas = pruebas.filter((p) => p.problemas.length);
  for (const a of avisos) console.log(`  aviso  ${a}`);
  for (const e of errores) console.log(`  ERROR  ${e}`);
  for (const p of fallidas) console.log(`  FALLA  ${p.de} · «${p.nombre}»\n         ${p.problemas.join('\n         ')}`);
  for (const c of caminos) console.log(`  ROTO   ${c}`);
  const base = [...banco.catalogo.sucesos.values()].filter((x) => x.origen === 'base').length;
  console.log(`\n${banco.catalogo.sucesos.size} sucesos (${base} base, ${banco.catalogo.sucesos.size - base} deportivos) en ${banco.catalogo.hilos.size} hilos y ${banco.catalogo.sucesos.size - [...banco.catalogo.hilos.values()].reduce((a, h) => a + h.sucesos.length, 0)} sueltos · ${pruebas.length} pruebas y escenarios · ${n} caminos recorridos (cada variante, cada versión de los textos y de los resultados, cada opción, en masculino y en femenino)${nSinDuro ? ` y ${nSinDuro} más con el contenido duro desactivado` : ''}`);
  const mal = errores.length + fallidas.length + caminos.length;
  console.log(mal ? `❌ ${mal} problemas` : `✅ Todo en orden${avisos.length ? ` (${avisos.length} avisos)` : ''}`);
  return mal ? 1 : 0;
}

function probar(): number {
  const raiz = args[0];
  const banco = new Banco();
  if (!raiz || (!banco.catalogo.hilos.has(raiz) && !banco.catalogo.sucesos.has(raiz))) {
    console.error(`Uso: npm run eventos:probar -- <hilo o suceso> [--elige opción,opción] [--masculino] [--sin-duro]\n\nHilos:\n  ${[...banco.catalogo.hilos.keys()].join('\n  ')}\nSueltos:\n  ${[...banco.catalogo.sucesos.values()].filter((x) => !x.hilo).map((x) => x.def.id).join('\n  ')}`);
    return 1;
  }
  const elige = args.includes('--elige') ? args[args.indexOf('--elige') + 1].split(',') : [];
  // Con --sin-duro se ve lo que quedaría con el contenido duro desactivado.
  const r = recorrer(args.includes('--sin-duro') ? new Banco(undefined, { duro: SIN_CONTENIDO_DURO }) : banco, raiz, args.includes('--masculino') ? 'm' : 'f');
  const caminos = r.caminos.filter((c) => elige.every((o) => c.pasos.some((p) => p.includes(`→ ${o}`))));
  caminos.forEach((c, n) => {
    console.log(`\n━━ Camino ${n + 1} de ${caminos.length} ━━ ${c.pasos.join('  ⇒  ')}`);
    for (const t of c.textos) console.log(`   ${t}`);
    console.log(`   · Marcas que quedan: ${c.marcas.join(', ') || 'ninguna'}   · ${c.hiloCerrado ? 'Hilo cerrado' : 'El hilo sigue abierto'}`);
  });
  for (const e of r.errores) console.log(`\n  ROTO  ${e}`);
  console.log(`\n${caminos.length} caminos${r.errores.length ? `, ${r.errores.length} rotos` : ''}. Las condiciones y los días de espera se saltan: aquí se ve todo lo que puede pasar (cada variante y cada versión de los textos y los resultados), no cuándo.`);
  return r.errores.length ? 1 : 0;
}

function mapa(): void {
  const banco = new Banco();
  const corto = (id: string) => id.split('.').slice(-1)[0];
  const nodo = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '_');
  const lineas: string[] = ['# Mapa de los eventos', '', 'Generado con `npm run eventos:mapa`. Cada hilo, con sus sucesos (las flechas son «programa»), y las marcas con que los hilos se hablan entre sí.', ''];
  const lee = new Map<string, string[]>();
  const pone = new Map<string, string[]>();
  for (const x of banco.catalogo.sucesos.values()) {
    for (const c of condicionesDeSuceso(x.def)) if ('marca' in c) lee.set(c.marca, [...(lee.get(c.marca) ?? []), x.def.id]);
    for (const e of efectosDeSuceso(x.def)) if ('marca' in e) pone.set(e.marca, [...(pone.get(e.marca) ?? []), x.def.id]);
  }
  for (const origen of ['base', 'deporte'] as const) {
    const hilos = [...banco.catalogo.hilos.values()].filter((h) => (h.deporte ? 'deporte' : 'base') === origen);
    const sueltos = [...banco.catalogo.sucesos.values()].filter((x) => !x.hilo && x.origen === origen);
    if (!hilos.length && !sueltos.length) continue;
    lineas.push(origen === 'base' ? '## Eventos base' : '## Eventos deportivos', '');
    for (const h of hilos) {
      lineas.push(`### ${h.nombre} (\`${h.id}\`)${h.deporte ? ` · ${h.deporte}` : ''}`, '', '```mermaid', 'flowchart LR');
      for (const s of h.sucesos) {
        const disparo = 'al' in s.disparo ? `al: ${s.disparo.al}` : 'cada' in s.disparo ? `cada ${s.disparo.cada}, ${Math.round(s.disparo.prob * 100)} %` : 'umbral' in s.disparo ? 'umbral' : 'programado';
        lineas.push(`  ${nodo(s.id)}["${corto(s.id)}<br/><small>${disparo}</small>"]`);
        const flechas = new Map<string, string[]>();
        for (const d of [s, ...(s.variantes ?? [])]) {
          const de = (efectos: readonly unknown[] | undefined, etiqueta: string) => {
            const visto = (lista: readonly any[] | undefined): void => {
              for (const e of lista ?? []) {
                if ('programa' in e) flechas.set(e.programa, [...(flechas.get(e.programa) ?? []), etiqueta]);
                if ('si' in e) (visto(e.entonces), visto(e.sino));
              }
            };
            visto(efectos as any[]);
          };
          de(d.efectos, d === s ? '' : (d as { id: string }).id);
          for (const o of d.opciones ?? []) (de(o.efectos, o.id), de(o.exito?.efectos, `${o.id} ✔`), de(o.fallo?.efectos, `${o.id} ✘`));
        }
        for (const [destino, etiquetas] of flechas) lineas.push(`  ${nodo(s.id)} -->|"${[...new Set(etiquetas)].filter(Boolean).join(', ') || ' '}"| ${nodo(destino)}`);
      }
      lineas.push('```', '');
    }
    if (sueltos.length) lineas.push('### Sucesos sueltos', '', '| Suceso | Título | Disparo | Categoría |', '|---|---|---|---|', ...sueltos.map((x) => `| \`${x.def.id}\` | ${x.def.titulo.replace(/\|/g, '/')} | ${'al' in x.def.disparo ? `al: \`${x.def.disparo.al}\`` : 'cada' in x.def.disparo ? `cada ${x.def.disparo.cada}, ${Math.round(x.def.disparo.prob * 100)} %` : 'umbral'} | ${x.def.categoria ?? 'importante'} |`), '');
  }
  lineas.push('## Marcas', '', '| Marca | La pone | La lee |', '|---|---|---|');
  for (const m of [...new Set([...pone.keys(), ...lee.keys()])].sort()) lineas.push(`| \`${m}\` | ${[...new Set(pone.get(m) ?? [])].map((x) => `\`${x}\``).join(', ') || '—'} | ${[...new Set(lee.get(m) ?? [])].map((x) => `\`${x}\``).join(', ') || '— (todavía nadie)'} |`);
  lineas.push('');
  const destino = join(RAIZ, 'docs', 'eventos', 'MAPA.md');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, lineas.join('\n'));
  console.log(`Escrito docs/eventos/MAPA.md (${banco.catalogo.hilos.size} hilos, ${banco.catalogo.sucesos.size} sucesos)`);
}

if (orden === 'nuevo') nuevo();
else if (orden === 'validar') process.exit(validar());
else if (orden === 'probar') process.exit(probar());
else if (orden === 'mapa') mapa();
else if (orden === 'indice') (escribirIndice(), console.log('Índice al día.'));
else {
  console.error('Órdenes: nuevo, validar, probar, mapa, indice (ver el comentario de tools/eventos.ts)');
  process.exit(1);
}
