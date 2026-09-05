import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const {
  asignarConductor,
  transferirConductor,
  liberarVehiculo,
  anularAsignacion,
  vigenteDeVehiculo,
  vigenteDeConductor,
  historialDeVehiculo,
  verificarConsistencia,
  AssignmentError,
} = await import("@/lib/assignments");
const { toActionError } = await import("@/lib/form");
const { db, limpiarBase, cerrarBase } = await import("../helpers/db");
const { crearUsuario, crearVehiculo, crearConductor } = await import(
  "../helpers/fixtures"
);

const AYER = new Date("2026-08-31T12:00:00Z");

beforeEach(async () => {
  await limpiarBase();
  await crearUsuario();
});

afterAll(cerrarBase);

/**
 * La invariante que sostiene todo el diseño: `Truck.currentDriverId` es una
 * proyección de la asignación vigente. Se comprueba al final de cada caso que
 * escribe, no solo en el que la prueba explícitamente.
 */
async function esperarConsistencia() {
  expect(await verificarConsistencia()).toEqual([]);
}

describe("asignar un conductor", () => {
  it("crea la asignación y proyecta el conductor en el vehículo", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();

    const a = await asignarConductor({
      truckId: v.id,
      driverId: c.id,
      startedAt: AYER,
      usuarioId: "usuario-prueba",
    });

    expect(a).toBeTruthy();
    const vigente = await vigenteDeVehiculo(v.id);
    expect(vigente?.driverId).toBe(c.id);
    expect(vigente?.endedAt).toBeNull();
    expect(vigente?.source).toBe("MANUAL");

    const despues = await db.truck.findUniqueOrThrow({ where: { id: v.id } });
    expect(despues.currentDriverId).toBe(c.id);
    await esperarConsistencia();
  });

  it("reasignar el mismo vehículo cierra la anterior con REASSIGNED", async () => {
    const v = await crearVehiculo();
    const c1 = await crearConductor({ documentId: "1", firstName: "Ana" });
    const c2 = await crearConductor({ documentId: "2", firstName: "Beto" });

    await asignarConductor({ truckId: v.id, driverId: c1.id, startedAt: AYER, usuarioId: null });
    await asignarConductor({ truckId: v.id, driverId: c2.id, startedAt: new Date(), usuarioId: null });

    const historial = await historialDeVehiculo(v.id);
    expect(historial).toHaveLength(2);

    const cerrada = historial.find((h) => h.driverId === c1.id)!;
    expect(cerrada.endedAt).not.toBeNull();
    expect(cerrada.endReason).toBe("REASSIGNED");

    const vigente = historial.find((h) => h.driverId === c2.id)!;
    expect(vigente.endedAt).toBeNull();
    await esperarConsistencia();
  });

  it("asignar dos veces a la misma persona no duplica nada", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();

    await asignarConductor({ truckId: v.id, driverId: c.id, startedAt: AYER, usuarioId: null });
    await asignarConductor({ truckId: v.id, driverId: c.id, startedAt: AYER, usuarioId: null });

    expect(await db.driverAssignment.count()).toBe(1);
    await esperarConsistencia();
  });

  /**
   * La decisión de diseño clave: no se libera al conductor de otro vehículo en
   * silencio. Debe rechazar, con el nombre del vehículo donde está.
   */
  it("rechaza si la persona ya está en otro vehículo, sin tocar nada", async () => {
    const a = await crearVehiculo({ plate: "AAA-111" });
    const b = await crearVehiculo({ plate: "BBB-222" });
    const c = await crearConductor({ firstName: "Ana", lastName: "Ruiz" });

    await asignarConductor({ truckId: a.id, driverId: c.id, startedAt: AYER, usuarioId: null });

    await expect(
      asignarConductor({ truckId: b.id, driverId: c.id, startedAt: new Date(), usuarioId: null })
    ).rejects.toThrow(AssignmentError);

    // El estado anterior quedó intacto: sigue en A, y B sigue libre.
    expect((await vigenteDeConductor(c.id))?.truckId).toBe(a.id);
    expect(await vigenteDeVehiculo(b.id)).toBeNull();
    expect(await db.driverAssignment.count()).toBe(1);
    await esperarConsistencia();
  });

  it("el rechazo trae el código y la placa para que la interfaz ofrezca transferir", async () => {
    const a = await crearVehiculo({ plate: "AAA-111" });
    const b = await crearVehiculo({ plate: "BBB-222" });
    const c = await crearConductor({ firstName: "Ana", lastName: "Ruiz" });
    await asignarConductor({ truckId: a.id, driverId: c.id, startedAt: AYER, usuarioId: null });

    try {
      await asignarConductor({ truckId: b.id, driverId: c.id, startedAt: new Date(), usuarioId: null });
      throw new Error("debió rechazar");
    } catch (e) {
      const err = e as InstanceType<typeof AssignmentError>;
      expect(err.codigo).toBe("CONDUCTOR_EN_OTRO_VEHICULO");
      expect(err.contexto?.plate).toBe("AAA-111");
      expect(err.message).toContain("Ana Ruiz");
      expect(err.message).toContain("AAA-111");
    }
  });
});

