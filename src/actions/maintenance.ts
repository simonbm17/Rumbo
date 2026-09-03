"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { MaintenanceStatus, MaintenanceType } from "@/generated/prisma/enums";
import {
  type ActionState,
  amount,
  date,
  enumOf,
  optDate,
  optInt,
  optStr,
  str,
  toActionError,
} from "@/lib/form";

function readForm(formData: FormData) {
  return {
    truckId: str(formData, "truckId", "Camión"),
    type: enumOf(formData, "type", "Tipo", MaintenanceType, "PREVENTIVO"),
    status: enumOf(formData, "status", "Estado", MaintenanceStatus, "COMPLETED"),
    title: str(formData, "title", "Descripción del trabajo"),
    description: optStr(formData, "description"),
    date: date(formData, "date", "Fecha"),
    odometerKm: optInt(formData, "odometerKm", "Kilometraje"),
    cost: amount(formData, "cost", "Costo"),
    workshop: optStr(formData, "workshop"),
    invoiceNumber: optStr(formData, "invoiceNumber"),
    nextServiceKm: optInt(formData, "nextServiceKm", "Próximo servicio (km)"),
    nextServiceDate: optDate(
      formData,
      "nextServiceDate",
      "Próximo servicio (fecha)"
    ),
  };
}

function revalidate(truckId: string) {
  revalidatePath("/mantenimiento");
  revalidatePath(`/camiones/${truckId}`);
  revalidatePath("/camiones");
  revalidatePath("/reportes");
  revalidatePath("/panel");
}

export async function createMaintenance(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    const record = await prisma.maintenance.create({
      data,
      include: { truck: { select: { plate: true } } },
    });

    // Un mantenimiento con kilometraje mayor al registrado actualiza el
    // odómetro del camión: evita tener que corregirlo a mano.
    if (data.odometerKm) {
      await prisma.truck.updateMany({
        where: { id: data.truckId, odometerKm: { lt: data.odometerKm } },
        data: { odometerKm: data.odometerKm },
      });
    }

    await logActivity({
      userId: user.id,
      action: "creó",
      entity: "Maintenance",
      entityId: record.id,
      summary: `un mantenimiento del camión ${record.truck.plate}`,
    });

    revalidate(data.truckId);
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function updateMaintenance(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    const record = await prisma.maintenance.update({
      where: { id },
      data,
      include: { truck: { select: { plate: true } } },
    });

    await logActivity({
      userId: user.id,
      action: "actualizó",
      entity: "Maintenance",
      entityId: id,
      summary: `un mantenimiento del camión ${record.truck.plate}`,
    });

    revalidate(data.truckId);
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function deleteMaintenance(formData: FormData) {
  const user = await requireWriter();
  const id = String(formData.get("id"));

  const record = await prisma.maintenance.delete({
    where: { id },
    include: { truck: { select: { plate: true } } },
  });

  await logActivity({
    userId: user.id,
    action: "eliminó",
    entity: "Maintenance",
    entityId: id,
    summary: `un mantenimiento del camión ${record.truck.plate}`,
  });

  revalidate(record.truckId);
}
