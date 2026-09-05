import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CONTRATO SERVIDOR / CLIENTE DE LAS PANTALLAS 404
 *
 * Las pantallas de «no encontrado» son componentes de SERVIDOR. Un módulo
 * marcado `"use client"` puede RENDERIZARSE desde ahí —eso es lo normal—, pero
 * sus exportaciones no son las funciones originales: son referencias. Llamar a
 * una desde el servidor lanza:
 *
 *   Attempted to call buttonClass() from the server but buttonClass is on the
 *   client.
 *
 * Y como sucede al renderizar, la excepción se lleva por delante la respuesta
 * entera: en vez del 404 diseñado, quien abre un registro borrado ve el error
 * genérico «Algo salió mal». Es un fallo que TypeScript no ve —la firma es
 * válida— y que ESLint tampoco: solo aparece en ejecución, y únicamente cuando
 * alguien llega a un identificador que no existe. Es decir, casi siempre en
 * producción y con el cliente delante.
 *
 * Por eso la regla se fija acá: de un módulo cliente, estas pantallas solo
 * pueden importar COMPONENTES, y usarlos como JSX.
 */

const RAIZ = path.resolve(import.meta.dirname, "..", "..");

const PANTALLAS = [
  path.join("src", "app", "(app)", "not-found.tsx"),
  path.join("src", "app", "global-not-found.tsx"),
];

function esCliente(fuente: string) {
  return /^\s*["']use client["']/.test(fuente);
}

/** Resuelve `@/x` y `./x` al archivo real, o null si es una dependencia. */
function resolver(especificador: string, desde: string): string | null {
  let base: string;
  if (especificador.startsWith("@/")) {
    base = path.join(RAIZ, "src", especificador.slice(2));
  } else if (especificador.startsWith(".")) {
    base = path.resolve(path.dirname(desde), especificador);
  } else {
    return null;
  }
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

/** Los nombres que trae cada `import { ... } from "..."` del archivo. */
function importacionesNombradas(fuente: string) {
  const encontradas: { desde: string; nombres: string[] }[] = [];
  const patron = /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
  for (const coincidencia of fuente.matchAll(patron)) {
    const nombres = coincidencia[1]
      .split(",")
      .map((n) => n.trim().split(/\s+as\s+/).pop()!.trim())
      .filter(Boolean);
    encontradas.push({ desde: coincidencia[2], nombres });
  }
  return encontradas;
}

describe.each(PANTALLAS)("%s no cruza la frontera servidor/cliente", (relativa) => {
  const absoluta = path.join(RAIZ, relativa);
  const fuente = readFileSync(absoluta, "utf8");

  it("es un componente de servidor", () => {
    // Si algún día tuviera que ser cliente, sería una decisión de producto y
    // esta prueba entera dejaría de aplicar. Que falle y se hable.
    expect(esCliente(fuente)).toBe(false);
  });

  it("de los módulos cliente solo importa componentes, y los usa como JSX", () => {
    const infracciones: string[] = [];

    for (const { desde, nombres } of importacionesNombradas(fuente)) {
      const destino = resolver(desde, absoluta);
      if (!destino || !esCliente(readFileSync(destino, "utf8"))) continue;

      for (const nombre of nombres) {
        const seRenderiza = new RegExp(`<${nombre}[\\s/>]`).test(fuente);
        if (!seRenderiza) {
          infracciones.push(`${nombre} (de "${desde}")`);
        }
      }
    }

    expect(infracciones).toEqual([]);
  });
});
