/**
 * CAPA 1 DEL DIBUJO: de los datos de una persona y una edad a todo lo que el dibujo necesita (proporciones, colores, peinado y su estado, canas, calvicie, vello facial,
 * arrugas, anchuras por complexión). Función pura: lo poco que se decide al azar sale solo de la semilla de dibujo de la persona.
 */
import {
  alturaEn, EDAD_DEL_VELLO, estiloDePersona, fotoDeEdad, fraccionDeCanas, gradoDeCalvicie, interpola, peinado, peinadoPosible, rngEstable, rostroExpresado, vello, velloPosible,
  type CuerpoDePersona, type Look, type RostroExpresado,
} from '@ds/contracts';
import { COLOR_DE_CANA, COLOR_DE_OJOS, COLOR_DE_PELO, COLOR_DE_PIEL, ROPA } from './catalogos';
import { mix, oscuro } from './color';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** Por debajo de esta edad no se dibuja a la persona: sale una cuna (decisión del usuario). */
export const EDAD_MINIMA_DEL_DIBUJO = 3;
export const EDAD_MAXIMA_DEL_DIBUJO = 95;
/** La cabeza se dibuja un 6 % mayor que la real (el estilo elegido: variante B de las muestras). */
export const ESCALA_DE_LA_CABEZA = 1.06;
/** Y la de un niño, más todavía (decisión del usuario del 16/11): a los 3 años ocupa cerca de una cuarta parte de la altura; el extra se pierde con la pubertad (`nino`). */
export const CABEZA_DE_NINO = 0.24;

export interface Parametros {
  semilla: number;
  edad: number;
  sexo: 'f' | 'm';
  /** Menor de 3 años: se dibuja la cuna. */
  cuna: boolean;
  /** Cuánto se ha formado la cara (0 a los 3 años, 1 a los 18, con su adelanto o retraso), cuánto ha envejecido (0 a los 40, 1 a los 85) y cuánto se ha masculinizado o feminizado el cuerpo (pubertad). */
  madura: number;
  vejez: number;
  masc: number;
  fem: number;
  /** Grasa y músculo en relativo a lo de referencia: la grasa va de −0,5 a 1 y el músculo de −0,34 a 1. */
  gordo: number;
  fuerte: number;
  rostro: RostroExpresado;
  forma: string;
  /** Altura de la persona y de su cabeza (del mentón a la coronilla, ya con la escala del estilo), en cm. */
  altura: number;
  cabeza: number;
  piel: string; pielSombra: string; labios: string;
  pelo: string; peloSombra: string; ceja: string; iris: string;
  camiseta: string; pantalon: string; zapato: string;
  peinado: {
    /** El estilo que lleva (el suyo o el que lo sustituye por la calvicie), el tipo de pelo y el lado de la raya. */
    estilo: string; tipo: string; lado: 1 | -1;
    /** Largo (cm) y cuánto ha crecido desde el corte (cm). */
    largo: number; crecido: number;
    /** 0 a 1: cuánto pelo se ha perdido y qué parte es cana. */
    calvicie: number; canas: number;
    /** El color natural (con sus canas); si va teñido, `tinte` es `true`, `pelo` es el color teñido y `raiz` son los cm de raíz natural que se ven. */
    natural: string; tinte: boolean; raiz: number;
  };
  vello: {
    estilo: string;
    /** Largo (mm): 0 si va afeitado o aún no le sale. */
    largo: number;
    /** Densidad que se ve (0 a 1): la suya por lo que le ha salido ya a su edad. */
    densidad: number;
    /** El color con que se ve: el natural con sus canas o el teñido (mezclado con el natural según lo que ha crecido desde el tinte). */
    color: string;
  };
  /** Arrugas de 0 a 1. */
  arrugas: number;
  /** Cuánto de niño tiene (1 a los 3 años, 0 a los 15, con su adelanto o retraso): lo que se pierde con la pubertad. */
  nino: number;
  distintivos: string[];
}

export interface Opciones {
  /** Músculo y grasa a esa edad (0 a 100): por defecto, los de hoy. */
  musculo?: number;
  grasa?: number;
  /** El look (estilo y largo de pelo y de vello facial): por defecto, el estilo de la persona recién hecho. */
  look?: Partial<Look>;
  camiseta?: string;
  pantalon?: string;
}

/** Altura de la cabeza (cm, del mentón a la coronilla) a cada edad, para una persona de 170 cm de adulta. */
const CABEZA: readonly (readonly [number, number])[] = [[3, 18.6], [8, 20.6], [12, 21.6], [15, 22.4], [18, 23]];

/** El músculo y la grasa de una persona a una edad: los del historial si es una edad pasada con foto (antes de la primera foto, la primera) y, si no, los de hoy. */
export function cuerpoALaEdad(c: CuerpoDePersona, edad: number, edadHoy: number): { musculo: number; grasa: number } {
  const foto = edad < Math.floor(edadHoy) ? fotoDeEdad(c.historial, edad) : undefined;
  return { musculo: foto?.musculo ?? c.musculo, grasa: foto?.grasa ?? c.grasa };
}

