"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { deleteUpload, resolvePhotoField } from "@/lib/storage";
import { DriverStatus } from "@/generated/prisma/enums";
import {
  type ActionState,
  enumOf,
  optDate,
  optStr,
  str,
  toActionError,
} from "@/lib/form";

function readForm(formData: FormData) {
  return {
    firstName: str(formData, "firstName", "Nombres"),
    lastName: str(formData, "lastName", "Apellidos"),
    documentId: str(formData, "documentId", "Documento de identidad"),
    phone: optStr(formData, "phone"),
    email: optStr(formData, "email"),
    licenseNumber: optStr(formData, "licenseNumber"),
    licenseClass: optStr(formData, "licenseClass"),
    licenseExpiry: optDate(formData, "licenseExpiry", "Vencimiento de licencia"),
    hireDate: optDate(formData, "hireDate", "Fecha de ingreso"),
    status: enumOf(formData, "status", "Estado", DriverStatus, "ACTIVE"),
    address: optStr(formData, "address"),
    emergencyContact: optStr(formData, "emergencyContact"),
    emergencyPhone: optStr(formData, "emergencyPhone"),
    notes: optStr(formData, "notes"),
  };
}

export async function createDriver(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireWriter();
    const data = readForm(formData);
    const photoUrl = await resolvePhotoField(
      formData,
      "photo",
      "conductores",
      null
    );

    const driver = await prisma.driver.create({ data: { ...data, photoUrl } });
    id = driver.id;

    await logActivity({
      userId: user.id,
      action: "creó",
      entity: "Driver",
      entityId: driver.id,
      summary: `al conductor ${driver.firstName} ${driver.lastName}`,
    });
  } catch (error) {
    return { error: toActionError(error) };
  }

  revalidatePath("/conductores");
  revalidatePath("/");
  redirect(`/conductores/${id}`);
}

export async function updateDriver(
  driverId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const current = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { photoUrl: true },
    });
    if (!current) return { error: "El conductor ya no existe." };

    const data = readForm(formData);
    const photoUrl = await resolvePhotoField(
      formData,
      "photo",
      "conductores",
      current.photoUrl
    );

    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: { ...data, photoUrl },
    });

    await logActivity({
      userId: user.id,
      action: "actualizó",
      entity: "Driver",
      entityId: driver.id,
      summary: `al conductor ${driver.firstName} ${driver.lastName}`,
    });
  } catch (error) {
    return { error: toActionError(error) };
  }

  revalidatePath("/conductores");
  revalidatePath(`/conductores/${driverId}`);
  redirect(`/conductores/${driverId}`);
}

export async function archiveDriver(formData: FormData) {
  const user = await requireWriter();
  const driverId = String(formData.get("driverId"));
  const archived = formData.get("archived") !== "false";

  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: { archived, status: archived ? "INACTIVE" : "ACTIVE" },
  });

  // Un conductor archivado no puede seguir asignado a un camión.
  if (archived) {
    await prisma.truck.updateMany({
      where: { currentDriverId: driverId },
      data: { currentDriverId: null },
    });
  }

  await logActivity({
    userId: user.id,
    action: archived ? "archivó" : "restauró",
    entity: "Driver",
    entityId: driverId,
    summary: `al conductor ${driver.firstName} ${driver.lastName}`,
  });

  revalidatePath("/conductores");
  revalidatePath(`/conductores/${driverId}`);
  revalidatePath("/camiones");
}

export async function deleteDriver(formData: FormData) {
  const user = await requireWriter();
  const driverId = String(formData.get("driverId"));

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { firstName: true, lastName: true, photoUrl: true },
  });
  if (!driver) redirect("/conductores");

  // Los viajes conservan su historial: el conductor queda en null.
  await prisma.driver.delete({ where: { id: driverId } });
  await deleteUpload(driver.photoUrl);

  await logActivity({
    userId: user.id,
    action: "eliminó",
    entity: "Driver",
    entityId: driverId,
    summary: `al conductor ${driver.firstName} ${driver.lastName}`,
  });

  revalidatePath("/conductores");
  revalidatePath("/camiones");
  redirect("/conductores");
}
