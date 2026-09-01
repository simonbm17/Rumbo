import "server-only";

/**
 * Limitador de intentos en memoria.
 *
 * Sirve para lo que hoy es esta app: un proceso, un servidor. Si algún día se
 * despliega en varias instancias detrás de un balanceador, cada una llevaría
 * su propia cuenta y el límite real sería N veces mayor; ahí hay que mover
 * esto a Redis o a la base. Está aislado en este archivo justamente para que
 * ese cambio toque un solo lugar.
 *
 * No reemplaza a un firewall de aplicación: frena el ataque de diccionario
 * contra una cuenta, no una botnet distribuida.
 */

type Intento = { conteo: number; expira: number };

const intentos = new Map<string, Intento>();

/** Evita que el mapa crezca sin techo si alguien golpea con claves distintas. */
const MAX_CLAVES = 10_000;

function limpiar(ahora: number) {
  for (const [clave, dato] of intentos) {
    if (dato.expira <= ahora) intentos.delete(clave);
  }
}

export type ResultadoLimite = {
  permitido: boolean;
  /** Segundos que faltan para poder reintentar. */
  esperaSegundos: number;
  restantes: number;
};

/**
 * Cuenta un intento contra `clave` y dice si se puede seguir.
 * La ventana se reinicia cuando expira, no en cada intento.
 */
export function registrarIntento(
  clave: string,
  maximo = 8,
  ventanaSegundos = 900
): ResultadoLimite {
  const ahora = Date.now();

  if (intentos.size > MAX_CLAVES) limpiar(ahora);

  const actual = intentos.get(clave);

  if (!actual || actual.expira <= ahora) {
    intentos.set(clave, {
      conteo: 1,
      expira: ahora + ventanaSegundos * 1000,
    });
    return { permitido: true, esperaSegundos: 0, restantes: maximo - 1 };
  }

  actual.conteo += 1;

  if (actual.conteo > maximo) {
    return {
      permitido: false,
      esperaSegundos: Math.ceil((actual.expira - ahora) / 1000),
      restantes: 0,
    };
  }

  return {
    permitido: true,
    esperaSegundos: 0,
    restantes: maximo - actual.conteo,
  };
}

/** Se llama tras un ingreso correcto para no penalizar a quien sí acertó. */
export function limpiarIntentos(clave: string) {
  intentos.delete(clave);
}

/** Texto en minutos/segundos para mostrarle a la persona. */
export function formatearEspera(segundos: number) {
  if (segundos < 60) return `${segundos} segundos`;
  const minutos = Math.ceil(segundos / 60);
  return minutos === 1 ? "un minuto" : `${minutos} minutos`;
}
