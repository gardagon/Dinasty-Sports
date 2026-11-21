import { CORE_EVENTS, SHARED_EVENTS } from '../events';
import { PERKS } from '../perks';
import { EJES } from '../rasgos';
import { analizarTexto } from './texto';
import { HECHOS_COMUNES, type AporteDeSucesos, type Condicion, type CategoriaDeCupo, type ContadorDef, type OrigenDeSuceso, type Efecto, type HiloDef, type OpcionDef, type PapelDef, type RamaDef, type SucesoDef } from './tipos';

/** Un suceso listo para usar: con el reparto y los módulos de su hilo ya sumados. */
export interface SucesoCompilado {
  def: SucesoDef;
  hilo?: HiloDef;
  reparto: Readonly<Record<string, PapelDef>>;
  requiere: readonly string[];
  /** Evento base o deportivo, y de qué deporte. */
  origen: OrigenDeSuceso;
  deporte?: string;
  /** Con qué cupo compite si es espontáneo. */
  cupo: CategoriaDeCupo;
  /** ¿Tiene papeles que repartir? (sin ellos, sus condiciones se pueden mirar sin buscar a nadie). */
  tienePapeles: boolean;
}

export interface CatalogoDeSucesos {
  sucesos: ReadonlyMap<string, SucesoCompilado>;
  hilos: ReadonlyMap<string, HiloDef>;
  contadores: readonly ContadorDef[];
}

/** Junta lo aportado en un catálogo. Con `hayModulo`, lo que pide un módulo que no está cargado se deja fuera (ese suceso no existe en esta partida). */
export function compilarCatalogo(aportes: readonly AporteDeSucesos[], hayModulo: (id: string) => boolean = () => true): CatalogoDeSucesos {
  const sucesos = new Map<string, SucesoCompilado>();
  const hilos = new Map<string, HiloDef>();
  const contadores: ContadorDef[] = [];
  const meter = (def: SucesoDef, h?: HiloDef) => {
    const deporte = h?.deporte ?? def.deporte;
    // Un evento deportivo necesita su deporte: al quitarlo de la partida, deja de existir.
    const requiere = [...new Set([...(deporte ? [deporte] : []), ...(h?.requiere ?? []), ...(def.requiere ?? [])])];
    const origen: OrigenDeSuceso = deporte ? 'deporte' : 'base';
    if (requiere.every(hayModulo))
      sucesos.set(def.id, { def, hilo: h, reparto: { ...(h?.reparto ?? {}), ...(def.reparto ?? {}) }, requiere, origen, ...(deporte ? { deporte } : {}), cupo: def.categoria === 'menor' ? 'menor' : origen, tienePapeles: Object.keys({ ...(h?.reparto ?? {}), ...(def.reparto ?? {}) }).length > 0 });
  };
  for (const a of aportes) {
    if (a.tipo === 'contador') contadores.push(a);
    else if (a.tipo === 'suceso') meter(a);
    else if ([...(a.deporte ? [a.deporte] : []), ...(a.requiere ?? [])].every(hayModulo)) {
      hilos.set(a.id, a);
      contadores.push(...(a.contadores ?? []));
      for (const s of a.sucesos) meter(s, a);
    }
  }
  return { sucesos, hilos, contadores };
}

// ------------------------------------------------------------------ recorrer un suceso

const ramasDe = (o: OpcionDef): RamaDef[] => [o, ...(o.exito ? [o.exito] : []), ...(o.fallo ? [o.fallo] : [])];

function* efectosEn(lista: readonly Efecto[] | undefined): Generator<Efecto> {
  for (const e of lista ?? []) {
    yield e;
    if ('si' in e) {
      yield* efectosEn(e.entonces);
      yield* efectosEn(e.sino);
    }
    if ('tirada' in e) {
      yield* efectosEn(e.exito);
      yield* efectosEn(e.fallo);
    }
  }
}

