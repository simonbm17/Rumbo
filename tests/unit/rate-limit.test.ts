import { describe, expect, it } from "vitest";
import {
  formatearEspera,
  limpiarIntentos,
  registrarIntento,
} from "@/lib/rate-limit";

/**
 * Límite de intentos de ingreso. Es lo único que separa la pantalla de login
 * de un ataque de diccionario, así que conviene que el conteo sea exacto.
 * Cada caso usa una clave distinta porque el estado vive en memoria del módulo.
 */
describe("límite de intentos", () => {
  it("permite exactamente el máximo y bloquea el siguiente", () => {
    const clave = `prueba-limite-${Math.random()}`;
    for (let i = 1; i <= 8; i++) {
      expect(registrarIntento(clave, 8, 900).permitido).toBe(true);
    }
    expect(registrarIntento(clave, 8, 900).permitido).toBe(false);
  });

  it("informa cuántos intentos quedan", () => {
    const clave = `prueba-restantes-${Math.random()}`;
    expect(registrarIntento(clave, 3, 900).restantes).toBe(2);
    expect(registrarIntento(clave, 3, 900).restantes).toBe(1);
    expect(registrarIntento(clave, 3, 900).restantes).toBe(0);
  });

  it("dice cuánto falta para poder reintentar", () => {
    const clave = `prueba-espera-${Math.random()}`;
    for (let i = 0; i < 3; i++) registrarIntento(clave, 2, 900);
    const bloqueado = registrarIntento(clave, 2, 900);
    expect(bloqueado.permitido).toBe(false);
    expect(bloqueado.esperaSegundos).toBeGreaterThan(0);
    expect(bloqueado.esperaSegundos).toBeLessThanOrEqual(900);
  });

  it("reinicia el conteo cuando la ventana expira", async () => {
    const clave = `prueba-ventana-${Math.random()}`;
    registrarIntento(clave, 1, 1);
    expect(registrarIntento(clave, 1, 1).permitido).toBe(false);
    await new Promise((r) => setTimeout(r, 1100));
    expect(registrarIntento(clave, 1, 1).permitido).toBe(true);
  });

  it("un ingreso correcto devuelve el cupo completo", () => {
    const clave = `prueba-limpieza-${Math.random()}`;
    registrarIntento(clave, 2, 900);
    registrarIntento(clave, 2, 900);
    expect(registrarIntento(clave, 2, 900).permitido).toBe(false);
    limpiarIntentos(clave);
    expect(registrarIntento(clave, 2, 900).permitido).toBe(true);
  });

  it("las claves no se pisan entre sí", () => {
    const a = `clave-a-${Math.random()}`;
    const b = `clave-b-${Math.random()}`;
    registrarIntento(a, 1, 900);
    expect(registrarIntento(a, 1, 900).permitido).toBe(false);
    expect(registrarIntento(b, 1, 900).permitido).toBe(true);
  });

  it("expresa la espera en palabras", () => {
    expect(formatearEspera(45)).toBe("45 segundos");
    expect(formatearEspera(60)).toBe("un minuto");
    expect(formatearEspera(900)).toBe("15 minutos");
  });
});
