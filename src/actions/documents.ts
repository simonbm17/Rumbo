"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { deleteUpload, resolvePhotoField } from "@/lib/storage";
import { DocumentType } from "@/generated/prisma/enums";
import {
  type ActionState,
  date,
  enumOf,
  optDate,
  optStr,
  toActionError,
  ValidationError,
} from "@/lib/form";
import { DOCUMENT_TYPE } from "@/lib/labels";

function readForm(formData: FormData) {
  const truckId = optStr(formData, "truckId");
  const driverId = optStr(formData, "driverId");

  if (!truckId && !driverId) {
    throw new ValidationError(
      "El documento tiene que pertenecer a un camión o a un conductor."
    );
  }

  return {
    truckId,
    driverId,
    type: enumOf(formData, "type", "Tipo de documento", DocumentType, "OTRO"),
    number: optStr(formData, "number"),
    issuer: optStr(formData, "issuer"),
    issuedAt: optDate(formData, "issuedAt", "Fecha de expedición"),
    expiresAt: date(formData, "expiresAt", "Fecha de vencimiento"),
    notes: optStr(formData, "notes"),
  };
}

function revalidate(truckId?: string | null, driverId?: string | null) {
  revalidatePath("/documentos");
  revalidatePath("/panel");
  if (truckId) revalidatePath(`/camiones/${truckId}`);
  if (driverId) revalidatePath(`/conductores/${driverId}`);
}

export async function createDocument(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const data = readForm(formData);

    if (data.issuedAt && data.issuedAt > data.expiresAt) {
      return {
        error: "La fecha de expedición no puede ser posterior al vencimiento.",
      };
    }

    const fileUrl = await resolvePhotoField(
      formData,
      "file",
      "documentos",
      null,
      "document"
    );

    const doc = await prisma.document.create({ data: { ...data, fileUrl } });

    await logActivity({
      userId: user.id,
      action: "creó",
      entity: "Document",
      entityId: doc.id,
      summary: `el documento ${DOCUMENT_TYPE[data.type]}`,
    });

    revalidate(data.truckId, data.driverId);
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function updateDocument(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireWriter();
    const current = await prisma.document.findUnique({
      where: { id },
      select: { fileUrl: true },
    });
    if (!current) return { error: "El documento ya no existe." };

    const data = readForm(formData);
    if (data.issuedAt && data.issuedAt > data.expiresAt) {
      return {
        error: "La fecha de expedición no puede ser posterior al vencimiento.",
      };
    }

    const fileUrl = await resolvePhotoField(
      formData,
      "file",
      "documentos",
      current.fileUrl,
      "document"
    );

    await prisma.document.update({ where: { id }, data: { ...data, fileUrl } });

    await logActivity({
      userId: user.id,
      action: "actualizó",
      entity: "Document",
      entityId: id,
      summary: `el documento ${DOCUMENT_TYPE[data.type]}`,
    });

    revalidate(data.truckId, data.driverId);
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function deleteDocument(formData: FormData) {
  const user = await requireWriter();
  const id = String(formData.get("id"));

  const doc = await prisma.document.delete({ where: { id } });
  await deleteUpload(doc.fileUrl);

  await logActivity({
    userId: user.id,
    action: "eliminó",
    entity: "Document",
    entityId: id,
    summary: `el documento ${DOCUMENT_TYPE[doc.type]}`,
  });

  revalidate(doc.truckId, doc.driverId);
}
