"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { resolvePhotoField } from "@/lib/storage";
import { type ActionState, optStr, str, toActionError } from "@/lib/form";

export async function updateCompanySettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const admin = await requireAdmin();

    const current = await prisma.companySettings.findUnique({
      where: { id: 1 },
      select: { logoUrl: true },
    });

    const logoUrl = await resolvePhotoField(
      formData,
      "logo",
      "empresa",
      current?.logoUrl ?? null
    );

    const data = {
      name: str(formData, "name", "Nombre comercial"),
      legalName: optStr(formData, "legalName"),
      taxId: optStr(formData, "taxId"),
      phone: optStr(formData, "phone"),
      email: optStr(formData, "email"),
      address: optStr(formData, "address"),
      logoUrl,
    };

    await prisma.companySettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    await logActivity({
      userId: admin.id,
      action: "actualizó",
      entity: "CompanySettings",
      summary: "los datos de la empresa",
    });

    // El nombre aparece en el menú lateral de todas las pantallas.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}
