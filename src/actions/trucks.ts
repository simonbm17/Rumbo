"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { cerrarPorArchivarVehiculo } from "@/lib/assignments";
import { deleteUpload, resolvePhotoField } from "@/lib/storage";
import { TruckKind, TruckStatus } from "@/generated/prisma/enums";
import {
  type ActionState,
  enumOf,
  int,
  optAmount,
  optDate,
  optInt,
  optStr,
  str,
  toActionError,
} from "@/lib/form";

function readForm(formData: FormData) {
  return {
    plate: str(formData, "plate", "Placa").toUpperCase(),
    nickname: optStr(formData, "nickname"),
    brand: str(formData, "brand", "Marca"),
    model: str(formData, "model", "Modelo"),
    year: int(formData, "year", "Año"),
    kind: enumOf(formData, "kind", "Tipo", TruckKind, "SENCILLO"),
    status: enumOf(formData, "status", "Estado", TruckStatus, "ACTIVE"),
    vin: optStr(formData, "vin"),
    engineNumber: optStr(formData, "engineNumber"),
    color: optStr(formData, "color"),
    odometerKm: optInt(formData, "odometerKm", "Kilometraje") ?? 0,
    capacityKg: optAmount(formData, "capacityKg", "Capacidad"),
    axles: optInt(formData, "axles", "Ejes"),
    fuelType: optStr(formData, "fuelType"),
    tankLiters: optAmount(formData, "tankLiters", "Capacidad del tanque"),
    purchaseDate: optDate(formData, "purchaseDate", "Fecha de compra"),
    purchasePrice: optAmount(formData, "purchasePrice", "Precio de compra"),
    currentDriverId: optStr(formData, "currentDriverId"),
    notes: optStr(formData, "notes"),
  };
}

export async function createTruck(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    if (data.year < 1950 || data.year > new Date().getFullYear() + 1) {
      return { error: "El año del vehículo no parece válido." };
    }

    const photoUrl = await resolvePhotoField(formData, "photo", "camiones", null);

    const truck = await prisma.truck.create({
      data: { ...data, photoUrl },
    });
    id = truck.id;

    await logActivity({
      userId: user.id,
      action: "creó",
      entity: "Truck",
      entityId: truck.id,
      summary: `el camión ${truck.plate}`,
    });
  } catch (error) {
    return { error: toActionError(error) };
  }

  revalidatePath("/camiones");
  revalidatePath("/panel");
  redirect(`/camiones/${id}`);
}

export async function updateTruck(
  truckId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const current = await prisma.truck.findUnique({
      where: { id: truckId },
      select: { photoUrl: true },
    });
    if (!current) return { error: "El camión ya no existe." };

    const data = readForm(formData);
    const photoUrl = await resolvePhotoField(
      formData,
      "photo",
      "camiones",
      current.photoUrl
    );

    const truck = await prisma.truck.update({
      where: { id: truckId },
      data: { ...data, photoUrl },
    });

    await logActivity({
      userId: user.id,
      action: "actualizó",
      entity: "Truck",
      entityId: truck.id,
      summary: `el camión ${truck.plate}`,
    });
  } catch (error) {
    return { error: toActionError(error) };
  }

  revalidatePath("/camiones");
  revalidatePath(`/camiones/${truckId}`);
  revalidatePath("/panel");
  redirect(`/camiones/${truckId}`);
}

/** Cambio rápido de estado desde la ficha del camión. */
export async function setTruckStatus(formData: FormData) {
  const user = await requireWriter();
  const truckId = String(formData.get("truckId"));
  const status = enumOf(formData, "status", "Estado", TruckStatus);

  const truck = await prisma.truck.update({
    where: { id: truckId },
    data: { status },
  });

  await logActivity({
    userId: user.id,
    action: "actualizó",
    entity: "Truck",
    entityId: truckId,
    summary: `el estado del camión ${truck.plate}`,
  });

  revalidatePath(`/camiones/${truckId}`);
  revalidatePath("/camiones");
}

/**
 * Archiva el camión en lugar de borrarlo: así se conserva el histórico de
 * viajes, gastos y mantenimientos para los reportes.
 */
export async function archiveTruck(formData: FormData) {
  const user = await requireWriter();
  const truckId = String(formData.get("truckId"));
  const archived = formData.get("archived") !== "false";

  /*
    El defecto simétrico al de `archiveDriver`, y peor: acá no se hacía NADA
    con la asignación. Archivar un vehículo lo sacaba de la flota dejando su
    `DriverAssignment` abierta —`endedAt IS NULL`— y además el
    `Truck.currentDriverId` intacto, apuntando a una persona que ya no lo
    conduce. El conductor seguía figurando con un vehículo archivado.

    `cerrarPorArchivarVehiculo` ya existía para esto: cierra la vigente con
    `endReason = ARCHIVED`, registra quién la cerró y pone la proyección en
    NULL. Va en la misma transacción que el archivado para que las dos cosas se
    confirmen o fallen juntas.

    Solo al archivar. Restaurar NO reabre la asignación: volver a asignar un
    conductor es una decisión de la operación, no un efecto secundario de sacar
    el vehículo del archivo.

    Lo que no toca: el conductor sigue activo, sus asignaciones históricas
    quedan como estaban y los viajes no se modifican. Quién condujo qué es un
    hecho, y archivar el vehículo no lo cambia.
  */
  const truck = await prisma.$transaction(async (tx) => {
    if (archived) {
      await cerrarPorArchivarVehiculo(tx, truckId, user.id);
    }
    return tx.truck.update({
      where: { id: truckId },
      data: { archived, status: archived ? "INACTIVE" : "ACTIVE" },
    });
  });

  await logActivity({
    userId: user.id,
    action: archived ? "archivó" : "restauró",
    entity: "Truck",
    entityId: truckId,
    summary: `el camión ${truck.plate}`,
  });

  revalidatePath("/camiones");
  revalidatePath(`/camiones/${truckId}`);
}

/** Borrado definitivo. Arrastra viajes, gastos, mantenimientos y documentos. */
export async function deleteTruck(formData: FormData) {
  const user = await requireWriter();
  const truckId = String(formData.get("truckId"));

  const truck = await prisma.truck.findUnique({
    where: { id: truckId },
    select: { plate: true, photoUrl: true },
  });
  if (!truck) redirect("/camiones");

  await prisma.truck.delete({ where: { id: truckId } });
  await deleteUpload(truck.photoUrl);

  await logActivity({
    userId: user.id,
    action: "eliminó",
    entity: "Truck",
    entityId: truckId,
    summary: `el camión ${truck.plate} y todo su historial`,
  });

  revalidatePath("/camiones");
  revalidatePath("/panel");
  redirect("/camiones");
}
