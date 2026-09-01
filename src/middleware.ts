import { NextResponse, type NextRequest } from "next/server";

/**
 * Cabeceras de seguridad, con una CSP basada en nonce.
 *
 * El nonce se genera por petición y Next lo aplica solo a sus propios scripts
 * (los de hidratación y el del tema). Cualquier script inyectado que no lo
 * lleve no se ejecuta, que es justo lo que hace útil a una CSP: sin nonce
 * habría que poner `unsafe-inline` en script-src, y eso desactiva la
 * protección contra XSS que la CSP existe para dar.
 *
 * En desarrollo se agrega `unsafe-eval` porque el recargado en caliente de
 * Turbopack lo necesita; en producción no va.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Tailwind y next/font inyectan estilos en línea; no hay forma de evitarlo
    // y un estilo inyectado no ejecuta código.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    // blob: y data: son para las vistas previas de fotos antes de subirlas.
    `img-src 'self' blob: data:`,
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", csp);
  // Impide que un archivo subido se interprete como algo distinto de lo que
  // dice su extensión.
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Todo salvo los estáticos que genera Next.
     *
     * `/uploads` entra a propósito: son archivos que subió un usuario y son
     * justamente los que más necesitan `nosniff`, para que un archivo guardado
     * como imagen no termine interpretándose como otra cosa.
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
