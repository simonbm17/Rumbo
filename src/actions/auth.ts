"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import {
  formatearEspera,
  limpiarIntentos,
  registrarIntento,
} from "@/lib/rate-limit";
import type { ActionState } from "@/lib/form";

/**
 * Hash de descarte con el mismo costo que los reales (bcrypt, coste 12).
 * Se compara contra él cuando el correo no existe para que responder "no hay
 * tal usuario" tarde lo mismo que "la contraseña está mal": si no, el tiempo
 * de respuesta delata qué correos están registrados.
 */
const HASH_SENUELO =
  "$2b$12$ZmhTDKV4b5VvH2j9gZV2l.4aIQ0rH2p8bG4y63Himj1kC1cufDfLq";

/** Identifica quién intenta entrar, para contar sus intentos por separado. */
async function clienteId() {
  const h = await headers();
  const reenviado = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviado || h.get("x-real-ip") || "desconocido";
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresá tu correo y contraseña." };
  }

  // Se cuenta por correo y por origen: así ni se puede machacar una cuenta
  // concreta ni barrer muchas cuentas desde el mismo lugar.
  const ip = await clienteId();
  const porCuenta = registrarIntento(`login:cuenta:${email}`, 8, 900);
  const porOrigen = registrarIntento(`login:origen:${ip}`, 30, 900);

  if (!porCuenta.permitido || !porOrigen.permitido) {
    const espera = Math.max(
      porCuenta.esperaSegundos,
      porOrigen.esperaSegundos
    );
    return {
      error: `Demasiados intentos fallidos. Esperá ${formatearEspera(espera)} antes de volver a probar.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Mismo mensaje para usuario inexistente y contraseña incorrecta: no hay que
  // revelar qué correos están registrados.
  const invalido = { error: "Correo o contraseña incorrectos." };

  if (!user) {
    await verifyPassword(password, HASH_SENUELO);
    return invalido;
  }

  const valida = await verifyPassword(password, user.passwordHash);
  if (!valida) return invalido;

  if (!user.active) {
    return { error: "Tu cuenta está desactivada. Contactá al administrador." };
  }

  // Acertó: se le devuelve el cupo completo de intentos.
  limpiarIntentos(`login:cuenta:${email}`);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
