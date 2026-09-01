"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  type ActionState,
  optStr,
  str,
  toActionError,
} from "@/lib/form";

function readForm(formData: FormData) {
  return {
    name: str(formData, "name", "Nombre o razón social"),
    taxId: optStr(formData, "taxId"),
    contactName: optStr(formData, "contactName"),
    phone: optStr(formData, "phone"),
    email: optStr(formData, "email"),
    address: optStr(formData, "address"),
    city: optStr(formData, "city"),
    notes: optStr(formData, "notes"),
  };
}

export async function createCustomer(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    const customer = await prisma.customer.create({ data });

    await logActivity({
      userId: user.id,
      action: "creó",
      entity: "Customer",
      entityId: customer.id,
      summary: `al cliente ${customer.name}`,
    });

    revalidatePath("/clientes");
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function updateCustomer(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    const customer = await prisma.customer.update({ where: { id }, data });

    await logActivity({
      userId: user.id,
      action: "actualizó",
      entity: "Customer",
      entityId: id,
      summary: `al cliente ${customer.name}`,
    });

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function archiveCustomer(formData: FormData) {
  const user = await requireWriter();
  const id = String(formData.get("id"));
  const archived = formData.get("archived") !== "false";

  const customer = await prisma.customer.update({
    where: { id },
    data: { archived },
  });

  await logActivity({
    userId: user.id,
    action: archived ? "archivó" : "restauró",
    entity: "Customer",
    entityId: id,
    summary: `al cliente ${customer.name}`,
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

export async function deleteCustomer(formData: FormData) {
  const user = await requireWriter();
  const id = String(formData.get("id"));

  // Las cargas se conservan: solo quedan sin cliente asociado.
  const customer = await prisma.customer.delete({ where: { id } });

  await logActivity({
    userId: user.id,
    action: "eliminó",
    entity: "Customer",
    entityId: id,
    summary: `al cliente ${customer.name}`,
  });

  revalidatePath("/clientes");
}
