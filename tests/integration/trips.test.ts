import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RedireccionSimulada,
  actuarComo,
  capturarRedireccion,
  sesionActual,
} from "../helpers/session";

/*
  Solo se sustituye lo que necesita un contexto de petición HTTP.
  `canWrite` y `canAdmin` se toman del módulo real, así que la jerarquía de
  roles que se prueba es la verdadera y no una copia que pueda divergir.
*/
vi.mock("@/lib/auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...real,
    requireUser: async () => sesionActual(),
    requireWriter: async () => {
      const u = sesionActual();
      if (!real.canWrite(u)) throw new Error("No tenés permisos para realizar esta acción.");
      return u;
    },
    requireAdmin: async () => {
      const u = sesionActual();
      if (!real.canAdmin(u)) throw new Error("Solo un administrador puede realizar esta acción.");
      return u;
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new RedireccionSimulada(destino);
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));

const { createTrip, setTripStatus } = await import("@/actions/trips");
const { db, limpiarBase, cerrarBase } = await import("../helpers/db");
const { crearUsuario, crearVehiculo, crearConductor } = await import(
  "../helpers/fixtures"
);

function formularioViaje(campos: Record<string, string>) {
  const fd = new FormData();
  fd.set("origin", "Bogotá");
  fd.set("destination", "Cali");
  fd.set("departureAt", "2026-06-01T08:00");
  fd.set("revenue", "1000000");
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

beforeEach(async () => {
  await limpiarBase();
  actuarComo("ADMIN");
  await crearUsuario();
});

afterAll(cerrarBase);

/**
 * syncFleetStatus es la lógica que más silenciosamente se puede romper en un
 * rediseño: no vive en ninguna pantalla, se dispara sola desde la acción del
 * viaje y mueve el estado de dos entidades más.
 */
describe("sincronización de estado de flota", () => {
  it("un viaje en curso ocupa el vehículo y al conductor", async () => {
    const vehiculo = await crearVehiculo();
    const conductor = await crearConductor();

    await capturarRedireccion(() =>
      createTrip(
        null,
        formularioViaje({
          truckId: vehiculo.id,
          driverId: conductor.id,
          status: "IN_PROGRESS",
        })
      )
    );

    expect((await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } })).status)
      .toBe("IN_TRIP");
    expect((await db.driver.findUniqueOrThrow({ where: { id: conductor.id } })).status)
      .toBe("ON_TRIP");
  });

  it("completar el viaje libera a ambos", async () => {
    const vehiculo = await crearVehiculo();
    const conductor = await crearConductor();

    await capturarRedireccion(() =>
      createTrip(
        null,
        formularioViaje({
          truckId: vehiculo.id,
          driverId: conductor.id,
          status: "IN_PROGRESS",
        })
      )
    );

    const viaje = await db.trip.findFirstOrThrow();
    const cierre = new FormData();
    cierre.set("tripId", viaje.id);
    cierre.set("status", "COMPLETED");
    await setTripStatus(cierre);

    expect((await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } })).status)
      .toBe("ACTIVE");
    expect((await db.driver.findUniqueOrThrow({ where: { id: conductor.id } })).status)
      .toBe("ACTIVE");
  });

  it("con dos viajes en curso, cerrar uno NO libera el vehículo", async () => {
    const vehiculo = await crearVehiculo();
    const conductor = await crearConductor();

    for (const destino of ["Cali", "Medellín"]) {
      await capturarRedireccion(() =>
        createTrip(
          null,
          formularioViaje({
            truckId: vehiculo.id,
            driverId: conductor.id,
            destination: destino,
            status: "IN_PROGRESS",
          })
        )
      );
    }

    const primero = await db.trip.findFirstOrThrow({ orderBy: { code: "asc" } });
    const cierre = new FormData();
    cierre.set("tripId", primero.id);
    cierre.set("status", "COMPLETED");
    await setTripStatus(cierre);

    // Queda uno en curso: el vehículo sigue ocupado.
    expect((await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } })).status)
      .toBe("IN_TRIP");
    expect((await db.driver.findUniqueOrThrow({ where: { id: conductor.id } })).status)
      .toBe("ON_TRIP");
  });

  it("cancelar libera el vehículo sin tocar el odómetro", async () => {
    const vehiculo = await crearVehiculo({ odometerKm: 100_000 });
    const conductor = await crearConductor();

    await capturarRedireccion(() =>
      createTrip(
        null,
        formularioViaje({
          truckId: vehiculo.id,
          driverId: conductor.id,
          status: "IN_PROGRESS",
          endOdometerKm: "150000",
        })
      )
    );

    const viaje = await db.trip.findFirstOrThrow();
    const cancelar = new FormData();
    cancelar.set("tripId", viaje.id);
    cancelar.set("status", "CANCELLED");
    await setTripStatus(cancelar);

    const despues = await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } });
    expect(despues.status).toBe("ACTIVE");
    expect(despues.odometerKm).toBe(100_000);
  });

  it("completar sube el odómetro del vehículo al del viaje", async () => {
    const vehiculo = await crearVehiculo({ odometerKm: 100_000 });

    await capturarRedireccion(() =>
      createTrip(
        null,
        formularioViaje({
          truckId: vehiculo.id,
          status: "IN_PROGRESS",
          startOdometerKm: "100000",
          endOdometerKm: "100500",
        })
      )
    );

    const viaje = await db.trip.findFirstOrThrow();
    const cierre = new FormData();
    cierre.set("tripId", viaje.id);
    cierre.set("status", "COMPLETED");
    await setTripStatus(cierre);

    expect((await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } })).odometerKm)
      .toBe(100_500);
  });

  it("nunca hace retroceder el odómetro", async () => {
    const vehiculo = await crearVehiculo({ odometerKm: 200_000 });

    await capturarRedireccion(() =>
      createTrip(
        null,
        formularioViaje({
          truckId: vehiculo.id,
          status: "IN_PROGRESS",
          startOdometerKm: "100000",
          endOdometerKm: "100500",
        })
      )
    );

    const viaje = await db.trip.findFirstOrThrow();
    const cierre = new FormData();
    cierre.set("tripId", viaje.id);
    cierre.set("status", "COMPLETED");
    await setTripStatus(cierre);

    expect((await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } })).odometerKm)
      .toBe(200_000);
  });
});

