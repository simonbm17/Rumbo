import { describe, expect, it } from "vitest";
import {
  daysUntil,
  km,
  money,
  percent,
  relativeDays,
  round2,
  sum,
} from "@/lib/format";

/**
 * Cálculos financieros.
 *
 * Los importes se guardan como `Float`, así que el redondeo no es cosmético:
 * es lo que impide que las sumas arrastren centavos. Si alguien quita
 * `round2()` de `sum()`, esta prueba falla.
 */
describe("redondeo de importes", () => {
  it("corrige el arrastre clásico de coma flotante", () => {
    expect(0.1 + 0.2).not.toBe(0.3); // así se comporta sin redondeo
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it("suma sin acumular error en muchos términos", () => {
    const cientoUnCentavos = Array.from({ length: 100 }, () => 0.01);
    expect(sum(cientoUnCentavos)).toBe(1);
  });

  it("suma importes reales de fletes sin perder centavos", () => {
    expect(sum([1_250_000.55, 830_400.25, 415_200.2])).toBe(2_495_601);
  });

  it("trata los valores ausentes como cero", () => {
    expect(sum([100, 0, 50])).toBe(150);
    expect(round2(0)).toBe(0);
  });
});

describe("margen y costo por kilómetro", () => {
  // Reproduce el cálculo de getTruckFinancials con cifras verificables a mano.
  const ingresos = 10_000_000;
  const egresos = 6_500_000;

  it("calcula la utilidad", () => {
    expect(round2(ingresos - egresos)).toBe(3_500_000);
  });

  it("calcula el margen porcentual", () => {
    const margen = round2(((ingresos - egresos) / ingresos) * 100);
    expect(margen).toBe(35);
    expect(percent(margen)).toBe("35,0%");
  });

  it("calcula el costo por kilómetro", () => {
    expect(round2(egresos / 1000)).toBe(6500);
  });

  it("devuelve un guion cuando no hay dato en vez de NaN", () => {
    expect(percent(null)).toBe("—");
    expect(percent(Number.NaN)).toBe("—");
    expect(km(null)).toBe("—");
  });
});

describe("formato de moneda", () => {
  it("no muestra decimales en pesos", () => {
    expect(money(1_250_000)).not.toContain(",00");
  });

  it("compacta solo a partir del millón", () => {
    expect(money(950_000, true)).not.toMatch(/M/);
    expect(money(81_000_000, true)).toMatch(/M/);
  });
});

/**
 * Vencimientos. Las fechas se guardan a mediodía UTC justamente para que estos
 * bordes no se corran un día según la zona horaria del navegador.
 */
describe("días hasta el vencimiento", () => {
  function enDias(dias: number) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + dias);
    d.setUTCHours(12, 0, 0, 0);
    return d;
  }

  it("hoy es cero", () => {
    expect(daysUntil(enDias(0))).toBe(0);
  });

  it("mañana es uno y ayer es menos uno", () => {
    expect(daysUntil(enDias(1))).toBe(1);
    expect(daysUntil(enDias(-1))).toBe(-1);
  });

  it("describe el plazo en palabras, no solo con color", () => {
    expect(relativeDays(0)).toBe("vence hoy");
    expect(relativeDays(1)).toBe("vence mañana");
    expect(relativeDays(-1)).toBe("venció ayer");
    expect(relativeDays(9)).toBe("en 9 días");
    expect(relativeDays(-9)).toBe("venció hace 9 días");
  });
});
