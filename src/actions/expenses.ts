"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { deleteUpload, resolvePhotoField } from "@/lib/storage";
import { ExpenseCategory } from "@/generated/prisma/enums";
import {
  type ActionState,
  date,
  enumOf,
  optAmount,
  optInt,
  optStr,
  toActionError,
} from "@/lib/form";
import { round2 } from "@/lib/format";

function readForm(formData: FormData) {
  const liters = optAmount(formData, "liters", "Litros");
  const pricePerLiter = optAmount(
    formData,
    "pricePerLiter",
    "Precio por litro"
  );
  let total = optAmount(formData, "amount", "Monto");

  // Si cargaron litros y precio pero no el total, lo calculamos.
  if ((total === null || total === 0) && liters && pricePerLiter) {
    total = round2(liters * pricePerLiter);
  }

  return {
    truckId: optStr(formData, "truckId"),
    tripId: optStr(formData, "tripId"),
    driverId: optStr(formData, "driverId"),
    category: enumOf(formData, "category", "Categoría", ExpenseCategory, "OTRO"),
    description: optStr(formData, "description"),
    amount: total ?? 0,
    date: date(formData, "date", "Fecha"),
    liters,
    pricePerLiter,
    odometerKm: optInt(formData, "odometerKm", "Kilometraje"),
    supplier: optStr(formData, "supplier"),
    invoiceNumber: optStr(formData, "invoiceNumber"),
  };
}

function revalidate(truckId?: string | null, tripId?: string | null) {
  revalidatePath("/gastos");
  revalidatePath("/reportes");
  revalidatePath("/panel");
  if (truckId) revalidatePath(`/camiones/${truckId}`);
  if (tripId) revalidatePath(`/viajes/${tripId}`);
}

export async function createExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    if (data.amount <= 0) {
      return { error: "El monto del gasto debe ser mayor a cero." };
    }

    const receiptUrl = await resolvePhotoField(
      formData,
      "receipt",
      "comprobantes",
      null,
      "document"
    );

    const expense = await prisma.expense.create({
      data: { ...data, receiptUrl },
    });

    await logActivity({
      userId: user.id,
      action: "creó",
      entity: "Expense",
      entityId: expense.id,
      summary: `un gasto de ${data.category.toLowerCase()}`,
    });

    revalidate(data.truckId, data.tripId);
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function updateExpense(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const current = await prisma.expense.findUnique({
      where: { id },
      select: { receiptUrl: true },
    });
    if (!current) return { error: "El gasto ya no existe." };

    const data = readForm(formData);
    if (data.amount <= 0) {
      return { error: "El monto del gasto debe ser mayor a cero." };
    }

    const receiptUrl = await resolvePhotoField(
      formData,
      "receipt",
      "comprobantes",
      current.receiptUrl,
      "document"
    );

    await prisma.expense.update({ where: { id }, data: { ...data, receiptUrl } });

    await logActivity({
      userId: user.id,
      action: "actualizó",
      entity: "Expense",
      entityId: id,
      summary: `un gasto de ${data.category.toLowerCase()}`,
    });

    revalidate(data.truckId, data.tripId);
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function deleteExpense(formData: FormData) {
  const user = await requireWriter();
  const id = String(formData.get("id"));

  const expense = await prisma.expense.delete({ where: { id } });
  await deleteUpload(expense.receiptUrl);

  await logActivity({
    userId: user.id,
    action: "eliminó",
    entity: "Expense",
    entityId: id,
    summary: `un gasto de ${expense.category.toLowerCase()}`,
  });

  revalidate(expense.truckId, expense.tripId);
}
