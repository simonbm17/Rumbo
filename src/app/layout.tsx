import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

/**
 * IBM Plex, no la fuente que viene por defecto con Next.
 *
 * Dos razones, no una preferencia estética:
 *
 * 1. Plex se dibujó para documentación técnica e instrumentación, no para
 *    páginas de producto. Tiene detalles humanistas (la «a», la «g», las
 *    terminaciones en ángulo) que le dan carácter sin perder legibilidad a
 *    tamaño chico, que es donde vive una tabla de 300 filas.
 * 2. Sans y Mono son la misma familia. Las placas, los códigos de viaje y los
 *    números de factura van en monoespaciada; con Plex eso deja de ser
 *    "otra fuente" y pasa a ser el mismo sistema en otro ancho.
 *
 * Sus diacríticos en español están bien resueltos, que no es obvio en las
 * fuentes de moda.
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
  themeColor: "#f2f5f8",
};

/**
 * Aplica el tema antes del primer pintado para que no haya parpadeo.
 *
 * El claro es el predeterminado a propósito: no se hereda del sistema
 * operativo. El oscuro se activa solo si la persona lo eligió en la app, y esa
 * elección queda guardada en el navegador.
 */
const THEME_SCRIPT = `(function(){try{document.documentElement.dataset.theme=localStorage.getItem('rumbo-theme')==='dark'?'dark':'light';}catch(e){}})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // El nonce lo pone el middleware; sin él la CSP bloquea el script del tema.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="es"
      data-theme="light"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
