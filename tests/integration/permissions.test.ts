import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RedireccionSimulada,
  actuarComo,
  sesionActual,
} from "../helpers/session";
import { canAdmin, canWrite, hasRole } from "@/lib/auth";

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

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new RedireccionSimulada(destino);
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));

const { createTruck, archiveTruck } = await import("@/actions/trucks");
const { createDriver } = await import("@/actions/drivers");
const { createUser, toggleUserActive } = await import("@/actions/users");
const { updateCompanySettings } = await import("@/actions/settings");
const { db, limpiarBase, cerrarBase } = await import("../helpers/db");
const { crearUsuario, crearVehiculo } = await import("../helpers/fixtures");

/**
 * Ejecuta una acción y clasifica el desenlace.
 *
 * Hay dos formas de fallar según la acción: las que envuelven en try/catch
 * devuelven `{ error }`, y las que no, lanzan. Las dos cuentan como denegada.
 */
async function ejecutar(
  accion: () => Promise<unknown>
): Promise<"permitida" | "denegada" | { fallo: string }> {
  try {
    const r = (await accion()) as { error?: string } | undefined;
    if (r?.error) {
      return /permiso|administrador/i.test(r.error) ? "denegada" : { fallo: r.error };
    }
    return "permitida";
  } catch (error) {
    if (error instanceof RedireccionSimulada) return "permitida";
    const mensaje = error instanceof Error ? error.message : String(error);
    return /permiso|administrador/i.test(mensaje) ? "denegada" : { fallo: mensaje };
  }
}

function formularioVehiculo(placa: string) {
  const fd = new FormData();
  fd.set("plate", placa);
  fd.set("brand", "Kenworth");
  fd.set("model", "T800");
  fd.set("year", "2020");
  return fd;
}

beforeEach(async () => {
  await limpiarBase();
  await crearUsuario();
});

afterAll(cerrarBase);

describe("jerarquía de roles", () => {
  it("ordena VIEWER < MANAGER < ADMIN", () => {
    expect(hasRole({ role: "ADMIN" }, "MANAGER")).toBe(true);
    expect(hasRole({ role: "MANAGER" }, "ADMIN")).toBe(false);
    expect(hasRole({ role: "VIEWER" }, "MANAGER")).toBe(false);
  });

  it("solo MANAGER y ADMIN escriben", () => {
    expect(canWrite({ role: "VIEWER" })).toBe(false);
    expect(canWrite({ role: "MANAGER" })).toBe(true);
    expect(canWrite({ role: "ADMIN" })).toBe(true);
  });

  it("solo ADMIN administra", () => {
    expect(canAdmin({ role: "MANAGER" })).toBe(false);
    expect(canAdmin({ role: "ADMIN" })).toBe(true);
  });
});

describe("acciones de escritura", () => {
  it("VIEWER no puede crear un vehículo", async () => {
    actuarComo("VIEWER");
    expect(await ejecutar(() => createTruck(null, formularioVehiculo("VIE-001")))).toBe(
      "denegada"
    );
    expect(await db.truck.count()).toBe(0);
  });

  it("VIEWER no puede archivar un vehículo", async () => {
    actuarComo("ADMIN");
    const vehiculo = await crearVehiculo();
    actuarComo("VIEWER");

    const fd = new FormData();
    fd.set("truckId", vehiculo.id);
    fd.set("archived", "true");
    expect(await ejecutar(() => archiveTruck(fd))).toBe("denegada");

    expect((await db.truck.findUniqueOrThrow({ where: { id: vehiculo.id } })).archived)
      .toBe(false);
  });

  it("VIEWER no puede crear un conductor", async () => {
    actuarComo("VIEWER");
    const fd = new FormData();
    fd.set("firstName", "Ana");
    fd.set("lastName", "Rodríguez");
    fd.set("documentId", "999");
    expect(await ejecutar(() => createDriver(null, fd))).toBe("denegada");
    expect(await db.driver.count()).toBe(0);
  });

  it("MANAGER sí puede crear un vehículo", async () => {
    actuarComo("MANAGER");
    expect(await ejecutar(() => createTruck(null, formularioVehiculo("MAN-001")))).toBe(
      "permitida"
    );
    expect(await db.truck.count()).toBe(1);
  });
});

describe("acciones reservadas a administradores", () => {
  it("MANAGER no puede crear usuarios", async () => {
    actuarComo("MANAGER");
    const fd = new FormData();
    fd.set("name", "Nuevo");
    fd.set("email", "nuevo@rumbo.app");
    fd.set("password", "unaClaveLarga123");
    fd.set("role", "VIEWER");
    expect(await ejecutar(() => createUser(null, fd))).toBe("denegada");
    expect(await db.user.count()).toBe(1); // solo el de la prueba
  });

  it("MANAGER no puede desactivar usuarios", async () => {
    actuarComo("ADMIN");
    const otro = await crearUsuario("otro-usuario", "VIEWER");
    actuarComo("MANAGER");

    const fd = new FormData();
    fd.set("id", otro.id);
    fd.set("active", "false");
    expect(await ejecutar(() => toggleUserActive(fd))).toBe("denegada");

    expect((await db.user.findUniqueOrThrow({ where: { id: otro.id } })).active).toBe(true);
  });

  it("MANAGER no puede cambiar los datos de la empresa", async () => {
    actuarComo("MANAGER");
    const fd = new FormData();
    fd.set("name", "Empresa secuestrada");
    expect(await ejecutar(() => updateCompanySettings(null, fd))).toBe("denegada");
  });

  it("ADMIN sí puede crear usuarios", async () => {
    actuarComo("ADMIN");
    const fd = new FormData();
    fd.set("name", "Nuevo");
    fd.set("email", "nuevo@rumbo.app");
    fd.set("password", "unaClaveLarga123");
    fd.set("role", "MANAGER");
    expect(await ejecutar(() => createUser(null, fd))).toBe("permitida");
    expect(await db.user.count()).toBe(2);
  });
});

describe("protección del último administrador", () => {
  it("el único administrador activo no puede degradarse a sí mismo", async () => {
    actuarComo("ADMIN", "usuario-prueba");
    const { updateUser } = await import("@/actions/users");

    const fd = new FormData();
    fd.set("name", "Usuario de prueba");
    fd.set("email", "usuario-prueba@rumbo.app");
    fd.set("role", "VIEWER");

    const r = (await updateUser("usuario-prueba", null, fd)) as { error?: string };
    expect(r.error).toContain("único administrador");

    expect((await db.user.findUniqueOrThrow({ where: { id: "usuario-prueba" } })).role)
      .toBe("ADMIN");
  });

  it("con dos administradores, uno sí puede cambiar de rol", async () => {
    actuarComo("ADMIN", "usuario-prueba");
    await crearUsuario("segundo-admin", "ADMIN");
    const { updateUser } = await import("@/actions/users");

    const fd = new FormData();
    fd.set("name", "Usuario de prueba");
    fd.set("email", "usuario-prueba@rumbo.app");
    fd.set("role", "MANAGER");

    const r = (await updateUser("usuario-prueba", null, fd)) as { error?: string };
    expect(r.error).toBeUndefined();
    expect((await db.user.findUniqueOrThrow({ where: { id: "usuario-prueba" } })).role)
      .toBe("MANAGER");
  });
});
