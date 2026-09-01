import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente Prisma para las pruebas de integración.
 *
 * Deliberadamente NO reutiliza `@/lib/prisma`: ese módulo cachea el cliente en
 * `globalThis` y podría quedarse con la conexión de desarrollo según el orden
 * en que se importen los módulos. Acá se construye uno propio, contra la URL
 * que `vitest.config.ts` ya dejó apuntando a la base de pruebas.
 */

const url = process.env.DATABASE_URL ?? "";

// Salvaguarda: las funciones de abajo hacen TRUNCATE sobre todas las tablas.
// Si esto llegara a apuntar a la base de desarrollo, borraría el trabajo real.
if (!/\/rumbo_test(\?|$)/.test(url)) {
  throw new Error(
    `Las pruebas apuntan a una base que no es de pruebas: ${url}\n` +
      "Se esperaba una base llamada `rumbo_test`. Revisá .env.test."
  );
}

export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

/** Orden irrelevante: TRUNCATE ... CASCADE resuelve las dependencias. */
const TABLAS = [
  "ActivityLog",
  "Cargo",
  "Document",
  "Expense",
  "Maintenance",
  "Trip",
  "Truck",
  "Driver",
  "Customer",
  "CompanySettings",
  "User",
];

/** Deja la base vacía. Se llama antes de cada caso de integración. */
export async function limpiarBase() {
  const lista = TABLAS.map((t) => `"${t}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
}

export async function cerrarBase() {
  await db.$disconnect();
}
