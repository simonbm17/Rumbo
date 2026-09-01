"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { CargoStatus, CargoUnit } from "@/generated/prisma/enums";
import {
  type ActionState,
  amount,
  enumOf,
  optAmount,
  optInt,
  optStr,
  str,
  toActionError,
} from "@/lib/form";

function readForm(formData: FormData) {
  return {
    tripId: str(formData, "tripId", "Viaje"),
    customerId: optStr(formData, "customerId"),
    description: str(formData, "description", "Descripción de la carga"),
    cargoType: optStr(formData, "cargoType"),
    weight: amount(formData, "weight", "Peso"),
    unit: enumOf(formData, "unit", "Unidad", CargoUnit, "KG"),
    quantity: optInt(formData, "quantity", "Cantidad"),
    declaredValue: optAmount(formData, "declaredValue", "Valor declarado"),
    freightCharge: optAmount(formData, "freightCharge", "Valor del flete"),
    pickupLocation: optStr(formData, "pickupLocation"),
    deliveryLocation: optStr(formData, "deliveryLocation"),
    status: enumOf(formData, "status", "Estado", CargoStatus, "PENDING"),
    notes: optStr(formData, "notes"),
  };
}

export async function createCargo(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    const cargo = await prisma.cargo.create({
      data,
      include: { trip: { select: { code: true } } },
    });

    await logActivity({
      userId: user.id,
      action: "creó",
      entity: "Cargo",
      entityId: cargo.id,
      summary: `una carga en el viaje ${cargo.trip.code}`,
    });

    revalidatePath(`/viajes/${data.tripId}`);
    revalidatePath("/viajes");
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function updateCargo(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    const cargo = await prisma.cargo.update({
      where: { id },
      data,
      include: { trip: { select: { code: true } } },
    });

    await logActivity({
      userId: user.id,
      action: "actualizó",
      entity: "Cargo",
      entityId: id,
      summary: `una carga del viaje ${cargo.trip.code}`,
    });

    revalidatePath(`/viajes/${data.tripId}`);
    revalidatePath("/viajes");
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function deleteCargo(formData: FormData) {
  const user = await requireWriter();
  const id = String(formData.get("id"));

  const cargo = await prisma.cargo.delete({
    where: { id },
    include: { trip: { select: { code: true } } },
  });

  await logActivity({
    userId: user.id,
    action: "eliminó",
    entity: "Cargo",
    entityId: id,
    summary: `una carga del viaje ${cargo.trip.code}`,
  });

  revalidatePath(`/viajes/${cargo.tripId}`);
  revalidatePath("/viajes");
}
