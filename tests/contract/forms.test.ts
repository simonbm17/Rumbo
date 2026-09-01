import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RedireccionSimulada,
  actuarComo,
  capturarRedireccion,
  sesionActual,
} from "../helpers/session";

/**
 * CONTRATO ENTRE FORMULARIO Y SERVER ACTION
 *
 * Las acciones leen `FormData` por el nombre del campo. Nada obliga a que el
 * `name="plate"` que pinta el formulario coincida con el `"plate"` que lee la
 * acción: si el rediseño lo renombra, TypeScript compila, ESLint no dice nada
 * y el guardado se rompe recién en producción.
 *
 * Este archivo cierra esa grieta por los dos lados:
 *   1. el formulario emite los nombres esperados;
 *   2. la acción acepta un FormData construido con esos mismos nombres.
 *
 * La lista de abajo es la única fuente de verdad del contrato. Cambiar
 * cualquiera de los dos lados sin actualizarla rompe la prueba, que es
 * exactamente lo que se busca.
 */

const RAIZ = path.resolve(import.meta.dirname, "..", "..");

function nombresDelFormulario(rutaRelativa: string): string[] {
  const fuente = readFileSync(path.join(RAIZ, rutaRelativa), "utf8");
  return [...fuente.matchAll(/name="([a-zA-Z_][a-zA-Z0-9_]*)"/g)].map((m) => m[1]);
}

const CONTRATOS = {
  vehiculo: {
    formulario: "src/app/(app)/camiones/TruckForm.tsx",
    // Sin estos, el vehículo no se puede guardar.
    obligatorios: ["plate", "brand", "model", "year"],
    opcionales: [
      "nickname", "kind", "status", "vin", "engineNumber", "color",
      "odometerKm", "capacityKg", "axles", "fuelType", "tankLiters",
      "purchaseDate", "purchasePrice", "currentDriverId", "notes", "photo",
    ],
  },
  conductor: {
    formulario: "src/app/(app)/conductores/DriverForm.tsx",
    obligatorios: ["firstName", "lastName", "documentId"],
    opcionales: [
      "phone", "email", "licenseNumber", "licenseClass", "licenseExpiry",
      "hireDate", "status", "address", "emergencyContact", "emergencyPhone",
      "notes", "photo",
    ],
  },
  viaje: {
    formulario: "src/app/(app)/viajes/TripForm.tsx",
    obligatorios: ["truckId", "origin", "destination", "departureAt"],
    opcionales: [
      "driverId", "plannedArrivalAt", "arrivalAt", "startOdometerKm",
      "endOdometerKm", "distanceKm", "status", "revenue", "notes",
    ],
  },
} as const;

// --- Lado formulario: no necesita base de datos ------------------------------

describe("el formulario emite los nombres del contrato", () => {
  for (const [entidad, contrato] of Object.entries(CONTRATOS)) {
    describe(entidad, () => {
      const emitidos = nombresDelFormulario(contrato.formulario);

      it.each(contrato.obligatorios)(
        "emite el campo obligatorio «%s»",
        (campo) => {
          expect(emitidos).toContain(campo);
        }
      );

      it("emite también todos los campos opcionales del contrato", () => {
        const faltantes = contrato.opcionales.filter((c) => !emitidos.includes(c));
        expect(faltantes).toEqual([]);
      });

      it("no emite campos que la acción no lee", () => {
        const conocidos = new Set<string>([
          ...contrato.obligatorios,
          ...contrato.opcionales,
        ]);
        const desconocidos = [...new Set(emitidos)].filter((c) => !conocidos.has(c));
        expect(desconocidos).toEqual([]);
      });
    });
  }
});

// --- Lado acción: sí necesita base de datos ----------------------------------

vi.mock("@/lib/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...real,
    requireUser: async () => sesionActual(),
    requireWriter: async () => sesionActual(),
    requireAdmin: async () => sesionActual(),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new RedireccionSimulada(destino);
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));

const { createTruck } = await import("@/actions/trucks");
const { createDriver } = await import("@/actions/drivers");
const { createTrip } = await import("@/actions/trips");
const { db, limpiarBase, cerrarBase } = await import("../helpers/db");
const { crearUsuario, crearConductor } = await import("../helpers/fixtures");

beforeEach(async () => {
  await limpiarBase();
  actuarComo("ADMIN");
  await crearUsuario();
});

afterAll(cerrarBase);