describe("creación de viajes", () => {
  it("asigna códigos correlativos sin repetir", async () => {
    const vehiculo = await crearVehiculo();

    for (let i = 0; i < 3; i++) {
      await capturarRedireccion(() =>
        createTrip(null, formularioViaje({ truckId: vehiculo.id, status: "PLANNED" }))
      );
    }

    const codigos = (
      await db.trip.findMany({ orderBy: { code: "asc" }, select: { code: true } })
    ).map((t) => t.code);
    expect(codigos).toEqual(["V-0001", "V-0002", "V-0003"]);
  });

  it("deduce la distancia desde los dos odómetros", async () => {
    const vehiculo = await crearVehiculo();

    await capturarRedireccion(() =>
      createTrip(
        null,
        formularioViaje({
          truckId: vehiculo.id,
          status: "PLANNED",
          startOdometerKm: "10000",
          endOdometerKm: "10450",
        })
      )
    );

    expect((await db.trip.findFirstOrThrow()).distanceKm).toBe(450);
  });

  it("rechaza un odómetro final menor que el inicial", async () => {
    const vehiculo = await crearVehiculo();

    const resultado = await createTrip(
      null,
      formularioViaje({
        truckId: vehiculo.id,
        status: "PLANNED",
        startOdometerKm: "10000",
        endOdometerKm: "9000",
      })
    );

    expect(resultado?.error).toContain("odómetro final");
    expect(await db.trip.count()).toBe(0);
  });

  it("rechaza una llegada anterior a la salida", async () => {
    const vehiculo = await crearVehiculo();

    const resultado = await createTrip(
      null,
      formularioViaje({
        truckId: vehiculo.id,
        status: "PLANNED",
        arrivalAt: "2026-05-01T08:00",
      })
    );

    expect(resultado?.error).toContain("anterior a la salida");
    expect(await db.trip.count()).toBe(0);
  });
});
