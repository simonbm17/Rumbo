import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sesionActual } from "../helpers/session";

/**
 * Regresión del defecto simétrico al de `archiveDriver`, y peor.
 *
 * `archiveTruck` archivaba el vehículo y no hacía NADA con la asignación: la
 * dejaba abierta —`endedAt IS NULL`— y además con el `Truck.currentDriverId`
 * intacto. El conductor seguía figurando con un vehículo archivado, y el
 * expediente del vehículo seguía mostrando un conductor asignado.
 *
 * Estas pruebas fijan el comportamiento correcto: archivar cierra la vigente
 * con `ARCHIVED`, limpia la proyección, y no toca ni al conductor ni a los
 * viajes ni al historial anterior.
 */

vi.mock("@/lib/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth")>();
  return { ...real, requireWriter: async () => sesionActual() };
});
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {}, notFound: () => {} }));

const { archiveTruck } = await import("@/actions/trucks");
const { asignarConductor, cerrarPorArchivarVehiculo, verificarConsistencia } =
  await import("@/lib/assignments");
const { db, limpiarBase, cerrarBase } = await import("../helpers/db");
const { crearUsuario, crearVehiculo, crearConductor, crearViajeCompletado } =
  await import("../helpers/fixtures");

beforeEach(async () => {
  await limpiarBase();
  await crearUsuario();
});

afterAll(cerrarBase);

function formulario(truckId: string, archived: boolean) {
  const fd = new FormData();
  fd.set("truckId", truckId);
  fd.set("archived", String(archived));
  return fd;
}

/** Vehículo con conductor asignado. Devuelve ambos. */
async function conConductorAsignado(placa = "TST-001") {
  const vehiculo = await crearVehiculo({ plate: placa });
  const conductor = await crearConductor();
  await asignarConductor({
    truckId: vehiculo.id,
    driverId: conductor.id,
    startedAt: new Date("2026-02-10T09:00:00Z"),
    usuarioId: "usuario-prueba",
  });
  return { vehiculo, conductor };
}

describe("archivar un vehículo con asignación vigente", () => {
  it("cierra la asignación, la marca ARCHIVED y limpia la proyección", async () => {
    const { vehiculo, conductor } = await conConductorAsignado();

    await archiveTruck(formulario(vehiculo.id, true));

    const despues = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(despues.archived).toBe(true);
    expect(despues.status).toBe("INACTIVE");
    expect(despues.currentDriverId).toBeNull();

    expect(
      await db.driverAssignment.count({
        where: { truckId: vehiculo.id, endedAt: null },
      })
    ).toBe(0);

    const cerrada = await db.driverAssignment.findFirstOrThrow({
      where: { truckId: vehiculo.id },
    });
    expect(cerrada.endedAt).not.toBeNull();
    expect(cerrada.endReason).toBe("ARCHIVED");
    expect(cerrada.endedById).toBe("usuario-prueba");
    expect(cerrada.startedAt).toEqual(new Date("2026-02-10T09:00:00Z"));
    expect(cerrada.driverId).toBe(conductor.id);

    expect(await verificarConsistencia()).toEqual([]);
  });

  it("deja al conductor activo y sin archivar", async () => {
    const { vehiculo, conductor } = await conConductorAsignado("CON-001");

    await archiveTruck(formulario(vehiculo.id, true));

    const despues = await db.driver.findUniqueOrThrow({ where: { id: conductor.id } });
    expect(despues.archived).toBe(false);
    expect(despues.status).toBe("ACTIVE");
  });
});

describe("archivar un vehículo sin asignación vigente", () => {
  it("se archiva normalmente y no crea ninguna relación", async () => {
    const vehiculo = await crearVehiculo({ plate: "SIN-001" });

    await archiveTruck(formulario(vehiculo.id, true));

    const despues = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(despues.archived).toBe(true);
    expect(despues.status).toBe("INACTIVE");
    expect(despues.currentDriverId).toBeNull();

    expect(
      await db.driverAssignment.count({ where: { truckId: vehiculo.id } })
    ).toBe(0);
    expect(await verificarConsistencia()).toEqual([]);
  });

  it("archivar dos veces seguidas no duplica el cierre", async () => {
    const { vehiculo } = await conConductorAsignado("DOS-001");

    await archiveTruck(formulario(vehiculo.id, true));
    await archiveTruck(formulario(vehiculo.id, true));

    expect(
      await db.driverAssignment.count({ where: { truckId: vehiculo.id } })
    ).toBe(1);
    expect(
      await db.driverAssignment.count({
        where: { truckId: vehiculo.id, endedAt: null },
      })
    ).toBe(0);
    expect(await verificarConsistencia()).toEqual([]);
  });
});

