import { CLAVE_PUBLICA_DE_DEPORTES } from '@ds/game';

/**
 * La clave pública con la que se comprueban los deportes que se instalan. La del juego (`CLAVE_PUBLICA_DE_DEPORTES`), salvo en una web construida a propósito para probar con otra (`VITE_DS_CLAVE_PUBLICA` al construirla,
 * como hace `npm run probar-web` con una clave de usar y tirar): una web publicada no la cambia nadie.
 */
export const CLAVE_PUBLICA: string | null = (import.meta.env.VITE_DS_CLAVE_PUBLICA as string | undefined) || CLAVE_PUBLICA_DE_DEPORTES;
