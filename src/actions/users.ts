"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  destroySession,
  hashPassword,
  requireAdmin,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { Role } from "@/generated/prisma/enums";
import {
  type ActionState,
  enumOf,
  optStr,
  str,
  toActionError,
  MIN_PASSWORD,
  ValidationError,
} from "@/lib/form";

function validatePassword(value: string) {
  if (value.length < MIN_PASSWORD) {
    throw new ValidationError(
      `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
    );
  }
}

export async function createUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const admin = await requireAdmin();

    const name = str(formData, "name", "Nombre");
    const email = str(formData, "email", "Correo").toLowerCase();
    const password = str(formData, "password", "Contraseña");
    const role = enumOf(formData, "role", "Rol", Role, "VIEWER");
    validatePassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        passwordHash: await hashPassword(password),
      },
    });

    await logActivity({
      userId: admin.id,
      action: "creó",
      entity: "User",
      entityId: user.id,
      summary: `al usuario ${user.name}`,
    });

    revalidatePath("/usuarios");
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function updateUser(
  userId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const admin = await requireAdmin();

    const name = str(formData, "name", "Nombre");
    const email = str(formData, "email", "Correo").toLowerCase();
    const role = enumOf(formData, "role", "Rol", Role, "VIEWER");
    const password = optStr(formData, "password");

    // No dejamos que el último administrador se quite a sí mismo el rol y
    // deje al sistema sin quien administre.
    if (userId === admin.id && role !== "ADMIN") {
      const admins = await prisma.user.count({
        where: { role: "ADMIN", active: true },
      });
      if (admins <= 1) {
        return {
          error:
            "Eres el único administrador activo. Asigna ese rol a otra persona antes de cambiar el tuyo.",
        };
      }
    }

    if (password) validatePassword(password);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    });

    await logActivity({
      userId: admin.id,
      action: "actualizó",
      entity: "User",
      entityId: user.id,
      summary: `al usuario ${user.name}`,
    });

    revalidatePath("/usuarios");
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function toggleUserActive(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("id"));
  const active = formData.get("active") !== "false";

  if (!active) {
    if (userId === admin.id) {
      throw new Error("No puedes desactivar tu propia cuenta.");
    }
    const admins = await prisma.user.count({
      where: { role: "ADMIN", active: true },
    });
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (target?.role === "ADMIN" && admins <= 1) {
      throw new Error("Debe quedar al menos un administrador activo.");
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { active },
  });

  await logActivity({
    userId: admin.id,
    action: "actualizó",
    entity: "User",
    entityId: userId,
    summary: `el acceso de ${user.name} (${active ? "activado" : "desactivado"})`,
  });

  revalidatePath("/usuarios");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("id"));

  if (userId === admin.id) {
    throw new Error("No puedes eliminar tu propia cuenta.");
  }

  const user = await prisma.user.delete({ where: { id: userId } });

  await logActivity({
    userId: admin.id,
    action: "eliminó",
    entity: "User",
    entityId: userId,
    summary: `al usuario ${user.name}`,
  });

  revalidatePath("/usuarios");
}

/** Cambio de la propia contraseña: cualquier usuario autenticado puede. */
export async function changeOwnPassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireUser();

    const current = str(formData, "currentPassword", "Contraseña actual");
    const next = str(formData, "newPassword", "Contraseña nueva");
    const confirm = str(formData, "confirmPassword", "Confirmación");

    if (next !== confirm) {
      return { error: "La confirmación no coincide con la contraseña nueva." };
    }
    validatePassword(next);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.id },
    });
    if (!(await verifyPassword(current, user.passwordHash))) {
      return { error: "La contraseña actual no es correcta." };
    }

    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: await hashPassword(next) },
    });

    // Cerramos la sesión para que vuelva a entrar con la clave nueva.
    await destroySession();
    return { ok: true };
  } catch (error) {
    return { error: toActionError(error) };
  }
}
