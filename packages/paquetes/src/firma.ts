import { ErrorDePaquete } from './tipos';

/** Base64 y huellas con lo que traen el navegador y Node (Web Crypto): sin dependencias. */
const ALGORITMO = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const FIRMA = { name: 'ECDSA', hash: 'SHA-256' } as const;

const codificador = new TextEncoder();

export function aBase64(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

export function deBase64(texto: string): Uint8Array<ArrayBuffer> {
  const s = atob(texto);
  const b = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

/** SHA-256 de un texto (UTF-8), en hexadecimal. */
export async function sha256(texto: string): Promise<string> {
  const huella = await crypto.subtle.digest('SHA-256', codificador.encode(texto));
  return [...new Uint8Array(huella)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Un par de claves nuevo (para `npm run clave-deportes`): la pública (SPKI) y la privada (PKCS8), en base64. */
export async function generarClaves(): Promise<{ publica: string; privada: string }> {
  const par = await crypto.subtle.generateKey(ALGORITMO, true, ['sign', 'verify']);
  return {
    publica: aBase64(await crypto.subtle.exportKey('spki', par.publicKey)),
    privada: aBase64(await crypto.subtle.exportKey('pkcs8', par.privateKey)),
  };
}

export async function firmar(texto: string, privadaBase64: string): Promise<string> {
  const clave = await crypto.subtle.importKey('pkcs8', deBase64(privadaBase64), ALGORITMO, false, ['sign']);
  return aBase64(await crypto.subtle.sign(FIRMA, clave, codificador.encode(texto)));
}

/** ¿La firma es de la clave pública y del texto exacto? Una clave o una firma mal formadas cuentan como no válidas. */
export async function firmaValida(texto: string, firma: string, publicaBase64: string): Promise<boolean> {
  try {
    const clave = await crypto.subtle.importKey('spki', deBase64(publicaBase64), ALGORITMO, false, ['verify']);
    return await crypto.subtle.verify(FIRMA, clave, deBase64(firma), codificador.encode(texto));
  } catch {
    return false;
  }
}

export function exigirClave(publica: string | null | undefined): string {
  if (!publica) throw new ErrorDePaquete('Este juego no tiene configurada la clave para comprobar los deportes: no se puede instalar ninguno.');
  return publica;
}
