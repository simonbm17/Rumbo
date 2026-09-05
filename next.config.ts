import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El proyecto vive dentro de la carpeta del usuario, donde hay otros
  // package-lock.json. Fijamos la raíz para que Turbopack no los tome.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },

  experimental: {
    /*
      Activa `src/app/global-not-found.tsx`.

      Hace falta porque Rumbo tiene dos layouts raíz —`(public)` y `(app)`— y
      entonces no existe un layout único desde el que componer el 404 de las
      URL que no casan con ninguna ruta. Es el caso que nombra la documentación
      de la versión instalada.

      La bandera está marcada como EXPERIMENTAL desde Next 15.4; acá corre
      16.3.4. Si una actualización la mueve o la renombra, el síntoma será que
      las direcciones inexistentes vuelvan a devolver el 404 interno de Next,
      sin `lang` ni estilos: revisar entonces
      `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`.
    */
    globalNotFound: true,
  },
};

export default nextConfig;
