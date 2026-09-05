import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

import "@/components/brand/marca.css";
import "./no-encontrado.css";

/**
 * 404 GLOBAL: LAS DIRECCIONES QUE NO CASAN CON NINGUNA RUTA.
 *
 * ── POR QUÉ EXISTE ESTE ARCHIVO ─────────────────────────────────────────────
 *
 * Rumbo tiene DOS layouts raíz —`(public)` y `(app)`—, así que no hay un layout
 * único desde el que componer un 404 para las URL que no pertenecen a ninguno
 * de los dos mundos. La documentación de la versión instalada nombra
 * exactamente este caso y da esta solución
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`).
 *
 * Sin él, escribir mal una dirección devolvía la página de error interna de
 * Next: sin `lang`, sin estilos, sin título de marca y en inglés. Medido en los
 * dos builds antes de escribir esto.
 *
 * ── QUÉ TIENE DE ESPECIAL ───────────────────────────────────────────────────
 *
 * Next se salta el renderizado normal y devuelve esta página directamente, así
 * que NO hay layout encima: este archivo tiene que emitir el documento entero,
 * `<html>` y `<body>` incluidos, y traerse sus propios estilos. Nada de lo que
 * hay en los layouts raíz —la letra, el tema, los metadatos— llega hasta acá.
 *
 * Por eso `lang="es"` va escrito a mano y el título se escribe completo: la
 * plantilla `%s · Rumbo` vive en los layouts raíz y este archivo no los ve.
 *
 * ── LO QUE NO CARGA ─────────────────────────────────────────────────────────
 *
 * Ni `globals.css`, ni `landing.css`, ni `login.css`, ni una sola fuente web.
 * Es una página que dice que la dirección no existe: no justifica descargar el
 * sistema visual entero. Trae los diez colores de marca, nueve reglas propias,
 * la letra del sistema y el logotipo oficial. Nada más.
 *
 * Y no declarar fuentes acá es además lo que garantiza que esta página no
 * vuelva a meter caras en el conjunto de precargas de la portada y el acceso.
 *
 * ── ESTA PÁGINA NO EJECUTA JAVASCRIPT, Y ESTÁ MEDIDO ────────────────────────
 *
 * El middleware sirve una CSP con `'nonce-…' 'strict-dynamic'`, y con
 * `strict-dynamic` el `'self'` deja de valer: solo se ejecuta lo que lleva el
 * nonce. Next pone el nonce en los siete `<script>` de `/` y de `/login`
 * —comprobado: once atributos `nonce` en cada una— pero NO en los de esta
 * página, porque la ruta se resuelve antes del renderizado normal. Resultado
 * medido en Chrome: los siete scripts quedan bloqueados por CSP, `__next_f` no
 * existe y la página nunca hidrata.
 *
 * No es un defecto que se pueda arreglar desde acá: tocar la CSP es tocar el
 * middleware, y el middleware no entra en esta fase. Tampoco hace falta, porque
 * esta pantalla es texto y dos enlaces: sin JavaScript funciona entera, y las
 * dos salidas están verificadas con clics reales. El coste es siete avisos de
 * CSP en la consola de una página que nadie debería ver.
 *
 * Se usa `next/link` igualmente: sin hidratar rinde exactamente un `<a href>`
 * —que es lo que se midió funcionando— y no llega a prefetchar nada. Si algún
 * día Next propaga el nonce por esta ruta, la página mejora sola.
 */
export const metadata: Metadata = {
  title: "Página no encontrada · Rumbo",
  description:
    "La dirección que intentas abrir no existe o ya no está disponible.",
};

export default function GlobalNotFound() {
  return (
    <html lang="es">
      <body>
        <main className="ne marca">
          <Link href="/" className="ne-marca" aria-label="Rumbo, ir al inicio">
            <Logo alto={28} prioridad />
          </Link>

          <p className="ne-codigo">404</p>
          <h1 className="ne-titulo">No encontramos esta página.</h1>
          <p className="ne-texto">
            La dirección que intentas abrir no existe o ya no está disponible.
          </p>

          <div className="ne-acciones">
            <Link href="/" className="ne-btn">
              Volver a Rumbo
            </Link>
            <Link href="/login" className="ne-enlace">
              Ir al acceso
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