export function parametrosDe(c: CuerpoDePersona, edad: number, o: Opciones = {}): Parametros {
  const a = c.apariencia;
  const sexo = c.sexo;
  const edadFisica = edad < 24 ? edad + c.madurez : edad;
  const madura = clamp((edadFisica - 3) / 15);
  const vejez = clamp((edad - 40) / 45);
  const masc = sexo === 'm' ? clamp((edadFisica - 12) / 7) : 0;
  const fem = sexo === 'f' ? clamp((edadFisica - 11) / 6) : 0;
  const nino = ((k: number) => k * k * (3 - 2 * k))(clamp(1 - (edadFisica - 3) / 12));
  const musculo = o.musculo ?? c.musculo;
  const grasa = o.grasa ?? c.grasa;

  // Piel: algo más pálida y apagada en la vejez. Labios a partir de la piel.
  const piel = mix(COLOR_DE_PIEL[a.piel] ?? COLOR_DE_PIEL.media, '#cdbfb6', 0.12 * vejez);
  const pielOscura = oscuro(piel);
  const pielSombra = mix(piel, pielOscura ? '#2a1410' : '#7c3f2c', pielOscura ? 0.42 : 0.34);
  const labios = mix(piel, sexo === 'f' && madura > 0.8 ? '#b23f4c' : '#a8504e', pielOscura ? 0.4 : 0.34 - 0.08 * vejez);

  // Pelo: su color con las canas mezcladas. La calvicie cambia el peinado que se puede llevar.
  const canas = fraccionDeCanas(a.canas, edad);
  const calvicie = gradoDeCalvicie(a.calvicie, edad);
  const natural = COLOR_DE_PELO[a.peloColor] ?? COLOR_DE_PELO.castano;
  const peloNatural = mix(natural, COLOR_DE_CANA, canas * 0.92);
  const elegido = estiloDePersona(c.semilla, sexo, a);
  const pedido = o.look?.peinado ?? elegido.peinado;
  const estilo = peinadoPosible(pedido, calvicie);
  const fresco = (id: string) => peinado(id).largo;
  const largo = o.look?.largoDelPelo ?? fresco(estilo);
  // Tinte: el pelo se ve del color teñido salvo la raíz que ha crecido desde entonces (si ya ha crecido todo el largo, no queda tinte).
  const raiz = Math.max(0, o.look?.crecidoDesdeElTinte ?? 0);
  const tenido = /^#[0-9a-f]{6}$/i.test(o.look?.tinteDelPelo ?? '') && raiz < largo;
  const pelo = tenido ? o.look!.tinteDelPelo! : peloNatural;

  // Vello facial: solo en hombres y desde la pubertad; el estilo pedido, si su densidad lo permite.
  const salido = sexo === 'm' ? clamp((edadFisica - EDAD_DEL_VELLO) / 4) : 0;
  const pedidoV = o.look?.vello ?? elegido.vello;
  const estiloV = salido > 0 && velloPosible(pedidoV, a.barba) ? pedidoV : 'afeitado';
  const largoV = salido > 0 ? (o.look?.largoDelVello ?? (estiloV === elegido.vello ? elegido.largoDelVello : vello(estiloV).largo)) * (salido < 1 ? Math.min(1, 0.3 + salido) : 1) : 0;

  // La barba encanece algo antes que el pelo. Teñida, se ve del color del tinte menos la parte que ha crecido desde entonces.
  const velloNatural = mix(natural, COLOR_DE_CANA, clamp(canas * 1.25) * 0.92);
  const tinteV = o.look?.tinteDelVello;
  const colorDelVello = tinteV && /^#[0-9a-f]{6}$/i.test(tinteV) && largoV > 0 ? mix(tinteV, velloNatural, clamp((o.look?.crecidoDelVelloDesdeElTinte ?? 0) / largoV)) : velloNatural;
  return {
    semilla: c.semilla, edad, sexo, cuna: edad < EDAD_MINIMA_DEL_DIBUJO, madura, vejez, masc, fem,
    gordo: clamp((grasa - 40) / 40, -0.5, 1),
    fuerte: clamp((musculo - 30) / 60, -0.34, 1),
    rostro: rostroExpresado(a),
    forma: a.cara,
    altura: alturaEn(c.alturaAdulta, edad, c.madurez),
    cabeza: interpola(CABEZA, edadFisica) * (c.alturaAdulta / 170) ** 0.4 * (sexo === 'f' ? 0.985 : 1) * ESCALA_DE_LA_CABEZA * (1 + CABEZA_DE_NINO * nino),
    piel, pielSombra, labios,
    pelo, peloSombra: mix(pelo, '#120d10', 0.45),
    ceja: mix(mix(natural, '#1c1513', 0.25), COLOR_DE_CANA, clamp(canas * 0.8 - 0.1) * 0.8),
    iris: COLOR_DE_OJOS[a.ojos] ?? COLOR_DE_OJOS.marron,
    camiseta: o.camiseta ?? ROPA.camiseta, pantalon: o.pantalon ?? ROPA.pantalon, zapato: ROPA.zapato,
    peinado: { estilo, tipo: a.peloTipo, lado: rngEstable('retrato', c.semilla, 'lado').chance(0.5) ? 1 : -1, largo, crecido: Math.max(0, largo - fresco(estilo)), calvicie, canas, natural: peloNatural, tinte: tenido, raiz: tenido ? raiz : 0 },
    vello: { estilo: estiloV, largo: largoV, densidad: a.barba * salido, color: colorDelVello },
    arrugas: clamp((edad - 26) / 44) ** 0.85,
    nino,
    distintivos: a.distintivos,
  };
}
