"""Instrumentación TEMPORAL (no se queda en el juego) para repartir el cruce de semana entre sus bloques, en ms, sin el perfilador.
Uso:  python3 docs/relevo/medir-rendimiento-2/instrumentar.py && cp docs/relevo/medir-rendimiento-2/desglose-semana.ts tools/.desglose-tmp.ts \
      && npx tsx tools/.desglose-tmp.ts 3 ; git checkout -- modules packages; rm tools/.desglose-tmp.ts
Cada `__t(nombre, f)` suma el tiempo de `f` en `globalThis.__TT[nombre]` solo si el medidor lo ha puesto (si no, llama a `f` sin más)."""
H = "const __t = <T>(n: string, f: () => T): T => { const g = (globalThis as any).__TT; if (!g) return f(); const t0 = performance.now(); try { return f(); } finally { g[n] = (g[n] ?? 0) + performance.now() - t0; g[n + '#'] = (g[n + '#'] ?? 0) + 1; } };\n"
def patch(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert s.count(a) == 1, (path, a[:60], s.count(a))
        s = s.replace(a, b)
    lines = s.split('\n')
    last = max(i for i, l in enumerate(lines) if l.startswith('import ') or l.startswith("} from '"))
    lines.insert(last + 1, H.rstrip('\n'))
    open(path, 'w').write('\n'.join(lines))

patch('packages/core/src/game.ts', [
 ("""      for (const h of this.registry.handlers.get(ev.type) ?? []) {
        h.fn(this.actionCtx(h.module, 1), ev);
      }""", """      for (const h of this.registry.handlers.get(ev.type) ?? []) {
        __t(`[${h.module}] ${ev.type}`, () => h.fn(this.actionCtx(h.module, 1), ev));
      }"""),
 ("""      for (const h of this.registry.wildcardHandlers) {
        h.fn(this.actionCtx(h.module, 1), ev);
      }""", """      for (const h of this.registry.wildcardHandlers) {
        __t(`[${h.module}] (cualquiera)`, () => h.fn(this.actionCtx(h.module, 1), ev));
      }"""),
])
patch('modules/npcs/src/index.ts', [
 ("const npcs = conCuerpo(conCapacidades(conHabilidades(s.npcs, pobs, rend, week * 7), week * 7), week * 7, s.semilla ?? 0, fraccionLectiva(ctx.pais), escolarDelPais(ctx.pais, (ctx.time.week - ctx.time.schoolWeek) * 7));\n        avanzarCapacidadesEnSitio(npcs, (week + 1) * 7);",
  "const hab = __t('npcs.conHabilidades', () => conHabilidades(s.npcs, pobs, rend, week * 7));\n        const cap = __t('npcs.conCapacidades', () => conCapacidades(hab, week * 7));\n        const npcs = __t('npcs.conCuerpo', () => conCuerpo(cap, week * 7, s.semilla ?? 0, fraccionLectiva(ctx.pais), escolarDelPais(ctx.pais, (ctx.time.week - ctx.time.schoolWeek) * 7)));\n        __t('npcs.avanzarCapacidadesEnSitio', () => avanzarCapacidadesEnSitio(npcs, (week + 1) * 7));"),
 ("        semanaDeportiva(npcs, pobs, rend, (week + 1) * 7, (ctx.time.week - ctx.time.schoolWeek) * 7, sesiones, lesionados, { clubesActivos, semanaDelCurso: ctx.timeAt(week * 7 * MINUTES_PER_DAY).schoolWeek });\n        // El cuerpo de todos pasa la semana con los hábitos de cada uno (los que juegan, con sus sesiones).\n        semanaDelCuerpo(npcs, (week + 1) * 7, sesiones, s.semilla ?? 0, escolarDeLaSemana(ctx, week));",
  "        __t('npcs.semanaDeportiva', () => semanaDeportiva(npcs, pobs, rend, (week + 1) * 7, (ctx.time.week - ctx.time.schoolWeek) * 7, sesiones, lesionados, { clubesActivos, semanaDelCurso: ctx.timeAt(week * 7 * MINUTES_PER_DAY).schoolWeek }));\n        __t('npcs.semanaDelCuerpo', () => semanaDelCuerpo(npcs, (week + 1) * 7, sesiones, s.semilla ?? 0, escolarDeLaSemana(ctx, week)));"),
 ("        res = semanaDeNino(n as never, pob.deporte, r, f, fin, lista,", "        res = __t('npcs.semanaDeportiva>semanaDeNino', () => semanaDeNino(n as never, pob.deporte, r, f, fin, lista,"),
 ("huecosDelBloque(n as never, pob.deporte, r, fin, semanas, estado.baja ?? 0));\n      }", "huecosDelBloque(n as never, pob.deporte, r, fin, semanas, estado.baja ?? 0)));\n      }"),
 ("      n.estado = pasoDeSemanaDelEstado(estado, {", "      n.estado = __t('npcs.semanaDeportiva>estado', () => pasoDeSemanaDelEstado(estado, {"),
 ("        constitucion: n.cap![CAPACIDADES_GENETICAS.indexOf('gen.constitucion')] ?? 50,\n      });", "        constitucion: n.cap![CAPACIDADES_GENETICAS.indexOf('gen.constitucion')] ?? 50,\n      }));"),
 ("    const medias = r.ejercicios ? mediasDeLosEquipos(jugadores, pob, inicioCurso) : new Map<string, Record<string, number>>();", "    const medias = __t('npcs.semanaDeportiva>medias', () => r.ejercicios ? mediasDeLosEquipos(jugadores, pob, inicioCurso) : new Map<string, Record<string, number>>());"),
])
patch('modules/futbol/src/index.ts', [
 ("  let liga = prepararLiga(ctx, t);\n  if (!liga || liga.cerrada) return;", "  let liga = __t('liga.prepararLiga', () => prepararLiga(ctx, t));\n  if (!liga || liga.cerrada) return;"),
 ("      const o = partidoDeLiga(dir, previa, liga!.semilla, { categoria, local, visitante, id, intensidad, curso: liga!.curso, sinMi: esMio && (ausente || fuera), dia: contextoDelDia(ctx, semana, id) });",
  "      const dia = __t('liga.contextoDelDia', () => contextoDelDia(ctx, semana, id));\n      const o = __t('liga.partidoDeLiga (total)', () => partidoDeLiga(dir, previa, liga!.semilla, { categoria, local, visitante, id, intensidad, curso: liga!.curso, sinMi: esMio && (ausente || fuera), dia }));"),
 ("    const r = jugarSabadoDeUnaCategoria(cat, l, liga.curso, f, jugar, liga.semilla);", "    const r = __t('liga.jugarSabadoDeUnaCategoria (total)', () => jugarSabadoDeUnaCategoria(cat, l, liga.curso, f, jugar, liga.semilla));"),
 ("  const a = ladoDelPartido(dir, previa, o.local, o.categoria, o.intensidad, o.curso, o.sinMi, o.dia);\n  const b = ladoDelPartido(dir, previa, o.visitante, o.categoria, o.intensidad, o.curso, o.sinMi, o.dia);",
  "  const a = __t('liga.ladoDelPartido', () => ladoDelPartido(dir, previa, o.local, o.categoria, o.intensidad, o.curso, o.sinMi, o.dia));\n  const b = __t('liga.ladoDelPartido', () => ladoDelPartido(dir, previa, o.visitante, o.categoria, o.intensidad, o.curso, o.sinMi, o.dia));"),
 ("  const r = jugarPartido(a.equipo, b.equipo, { id: o.id, semilla, categoria: o.categoria, cambios: CAMBIOS_DE_LIGA });", "  const r = __t('liga.jugarPartido (motor)', () => jugarPartido(a.equipo, b.equipo, { id: o.id, semilla, categoria: o.categoria, cambios: CAMBIOS_DE_LIGA }));"),
 ("        const d = p && o.dia ? elDiaDeUnJugador(p, o.dia) : undefined;", "        const d = __t('liga.elDiaDeUnJugador', () => p && o.dia ? elDiaDeUnJugador(p, o.dia) : undefined);"),
 ("        ligaDelMundo(ctx, (ev.data as { week: number }).week);", "        __t('liga.ligaDelMundo (total)', () => ligaDelMundo(ctx, (ev.data as { week: number }).week));"),
])
patch('modules/sucesos/src/index.ts', [
 ("    espontaneos(ctx, i, i.cadaSemana, 'semana');\n    pasadaDePnj(ctx, i);", "    __t('sucesos.espontaneos(semana)', () => espontaneos(ctx, i, i.cadaSemana, 'semana'));\n    __t('sucesos.pasadaDePnj', () => pasadaDePnj(ctx, i));"),
])
