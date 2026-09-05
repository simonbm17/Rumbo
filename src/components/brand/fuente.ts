import { Big_Shoulders } from "next/font/google";

/**
 * LA CONDENSADA DE MARCA.
 *
 * Antes era Archivo Narrow: correcta, condensada, y completamente anónima.
 * Cualquier marca podía usarla y nadie la reconocería como de nadie.
 *
 * Big Shoulders viene del sistema de identidad cívica de Chicago, la ciudad de
 * «los hombros anchos»: una condensada de señalización, de remates planos y
 * asta recta, dibujada para leerse grande sobre superficies industriales. Es
 * decir: es la letra que se pinta en el costado de un remolque, no la que se
 * elige en un desplegable. Para una plataforma de flotas eso no es un adorno,
 * es el objeto físico de la marca.
 *
 * Contra IBM Plex Sans el contraste es de ANCHO y de temperatura: una
 * condensada de señal frente a una humanista de instrumentación. Dos familias
 * que no se pueden confundir, que es la única razón válida para emparejar.
 *
 * ── POR QUÉ VIVE ACÁ ────────────────────────────────────────────────────────
 *
 * La portada y el acceso la usan las dos, y antes cada una la declaraba por su
 * cuenta —`components/landing/fuente.ts` y `app/login/fuente.ts`— con el mismo
 * archivo y distinto nombre de variable. Dos declaraciones de la misma letra es
 * dos sitios donde equivocarse. Vive en la capa de marca, con una sola variable
 * (`--marca-display`), y la declara el layout público.
 *
 * ── LO QUE SE CARGA Y LO QUE NO ─────────────────────────────────────────────
 *
 * Un solo peso (700) y un solo subconjunto (`latin`). El 700 es el único que
 * pintan `.lp-h1`, `.lp-display` y `.lg-display`; declarar más pesos hacía que
 * `next/font` precargara archivos que no dibuja nadie. Y `latin` ya trae
 * Á É Í Ó Ú Ñ ¿ ¡, que es todo lo que el español necesita: `latin-ext`
 * duplicaba el peso para cubrir alfabetos que estas páginas no escriben.
 *
 * NO se declara en el layout de la aplicación interna: `next/font` descarga la
 * fuente en las rutas donde se declara, así que el panel no paga por la marca.
 */
export const displayMarca = Big_Shoulders({
  variable: "--marca-display",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});
