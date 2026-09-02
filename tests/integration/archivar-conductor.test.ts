import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sesionActual } from "../helpers/session";

/**
 * Regresión de un defecto real de integridad.
 *
 * `archiveDriver` archivaba al conductor y, por separado, ponía en NULL el
 * `Truck.currentDriverId`. La asignación quedaba abierta: `DriverAssignment`
 * con `endedAt IS NULL` apuntando a un vehículo que ya no reconocía a nadie.
 * La fuente de verdad y su proyección quedaban en desacuerdo, y el expediente
 * del conductor seguía mostrando un vehículo que ya no era suyo.
 *
 * Estas pruebas fijan el comportamiento correcto para que no vuelva a
 * romperse: archivar cierra la asignación vigente con `ARCHIVED`, sincroniza
 * la proyección y no toca nada más.
 */

vi.mock("@/lib/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth")>();
  return { ...real, requireWriter: async () => sesionActual() };
});
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {}, notFound: () => {} }));

const { archiveDriver } = await import("@/actions/drivers");
const { asignarConductor, cerrarPorArchivarConductor, verificarConsistencia } =
  await import("@/lib/assignments");
const { db, limpiarBase, cerrarBase } = await import("../helpers/db");
const { crearUsuario, crearVehiculo, crearConductor, crearViajeCompletado } =
  await import("../helpers/fixtures");

beforeEach(async () => {
  await limpiarBase();
  await crearUsuario();
});

afterAll(cerrarBase);

function formulario(driverId: string, archived: boolean) {
  const fd = new FormData();
  fd.set("driverId", driverId);
  fd.set("archived", String(archived));
  return fd;
}

/** Prepara un conductor con vehículo asignado y devuelve ambos. */
async function conVehiculoAsignado(placa = "TST-001") {
  const vehiculo = await crearVehiculo({ plate: placa });
  const conductor = await crearConductor();
  await asignarConductor({
    truckId: vehiculo.id,
    driverId: conductor.id,
    startedAt: new Date("2026-01-15T10:00:00Z"),
    usuarioId: "usuario-prueba",
  });
  return { vehiculo, conductor };
}

describe("archivar un conductor con asignación vigente", () => {
  it("cierra la asignación, la marca ARCHIVED y sincroniza el vehículo", async () => {
    const { vehiculo, conductor } = await conVehiculoAsignado();

    await archiveDriver(formulario(conductor.id, true));

    const despues = await db.driver.findUniqueOrThrow({
      where: { id: conductor.id },
    });
    expect(despues.archived).toBe(true);
    expect(despues.status).toBe("INACTIVE");

    // Ninguna asignación queda abierta.
    const abiertas = await db.driverAssignment.count({
      where: { driverId: conductor.id, endedAt: null },
    });
    expect(abiertas).toBe(0);

    // La que había se cerró con el motivo correcto y quedó registrada.
    const cerrada = await db.driverAssignment.findFirstOrThrow({
      where: { driverId: conductor.id },
    });
    expect(cerrada.endedAt).not.toBeNull();
    expect(cerrada.endReason).toBe("ARCHIVED");
    expect(cerrada.endedById).toBe("usuario-prueba");
    // El inicio no se toca: el historial conserva cuándo empezó.
    expect(cerrada.startedAt).toEqual(new Date("2026-01-15T10:00:00Z"));

    // La proyección quedó sincronizada.
    const truck = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(truck.currentDriverId).toBeNull();

    // Y la invariante global se sostiene.
    expect(await verificarConsistencia()).toEqual([]);
  });

  it("conserva el vehículo en el historial, no como asignación actual", async () => {
    const { vehiculo, conductor } = await conVehiculoAsignado("HIS-001");

    await archiveDriver(formulario(conductor.id, true));

    const historial = await db.driverAssignment.findMany({
      where: { driverId: conductor.id },
      include: { truck: { select: { plate: true } } },
    });
    expect(historial).toHaveLength(1);
    expect(historial[0].truck.plate).toBe("HIS-001");
    expect(historial[0].endedAt).not.toBeNull();
    expect(vehiculo.plate).toBe("HIS-001");
  });
});

describe("archivar un conductor sin asignación vigente", () => {
  it("funciona igual y no inventa una asignación", async () => {
    const conductor = await crearConductor();

    await archiveDriver(formulario(conductor.id, true));

    const despues = await db.driver.findUniqueOrThrow({
      where: { id: conductor.id },
    });
    expect(despues.archived).toBe(true);
    expect(despues.status).toBe("INACTIVE");

    // No se creó ninguna fila para tener algo que cerrar.
    expect(await db.driverAssignment.count({ where: { driverId: conductor.id } })).toBe(0);
    expect(await verificarConsistencia()).toEqual([]);
  });

  it("archivar dos veces seguidas no rompe nada", async () => {
    const { conductor } = await conVehiculoAsignado("DOS-001");

    await archiveDriver(formulario(conductor.id, true));
    await archiveDriver(formulario(conductor.id, true));

    // La segunda pasada no encuentra nada abierto y no duplica el cierre.
    expect(
      await db.driverAssignment.count({ where: { driverId: conductor.id } })
    ).toBe(1);
    expect(
      await db.driverAssignment.count({
        where: { driverId: conductor.id, endedAt: null },
      })
    ).toBe(0);
    expect(await verificarConsistencia()).toEqual([]);
  });
});

