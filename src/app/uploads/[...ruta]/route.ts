import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getUploadsDir } from "@/lib/storage";

/**
 * SIRVE LOS ARCHIVOS SUBIDOS, LEYÉNDOLOS DEL DISCO EN CADA PETICIÓN.
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
 *
 * `saveUpload` escribe en `public/uploads/`, y `next start` compone la lista de
 * `public/` UNA VEZ, al arrancar. Medido en un build de producción: un archivo
 * que existía al arrancar responde 200; el mismo archivo escrito con el
 * servidor ya en marcha responde 404; y vuelve a responder 200 tras reiniciar
 * el proceso. Es decir, subir una foto la guardaba en disco pero la dejaba
 * invisible hasta el siguiente reinicio, justo en la pantalla que más se usa.
 *
 * Este manejador lee del disco en la petición, así que un archivo recién
 * subido está disponible de inmediato.
 *
 * ── POR QUÉ NO CHOCA CON `public/` ──────────────────────────────────────────
 *
 * Next resuelve primero los estáticos que conoce y cae aquí con lo que no
 * encuentra. Los diez archivos de demostración que existían al construir se
 * siguen sirviendo por la vía estática; todo lo que se suba después pasa por
 * acá. Las dos vías leen el MISMO directorio —`getUploadsDir()`— y devuelven el
 * mismo contenido, así que la diferencia no se nota desde fuera.
 *
 * ── LO QUE NO HACE ──────────────────────────────────────────────────────────
 *
 * No soporta peticiones por rangos. Los archivos son fotos y PDF que se abren
 * de una pieza; no hay vídeo ni nada que se consuma por partes. Añadir rangos
 * sería código sin caso de uso que mantener.
 */

/** Solo lo que `saveUpload` es capaz de guardar. Cualquier otra cosa: 404. */
const TIPOS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
};

/** Respuesta única para todo lo que no se sirve. Sin detalles internos. */
function noEncontrado() {
  return new Response("No encontrado", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(
  _request: Request,
  contexto: RouteContext<"/uploads/[...ruta]">
) {
  const { ruta } = await contexto.params;
  const raiz = getUploadsDir();

  /*
    TRAVERSAL. Los segmentos llegan ya decodificados, así que un `%2e%2e` de la
    URL se ve aquí como `..`; por eso la comprobación va sobre el valor final y
    no sobre el texto original. Se rechaza en dos pasos, y el segundo es el que
    de verdad cierra la puerta:

      1. ningún segmento puede ser `.`, `..`, estar vacío, traer separadores ni
         un byte nulo;
      2. tras resolver la ruta absoluta, tiene que seguir colgando de la raíz.

    Fail-closed: cualquier duda devuelve el mismo 404 que un archivo que no
    existe, para no confirmar qué hay fuera del directorio.
  */
  if (
    !Array.isArray(ruta) ||
    ruta.length === 0 ||
    ruta.some(
      (s) =>
        !s ||
        s === "." ||
        s === ".." ||
        s.includes("/") ||
        s.includes("\\") ||
        s.includes("\0")
    )
  ) {
    return noEncontrado();
  }

  const destino = path.resolve(raiz, ...ruta);
  if (destino !== raiz && !destino.startsWith(raiz + path.sep)) {
    return noEncontrado();
  }

  const ext = path.extname(destino).slice(1).toLowerCase();
  const tipo = TIPOS[ext];
  if (!tipo) return noEncontrado();

  try {
    // Un directorio no se lista: se comporta como si no existiera.
    const info = await stat(destino);
    if (!info.isFile()) return noEncontrado();

    const contenido = await readFile(destino);

    return new Response(new Uint8Array(contenido), {
      headers: {
        "Content-Type": tipo,
        "Content-Length": String(info.size),
        /*
          `inline`, que es como se comportan hoy: la foto se ve en la ficha y el
          PDF se abre en el navegador. Forzar la descarga cambiaría el
          comportamiento que la interfaz ya espera.
        */
        "Content-Disposition": "inline",
        /*
          Inmutable, y se puede afirmar: cada archivo se guarda como
          `<uuid>.<ext>` y reemplazar una foto NO sobrescribe: `resolvePhotoField`
          guarda con un identificador nuevo y borra el anterior. Una URL, por
          tanto, apunta siempre al mismo contenido o deja de existir.
        */
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return noEncontrado();
  }
}