/** Todos los efectos de un suceso: los suyos, los de sus variantes y los de cada opción y rama. */
export function* efectosDeSuceso(s: SucesoDef): Generator<Efecto> {
  for (const d of [s, ...(s.variantes ?? [])]) {
    yield* efectosEn(d.efectos);
    for (const o of d.opciones ?? []) for (const r of ramasDe(o)) yield* efectosEn(r.efectos);
  }
}

function* condicionesEn(lista: readonly Condicion[] | undefined): Generator<Condicion> {
  for (const c of lista ?? []) {
    yield c;
    if ('no' in c) yield* condicionesEn([c.no]);
    if ('alguna' in c) yield* condicionesEn(c.alguna);
    if ('todas' in c) yield* condicionesEn(c.todas);
  }
}

/** Todas las condiciones de un suceso: su momento, su umbral, las de sus variantes, los requisitos de las opciones y las de los efectos condicionales. */
export function* condicionesDeSuceso(s: SucesoDef): Generator<Condicion> {
  yield* condicionesEn(s.cuando);
  if ('umbral' in s.disparo) yield* condicionesEn(s.disparo.umbral);
  for (const v of s.variantes ?? []) yield* condicionesEn(v.si);
  for (const d of [s, ...(s.variantes ?? [])]) for (const o of d.opciones ?? []) {
    yield* condicionesEn(o.requiere);
    for (const a of o.tirada?.ajustes ?? []) yield* condicionesEn(a.si);
  }
  for (const e of efectosDeSuceso(s)) {
    if ('si' in e) yield* condicionesEn(e.si);
    if ('tirada' in e) for (const a of e.tirada.ajustes ?? []) yield* condicionesEn(a.si);
  }
}

/** Todos los textos de un suceso, con dónde están y la variante a la que pertenecen (para saber qué papeles tienen a alguien seguro). */
export function* textosDeSuceso(s: SucesoDef): Generator<{ donde: string; texto: string; variante?: string }> {
  for (const d of [s, ...(s.variantes ?? [])]) {
    const variante = d === s ? undefined : (d as { id: string }).id;
    const en = variante ? `variante «${variante}»` : 'suceso';
    if (d.titulo) yield { donde: `${en}, título`, texto: d.titulo, variante };
    if (d.texto) yield { donde: `${en}, texto`, texto: d.texto, variante };
    if (d === s && s.textoDeCercano) yield { donde: 'suceso, texto para los cercanos', texto: s.textoDeCercano, variante };
    for (const e of efectosEn(d.efectos)) {
      if ('diario' in e) yield { donde: `${en}, diario`, texto: e.diario, variante };
      if ('restriccion' in e) yield { donde: `${en}, restricción`, texto: e.restriccion.motivo, variante };
      if ('modificador' in e) yield { donde: `${en}, modificador`, texto: e.modificador.motivo, variante };
    }
    for (const o of d.opciones ?? []) {
      yield { donde: `${en}, opción «${o.id}»`, texto: o.texto, variante };
      if (o.pista) yield { donde: `${en}, opción «${o.id}», pista`, texto: o.pista, variante };
      for (const r of ramasDe(o)) {
        if (r.resultado) yield { donde: `${en}, opción «${o.id}», resultado`, texto: r.resultado, variante };
        for (const e of efectosEn(r.efectos)) {
          if ('diario' in e) yield { donde: `${en}, opción «${o.id}», diario`, texto: e.diario, variante };
          if ('restriccion' in e) yield { donde: `${en}, opción «${o.id}», restricción`, texto: e.restriccion.motivo, variante };
          if ('modificador' in e) yield { donde: `${en}, opción «${o.id}», modificador`, texto: e.modificador.motivo, variante };
        }
      }
    }
  }
}

// ------------------------------------------------------------------ validación

/** Lo que se sabe de la partida al validar. Sin él se comprueba solo lo que no depende de qué módulos hay. */
export interface EntornoDeValidacion {
  /** Módulos que son un deporte: lo que aportan tiene que ser evento deportivo suyo, y nadie más puede decir que lo es. */
  deportes?: ReadonlySet<string>;
  /** Categoría de cada stat que existe. */
  stats: ReadonlyMap<string, { category: string }>;
  modulos: ReadonlySet<string>;
}