describe("archivar con historial previo", () => {
  it("cierra solo la vigente y deja intactas las anteriores", async () => {
    const viejo = await crearVehiculo({ plate: "OLD-001" });
    const actual = await crearVehiculo({ plate: "NEW-001" });
    const conductor = await crearConductor();

    // Una asignación anterior ya cerrada, escrita a mano para fijar sus datos.
    const anterior = await db.driverAssignment.create({
      data: {
        truckId: viejo.id,
        driverId: conductor.id,
        startedAt: new Date("2025-01-01T00:00:00Z"),
        endedAt: new Date("2025-06-01T00:00:00Z"),
        endReason: "REASSIGNED",
        source: "MANUAL",
      },
    });

    await asignarConductor({
      truckId: actual.id,
      driverId: conductor.id,
      startedAt: new Date("2025-06-02T00:00:00Z"),
      usuarioId: "usuario-prueba",
    });

    await archiveDriver(formulario(conductor.id, true));

    const anteriorDespues = await db.driverAssignment.findUniqueOrThrow({
      where: { id: anterior.id },
    });
    expect(anteriorDespues.endedAt).toEqual(new Date("2025-06-01T00:00:00Z"));
    expect(anteriorDespues.endReason).toBe("REASSIGNED");

    const vigenteDespues = await db.driverAssignment.findFirstOrThrow({
      where: { driverId: conductor.id, truckId: actual.id },
    });
    expect(vigenteDespues.endReason).toBe("ARCHIVED");

    expect(
      await db.driverAssignment.count({
        where: { driverId: conductor.id, endedAt: null },
      })
    ).toBe(0);
    expect(
      await db.driverAssignment.count({ where: { driverId: conductor.id } })
    ).toBe(2);
    expect(await verificarConsistencia()).toEqual([]);
  });
});

describe("lo que archivar NO debe tocar", () => {
  it("deja intactos los viajes históricos del conductor", async () => {
    const { vehiculo, conductor } = await conVehiculoAsignado("VIA-001");
    const viaje = await crearViajeCompletado(vehiculo.id, conductor.id, {
      code: "V-ARCH-1",
      revenue: 2_000_000,
      distanceKm: 800,
    });

    await archiveDriver(formulario(conductor.id, true));

    const despues = await db.trip.findUniqueOrThrow({ where: { id: viaje.id } });
    expect(despues.driverId).toBe(conductor.id);
    expect(despues.truckId).toBe(vehiculo.id);
    expect(despues.revenue).toBe(2_000_000);
    expect(despues.status).toBe("COMPLETED");
  });
});

describe("atomicidad", () => {
  /*
    Lo que `archiveDriver` necesita para ser atómico es que el cierre de la
    asignación se deshaga si algo posterior falla dentro de la misma
    transacción. Eso se comprueba acá directamente sobre el helper, con un
    fallo provocado después de él.

    No pude construirlo a través de `archiveDriver`: para que el `update` del
    conductor falle hace falta un id inexistente, y con un id inexistente el
    cierre tampoco encuentra nada que cerrar, así que la prueba pasaría igual
    con o sin transacción y no demostraría nada.
  */
  it("el cierre se revierte si algo falla después dentro de la transacción", async () => {
    const { vehiculo, conductor } = await conVehiculoAsignado("ATO-001");

    await expect(
      db.$transaction(async (tx) => {
        await cerrarPorArchivarConductor(tx, conductor.id, "usuario-prueba");
        // Dentro de la misma transacción, algo falla después del cierre.
        throw new Error("fallo provocado después del cierre");
      })
    ).rejects.toThrow("fallo provocado después del cierre");

    const sigueAbierta = await db.driverAssignment.findFirstOrThrow({
      where: { driverId: conductor.id },
    });
    expect(sigueAbierta.endedAt).toBeNull();
    expect(sigueAbierta.endReason).toBeNull();

    const truck = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(truck.currentDriverId).toBe(conductor.id);
    expect(await verificarConsistencia()).toEqual([]);
  });

  it("un id inexistente no cierra la asignación de nadie más", async () => {
    const { vehiculo, conductor } = await conVehiculoAsignado("ATO-002");

    await expect(
      archiveDriver(formulario("no-existe-este-conductor", true))
    ).rejects.toThrow();

    const sigueAbierta = await db.driverAssignment.findFirstOrThrow({
      where: { driverId: conductor.id },
    });
    expect(sigueAbierta.endedAt).toBeNull();

    const truck = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(truck.currentDriverId).toBe(conductor.id);
  });
});

describe("restaurar", () => {
  it("reactiva al conductor sin recrear la asignación cerrada", async () => {
    const { vehiculo, conductor } = await conVehiculoAsignado("RES-001");
    await archiveDriver(formulario(conductor.id, true));

    await archiveDriver(formulario(conductor.id, false));

    const despues = await db.driver.findUniqueOrThrow({
      where: { id: conductor.id },
    });
    expect(despues.archived).toBe(false);
    expect(despues.status).toBe("ACTIVE");

    /*
      Restaurar NO devuelve el vehículo: volver a asignarlo es una decisión de
      la operación, no un efecto secundario. El vehículo sigue libre.
    */
    expect(
      await db.driverAssignment.count({
        where: { driverId: conductor.id, endedAt: null },
      })
    ).toBe(0);
    const truck = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(truck.currentDriverId).toBeNull();
    expect(await verificarConsistencia()).toEqual([]);
  });
});
