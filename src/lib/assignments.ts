import "server-only";

import { prisma } from "@/lib/prisma";
import type { AssignmentEndReason } from "@/generated/prisma/enums";

/**
 * ÚNICO módulo autorizado a escribir en `DriverAssignment` y en
 * `Truck.currentDriverId`.
 *
 * Ninguna server action toca esas dos cosas directamente. La razón es la
 * invariante de proyección:
 *
 *     Truck.currentDriverId === driverId de la única asignación vigente
 *                              del vehículo, o NULL si no hay ninguna.
 *
 * Historial y caché se escriben siempre dentro de la misma transacción. Si algo
 * falla a mitad, PostgreSQL revierte las dos y la caché nunca queda apuntando a
 * una asignación que no existe.
 *
 * `Truck.currentDriverId` es temporal: existe para que los listados sigan
 * leyendo el conductor en un solo `include`. Cuando el rediseño deje de
 * necesitarlo se elimina, y `vigenteDeVehiculo()` queda como única lectura.
 *
 * ---------------------------------------------------------------------------
 * DOS OPERACIONES, NO UNA CON BANDERA
 *
 * `asignarConductor` y `transferirConductor` son funciones distintas a
 * propósito. Mover a alguien de un vehículo a otro es una decisión operativa
 * con consecuencias sobre un tercer vehículo, y una bandera booleana la
 * escondería: código futuro podría activarla sin expresar que está
 * transfiriendo. Con dos nombres, la intención queda en la llamada.
 * ---------------------------------------------------------------------------
 */

/** Cliente dentro de una transacción de Prisma. */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type CodigoAsignacion =
  | "CONDUCTOR_EN_OTRO_VEHICULO"
  | "CONDUCTOR_SIN_ASIGNACION"
  | "ASIGNACION_INEXISTENTE"
  | "ASIGNACION_YA_CERRADA";

/**
 * Error de dominio. Lleva un código para que la interfaz pueda reaccionar
 * (por ejemplo, ofrecer la transferencia) sin analizar el texto del mensaje.
 */
