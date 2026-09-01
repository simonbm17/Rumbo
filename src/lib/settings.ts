import "server-only";

import { prisma } from "@/lib/prisma";

/** Configuración de la empresa. Es una fila única (id = 1) que se crea sola. */
export async function getCompanySettings() {
  const existing = await prisma.companySettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.companySettings.create({ data: { id: 1 } });
}
