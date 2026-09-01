import type { Role } from "@/generated/prisma/enums";

/**
 * Sesión simulada para las pruebas de acciones.
 *
 * Lo único que se sustituye del módulo real de autenticación es la lectura de
 * la cookie, que necesita un contexto de petición HTTP. Las reglas de permiso
 * (`canWrite`, `canAdmin`) se siguen tomando del código real, así que las
 * pruebas verifican la jerarquía verdadera y no una copia.
 */

export type SesionPrueba = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

let sesion: SesionPrueba = {
  id: "usuario-prueba",
  name: "Usuario de prueba",
  email: "prueba@rumbo.app",
  role: "ADMIN",
};

export function sesionActual(): SesionPrueba {
  return sesion;
}

/** Cambia el rol con el que se ejecutarán las siguientes acciones. */
export function actuarComo(role: Role, id = "usuario-prueba") {
  sesion = { ...sesion, id, role };
}

/** Error con el que la redirección simulada corta la ejecución. */
export class RedireccionSimulada extends Error {
  constructor(public readonly destino: string) {
    super(`Redirección a ${destino}`);
    this.name = "RedireccionSimulada";
  }
}

/**
 * Ejecuta una acción que termina en `redirect()` y devuelve el destino.
 * Falla si la acción no redirige (señal de que devolvió un error en su lugar).
 */
export async function capturarRedireccion(
  accion: () => Promise<unknown>
): Promise<string> {
  try {
    const resultado = await accion();
    throw new Error(
      `Se esperaba una redirección, pero la acción devolvió: ${JSON.stringify(resultado)}`
    );
  } catch (error) {
    if (error instanceof RedireccionSimulada) return error.destino;
    throw error;
  }
}