describe("la acción acepta el FormData que arma el formulario", () => {
  it("guarda un vehículo con todos los campos del contrato", async () => {
    const conductor = await crearConductor();
    const fd = new FormData();
    fd.set("plate", "wgr-482"); // en minúscula: la acción debe normalizar
    fd.set("nickname", "La Coloso");
    fd.set("brand", "Kenworth");
    fd.set("model", "T800");
    fd.set("year", "2019");
    fd.set("kind", "TRACTOMULA");
    fd.set("status", "ACTIVE");
    fd.set("vin", "3AKJ12345");
    fd.set("engineNumber", "ENG9876");
    fd.set("color", "Blanco");
    fd.set("odometerKm", "412500");
    fd.set("capacityKg", "34000");
    fd.set("axles", "6");
    fd.set("fuelType", "Diésel");
    fd.set("tankLiters", "800");
    fd.set("purchaseDate", "2022-03-15");
    fd.set("purchasePrice", "380000000");
    fd.set("currentDriverId", conductor.id);
    fd.set("notes", "Sin novedades");

    await capturarRedireccion(() => createTruck(null, fd));

    const v = await db.truck.findUniqueOrThrow({ where: { plate: "WGR-482" } });
    expect(v.nickname).toBe("La Coloso");
    expect(v.year).toBe(2019);
    expect(v.kind).toBe("TRACTOMULA");
    expect(v.odometerKm).toBe(412_500);
    expect(v.capacityKg).toBe(34_000);
    expect(v.axles).toBe(6);
    expect(v.purchasePrice).toBe(380_000_000);
    expect(v.currentDriverId).toBe(conductor.id);
    // La fecha se guarda a mediodía UTC para que no cambie de día.
    expect(v.purchaseDate?.toISOString()).toBe("2022-03-15T12:00:00.000Z");
  });

  it("rechaza el vehículo si falta un campo obligatorio", async () => {
    const fd = new FormData();
    fd.set("brand", "Kenworth");
    fd.set("model", "T800");
    fd.set("year", "2019");
    // falta `plate`

    const r = (await createTruck(null, fd)) as { error?: string };
    expect(r.error).toContain("Placa");
    expect(await db.truck.count()).toBe(0);
  });

  it("guarda un conductor con todos los campos del contrato", async () => {
    const fd = new FormData();
    fd.set("firstName", "Carlos");
    fd.set("lastName", "Ramírez");
    fd.set("documentId", "79452103");
    fd.set("phone", "300 412 8890");
    fd.set("email", "carlos@rumbo.app");
    fd.set("licenseNumber", "LIC-123456");
    fd.set("licenseClass", "C3");
    fd.set("licenseExpiry", "2027-05-20");
    fd.set("hireDate", "2020-01-15");
    fd.set("status", "ACTIVE");
    fd.set("address", "Bogotá");
    fd.set("emergencyContact", "Esposa");
    fd.set("emergencyPhone", "311 000 0000");
    fd.set("notes", "—");

    await capturarRedireccion(() => createDriver(null, fd));

    const c = await db.driver.findUniqueOrThrow({ where: { documentId: "79452103" } });
    expect(c.firstName).toBe("Carlos");
    expect(c.licenseClass).toBe("C3");
    expect(c.licenseExpiry?.toISOString()).toBe("2027-05-20T12:00:00.000Z");
    expect(c.emergencyPhone).toBe("311 000 0000");
  });

  it("guarda un viaje con todos los campos del contrato", async () => {
    const vehiculo = await db.truck.create({
      data: { plate: "TST-900", brand: "Hino", model: "FC", year: 2022 },
    });
    const conductor = await crearConductor();

    const fd = new FormData();
    fd.set("truckId", vehiculo.id);
    fd.set("driverId", conductor.id);
    fd.set("origin", "Bogotá");
    fd.set("destination", "Cali");
    fd.set("departureAt", "2026-06-01T08:00");
    fd.set("plannedArrivalAt", "2026-06-02T18:00");
    fd.set("startOdometerKm", "10000");
    fd.set("endOdometerKm", "10500");
    fd.set("status", "PLANNED");
    fd.set("revenue", "3500000");
    fd.set("notes", "Cita en planta");

    await capturarRedireccion(() => createTrip(null, fd));

    const v = await db.trip.findFirstOrThrow();
    expect(v.truckId).toBe(vehiculo.id);
    expect(v.driverId).toBe(conductor.id);
    expect(v.origin).toBe("Bogotá");
    expect(v.revenue).toBe(3_500_000);
    expect(v.distanceKm).toBe(500); // deducida de los odómetros
    expect(v.code).toMatch(/^V-\d{4}$/);
  });
});
