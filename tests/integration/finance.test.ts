import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const { getTruckFinancials, getFuelStats } = await import("@/lib/stats");
const { db, limpiarBase, cerrarBase } = await import("../helpers/db");
const { crearVehiculo, crearConductor, crearViajeCompletado } = await import(
  "../helpers/fixtures"
);

beforeEach(limpiarBase);
afterAll(cerrarBase);

/**
 * Rentabilidad por vehículo. Todas las cifras son redondas a propósito: el
 * resultado esperado se calcula a mano en el comentario de cada caso, así que
 * si el cálculo cambia la prueba dice exactamente en qué.
 */
describe("rentabilidad de un vehículo", () => {
  it("suma ingresos, gastos y taller, y deriva utilidad y margen", async () => {
    const vehiculo = await crearVehiculo();
    const conductor = await crearConductor();

    // Ingresos: 10.000.000 en dos viajes completados
    await crearViajeCompletado(vehiculo.id, conductor.id, {
      code: "V-0001",
      revenue: 6_000_000,
      distanceKm: 600,
    });
    await crearViajeCompletado(vehiculo.id, conductor.id, {
      code: "V-0002",
      revenue: 4_000_000,
      distanceKm: 400,
    });

    // Gastos operativos: 3.000.000
    await db.expense.create({
      data: {
        truckId: vehiculo.id,
        category: "COMBUSTIBLE",
        amount: 2_000_000,
        date: new Date("2026-06-01"),
      },
    });
    await db.expense.create({
      data: {
        truckId: vehiculo.id,
        category: "PEAJE",
        amount: 1_000_000,
        date: new Date("2026-06-01"),
      },
    });

    // Taller: 1.000.000
    await db.maintenance.create({
      data: {
        truckId: vehiculo.id,
        title: "Cambio de aceite",
        date: new Date("2026-06-05"),
        cost: 1_000_000,
        status: "COMPLETED",
      },
    });

    const f = await getTruckFinancials(vehiculo.id);

    expect(f.ingresos).toBe(10_000_000);
    expect(f.gastos).toBe(3_000_000);
    expect(f.taller).toBe(1_000_000);
    expect(f.egresos).toBe(4_000_000); // gastos + taller
    expect(f.utilidad).toBe(6_000_000); // 10M - 4M
    expect(f.margen).toBe(60); // 6M / 10M
    expect(f.km).toBe(1000); // 600 + 400
    expect(f.costoPorKm).toBe(4000); // 4M / 1000 km
    expect(f.tripCount).toBe(2);
  });

  it("excluye del ingreso los viajes cancelados", async () => {
    const vehiculo = await crearVehiculo();

    await crearViajeCompletado(vehiculo.id, null, {
      code: "V-0001",
      revenue: 5_000_000,
    });
    await db.trip.create({
      data: {
        code: "V-0002",
        truckId: vehiculo.id,
        origin: "Bogotá",
        destination: "Cali",
        departureAt: new Date("2026-06-10T08:00:00Z"),
        status: "CANCELLED",
        revenue: 9_999_999,
      },
    });

    const f = await getTruckFinancials(vehiculo.id);
    expect(f.ingresos).toBe(5_000_000);
    expect(f.tripCount).toBe(2); // el cancelado se cuenta como viaje…
  });

  it("no divide por cero cuando no hay ingresos ni kilómetros", async () => {
    const vehiculo = await crearVehiculo();
    const f = await getTruckFinancials(vehiculo.id);

    expect(f.ingresos).toBe(0);
    expect(f.utilidad).toBe(0);
    expect(f.margen).toBeNull();
    expect(f.costoPorKm).toBeNull();
  });

  it("da margen negativo cuando el vehículo pierde plata", async () => {
    const vehiculo = await crearVehiculo();
    await crearViajeCompletado(vehiculo.id, null, { revenue: 1_000_000 });
    await db.expense.create({
      data: {
        truckId: vehiculo.id,
        category: "REPARACION",
        amount: 3_000_000,
        date: new Date("2026-06-01"),
      },
    });

    const f = await getTruckFinancials(vehiculo.id);
    expect(f.utilidad).toBe(-2_000_000);
    expect(f.margen).toBe(-200);
  });
});

describe("consumo de combustible", () => {
  it("calcula el rendimiento en kilómetros por litro", async () => {
    const vehiculo = await crearVehiculo();
    await crearViajeCompletado(vehiculo.id, null, { distanceKm: 1000 });

    await db.expense.create({
      data: {
        truckId: vehiculo.id,
        category: "COMBUSTIBLE",
        amount: 2_500_000,
        liters: 250,
        date: new Date("2026-06-01"),
      },
    });

    const c = await getFuelStats(vehiculo.id);
    expect(c.liters).toBe(250);
    expect(c.cost).toBe(2_500_000);
    expect(c.fillUps).toBe(1);
    expect(c.kmPerLiter).toBe(4); // 1000 km / 250 L
    expect(c.costPerKm).toBe(2500); // 2,5M / 1000 km
  });

  it("ignora los gastos de combustible sin litros cargados", async () => {
    const vehiculo = await crearVehiculo();
    await db.expense.create({
      data: {
        truckId: vehiculo.id,
        category: "COMBUSTIBLE",
        amount: 500_000,
        date: new Date("2026-06-01"),
      },
    });

    const c = await getFuelStats(vehiculo.id);
    expect(c.fillUps).toBe(0);
    expect(c.kmPerLiter).toBeNull();
  });

  it("no atribuye a un vehículo el combustible de otro", async () => {
    const uno = await crearVehiculo({ plate: "AAA-111" });
    const dos = await crearVehiculo({ plate: "BBB-222" });

    await db.expense.create({
      data: {
        truckId: dos.id,
        category: "COMBUSTIBLE",
        amount: 900_000,
        liters: 90,
        date: new Date("2026-06-01"),
      },
    });

    expect((await getFuelStats(uno.id)).liters).toBe(0);
    expect((await getFuelStats(dos.id)).liters).toBe(90);
  });
});
