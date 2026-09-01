import "server-only";

import { prisma } from "@/lib/prisma";

type LogInput = {
  userId?: string | null;
  action: "creó" | "actualizó" | "eliminó" | "archivó" | "restauró";
  entity: string;
  entityId?: string | null;
  summary: string;
};

/**
 * Registra un movimiento para el historial del panel. Nunca debe hacer fallar
 * la operación principal, por eso traga sus propios errores.
 */
export async function logActivity(input: LogInput) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary,
      },
    });
  } catch (error) {
    console.error("No se pudo registrar la actividad:", error);
  }
}