describe("archivar con historial previo", () => {
  it("cierra solo la vigente y deja intactas las anteriores", async () => {
    const vehiculo = await crearVehiculo({ plate: "HIS-001" });
    const anteriorConductor = await crearConductor({ documentId: "20000001" });
    const actualConductor = await crearConductor({
      documentId: "20000002",
      firstName: "Beatriz",
    });

    const anterior = await db.driverAssignment.create({
      data: {
        truckId: vehiculo.id,
        driverId: anteriorConductor.id,
        startedAt: new Date("2025-01-01T00:00:00Z"),
        endedAt: new Date("2025-05-01T00:00:00Z"),
        endReason: "RELEASED",
        source: "MANUAL",
      },
    });

    await asignarConductor({
      truckId: vehiculo.id,
      driverId: actualConductor.id,
      startedAt: new Date("2025-05-02T00:00:00Z"),
      usuarioId: "usuario-prueba",
    });

    await archiveTruck(formulario(vehiculo.id, true));

    const anteriorDespues = await db.driverAssignment.findUniqueOrThrow({
      where: { id: anterior.id },
    });
    expect(anteriorDespues.endedAt).toEqual(new Date("2025-05-01T00:00:00Z"));
    expect(anteriorDespues.endReason).toBe("RELEASED");

    const vigenteDespues = await db.driverAssignment.findFirstOrThrow({
      where: { truckId: vehiculo.id, driverId: actualConductor.id },
    });
    expect(vigenteDespues.endReason).toBe("ARCHIVED");

    expect(
      await db.driverAssignment.count({ where: { truckId: vehiculo.id } })
    ).toBe(2);
    expect(
      await db.driverAssignment.count({
        where: { truckId: vehiculo.id, endedAt: null },
      })
    ).toBe(0);
    expect(await verificarConsistencia()).toEqual([]);
  });
});

describe("lo que archivar un vehículo NO debe tocar", () => {
  it("deja intactos los viajes, con su vehículo y su conductor", async () => {
    const { vehiculo, conductor } = await conConductorAsignado("VIA-001");
    const viaje = await crearViajeCompletado(vehiculo.id, conductor.id, {
      code: "V-ARCHT-1",
      revenue: 3_000_000,
      distanceKm: 640,
    });

    await archiveTruck(formulario(vehiculo.id, true));

    const despues = await db.trip.findUniqueOrThrow({ where: { id: viaje.id } });
    expect(despues.truckId).toBe(vehiculo.id);
    expect(despues.driverId).toBe(conductor.id);
    expect(despues.revenue).toBe(3_000_000);
    expect(despues.status).toBe("COMPLETED");
  });
});

describe("restaurar un vehículo", () => {
  it("lo reactiva sin recrear la asignación cerrada", async () => {
    const { vehiculo, conductor } = await conConductorAsignado("RES-001");
    await archiveTruck(formulario(vehiculo.id, true));

    await archiveTruck(formulario(vehiculo.id, false));

    const despues = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(despues.archived).toBe(false);
    expect(despues.status).toBe("ACTIVE");
    // Volver a asignar es una decisión, no un efecto de desarchivar.
    expect(despues.currentDriverId).toBeNull();
    expect(
      await db.driverAssignment.count({
        where: { truckId: vehiculo.id, endedAt: null },
      })
    ).toBe(0);
    expect(
      await db.driverAssignment.count({ where: { truckId: vehiculo.id } })
    ).toBe(1);

    const conductorDespues = await db.driver.findUniqueOrThrow({
      where: { id: conductor.id },
    });
    expect(conductorDespues.archived).toBe(false);
    expect(await verificarConsistencia()).toEqual([]);
  });
});

describe("atomicidad", () => {
  /*
    Igual que en el archivado de conductor: no se puede provocar a través de la
    acción un fallo POSTERIOR a un cierre exitoso, porque el único modo de que
    el `update` falle es un id inexistente, y con un id inexistente el cierre
    tampoco cierra nada. Así que la propiedad se comprueba sobre el helper, que
    es de la que depende `archiveTruck`.
  */
  it("el cierre se revierte si algo falla después dentro de la transacción", async () => {
    const { vehiculo, conductor } = await conConductorAsignado("ATO-001");

    await expect(
      db.$transaction(async (tx) => {
        await cerrarPorArchivarVehiculo(tx, vehiculo.id, "usuario-prueba");
        throw new Error("fallo provocado después del cierre");
      })
    ).rejects.toThrow("fallo provocado después del cierre");

    const sigueAbierta = await db.driverAssignment.findFirstOrThrow({
      where: { truckId: vehiculo.id },
    });
    expect(sigueAbierta.endedAt).toBeNull();
    expect(sigueAbierta.endReason).toBeNull();

    const truck = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(truck.currentDriverId).toBe(conductor.id);
    expect(await verificarConsistencia()).toEqual([]);
  });
});