describe("transferir un conductor", () => {
  it("mueve a la persona y deja libre el vehículo de origen", async () => {
    const a = await crearVehiculo({ plate: "AAA-111" });
    const b = await crearVehiculo({ plate: "BBB-222" });
    const c = await crearConductor();

    await asignarConductor({ truckId: a.id, driverId: c.id, startedAt: AYER, usuarioId: null });
    await transferirConductor({ truckId: b.id, driverId: c.id, startedAt: new Date(), usuarioId: null });

    expect((await vigenteDeConductor(c.id))?.truckId).toBe(b.id);
    expect(await vigenteDeVehiculo(a.id)).toBeNull();
    expect((await db.truck.findUniqueOrThrow({ where: { id: a.id } })).currentDriverId).toBeNull();
    expect((await db.truck.findUniqueOrThrow({ where: { id: b.id } })).currentDriverId).toBe(c.id);

    const cerrada = (await historialDeVehiculo(a.id))[0];
    expect(cerrada.endReason).toBe("REASSIGNED");
    await esperarConsistencia();
  });

  it("también cierra la asignación que tenía el vehículo destino", async () => {
    const a = await crearVehiculo({ plate: "AAA-111" });
    const b = await crearVehiculo({ plate: "BBB-222" });
    const c1 = await crearConductor({ documentId: "1", firstName: "Ana" });
    const c2 = await crearConductor({ documentId: "2", firstName: "Beto" });

    await asignarConductor({ truckId: a.id, driverId: c1.id, startedAt: AYER, usuarioId: null });
    await asignarConductor({ truckId: b.id, driverId: c2.id, startedAt: AYER, usuarioId: null });

    // Ana pasa de A a B, donde estaba Beto.
    await transferirConductor({ truckId: b.id, driverId: c1.id, startedAt: new Date(), usuarioId: null });

    expect((await vigenteDeVehiculo(b.id))?.driverId).toBe(c1.id);
    expect(await vigenteDeConductor(c2.id)).toBeNull();
    expect(await vigenteDeVehiculo(a.id)).toBeNull();
    await esperarConsistencia();
  });

  it("rechaza transferir a quien no está asignado a ningún vehículo", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();

    await expect(
      transferirConductor({ truckId: v.id, driverId: c.id, startedAt: new Date(), usuarioId: null })
    ).rejects.toThrow(/no está asignada a ningún vehículo/);

    expect(await db.driverAssignment.count()).toBe(0);
  });
});

describe("liberar y anular", () => {
  it("liberar cierra con RELEASED y limpia la proyección", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();
    await asignarConductor({ truckId: v.id, driverId: c.id, startedAt: AYER, usuarioId: null });

    await liberarVehiculo(v.id, null);

    expect(await vigenteDeVehiculo(v.id)).toBeNull();
    expect((await db.truck.findUniqueOrThrow({ where: { id: v.id } })).currentDriverId).toBeNull();
    expect((await historialDeVehiculo(v.id))[0].endReason).toBe("RELEASED");
    await esperarConsistencia();
  });

  it("liberar un vehículo que ya estaba libre no falla", async () => {
    const v = await crearVehiculo();
    await expect(liberarVehiculo(v.id, null)).resolves.toBe(0);
    await esperarConsistencia();
  });

  it("anular marca CANCELLED sin borrar la fila", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();
    const a = await asignarConductor({ truckId: v.id, driverId: c.id, startedAt: AYER, usuarioId: null });

    await anularAsignacion(a!.id, null);

    // Sigue existiendo: no se destruye el rastro de que alguien la creó.
    expect(await db.driverAssignment.count()).toBe(1);
    const historial = await historialDeVehiculo(v.id);
    expect(historial[0].endReason).toBe("CANCELLED");
    expect(await vigenteDeVehiculo(v.id)).toBeNull();
    await esperarConsistencia();
  });

  it("no se puede anular una asignación ya cerrada", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();
    const a = await asignarConductor({ truckId: v.id, driverId: c.id, startedAt: AYER, usuarioId: null });
    await anularAsignacion(a!.id, null);

    await expect(anularAsignacion(a!.id, null)).rejects.toThrow(/ya está cerrada/);
  });
});

