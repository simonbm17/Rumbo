import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * El manejador que sirve los archivos subidos.
 *
 * Se prueba directamente la función, sin levantar un servidor: lo que hay que
 * fijar es el contrato —qué devuelve para un archivo que existe, para uno que
 * no, y para una ruta que intenta salirse del directorio—, y eso no necesita
 * HTTP.
 *
 * Lo que estas pruebas NO pueden demostrar es el defecto que motivó el
 * manejador: que `next start` sirve `public/` a partir de una lista compuesta
 * al arrancar y por eso un archivo recién subido daba 404 hasta reiniciar. Eso
 * solo se ve contra un servidor de producción real y se comprobó a mano.
 */
const { GET } = await import("@/app/uploads/[...ruta]/route");
const { getUploadsDir } = await import("@/lib/storage");

const CARPETA = "qa-uploads-route";
const RAIZ = getUploadsDir();
const DIR = path.join(RAIZ, CARPETA);

/** PNG real de 1×1: el manejador solo mira la extensión, pero mejor no mentir. */
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001" +
    "0d0a2db40000000049454e44ae426082",
  "hex"
);

/** Invoca el manejador como lo haría Next, con `params` ya resuelto. */
function pedir(segmentos: string[]) {
  const contexto = {
    params: Promise.resolve({ ruta: segmentos }),
  } as unknown as Parameters<typeof GET>[1];
  return GET(new Request("http://localhost/uploads"), contexto);
}

beforeAll(async () => {
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, "prueba.png"), PNG);
});

afterAll(async () => {
  await rm(DIR, { recursive: true, force: true });
});

describe("servido de archivos subidos", () => {
  it("devuelve el archivo con su tipo real", async () => {
    const r = await pedir([CARPETA, "prueba.png"]);
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("image/png");
    expect(Buffer.from(await r.arrayBuffer())).toEqual(PNG);
  });

  it("marca el contenido como inmutable, porque cada archivo tiene un nombre único", async () => {
    const r = await pedir([CARPETA, "prueba.png"]);
    expect(r.headers.get("Cache-Control")).toContain("immutable");
  });

  it("un archivo que no existe es 404, sin filtrar rutas internas", async () => {
    const r = await pedir([CARPETA, "no-existe.png"]);
    expect(r.status).toBe(404);
    expect(await r.text()).not.toContain(RAIZ);
  });

  it("un directorio no se lista", async () => {
    const r = await pedir([CARPETA]);
    expect(r.status).toBe(404);
  });

  it("una extensión que el sistema no guarda no se sirve", async () => {
    await writeFile(path.join(DIR, "prueba.txt"), "texto");
    const r = await pedir([CARPETA, "prueba.txt"]);
    expect(r.status).toBe(404);
  });

  /*
    Los segmentos llegan ya decodificados desde el enrutador, así que `%2e%2e`
    se ve como `..`. Por eso la prueba usa los valores finales: es exactamente
    lo que recibiría el manejador.
  */
  it.each([
    [["..", "package.json"]],
    [[CARPETA, "..", "..", "package.json"]],
    [["..", "..", ".env"]],
    [["", "package.json"]],
    [["."]],
  ])("rechaza salirse del directorio: %j", async (segmentos) => {
    const r = await pedir(segmentos);
    expect(r.status).toBe(404);
    expect(await r.text()).not.toContain("rumbo-flotas");
  });
});
