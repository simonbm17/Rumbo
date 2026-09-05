import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { displayMarca } from "@/components/brand/fuente";

import "../globals.css";
import "@/components/brand/marca.css";

/**
 * RAÍZ DE LAS SUPERFICIES PÚBLICAS: la portada y el acceso.
 *
 * ── POR QUÉ HAY DOS RAÍCES ──────────────────────────────────────────────────
 *
 * Porque son dos mundos. Lo público presenta y no sabe quién eres; la
 * aplicación opera y exige sesión. Cada uno declara su propio documento, su
 * letra y sus metadatos, y ninguno se rompe por tocar el otro. Los grupos de
 * rutas —`(public)` y `(app)`— NO aparecen en la URL: `/`, `/login`, `/panel` y
 * el resto siguen exactamente donde estaban. Lo único que cambia es que cruzar
 * de un mundo al otro es una carga completa de página en vez de una navegación
 * de cliente, y los dos cruces que existen —entrar y salir— ya eran
 * redirecciones de servidor.
 *
 * Lo que la separación NO resuelve por sí sola es la precarga de fuentes:
 * Turbopack funde el CSS de todas las declaraciones de `next/font` en un mismo
 * fragmento y Next anuncia el conjunto entero en cada ruta. Eso se resuelve en
 * `(app)/layout.tsx`, donde está escrito el porqué.
 *
 * ── QUÉ LETRA CARGA ─────────────────────────────────────────────────────────
 *
 * IBM Plex Sans (cuerpo), IBM Plex Mono (placas, cifras y rótulos) y Big
 * Shoulders (display de marca). Las tres se pintan acá, verificado con
 * `document.fonts` en Chrome; las tres se precargan y ninguna otra.
 *
 * Plex Sans y Plex Mono se declaran con las MISMAS opciones que en la raíz de
 * la aplicación a propósito: así `next/font` genera los mismos archivos con el
 * mismo hash y quien entra desde la portada no vuelve a descargarlos.
 */
const sans = IBM_Plex_Sans({
  variable: "--font-sans-family",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-family",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Rumbo — Gestión de flota",
    template: "%s · Rumbo",
  },
  description:
    "Panel para administrar camiones, viajes, cargas, conductores, mantenimiento, gastos y documentos de una flota de transporte.",
};

export const viewport: Viewport = {
  themeColor: "#eff2f5",
};

/**
 * Aplica el tema antes del primer pintado para que no haya parpadeo.
 *
 * Se conserva también acá aunque la portada y el acceso sean claros: quien
 * eligió oscuro en la aplicación y vuelve al inicio veía hasta hoy el mismo
 * `data-theme` en las dos superficies, y esta fase no puede cambiar lo que se
 * ve. El claro sigue siendo el predeterminado y no se hereda del sistema.
 */
const THEME_SCRIPT = `(function(){try{document.documentElement.dataset.theme=localStorage.getItem('rumbo-theme')==='dark'?'dark':'light';}catch(e){}})();`;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El nonce lo pone el middleware; sin él la CSP bloquea el script del tema.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="es"
      data-theme="light"
      className={`${sans.variable} ${mono.variable} ${displayMarca.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
