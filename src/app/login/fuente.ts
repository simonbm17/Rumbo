import { Big_Shoulders } from "next/font/google";

/**
 * La condensada de la marca, declarada acá para el acceso.
 *
 * Es la MISMA familia, el mismo peso y el mismo subconjunto que usa la portada
 * (`components/landing/fuente.ts`), así que `next/font` sirve exactamente el
 * mismo archivo: declararla de nuevo no añade un byte. Se declara aparte, y no
 * se importa la de la portada, para que `/login` no dependa de un módulo de
 * `components/landing/`: son dos superficies distintas y ninguna debería
 * romperse por tocar la otra.
 *
 * Y se usa SOLO en la línea de display del panel de marca. En etiquetas,
 * campos y botones manda IBM Plex Sans: una condensada de señalización en la
 * etiqueta de un formulario no es carácter, es esfuerzo, y acá la persona viene
 * a entrar, no a mirar.
 */
export const displayAcceso = Big_Shoulders({
  variable: "--lg-display",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});
