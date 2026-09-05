import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "rumbo_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET debe existir y tener al menos 32 caracteres. Genera una con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(user: SessionUser) {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Lee la sesión de la cookie. Devuelve null si no hay o es inválida. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

/** Igual que getSession pero redirige al login si no hay sesión válida. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");

  // La cookie es válida, pero el usuario pudo ser desactivado o eliminado.
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!user || !user.active) redirect("/login?error=inactivo");

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

const RANK: Record<Role, number> = { VIEWER: 1, MANAGER: 2, ADMIN: 3 };

export function hasRole(user: { role: Role }, min: Role) {
  return RANK[user.role] >= RANK[min];
}

/** Puede crear/editar/eliminar registros operativos. */
export function canWrite(user: { role: Role }) {
  return hasRole(user, "MANAGER");
}

/** Solo administradores: usuarios, configuración de la empresa. */
export function canAdmin(user: { role: Role }) {
  return hasRole(user, "ADMIN");
}

/** Para usar dentro de server actions: corta la acción si no tiene permiso. */
export async function requireWriter(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canWrite(user)) {
    throw new Error("No tienes permisos para realizar esta acción.");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAdmin(user)) {
    throw new Error("Solo un administrador puede realizar esta acción.");
  }
  return user;
}
