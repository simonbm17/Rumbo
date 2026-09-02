import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { daysUntil, fullName } from "@/lib/format";
import { DOCUMENT_TYPE, type Tone } from "@/lib/labels";

/** Ventana por defecto: avisamos de todo lo que vence dentro de 30 días. */
export const ALERT_WINDOW_DAYS = 30;

export type AlertLevel = "expired" | "critical" | "warning";

export type Alert = {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  days: number;
  href: string;
  kind: "document" | "license" | "maintenance";
};

const LEVEL_ORDER: Record<AlertLevel, number> = {
  expired: 0,
  critical: 1,
  warning: 2,
};

export const ALERT_TONE: Record<AlertLevel, Tone> = {
  expired: "danger",
  critical: "danger",
  warning: "warning",
};

export const ALERT_LABEL: Record<AlertLevel, string> = {
  expired: "Vencido",
  critical: "Urgente",
  warning: "Por vencer",
};

function levelFor(days: number): AlertLevel {
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  return "warning";
}

/**
 * Reúne todo lo que está por vencer o ya venció: documentos de camiones y
 * conductores, licencias de conducción y mantenimientos programados.
 */
export const getAlerts = cache(async function getAlerts(
  windowDays: number = ALERT_WINDOW_DAYS
): Promise<Alert[]> {
  const limit = new Date();
  limit.setDate(limit.getDate() + windowDays);

  const [documents, drivers, maintenances] = await Promise.all([
    prisma.document.findMany({
      where: { expiresAt: { lte: limit } },
      include: {
        truck: { select: { id: true, plate: true, archived: true } },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            archived: true,
          },
        },
      },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.driver.findMany({
      where: {
        archived: false,
        licenseExpiry: { not: null, lte: limit },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        licenseExpiry: true,
      },
      orderBy: { licenseExpiry: "asc" },
    }),
    prisma.maintenance.findMany({
      where: {
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        nextServiceDate: { not: null, lte: limit },
      },
      include: { truck: { select: { id: true, plate: true, archived: true } } },
      orderBy: { nextServiceDate: "asc" },
    }),
  ]);

  const alerts: Alert[] = [];

  for (const doc of documents) {
    // Los registros archivados no generan ruido en el panel.
    if (doc.truck?.archived || doc.driver?.archived) continue;

    const days = daysUntil(doc.expiresAt);
    const owner = doc.truck
      ? `Camión ${doc.truck.plate}`
      : doc.driver
        ? fullName(doc.driver)
        : "Sin asignar";
    /*
      Ancla, no `?tab=`. Los expedientes tuvieron pestañas y el destino era
      `?tab=documentos`; al pasar a página continua se borraron las pestañas y
      nadie volvió a leer ese parámetro, así que el enlace abría la ficha por
      arriba y dejaba el documento vencido cinco secciones más abajo. Las
      secciones ya llevan `id` y `scroll-mt-20`, que es lo que deja el
      encabezado por debajo de la barra fija.
    */
    const href = doc.truck
      ? `/camiones/${doc.truck.id}#documentos`
      : doc.driver
        ? `/conductores/${doc.driver.id}#documentos`
        : "/documentos";

    alerts.push({
      id: `doc-${doc.id}`,
      level: levelFor(days),
      title: `${DOCUMENT_TYPE[doc.type]} — ${owner}`,
      detail: doc.number ? `N.º ${doc.number}` : "Sin número registrado",
      days,
      href,
      kind: "document",
    });
  }

  for (const driver of drivers) {
    const days = daysUntil(driver.licenseExpiry!);
    alerts.push({
      id: `lic-${driver.id}`,
      level: levelFor(days),
      title: `Licencia de conducción — ${fullName(driver)}`,
      detail: "Vencimiento registrado en la ficha del conductor",
      days,
      href: `/conductores/${driver.id}`,
      kind: "license",
    });
  }

  for (const item of maintenances) {
    if (item.truck.archived) continue;
    const days = daysUntil(item.nextServiceDate!);
    alerts.push({
      id: `mnt-${item.id}`,
      level: levelFor(days),
      title: `${item.title} — Camión ${item.truck.plate}`,
      detail: "Mantenimiento programado",
      days,
      href: `/camiones/${item.truck.id}#mantenimiento`,
      kind: "maintenance",
    });
  }

  return alerts.sort(
    (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.days - b.days
  );
});

/**
 * Conteo para el badge del menú lateral.
 *
 * Reusa `getAlerts`, que está envuelta en `cache()` de React: dentro de una
 * misma petición se ejecuta una sola vez aunque la llamen el layout (para el
 * badge) y la página (para la lista). Antes el panel disparaba las tres
 * consultas de alertas dos veces por carga.
 */
export async function getAlertCount(windowDays = ALERT_WINDOW_DAYS) {
  const alerts = await getAlerts(windowDays);
  return alerts.length;
}