/**
 * PostgreSQL como última barrera. Estas pruebas escriben saltándose el módulo,
 * a propósito: comprueban que la base sostiene la invariante aunque el código
 * se equivoque.
 */
describe("la base como barrera final", () => {
  it("rechaza dos asignaciones vigentes para el mismo vehículo", async () => {
    const v = await crearVehiculo();
    const c1 = await crearConductor({ documentId: "1" });
    const c2 = await crearConductor({ documentId: "2" });

    await db.driverAssignment.create({ data: { truckId: v.id, driverId: c1.id, startedAt: AYER } });
    await expect(
      db.driverAssignment.create({ data: { truckId: v.id, driverId: c2.id, startedAt: AYER } })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rechaza dos asignaciones vigentes para el mismo conductor", async () => {
    const a = await crearVehiculo({ plate: "AAA-111" });
    const b = await crearVehiculo({ plate: "BBB-222" });
    const c = await crearConductor();

    await db.driverAssignment.create({ data: { truckId: a.id, driverId: c.id, startedAt: AYER } });
    await expect(
      db.driverAssignment.create({ data: { truckId: b.id, driverId: c.id, startedAt: AYER } })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("permite el mismo par vehículo/conductor si la anterior está cerrada", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();

    await db.driverAssignment.create({
      data: { truckId: v.id, driverId: c.id, startedAt: AYER, endedAt: new Date(), endReason: "RELEASED" },
    });
    await expect(
      db.driverAssignment.create({ data: { truckId: v.id, driverId: c.id, startedAt: new Date() } })
    ).resolves.toBeTruthy();
  });

  it("rechaza cerrar sin motivo, y poner motivo sin cerrar", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();

    await expect(
      db.driverAssignment.create({
        data: { truckId: v.id, driverId: c.id, startedAt: AYER, endedAt: new Date() },
      })
    ).rejects.toMatchObject({ code: "P2039" });

    await expect(
      db.driverAssignment.create({
        data: { truckId: v.id, driverId: c.id, startedAt: AYER, endReason: "RELEASED" },
      })
    ).rejects.toMatchObject({ code: "P2039" });
  });

  it("solo una asignación MIGRATION puede no tener fecha de inicio", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();

    await expect(
      db.driverAssignment.create({ data: { truckId: v.id, driverId: c.id, source: "MANUAL" } })
    ).rejects.toMatchObject({ code: "P2039" });

    await expect(
      db.driverAssignment.create({ data: { truckId: v.id, driverId: c.id, source: "MIGRATION" } })
    ).resolves.toBeTruthy();
  });

  it("rechaza una fecha de fin anterior a la de inicio", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();

    await expect(
      db.driverAssignment.create({
        data: {
          truckId: v.id,
          driverId: c.id,
          startedAt: new Date("2026-06-01"),
          endedAt: new Date("2026-01-01"),
          endReason: "RELEASED",
        },
      })
    ).rejects.toMatchObject({ code: "P2039" });
  });

  it("impide borrar un vehículo o un conductor con historial", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();
    await asignarConductor({ truckId: v.id, driverId: c.id, startedAt: AYER, usuarioId: null });

    await expect(db.driver.delete({ where: { id: c.id } })).rejects.toMatchObject({
      code: "P2003",
    });
    await expect(db.truck.delete({ where: { id: v.id } })).rejects.toMatchObject({
      code: "P2003",
    });
  });
});

/**
 * Los mensajes que ve la persona. Se comprueban contra el error real de
 * PostgreSQL, no contra una cadena inventada: si el nombre de un índice cambia,
 * la traducción deja de funcionar y esta prueba lo detecta.
 */
