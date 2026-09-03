"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { TripStatus } from "@/generated/prisma/enums";
import {
  type ActionState,
  amount,
  date,
  enumOf,
  optDate,
  optInt,
  optNum,
  optStr,
  str,
  toActionError,
  ValidationError,
} from "@/lib/form";

/**
 * Códigos correlativos V-0001, V-0002… Se calcula sobre el mayor código
 * existente para no repetir aunque se hayan borrado viajes intermedios.
 */
async function nextTripCode() {
  const last = await prisma.trip.findFirst({
    where: { code: { startsWith: "V-" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const lastNumber = last ? Number(last.code.slice(2)) : 0;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `V-${String(next).padStart(4, "0")}`;
}

function readForm(formData: FormData) {
  const departureAt = date(formData, "departureAt", "Fecha de salida");
  const plannedArrivalAt = optDate(
    formData,
    "plannedArrivalAt",
    "Llegada estimada"
  );
  const arrivalAt = optDate(formData, "arrivalAt", "Llegada real");
  const startOdometerKm = optInt(formData, "startOdometerKm", "Odómetro inicial");
  const endOdometerKm = optInt(formData, "endOdometerKm", "Odómetro final");

  if (plannedArrivalAt && plannedArrivalAt < departureAt) {
    throw new ValidationError(
      "La llegada estimada no puede ser anterior a la salida."
    );
  }
  if (arrivalAt && arrivalAt < departureAt) {
    throw new ValidationError(
      "La llegada real no puede ser anterior a la salida."
    );
  }
  if (
    startOdometerKm !== null &&
    endOdometerKm !== null &&
    endOdometerKm < startOdometerKm
  ) {
    throw new ValidationError(
      "El odómetro final no puede ser menor que el inicial."
    );
  }

  // Si hay odómetros y no cargaron la distancia, la deducimos.
  let distanceKm = optNum(formData, "distanceKm", "Distancia");
  if (
    distanceKm === null &&
    startOdometerKm !== null &&
    endOdometerKm !== null
  ) {
    distanceKm = endOdometerKm - startOdometerKm;
  }

  return {
    truckId: str(formData, "truckId", "Camión"),
    driverId: optStr(formData, "driverId"),
    origin: str(formData, "origin", "Origen"),
    destination: str(formData, "destination", "Destino"),
    departureAt,
    plannedArrivalAt,
    arrivalAt,
    startOdometerKm,
    endOdometerKm,
    distanceKm,
    status: enumOf(formData, "status", "Estado", TripStatus, "PLANNED"),
    revenue: amount(formData, "revenue", "Valor del flete"),
    notes: optStr(formData, "notes"),
  };
}

/**
 * Mantiene coherentes los estados del camión y del conductor con el del viaje,
 * y sube el odómetro del camión cuando el viaje se cierra.
 */
async function syncFleetStatus(data: {
  truckId: string;
  driverId: string | null;
  status: TripStatus;
  endOdometerKm: number | null;
}) {
  if (data.status === "IN_PROGRESS") {
    await prisma.truck.update({
      where: { id: data.truckId },
      data: { status: "IN_TRIP" },
    });
    if (data.driverId) {
      await prisma.driver.update({
        where: { id: data.driverId },
        data: { status: "ON_TRIP" },
      });
    }
    return;
  }

  if (data.status === "COMPLETED" || data.status === "CANCELLED") {
    // Solo liberamos el camión si no le queda otro viaje en curso.
    const stillBusy = await prisma.trip.count({
      where: { truckId: data.truckId, status: "IN_PROGRESS" },
    });
    if (stillBusy === 0) {
      await prisma.truck.updateMany({
        where: { id: data.truckId, status: "IN_TRIP" },
        data: { status: "ACTIVE" },
      });
    }

    if (data.driverId) {
      const driverBusy = await prisma.trip.count({
        where: { driverId: data.driverId, status: "IN_PROGRESS" },
      });
      if (driverBusy === 0) {
        await prisma.driver.updateMany({
          where: { id: data.driverId, status: "ON_TRIP" },
          data: { status: "ACTIVE" },
        });
      }
    }
  }

  if (data.status === "COMPLETED" && data.endOdometerKm) {
    await prisma.truck.updateMany({
      where: { id: data.truckId, odometerKm: { lt: data.endOdometerKm } },
      data: { odometerKm: data.endOdometerKm },
    });
  }
}

export async function createTrip(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    const trip = await prisma.trip.create({
      data: { ...data, code: await nextTripCode() },
    });
    id = trip.id;

    await syncFleetStatus(data);

    await logActivity({
      userId: user.id,
      action: "creó",
      entity: "Trip",
      entityId: trip.id,
      summary: `el viaje ${trip.code} (${trip.origin} → ${trip.destination})`,
    });
  } catch (error) {
    return { error: toActionError(error) };
  }

  revalidatePath("/viajes");
  revalidatePath("/camiones");
  revalidatePath("/panel");
  redirect(`/viajes/${id}`);
}

export async function updateTrip(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    const trip = await prisma.trip.update({ where: { id: tripId }, data });
    await syncFleetStatus(data);

    await logActivity({
      userId: user.id,
      action: "actualizó",
      entity: "Trip",
      entityId: tripId,
      summary: `el viaje ${trip.code}`,
    });
  } catch (error) {
    return { error: toActionError(error) };
  }

  revalidatePath("/viajes");
  revalidatePath(`/viajes/${tripId}`);
  revalidatePath("/camiones");
  revalidatePath("/panel");
  redirect(`/viajes/${tripId}`);
}

/** Cambio rápido de estado desde la ficha o el listado. */
export async function setTripStatus(formData: FormData) {
  const user = await requireWriter();
  const tripId = String(formData.get("tripId"));
  const status = enumOf(formData, "status", "Estado", TripStatus);

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status,
      // Al cerrar un viaje sin fecha de llegada, la ponemos ahora.
      ...(status === "COMPLETED" ? { arrivalAt: new Date() } : {}),
    },
  });

  await syncFleetStatus({
    truckId: trip.truckId,
    driverId: trip.driverId,
    status,
    endOdometerKm: trip.endOdometerKm,
  });

  await logActivity({
    userId: user.id,
    action: "actualizó",
    entity: "Trip",
    entityId: tripId,
    summary: `el estado del viaje ${trip.code}`,
  });

  revalidatePath("/viajes");
  revalidatePath(`/viajes/${tripId}`);
  revalidatePath("/camiones");
  revalidatePath("/panel");
}

export async function deleteTrip(formData: FormData) {
  const user = await requireWriter();
  const tripId = String(formData.get("tripId"));

  const trip = await prisma.trip.delete({ where: { id: tripId } });

  await logActivity({
    userId: user.id,
    action: "eliminó",
    entity: "Trip",
    entityId: tripId,
    summary: `el viaje ${trip.code}`,
  });

  revalidatePath("/viajes");
  revalidatePath("/camiones");
  revalidatePath("/panel");
  redirect("/viajes");
}
