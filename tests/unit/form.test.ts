import { describe, expect, it } from "vitest";
import {
  ValidationError,
  amount,
  date,
  enumOf,
  int,
  optAmount,
  optDate,
  optNum,
  optStr,
  str,
  toActionError,
} from "@/lib/form";
import { Role, TruckStatus } from "@/generated/prisma/enums";

function form(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

describe("lectura de texto", () => {
  it("recorta espacios y exige los obligatorios", () => {
    expect(str(form({ plate: "  WGR-482  " }), "plate", "Placa")).toBe("WGR-482");
    expect(() => str(form({ plate: "   " }), "plate", "Placa")).toThrow(
      ValidationError
    );
  });

  it("convierte los opcionales vacíos en null, no en cadena vacía", () => {
    expect(optStr(form({ nickname: "" }), "nickname")).toBeNull();
    expect(optStr(form({ nickname: "La Coloso" }), "nickname")).toBe("La Coloso");
  });
});

describe("lectura de números", () => {
  it("acepta coma decimal, que es como se escribe en español", () => {
    expect(optNum(form({ x: "1234,50" }), "x", "X")).toBe(1234.5);
    expect(optNum(form({ x: "1234.50" }), "x", "X")).toBe(1234.5);
  });

  it("ignora los espacios de miles", () => {
    expect(optNum(form({ x: "1 250 000" }), "x", "X")).toBe(1250000);
  });

  it("rechaza importes negativos", () => {
    expect(() => optAmount(form({ x: "-5" }), "x", "Monto")).toThrow(
      ValidationError
    );
  });

  it("un monto ausente vale cero, no NaN", () => {
    expect(amount(form({}), "x", "Monto")).toBe(0);
  });

  it("rechaza decimales donde se espera un entero", () => {
    expect(() => int(form({ year: "2020,5" }), "year", "Año")).toThrow(
      ValidationError
    );
    expect(int(form({ year: "2020" }), "year", "Año")).toBe(2020);
  });

  it("rechaza texto que no es número", () => {
    expect(() => optNum(form({ x: "abc" }), "x", "X")).toThrow(ValidationError);
  });
});

/**
 * Las fechas sin hora se fijan a mediodía UTC a propósito: guardadas a
 * medianoche, un navegador al oeste de Greenwich las mostraría el día
 * anterior. Un SOAT que vence el 30 se vería venciendo el 29.
 */
describe("lectura de fechas", () => {
  it("fija las fechas sin hora a mediodía UTC", () => {
    const d = date(form({ f: "2026-09-30" }), "f", "Vencimiento");
    expect(d.toISOString()).toBe("2026-09-30T12:00:00.000Z");
  });

  it("no corre el día en zonas horarias al oeste", () => {
    const d = date(form({ f: "2026-09-30" }), "f", "Vencimiento");
    // Bogotá es UTC-5: a mediodía UTC siguen siendo las 07:00 del mismo día.
    const enBogota = new Date(d.getTime() - 5 * 60 * 60 * 1000);
    expect(enBogota.getUTCDate()).toBe(30);
  });

  it("devuelve null si el campo viene vacío", () => {
    expect(optDate(form({ f: "" }), "f", "F")).toBeNull();
  });

  it("rechaza una fecha inválida", () => {
    expect(() => date(form({ f: "no-es-fecha" }), "f", "F")).toThrow(
      ValidationError
    );
  });
});

/**
 * Regresión: `enumOf` usa `NoInfer` en el valor por defecto. Sin eso el tipo
 * de retorno se estrechaba al literal del fallback y cualquier comparación
 * posterior quedaba imposible — fue un bug real en actions/users.ts.
 */
describe("lectura de enums", () => {
  it("acepta un valor válido del enum", () => {
    expect(enumOf(form({ s: "MAINTENANCE" }), "s", "Estado", TruckStatus)).toBe(
      "MAINTENANCE"
    );
  });

  it("cae al valor por defecto si el valor no pertenece al enum", () => {
    expect(
      enumOf(form({ s: "INVENTADO" }), "s", "Estado", TruckStatus, "ACTIVE")
    ).toBe("ACTIVE");
  });

  it("lanza error si no hay valor por defecto", () => {
    expect(() => enumOf(form({ s: "INVENTADO" }), "s", "Estado", TruckStatus)).toThrow(
      ValidationError
    );
  });

  it("el tipo devuelto abarca el enum completo, no solo el fallback", () => {
    const rol = enumOf(form({ r: "ADMIN" }), "r", "Rol", Role, "VIEWER");
    // Si `NoInfer` desapareciera, `rol` sería del tipo "VIEWER" y esta
    // comparación no compilaría.
    expect(rol === "ADMIN").toBe(true);
  });
});

describe("traducción de errores para la persona", () => {
  it("traduce la violación de unicidad de placa", () => {
    const e = new Error('Unique constraint failed on the fields: (`plate`)');
    expect(toActionError(e)).toBe("Ya existe un camión con esa placa.");
  });

  it("traduce la de documento de conductor y la de correo", () => {
    expect(
      toActionError(new Error("Unique constraint failed on: (`documentId`)"))
    ).toContain("documento");
    expect(
      toActionError(new Error("Unique constraint failed on: (`email`)"))
    ).toContain("correo");
  });

  it("deja pasar el mensaje de los errores de validación", () => {
    expect(toActionError(new ValidationError("El campo «Placa» es obligatorio."))).toBe(
      "El campo «Placa» es obligatorio."
    );
  });

  it("no filtra detalles técnicos en un error inesperado", () => {
    const mensaje = toActionError(new Error("connect ECONNREFUSED 127.0.0.1:5433"));
    expect(mensaje).not.toContain("ECONNREFUSED");
    expect(mensaje).toContain("Ocurrió un error al guardar");
  });
});
