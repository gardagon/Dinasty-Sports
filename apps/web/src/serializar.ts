/**
 * Convertir la partida a texto **sin congelar la página**.
 *
 * Con la ciudad grande y el fútbol el estado son ~16 MB y `JSON.stringify` de golpe bloquea la página 0,3–0,5 s en escritorio y 1,5–1,8 s en el móvil
 * emulado en cada guardado. Un trabajador no lo arregla: el estado vive en la página y pasárselo (`postMessage`/`structuredClone`) cuesta lo mismo que
 * convertirlo a texto (medido: `docs/relevo/guardar-sin-congelar.md`). Así que se trocea: el texto se construye pieza a pieza (cada persona de la lista
 * de PNJ, cada clave de un objeto grande) y entre trozos de unos pocos ms se deja respirar a la página.
 *
 * Como la partida sigue viva mientras se trocea, hay una regla: **nada puede cambiar el estado a medias** (el texto saldría a trozos de momentos distintos).
 * Quien vaya a cambiarlo llama antes a `alCambiarElEstado()`: lo que se estaba guardando se **descarta** (el guardado se repite en cuanto la página se
 * quede quieta: así un clic nunca espera) y, para que guardar no se quede sin acabar nunca si el jugador no para de hacer clic, tras `ABORTOS_SEGUIDOS`
 * descartes seguidos el siguiente se **acaba de golpe** (a lo sumo lo que costaba antes). Al cerrar la pestaña se acaba siempre de golpe
 * (`terminarSerializacionEnCurso`). El texto es el del estado en el instante en que se empezó, igual que con `serializarJSON`, y es byte a byte el mismo
 * (lo comprueba `serializar.test.ts`).
 */

/** Un contenedor (lista u objeto) se trocea si tiene más de tantos hijos y estos son objetos: son las listas de personas, no un puñado de números. */
const HIJOS_PARA_TROCEAR = 64;
/** No se baja más de estos niveles (el estado de un módulo, su lista de personas y cada persona: lo demás se convierte de una vez). */
const PROFUNDIDAD_MAXIMA = 5;

const noSeEscribe = (v: unknown): boolean => v === undefined || typeof v === 'function' || typeof v === 'symbol';

function esGrande(v: unknown, profundidad: number): v is object {
  if (typeof v !== 'object' || v === null || profundidad >= PROFUNDIDAD_MAXIMA) return false;
  if (Array.isArray(v)) return v.length > HIJOS_PARA_TROCEAR && typeof v[0] === 'object' && v[0] !== null;
  const claves = Object.keys(v);
  return claves.length > HIJOS_PARA_TROCEAR || claves.some((k) => esGrande((v as Record<string, unknown>)[k], profundidad + 1));
}

/**
 * Las piezas de texto de `valor` en orden: al unirlas sale lo mismo que `JSON.stringify(valor)`. Solo se trocean los contenedores grandes (y los que
 * los contienen); el resto se convierte de una vez. Cada `yield` es un punto donde se puede parar.
 */
function* piezas(valor: unknown, profundidad: number): Generator<string, void, void> {
  if (!esGrande(valor, profundidad)) {
    yield JSON.stringify(valor);
    return;
  }
  if (Array.isArray(valor)) {
    yield '[';
    for (let i = 0; i < valor.length; i++) {
      if (i) yield ',';
      yield* noSeEscribe(valor[i]) ? ['null'] : piezas(valor[i], profundidad + 1);
    }
    yield ']';
    return;
  }
  yield '{';
  let primera = true;
  for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
    if (noSeEscribe(v)) continue;
    yield `${primera ? '' : ','}${JSON.stringify(clave)}:`;
    primera = false;
    yield* piezas(v, profundidad + 1);
  }
  yield '}';
}

/** Lo que sale de una conversión: el texto, o un `Blob` con ese mismo texto (ver `SerializacionPorTrozos`). */
export type Resultado = string | Blob;

/**
 * Una conversión a texto por trozos. `avanzar` trabaja un rato; `terminar` acaba de golpe lo que falte.
 *
 * Con `comoBlob` el texto no se junta nunca en una sola cadena de 16 MB: cada trozo se vuelca a un `Blob` según sale y al final se unen (sin copiar). Un `Blob`
 * se guarda en IndexedDB sin bloquear la página (`put` de la cadena: 45–65 ms en escritorio y ~190 ms con la CPU ×4; `put` del `Blob`: 0 ms) y se lee de vuelta
 * fuera del hilo (`blob.text()`). Medido en `docs/relevo/guardar-sin-congelar.md`.
 */
export class SerializacionPorTrozos {
  private readonly it: Generator<string, void, void>;
  private pendientes: string[] = [];
  /** Los trozos ya cerrados: cadenas planas (o `Blob`s con `comoBlob`). */
  private readonly cerrados: BlobPart[] = [];
  private resultadoFinal: Resultado | null = null;
  /** Se descartó a medias: no hay resultado. */
  cancelada = false;
  /** Milisegundos de CPU gastados (suma de lo que duró cada trozo): lo que cuesta de verdad guardar, sin las pausas. */
  msDeTrabajo = 0;
  /** Lo más que se ha bloqueado la página de una vez. */
  msMaximoSeguido = 0;
  private alTerminar: (() => void) | undefined;
  /** Se cumple cuando el resultado está listo (por `avanzar` o por `terminar`). */
  readonly lista: Promise<void> = new Promise((res) => (this.alTerminar = res));

  constructor(
    valor: unknown,
    private readonly comoBlob = false,
  ) {
    this.it = piezas(valor, 0);
  }

