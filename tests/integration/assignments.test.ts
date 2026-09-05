import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sesionActual } from "../helpers/session";

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
/*
  `updateTruck` termina en `redirect()` y exige sesión de escritura. Se sustituye
  solo la lectura de la cookie: las reglas de permiso siguen siendo las reales.
*/
vi.mock("@/lib/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth")>();
  return { ...real, requireWriter: async () => sesionActual() };
});
vi.mock("next/navigation", () => ({ redirect: () => {}, notFound: () => {} }));

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
const { updateTruck } = await import("@/actions/trucks");
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

/**
 * REGRESIÓN DEL DEFECTO DE INTEGRIDAD DE LA ASIGNACIÓN.
 *
 * El formulario del vehículo tiene un desplegable «Conductor asignado», y la
 * acción escribía `Truck.currentDriverId` como una columna más. Reproducido en
 * un navegador real: guardar el vehículo dejaba la proyección apuntando a una
 * persona SIN crear ninguna `DriverAssignment`, de modo que el Panel —que
 * pregunta a la fuente de verdad— seguía contando ese vehículo como «sin
 * conductor»; y permitía dejar al mismo conductor proyectado en dos vehículos a
 * la vez, algo que los índices únicos parciales impiden en `DriverAssignment`
 * pero no pueden impedir en una columna suelta.
 *
 * Estas tres pruebas fijan el comportamiento correcto por las tres ramas de la
 * acción: se eligió a alguien, se eligió a alguien ocupado, se quitó.
 */
function formularioVehiculo(conductorId: string | null) {
  const fd = new FormData();
  fd.set("plate", "REG-001");
  fd.set("brand", "Kenworth");
  fd.set("model", "T800");
  fd.set("year", "2020");
  fd.set("kind", "TRACTOMULA");
  fd.set("status", "ACTIVE");
  fd.set("odometerKm", "100000");
  if (conductorId) fd.set("currentDriverId", conductorId);
  return fd;
}

describe("asignar desde el formulario del vehículo", () => {
  it("crea la asignación y no solo la proyección", async () => {
    const vehiculo = await crearVehiculo({ plate: "REG-001" });
    const conductor = await crearConductor();

    await updateTruck(vehiculo.id, null, formularioVehiculo(conductor.id));

    const vigente = await vigenteDeVehiculo(vehiculo.id);
    expect(vigente).not.toBeNull();
    expect(vigente!.driverId).toBe(conductor.id);
    expect(vigente!.endedAt).toBeNull();

    const truck = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(truck.currentDriverId).toBe(conductor.id);
    expect(await verificarConsistencia()).toEqual([]);
  });

  it("rechaza a quien ya está en otro vehículo y no escribe nada", async () => {
    const ocupado = await crearVehiculo({ plate: "OCU-001" });
    const libre = await crearVehiculo({ plate: "REG-001" });
    const conductor = await crearConductor();
    await asignarConductor({
      truckId: ocupado.id,
      driverId: conductor.id,
      startedAt: AYER,
      usuarioId: "usuario-prueba",
    });

    const r = (await updateTruck(
      libre.id,
      null,
      formularioVehiculo(conductor.id)
    )) as { error?: string };

    expect(r?.error).toContain("OCU-001");

    // El vehículo libre sigue libre y la asignación original no se movió.
    expect(await vigenteDeVehiculo(libre.id)).toBeNull();
    const sigue = await vigenteDeVehiculo(ocupado.id);
    expect(sigue!.driverId).toBe(conductor.id);
    expect(await db.driverAssignment.count()).toBe(1);
    expect(await verificarConsistencia()).toEqual([]);
  });

  it("quitar el conductor cierra la asignación vigente", async () => {
    const vehiculo = await crearVehiculo({ plate: "REG-001" });
    const conductor = await crearConductor();
    await asignarConductor({
      truckId: vehiculo.id,
      driverId: conductor.id,
      startedAt: AYER,
      usuarioId: "usuario-prueba",
    });

    await updateTruck(vehiculo.id, null, formularioVehiculo(null));

    expect(await vigenteDeVehiculo(vehiculo.id)).toBeNull();
    // La fila no se borra: el historial conserva que existió.
    const historial = await historialDeVehiculo(vehiculo.id);
    expect(historial).toHaveLength(1);
    expect(historial[0].endedAt).not.toBeNull();
    expect(historial[0].endReason).toBe("RELEASED");

    const truck = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(truck.currentDriverId).toBeNull();
    expect(await verificarConsistencia()).toEqual([]);
  });
});
