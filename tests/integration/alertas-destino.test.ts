import { afterAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Regresión del destino de las alertas.
 *
 * Los expedientes de vehículo y de conductor tuvieron pestañas, y `getAlerts`
 * apuntaba a ellas con `?tab=documentos` y `?tab=mantenimiento`. Al pasar a
 * página continua las pestañas se borraron y nadie volvió a leer ese
 * parámetro: el enlace seguía abriendo la ficha correcta, pero por arriba, con
 * el documento vencido cinco secciones más abajo. Un enlace que técnicamente
 * funciona y operativamente no lleva a ninguna parte.
 *
 * Estas pruebas fijan el destino real —el ancla de la sección— para que un
 * futuro cambio de estructura tenga que enterarse de que rompe esto.
 */

const { getAlerts } = await import("@/lib/alerts");
const { db, limpiarBase, cerrarBase } = await import("../helpers/db");
const { crearVehiculo, crearConductor } = await import("../helpers/fixtures");

beforeEach(limpiarBase);
afterAll(cerrarBase);

/** Dentro de la ventana de 30 días, para que la alerta exista. */
function enDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d;
}

describe("a dónde lleva cada alerta", () => {
  it("lleva a la sección concreta, no a la ficha por arriba", async () => {
    const vehiculo = await crearVehiculo({ plate: "ALT-001" });
    const conductor = await crearConductor({
      documentId: "30000001",
      licenseExpiry: enDias(10),
    });

    await db.document.create({
      data: { truckId: vehiculo.id, type: "SOAT", expiresAt: enDias(5) },
    });
    await db.document.create({
      data: { driverId: conductor.id, type: "OTRO", expiresAt: enDias(6) },
    });
    await db.maintenance.create({
      data: {
        truckId: vehiculo.id,
        title: "Cambio de frenos",
        date: new Date(),
        status: "SCHEDULED",
        nextServiceDate: enDias(12),
      },
    });

    const alertas = await getAlerts();
    const destino = (kind: string, prefijo: string) =>
      alertas.find((a) => a.kind === kind && a.href.startsWith(prefijo))?.href;

    expect(destino("document", "/camiones/")).toBe(
      `/camiones/${vehiculo.id}#documentos`
    );
    expect(destino("document", "/conductores/")).toBe(
      `/conductores/${conductor.id}#documentos`
    );
    expect(destino("maintenance", "/camiones/")).toBe(
      `/camiones/${vehiculo.id}#mantenimiento`
    );

    /*
      La licencia no lleva ancla a propósito: no es un `Document`, es un campo
      del conductor, y se muestra en el bloque de identidad —arriba del todo,
      dentro del primer viewport—. Un ancla la haría bajar de más.
    */
    expect(destino("license", "/conductores/")).toBe(
      `/conductores/${conductor.id}`
    );

    // Y ninguna arrastra ya el parámetro muerto.
    for (const a of alertas) expect(a.href).not.toContain("?tab=");
  });

  /*
    El ancla se añade DESPUÉS del id, nunca dentro. Varias pantallas sacan a
    qué vehículo o conductor pertenece una alerta leyendo su destino, y cuando
    los `?tab=` pasaron a anclas una de ellas capturó «id#documentos» y dejó de
    reconocer a nadie. Esto fija la forma que esas pantallas dan por supuesta.
  */
  it("deja el id como un segmento limpio, con el ancla después", async () => {
    const vehiculo = await crearVehiculo({ plate: "ALT-002" });
    await db.document.create({
      data: { truckId: vehiculo.id, type: "SOAT", expiresAt: enDias(4) },
    });

    for (const a of await getAlerts()) {
      const [, tipo, id] = a.href.split("/");
      expect(["camiones", "conductores"]).toContain(tipo);
      expect(id.split("#")[0]).not.toContain("#");
      expect(a.href.split("#")[0]).toBe(`/${tipo}/${id.split("#")[0]}`);
    }
  });
});