describe("traducción de los errores al español", () => {
  it("traduce la unicidad por vehículo", async () => {
    const v = await crearVehiculo();
    const c1 = await crearConductor({ documentId: "1" });
    const c2 = await crearConductor({ documentId: "2" });
    await db.driverAssignment.create({ data: { truckId: v.id, driverId: c1.id, startedAt: AYER } });

    try {
      await db.driverAssignment.create({ data: { truckId: v.id, driverId: c2.id, startedAt: AYER } });
      throw new Error("debió fallar");
    } catch (e) {
      expect(toActionError(e)).toBe(
        "Este vehículo ya tiene un conductor asignado. Cierra esa asignación antes de crear una nueva."
      );
    }
  });

  it("traduce la unicidad por conductor", async () => {
    const a = await crearVehiculo({ plate: "AAA-111" });
    const b = await crearVehiculo({ plate: "BBB-222" });
    const c = await crearConductor();
    await db.driverAssignment.create({ data: { truckId: a.id, driverId: c.id, startedAt: AYER } });

    try {
      await db.driverAssignment.create({ data: { truckId: b.id, driverId: c.id, startedAt: AYER } });
      throw new Error("debió fallar");
    } catch (e) {
      expect(toActionError(e)).toBe(
        "Esta persona ya está asignada a otro vehículo. Liberala de ese vehículo o transferila a este."
      );
    }
  });

  it("traduce el bloqueo de borrado y sugiere archivar", async () => {
    const v = await crearVehiculo();
    const c = await crearConductor();
    await asignarConductor({ truckId: v.id, driverId: c.id, startedAt: AYER, usuarioId: null });

    try {
      await db.driver.delete({ where: { id: c.id } });
      throw new Error("debió fallar");
    } catch (e) {
      expect(toActionError(e)).toContain("Archivalo en lugar de eliminarlo");
    }
  });

  it("nunca filtra la fila que falló en un error de CHECK", async () => {
    const v = await crearVehiculo({ plate: "SECRETA-999" });
    const c = await crearConductor();

    try {
      await db.driverAssignment.create({
        data: { truckId: v.id, driverId: c.id, startedAt: AYER, endedAt: new Date() },
      });
      throw new Error("debió fallar");
    } catch (e) {
      const mensaje = toActionError(e);
      // El error crudo de PostgreSQL trae la fila completa en `detail`.
      expect(mensaje).not.toContain(v.id);
      expect(mensaje).not.toContain(c.id);
      expect(mensaje).not.toContain("Failing row");
      expect(mensaje).toBe(
        "No se pudo cerrar la asignación: hay que indicar el motivo del cierre."
      );
    }
  });
});

/**
 * Concurrencia: dos operaciones simultáneas sobre el mismo vehículo o la misma
 * persona. Una gana, la otra falla limpio, y la invariante se mantiene.
 */
describe("concurrencia", () => {
  it("dos asignaciones simultáneas al mismo vehículo: una sola sobrevive", async () => {
    const v = await crearVehiculo();
    const c1 = await crearConductor({ documentId: "1" });
    const c2 = await crearConductor({ documentId: "2" });

    const resultados = await Promise.allSettled([
      asignarConductor({ truckId: v.id, driverId: c1.id, startedAt: AYER, usuarioId: null }),
      asignarConductor({ truckId: v.id, driverId: c2.id, startedAt: AYER, usuarioId: null }),
    ]);

    const exitosas = resultados.filter((r) => r.status === "fulfilled");
    expect(exitosas.length).toBeGreaterThanOrEqual(1);
    expect(await db.driverAssignment.count({ where: { endedAt: null } })).toBe(1);
    await esperarConsistencia();
  });

  it("la misma persona a dos vehículos a la vez: una sola sobrevive", async () => {
    const a = await crearVehiculo({ plate: "AAA-111" });
    const b = await crearVehiculo({ plate: "BBB-222" });
    const c = await crearConductor();

    await Promise.allSettled([
      asignarConductor({ truckId: a.id, driverId: c.id, startedAt: AYER, usuarioId: null }),
      asignarConductor({ truckId: b.id, driverId: c.id, startedAt: AYER, usuarioId: null }),
    ]);

    expect(await db.driverAssignment.count({ where: { driverId: c.id, endedAt: null } })).toBe(1);
    await esperarConsistencia();
  });

  /**
   * Rollback: si un paso falla a mitad de la transacción, no queda ni la
   * asignación anterior cerrada ni la nueva creada.
   */
  it("una transferencia que falla no deja nada a medias", async () => {
    const a = await crearVehiculo({ plate: "AAA-111" });
    const c = await crearConductor();
    await asignarConductor({ truckId: a.id, driverId: c.id, startedAt: AYER, usuarioId: null });

    // Vehículo destino inexistente: el paso final revienta.
    await expect(
      transferirConductor({
        truckId: "vehiculo-que-no-existe",
        driverId: c.id,
        startedAt: new Date(),
        usuarioId: null,
      })
    ).rejects.toThrow();

    // La asignación original sigue vigente y la proyección intacta.
    const vigente = await vigenteDeConductor(c.id);
    expect(vigente?.truckId).toBe(a.id);
    expect(vigente?.endedAt).toBeNull();
    expect((await db.truck.findUniqueOrThrow({ where: { id: a.id } })).currentDriverId).toBe(c.id);
    expect(await db.driverAssignment.count()).toBe(1);
    await esperarConsistencia();
  });
});