export class AssignmentError extends Error {
  override name = "AssignmentError";
  constructor(
    readonly codigo: CodigoAsignacion,
    message: string,
    /** Datos del conflicto, para que la interfaz arme la confirmación. */
    readonly contexto?: { driverId?: string; truckId?: string; plate?: string }
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

export function vigenteDeVehiculo(truckId: string) {
  return prisma.driverAssignment.findFirst({
    where: { truckId, endedAt: null },
    include: { driver: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export function vigenteDeConductor(driverId: string) {
  return prisma.driverAssignment.findFirst({
    where: { driverId, endedAt: null },
    include: { truck: { select: { id: true, plate: true, nickname: true } } },
  });
}

/** Historial de un vehículo: la vigente primero, después de más a menos reciente. */
export function historialDeVehiculo(truckId: string) {
  return prisma.driverAssignment.findMany({
    where: { truckId },
    orderBy: [{ endedAt: { sort: "desc", nulls: "first" } }, { startedAt: "desc" }],
    include: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { name: true } },
      endedBy: { select: { name: true } },
    },
  });
}

export function historialDeConductor(driverId: string) {
  return prisma.driverAssignment.findMany({
    where: { driverId },
    orderBy: [{ endedAt: { sort: "desc", nulls: "first" } }, { startedAt: "desc" }],
    include: {
      truck: { select: { id: true, plate: true, nickname: true } },
      createdBy: { select: { name: true } },
      endedBy: { select: { name: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Primitivas internas: reciben la transacción, no la abren
// ---------------------------------------------------------------------------

/**
 * Cierra la asignación vigente de un vehículo y limpia su proyección.
 *
 * El `where` incluye `endedAt: null`, así que es idempotente: si otra pestaña
 * ya la cerró, afecta cero filas en vez de fallar.
 */
async function cerrarVigenteDeVehiculoEnTx(
  tx: Tx,
  truckId: string,
  motivo: AssignmentEndReason,
  usuarioId: string | null,
  cuando: Date
) {
  const { count } = await tx.driverAssignment.updateMany({
    where: { truckId, endedAt: null },
    data: { endedAt: cuando, endReason: motivo, endedById: usuarioId },
  });
  await tx.truck.update({
    where: { id: truckId },
    data: { currentDriverId: null },
  });
  return count;
}

/** Cierra la vigente de un conductor y limpia la proyección de su vehículo. */
async function cerrarVigenteDeConductorEnTx(
  tx: Tx,
  driverId: string,
  motivo: AssignmentEndReason,
  usuarioId: string | null,
  cuando: Date
) {
  const abiertas = await tx.driverAssignment.findMany({
    where: { driverId, endedAt: null },
    select: { truckId: true },
  });
  const { count } = await tx.driverAssignment.updateMany({
    where: { driverId, endedAt: null },
    data: { endedAt: cuando, endReason: motivo, endedById: usuarioId },
  });
  for (const { truckId } of abiertas) {
    await tx.truck.update({
      where: { id: truckId },
      data: { currentDriverId: null },
    });
  }
  return count;
}

/** Crea la asignación y actualiza la proyección del vehículo destino. */
async function crearYProyectarEnTx(
  tx: Tx,
  datos: {
    truckId: string;
    driverId: string;
    startedAt: Date;
    usuarioId: string | null;
    notes: string | null;
  }
) {
  const nueva = await tx.driverAssignment.create({
    data: {
      truckId: datos.truckId,
      driverId: datos.driverId,
      startedAt: datos.startedAt,
      notes: datos.notes,
      source: "MANUAL",
      createdById: datos.usuarioId,
    },
  });
  await tx.truck.update({
    where: { id: datos.truckId },
    data: { currentDriverId: datos.driverId },
  });
  return nueva;
}

// ---------------------------------------------------------------------------
// Operaciones públicas
// ---------------------------------------------------------------------------

type DatosAsignacion = {
  truckId: string;
  driverId: string;
  startedAt: Date;
  usuarioId: string | null;
  notes?: string | null;
};

/**
 * Asigna un conductor a un vehículo.
 *
 * Si el vehículo ya tenía otro conductor, esa asignación se cierra como
 * REASSIGNED: cambiar el conductor de un vehículo es exactamente lo que se
 * pidió al hacer la operación.
 *
 * Si la persona ya está vigente en OTRO vehículo, **rechaza**. No libera nada
 * en silencio: quien edita este vehículo no tiene por qué saber que esa
 * persona está en otro, y un efecto lateral invisible sobre un tercer vehículo
 * es peor que un error claro. Para ese caso existe `transferirConductor`.
 */
export async function asignarConductor(datos: DatosAsignacion) {
  const { truckId, driverId, startedAt, usuarioId, notes = null } = datos;

  return prisma.$transaction(async (tx) => {
    // Ya está en este mismo vehículo: no hay nada que hacer.
    const actual = await tx.driverAssignment.findFirst({
      where: { truckId, endedAt: null },
      select: { id: true, driverId: true },
    });
    if (actual?.driverId === driverId) return actual;

    const enOtro = await tx.driverAssignment.findFirst({
      where: { driverId, endedAt: null, truckId: { not: truckId } },
      include: {
        truck: { select: { id: true, plate: true } },
        driver: { select: { firstName: true, lastName: true } },
      },
    });
    if (enOtro) {
      throw new AssignmentError(
        "CONDUCTOR_EN_OTRO_VEHICULO",
        `${enOtro.driver.firstName} ${enOtro.driver.lastName} ya está asignado al vehículo ${enOtro.truck.plate}. Libéralo de ese vehículo o transfiérelo a este.`,
        { driverId, truckId: enOtro.truck.id, plate: enOtro.truck.plate }
      );
    }

    const ahora = new Date();
    if (actual) {
      await cerrarVigenteDeVehiculoEnTx(tx, truckId, "REASSIGNED", usuarioId, ahora);
    }
    return crearYProyectarEnTx(tx, { truckId, driverId, startedAt, usuarioId, notes });
  });
}

/**
 * Mueve a un conductor desde el vehículo donde está vigente hacia otro.
 *
 * Operación explícita y de una sola pieza. La interfaz la pondrá detrás de una
 * confirmación, porque afecta a dos vehículos: el de origen queda libre.
 *
 * Todo ocurre en una transacción: si cualquier paso falla, no queda ni la
 * asignación anterior cerrada ni la nueva creada.
 */
export async function transferirConductor(datos: DatosAsignacion) {
  const { truckId, driverId, startedAt, usuarioId, notes = null } = datos;

  return prisma.$transaction(async (tx) => {
    const origen = await tx.driverAssignment.findFirst({
      where: { driverId, endedAt: null },
      include: { truck: { select: { id: true, plate: true } } },
    });

    if (!origen) {
      throw new AssignmentError(
        "CONDUCTOR_SIN_ASIGNACION",
        "Esta persona no está asignada a ningún vehículo, así que no hay nada que transferir. Usa «asignar» en su lugar."
      );
    }
    if (origen.truckId === truckId) {
      // Ya está donde se lo quiere llevar.
      return origen;
    }

    const ahora = new Date();

    // 1-3. Cerrar la asignación anterior del conductor y liberar su vehículo.
    await cerrarVigenteDeConductorEnTx(tx, driverId, "REASSIGNED", usuarioId, ahora);

    // 4. Cerrar la del vehículo destino, si tenía a otra persona.
    await cerrarVigenteDeVehiculoEnTx(tx, truckId, "REASSIGNED", usuarioId, ahora);

    // 5-6. Crear la nueva y proyectarla.
    return crearYProyectarEnTx(tx, { truckId, driverId, startedAt, usuarioId, notes });
  });
}

/** Deja el vehículo sin conductor. No falla si ya estaba libre. */
export function liberarVehiculo(
  truckId: string,
  usuarioId: string | null,
  motivo: AssignmentEndReason = "RELEASED"
) {
  return prisma.$transaction((tx) =>
    cerrarVigenteDeVehiculoEnTx(tx, truckId, motivo, usuarioId, new Date())
  );
}

/**
 * Anula una asignación creada por error. No la borra: la cierra marcando que
 * nunca representó una asignación real, para no perder el rastro de que
 * alguien la creó.
 */
export function anularAsignacion(assignmentId: string, usuarioId: string | null) {
  return prisma.$transaction(async (tx) => {
    const a = await tx.driverAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, truckId: true, endedAt: true },
    });
    if (!a) {
      throw new AssignmentError("ASIGNACION_INEXISTENTE", "Esa asignación ya no existe.");
    }
    if (a.endedAt) {
      throw new AssignmentError("ASIGNACION_YA_CERRADA", "Esa asignación ya está cerrada.");
    }

    const anulada = await tx.driverAssignment.update({
      where: { id: assignmentId },
      data: { endedAt: new Date(), endReason: "CANCELLED", endedById: usuarioId },
    });
    await tx.truck.update({ where: { id: a.truckId }, data: { currentDriverId: null } });
    return anulada;
  });
}

// ---------------------------------------------------------------------------
// Composición con archivado
//
// Reciben la transacción de quien archiva, para que cerrar la asignación y
// archivar el registro sean la misma operación atómica.
// ---------------------------------------------------------------------------

export function cerrarPorArchivarVehiculo(
  tx: Tx,
  truckId: string,
  usuarioId: string | null
) {
  return cerrarVigenteDeVehiculoEnTx(tx, truckId, "ARCHIVED", usuarioId, new Date());
}

export function cerrarPorArchivarConductor(
  tx: Tx,
  driverId: string,
  usuarioId: string | null
) {
  return cerrarVigenteDeConductorEnTx(tx, driverId, "ARCHIVED", usuarioId, new Date());
}

// ---------------------------------------------------------------------------
// Verificación
// ---------------------------------------------------------------------------

export type Desajuste = {
  truckId: string;
  plate: string;
  cacheDriverId: string | null;
  vigenteDriverId: string | null;
};

/**
 * Vehículos cuya proyección no coincide con su asignación vigente. Debe
 * devolver siempre un arreglo vacío; si no, la caché miente.
 *
 * Se usa como aserción al final de las pruebas y sirve como comprobación de
 * salud en producción.
 */
export function verificarConsistencia(): Promise<Desajuste[]> {
  return prisma.$queryRaw<Desajuste[]>`
    SELECT t."id"              AS "truckId",
           t."plate"           AS "plate",
           t."currentDriverId" AS "cacheDriverId",
           a."driverId"        AS "vigenteDriverId"
    FROM "Truck" t
    LEFT JOIN "DriverAssignment" a
           ON a."truckId" = t."id" AND a."endedAt" IS NULL
    WHERE t."currentDriverId" IS DISTINCT FROM a."driverId"
  `;
}
