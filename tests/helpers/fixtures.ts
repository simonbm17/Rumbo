import { db } from "./db";

/**
 * Datos mínimos y explícitos para las pruebas.
 *
 * A diferencia del seed de demostración, acá nada es aleatorio: cada cifra
 * está elegida para que el resultado esperado se pueda calcular a mano y
 * escribir en la aserción.
 */

export async function crearUsuario(
  id = "usuario-prueba",
  role: "ADMIN" | "MANAGER" | "VIEWER" = "ADMIN"
) {
  return db.user.create({
    data: {
      id,
      name: "Usuario de prueba",
      email: `${id}@rumbo.app`,
      // No es un hash real: ninguna prueba de estas verifica contraseñas.
      passwordHash: "$2b$12$noSeUsaEnEstasPruebas000000000000000000000000000000",
      role,
    },
  });
}

export async function crearVehiculo(overrides: Record<string, unknown> = {}) {
  return db.truck.create({
    data: {
      plate: "TST-001",
      brand: "Kenworth",
      model: "T800",
      year: 2020,
      odometerKm: 100_000,
      ...overrides,
    },
  });
}

export async function crearConductor(overrides: Record<string, unknown> = {}) {
  return db.driver.create({
    data: {
      firstName: "Ana",
      lastName: "Rodríguez",
      documentId: "10000001",
      ...overrides,
    },
  });
}

export async function crearCliente(overrides: Record<string, unknown> = {}) {
  return db.customer.create({
    data: { name: "Cliente de prueba", ...overrides },
  });
}

/** Un viaje completado con cifras redondas, para verificar los cálculos. */
export async function crearViajeCompletado(
  truckId: string,
  driverId: string | null,
  opciones: { code?: string; revenue?: number; distanceKm?: number } = {}
) {
  return db.trip.create({
    data: {
      code: opciones.code ?? "V-9001",
      truckId,
      driverId,
      origin: "Bogotá",
      destination: "Cali",
      departureAt: new Date("2026-06-01T08:00:00Z"),
      arrivalAt: new Date("2026-06-02T18:00:00Z"),
      distanceKm: opciones.distanceKm ?? 500,
      status: "COMPLETED",
      revenue: opciones.revenue ?? 1_000_000,
    },
  });
}
