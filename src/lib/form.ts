/**
 * Utilidades para leer FormData dentro de las server actions.
 * Los <input> siempre llegan como texto: acá se normaliza y se convierte.
 */

export type ActionState = { error?: string; ok?: boolean } | null;

export class ValidationError extends Error {}

function raw(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}

/** Texto obligatorio. */
export function str(form: FormData, key: string, label: string): string {
  const value = raw(form, key);
  if (!value) throw new ValidationError(`El campo «${label}» es obligatorio.`);
  return value;
}

/** Texto opcional: vacío se guarda como null. */
export function optStr(form: FormData, key: string): string | null {
  const value = raw(form, key);
  return value === "" ? null : value;
}

/** Número decimal obligatorio. */
export function num(form: FormData, key: string, label: string): number {
  const value = optNum(form, key, label);
  if (value === null)
    throw new ValidationError(`El campo «${label}» es obligatorio.`);
  return value;
}

/** Número decimal opcional. Acepta coma o punto como separador decimal. */
export function optNum(
  form: FormData,
  key: string,
  label: string
): number | null {
  const value = raw(form, key).replace(/\s/g, "").replace(",", ".");
  if (value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed))
    throw new ValidationError(`El campo «${label}» debe ser un número.`);
  return parsed;
}

/** Número decimal opcional que no puede ser negativo. */
export function optAmount(
  form: FormData,
  key: string,
  label: string
): number | null {
  const value = optNum(form, key, label);
  if (value !== null && value < 0)
    throw new ValidationError(`El campo «${label}» no puede ser negativo.`);
  return value;
}

export function amount(form: FormData, key: string, label: string): number {
  return optAmount(form, key, label) ?? 0;
}

export function optInt(
  form: FormData,
  key: string,
  label: string
): number | null {
  const value = optNum(form, key, label);
  if (value === null) return null;
  if (!Number.isInteger(value))
    throw new ValidationError(`El campo «${label}» debe ser un número entero.`);
  return value;
}

export function int(form: FormData, key: string, label: string): number {
  const value = optInt(form, key, label);
  if (value === null)
    throw new ValidationError(`El campo «${label}» es obligatorio.`);
  return value;
}

export function optDate(
  form: FormData,
  key: string,
  label: string
): Date | null {
  const value = raw(form, key);
  if (value === "") return null;
  // Una fecha sin hora se fija a mediodía UTC para que no cambie de día al
  // convertirse a la zona horaria local del navegador.
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00.000Z`)
    : new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw new ValidationError(`El campo «${label}» tiene una fecha inválida.`);
  return parsed;
}

export function date(form: FormData, key: string, label: string): Date {
  const value = optDate(form, key, label);
  if (!value) throw new ValidationError(`El campo «${label}» es obligatorio.`);
  return value;
}

export function bool(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === "on" || value === "true" || value === "1";
}

/**
 * Valida que el valor recibido pertenezca al enum de Prisma.
 *
 * `fallback` va envuelto en `NoInfer` para que el tipo salga del enum completo
 * y no del literal por defecto: si no, `enumOf(..., Role, "VIEWER")` devolvería
 * el tipo `"VIEWER"` y cualquier comparación posterior fallaría.
 */
export function enumOf<T extends string>(
  form: FormData,
  key: string,
  label: string,
  values: Record<T, unknown>,
  fallback?: NoInfer<T>
): T {
  const value = raw(form, key) as T;
  if (value in values) return value;
  if (fallback !== undefined) return fallback;
  throw new ValidationError(`El campo «${label}» tiene un valor inválido.`);
}

export function optEnumOf<T extends string>(
  form: FormData,
  key: string,
  values: Record<T, unknown>
): T | null {
  const value = raw(form, key) as T;
  return value in values ? value : null;
}

/** Mensaje legible para el usuario a partir de un error de Prisma o propio. */
export function toActionError(error: unknown): string {
  if (error instanceof ValidationError) return error.message;
  if (error instanceof Error) {
    // Los errores de subida ya traen un texto pensado para la persona.
    if (error.name === "UploadError") return error.message;
    if (error.message.includes("Unique constraint")) {
      if (error.message.includes("plate"))
        return "Ya existe un camión con esa placa.";
      if (error.message.includes("documentId"))
        return "Ya existe un conductor con ese número de documento.";
      if (error.message.includes("email"))
        return "Ya existe un usuario con ese correo.";
      if (error.message.includes("code"))
        return "Ya existe un viaje con ese código.";
      return "Ya existe un registro con ese valor único.";
    }
    if (error.message.includes("permisos") || error.message.includes("administrador"))
      return error.message;
  }
  console.error("Error en server action:", error);
  return "Ocurrió un error al guardar. Revisá los datos e intentá de nuevo.";
}