export interface ResultadoDeValidacion {
  errores: string[];
  avisos: string[];
}

const ID = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const NOMBRE = /^[a-zñ][a-zñ0-9_]*$/;
const SEÑALES_COMPARTIDAS: ReadonlySet<string> = new Set(Object.values(SHARED_EVENTS));
const SEÑALES_DEL_MOTOR: ReadonlySet<string> = new Set(Object.values(CORE_EVENTS));
const PERK_IDS: ReadonlySet<string> = new Set(PERKS.map((p) => p.id));
const EJE_IDS: ReadonlySet<string> = new Set(EJES.map((e) => e.id));
const COMUNES: ReadonlySet<string> = new Set(HECHOS_COMUNES);
/** Largo a partir del cual el texto de una opción no cabe bien en un botón del móvil. */
export const LARGO_MAXIMO_DE_OPCION = 90;

/**
 * Comprueba todo lo que se puede comprobar de un catálogo sin jugar: forma, ids, referencias, textos, memoria e hilos. Recibe los aportes
 * de cada módulo por separado (para exigir el prefijo). Lo que necesita una partida (que cada opción se ejecute sin errores) lo prueba el director.
 */
export function validarCatalogo(porModulo: readonly { modulo: string; aportes: readonly AporteDeSucesos[] }[], entorno?: EntornoDeValidacion): ResultadoDeValidacion {
  const errores: string[] = [];
  const avisos: string[] = [];
  const todos = porModulo.flatMap((m) => m.aportes);
  const cat = compilarCatalogo(todos);
  const contadores = new Set(cat.contadores.map((c) => c.id));

  // Ids: forma, prefijo del módulo que aporta y duplicados.
  const vistos = new Set<string>();
  const id = (valor: string, modulo: string, que: string) => {
    if (!ID.test(valor)) errores.push(`${que} «${valor}»: id no válido (minúsculas, números y _, con puntos)`);
    else if (!valor.startsWith(`${modulo}.`)) errores.push(`${que} «${valor}»: lo aporta «${modulo}», así que debe empezar por «${modulo}.»`);
    if (vistos.has(`${que}:${valor}`)) errores.push(`${que} «${valor}»: id repetido`);
    vistos.add(`${que}:${valor}`);
  };
  for (const { modulo, aportes } of porModulo) {
    for (const a of aportes) {
      if (a.tipo === 'suceso') id(a.id, modulo, 'Suceso');
      else if (a.tipo === 'contador') id(a.id, modulo, 'Contador');
      else {
        id(a.id, modulo, 'Hilo');
        for (const s of a.sucesos) id(s.id, modulo, 'Suceso');
        for (const c of a.contadores ?? []) id(c.id, modulo, 'Contador');
        if (!a.sucesos.length) errores.push(`Hilo «${a.id}»: no tiene sucesos`);
      }
    }
  }

  // Eventos base y eventos deportivos: un deporte solo aporta los suyos y los marca; los demás módulos, ninguno.
  for (const { modulo, aportes } of porModulo) {
    const esDeporte = entorno?.deportes?.has(modulo);
    for (const a of aportes) {
      if (a.tipo === 'contador') continue;
      const dice = a.tipo === 'hilo' ? [a.deporte, ...a.sucesos.map((x) => x.deporte)] : [a.deporte];
      for (const d of dice) if (d !== undefined && d !== modulo) errores.push(`«${a.id}»: dice ser del deporte «${d}», pero lo aporta «${modulo}»`);
      if (esDeporte && a.deporte !== modulo) errores.push(`«${a.id}»: lo aporta el deporte «${modulo}», así que debe llevar «deporte: '${modulo}'» (es un evento deportivo)`);
      if (entorno?.deportes && !esDeporte && dice.some((d) => d !== undefined)) errores.push(`«${a.id}»: «${modulo}» no es un deporte, así que no puede aportar eventos deportivos`);
    }
  }

  // Memoria de toda la partida: qué marcas se escriben y cuáles se leen, y quién programa a quién.
  const marcasEscritas = new Set<string>();
  const marcasLeidas = new Map<string, string>();
  const programados = new Set<string>();
  for (const { def } of cat.sucesos.values()) {
    for (const e of efectosDeSuceso(def)) {
      if ('marca' in e) marcasEscritas.add(e.marca);
      if ('programa' in e) programados.add(e.programa);
    }
    for (const c of condicionesDeSuceso(def)) if ('marca' in c) marcasLeidas.set(c.marca, def.id);
  }
  for (const [m, quien] of marcasLeidas) if (!marcasEscritas.has(m)) errores.push(`Suceso «${quien}»: lee la marca «${m}», que ningún suceso pone`);
  for (const m of marcasEscritas) if (!marcasLeidas.has(m)) avisos.push(`La marca «${m}» se pone pero ningún suceso la lee todavía`);

  for (const { def: s, hilo: h, reparto, requiere } of cat.sucesos.values()) {
    const err = (t: string) => errores.push(`Suceso «${s.id}»: ${t}`);
    const papeles = new Set(Object.keys(reparto));
    const deCualquiera = s.para === 'cualquiera';
    // En un suceso que puede pasarle a cualquiera, el protagonista es el papel `sujeto` (lo pone el director).
    if (deCualquiera) papeles.add('sujeto');
    const recuerdosDelHilo = new Set<string>();
    for (const x of h?.sucesos ?? [s]) for (const e of efectosDeSuceso(x)) if ('recuerda' in e) for (const k of Object.keys(e.recuerda)) recuerdosDelHilo.add(k);

    // Forma
    if (!s.titulo) err('falta el título');
    if (!s.texto && !s.variantes?.length) err('no tiene texto ni variantes');
    if (('cada' in s.disparo || ('al' in s.disparo && s.disparo.prob !== undefined)) && !(s.disparo.prob! > 0 && s.disparo.prob! <= 1)) err('la probabilidad debe estar entre 0 (sin incluir) y 1');
    if ('programado' in s.disparo && !programados.has(s.id)) err('es «programado» pero ningún suceso lo programa');
    if ('al' in s.disparo && entorno && !SEÑALES_COMPARTIDAS.has(s.disparo.al) && !SEÑALES_DEL_MOTOR.has(s.disparo.al) && !entorno.modulos.has(s.disparo.al.split('.')[0]))
      err(`se dispara con la señal «${s.disparo.al}», que no es del motor, ni compartida, ni de un módulo cargado`);
    if (s.peso !== undefined && !(s.peso > 0)) err('el peso debe ser mayor que 0');
    for (const n of Object.keys(s.reparto ?? {})) if (!NOMBRE.test(n) || n === 'yo' || n === 'señal' || n === 'recuerdo' || n === 'pais') err(`«${n}» no vale como nombre de papel`);
    for (const m of requiere) if (entorno && !entorno.modulos.has(m)) avisos.push(`Suceso «${s.id}»: requiere el módulo «${m}», que no está cargado (no existirá en la partida)`);

    const varianteIds = new Set<string>();
    for (const v of s.variantes ?? []) {
      if (varianteIds.has(v.id)) err(`variante «${v.id}» repetida`);
      varianteIds.add(v.id);
      if (!v.texto && !s.texto) err(`la variante «${v.id}» no tiene texto y el suceso tampoco`);
    }

    // Opciones (las del suceso y las de cada variante)
    const todasLasOpciones = new Set<string>();
    for (const d of [s, ...(s.variantes ?? [])]) {
      const ids = new Set<string>();
      for (const o of d.opciones ?? []) {
        todasLasOpciones.add(o.id);
        if (!NOMBRE.test(o.id)) err(`opción «${o.id}»: id no válido`);
        if (ids.has(o.id)) err(`opción «${o.id}» repetida`);
        ids.add(o.id);
        if (!o.texto) err(`la opción «${o.id}» no tiene texto`);
        else if (o.texto.length > LARGO_MAXIMO_DE_OPCION) avisos.push(`Suceso «${s.id}»: el texto de la opción «${o.id}» es largo para un botón (${o.texto.length} letras)`);
        if (o.tirada && (!o.exito || !o.fallo)) err(`la opción «${o.id}» tiene tirada: necesita «exito» y «fallo»`);
        if (!o.tirada && (o.exito || o.fallo)) err(`la opción «${o.id}» tiene «exito» o «fallo» sin tirada`);
        if (o.tirada && !(o.tirada.dificultad >= 0 && o.tirada.dificultad <= 100)) err(`la opción «${o.id}»: la dificultad va de 0 a 100`);
        for (const a of o.tirada?.ajustes ?? []) {
          if (!Number.isFinite(a.mas)) err(`la opción «${o.id}»: un ajuste de la tirada necesita «mas» (un número)`);
          if (!a.si?.length) err(`la opción «${o.id}»: un ajuste de la tirada necesita al menos una condición en «si»`);
        }
        if (o.tirada && entorno && !entorno.stats.has(o.tirada.con)) err(`la opción «${o.id}» tira con «${o.tirada.con}», que no existe`);
        if (o.minutos !== undefined && !(o.minutos >= 1)) err(`la opción «${o.id}»: los minutos deben ser 1 o más`);
        for (const eje of Object.keys(o.caracter ?? {})) if (!EJE_IDS.has(eje)) err(`la opción «${o.id}» tira hacia «${eje}», que no es un eje de carácter`);
      }
      if (d.opciones?.length && !s.plazo) err('tiene opciones pero no tiene plazo (con la opción por defecto)');
    }
    if (s.plazo) {
      if (!todasLasOpciones.has(s.plazo.porDefecto)) err(`la opción por defecto del plazo, «${s.plazo.porDefecto}», no existe`);
      for (const d of [s, ...(s.variantes ?? [])]) if (d.opciones?.length && !d.opciones.some((o) => o.id === s.plazo!.porDefecto)) err(`la opción por defecto «${s.plazo.porDefecto}» no está entre las opciones de ${d === s ? 'el suceso' : `la variante «${(d as { id: string }).id}»`}`);
      if (s.plazo.dias === undefined && s.plazo.hasta === undefined) err('el plazo necesita «dias» o «hasta»');
    }
    if (s.siSePierde && !todasLasOpciones.has(s.siSePierde)) err(`«siSePierde» nombra la opción «${s.siSePierde}», que no existe`);

    // Condiciones
    const papel = (n: string, que: string) => {
      if (!papeles.has(n)) err(`${que} nombra el papel «${n}», que no está en el reparto`);
    };
    for (const c of condicionesDeSuceso(s)) {
      if ('stat' in c && entorno && !entorno.stats.has(c.stat)) err(`una condición mira la stat «${c.stat}», que no existe`);
      if ('presente' in c) papel(c.presente, 'una condición');
      if ('papel' in c) papel(c.papel, 'una condición');
      if ('relacion' in c) papel(c.relacion, 'una condición');
      if ('familia' in c) papel(c.familia, 'una condición');
      if ('marca' in c && c.de) papel(c.de, 'una condición');
      if ('perk' in c && !PERK_IDS.has(c.perk)) err(`una condición mira el perk «${c.perk}», que no existe`);
      if ('caracter' in c && !EJE_IDS.has(c.caracter)) err(`una condición mira «${c.caracter}», que no es un eje de carácter`);
      if ('contador' in c && !contadores.has(c.contador)) err(`una condición mira el contador «${c.contador}», que nadie ha declarado`);
      if ('recuerdo' in c && !recuerdosDelHilo.has(c.recuerdo)) err(`una condición lee el recuerdo «${c.recuerdo}», que ningún suceso ${h ? 'de su hilo' : ''} guarda`);
      if ('hecho' in c) {
        if (c.sobreRecuerdo && !recuerdosDelHilo.has(c.sobreRecuerdo)) err(`una condición compara con el recuerdo «${c.sobreRecuerdo}», que nadie guarda`);
        if (!COMUNES.has(c.hecho)) {
          const m = c.hecho.split('.')[0];
          if (!c.hecho.includes('.')) err(`el hecho «${c.hecho}» no es de los comunes ni de un módulo («<módulo>.<nombre>»)`);
          else if (!requiere.includes(m)) err(`usa el hecho «${c.hecho}» sin declarar «requiere: ['${m}']»`);
        }
      }
    }

    if (deCualquiera && !s.clase) err('puede pasarle a cualquiera («para»), así que necesita una «clase» (con ella se activa o no para los PNJ)');
    if (s.sujeto && !('al' in s.disparo)) err('«sujeto» solo vale en un suceso que se dispara con una señal');
    if (s.sujeto && !deCualquiera) err('«sujeto» solo vale con «para: \'cualquiera\'»');
    if (s.textoDeCercano && !deCualquiera) err('«textoDeCercano» solo vale con «para: \'cualquiera\'»');

    // Efectos
    for (const e of efectosDeSuceso(s)) {
      // Lo que solo tiene el personaje no puede estar en un suceso que le pasa a cualquiera.
      const soloPersonaje = (['estado', 'entrena', 'caracter', 'revelaPerk', 'modificador', 'restriccion', 'familia', 'presenta'] as const).find((k) => k in e);
      if (deCualquiera && soloPersonaje) err(`el efecto «${soloPersonaje}» solo vale para el personaje y este suceso puede pasarle a cualquiera (usa «estadoDeJugador» o marcas)`);
      if ('estadoDeJugador' in e && e.de) papel(e.de, 'un efecto');
      if ('estado' in e && entorno) {
        const st = entorno.stats.get(e.estado);
        if (!st) err(`un efecto cambia «${e.estado}», que no existe`);
        else if (st.category !== 'estado') err(`«${e.estado}» no es una stat de estado: no se puede cambiar con «estado», usa «entrena»`);
      }
      if ('entrena' in e && entorno) {
        const st = entorno.stats.get(e.entrena);
        if (!st) err(`un efecto entrena «${e.entrena}», que no existe`);
        else if (st.category === 'estado') err(`«${e.entrena}» es de estado: no se entrena, usa «estado»`);
      }
      if ('tirada' in e) {
        if (!(e.tirada.dificultad >= 0 && e.tirada.dificultad <= 100)) err('un efecto con tirada: la dificultad va de 0 a 100');
        if (entorno && !entorno.stats.has(e.tirada.con)) err(`un efecto tira con «${e.tirada.con}», que no existe`);
        for (const a of e.tirada.ajustes ?? []) if (!Number.isFinite(a.mas) || !a.si?.length) err('un ajuste de la tirada necesita «mas» (un número) y al menos una condición en «si»');
      }
      if ('relacion' in e) papel(e.relacion, 'un efecto');
      if ('familia' in e) papel(e.familia, 'un efecto');
      if ('presenta' in e) papel(e.presenta, 'un efecto');
      if (('marca' in e || 'quitaMarca' in e) && e.de) papel(e.de, 'un efecto');
      if ('caracter' in e) for (const eje of Object.keys(e.caracter)) if (!EJE_IDS.has(eje)) err(`un efecto mueve «${eje}», que no es un eje de carácter`);
      if ('revelaPerk' in e && !PERK_IDS.has(e.revelaPerk)) err(`un efecto revela el perk «${e.revelaPerk}», que no existe`);
      if ('emite' in e && !SEÑALES_COMPARTIDAS.has(e.emite)) err(`un efecto emite «${e.emite}», que no es una señal compartida`);
      if ('programa' in e) {
        const destino = cat.sucesos.get(e.programa);
        if (!destino) err(`programa «${e.programa}», que no está en el catálogo`);
        else if (!('programado' in destino.def.disparo)) err(`programa «${e.programa}», cuyo disparo no es «programado»`);
        else if (destino.hilo !== h) err(`programa «${e.programa}», que es de otro hilo (entre hilos se habla con marcas)`);
        if ('elCumpleDe' in e.en) papel(e.en.elCumpleDe, 'un «programa»');
      }
      if ('recuerda' in e) for (const [k, v] of Object.entries(e.recuerda)) {
        if (!NOMBRE.test(k)) err(`«${k}» no vale como nombre de recuerdo`);
        if (typeof v === 'string' && !COMUNES.has(v) && !(entorno?.stats.has(v) ?? v.includes('.'))) err(`recuerda «${v}», que no es un hecho ni una stat`);
      }
      if ('fin' in e && !h) avisos.push(`Suceso «${s.id}»: «fin» no hace nada fuera de un hilo`);
    }

    // Textos: llaves bien escritas, papeles que existen y papeles opcionales solo donde es seguro que hay alguien.
    for (const { donde, texto, variante } of textosDeSuceso(s)) {
      const { llaves, problemas } = analizarTexto(texto);
      for (const p of problemas) err(`${donde}: ${p}`);
      const seguros = new Set<string>();
      const v = s.variantes?.find((x) => x.id === variante);
      for (const c of v?.si ?? []) if ('papel' in c || 'presente' in c) seguros.add('papel' in c ? c.papel : c.presente);
      for (const c of s.cuando ?? []) if ('papel' in c || 'presente' in c) seguros.add('papel' in c ? c.papel : c.presente);
      for (const l of llaves) {
        if (l.tipo === 'dato' && l.de === 'recuerdo' && !recuerdosDelHilo.has(l.clave)) err(`${donde}: usa el recuerdo «${l.clave}», que nadie guarda`);
        if (l.tipo === 'dato' && l.de === 'señal' && !('al' in s.disparo) && !h) err(`${donde}: usa un dato de la señal, pero el suceso no se dispara con una`);
        if (l.tipo === 'dato' && l.de === 'señal' && 'al' in s.disparo && s.ejemploDeSeñal?.[l.clave] === undefined) err(`${donde}: usa «{señal.${l.clave}}»; pon un «ejemploDeSeñal» con ese dato para poder probarlo`);
        if (l.tipo === 'hecho' && !COMUNES.has(l.nombre)) {
          const m = l.nombre.split('.')[0];
          if (!l.nombre.includes('.')) err(`${donde}: el hecho «${l.nombre}» no es de los comunes ni de un módulo`);
          else if (!requiere.includes(m)) err(`${donde}: usa el hecho «${l.nombre}» sin declarar «requiere: ['${m}']»`);
          else if (s.ejemploDeHechos?.[l.nombre] === undefined) err(`${donde}: usa «{hecho.${l.nombre}}»; pon un «ejemploDeHechos» con ese hecho para poder probarlo`);
        }
        if ((l.tipo === 'campo' || l.tipo === 'genero') && l.quien !== 'yo') {
          if (!papeles.has(l.quien)) err(`${donde}: nombra el papel «${l.quien}», que no está en el reparto`);
          else if (reparto[l.quien]?.opcional && !seguros.has(l.quien)) err(`${donde}: usa el papel opcional «${l.quien}» sin una condición que asegure que hay alguien ({ papel: '${l.quien}' })`);
        }
      }
    }
  }

  // Hilos: que puedan empezar y que puedan terminar.
  for (const h of cat.hilos.values()) {
    if (h.sucesos.length && h.sucesos.every((s) => 'programado' in s.disparo)) errores.push(`Hilo «${h.id}»: todos sus sucesos son programados, así que nunca empieza`);
    if (h.sucesos.some((s) => [...efectosDeSuceso(s)].some((e) => 'programa' in e)) && !h.sucesos.some((s) => [...efectosDeSuceso(s)].some((e) => 'fin' in e)))
      avisos.push(`Hilo «${h.id}»: ningún suceso lo cierra con «fin» (se cierra solo cuando no le queda nada programado ni pendiente)`);
  }
  return { errores, avisos };
}
