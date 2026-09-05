"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  asignarConductor,
  cerrarPorArchivarVehiculo,
  liberarVehiculo,
  vigenteDeConductor,
  vigenteDeVehiculo,
} from "@/lib/assignments";
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
    notes: optStr(formData, "notes"),
  };
}

/*
  EL CONDUCTOR NO ES UNA COLUMNA QUE SE ESCRIBA.

  El desplegable del formulario se lee aparte, y a propósito. `readForm`
  devuelve lo que se guarda con `prisma.truck.update`; el conductor NO va ahí.

  Escribirlo como columna era un defecto real y reproducido: guardar el
  vehículo ponía `Truck.currentDriverId` sin crear ninguna `DriverAssignment`,
  de modo que el Panel —que pregunta a la fuente de verdad— seguía contando el
  vehículo como «sin conductor» mientras la ficha mostraba a una persona. Peor:
  permitía dejar al mismo conductor proyectado en dos vehículos a la vez, algo
  que los índices únicos parciales de PostgreSQL impiden en `DriverAssignment`
  pero no pueden impedir en una columna suelta.

  La regla del proyecto es que solo `lib/assignments.ts` escribe la asignación y
  su proyección, siempre en transacción. Acá se respeta llamándolo.
*/
function leerConductor(formData: FormData) {
  return optStr(formData, "currentDriverId");
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

    /*
      Se comprueba ANTES de crear. Si se creara primero y la asignación fallara
      después, quedaría un vehículo a medias y un mensaje de error sobre una
      pantalla de creación: quien lo lea reintentaría y chocaría con la placa
      duplicada. Preguntar primero cuesta una consulta y evita ese callejón.
    */
    const conductorId = leerConductor(formData);
    if (conductorId) {
      const enOtro = await vigenteDeConductor(conductorId);
      if (enOtro) {
        return {
          error: `Esa persona ya está asignada al vehículo ${enOtro.truck.plate}. Libérala de ese vehículo antes de asignarla a este.`,
        };
      }
    }

    const photoUrl = await resolvePhotoField(formData, "photo", "camiones", null);

    const truck = await prisma.truck.create({
      data: { ...data, photoUrl },
    });
    id = truck.id;

    if (conductorId) {
      await asignarConductor({
        truckId: truck.id,
        driverId: conductorId,
        startedAt: new Date(),
        usuarioId: user.id,
      });
    }

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

    /*
      Se concilia contra la asignación VIGENTE, no contra la proyección: la
      proyección es justamente lo que no puede decidir nada. Tres casos y solo
      tres: se eligió a alguien distinto —asignar, que cierra la anterior como
      REASSIGNED y rechaza si esa persona está en otro vehículo—, se eligió «sin
      asignar» —liberar—, o no cambió nada y no se toca la base.
    */
    const conductorId = leerConductor(formData);
    const vigente = await vigenteDeVehiculo(truckId);
    const vigenteId = vigente?.driverId ?? null;

    if (conductorId && conductorId !== vigenteId) {
      await asignarConductor({
        truckId,
        driverId: conductorId,
        startedAt: new Date(),
        usuarioId: user.id,
      });
    } else if (!conductorId && vigenteId) {
      await liberarVehiculo(truckId, user.id);
    }

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