  get terminada(): boolean {
    return this.resultadoFinal !== null;
  }

  /** Descarta lo hecho: no habrá resultado (quien esperaba con `lista` se entera). */
  cancelar(): void {
    if (this.resultadoFinal !== null || this.cancelada) return;
    this.cancelada = true;
    this.pendientes = [];
    this.cerrados.length = 0;
    this.alTerminar?.();
  }

  /** Trabaja hasta `ms` milisegundos. Devuelve `true` si ya está todo. */
  avanzar(ms: number): boolean {
    if (this.resultadoFinal !== null || this.cancelada) return true;
    const t0 = performance.now();
    const limite = t0 + ms;
    for (;;) {
      const r = this.it.next();
      if (r.done) return this.cerrar(t0);
      this.pendientes.push(r.value);
      if (performance.now() >= limite) break;
    }
    this.cerrarTrozo();
    this.contar(t0);
    return false;
  }

  /** Acaba de golpe lo que falte y devuelve el resultado. */
  terminar(): Resultado {
    if (this.cancelada) throw new Error('La conversión a texto se descartó.');
    if (this.resultadoFinal !== null) return this.resultadoFinal;
    const t0 = performance.now();
    for (let r = this.it.next(); !r.done; r = this.it.next()) this.pendientes.push(r.value);
    this.cerrar(t0);
    return this.resultadoFinal!;
  }

  resultado(): Resultado {
    if (this.resultadoFinal === null) throw new Error('La conversión a texto no ha terminado.');
    return this.resultadoFinal;
  }

  /** Junta lo pendiente en un trozo plano (cadena o `Blob`). */
  private cerrarTrozo(): void {
    if (!this.pendientes.length) return;
    const texto = this.pendientes.join('');
    this.pendientes = [];
    this.cerrados.push(this.comoBlob ? new Blob([texto]) : texto);
  }

  private contar(t0: number): void {
    const ms = performance.now() - t0;
    this.msDeTrabajo += ms;
    this.msMaximoSeguido = Math.max(this.msMaximoSeguido, ms);
  }

  private cerrar(t0: number): true {
    this.cerrarTrozo();
    this.resultadoFinal = this.comoBlob ? new Blob(this.cerrados, { type: 'application/json' }) : (this.cerrados as string[]).join('');
    this.cerrados.length = 0;
    this.contar(t0);
    this.alTerminar?.();
    return true;
  }
}

/**
 * Deja respirar a la página: que se atiendan los clics y se pinte antes de seguir. Va por un mensaje (sin el mínimo de 4 ms de `setTimeout` al encadenarse) y
 * no por `scheduler.yield`, cuya continuación pasa por delante de las demás tareas y dejaría sin turno a los temporizadores del juego mientras se guarda.
 */
export function ceder(): Promise<void> {
  if (typeof MessageChannel === 'undefined') return new Promise((res) => setTimeout(res, 0));
  return new Promise((res) => {
    const canal = new MessageChannel();
    canal.port1.onmessage = () => {
      canal.port1.close();
      res();
    };
    canal.port2.postMessage(0);
  });
}

/** La conversión que está en marcha (solo hay una a la vez: la del guardado). */
let enMarcha: SerializacionPorTrozos | null = null;

export interface ConversionHecha<T extends Resultado> {
  datos: T;
  msDeTrabajo: number;
  msMaximoSeguido: number;
}

/** Cuántas veces seguidas se descarta un guardado a medias por un cambio antes de acabar el siguiente de golpe. */
export const ABORTOS_SEGUIDOS = 3;
let abortosSeguidos = 0;

/**
 * Convierte `valor` a texto por trozos, cediendo entre uno y otro (`comoBlob`: lo devuelve como `Blob`). `ms` es lo que dura cada trozo.
 * Devuelve `null` si se descartó a medias porque el estado iba a cambiar (`alCambiarElEstado`): hay que repetirlo más tarde.
 */
export async function serializarPorTrozos(valor: unknown, opciones: { ms?: number; comoBlob?: boolean } = {}): Promise<ConversionHecha<Resultado> | null> {
  const s = new SerializacionPorTrozos(valor, opciones.comoBlob ?? false);
  enMarcha = s;
  try {
    while (!s.avanzar(opciones.ms ?? 8)) await Promise.race([ceder(), s.lista]);
  } finally {
    if (enMarcha === s) enMarcha = null;
  }
  if (s.cancelada) return null;
  abortosSeguidos = 0;
  return { datos: s.resultado(), msDeTrabajo: s.msDeTrabajo, msMaximoSeguido: s.msMaximoSeguido };
}

/**
 * Hay que llamarla **antes de cambiar el estado de la partida** (hacer una acción). Si se está convirtiendo a texto, lo descarta (así el clic no espera) o,
 * si ya se descartó `ABORTOS_SEGUIDOS` veces seguidas, lo acaba de golpe para que guardar avance. Sin conversión en marcha no cuesta nada.
 */
export function alCambiarElEstado(): void {
  // Una conversión ya descartada (su bucle aún no ha cedido el paso) no se vuelve a tocar: varias acciones seguidas en una misma tarea (una prueba, `__ds.hacer` en un bucle) harían fallar `terminar`.
  if (!enMarcha || enMarcha.cancelada) return;
  if (abortosSeguidos < ABORTOS_SEGUIDOS) {
    abortosSeguidos++;
    enMarcha.cancelar();
  } else enMarcha.terminar();
}

/** Acaba de golpe lo que se esté convirtiendo (al cerrar o esconder la pestaña no hay tiempo para pausas). */
export function terminarSerializacionEnCurso(): void {
  enMarcha?.terminar();
}
