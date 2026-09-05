import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { requireUser } from "@/lib/auth";
import { getAlertCount } from "@/lib/alerts";
import { getCompanySettings } from "@/lib/settings";
import { logoutAction } from "@/actions/auth";
import { Shell } from "@/components/layout/Shell";

import "../globals.css";

/**
 * RAÍZ DE LA APLICACIÓN INTERNA.
 *
 * Es una raíz propia —con su `<html>` y su `<body>`— y no un layout anidado:
 * la aplicación y las superficies públicas son dos mundos y cada uno declara
 * su documento, su letra y sus metadatos. El grupo `(app)` no aparece en la
 * URL, así que `/panel`, `/camiones`, `/viajes` y el resto quedan exactamente
 * donde estaban.
 *
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

/**
 * ARCHIVO: LOS TÍTULOS DE LA APLICACIÓN INTERNA. LA ÚNICA SIN PRECARGA.
 *
 * Es una grotesca de señalización: ancha, de terminaciones rectas, pensada para
 * leerse rápido y en tamaños grandes. Contra Plex el contraste es de ANCHO, no
 * de estilo, así que no se leen como dos sans intercambiables. No entra en el
 * cuerpo ni en formularios: ahí manda Plex.
 *
 * ── POR QUÉ `preload: false`, Y SOLO EN ESTA ────────────────────────────────
 *
 * `next/font` NO precarga por ruta: precarga por conjunto. Todas las fuentes
 * del proyecto acaban en el mismo fragmento CSS —Turbopack las funde porque los
 * dos layouts raíz importan `globals.css`— y Next anuncia el conjunto entero en
 * la cabecera `Link: rel=preload` de CADA ruta. Medido: la portada y el acceso
 * descargaban los 66,6 KB de Archivo sin pintar un solo carácter con ella; cero
 * elementos la resuelven, verificado en Chrome. Separar los layouts raíz, que
 * era la respuesta esperable, NO lo arregla: la fusión ocurre por debajo.
 *
 * `preload: false` es lo que de verdad la saca de esa cabecera. La consecuencia
 * está medida y es una sola: Archivo pasa a pedirse cuando se necesita, y su
 * único consumidor en todo el producto es el nombre de la empresa en el menú
 * lateral. No hay salto de maquetación porque `next/font` genera una cara de
 * respaldo con las métricas ajustadas a Arial (`size-adjust: 98.7%`,
 * `ascent-override: 88.96%`), que es exactamente para lo que existe.
 *
 * No se aplica a Plex Sans ni a Plex Mono: esas SÍ se pintan en las tres
 * superficies desde el primer instante y quitarles la precarga sería cambiar
 * bytes por parpadeo en el texto que la gente viene a leer.
 */
const display = Archivo({
  variable: "--font-display-family",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
  preload: false,
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
 * El claro es el predeterminado a propósito: no se hereda del sistema
 * operativo. El oscuro se activa solo si la persona lo eligió en la app, y esa
 * elección queda guardada en el navegador.
 */
const THEME_SCRIPT = `(function(){try{document.documentElement.dataset.theme=localStorage.getItem('rumbo-theme')==='dark'?'dark':'light';}catch(e){}})();`;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El nonce lo pone el middleware; sin él la CSP bloquea el script del tema.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const user = await requireUser();
  const [company, alertCount] = await Promise.all([
    getCompanySettings(),
    getAlertCount(),
  ]);

  return (
    <html
      lang="es"
      data-theme="light"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Shell
          user={user}
          companyName={company.name}
          alertCount={alertCount}
          logoutAction={logoutAction}
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
